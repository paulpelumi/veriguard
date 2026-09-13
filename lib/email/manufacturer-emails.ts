import { sendEmail } from "@/lib/email/send-email"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://veriguard.ng"

function wrapEmail(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">The VeriGuard Team</p>
    </div>
  `
}

export async function sendApplicationReceivedEmail(to: string, name: string, companyName: string) {
  return sendEmail({
    to,
    subject: "We've received your VeriGuard manufacturer application",
    html: wrapEmail(`
      <p>Dear ${name},</p>
      <p>Thank you for applying to become a verified manufacturer on VeriGuard.
      <strong>${companyName}</strong>'s application, along with your NAFDAC and CAC
      certificates, is now with our team for review.</p>
      <p>Review typically takes 24&ndash;48 hours. We'll email you as soon as a decision is made.</p>
      <p><a href="${APP_URL}/manufacturer/dashboard">View your application status</a></p>
    `),
  })
}

export async function sendManufacturerApprovedEmail(to: string, name: string, companyName: string) {
  return sendEmail({
    to,
    subject: "Your VeriGuard Manufacturer Account Has Been Approved",
    html: wrapEmail(`
      <p>Dear ${name},</p>
      <p>Congratulations! <strong>${companyName}</strong> has been approved as a verified
      manufacturer on VeriGuard.</p>
      <p>You can now:</p>
      <ul>
        <li>Add your coding machines and label printers</li>
        <li>Create product batches and generate serialised QR codes</li>
        <li>Export codes in formats compatible with your existing equipment</li>
        <li>Monitor your products through Nigeria's supply chain</li>
      </ul>
      <p><a href="${APP_URL}/manufacturer/dashboard">Log in to your dashboard</a></p>
      <p>Your VeriGuard Pilot subscription is active and includes up to 1,000,000 serial
      codes per month at no charge during the pilot period.</p>
    `),
  })
}

export async function sendManufacturerRejectedEmail(
  to: string,
  name: string,
  companyName: string,
  reason: string
) {
  return sendEmail({
    to,
    subject: "Update on your VeriGuard Manufacturer Application",
    html: wrapEmail(`
      <p>Dear ${name},</p>
      <p>Thank you for applying to VeriGuard on behalf of <strong>${companyName}</strong>.
      After review, we're unable to approve this application at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>You're welcome to address the issue above and reapply from your dashboard.</p>
      <p><a href="${APP_URL}/manufacturer/dashboard">View your application</a></p>
    `),
  })
}
