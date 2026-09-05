"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import {
  alertSettingsSchema,
  defaultAlertSettings,
  type AlertSettingsFormValues,
} from "@/lib/validations/alert-settings"

function SettingRow({
  title,
  description,
  control,
}: {
  title: string
  description?: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
      </div>
      {control}
    </div>
  )
}

export default function BusinessSettingsPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const form = useForm<AlertSettingsFormValues>({
    resolver: zodResolver(alertSettingsSchema),
    defaultValues: defaultAlertSettings,
  })

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      setBusinessId(user.id)

      const { data } = await supabase
        .from("alert_settings")
        .select("*")
        .eq("business_id", user.id)
        .maybeSingle()

      if (data) {
        form.reset({
          expiryAlertsEnabled: data.expiry_alerts_enabled,
          alert90Days: data.alert_90_days,
          alert60Days: data.alert_60_days,
          alert30Days: data.alert_30_days,
          alertExpired: data.alert_expired,
          emailAlerts: data.email_alerts,
          perCategoryThresholds: data.per_category_thresholds,
          drugAlertDays: data.drug_alert_days,
          foodAlertDays: data.food_alert_days,
          cosmeticAlertDays: data.cosmetic_alert_days,
          drinkAlertDays: data.drink_alert_days,
        })
      }

      setIsLoading(false)
    }

    load()
    // Runs once on mount to load the current user's saved settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: AlertSettingsFormValues) {
    if (!businessId) return

    const supabase = createClient()
    const { error } = await supabase.from("alert_settings").upsert(
      {
        business_id: businessId,
        expiry_alerts_enabled: values.expiryAlertsEnabled,
        alert_90_days: values.alert90Days,
        alert_60_days: values.alert60Days,
        alert_30_days: values.alert30Days,
        alert_expired: values.alertExpired,
        email_alerts: values.emailAlerts,
        per_category_thresholds: values.perCategoryThresholds,
        drug_alert_days: values.drugAlertDays,
        food_alert_days: values.foodAlertDays,
        cosmetic_alert_days: values.cosmeticAlertDays,
        drink_alert_days: values.drinkAlertDays,
      },
      { onConflict: "business_id" }
    )

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Alert settings saved")
  }

  const expiryAlertsEnabled = useWatch({ control: form.control, name: "expiryAlertsEnabled" })
  const perCategoryThresholds = useWatch({ control: form.control, name: "perCategoryThresholds" })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage how VeriGuard alerts you about expiring products.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Alert Settings</CardTitle>
            <CardDescription>
              Control when and how you&apos;re notified about products nearing expiry.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            <SettingRow
              title="Enable expiry alerts"
              description="Turn all expiry notifications on or off."
              control={
                <Controller
                  control={form.control}
                  name="expiryAlertsEnabled"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              }
            />

            <div className={expiryAlertsEnabled ? "flex flex-col gap-1 py-3" : "hidden"}>
              <span className="text-sm font-medium text-foreground">Alert thresholds</span>
              <div className="mt-1 flex flex-col gap-2">
                {(
                  [
                    ["alert90Days", "Alert me 3 months before expiry"],
                    ["alert60Days", "Alert me 2 months before expiry"],
                    ["alert30Days", "Alert me 1 month before expiry"],
                    ["alertExpired", "Alert me when products are expired"],
                  ] as const
                ).map(([name, label]) => (
                  <label key={name} className="flex items-center gap-2 text-sm text-foreground">
                    <Controller
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <SettingRow
              title="In-app notifications"
              description="Always available while alerts are enabled."
              control={<Switch checked disabled />}
            />

            <SettingRow
              title="Email alerts"
              description="Requires email setup."
              control={
                <div className="flex items-center gap-3">
                  <button type="button" className="text-xs font-medium text-primary hover:underline">
                    Configure email
                  </button>
                  <Controller
                    control={form.control}
                    name="emailAlerts"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              }
            />

            <SettingRow
              title="Use different thresholds per product category"
              control={
                <Controller
                  control={form.control}
                  name="perCategoryThresholds"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              }
            />

            {perCategoryThresholds && (
              <div className="grid grid-cols-2 gap-4 py-3">
                {(
                  [
                    ["drugAlertDays", "Drugs (days)"],
                    ["foodAlertDays", "Food (days)"],
                    ["cosmeticAlertDays", "Cosmetics (days)"],
                    ["drinkAlertDays", "Drinks (days)"],
                  ] as const
                ).map(([name, label]) => (
                  <div key={name} className="flex flex-col gap-1.5">
                    <label htmlFor={name} className="text-sm text-muted-foreground">
                      {label}
                    </label>
                    <Input id={name} type="number" min={1} {...form.register(name)} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex max-w-2xl justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  )
}
