import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const SIGNED_URL_EXPIRY_SECONDS = 60 * 10

// The manufacturer-documents bucket's storage policy scopes reads to the
// uploader's own auth.uid() path (0015_manufacturer_portal_schema.sql), so
// an admin's own session can't read another manufacturer's file directly -
// this generates a short-lived signed URL via the service role instead,
// which bypasses that policy entirely.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const { data: manufacturer, error: fetchError } = await supabase
    .from("manufacturer_profiles")
    .select("nafdac_certificate_url, cac_certificate_url")
    .eq("id", id)
    .maybeSingle()

  if (fetchError || !manufacturer) {
    return NextResponse.json(
      { error: { message: "Manufacturer not found", code: "not_found" } },
      { status: 404 }
    )
  }

  const serviceClient = createServiceRoleClient()
  const [nafdacResult, cacResult] = await Promise.all([
    manufacturer.nafdac_certificate_url
      ? serviceClient.storage
          .from("manufacturer-documents")
          .createSignedUrl(manufacturer.nafdac_certificate_url, SIGNED_URL_EXPIRY_SECONDS)
      : Promise.resolve({ data: null, error: null }),
    manufacturer.cac_certificate_url
      ? serviceClient.storage
          .from("manufacturer-documents")
          .createSignedUrl(manufacturer.cac_certificate_url, SIGNED_URL_EXPIRY_SECONDS)
      : Promise.resolve({ data: null, error: null }),
  ])

  return NextResponse.json({
    nafdac_certificate_url: nafdacResult.data?.signedUrl ?? null,
    cac_certificate_url: cacResult.data?.signedUrl ?? null,
  })
}
