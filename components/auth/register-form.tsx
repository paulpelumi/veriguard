"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { businessTypeOptions } from "@/lib/utils/constants"
import { nigerianStates } from "@/lib/utils/nigerian-states"
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth"
import type { UserRole } from "@/types/database"

interface RegisterFormProps {
  defaultRole: UserRole
}

export function RegisterForm({ defaultRole }: RegisterFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: defaultRole,
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      businessName: "",
      businessType: undefined,
      state: undefined,
    },
  })

  const role = useWatch({ control: form.control, name: "role" })

  async function onSubmit(values: RegisterFormValues) {
    setIsSubmitting(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          role: values.role,
          phone: values.phone || null,
          business_name: values.role === "business" ? values.businessName : null,
          business_type: values.role === "business" ? values.businessType : null,
          state: values.role === "business" ? values.state : null,
        },
      },
    })

    if (error) {
      setIsSubmitting(false)
      toast.error(error.message)
      return
    }

    if (!data.session) {
      setIsSubmitting(false)
      toast.success("Account created. Check your email to confirm before logging in.")
      router.push("/login")
      return
    }

    router.push(values.role === "business" ? "/business/dashboard" : "/consumer/dashboard")
    router.refresh()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Tabs
        value={role}
        onValueChange={(value) => form.setValue("role", value as UserRole)}
      >
        <TabsList className="w-full">
          <TabsTrigger value="consumer" className="flex-1">
            Consumer
          </TabsTrigger>
          <TabsTrigger value="business" className="flex-1">
            Business
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.fullName}>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input id="fullName" autoComplete="name" {...form.register("fullName")} />
          <FieldError errors={[form.formState.errors.fullName]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="phone">Phone (optional)</FieldLabel>
          <Input id="phone" type="tel" autoComplete="tel" {...form.register("phone")} />
        </Field>

        {role === "business" && (
          <>
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
          </>
        )}

        <Field data-invalid={!!form.formState.errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          <FieldError errors={[form.formState.errors.password]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
          <FieldError errors={[form.formState.errors.confirmPassword]} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  )
}
