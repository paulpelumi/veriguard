"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { uploadManufacturerDocument } from "@/lib/manufacturers/upload-document"
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
    setCurrentStep((step) => Math.max(1, step - 1))
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

    if (!signUpData.session || !signUpData.user) {
      toast.success("Account created. Check your email to confirm before logging in.")
      router.push("/login")
      return
    }

    const userId = signUpData.user.id

    setSubmitStage("Uploading documents...")
    const [nafdacCertPath, cacCertPath] = await Promise.all([
      uploadManufacturerDocument(supabase, userId, "nafdac-certificate", files.nafdacCertificate!),
      uploadManufacturerDocument(supabase, userId, "cac-certificate", files.cacCertificate!),
    ])

    if (!nafdacCertPath || !cacCertPath) {
      toast.error(
        "Your account was created, but one or more documents failed to upload. You can retry from your dashboard."
      )
    }

    setSubmitStage("Submitting application...")
    const { error: profileError } = await supabase.from("manufacturer_profiles").insert({
      id: userId,
      company_name: values.companyName,
      cac_number: values.cacNumber,
      nafdac_manufacturer_code: values.nafdacManufacturerCode || null,
      product_categories: values.productCategories,
      production_volume_monthly: PRODUCTION_VOLUME_TO_MONTHLY_UNITS[values.productionVolume] ?? null,
      state: values.state,
      address: values.address,
      phone: values.phone,
      website: values.website || null,
      nafdac_certificate_url: nafdacCertPath,
      cac_certificate_url: cacCertPath,
    })

    if (profileError) {
      toast.error(profileError.message)
      setIsSubmitting(false)
      setSubmitStage(null)
      return
    }

    setSubmitStage("Running verification check...")
    await fetch("/api/manufacturers/verify", { method: "POST" }).catch(() => null)

    toast.success("Application submitted. Our team will review it shortly.")
    router.push("/manufacturer/dashboard")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <RegistrationProgress currentStep={currentStep} />

      {currentStep === 1 && <StepAccount form={form} />}
      {currentStep === 2 && <StepCompany form={form} />}
      {currentStep === 3 && (
        <StepDocuments files={files} onChange={setFiles} errors={documentErrors} />
      )}
      {currentStep === 4 && (
        <StepReview form={form} files={files} onEditStep={setCurrentStep} />
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSubmitting}>
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
