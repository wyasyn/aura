/**
 * Builds assets/brand/logo.svg and assets/brand/logo-maskable.svg.
 *
 * The wordmark and tagline are drawn as geometric paths rather than as SVG
 * <text>. Text would depend on a font being installed wherever the file is
 * rendered: sharp resolves it from the host's fonts when rasterising, and a
 * browser opening public/icons/icon.svg resolves it from the visitor's. The
 * same file would then look different in three places, which is the one thing
 * a brand asset may not do. Monoline geometric capitals are simple enough to
 * construct exactly, so they are.
 *
 * Run after changing anything here:  npm run gen:logo && npm run gen:icons
 */
import fs from "node:fs/promises"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")

const INK = "#111111"

// ── letterforms ─────────────────────────────────────────────────────────────
// One monoline capital per entry, drawn on a 100-unit cap height with the
// baseline at y=100. `w` is the advance width before tracking.

type Glyph = { w: number; d: string[] }

const GLYPHS: Record<string, Glyph> = {
  A: { w: 78, d: ["M2 100 L39 0 L76 100", "M16 70 H62"] },
  C: { w: 84, d: ["M78 24 A42 50 0 1 0 78 76"] },
  D: { w: 78, d: ["M0 0 V100", "M0 0 H30 A46 50 0 0 1 30 100 H0"] },
  E: { w: 62, d: ["M62 0 H0 V100 H62", "M0 50 H52"] },
  G: { w: 88, d: ["M80 24 A44 50 0 1 0 84 74 V52 H58"] },
  I: { w: 8, d: ["M4 0 V100"] },
  L: { w: 58, d: ["M0 0 V100 H58"] },
  N: { w: 74, d: ["M0 100 V0 L74 100 V0"] },
  O: { w: 88, d: ["M44 0 A44 50 0 1 0 44.01 0"] },
  R: { w: 74, d: ["M0 100 V0", "M0 0 H40 A26 26 0 0 1 40 52 H0", "M38 52 L74 100"] },
  T: { w: 68, d: ["M0 0 H68", "M34 0 V100"] },
  U: { w: 76, d: ["M0 0 V62 A38 38 0 0 0 76 62 V0"] },
  V: { w: 72, d: ["M0 0 L36 100 L72 0"] },
  Y: { w: 72, d: ["M0 0 L36 52 L72 0", "M36 52 V100"] },
  "-": { w: 44, d: ["M8 52 H36"] },
  " ": { w: 34, d: [] },
}

/** Total advance of a string at a given tracking, in glyph units. */
function measure(text: string, tracking: number): number {
  const chars = [...text]
  return chars.reduce((sum, c, i) => {
    const g = GLYPHS[c]
    if (!g) throw new Error(`No glyph for ${JSON.stringify(c)}`)
    return sum + g.w + (i < chars.length - 1 ? tracking : 0)
  }, 0)
}

/**
 * Lays a string out centred on `cx`, with its baseline on `baseline`, scaled so
 * the line occupies exactly `width` units.
 *
 * Driving the layout from the finished width rather than from a cap height is
 * what keeps the two lines inside the canvas: the tagline is thirty-two
 * characters and any hand-picked size overflowed, silently, because a clipped
 * SVG still renders.
 */
function setText(
  text: string,
  { cx, baseline, width, tracking, weight }: {
    cx: number
    baseline: number
    width: number
    tracking: number
    weight: number
  },
): string {
  // `tracking` is expressed per 100 units of cap height, so it scales with the
  // type rather than opening up as the line shrinks.
  const s = width / measure(text, tracking)
  const size = s * 100
  let x = cx - width / 2
  const top = baseline - size

  const out: string[] = []
  for (const c of [...text]) {
    const g = GLYPHS[c]
    if (g.d.length > 0) {
      out.push(
        `    <g transform="translate(${round(x)} ${round(top)}) scale(${round(s, 4)})">` +
          g.d.map((d) => `<path d="${d}"/>`).join("") +
          `</g>`,
      )
    }
    x += (g.w + tracking) * s
  }

  return (
    `  <g fill="none" stroke="${INK}" stroke-width="${round(weight / s, 3)}" ` +
    `stroke-linecap="butt" stroke-linejoin="miter">\n${out.join("\n")}\n  </g>`
  )
}

