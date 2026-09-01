import { DimensionRadarChart } from "@/components/scan/dimension-radar-chart"
import { ReportApplicationSchedule } from "@/components/reports/report-application-schedule"
import { ReportBandDisplay } from "@/components/reports/report-band-display"
import { ReportClimateBlock } from "@/components/reports/report-climate-block"
import { ReportDimensionTable } from "@/components/reports/report-dimension-table"
import { ReportDisclaimer } from "@/components/reports/report-disclaimer"
import { ReportDoshaBlock } from "@/components/reports/report-dosha-block"
import { ReportProductList } from "@/components/reports/report-product-list"
import { ReportSection } from "@/components/reports/report-section"
import { ReportProductsWithFeedback } from "@/components/reports/report-products-with-feedback"
import {
  CONCERNS_NOT_VISIBLE_TITLE,
  RECOMMENDATION_SECTIONS,
  REPORT_SECTION_TITLES,
} from "@/lib/scan/constants"
import { formatConcernLabel } from "@/lib/scan/format"
import type { ScanClimateContext, SkinAssessment } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type SkinReportDocumentProps = {
  assessment: SkinAssessment
  climateContext?: ScanClimateContext | null
  className?: string
  /** Names the clinic when one of its own products was recommended. */
  clinicName?: string | null
  /**
   * The saved scan, when there is one.
   *
   * Present enables the per-product feedback controls. Absent — a scan not yet
   * persisted, or a PDF render — the report is identical minus the controls.
   */
  scanId?: string | null
}

export function SkinReportDocument({
  assessment,
  climateContext = null,
  className,
  clinicName = null,
  scanId = null,
}: SkinReportDocumentProps) {
  return (
    <div className={cn("space-y-8 font-sans", className)}>
      <ReportSection title={REPORT_SECTION_TITLES.snapshot} first>
        <ReportBandDisplay
          band={assessment.overallBand}
          dimensions={assessment.dimensions}
        />
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {assessment.summary}
        </p>
        {assessment.concernsNotVisible.length > 0 ? (
          <div className="mt-4 max-w-prose">
            <p className="text-xs font-medium text-foreground">
              {CONCERNS_NOT_VISIBLE_TITLE}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {assessment.concernsNotVisible.map((item) => (
                <li
                  key={item.concern}
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  <span className="font-medium text-foreground">
                    {formatConcernLabel(item.concern)}:
                  </span>{" "}
                  {item.note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ReportSection>

      <ReportSection title={REPORT_SECTION_TITLES.dosha}>
        <ReportDoshaBlock doshaTyping={assessment.doshaTyping} />
      </ReportSection>

      <ReportSection title={REPORT_SECTION_TITLES.weather}>
        <ReportClimateBlock climateContext={climateContext} />
      </ReportSection>

      <ReportSection title={REPORT_SECTION_TITLES.areas}>
        <p className="mb-3 text-xs text-muted-foreground">
          Band levels from minimal (center) to elevated (outer edge)
        </p>
        <DimensionRadarChart
          dimensions={assessment.dimensions}
          variant="document"
        />
        <div className="mt-4">
          <ReportDimensionTable dimensions={assessment.dimensions} />
        </div>
      </ReportSection>

      {assessment.naturalRecommendations.length > 0 ? (
        <ReportSection title={REPORT_SECTION_TITLES.everydayCare}>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {RECOMMENDATION_SECTIONS.everydayCare.description}
          </p>
          <ul className="space-y-2">
            {assessment.naturalRecommendations.map((item) => (
              <li key={item.id} className="flex gap-2.5 text-sm">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <ReportApplicationSchedule
                    applicationTime={item.applicationTime}
                    applicationFrequency={item.applicationFrequency}
                    className="mt-1"
                  />
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>
      ) : null}

      <ReportSection title={REPORT_SECTION_TITLES.products}>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {RECOMMENDATION_SECTIONS.recommendedProducts.description}
        </p>
        {scanId ? (
          <ReportProductsWithFeedback
            products={assessment.recommendations}
            scanId={scanId}
            clinicName={clinicName}
          />
        ) : (
          <ReportProductList
            products={assessment.recommendations}
            clinicName={clinicName}
          />
        )}
      </ReportSection>

      <ReportDisclaimer />
    </div>
  )
}
