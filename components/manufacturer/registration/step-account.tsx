"use client"

import type { UseFormReturn } from "react-hook-form"

import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ManufacturerRegistrationValues } from "@/lib/validations/manufacturer-registration"

export function StepAccount({ form }: { form: UseFormReturn<ManufacturerRegistrationValues> }) {
  const { errors } = form.formState

  return (
    <FieldGroup>
      <Field data-invalid={!!errors.fullName}>
        <FieldLabel htmlFor="fullName">Full name</FieldLabel>
        <Input id="fullName" autoComplete="name" {...form.register("fullName")} />
        <FieldError errors={[errors.fullName]} />
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email">Email address</FieldLabel>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        <FieldError errors={[errors.email]} />
      </Field>

      <Field data-invalid={!!errors.phone}>
        <FieldLabel htmlFor="phone">Phone number</FieldLabel>
        <Input id="phone" type="tel" placeholder="080..." autoComplete="tel" {...form.register("phone")} />
        <FieldError errors={[errors.phone]} />
      </Field>

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
        <FieldError errors={[errors.password]} />
      </Field>

      <Field data-invalid={!!errors.confirmPassword}>
        <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
        />
        <FieldError errors={[errors.confirmPassword]} />
      </Field>
    </FieldGroup>
  )
}
