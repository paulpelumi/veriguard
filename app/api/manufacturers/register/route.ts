import { NextResponse } from "next/server"

import { runAutoCheckAndNotify } from "@/lib/manufacturers/process-application"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const BUCKET = "manufacturer-documents"
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]

function requiredString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function validateDocument(file: FormDataEntryValue | null): string | null {
  if (!(file instanceof File)) return "Missing file"
  if (!ACCEPTED_TYPES.includes(file.type)) return "Only PDF, JPG, or PNG files are accepted."
  if (file.size > MAX_FILE_BYTES) return "File must be 5MB or smaller."
  return null
}

// Called right after supabase.auth.signUp() during registration - deliberately
// NOT gated on having a session, since a project with "Confirm email" turned
// on never returns one until the link is clicked. The only thing this route
// can rely on is the userId signUp() already handed back synchronously. Uses
// the service role for the storage upload and the manufacturer_profiles
// insert because of that: there is no caller session for RLS to key off of.
export async function POST(request: Request) {
  const formData = await request.formData()

  const userId = requiredString(formData, "userId")
  const companyName = requiredString(formData, "companyName")
  const cacNumber = requiredString(formData, "cacNumber")
  const state = requiredString(formData, "state")
  const address = requiredString(formData, "address")
  const phone = requiredString(formData, "phone")
  const nafdacManufacturerCode = requiredString(formData, "nafdacManufacturerCode")
  const website = requiredString(formData, "website")
  const productionVolumeMonthlyRaw = requiredString(formData, "productionVolumeMonthly")
  const productCategoriesRaw = requiredString(formData, "productCategories")

  if (!userId || !companyName || !cacNumber || !state || !address || !phone || !productCategoriesRaw) {
    return NextResponse.json(
      { error: { message: "Missing required fields", code: "invalid_request" } },
      { status: 400 }
    )
  }

  let productCategories: string[]
  try {
    productCategories = JSON.parse(productCategoriesRaw)
    if (!Array.isArray(productCategories)) throw new Error("not an array")
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid product categories", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const nafdacCertificate = formData.get("nafdacCertificate")
  const cacCertificate = formData.get("cacCertificate")
  const nafdacError = validateDocument(nafdacCertificate)
  const cacError = validateDocument(cacCertificate)
  if (nafdacError || cacError) {
    return NextResponse.json(
      { error: { message: nafdacError ?? cacError, code: "invalid_document" } },
      { status: 400 }
    )
  }

  const serviceClient = createServiceRoleClient()

  const { data: existing } = await serviceClient
    .from("manufacturer_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: { message: "An application already exists for this account", code: "already_exists" } },
      { status: 409 }
    )
  }

  const nafdacFile = nafdacCertificate as File
  const cacFile = cacCertificate as File
  const nafdacExtension = nafdacFile.name.split(".").pop() ?? "bin"
  const cacExtension = cacFile.name.split(".").pop() ?? "bin"
  const nafdacPath = `${userId}/nafdac-certificate-${Date.now()}.${nafdacExtension}`
  const cacPath = `${userId}/cac-certificate-${Date.now()}.${cacExtension}`

  const [nafdacUpload, cacUpload] = await Promise.all([
    serviceClient.storage.from(BUCKET).upload(nafdacPath, nafdacFile, { upsert: true }),
    serviceClient.storage.from(BUCKET).upload(cacPath, cacFile, { upsert: true }),
  ])

  const { error: insertError } = await serviceClient.from("manufacturer_profiles").insert({
    id: userId,
    company_name: companyName,
    cac_number: cacNumber,
    nafdac_manufacturer_code: nafdacManufacturerCode,
    product_categories: productCategories,
    production_volume_monthly: productionVolumeMonthlyRaw ? Number(productionVolumeMonthlyRaw) : null,
    state,
    address,
    phone,
    website,
    nafdac_certificate_url: nafdacUpload.error ? null : nafdacPath,
    cac_certificate_url: cacUpload.error ? null : cacPath,
  })

  if (insertError) {
    return NextResponse.json(
      { error: { message: insertError.message, code: "insert_failed" } },
      { status: 500 }
    )
  }

  // A manual signup's profiles.role is already 'manufacturer' by the time
  // this route runs (set via signUp()'s metadata, Module 1). An
  // OAuth-authenticated caller arriving here from the role picker
  // (app/onboarding/role) never had that step - profiles.role is still
  // whatever handle_new_user's trigger defaulted it to ('consumer'). Safe
  // to always set it here regardless of entry path.
  await serviceClient.from("profiles").update({ role: "manufacturer" }).eq("id", userId)

  const autoCheck = await runAutoCheckAndNotify(serviceClient, userId, companyName)

  return NextResponse.json({
    auto_check: autoCheck,
    documents_uploaded: !nafdacUpload.error && !cacUpload.error,
  })
}
