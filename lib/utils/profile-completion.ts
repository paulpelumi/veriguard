const SKIP_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000

// Shared between business/layout.tsx and consumer/layout.tsx so the "missing
// state or phone, and not skipped within the last 3 days" rule (spec) stays
// in one place.
export function shouldShowProfileCompletionModal(profile: {
  phone: string | null
  state: string | null
  profile_completion_skipped_at: string | null
}): boolean {
  const isMissingRequiredField = !profile.phone || !profile.state
  if (!isMissingRequiredField) return false

  if (!profile.profile_completion_skipped_at) return true

  const skippedAt = new Date(profile.profile_completion_skipped_at).getTime()
  return Date.now() - skippedAt >= SKIP_COOLDOWN_MS
}
