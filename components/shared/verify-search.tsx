"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { detectScanFormat } from "@/lib/nafdac/format-detector"

// Redirects to the two existing public verification pages rather than
// re-implementing verification here - /verify/[nafdacNumber] deliberately
// reads a cache snapshot only (no live Greenbook scrape for anonymous
// visitors, an abuse vector its own comment already covers), and
// /verify/serial/[serialCode] (Module 7) already IS the public,
// no-login live check. This search box is just a friendlier front door
// to both than typing the URL directly.
export function VerifySearch() {
  const router = useRouter()
  const [value, setValue] = useState("")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return

    const format = detectScanFormat(trimmed)
    if (format === "nafdac_number") {
      router.push(`/verify/${encodeURIComponent(trimmed)}`)
    } else if (format === "veriguard_serial") {
      router.push(`/verify/serial/${encodeURIComponent(trimmed)}`)
    } else {
      toast.error("Enter a NAFDAC number (e.g. A1-1234) or a VeriGuard serial code (VG-...).")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Enter NAFDAC number or VeriGuard code"
        aria-label="NAFDAC number or VeriGuard serial code"
        className="h-11"
      />
      <Button type="submit" size="lg" className="sm:w-auto">
        <Search className="size-4" />
        Verify
      </Button>
    </form>
  )
}
