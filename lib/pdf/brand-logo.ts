import fs from "node:fs"
import path from "node:path"

let cachedLogoDataUri: string | null = null

export function getBrandLogoDataUri(): string {
  if (cachedLogoDataUri) {
    return cachedLogoDataUri
  }

  const logoPath = path.join(process.cwd(), "app", "icon.png")
  const buffer = fs.readFileSync(logoPath)
  cachedLogoDataUri = `data:image/png;base64,${buffer.toString("base64")}`
  return cachedLogoDataUri
}
