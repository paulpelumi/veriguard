"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function SettingsError({
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
      title="Couldn't load settings"
      description="Something went wrong loading your settings. Try again."
    />
  )
}
