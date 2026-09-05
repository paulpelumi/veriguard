"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ScanLine, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { BarcodeScanner } from "@/components/verification/barcode-scanner"
import { RecentVerificationsList } from "@/components/verification/recent-verifications-list"
import { VerificationResultCard } from "@/components/verification/verification-result-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  detectScanFormat,
  parseScanUrl,
  resolveEanBarcode,
  resolveVeriGuardSerial,
  type ScanFormat,
} from "@/lib/nafdac/format-detector"
import { isValidNafdacFormat } from "@/lib/nafdac/validator"
import { createClient } from "@/lib/supabase/client"
import { productTypeOptions } from "@/lib/validations/inventory"
import type { NafdacVerificationResult, VerificationLog } from "@/types"

const RECENT_LIMIT = 5

interface ProductVerificationPanelProps {
  reportPath: string
  initialNumber?: string
}

export function ProductVerificationPanel({
  reportPath,
  initialNumber,
}: ProductVerificationPanelProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialNumber ?? "")
  const [productType, setProductType] = useState<string | null>(null)
  const [labelCompany, setLabelCompany] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<NafdacVerificationResult | null>(null)
  const [recentLogs, setRecentLogs] = useState<VerificationLog[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)

  const hasFormatError = value.trim().length > 0 && !isValidNafdacFormat(value)

  const fetchRecent = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("verification_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT)

    setRecentLogs(data ?? [])
  }, [])

  useEffect(() => {
    // Fetch-on-mount is what this effect synchronizes; the setState
    // inside fetchRecent is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecent()
  }, [fetchRecent])

  async function handleVerify(numberOverride?: string) {
    const nafdacNumber = (numberOverride ?? value).trim()
    if (!nafdacNumber) return

    setIsVerifying(true)
    setResult(null)

    try {
      const response = await fetch("/api/nafdac/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nafdacNumber,
          productType: productType ?? undefined,
          labelCompany: labelCompany.trim() || undefined,
        }),
      })
      const data: NafdacVerificationResult = await response.json()
      setResult(data)
      fetchRecent()
    } catch {
      toast.error("Couldn't reach the verification service. Check your connection and try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  function handleTryDifferent() {
    setResult(null)
    setValue("")
    setProductType(null)
    setLabelCompany("")
  }

  function handleReportIssue() {
    const params = new URLSearchParams()
    if (result?.nafdac_number) params.set("nafdacNumber", result.nafdac_number)
    if (
      (result?.status === "verified" || result?.status === "verified_with_warnings") &&
      result.product?.name
    ) {
      params.set("productName", result.product.name)
    }
    router.push(`${reportPath}?${params.toString()}`)
  }

  async function dispatchScannedValue(format: ScanFormat, scannedValue: string) {
    if (format === "nafdac_number") {
      setValue(scannedValue)
      handleVerify(scannedValue)
      return
    }

    if (format === "veriguard_serial") {
      setValue(scannedValue)
      try {
        const data = await resolveVeriGuardSerial(scannedValue)
        toast.info(data.message)
      } catch {
        toast.error("Couldn't check this VeriGuard serial. Try again.")
      }
      return
    }

    if (format === "ean_barcode") {
      setValue(scannedValue)
      try {
        const data = await resolveEanBarcode(scannedValue)
        if (data.nafdac_number) {
          setValue(data.nafdac_number)
          handleVerify(data.nafdac_number)
        } else {
          toast.info(data.message)
        }
      } catch {
        toast.error("Couldn't resolve the scanned barcode.")
      }
      return
    }

    // Unknown format: hand the raw value to the user in the input rather
    // than guessing - they can edit it into a valid NAFDAC number if the
    // scanner misread something.
    setValue(scannedValue)
    toast.info("Couldn't identify this code. You can type the NAFDAC number in manually.")
  }

  async function handleScanResult(scannedValue: string) {
    setScannerOpen(false)

    const format = detectScanFormat(scannedValue)

    if (format === "qr_url") {
      const parsed = parseScanUrl(scannedValue)
      if (parsed) {
        await dispatchScannedValue(parsed.format, parsed.value)
      } else {
        setValue(scannedValue)
        toast.info("This QR code doesn't link to a recognizable product or serial.")
      }
      return
    }

    await dispatchScannedValue(format, scannedValue)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verify a Product</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Enter NAFDAC No. e.g. A1-1234"
              className="flex-1 text-base"
              aria-invalid={hasFormatError}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScannerOpen(true)}
              aria-label="Scan barcode"
            >
              <ScanLine className="size-4" />
            </Button>
          </div>
          {value.trim().length > 0 && (
            <p className={hasFormatError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
              {hasFormatError
                ? "Format looks off — try e.g. A1-1234 or 04-12345"
                : "Format looks good."}
            </p>
          )}

          <Select value={productType} onValueChange={setProductType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Product category (optional — improves accuracy)" />
            </SelectTrigger>
            <SelectContent>
              {productTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={labelCompany}
            onChange={(event) => setLabelCompany(event.target.value)}
            placeholder="Company on label (optional — helps detect misuse)"
          />

          {isVerifying ? (
            <div className="flex flex-col items-center justify-center gap-2 py-4">
              <ShieldCheck className="size-8 animate-pulse text-primary" />
              <p className="text-sm text-muted-foreground">Verifying with NAFDAC...</p>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={!value.trim() || hasFormatError}
              onClick={() => handleVerify()}
            >
              Verify Product
            </Button>
          )}

          {result && !isVerifying && (
            <VerificationResultCard
              result={result}
              onRetry={() => handleVerify(result.nafdac_number)}
              onTryDifferent={handleTryDifferent}
              onReportIssue={handleReportIssue}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentVerificationsList logs={recentLogs} />
        </CardContent>
      </Card>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanResult}
      />
    </div>
  )
}
