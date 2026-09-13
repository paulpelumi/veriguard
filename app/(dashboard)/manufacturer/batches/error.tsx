"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function ManufacturerBatchesError({
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
      title="Couldn't load products & batches"
      description="Something went wrong loading this page. Try again."
    />
  )
}
