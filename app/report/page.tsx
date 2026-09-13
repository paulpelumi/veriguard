import Link from "next/link"

import { CounterfeitReportForm } from "@/components/reports/counterfeit-report-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/shared/logo"

// Public, no-login counterfeit reporting - CounterfeitReportForm already
// supports this (reporter_id: user?.id ?? null, and "Anyone can insert
// counterfeit reports" has always allowed it at the RLS level), it just
// had no route outside the authenticated consumer dashboard. Anonymous
// submission is intentional here rather than gating on sign-up first:
// lower friction for the person who most needs to act quickly.
export default async function PublicReportPage({
  searchParams,
}: {
  searchParams: Promise<{ nafdacNumber?: string; productName?: string }>
}) {
  const { nafdacNumber, productName } = await searchParams

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Report a Counterfeit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Help protect others by flagging a product you suspect isn&apos;t genuine. No account
            needed.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Report</CardTitle>
          </CardHeader>
          <CardContent>
            <CounterfeitReportForm initialNafdacNumber={nafdacNumber} initialProductName={productName} />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Want to track your reports and get recall alerts?{" "}
          <Link href="/register?role=consumer" className="font-medium text-primary hover:underline">
            Sign up for VeriGuard
          </Link>
        </p>
      </main>
    </div>
  )
}
