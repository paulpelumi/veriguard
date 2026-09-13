"use client"

import type { UseFormReturn } from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import { FieldError } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import type { DocumentFiles } from "@/components/manufacturer/registration/step-documents"
import type { ManufacturerRegistrationValues } from "@/lib/validations/manufacturer-registration"

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value || "—"}</dd>
    </div>
  )
}

interface StepReviewProps {
  form: UseFormReturn<ManufacturerRegistrationValues>
  files: DocumentFiles
  onEditStep: (step: number) => void
  // Account details came from an existing sign-in, not Step 1 (which never
  // rendered) - full name/email would just show blank, and "Edit" would
  // send them to a step with nothing to edit. Phone is still reviewable,
  // just under Company since that's where it was actually collected.
  hideAccountSummary?: boolean
}

export function StepReview({ form, files, onEditStep, hideAccountSummary = false }: StepReviewProps) {
  const values = form.getValues()
  const { errors } = form.formState

  return (
    <div className="flex flex-col gap-6">
      {!hideAccountSummary && (
        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Account</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEditStep(1)}>
              Edit
            </Button>
          </div>
          <dl>
            <SummaryRow label="Full name" value={values.fullName} />
            <SummaryRow label="Email" value={values.email} />
            <SummaryRow label="Phone" value={values.phone} />
          </dl>
        </div>
      )}

      <div className="rounded-lg border border-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Company</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEditStep(2)}>
            Edit
          </Button>
        </div>
        <dl>
          {hideAccountSummary && <SummaryRow label="Phone" value={values.phone} />}
          <SummaryRow label="Company name" value={values.companyName} />
          <SummaryRow label="CAC number" value={values.cacNumber} />
          <SummaryRow label="NAFDAC code" value={values.nafdacManufacturerCode ?? ""} />
          <SummaryRow label="Categories" value={values.productCategories?.join(", ") ?? ""} />
          <SummaryRow label="State" value={values.state} />
          <SummaryRow label="Address" value={values.address} />
        </dl>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Documents</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEditStep(3)}>
            Edit
          </Button>
        </div>
        <dl>
          <SummaryRow label="NAFDAC certificate" value={files.nafdacCertificate?.name ?? ""} />
          <SummaryRow label="CAC certificate" value={files.cacCertificate?.name ?? ""} />
        </dl>
      </div>

      <label className="flex items-start gap-2 text-sm text-foreground">
        <Checkbox
          checked={form.watch("agreeToTerms") === true}
          onCheckedChange={(checked) =>
            form.setValue("agreeToTerms", checked === true ? true : (undefined as never), {
              shouldValidate: true,
            })
          }
          className="mt-0.5"
        />
        I confirm that all information provided is accurate and that I am authorised to register
        this company on VeriGuard.
      </label>
      <FieldError errors={[errors.agreeToTerms]} />
    </div>
  )
}
