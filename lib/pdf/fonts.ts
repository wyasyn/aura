import path from "node:path"

import { Font } from "@react-pdf/renderer"

let fontsRegistered = false

export function registerReportFonts() {
  if (fontsRegistered) return

  const fontsDir = path.join(process.cwd(), "public", "fonts", "inter")

  Font.register({
    family: "Inter",
    fonts: [
      {
        src: path.join(fontsDir, "Inter-Regular.ttf"),
        fontWeight: 400,
      },
      {
        src: path.join(fontsDir, "Inter-Bold.ttf"),
        fontWeight: 700,
      },
    ],
  })

  fontsRegistered = true
}
