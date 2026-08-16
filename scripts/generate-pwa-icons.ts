/**
 * Rasterize the brand mark into every icon size the app and the web app
 * manifest need. Run after editing assets/brand/logo.svg: npm run gen:icons
 *
 * Outputs are committed, so this never runs at build time. `sharp` comes in
 * with Next.js and is only used here, never in application code.
 */
import fs from "node:fs/promises"
import path from "node:path"

import sharp from "sharp"

const root = path.join(import.meta.dirname, "..")
const LOGO = path.join(root, "assets/brand/logo.svg")
const LOGO_MASKABLE = path.join(root, "assets/brand/logo-maskable.svg")

type IconTarget = {
  source: string
  out: string
  size: number
  note: string
}

const TARGETS: IconTarget[] = [
  {
    source: LOGO,
    out: "public/icons/icon-192.png",
    size: 192,
    note: "manifest icon (any)",
  },
  {
    source: LOGO,
    out: "public/icons/icon-512.png",
    size: 512,
    note: "manifest icon (any), install UI and splash",
  },
  {
    source: LOGO_MASKABLE,
    out: "public/icons/icon-maskable-512.png",
    size: 512,
    note: "manifest icon (maskable), safe inside Android masks",
  },
  {
    // Also read by lib/pdf/brand-logo.ts, so keep the path and size as they are.
    source: LOGO,
    out: "app/icon.png",
    size: 32,
    note: "favicon and PDF header mark",
  },
  {
    source: LOGO,
    out: "app/apple-icon.png",
    size: 180,
    note: "iOS Add to Home Screen",
  },
]

async function main() {
  await fs.mkdir(path.join(root, "public/icons"), { recursive: true })

  // The vector goes out alongside the PNGs so the manifest and any future
  // markup can reference a resolution-independent icon.
  await fs.copyFile(LOGO, path.join(root, "public/icons/icon.svg"))
  console.log("public/icons/icon.svg (vector mark)")

  for (const target of TARGETS) {
    const out = path.join(root, target.out)
    await sharp(target.source, { density: 384 })
      .resize(target.size, target.size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(out)
    console.log(`${target.out} (${target.size}px, ${target.note})`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
