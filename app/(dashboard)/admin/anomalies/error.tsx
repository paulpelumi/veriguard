"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function AdminAnomaliesError({
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
      title="Couldn't load anomaly management"
      description="Something went wrong loading this page. Try again."
    />
  )
}
