"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function RecallsError({
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
      title="Couldn't load recalls"
      description="Something went wrong loading recall alerts. Try again."
    />
  )
}
