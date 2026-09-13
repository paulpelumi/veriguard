import { Bot } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  EXPORT_FORMAT_LABELS,
  MACHINE_CATEGORY_LABELS,
  type MachineAnalysisResult as MachineAnalysisResultType,
} from "@/lib/manufacturers/machine-types"

export function MachineAnalysisResult({ analysis }: { analysis: MachineAnalysisResultType }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-5 text-primary" />
          Machine Analysis Complete
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Detected Brand</dt>
          <dd className="font-medium text-foreground">{analysis.detected_brand}</dd>
          <dt className="text-muted-foreground">Detected Model</dt>
          <dd className="font-medium text-foreground">{analysis.detected_model ?? "—"}</dd>
          <dt className="text-muted-foreground">Machine Category</dt>
          <dd className="font-medium text-foreground">{MACHINE_CATEGORY_LABELS[analysis.machine_category]}</dd>
          <dt className="text-muted-foreground">Confidence</dt>
          <dd className="font-medium text-foreground">{analysis.confidence}%</dd>
        </dl>

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Recommended Export Format
          </p>
          <p className="mt-1 font-medium text-foreground">
            {EXPORT_FORMAT_LABELS[analysis.primary_format]}
          </p>
          <p className="text-muted-foreground">
            Fallback: {EXPORT_FORMAT_LABELS[analysis.secondary_format]}
          </p>
          {analysis.software_hint && (
            <p className="mt-1 text-muted-foreground">Typical software: {analysis.software_hint}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Why this format</p>
          <p className="mt-1 text-foreground">{analysis.reasoning}</p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Operator Instructions
          </p>
          <p className="mt-1 text-foreground">{analysis.operator_instructions}</p>
        </div>
      </CardContent>
    </Card>
  )
}
