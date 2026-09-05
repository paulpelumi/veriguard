"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { NafdacVerificationResult } from "@/types"

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

  if (result.status === "verified" && result.product) {
    const { product } = result
    const details = Object.entries(product.additional_info ?? {}).filter(([, value]) => value)

    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex flex-col gap-3">
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
