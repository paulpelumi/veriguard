import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface UpgradePromptBannerProps {
  used: number
  limit: number
  label: string
  className?: string
}

const NEAR_LIMIT_THRESHOLD = 0.8

// Silent below 80% usage and for unlimited plans (limit < 0) - showing this
// from the very first use would just be noise, and it has nothing useful
// to say for a plan with no ceiling.
export function UpgradePromptBanner({ used, limit, label, className }: UpgradePromptBannerProps) {
  if (limit < 0) return null

  const percentage = limit > 0 ? used / limit : 1
  if (percentage < NEAR_LIMIT_THRESHOLD) return null

  const isAtLimit = used >= limit

  return (
    <Alert variant={isAtLimit ? "destructive" : "default"} className={className}>
      <AlertTriangle />
      <AlertTitle>{isAtLimit ? "You've reached your plan limit" : "Approaching your plan limit"}</AlertTitle>
      <AlertDescription>
        {used.toLocaleString()} of {limit.toLocaleString()} {label} used
        {isAtLimit ? " — upgrade to keep going." : " — upgrade before you run out."}
      </AlertDescription>
      <AlertAction>
        <Button size="sm" nativeButton={false} render={<Link href="/pricing" />}>
          Upgrade
        </Button>
      </AlertAction>
    </Alert>
  )
}
