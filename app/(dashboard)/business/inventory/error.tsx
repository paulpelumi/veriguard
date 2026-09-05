"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function InventoryError({
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
      title="Couldn't load inventory"
      description="Something went wrong loading your inventory. Try again."
    />
  )
}
