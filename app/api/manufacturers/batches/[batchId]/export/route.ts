import { NextResponse, type NextRequest } from "next/server"

import { EXPORT_FORMATS, type ExportFormat } from "@/lib/manufacturers/machine-types"
import { generateExport, IMPLEMENTED_EXPORT_FORMATS } from "@/lib/manufacturers/export-engine"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized", code: "unauthorized" } }, { status: 401 })
  }

  const format = new URL(request.url).searchParams.get("format") as ExportFormat | null
  if (!format || !EXPORT_FORMATS.includes(format)) {
    return NextResponse.json({ error: { message: "Invalid export format", code: "invalid_request" } }, { status: 400 })
  }
  if (!IMPLEMENTED_EXPORT_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: { message: "This export format is not yet available.", code: "not_implemented" } },
      { status: 501 }
    )
  }

  const { data: batch, error: batchError } = await supabase
    .from("serialised_products")
    .select("id, batch_number, production_date, expiry_date, product_name, export_count")
    .eq("id", batchId)
    .eq("manufacturer_id", user.id)
    .maybeSingle()

  if (batchError || !batch) {
    return NextResponse.json({ error: { message: "Batch not found", code: "not_found" } }, { status: 404 })
  }

  const { data: serials, error: serialsError } = await supabase
    .from("product_serials")
    .select("serial_code, qr_payload")
    .eq("batch_id", batchId)
    .order("serial_code", { ascending: true })

  if (serialsError) {
    return NextResponse.json({ error: { message: serialsError.message, code: "query_failed" } }, { status: 500 })
  }

  const result = generateExport(
    format,
    {
      batchNumber: batch.batch_number,
      productionDate: batch.production_date,
      expiryDate: batch.expiry_date,
      productName: batch.product_name,
    },
    (serials ?? []).map((s) => ({ serialCode: s.serial_code, qrPayload: s.qr_payload ?? "" }))
  )

  await supabase
    .from("serialised_products")
    .update({ export_format: format, export_count: batch.export_count + 1, last_exported_at: new Date().toISOString() })
    .eq("id", batchId)

  return new NextResponse(result.content, {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${batch.batch_number}.${result.fileExtension}"`,
    },
  })
}
