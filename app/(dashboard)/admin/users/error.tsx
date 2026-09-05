"use client"

import { ErrorBoundary } from "@/components/shared/error-boundary"

export default function AdminUsersError({
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
      title="Couldn't load user management"
      description="Something went wrong loading this page. Try again."
    />
  )
}
