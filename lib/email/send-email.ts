import { Resend } from "resend"

// Defaults to Resend's own shared test sender, which only reliably
// delivers to the address that owns the Resend account until a real
// domain is verified via DNS - fine for testing this module, not for
// emailing arbitrary manufacturers later. Swapping in a verified domain
// once available is just changing this one env var, not any calling code.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "VeriGuard <onboarding@resend.dev>"

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

// Never throws - a failed email (missing key, Resend outage, unverified
// recipient during test mode) should never break the registration/review
// flow that triggered it. Callers get a boolean and can log accordingly.
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set - skipping send to", input.to)
    return false
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })
    if (error) {
      console.error("[email] Resend rejected the send", error)
      return false
    }
    return true
  } catch (error) {
    console.error("[email] send failed", error)
    return false
  }
}
