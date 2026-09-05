"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function VerificationError({
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
      title="Verification unavailable"
      description="Something went wrong loading the verification tool. Try again."
    />
  )
}
