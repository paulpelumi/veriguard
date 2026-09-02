import Link from "next/link"
import { ShieldCheck, Store, User, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Logo } from "@/components/shared/logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"

const consumerBenefits = [
  "Instant NAFDAC number lookup",
  "Scan barcodes to verify products",
  "Get alerted when a product you searched is recalled",
]

const businessBenefits = [
  "Track inventory with expiry alerts before it's too late",
  "Verify NAFDAC numbers right at stock entry",
  "Cross-check your stock against active recalls automatically",
]

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" render={<Link href="/login" />}>
            Log in
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-12 px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <ShieldCheck className="size-4" />
            Verify &bull; Monitor &bull; Protect
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Nigeria&apos;s trust layer for food, drug &amp; product safety
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
            Verify NAFDAC-registered products, track expiry dates, and stay ahead
            of recalls &mdash; whether you&apos;re a shopper or a business.
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="size-5 text-primary" />
              </div>
              <CardTitle className="text-xl">I&apos;m a Consumer</CardTitle>
              <CardDescription>
                Verify products before you buy or use them.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {consumerBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                render={<Link href="/register?role=consumer" />}
              >
                Continue as Consumer
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Store className="size-5 text-primary" />
              </div>
              <CardTitle className="text-xl">I&apos;m a Business</CardTitle>
              <CardDescription>
                Manage inventory and stay compliant with NAFDAC.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {businessBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                render={<Link href="/register?role=business" />}
              >
                Continue as Business
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
