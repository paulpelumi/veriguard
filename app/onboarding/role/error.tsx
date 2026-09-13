"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function OnboardingRoleError({
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
      title="Couldn't load this page"
      description="Something went wrong. Try again."
    />
  )
}
