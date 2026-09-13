"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function DuplicateAlertsError({
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
      title="Couldn't load duplicate alerts"
      description="Something went wrong loading this page. Try again."
    />
  )
}
