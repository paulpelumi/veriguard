import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

import { ApiKeysManager } from "@/components/api-keys/api-keys-manager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEffectivePlan } from "@/lib/payments/subscription-manager"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "API Keys | VeriGuard",
}

export default async function ApiKeysPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const plan = await getEffectivePlan(supabase, user.id, "business")
  const features = (plan?.features ?? {}) as Record<string, boolean>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify products programmatically from your own systems.
        </p>
      </div>

      {features.api_access ? (
        <ApiKeysManager userId={user.id} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>API access requires Business Professional</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              You&apos;re currently on {plan?.name ?? "a plan"} without API access. Upgrade to Business
              Professional or Enterprise to generate API keys and verify products from your own systems.
            </p>
            <Button className="w-fit" nativeButton={false} render={<Link href="/pricing" />}>
              View Plans
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
