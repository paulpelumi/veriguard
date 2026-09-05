"use client"

import { useState } from "react"
import { AlertTriangle, Ban, CheckCircle2, ChevronDown, Factory, RefreshCw, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { NafdacVerificationResult } from "@/types"

const GREENBOOK_URL = "https://greenbook.nafdac.gov.ng"

// Shown on top of either a "verified" or "verified_with_warnings" card when
// the number has an active critical anomaly flag (Module 4) - this is an
// activity signal independent of the registration status itself, so it
// layers onto both outcomes rather than being its own card state.
function ElevatedMonitoringBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold uppercase tracking-wide text-destructive">
          Elevated Monitoring
        </p>
        <p className="text-foreground">
          This product is currently under elevated monitoring due to unusual verification
          activity. Proceed with caution.
        </p>
      </div>
    </div>
  )
}

// A confirmed counterfeit (Module 7 admin action) is a stronger claim than
// an ordinary mismatch or elevated-monitoring flag - it's a human-reviewed
// determination, not an automated heuristic - so it gets its own, more
// severe banner rather than folding into the mismatch list.
function ConfirmedCounterfeitBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/15 p-3 text-sm">
      <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold uppercase tracking-wide text-destructive">
          Confirmed Counterfeit
        </p>
        <p className="text-foreground">
          VeriGuard has confirmed this NAFDAC number is being used on a counterfeit product,
          following a reviewed report. Do not sell or use products under this number.
        </p>
      </div>
    </div>
  )
}

interface VerificationResultCardProps {
  result: NafdacVerificationResult
  onRetry: () => void
  onTryDifferent: () => void
  onReportIssue: () => void
}

export function VerificationResultCard({
  result,
  onRetry,
  onTryDifferent,
  onReportIssue,
}: VerificationResultCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (result.status === "verified_with_warnings" && result.product) {
    const { product } = result
    const mismatches = result.mismatches ?? []

    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-col gap-3">
          {result.confirmed_counterfeit && <ConfirmedCounterfeitBanner />}
          {result.elevated_monitoring && <ElevatedMonitoringBanner />}
          <div className="flex items-center gap-2 text-warning">
            <ShieldAlert className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Registered But Suspicious
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {product.name} — {product.company}
            </p>
            <p className="text-sm text-muted-foreground">
              NAFDAC No: {product.registration_number} | Category: {product.category}
            </p>
          </div>
          <p className="text-sm text-foreground">
            This NAFDAC number is registered, but inconsistencies were detected:
          </p>
          <ul className="flex flex-col gap-2">
            {mismatches.map((mismatch, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Badge
                  variant={mismatch.severity === "critical" ? "destructive" : undefined}
                  className={cn(
                    "mt-0.5 shrink-0 border-transparent",
                    mismatch.severity !== "critical" && "bg-warning/10 text-warning"
                  )}
                >
                  {mismatch.severity}
                </Badge>
                <span className="text-foreground">{mismatch.message}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium text-foreground">
            Exercise caution. This product may be misusing a valid NAFDAC number.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="destructive" size="sm" onClick={onReportIssue}>
              Report as Suspicious
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={GREENBOOK_URL} target="_blank" rel="noreferrer" />}
            >
              View NAFDAC Record
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (result.status === "verified" && result.product) {
    const { product } = result
    const details = Object.entries(product.additional_info ?? {}).filter(([, value]) => value)

    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex flex-col gap-3">
          {result.elevated_monitoring && <ElevatedMonitoringBanner />}
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Product Verified
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {product.name} — {product.company}
            </p>
            <p className="text-sm text-muted-foreground">
              NAFDAC No: {product.registration_number} | Category: {product.category}
            </p>
          </div>
          <p className="text-sm text-foreground">
            This product is registered with NAFDAC and is authentic.
          </p>

          {result.gs1_check?.match === "confirmed" && (
            <div className="flex items-center gap-1.5 border-t border-success/20 pt-3 text-sm text-foreground">
              <Factory className="size-4 shrink-0 text-success" />
              GS1 Barcode: Confirmed — Registered to {result.gs1_check.gs1_company}
            </div>
          )}

          {details.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowDetails((current) => !current)}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <ChevronDown
                  className={cn("size-4 transition-transform", showDetails && "rotate-180")}
                />
                {showDetails ? "Hide" : "View"} Full Details
              </button>
              {showDetails && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {details.map(([key, value]) => (
                    <div key={key} className="contents">
                      <dt className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1")}
                      </dt>
                      <dd className="text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onReportIssue}>
              Report Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (result.status === "not_found" && result.coverage_gap) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Category Not Covered
            </span>
          </div>
          <p className="text-sm text-foreground">{result.message}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onTryDifferent}>
              Try Different Number
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (result.status === "not_found") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Product Not Found
            </span>
          </div>
          <p className="text-sm text-foreground">{result.message}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="destructive" size="sm" onClick={onReportIssue}>
              Report as Counterfeit
            </Button>
            <Button variant="outline" size="sm" onClick={onTryDifferent}>
              Try Different Number
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // unavailable, invalid_format, or error
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-warning">
          <RefreshCw className="size-5" />
          <span className="text-sm font-semibold tracking-wide uppercase">
            NAFDAC Portal Unavailable
          </span>
        </div>
        <p className="text-sm text-foreground">{result.message}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
