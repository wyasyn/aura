import fs from "node:fs"
import path from "node:path"

let cachedLogoDataUri: string | null = null

export function getBrandLogoDataUri(): string {
  if (cachedLogoDataUri) {
    return cachedLogoDataUri
  }

  // A dedicated 512px asset rather than the 32px favicon. Both PDFs draw this
  // into a 40pt box, which wants roughly 167px at print resolution, so reusing
  // the favicon put a visibly soft mark on every scan report and receipt.
  const logoPath = path.join(process.cwd(), "public", "icons", "logo-print.png")
  const buffer = fs.readFileSync(logoPath)
  cachedLogoDataUri = `data:image/png;base64,${buffer.toString("base64")}`
  return cachedLogoDataUri
}
