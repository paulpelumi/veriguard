import crypto from "crypto"

const KEY_PREFIX = "vg_live_"
// 24 random bytes -> 48 hex chars, well past the point where guessing is
// feasible - the same order of magnitude as the pilot RSA signing key, not
// something worth trimming down for a shorter-looking key.
const SECRET_BYTES = 24
// Shown in the UI so an owner can tell keys apart without ever displaying
// the secret again after creation - long enough to be useful as an
// identifier, short enough that it reveals nothing about the rest of the
// key.
const DISPLAY_PREFIX_LENGTH = KEY_PREFIX.length + 8

export interface GeneratedApiKey {
  rawKey: string
  keyHash: string
  keyPrefix: string
}

// The raw key is returned to the caller exactly once, at creation time -
// only its SHA-256 hash is ever persisted (api_keys.key_hash), the same
// "never store the secret itself" principle as a password hash. Losing the
// raw key means generating a new one; there is no recovery path, by design.
export function generateApiKey(): GeneratedApiKey {
  const rawKey = `${KEY_PREFIX}${crypto.randomBytes(SECRET_BYTES).toString("hex")}`
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, DISPLAY_PREFIX_LENGTH),
  }
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex")
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX)
}
