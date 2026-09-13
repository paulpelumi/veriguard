import { z } from "zod"

// Nigerian mobile format: leading 0 or +234, then a network prefix digit
// (7/8/9) + 0/1, then 8 more digits - e.g. 08012345678 or +2348012345678.
const NIGERIAN_PHONE_REGEX = /^(?:\+234|0)[789][01]\d{8}$/
const CAC_NUMBER_REGEX = /^(RC|BN)-?\d{2,}$/i

export const productCategoryOptions = [
  "Food & Beverages",
  "Pharmaceuticals / Drugs",
  "Cosmetics & Personal Care",
  "Herbal & Natural Products",
  "Medical Devices",
  "Packaged Water",
  "Alcoholic Beverages",
  "Other",
] as const

export const productionVolumeOptions = [
  { value: "under_10k", label: "Under 10,000 units" },
  { value: "10k_100k", label: "10,000 – 100,000 units" },
  { value: "100k_500k", label: "100,000 – 500,000 units" },
  { value: "500k_1m", label: "500,000 – 1,000,000 units" },
  { value: "over_1m", label: "Over 1,000,000 units" },
] as const

const productionVolumeValues = productionVolumeOptions.map((o) => o.value) as [string, ...string[]]

// One combined schema for the whole 4-step wizard rather than four
// separately-refined schemas merged together (merging a schema that
// already has a top-level .refine()/.superRefine() applied isn't a stable
// public zod operation). Each step validates only its own field subset via
// react-hook-form's trigger([...fieldNames]) before advancing - the same
// schema, just checked incrementally.
export const manufacturerRegistrationSchema = z
  .object({
    // Step 1 - Account
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
    phone: z.string().trim().regex(NIGERIAN_PHONE_REGEX, "Enter a valid Nigerian phone number"),

    // Step 2 - Company
    companyName: z.string().trim().min(2, "Enter your company name"),
    cacNumber: z.string().trim().regex(CAC_NUMBER_REGEX, "Format: RC-XXXXXX or BN-XXXXXX"),
    nafdacManufacturerCode: z.string().trim().optional(),
    productCategories: z.array(z.enum(productCategoryOptions)).min(1, "Select at least one category"),
    otherCategoryDetail: z.string().trim().optional(),
    productionVolume: z.enum(productionVolumeValues, {
      message: "Select your monthly production volume",
    }),
    state: z.string().min(1, "Select a state"),
    address: z.string().trim().min(5, "Enter your factory/office address"),
    website: z.string().trim().optional(),

    // Step 4 - Review
    agreeToTerms: z.literal(true, {
      message: "You must confirm this application is accurate",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" })
    }
  })

export type ManufacturerRegistrationValues = z.infer<typeof manufacturerRegistrationSchema>

// Field groups for per-step validation via form.trigger(STEP_FIELDS.account).
export const STEP_FIELDS = {
  account: ["fullName", "email", "password", "confirmPassword", "phone"],
  // "phone" is already validated in Step 1 for a normal signup, so
  // re-triggering it here is a no-op there - it's only load-bearing when
  // Step 1 was skipped entirely (an already-authenticated caller, see
  // ManufacturerRegistrationForm's existingUserId path), where this is
  // the only place phone gets collected and validated at all.
  company: [
    "companyName",
    "cacNumber",
    "productCategories",
    "productionVolume",
    "state",
    "address",
    "phone",
  ],
  review: ["agreeToTerms"],
} as const satisfies Record<string, (keyof ManufacturerRegistrationValues)[]>
