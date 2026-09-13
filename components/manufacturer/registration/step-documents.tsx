"use client"

import { useRef } from "react"
import { FileText, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]

export interface DocumentFiles {
  nafdacCertificate: File | null
  cacCertificate: File | null
}

interface StepDocumentsProps {
  files: DocumentFiles
  onChange: (files: DocumentFiles) => void
  errors: { nafdacCertificate?: string; cacCertificate?: string }
}

// Files are held in memory here and only actually uploaded to Supabase
// Storage at final submit (see the wizard's onSubmit) - the
// manufacturer-documents bucket's RLS policy scopes uploads to the
// caller's own auth.uid() path, but per the spec's own flow the auth
// account isn't created until Step 4's submit, so there's no session to
// upload against yet during this step. Uploading here would also leave an
// orphaned file (or require an account to already exist) if someone
// abandons the wizard before finishing.
function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Only PDF, JPG, or PNG files are accepted."
  if (file.size > MAX_FILE_BYTES) return "File must be 5MB or smaller."
  return null
}

function DocumentSlot({
  label,
  file,
  error,
  onSelect,
  onRemove,
}: {
  label: string
  file: File | null
  error?: string
  onSelect: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected) onSelect(selected)
          event.target.value = ""
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <FileText className="size-8 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${label}`}
            onClick={onRemove}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Upload className="size-6" />
          Click to upload (PDF, JPG, or PNG, max 5MB)
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function StepDocuments({ files, onChange, errors }: StepDocumentsProps) {
  return (
    <div className="flex flex-col gap-6">
      <DocumentSlot
        label="NAFDAC Certificate"
        file={files.nafdacCertificate}
        error={errors.nafdacCertificate}
        onSelect={(file) => onChange({ ...files, nafdacCertificate: file })}
        onRemove={() => onChange({ ...files, nafdacCertificate: null })}
      />
      <DocumentSlot
        label="CAC Certificate"
        file={files.cacCertificate}
        error={errors.cacCertificate}
        onSelect={(file) => onChange({ ...files, cacCertificate: file })}
        onRemove={() => onChange({ ...files, cacCertificate: null })}
      />
    </div>
  )
}

export function validateDocumentFiles(files: DocumentFiles): StepDocumentsProps["errors"] {
  const errors: StepDocumentsProps["errors"] = {}
  if (!files.nafdacCertificate) {
    errors.nafdacCertificate = "NAFDAC certificate is required"
  } else {
    const fileError = validateFile(files.nafdacCertificate)
    if (fileError) errors.nafdacCertificate = fileError
  }
  if (!files.cacCertificate) {
    errors.cacCertificate = "CAC certificate is required"
  } else {
    const fileError = validateFile(files.cacCertificate)
    if (fileError) errors.cacCertificate = fileError
  }
  return errors
}
