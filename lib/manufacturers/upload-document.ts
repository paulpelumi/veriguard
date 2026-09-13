import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

const BUCKET = "manufacturer-documents"

// Returns the storage PATH, not a public URL - the bucket is private, so
// there's no stable public URL to store. Admin review generates a
// time-limited signed URL from this path on demand (see
// app/api/admin/manufacturers/[id]/documents/route.ts), since an admin's
// own session can't read another user's path directly under the
// per-manufacturer storage RLS policy (0015_manufacturer_portal_schema.sql).
export async function uploadManufacturerDocument(
  supabase: SupabaseClient<Database>,
  userId: string,
  label: "nafdac-certificate" | "cac-certificate",
  file: File
): Promise<string | null> {
  const extension = file.name.split(".").pop() ?? "bin"
  const path = `${userId}/${label}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) {
    console.error(`[manufacturer-documents] upload failed for ${label}`, error)
    return null
  }
  return path
}
