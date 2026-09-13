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
  // Allow the key to be stored as a single line with literal "\n"
  // escapes instead of real line breaks - common when an env var UI or
  // .env file doesn't preserve a pasted multi-line value. Checking for
  // "-----BEGIN" here would always be true regardless of which form the
  // key is in (both contain that literal substring), so the actual test
  // has to be for a real newline character already being present.
  return key.includes("\n") ? key : key.replace(/\\n/g, "\n")
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
