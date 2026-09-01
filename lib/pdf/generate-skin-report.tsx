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
import { MAX_LOGO_BYTES } from "@/lib/clinics/schemas"

/**
 * Stops a mis-typed logo URL streaming an arbitrarily large file into a PDF.
 * Held at the upload cap so a logo accepted in settings is never dropped here.
 */
const MAX_REMOTE_LOGO_BYTES = MAX_LOGO_BYTES
const LOGO_FETCH_TIMEOUT_MS = 4000

/**
 * Fetches a clinic's logo and inlines it, since @react-pdf cannot load a remote
 * image at render time. Any failure returns undefined so the report still
 * renders, just without a logo.
 */
async function fetchRemoteLogoDataUri(
  url: string | null,
): Promise<string | undefined> {
  if (!url) return undefined

  // An uploaded logo is already an inline data URI — @react-pdf renders it as
  // is, and there is nothing to fetch. Without this it would fall through the
  // https check below and silently vanish from every branded report.
  if (url.startsWith("data:image/")) return url

  if (!/^https:\/\//i.test(url)) return undefined

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return undefined

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.startsWith("image/")) return undefined

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > MAX_REMOTE_LOGO_BYTES) return undefined

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

  // The tenant travels back with the buffer so the caller can attribute the
  // download without repeating the lookup. Null for a scan taken outside any
  // clinic, which is a correct answer rather than a missing one.
  return { buffer, organizationId: scan.organizationId }
}
