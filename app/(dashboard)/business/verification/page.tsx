import { ProductVerificationPanel } from "@/components/verification/product-verification-panel"

export default function BusinessVerificationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check a NAFDAC registration number before stocking or selling a product.
        </p>
      </div>
      <div className="max-w-2xl">
        <ProductVerificationPanel reportPath="/business/reports" />
      </div>
    </div>
  )
}
