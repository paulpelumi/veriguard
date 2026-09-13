import { ProductVerificationPanel } from "@/components/verification/product-verification-panel"
import { checkUsageLimit } from "@/lib/usage/usage-tracker"
import { createClient } from "@/lib/supabase/server"

export default async function ConsumerVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ nafdacNumber?: string }>
}) {
  const { nafdacNumber } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Always non-null here (the layout above already redirects anyone who
  // isn't a logged-in consumer), but the type from getUser() is nullable.
  const usage = user ? await checkUsageLimit(supabase, user.id, "consumer", "verifications") : null

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold text-foreground">Verify a Product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a NAFDAC number to check if a product is genuine before you use it.
        </p>
      </div>
      <div className="mx-auto w-full max-w-xl sm:mx-0">
        <ProductVerificationPanel
          reportPath="/consumer/report"
          initialNumber={nafdacNumber}
          usageSummary={usage ? { used: usage.used, limit: usage.limit } : undefined}
        />
      </div>
    </div>
  )
}
