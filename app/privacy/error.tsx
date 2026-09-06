"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function PrivacyError({
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
      title="Couldn't load the privacy policy"
      description="Something went wrong. Try again."
    />
  )
}
