"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { nigerianStates } from "@/lib/utils/nigerian-states"
import {
  consumerProfileCompletionSchema,
  profileCompletionSchema,
  type ConsumerProfileCompletionFormValues,
  type ProfileCompletionFormValues,
} from "@/lib/validations/profile-completion"
import type { UserRole } from "@/types/database"

interface ProfileCompletionModalProps {
  userId: string
  role: UserRole
  defaultOpen: boolean
}

// Shown once after login when a profile is missing state or phone (needed
// for Module 6's geographic intelligence), skippable, and re-prompted after
// 3 days if skipped (spec) - the layout that renders this computes
// defaultOpen server-side from profile data + profile_completion_skipped_at,
// so this component only owns the open/closed interaction from there.
export function ProfileCompletionModal({ userId, role, defaultOpen }: ProfileCompletionModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isBusiness = role === "business"

  const form = useForm<ProfileCompletionFormValues | ConsumerProfileCompletionFormValues>({
    resolver: zodResolver(isBusiness ? profileCompletionSchema : consumerProfileCompletionSchema),
    defaultValues: { phone: "", state: "", lga: "", businessAddress: "" },
  })
  const stateValue = useWatch({ control: form.control, name: "state" })

  async function recordSkip() {
    const supabase = createClient()
    await supabase
      .from("profiles")
      .update({ profile_completion_skipped_at: new Date().toISOString() })
      .eq("id", userId)
  }

  async function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !isSubmitting) {
      // Dismissing without saving (backdrop click, Escape, or the Skip
      // button) is treated the same as an explicit skip, so the 3-day
      // re-prompt cooldown applies either way.
      await recordSkip()
    }
    setOpen(nextOpen)
  }

  async function onSubmit(values: ProfileCompletionFormValues | ConsumerProfileCompletionFormValues) {
    setIsSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        phone: values.phone,
        state: values.state,
        lga: "lga" in values ? values.lga : undefined,
        business_address: "businessAddress" in values ? values.businessAddress : undefined,
      })
      .eq("id", userId)

    setIsSubmitting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Profile updated")
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            Your state helps us alert you to recalls and safety issues near you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.phone}>
              <FieldLabel htmlFor="pc-phone">Phone number</FieldLabel>
              <Input id="pc-phone" placeholder="080..." {...form.register("phone")} />
              {form.formState.errors.phone && (
                <FieldError>{form.formState.errors.phone.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.state}>
              <FieldLabel htmlFor="pc-state">State</FieldLabel>
              <Select
                value={stateValue}
                onValueChange={(value) => form.setValue("state", value ?? "", { shouldValidate: true })}
              >
                <SelectTrigger id="pc-state" className="w-full">
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.state && (
                <FieldError>{form.formState.errors.state.message}</FieldError>
              )}
            </Field>

            {isBusiness && (
              <>
                <Field
                  data-invalid={!!(form.formState.errors as Record<string, { message?: string }>).lga}
                >
                  <FieldLabel htmlFor="pc-lga">LGA</FieldLabel>
                  <Input id="pc-lga" placeholder="Local government area" {...form.register("lga")} />
                  {(form.formState.errors as Record<string, { message?: string }>).lga && (
                    <FieldError>
                      {(form.formState.errors as Record<string, { message?: string }>).lga?.message}
                    </FieldError>
                  )}
                </Field>

                <Field
                  data-invalid={
                    !!(form.formState.errors as Record<string, { message?: string }>).businessAddress
                  }
                >
                  <FieldLabel htmlFor="pc-address">Business address</FieldLabel>
                  <Input id="pc-address" placeholder="Street address" {...form.register("businessAddress")} />
                  {(form.formState.errors as Record<string, { message?: string }>).businessAddress && (
                    <FieldError>
                      {
                        (form.formState.errors as Record<string, { message?: string }>).businessAddress
                          ?.message
                      }
                    </FieldError>
                  )}
                </Field>
              </>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Skip for now
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
