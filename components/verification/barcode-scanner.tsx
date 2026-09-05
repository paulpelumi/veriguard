"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"
import { BarcodeFormat, DecodeHintType } from "@zxing/library"
import { Camera, X } from "lucide-react"

import { Button } from "@/components/ui/button"

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (value: string) => void
}

type ScannerState = "starting" | "scanning" | "permission_denied" | "no_camera" | "error"

const SUPPORTED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
]

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [state, setState] = useState<ScannerState>("starting")

  useEffect(() => {
    if (!open) return

    let cancelled = false
    // Resetting to "starting" each time the overlay (re)opens is the sync
    // this effect performs before talking to the camera.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("starting")

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS)
    const reader = new BrowserMultiFormatReader(hints)

    async function attempt(constraints: MediaStreamConstraints) {
      const controls = await reader.decodeFromConstraints(
        constraints,
        videoRef.current ?? undefined,
        (result) => {
          if (cancelled || !result) return
          controlsRef.current?.stop()
          onScan(result.getText())
        }
      )

      if (cancelled) {
        controls.stop()
        return
      }
      controlsRef.current = controls
      setState("scanning")
    }

    function handleError(err: unknown) {
      if (cancelled) return
      if (err instanceof DOMException) {
        if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(err.name)) {
          setState("permission_denied")
          return
        }
        if (["NotFoundError", "OverconstrainedError"].includes(err.name)) {
          setState("no_camera")
          return
        }
      }
      setState("error")
    }

    async function start() {
      try {
        // Prefer the rear camera - essential on mobile for scanning.
        await attempt({ video: { facingMode: { ideal: "environment" } } })
      } catch (err) {
        if (cancelled) return
        if (err instanceof DOMException && err.name === "OverconstrainedError") {
          try {
            await attempt({ video: true })
          } catch (fallbackErr) {
            handleError(fallbackErr)
          }
          return
        }
        handleError(err)
      }
    }

    start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [open, onScan])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <p className="text-sm font-medium text-white">Scan Barcode or QR Code</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />

        {state === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/3 w-4/5 max-w-sm rounded-lg border-4 border-success shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>
        )}

        {state === "starting" && <p className="text-sm text-white/70">Starting camera...</p>}

        {(state === "permission_denied" || state === "no_camera" || state === "error") && (
          <div className="mx-6 flex flex-col items-center gap-3 text-center">
            <Camera className="size-8 text-white/70" />
            <p className="text-sm text-white">
              {state === "permission_denied" &&
                "Camera access is required for scanning. Please allow camera access in your browser settings."}
              {state === "no_camera" &&
                "No camera was found on this device. You can type the NAFDAC number in manually instead."}
              {state === "error" &&
                "Couldn't start the camera. You can type the NAFDAC number in manually instead."}
            </p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Enter manually instead
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
