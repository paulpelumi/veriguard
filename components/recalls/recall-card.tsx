"use client"

import { useState } from "react"
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils/date"
import type { RecallAlert, RecallSeverity } from "@/types"

interface RecallCardProps {
  recall: RecallAlert
  isAffecting: boolean
  matchedProductNames?: string[]
}

const severityVariant: Record<RecallSeverity, "destructive" | "default"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "default",
}

export function RecallCard({ recall, isAffecting, matchedProductNames = [] }: RecallCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className={cn(isAffecting && "border-destructive/40 bg-destructive/5")}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground">{recall.product_name}</span>
            {recall.company_name && (
              <span className="text-sm text-muted-foreground">{recall.company_name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAffecting && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                Affects your stock
              </Badge>
            )}
            {recall.severity && (
              <Badge variant={severityVariant[recall.severity]} className="capitalize">
                {recall.severity}
              </Badge>
            )}
          </div>
        </div>

        {recall.recall_reason && (
          <p className="text-sm text-foreground">{recall.recall_reason}</p>
        )}

        {recall.issued_date && (
          <span className="text-xs text-muted-foreground">
            Issued {formatDate(recall.issued_date)}
          </span>
        )}

        {(matchedProductNames.length > 0 || recall.source_url) && (
          <div>
            <button
              type="button"
              onClick={() => setShowDetails((current) => !current)}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ChevronDown
                className={cn("size-4 transition-transform", showDetails && "rotate-180")}
              />
              {showDetails ? "Hide" : "View"} Details
            </button>
            {showDetails && (
              <div className="mt-2 flex flex-col gap-2 text-sm">
                {matchedProductNames.length > 0 && (
                  <div>
                    <span className="font-medium text-foreground">Matching items in your inventory:</span>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {matchedProductNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {recall.source_url && (
                  <a
                    href={recall.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    Source <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
