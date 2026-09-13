import Link from "next/link"

import { PublicSerialResult } from "@/components/verification/public-serial-result"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/shared/logo"
import { verifySerial } from "@/lib/serials/verify-service"
import { createClient } from "@/lib/supabase/server"

interface PublicSerialVerifyPageProps {
  params: Promise<{ serialCode: string }>
}

// The public page every physical VeriGuard QR code actually points to
// (see buildVerificationUrl in lib/manufacturers/code-generator.ts) - no
// login, works for anyone's phone camera. Unlike the NAFDAC snapshot page
// next door (app/verify/[nafdacNumber]), this runs the real, live
// record_serial_scan() check - an anonymous re-scan of the same physical
// unit is exactly the signal (a genuine duplicate) the whole scan-and-
// consume model is designed to catch, not an abuse vector to guard
// against, so there's no cached/rate-limited snapshot here.
export default async function PublicSerialVerifyPage({ params }: PublicSerialVerifyPageProps) {
  const { serialCode: rawSerial } = await params
  const serialCode = decodeURIComponent(rawSerial).toUpperCase()

  const supabase = await createClient()
  const result = await verifySerial(supabase, serialCode, { state: null, lga: null }).catch(() => null)

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-12 sm:px-6">
        {result ? (
          <PublicSerialResult result={result} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Something went wrong checking this code. Please try again shortly.
          </p>
        )}

        {/* Duplicate/flagged scans already auto-generate a report (Module 5) -
            this manual CTA only appears where nothing was created automatically. */}
        {result && (result.status === "not_found" || result.status === "tampered") && (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/report?nafdacNumber=${encodeURIComponent(result.product?.nafdac_number ?? "")}&productName=${encodeURIComponent(result.product?.name ?? "")}`}
              />
            }
          >
            Report this product
          </Button>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Verify NAFDAC-registered products, track expiry dates, and stay ahead of recalls.
          </p>
          <Button nativeButton={false} render={<Link href="/register?role=consumer" />}>
            Sign up for VeriGuard
          </Button>
        </div>
      </main>
    </div>
  )
}
