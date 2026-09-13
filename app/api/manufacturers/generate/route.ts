import { NextResponse } from "next/server"

import { buildQrPayload, deriveManufacturerCode, formatSerialCode } from "@/lib/manufacturers/code-generator"
import { getPilotPublicKey, signQrPayload } from "@/lib/manufacturers/crypto-signer"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { recordUsage } from "@/lib/usage/usage-tracker"
import type { SerialisationLevel } from "@/types/database"

// Runs synchronously in one request - fine at pilot scale, but each serial
// needs an RSA signature (a few ms each) plus a DB round trip, so this is
// deliberately capped well under Vercel's function timeout rather than
// attempting the spec's full 500,000-code example. Raise this once
// generation moves to a background job with real progress streaming
// (spec's own Step 3 UI) instead of one blocking request.
const MAX_QUANTITY_PER_REQUEST = 5000
const INSERT_CHUNK_SIZE = 500

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized", code: "unauthorized" } }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const productId = typeof body?.productId === "string" ? body.productId : null
  const machineId = typeof body?.machineId === "string" ? body.machineId : null
  const batchNumber = typeof body?.batchNumber === "string" ? body.batchNumber.trim() : ""
  const productionDate = typeof body?.productionDate === "string" ? body.productionDate : ""
  const expiryDate = typeof body?.expiryDate === "string" ? body.expiryDate : ""
  const serialisationLevel = body?.serialisationLevel as SerialisationLevel | undefined
  const unitsPerCarton = typeof body?.unitsPerCarton === "number" ? body.unitsPerCarton : null
  const cartonsPerPallet = typeof body?.cartonsPerPallet === "number" ? body.cartonsPerPallet : null
  const quantity = typeof body?.quantity === "number" ? Math.floor(body.quantity) : 0

  if (!productId || !machineId || !batchNumber || !productionDate || !expiryDate || !serialisationLevel || quantity <= 0) {
    return NextResponse.json({ error: { message: "Missing or invalid batch details", code: "invalid_request" } }, { status: 400 })
  }

  if (quantity > MAX_QUANTITY_PER_REQUEST) {
    return NextResponse.json(
      {
        error: {
          message: `For now, generate at most ${MAX_QUANTITY_PER_REQUEST.toLocaleString()} codes per batch during the pilot.`,
          code: "quantity_too_large",
        },
      },
      { status: 400 }
    )
  }

  const { data: manufacturer, error: manufacturerError } = await supabase
    .from("manufacturer_profiles")
    .select("company_name, verification_status, monthly_unit_limit, units_generated_this_month")
    .eq("id", user.id)
    .maybeSingle()

  if (manufacturerError || !manufacturer) {
    return NextResponse.json({ error: { message: "Manufacturer profile not found", code: "not_found" } }, { status: 404 })
  }
  if (manufacturer.verification_status !== "approved") {
    return NextResponse.json({ error: { message: "Your account must be approved to generate codes", code: "not_approved" } }, { status: 403 })
  }
  if (manufacturer.units_generated_this_month + quantity > manufacturer.monthly_unit_limit) {
    return NextResponse.json(
      { error: { message: "This would exceed your monthly code generation limit", code: "limit_exceeded" } },
      { status: 400 }
    )
  }

  const { data: product, error: productError } = await supabase
    .from("manufacturer_products")
    .select("*")
    .eq("id", productId)
    .eq("manufacturer_id", user.id)
    .maybeSingle()

  if (productError || !product) {
    return NextResponse.json({ error: { message: "Product not found", code: "not_found" } }, { status: 404 })
  }

  const { data: machine, error: machineError } = await supabase
    .from("manufacturer_machines")
    .select("id, ai_recommended_format")
    .eq("id", machineId)
    .eq("manufacturer_id", user.id)
    .maybeSingle()

  if (machineError || !machine) {
    return NextResponse.json({ error: { message: "Machine not found", code: "not_found" } }, { status: 404 })
  }

  const serviceClient = createServiceRoleClient()

  const { data: batch, error: batchError } = await serviceClient
    .from("serialised_products")
    .insert({
      manufacturer_id: user.id,
      product_id: product.id,
      nafdac_number: product.nafdac_number,
      product_name: product.product_name,
      batch_number: batchNumber,
      production_date: productionDate,
      expiry_date: expiryDate,
      total_units: quantity,
      codes_generated: quantity,
      status: "generated",
      machine_id: machine.id,
      serialisation_level: serialisationLevel,
      units_per_carton: unitsPerCarton,
      cartons_per_pallet: cartonsPerPallet,
      export_format: machine.ai_recommended_format,
      product_category: product.product_category,
      product_image_url: product.product_image_url,
      description: product.description,
      storage_conditions: product.storage_conditions,
    })
    .select("id")
    .single()

  if (batchError || !batch) {
    return NextResponse.json({ error: { message: batchError?.message ?? "Could not create batch", code: "batch_failed" } }, { status: 500 })
  }

  // Sequence continues from every serial this manufacturer has ever
  // generated (across all their batches), not just this one - see
  // deriveManufacturerCode's own comment on the resulting collision model.
  const { data: existingBatchIds } = await serviceClient
    .from("serialised_products")
    .select("id")
    .eq("manufacturer_id", user.id)
  const { count: existingSerialCount } = await serviceClient
    .from("product_serials")
    .select("id", { count: "exact", head: true })
    .in("batch_id", (existingBatchIds ?? []).map((row) => row.id))

  const manufacturerCode = deriveManufacturerCode(manufacturer.company_name)
  const year = new Date(productionDate).getFullYear()
  const startingSequence = (existingSerialCount ?? 0) + 1

  // The batch row above already exists once we get here, so any failure
  // from this point on must delete it - otherwise a crash here (most
  // likely VERIGUARD_PILOT_PRIVATE_KEY missing) leaves a "generated"
  // batch sitting in the manufacturer's list with zero actual serials
  // behind it.
  let rows
  try {
    rows = Array.from({ length: quantity }, (_, index) => {
      const serialCode = formatSerialCode(manufacturerCode, year, startingSequence + index)
      const payload = buildQrPayload({
        serialCode,
        nafdacNumber: product.nafdac_number,
        productName: product.product_name,
        manufacturerName: manufacturer.company_name,
        batchNumber,
        productionDate,
        expiryDate,
        serialisationLevel,
      })
      return {
        batch_id: batch.id,
        serial_code: serialCode,
        status: "unscanned" as const,
        serialisation_level: serialisationLevel,
        qr_payload: JSON.stringify(payload),
        signature: signQrPayload(payload),
      }
    })
  } catch (err) {
    await serviceClient.from("serialised_products").delete().eq("id", batch.id)
    console.error("[manufacturers/generate] Signing failed", err)
    return NextResponse.json(
      { error: { message: "Code signing is not configured correctly. Contact support.", code: "signing_unavailable" } },
      { status: 502 }
    )
  }

  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE)
    const { error: insertError } = await serviceClient.from("product_serials").insert(chunk)
    if (insertError) {
      await serviceClient.from("serialised_products").delete().eq("id", batch.id)
      return NextResponse.json(
        { error: { message: `Generation failed partway through: ${insertError.message}`, code: "insert_failed" } },
        { status: 500 }
      )
    }
  }

  await serviceClient
    .from("manufacturer_profiles")
    .update({ units_generated_this_month: manufacturer.units_generated_this_month + quantity })
    .eq("id", user.id)

  await serviceClient
    .from("manufacturer_keys")
    .upsert({ manufacturer_id: user.id, public_key: getPilotPublicKey() }, { onConflict: "manufacturer_id" })

  // manufacturer_profiles.units_generated_this_month above (Phase 4) stays
  // the actual gate a few lines up - this is purely so usage_records has
  // real numbers for the Billing page's usage meter, which reads from the
  // Phase 5 schema rather than this manufacturer-specific column.
  await recordUsage(serviceClient, user.id, "serial_codes_generated", quantity)

  return NextResponse.json({ batchId: batch.id, generated: quantity })
}
