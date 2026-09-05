import { z } from "zod"

export const suspicionReasonOptions = [
  "NAFDAC number not found in registry",
  "NAFDAC number belongs to a different product",
  "Packaging looks suspicious or tampered",
  "Product quality/smell/appearance seems wrong",
  "Seller could not provide documentation",
  "Other (specify)",
] as const

export const counterfeitReportSchema = z.object({
  productName: z.string().trim().min(2, "Enter the product name"),
  nafdacNumber: z.string().trim().optional(),
  productType: z.enum(
    ["food", "drink", "drug", "cosmetic", "herbal", "medical_device", "other"],
    { message: "Select a product type" }
  ),
  brandName: z.string().trim().optional(),
  purchaseLocation: z.string().trim().min(2, "Tell us where you bought this"),
  state: z.string().min(1, "Select a state"),
  lga: z.string().trim().optional(),
  suspicionReason: z.enum(suspicionReasonOptions, { message: "Select a reason" }),
  description: z.string().trim().optional(),
  confirmGoodFaith: z.literal(true, {
    message: "You must confirm this report is made in good faith",
  }),
})

export type CounterfeitReportFormValues = z.infer<typeof counterfeitReportSchema>
