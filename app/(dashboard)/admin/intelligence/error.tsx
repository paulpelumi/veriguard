"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function GeographicIntelligenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Couldn't load geographic intelligence"
      description="Something went wrong loading this page. Try again."
    />
  )
}
