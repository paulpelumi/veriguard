import crypto from "crypto"

const PAYSTACK_BASE_URL = "https://api.paystack.co"

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured")
  }
  return key
}

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data?: {
    id: number
    status: "success" | "failed" | "abandoned"
    reference: string
    amount: number
    currency: string
    paid_at: string | null
    customer: { email: string; customer_code: string }
    authorization: { authorization_code: string } | null
    metadata: Record<string, unknown> | null
  }
}

// Every Paystack call goes through the same pilot secret key - there's no
// per-manufacturer merchant split for this pilot, matching the same
// single-shared-key pattern used for QR signing (crypto-signer.ts).
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${getSecretKey()}` },
    }
  )

  return (await response.json()) as PaystackVerifyResponse
}

// Paystack signs every webhook body with HMAC-SHA512 using the secret key
// and sends it as the x-paystack-signature header - this is the only way
// to tell a real delivery from anyone who discovers the webhook URL and
// POSTs a fake "charge.success" event to grant themselves a subscription.
// timingSafeEqual (not ===) so a signature comparison can't leak timing
// information about how many leading bytes matched.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false

  const expected = crypto.createHmac("sha512", getSecretKey()).update(rawBody).digest("hex")
  const expectedBuffer = Buffer.from(expected, "hex")
  const receivedBuffer = Buffer.from(signatureHeader, "hex")

  if (expectedBuffer.length !== receivedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}

export function generatePaymentReference(): string {
  return `vg_${crypto.randomBytes(12).toString("hex")}`
}
