"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { RegistrationProgress } from "@/components/manufacturer/registration/registration-progress"
import { StepAccount } from "@/components/manufacturer/registration/step-account"
import { StepCompany } from "@/components/manufacturer/registration/step-company"
import {
  StepDocuments,
  validateDocumentFiles,
  type DocumentFiles,
} from "@/components/manufacturer/registration/step-documents"
import { StepReview } from "@/components/manufacturer/registration/step-review"
import { createClient } from "@/lib/supabase/client"
import {
  manufacturerRegistrationSchema,
  STEP_FIELDS,
  type ManufacturerRegistrationValues,
} from "@/lib/validations/manufacturer-registration"

// The form only ever collects a volume RANGE (spec's own select options),
// but manufacturer_profiles.production_volume_monthly is a single integer
// column (spec's own migration SQL) - stored as the midpoint of the
// selected range as a reasonable representative figure, since there's no
// exact number to store.
const PRODUCTION_VOLUME_TO_MONTHLY_UNITS: Record<string, number> = {
  under_10k: 5_000,
  "10k_100k": 55_000,
  "100k_500k": 300_000,
  "500k_1m": 750_000,
  over_1m: 1_500_000,
}

const TOTAL_STEPS = 4

export function ManufacturerRegistrationForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [files, setFiles] = useState<DocumentFiles>({ nafdacCertificate: null, cacCertificate: null })
  const [documentErrors, setDocumentErrors] = useState<ReturnType<typeof validateDocumentFiles>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStage, setSubmitStage] = useState<string | null>(null)
  // Someone arriving here already signed in (the OAuth role picker sends
  // manufacturers here, since Google sign-in has no account-creation step
  // of its own) skips Step 1 entirely - there's no account left to
  // create. Only "phone" from that step is still needed downstream, so
  // StepCompany picks up collecting just that field in this mode instead.
  const [existingUserId, setExistingUserId] = useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setExistingUserId(data.user.id)
        setCurrentStep(2)
      }
      setIsCheckingSession(false)
    })
  }, [])

  const form = useForm<ManufacturerRegistrationValues>({
    resolver: zodResolver(manufacturerRegistrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      companyName: "",
      cacNumber: "",
      nafdacManufacturerCode: "",
      productCategories: [],
      otherCategoryDetail: "",
      productionVolume: undefined,
      state: undefined,
      address: "",
      website: "",
      agreeToTerms: undefined,
    },
  })

  async function handleNext() {
    if (currentStep === 1) {
      if (await form.trigger(STEP_FIELDS.account)) setCurrentStep(2)
      return
    }
    if (currentStep === 2) {
      if (await form.trigger(STEP_FIELDS.company)) setCurrentStep(3)
      return
    }
    if (currentStep === 3) {
      const errors = validateDocumentFiles(files)
      setDocumentErrors(errors)
      if (Object.keys(errors).length === 0) setCurrentStep(4)
      return
    }
  }

  function handleBack() {
    setCurrentStep((step) => Math.max(existingUserId ? 2 : 1, step - 1))
  }

  async function handleSubmit() {
    const reviewValid = await form.trigger(STEP_FIELDS.review)
    const docErrors = validateDocumentFiles(files)
    setDocumentErrors(docErrors)

    if (!reviewValid) return
    if (Object.keys(docErrors).length > 0) {
      setCurrentStep(3)
      return
    }

    setIsSubmitting(true)
    const values = form.getValues()
    const supabase = createClient()

    let userId: string
    let hasSession: boolean

    if (existingUserId) {
      userId = existingUserId
      hasSession = true
    } else {
      setSubmitStage("Creating your account...")
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            role: "manufacturer",
            phone: values.phone,
            state: values.state,
          },
        },
      })

      if (signUpError) {
        toast.error(signUpError.message)
        setIsSubmitting(false)
        setSubmitStage(null)
        return
      }

      if (!signUpData.user) {
        toast.error("Account creation failed unexpectedly. Please try again.")
        setIsSubmitting(false)
        setSubmitStage(null)
        return
      }

      userId = signUpData.user.id
      hasSession = !!signUpData.session
    }

    setSubmitStage("Submitting application...")
    const registrationData = new FormData()
    registrationData.set("userId", userId)
    registrationData.set("companyName", values.companyName)
    registrationData.set("cacNumber", values.cacNumber)
    registrationData.set("nafdacManufacturerCode", values.nafdacManufacturerCode ?? "")
    registrationData.set("productCategories", JSON.stringify(values.productCategories))
    registrationData.set(
      "productionVolumeMonthly",
      String(PRODUCTION_VOLUME_TO_MONTHLY_UNITS[values.productionVolume] ?? "")
    )
    registrationData.set("state", values.state)
    registrationData.set("address", values.address)
    registrationData.set("phone", values.phone)
    registrationData.set("website", values.website ?? "")
    registrationData.set("nafdacCertificate", files.nafdacCertificate!)
    registrationData.set("cacCertificate", files.cacCertificate!)

    const response = await fetch("/api/manufacturers/register", {
      method: "POST",
      body: registrationData,
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      toast.error(result?.error?.message ?? "Failed to submit application")
      setIsSubmitting(false)
      setSubmitStage(null)
      return
    }

    if (!result?.documents_uploaded) {
      toast.error(
        "Your application was submitted, but one or more documents failed to upload. Contact support to retry."
      )
    }

    if (!hasSession) {
      toast.success("Application submitted. Check your email to confirm your account, then log in.")
      router.push("/login")
      return
    }

    toast.success("Application submitted. Our team will review it shortly.")
    router.push("/manufacturer/dashboard")
    router.refresh()
  }

  if (isCheckingSession) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <RegistrationProgress currentStep={currentStep} />

      {currentStep === 1 && <StepAccount form={form} />}
      {currentStep === 2 && <StepCompany form={form} showPhoneField={!!existingUserId} />}
      {currentStep === 3 && (
        <StepDocuments files={files} onChange={setFiles} errors={documentErrors} />
      )}
      {currentStep === 4 && (
        <StepReview
          form={form}
          files={files}
          onEditStep={setCurrentStep}
          hideAccountSummary={!!existingUserId}
        />
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === (existingUserId ? 2 : 1) || isSubmitting}
        >
          Back
        </Button>
        {currentStep < TOTAL_STEPS ? (
          <Button type="button" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (submitStage ?? "Submitting...") : "Submit Application"}
          </Button>
        )}
      </div>
    </div>
  )
}
