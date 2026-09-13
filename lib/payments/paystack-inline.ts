"use client"

const INLINE_SCRIPT_SRC = "https://js.paystack.co/v1/inline.js"

interface PaystackChargeResponse {
  reference: string
  status: string
}

interface PaystackSetupOptions {
  key: string
  email: string
  amount: number
  ref: string
  currency?: string
  metadata?: Record<string, unknown>
  callback: (response: PaystackChargeResponse) => void
  onClose: () => void
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackSetupOptions) => { openIframe: () => void }
    }
  }
}

let scriptLoadPromise: Promise<void> | null = null

// Loaded lazily on first checkout attempt rather than as a root-layout
// <script> tag - only the pricing and billing pages ever trigger a
// checkout, so most visitors never need it.
function loadInlineScript(): Promise<void> {
  if (typeof window !== "undefined" && window.PaystackPop) {
    return Promise.resolve()
  }
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = INLINE_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error("Could not load Paystack checkout. Check your connection and try again."))
    }
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

export interface OpenCheckoutParams {
  email: string
  amountKobo: number
  reference: string
  metadata: Record<string, unknown>
  onSuccess: (reference: string) => void
  onClose: () => void
}

// This is the whole point of the switch away from Paystack's Standard
// Checkout: setup().openIframe() renders the payment form in an overlay on
// top of the current page instead of navigating the browser away to
// checkout.paystack.com and back via a callback_url.
export async function openPaystackCheckout(params: OpenCheckoutParams): Promise<void> {
  await loadInlineScript()

  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
  if (!publicKey || !window.PaystackPop) {
    throw new Error("Checkout is not configured correctly. Contact support.")
  }

  const handler = window.PaystackPop.setup({
    key: publicKey,
    email: params.email,
    amount: params.amountKobo,
    ref: params.reference,
    currency: "NGN",
    metadata: params.metadata,
    callback: (response) => params.onSuccess(response.reference),
    onClose: params.onClose,
  })

  handler.openIframe()
}
