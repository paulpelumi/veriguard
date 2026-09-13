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
  serials: ExportSerialRow[]
): ExportResult {
  switch (format) {
    case "CSV_VIDEOJET": {
      const header = "Serial,QRData,BatchNo,ExpiryDate,ProductName"
      const rows = serials.map((s) =>
        [csvField(s.serialCode), csvField(s.qrPayload), csvField(batch.batchNumber), csvField(batch.expiryDate), csvField(batch.productName)].join(",")
      )
      return { content: [header, ...rows].join("\n"), mimeType: "text/csv", fileExtension: "csv" }
    }
    case "CSV_DOMINO": {
      const header = "INDEX,DATA1,DATA2,DATA3,DATA4"
      const rows = serials.map((s, i) =>
        [i + 1, s.serialCode, batch.batchNumber, toDdMmYyyy(batch.productionDate), toDdMmYyyy(batch.expiryDate)].join(",")
      )
      return { content: [header, ...rows].join("\n"), mimeType: "text/csv", fileExtension: "csv" }
    }
    case "CSV_MARKEM": {
      const rows = serials.map((s) =>
        [s.serialCode, batch.batchNumber, toDdMmYyyy(batch.productionDate), toDdMmYyyy(batch.expiryDate), batch.productName].join("\t")
      )
      return { content: rows.join("\n"), mimeType: "text/tab-separated-values", fileExtension: "csv" }
    }
    case "CSV_GENERIC": {
      const header = "Serial,Batch,ProductionDate,ExpiryDate,ProductName"
      const rows = serials.map((s) =>
        [csvField(s.serialCode), csvField(batch.batchNumber), csvField(batch.productionDate), csvField(batch.expiryDate), csvField(batch.productName)].join(",")
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
