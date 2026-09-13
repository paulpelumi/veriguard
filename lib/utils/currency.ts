// Every amount in the billing schema is stored in kobo (Paystack's own
// unit - integers only, no floating-point currency bugs), so every display
// site converts through this rather than hand-rolling `/ 100` and a Naira
// sign inline.
export function formatNaira(amountKobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100)
}
