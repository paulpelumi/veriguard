"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
}

export function ErrorBoundary({
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again, and if the problem persists, contact support.",
}: ErrorBoundaryProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
