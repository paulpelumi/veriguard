"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function AdminGs1Error({
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
      title="Couldn't load the GS1 database"
      description="Something went wrong loading this page. Try again."
    />
  )
}
