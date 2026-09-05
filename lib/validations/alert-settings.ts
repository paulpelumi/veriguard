import { z } from "zod"

export const alertSettingsSchema = z.object({
  expiryAlertsEnabled: z.boolean(),
  alert90Days: z.boolean(),
  alert60Days: z.boolean(),
  alert30Days: z.boolean(),
  alertExpired: z.boolean(),
  emailAlerts: z.boolean(),
  perCategoryThresholds: z.boolean(),
  drugAlertDays: z.coerce.number().int().min(1, "Must be at least 1").max(365),
  foodAlertDays: z.coerce.number().int().min(1, "Must be at least 1").max(365),
  cosmeticAlertDays: z.coerce.number().int().min(1, "Must be at least 1").max(365),
  drinkAlertDays: z.coerce.number().int().min(1, "Must be at least 1").max(365),
})

export type AlertSettingsFormValues = z.infer<typeof alertSettingsSchema>

export const defaultAlertSettings: AlertSettingsFormValues = {
  expiryAlertsEnabled: true,
  alert90Days: true,
  alert60Days: true,
  alert30Days: true,
  alertExpired: true,
  emailAlerts: false,
  perCategoryThresholds: false,
  drugAlertDays: 90,
  foodAlertDays: 30,
  cosmeticAlertDays: 60,
  drinkAlertDays: 30,
}
