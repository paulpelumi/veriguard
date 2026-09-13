import { z } from "zod"

export const manufacturerProductSchema = z.object({
  productName: z.string().trim().min(2, "Enter a product name"),
  nafdacNumber: z.string().trim().min(2, "Enter the NAFDAC registration number"),
  productCategory: z.string().trim().optional(),
  description: z.string().trim().optional(),
  standardBatchSize: z.coerce.number().int().positive().optional().or(z.literal("")),
  storageConditions: z.string().trim().optional(),
})

export type ManufacturerProductValues = z.infer<typeof manufacturerProductSchema>
