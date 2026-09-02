"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col bg-background text-foreground">
        <ErrorBoundary
          error={error}
          reset={reset}
          title="VeriGuard failed to load"
          description="A critical error occurred. Please try again."
        />
      </body>
    </html>
  )
}
