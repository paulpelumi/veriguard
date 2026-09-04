import { z } from "zod"

export const registerSchema = z
  .object({
    role: z.enum(["consumer", "business"]),
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z.string().trim().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    businessName: z.string().trim().optional(),
    businessType: z.string().optional(),
    state: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      })
    }

    if (data.role === "business") {
      if (!data.businessName) {
        ctx.addIssue({
          code: "custom",
          path: ["businessName"],
          message: "Business name is required",
        })
      }
      if (!data.businessType) {
        ctx.addIssue({
          code: "custom",
          path: ["businessType"],
          message: "Select a business type",
        })
      }
      if (!data.state) {
        ctx.addIssue({
          code: "custom",
          path: ["state"],
          message: "Select a state",
        })
      }
    }
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginFormValues = z.infer<typeof loginSchema>
