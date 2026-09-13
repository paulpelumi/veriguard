import { Loader2 } from "lucide-react"

// Not true per-code streaming progress (spec's "400,000 / 500,000" style
// counter needs a background job reporting back incrementally) - this
// request is capped small enough (see MAX_QUANTITY_PER_REQUEST in
// app/api/manufacturers/generate/route.ts) that it completes within one
// request, so this is an honest "working on it" state, not a fake bar.
export function GenerationProgress({ quantity }: { quantity: number }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-medium text-foreground">Generating {quantity.toLocaleString()} serial codes...</p>
      <p className="text-sm text-muted-foreground">Signing codes with VeriGuard&apos;s cryptographic key.</p>
    </div>
  )
}
