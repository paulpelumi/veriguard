import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils/date"
import type { SerialVerificationResult } from "@/types"

// Standalone, public-page version of components/verification/serial-result-card.tsx
// - no "Try Different Code" button (there's no input field on this page to
// retry against; the URL itself is the input) and no interactivity at all,
// since this renders server-side for an anonymous visitor.
export function PublicSerialResult({ result }: { result: SerialVerificationResult }) {
  if (result.status === "verified_first_scan" && result.product) {
    const { product } = result
    return (
      <Card className="w-full border-success/30 bg-success/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Authentic - First Scan Confirmed
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{product.name}</p>
            <p className="text-sm text-muted-foreground">
              NAFDAC No: {product.nafdac_number} | Batch: {product.batch_number} | Expires{" "}
              {formatDate(product.expiry_date)}
            </p>
          </div>
          {result.manufacturer && (
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <ShieldCheck className="size-4 text-success" />
              Manufacturer: {result.manufacturer.name}
              {result.manufacturer.is_verified && (
                <Badge className="border-transparent bg-success/10 text-success">Verified</Badge>
              )}
            </div>
          )}
          {result.signature_valid && (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <ShieldCheck className="size-4" />
              Cryptographic signature: valid
            </p>
          )}
          <p className="text-sm text-foreground">{result.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (result.status === "verified_duplicate_scan") {
    return (
      <Card className="w-full border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Duplicate Detected - Possible Counterfeit
            </span>
          </div>
          {result.product && (
            <div>
              <p className="text-lg font-semibold text-foreground">{result.product.name}</p>
              <p className="text-sm text-muted-foreground">
                NAFDAC No: {result.product.nafdac_number} | Batch: {result.product.batch_number}
              </p>
            </div>
          )}
          <div className="rounded-lg border border-destructive/20 bg-card p-3 text-sm">
            <p className="text-foreground">
              First scan: {result.first_scanned_location ?? "unknown location"}
              {result.first_scanned_at ? ` on ${formatDate(result.first_scanned_at)}` : ""}
            </p>
            <p className="text-foreground">Total scans of this code: {result.scan_count}</p>
          </div>
          <p className="text-sm font-medium text-destructive">Do not consume or use this product.</p>
          <p className="text-sm text-foreground">{result.message}</p>
          {result.report_reference && (
            <p className="text-sm text-muted-foreground">
              A counterfeit report has been automatically submitted. Reference:{" "}
              <span className="font-mono text-foreground">{result.report_reference}</span>
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (result.status === "tampered") {
    return (
      <Card className="w-full border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">Signature Invalid</span>
          </div>
          <p className="text-sm text-foreground">{result.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full border-warning/30 bg-warning/5">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="size-5" />
          <span className="text-sm font-semibold tracking-wide uppercase">Serial Not Recognized</span>
        </div>
        <p className="text-sm text-foreground">{result.message}</p>
      </CardContent>
    </Card>
  )
}
