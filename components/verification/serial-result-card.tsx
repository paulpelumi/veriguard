import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils/date"
import type { SerialVerificationResult } from "@/types"

interface SerialResultCardProps {
  result: SerialVerificationResult
  onTryDifferent: () => void
}

export function SerialResultCard({ result, onTryDifferent }: SerialResultCardProps) {
  if (result.status === "verified_first_scan" && result.product) {
    const { product } = result
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              First Scan Verified
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
          <p className="text-sm text-foreground">{result.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (result.status === "verified_duplicate_scan") {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Serial Already Scanned
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
          {result.manufacturer && (
            <p className="text-sm text-muted-foreground">
              Manufacturer: {result.manufacturer.name}
            </p>
          )}
          <p className="text-sm text-foreground">{result.message}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onTryDifferent}>
              Try Different Code
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // not_found or error
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          <span className="text-sm font-semibold tracking-wide uppercase">
            Serial Not Recognized
          </span>
        </div>
        <p className="text-sm text-foreground">{result.message}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onTryDifferent}>
            Try Different Code
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
