import type { BusinessType } from "@/types/database"

export const businessTypeOptions: { value: BusinessType; label: string }[] = [
  { value: "pharmacy", label: "Pharmacy" },
  { value: "supermarket", label: "Supermarket" },
  { value: "food_retail", label: "Food Retail" },
  { value: "distributor", label: "Distributor" },
  { value: "mall", label: "Mall" },
  { value: "other", label: "Other" },
]

