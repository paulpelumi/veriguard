import type { ExportFormat } from "@/lib/manufacturers/machine-types"

export interface ExportSerialRow {
  serialCode: string
  qrPayload: string
}

export interface ExportBatchInfo {
  batchNumber: string
  productionDate: string
  expiryDate: string
  productName: string
}

export interface ExportResult {
  content: string
  mimeType: string
  fileExtension: string
}

// PDF_LABELS and SVG_PACK need an image-rendering / zip dependency this
// project doesn't have yet (qrcode + jszip) - every text-based format
// below needs nothing beyond string templating, since ZPL/XML embed the
// QR's raw data directly and the printer/label software renders it, and
// CSV/TXT don't render a QR at all. Implemented here; PDF/SVG deferred.
export const IMPLEMENTED_EXPORT_FORMATS: ExportFormat[] = [
  "CSV_VIDEOJET",
  "CSV_DOMINO",
  "CSV_MARKEM",
  "CSV_GENERIC",
  "TXT_SEQUENTIAL",
  "ZPL_ZEBRA",
  "XML_SATO",
]

// The formats where whether a QR actually gets printed depends on the
// specific machine/software, not the format itself - ZPL/XML always draw
// a QR (that's the whole format), TXT_SEQUENTIAL is defined as serial-only.
export const FORMATS_WITH_QR_TOGGLE: ExportFormat[] = ["CSV_VIDEOJET", "CSV_DOMINO", "CSV_MARKEM", "CSV_GENERIC"]

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function toDdMmYyyy(isoDate: string): string {
  const date = new Date(isoDate)
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
}

export function generateExport(
  format: ExportFormat,
  batch: ExportBatchInfo,
  serials: ExportSerialRow[],
  includeQrData = true
): ExportResult {
  switch (format) {
    // CSV_VIDEOJET is the one CSV format the spec itself always paired
    // with a QR column - dropping it (includeQrData: false) still leaves
    // a valid Videojet-shaped file for a machine/job template with no 2D
    // barcode field configured.
    case "CSV_VIDEOJET": {
      const header = includeQrData ? "Serial,QRData,BatchNo,ExpiryDate,ProductName" : "Serial,BatchNo,ExpiryDate,ProductName"
      const rows = serials.map((s) =>
        [
          csvField(s.serialCode),
          ...(includeQrData ? [csvField(s.qrPayload)] : []),
          csvField(batch.batchNumber),
          csvField(batch.expiryDate),
          csvField(batch.productName),
        ].join(",")
      )
      return { content: [header, ...rows].join("\n"), mimeType: "text/csv", fileExtension: "csv" }
    }
    // Domino/Markem/Generic's base columns (DATA1-4 / the plain fields)
    // never carried QR data in the original spec - includeQrData appends
    // it as a trailing field instead of restructuring the base columns,
    // so an operator's existing DATA1-4 mapping in their job software
    // doesn't shift when they turn this on.
    case "CSV_DOMINO": {
      const header = includeQrData ? "INDEX,DATA1,DATA2,DATA3,DATA4,DATA5" : "INDEX,DATA1,DATA2,DATA3,DATA4"
      const rows = serials.map((s, i) =>
        [
          i + 1,
          s.serialCode,
          batch.batchNumber,
          toDdMmYyyy(batch.productionDate),
          toDdMmYyyy(batch.expiryDate),
          ...(includeQrData ? [s.qrPayload] : []),
        ].join(",")
      )
      return { content: [header, ...rows].join("\n"), mimeType: "text/csv", fileExtension: "csv" }
    }
    case "CSV_MARKEM": {
      const rows = serials.map((s) =>
        [
          s.serialCode,
          batch.batchNumber,
          toDdMmYyyy(batch.productionDate),
          toDdMmYyyy(batch.expiryDate),
          batch.productName,
          ...(includeQrData ? [s.qrPayload] : []),
        ].join("\t")
      )
      return { content: rows.join("\n"), mimeType: "text/tab-separated-values", fileExtension: "csv" }
    }
    case "CSV_GENERIC": {
      const header = includeQrData
        ? "Serial,Batch,ProductionDate,ExpiryDate,ProductName,QRData"
        : "Serial,Batch,ProductionDate,ExpiryDate,ProductName"
      const rows = serials.map((s) =>
        [
          csvField(s.serialCode),
          csvField(batch.batchNumber),
          csvField(batch.productionDate),
          csvField(batch.expiryDate),
          csvField(batch.productName),
          ...(includeQrData ? [csvField(s.qrPayload)] : []),
        ].join(",")
      )
      return { content: [header, ...rows].join("\n"), mimeType: "text/csv", fileExtension: "csv" }
    }
    case "TXT_SEQUENTIAL": {
      return { content: serials.map((s) => s.serialCode).join("\n"), mimeType: "text/plain", fileExtension: "txt" }
    }
    case "ZPL_ZEBRA": {
      const labels = serials.map(
        (s) => `^XA^FO50,50^BQN,2,5^FDQA,${s.qrPayload}^FS^FO50,200^FDSerial: ${s.serialCode}^FS^XZ`
      )
      return { content: labels.join("\n"), mimeType: "text/plain", fileExtension: "zpl" }
    }
    case "XML_SATO": {
      const labels = serials
        .map((s) => `  <label><field name="SERIAL">${s.serialCode}</field><field name="QR">${escapeXml(s.qrPayload)}</field></label>`)
        .join("\n")
      return {
        content: `<?xml version="1.0"?>\n<labels>\n${labels}\n</labels>`,
        mimeType: "application/xml",
        fileExtension: "xml",
      }
    }
    default:
      throw new Error(`Export format ${format} is not yet available - PDF and SVG-pack exports are coming soon.`)
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
