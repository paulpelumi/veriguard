import { ProductVerificationPanel } from "@/components/verification/product-verification-panel"

export default function ConsumerVerifyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold text-foreground">Verify a Product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a NAFDAC number to check if a product is genuine before you use it.
        </p>
      </div>
      <div className="mx-auto w-full max-w-xl sm:mx-0">
        <ProductVerificationPanel reportPath="/consumer/report" />
      </div>
    </div>
  )
}
