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

export async function generateSkinReportPdf(scanId: string, userId: string) {
  registerReportFonts()

  const scan = await withDbRetry(() =>
    prisma.scan.findFirst({
      where: { id: scanId, userId },
      include: {
        result: true,
        user: { select: { name: true } },
        report: true,
      },
    }),
  )

  if (!scan?.result) {
    return null
  }

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
      userName={scan.user.name ?? "Aurora Organics user"}
      scanDate={scanDate}
      logoSrc={getBrandLogoDataUri()}
      captureMode={scan.captureMode}
      productImageDataUris={productImageDataUris}
    />,
  )

  return buffer
}
