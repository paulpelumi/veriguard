"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Factory, Store, User } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { businessTypeOptions } from "@/lib/utils/constants"
import { nigerianStates } from "@/lib/utils/nigerian-states"
import type { BusinessType } from "@/types/database"

type PickableRole = "consumer" | "business" | "manufacturer"

const businessDetailsSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name"),
  businessType: z.enum(businessTypeOptions.map((o) => o.value) as [string, ...string[]], {
    message: "Select a business type",
  }),
  state: z.string().min(1, "Select a state"),
})

type BusinessDetailsValues = z.infer<typeof businessDetailsSchema>

const ROLE_CARDS: { role: PickableRole; icon: typeof User; title: string; description: string }[] = [
  { role: "consumer", icon: User, title: "Consumer", description: "Verify products before you buy or use them." },
  { role: "business", icon: Store, title: "Business", description: "Manage inventory and stay compliant with NAFDAC." },
  {
    role: "manufacturer",
    icon: Factory,
    title: "Manufacturer",
    description: "Generate serialised QR codes and protect your brand.",
  },
]

// Every OAuth sign-in lands here with profiles.role already defaulted to
// 'consumer' and full_name/email already populated (both from the
// trigger, using Google's own metadata) - this only needs to collect what
// Google's profile can't supply: which role, and for business, the
// company details the manual signup form collects but Google has no
// equivalent for. Manufacturer's own set of required fields (CAC number,
// documents, etc.) is way beyond what belongs on a one-step picker, so
// that path hands off to the existing wizard instead of trying to
// shortcut it here.
export function RoleOnboardingForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<PickableRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<BusinessDetailsValues>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: { businessName: "", businessType: undefined, state: undefined },
  })

  async function chooseConsumer() {
    setIsSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ role: "consumer" }).eq("id", userId)
    setIsSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    router.push("/consumer/dashboard")
    router.refresh()
  }

  async function submitBusiness(values: BusinessDetailsValues) {
    setIsSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        role: "business",
        business_name: values.businessName,
        business_type: values.businessType as BusinessType,
        state: values.state,
      })
      .eq("id", userId)
    setIsSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    router.push("/business/dashboard")
    router.refresh()
  }

  function chooseManufacturer() {
    router.push("/register/manufacturer")
  }

  if (selected === "business") {
    return (
      <Card className="w-full max-w-md">
        <CardContent>
          <form onSubmit={form.handleSubmit(submitBusiness)} className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.businessName}>
                <FieldLabel htmlFor="businessName">Business name</FieldLabel>
                <Input id="businessName" {...form.register("businessName")} />
                <FieldError errors={[form.formState.errors.businessName]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.businessType}>
                <FieldLabel htmlFor="businessType">Business type</FieldLabel>
                <Controller
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <Select value={field.value ?? null} onValueChange={field.onChange}>
                      <SelectTrigger id="businessType" className="w-full">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.businessType]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.state}>
                <FieldLabel htmlFor="state">State</FieldLabel>
                <Controller
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <Select value={field.value ?? null} onValueChange={field.onChange}>
                      <SelectTrigger id="state" className="w-full">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {nigerianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.state]} />
              </Field>
            </FieldGroup>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setSelected(null)} disabled={isSubmitting}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
      {ROLE_CARDS.map(({ role, icon: Icon, title, description }) => (
        <Card key={role} className="flex flex-col">
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <Button
              className="w-full"
              disabled={isSubmitting}
              onClick={() => {
                if (role === "consumer") chooseConsumer()
                else if (role === "business") setSelected("business")
                else chooseManufacturer()
              }}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