const round = (n: number, dp = 2) => Number(n.toFixed(dp)).toString()

// ── the mark: the A with the botanical branch crossing it ───────────────────

/**
 * `scale` and `dx`/`dy` place the 512-unit mark inside the lockup canvas.
 * The geometry is the same one the previous logo used — that artwork was
 * already this design — minus the orange disc it sat on, with the branch
 * carried past the right leg the way it runs in the source drawing.
 */
function mark(dx: number, dy: number, scale: number): string {
  const leaf = (x: number, y: number, angle: number, len: number) =>
    `      <use href="#leaf" transform="translate(${x} ${y}) rotate(${angle}) scale(${len})"/>`

  return [
    `  <g transform="translate(${round(dx)} ${round(dy)}) scale(${round(scale, 4)})">`,
    `    <path d="M116 470 L258 60 L400 470" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="butt" stroke-linejoin="miter"/>`,
    `    <g fill="${INK}">`,
    `      <path d="M84 213 C 132 224 176 250 210 278 C 244 306 268 326 292 341 C 318 352 344 356 372 357" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
    `      <ellipse cx="69" cy="208" rx="17" ry="13" transform="rotate(-16 69 208)"/>`,
    leaf(136, 238, -62, 54),
    leaf(216, 283, -70, 46),
    leaf(264, 315, -49, 60),
    leaf(283, 335, -24, 60),
    leaf(316, 347, -20, 52),
    leaf(290, 342, 156, 58),
    leaf(290, 343, 139, 58),
    `    </g>`,
    `  </g>`,
  ].join("\n")
}

const LEAF_DEF =
  `  <defs>\n    <path id="leaf" d="M0 0 C.34 -.17 .74 -.17 1 0 C.74 .17 .34 .17 0 0 Z"/>\n  </defs>`

// ── compositions ────────────────────────────────────────────────────────────

const W = 1080
const H = 900

function lockup(): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Aurora Organics — organic, ayurveda, natural">`,
    `  <title>Aurora Organics</title>`,
    `  <!-- Generated by scripts/generate-brand-logo.ts. Do not hand-edit; edit`,
    `       the script and run: npm run gen:logo && npm run gen:icons -->`,
    LEAF_DEF,
    mark(282, 20, 1.0),
    setText("AURORA", { cx: W / 2, baseline: 700, width: 700, tracking: 26, weight: 6 }),
    setText("- ORGANIC - AYURVEDA - NATURAL -", {
      cx: W / 2,
      baseline: 822,
      width: 980,
      tracking: 16,
      weight: 4.5,
    }),
    `</svg>`,
  ].join("\n")
}

/**
 * Android crops maskable icons to a circle or squircle and guarantees only the
 * middle 80%. The wordmark and tagline cannot survive that, so this variant is
 * the mark alone, centred on a solid field — which is what the maskable spec
 * asks for and why it has always been a separate file.
 */
function maskable(): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Aurora Organics">`,
    `  <title>Aurora Organics</title>`,
    `  <!-- Generated by scripts/generate-brand-logo.ts. Mark only: Android masks`,
    `       crop to the middle 80%, which a wordmark cannot survive. -->`,
    LEAF_DEF,
    `  <rect width="512" height="512" fill="#ffffff"/>`,
    mark(74, 66, 0.72),
    `</svg>`,
  ].join("\n")
}

async function main() {
  const dir = path.join(root, "assets/brand")
  await fs.mkdir(dir, { recursive: true })

  await fs.writeFile(path.join(dir, "logo.svg"), lockup() + "\n", "utf8")
  console.log("assets/brand/logo.svg (full lockup)")

  await fs.writeFile(path.join(dir, "logo-maskable.svg"), maskable() + "\n", "utf8")
  console.log("assets/brand/logo-maskable.svg (mark only, solid field)")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
