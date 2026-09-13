import crypto from "crypto"

// Every manufacturer signs with one shared pilot key for now, per spec:
// per-manufacturer keys were deferred out of Module 1 (nothing needed
// signing yet), and manufacturer_keys.public_key just stores this same
// key's public half for every manufacturer row rather than tracking N
// distinct keys the platform doesn't actually issue yet. Swapping to
// real per-manufacturer keys later only touches this file and the
// manufacturer_keys population step in code-generator.ts - the QR
// payload shape and verification call in Module 5 don't change.
function getPilotPrivateKey(): string {
  const key = process.env.VERIGUARD_PILOT_PRIVATE_KEY
  if (!key) throw new Error("VERIGUARD_PILOT_PRIVATE_KEY is not set")
  // Allow the key to be stored with literal "\n" escapes (common when
  // pasting a multi-line PEM into a single-line env var UI like Vercel's).
  return key.includes("-----BEGIN") ? key : key.replace(/\\n/g, "\n")
}

export function getPilotPublicKey(): string {
  const privateKey = crypto.createPrivateKey(getPilotPrivateKey())
  return crypto.createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString()
}

export function signQrPayload(payload: object): string {
  const sign = crypto.createSign("SHA256")
  sign.update(JSON.stringify(payload))
  sign.end()
  return sign.sign(getPilotPrivateKey(), "base64")
}

export function verifyQrSignature(payload: object, signature: string, publicKey: string): boolean {
  const verify = crypto.createVerify("SHA256")
  verify.update(JSON.stringify(payload))
  verify.end()
  return verify.verify(publicKey, signature, "base64")
}
