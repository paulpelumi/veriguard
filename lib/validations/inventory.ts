import { z } from "zod"

import { isValidNafdacFormat } from "@/lib/nafdac/validator"

export const productTypeOptions = [
  { value: "food", label: "Food" },
  { value: "drink", label: "Drink" },
  { value: "drug", label: "Drug" },
  { value: "cosmetic", label: "Cosmetic" },
  { value: "herbal", label: "Herbal" },
  { value: "medical_device", label: "Medical Device" },
  { value: "other", label: "Other" },
] as const

export const unitOptions = [
  { value: "units", label: "Units" },
  { value: "cartons", label: "Cartons" },
  { value: "bags", label: "Bags" },
  { value: "bottles", label: "Bottles" },
  { value: "packs", label: "Packs" },
  { value: "pieces", label: "Pieces" },
] as const

export const productSubtypeHints: Record<string, string> = {
  food: "e.g. Seasoning, Oil, Grain",
  drink: "e.g. Soft Drink, Juice, Water",
  drug: "e.g. Tablet, Syrup, Capsule",
  cosmetic: "e.g. Cream, Lotion, Soap",
  herbal: "e.g. Mixture, Powder, Tea",
  medical_device: "e.g. Thermometer, Syringe",
  other: "e.g. Category-specific detail",
}

function todayAtMidnight() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

export function buildInventorySchema(mode: "add" | "edit") {
  return z.object({
    productName: z.string().trim().min(2, "Enter a product name"),
    productType: z.enum(
      ["food", "drink", "drug", "cosmetic", "herbal", "medical_device", "other"],
      { message: "Select a product type" }
    ),
    productSubtype: z.string().trim().optional(),
    nafdacNumber: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || isValidNafdacFormat(value), {
        message: "Format looks off — try e.g. A1-1234 or 04-12345",
      }),
    batchNumber: z.string().trim().optional(),
    productionDate: z.string().optional(),
    expiryDate: z
      .string()
      .min(1, "Expiry date is required")
      .refine(
        (value) => mode === "edit" || new Date(value) >= todayAtMidnight(),
        { message: "Expiry date can't be in the past" }
      ),
    quantity: z.coerce.number().int().min(1, "Must be at least 1"),
    unit: z.enum(["units", "cartons", "bags", "bottles", "packs", "pieces"]),
    supplier: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
}

export type InventoryFormValues = z.infer<ReturnType<typeof buildInventorySchema>>
