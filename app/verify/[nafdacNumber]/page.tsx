import Link from "next/link"
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/shared/logo"
import { createClient } from "@/lib/supabase/server"
import { decodeHtmlEntities } from "@/lib/utils/html-entities"
import { isUnderElevatedMonitoring } from "@/lib/nafdac/cache"

interface PublicVerifyPageProps {
  params: Promise<{ nafdacNumber: string }>
}

// Public, unauthenticated verification snapshot (Global Improvement #2:
// Verification Result Sharing) - reads only from nafdac_cache, which
// already has a public "Anyone can read" RLS policy (Module 1), rather
// than running the full live-scrape pipeline for anonymous visitors. That
// keeps this page fast and avoids an obvious abuse vector (anyone could
// otherwise hit an unauthenticated URL to trigger unlimited live NAFDAC
// scrapes). It's a snapshot of the last verified result, not a live
// re-check - the CTA below points visitors to the real app for that.
export default async function PublicVerifyPage({ params }: PublicVerifyPageProps) {
  const { nafdacNumber: rawNumber } = await params
  const nafdacNumber = decodeURIComponent(rawNumber).toUpperCase()

  const supabase = await createClient()
  const { data: cached } = await supabase
    .from("nafdac_cache")
    .select("product_name, company_name, product_category, elevated_until, confirmed_counterfeit")
    .eq("nafdac_number", nafdacNumber)
    .maybeSingle()

  const isElevated = isUnderElevatedMonitoring(cached?.elevated_until ?? null)
  const isConfirmedCounterfeit = cached?.confirmed_counterfeit ?? false

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-12 sm:px-6">
        {cached ? (
          <Card className={isConfirmedCounterfeit ? "w-full border-destructive/30 bg-destructive/5" : "w-full border-success/30 bg-success/5"}>
            <CardContent className="flex flex-col gap-3">
              <div
                className={
                  isConfirmedCounterfeit
                    ? "flex items-center gap-2 text-destructive"
                    : "flex items-center gap-2 text-success"
                }
              >
                {isConfirmedCounterfeit ? (
                  <ShieldAlert className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
                <span className="text-sm font-semibold tracking-wide uppercase">
                  {isConfirmedCounterfeit ? "Confirmed Counterfeit" : "Product Verified"}
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {decodeHtmlEntities(cached.product_name)} &mdash; {decodeHtmlEntities(cached.company_name)}
                </p>
                <p className="text-sm text-muted-foreground">
                  NAFDAC No: {nafdacNumber} | Category: {decodeHtmlEntities(cached.product_category)}
                </p>
              </div>
              {isConfirmedCounterfeit ? (
                <p className="text-sm text-foreground">
                  VeriGuard administrators have confirmed this NAFDAC number is being used on a
                  counterfeit product following an investigation. Do not purchase or use products
                  under this number without verifying directly with the seller and NAFDAC.
                </p>
              ) : (
                <p className="text-sm text-foreground">
                  This product is registered with NAFDAC as of our last check.
                </p>
              )}
              {isElevated && !isConfirmedCounterfeit && (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p className="text-foreground">
                    This product is currently under elevated monitoring due to unusual verification
                    activity. Proceed with caution.
                  </p>
                </div>
              )}
              {isConfirmedCounterfeit && (
                <Button
                  variant="outline"
                  className="w-fit"
                  nativeButton={false}
                  render={<Link href={`/report?nafdacNumber=${encodeURIComponent(nafdacNumber)}`} />}
                >
                  Report this product
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full border-warning/30 bg-warning/5">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-warning">
                <HelpCircle className="size-5" />
                <span className="text-sm font-semibold tracking-wide uppercase">Not Yet Verified</span>
              </div>
              <p className="text-sm text-foreground">
                NAFDAC number <span className="font-medium">{nafdacNumber}</span> hasn&apos;t been
                checked on VeriGuard yet, so we don&apos;t have a result to show here.
              </p>
              <Button
                variant="outline"
                className="w-fit"
                nativeButton={false}
                render={<Link href={`/report?nafdacNumber=${encodeURIComponent(nafdacNumber)}`} />}
              >
                Report this product
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Verify NAFDAC-registered products, track expiry dates, and stay ahead of recalls.
          </p>
          <Button nativeButton={false} render={<Link href="/register?role=consumer" />}>
            Verify your own products
          </Button>
        </div>
      </main>
    </div>
  )
}
