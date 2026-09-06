import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  NotFoundException,
  RGBLuminanceSource,
} from "@zxing/library"
import sharp from "sharp"

// @zxing/browser (already used by the camera scanner, Module 2/3) only
// works against DOM APIs (canvas/video elements) - there's no DOM in a
// Next.js API route. @zxing/library's core decoder is platform-agnostic
// and just needs pixel data, so this pairs it with `sharp` (a new
// dependency; the existing NAFDAC scraper never needed an image decoder
// since Greenbook returns JSON) to turn a downloaded WhatsApp photo into
// the raw pixel buffer zxing needs.
const SUPPORTED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
]

export async function decodeBarcodeFromImage(imageBuffer: Buffer): Promise<string | null> {
  // Cap dimensions - a full-resolution phone photo (often 3000px+) costs far
  // more decode time than it buys accuracy for a barcode that only needs to
  // be legible, not high-fidelity.
  const { data, info } = await sharp(imageBuffer)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixelCount = info.width * info.height
  const argbPixels = new Int32Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    // RGBLuminanceSource reads R/G/B out of each packed int the same way a
    // canvas ImageData-backed source would (alpha forced opaque - it isn't
    // used in the luminance calculation anyway).
    argbPixels[i] = (0xff << 24) | (r << 16) | (g << 8) | b
  }

  const luminanceSource = new RGBLuminanceSource(argbPixels, info.width, info.height)
  const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))

  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS)
  hints.set(DecodeHintType.TRY_HARDER, true)

  const reader = new MultiFormatReader()
  reader.setHints(hints)

  try {
    const result = reader.decode(binaryBitmap)
    return result.getText()
  } catch (error) {
    if (error instanceof NotFoundException) return null
    throw error
  }
}
