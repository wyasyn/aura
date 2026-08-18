import { renderToBuffer } from "@react-pdf/renderer"

import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import { parseLocationSnapshot } from "@/lib/climate/context"
import { enrichRecommendationsWithImages } from "@/lib/products/enrich-recommendations"
import { registerReportFonts } from "@/lib/pdf/fonts"
import { getBrandLogoDataUri } from "@/lib/pdf/brand-logo"
import { resolveProductImageDataUris } from "@/lib/pdf/product-images"
import { SkinReportDocument } from "@/lib/pdf/skin-report-document"
import { fromScanResult } from "@/lib/scan/persist"

/** Cap so a mis-typed logo URL can't stream an arbitrarily large file into a PDF. */
const MAX_LOGO_BYTES = 512 * 1024
const LOGO_FETCH_TIMEOUT_MS = 4000

/**
 * Fetches a clinic's logo and inlines it, since @react-pdf cannot load a remote
 * image at render time. Any failure returns undefined so the report still
 * renders, just without a logo.
 */
async function fetchRemoteLogoDataUri(
  url: string | null,
): Promise<string | undefined> {
  if (!url || !/^https:\/\//i.test(url)) return undefined

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return undefined

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.startsWith("image/")) return undefined

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > MAX_LOGO_BYTES) return undefined

    return `data:${contentType};base64,${buffer.toString("base64")}`
  } catch (error) {
    console.warn("[pdf] Could not fetch clinic logo", error)
    return undefined
  }
}

export async function generateSkinReportPdf(scanId: string, userId: string) {
  registerReportFonts()

  const scan = await withDbRetry(() =>
    prisma.scan.findFirst({
      where: { id: scanId, userId },
      include: {
        result: true,
        user: { select: { name: true } },
        report: true,
        // A scan taken through a clinic carries that clinic's branding on the
        // report the patient downloads.
        organization: {
          select: { clinic: { select: { displayName: true, logoUrl: true } } },
        },
      },
    }),
  )

  if (!scan?.result) {
    return null
  }

  const clinic = scan.organization?.clinic ?? null
  const brandName = clinic?.displayName ?? "Aurora Organics"
  // Falls back to no logo rather than Aurora's for a clinic whose logo can't be
  // fetched: a clinic's report showing the platform's mark is exactly the leak
  // white-labelling is meant to prevent.
  const logoSrc = clinic
    ? await fetchRemoteLogoDataUri(clinic.logoUrl)
    : getBrandLogoDataUri()

  const assessment = fromScanResult(scan.result)
  assessment.recommendations = await enrichRecommendationsWithImages(
    assessment.recommendations,
  )
  const climateContext = parseLocationSnapshot(scan.locationSnapshot)
  const scanDate = scan.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const productImageDataUris = await resolveProductImageDataUris(
    assessment.recommendations.map((item) => item.imageUrl),
  )

  const buffer = await renderToBuffer(
    <SkinReportDocument
      assessment={assessment}
      climateContext={climateContext}
      userName={scan.user.name ?? `${brandName} user`}
      scanDate={scanDate}
      brandName={brandName}
      logoSrc={logoSrc}
      captureMode={scan.captureMode}
      productImageDataUris={productImageDataUris}
    />,
  )

  return buffer
}
