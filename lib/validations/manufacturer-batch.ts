import { z } from "zod"

export const generateBatchSchema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    batchNumber: z.string().trim().min(1, "Enter a batch number"),
    productionDate: z.string().min(1, "Select a production date"),
    expiryDate: z.string().min(1, "Select an expiry date"),
    serialisationLevel: z.enum(["unit", "carton", "pallet"], {
      message: "Select a serialisation level",
    }),
    unitsPerCarton: z.coerce.number().int().positive().optional().or(z.literal("")),
    cartonsPerPallet: z.coerce.number().int().positive().optional().or(z.literal("")),
    quantity: z.coerce.number().int().positive("Enter how many codes to generate"),
    machineId: z.string().min(1, "Select a machine"),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.expiryDate) <= new Date(data.productionDate)) {
      ctx.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry must be after production date" })
    }
    if (data.serialisationLevel === "carton" && !data.unitsPerCarton) {
      ctx.addIssue({ code: "custom", path: ["unitsPerCarton"], message: "Enter units per carton" })
    }
    if (data.serialisationLevel === "pallet" && !data.cartonsPerPallet) {
      ctx.addIssue({ code: "custom", path: ["cartonsPerPallet"], message: "Enter cartons per pallet" })
    }
  })

export type GenerateBatchValues = z.infer<typeof generateBatchSchema>
