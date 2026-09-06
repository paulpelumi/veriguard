import { z } from "zod"

// LGA and business address are only required for business accounts (spec);
// a plain z.object can't express a role-conditional requirement, hence the
// superRefine below.
export const profileCompletionSchema = z
  .object({
    phone: z.string().trim().min(7, "Enter a valid phone number"),
    state: z.string().min(1, "Select a state"),
    lga: z.string().trim().optional(),
    businessAddress: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.lga) {
      ctx.addIssue({ code: "custom", path: ["lga"], message: "Enter your LGA" })
    }
    if (!values.businessAddress) {
      ctx.addIssue({ code: "custom", path: ["businessAddress"], message: "Enter your business address" })
    }
  })

export type ProfileCompletionFormValues = z.infer<typeof profileCompletionSchema>

// A separate, looser schema for consumer accounts, which the spec doesn't
// ask for LGA/business address from at all.
export const consumerProfileCompletionSchema = z.object({
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  state: z.string().min(1, "Select a state"),
})

export type ConsumerProfileCompletionFormValues = z.infer<typeof consumerProfileCompletionSchema>
