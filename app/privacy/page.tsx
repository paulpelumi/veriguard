import Link from "next/link"

import { Logo } from "@/components/shared/logo"

export const metadata = {
  title: "Privacy Policy | VeriGuard",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: September 2026</p>
        </div>

        <section className="flex flex-col gap-3 text-sm leading-relaxed text-foreground">
          <p>
            VeriGuard (&quot;we&quot;, &quot;us&quot;) helps consumers and businesses verify
            NAFDAC-registered products, track expiry dates, and stay informed about product
            recalls in Nigeria. This policy explains what information we collect, how we use it,
            and the choices you have.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">Information we collect</h2>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Account information:</strong> name, email,
              phone number, account type (consumer, business, or manufacturer), and, for business
              accounts, business name and type.
            </li>
            <li>
              <strong className="text-foreground">Location:</strong> your state and local
              government area (LGA), used to power recall and product-safety intelligence for
              your area. We do not collect precise GPS location.
            </li>
            <li>
              <strong className="text-foreground">Verification activity:</strong> the NAFDAC
              numbers, barcodes, or serial codes you check, and the results, so we can show your
              history and detect unusual patterns that may indicate counterfeiting.
            </li>
            <li>
              <strong className="text-foreground">Inventory data:</strong> for business accounts,
              the product listings, batch numbers, and expiry dates you enter to track your stock.
            </li>
            <li>
              <strong className="text-foreground">Counterfeit reports:</strong> details you submit
              when reporting a suspicious product, including where and why you suspect it.
            </li>
            <li>
              <strong className="text-foreground">WhatsApp messages:</strong> if you message our
              WhatsApp number, we process the message content (text or a photo of a barcode) to
              return a verification result, and log the request the same way as a web
              verification. If your WhatsApp number matches a registered VeriGuard account, we
              link the request to that account; otherwise it is logged without any account
              association.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">How we use this information</h2>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            <li>To perform the NAFDAC verification, recall-matching, and reporting features you use directly.</li>
            <li>To detect unusual verification activity that may indicate counterfeit products in circulation.</li>
            <li>To send you expiry, recall, or verification-related notifications you&apos;ve opted into.</li>
            <li>
              To produce aggregated, anonymized statistics (e.g. counterfeit report density by
              state) used for platform-wide product-safety intelligence. These aggregates do not
              identify individual users.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">Who we share information with</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We do not sell your personal information. We use Supabase to host our database and
            authentication, and Meta&apos;s WhatsApp Business Platform to deliver and receive
            WhatsApp messages if you choose to use that channel - both process data strictly to
            provide the service on our behalf. We may disclose confirmed counterfeit findings to
            NAFDAC or other relevant regulatory authorities as part of our safety mission.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">Data security</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your data is protected in transit with HTTPS and at rest in our database, with access
            controls that ensure users can only see their own account data unless explicitly
            shared (for example, business report data reviewed by our platform administrators).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">Your choices</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You can review and update your profile information from your account settings at any
            time. To request deletion of your account and associated data, or to ask any question
            about this policy, contact us at{" "}
            <a href="mailto:privacy@veriguard.ng" className="text-primary underline">
              privacy@veriguard.ng
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">Changes to this policy</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We may update this policy as VeriGuard adds new features. We&apos;ll update the date
            at the top of this page when we do.
          </p>
        </section>
      </main>
    </div>
  )
}
