"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function ManufacturerRegisterError({
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
      title="Couldn't load the registration page"
      description="Something went wrong. Try again."
    />
  )
}
