import type { ReactNode } from "react"

import {
  Document,
  Image,
  Link,
  Page,
  Text,
  View,
} from "@react-pdf/renderer"

import { DimensionRadarSvg } from "@/lib/pdf/dimension-radar-svg"
import { reportStyles, sectionMinPresence } from "@/lib/pdf/report-styles"
import { getBandPdfColor } from "@/lib/scan/band-styles"
import {
  CONCERNS_NOT_VISIBLE_TITLE,
  CONSULTATION_BOOKING_URL,
  RECOMMENDATION_SECTIONS,
  REPORT_SECTION_TITLES,
  SKIN_DISCLAIMER,
} from "@/lib/scan/constants"
import {
  formatApplicationSchedule,
  formatBand,
  formatClimateBand,
  formatConcernLabel,
  formatClimateZone,
  formatLocationLabel,
  formatSeasonBand,
  formatSkinHeadline,
} from "@/lib/scan/format"
import { formatDoshaLabel } from "@/lib/scan/dosha"
import type { ScanClimateContext, SkinAssessment } from "@/lib/scan/types"

type SkinReportDocumentProps = {
  assessment: SkinAssessment
  climateContext?: ScanClimateContext | null
  userName?: string
  scanDate?: string
  logoSrc?: string
  captureMode?: string
  productImageDataUris?: Map<string, string>
}

function ReportPageFooter() {
  return (
    <View style={reportStyles.pageFooter} fixed>
      <Text style={reportStyles.pageFooterText}>
        Aurora Organics · Skin Intelligence Report
      </Text>
      <Text
        style={reportStyles.pageFooterText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  )
}

function ReportDocumentHeader({
  logoSrc,
  scanDate,
  userName,
  captureMode,
}: {
  logoSrc?: string
  scanDate?: string
  userName?: string
  captureMode?: string
}) {
  const metaLines = [
    scanDate,
    userName ? `Prepared for ${userName}` : null,
    captureMode ?? null,
  ].filter(Boolean) as string[]

  return (
    // Repeated on every page: a two-page report whose later sheets carry no
    // branding reads as loose paper once it is printed or forwarded.
    <View style={reportStyles.header} fixed>
      <View style={reportStyles.headerLeft}>
        {logoSrc ? <Image src={logoSrc} style={reportStyles.logo} /> : null}
        <View>
          <Text style={reportStyles.brandName}>Aurora Organics</Text>
          <Text style={reportStyles.brandTagline}>Skin Intelligence Report</Text>
        </View>
      </View>
      {metaLines.length > 0 ? (
        <View>
          {metaLines.map((line) => (
            <Text key={line} style={reportStyles.headerRight}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function ReportSection({
  title,
  first = false,
  minPresence = sectionMinPresence.standard,
  children,
}: {
  title: string
  first?: boolean
  /**
   * Space the title needs below it before a page break is allowed, so a heading
   * never ends up stranded at the foot of a page with its content overleaf.
   */
  minPresence?: number
  children: ReactNode
}) {
  return (
    <View style={first ? reportStyles.sectionFirst : reportStyles.section}>
      <Text style={reportStyles.sectionTitle} minPresenceAhead={minPresence}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function DimensionCards({ assessment }: { assessment: SkinAssessment }) {
  return (
    <View style={reportStyles.twoColumnGrid}>
      {assessment.dimensions.map((dimension) => (
        <View key={dimension.id} wrap={false} style={reportStyles.gridCell}>
          <View style={reportStyles.gridCellHeader}>
            <Text style={reportStyles.rowLabel}>{dimension.label}</Text>
            <Text
              style={[
                reportStyles.rowValue,
                { color: getBandPdfColor(dimension.band) },
              ]}
            >
              {formatBand(dimension.band)}
            </Text>
          </View>
          {dimension.note ? (
            <Text style={reportStyles.rowNote}>{dimension.note}</Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function WeatherSection({
  climateContext,
  locationLabel,
  hasClimateBands,
}: {
  climateContext: ScanClimateContext | null
  locationLabel: string
  hasClimateBands: boolean
}) {
  if (!climateContext || (!locationLabel && !hasClimateBands)) {
    return (
      <Text style={reportStyles.body}>
        Climate data was not available for this scan.
      </Text>
    )
  }

  return (
    <View>
      {locationLabel ? (
        <Text style={[reportStyles.bodyStrong, { marginBottom: 6 }]}>
          {locationLabel}
        </Text>
      ) : null}
      {hasClimateBands ? (
        <View style={reportStyles.climateGrid}>
          <View style={reportStyles.climateCell}>
            <Text style={reportStyles.climateLabel}>UV exposure</Text>
            <Text style={reportStyles.climateValue}>
              {formatClimateBand(climateContext.uvIndexBand)}
            </Text>
          </View>
          <View style={reportStyles.climateCell}>
            <Text style={reportStyles.climateLabel}>Humidity</Text>
            <Text style={reportStyles.climateValue}>
              {formatClimateBand(climateContext.humidityBand)}
            </Text>
          </View>
          <View style={reportStyles.climateCell}>
            <Text style={reportStyles.climateLabel}>Temperature</Text>
            <Text style={reportStyles.climateValue}>
              {formatClimateBand(climateContext.temperatureBand)}
            </Text>
          </View>
          <View style={reportStyles.climateCell}>
            <Text style={reportStyles.climateLabel}>Climate zone</Text>
            <Text style={reportStyles.climateValue}>
              {formatClimateZone(climateContext.climateZone)}
            </Text>
          </View>
        </View>
      ) : null}
      {climateContext.seasonBand ? (
        <Text style={[reportStyles.meta, { marginTop: 6 }]}>
          Season: {formatSeasonBand(climateContext.seasonBand)}
        </Text>
      ) : null}
    </View>
  )
}

export function SkinReportDocument({
  assessment,
  climateContext = null,
  userName,
  scanDate,
  logoSrc,
  captureMode,
  productImageDataUris,
}: SkinReportDocumentProps) {
  const locationLabel = climateContext
    ? formatLocationLabel(climateContext)
    : ""
  const hasClimateBands =
    climateContext?.uvIndexBand != null ||
    climateContext?.humidityBand != null ||
    climateContext?.temperatureBand != null

  return (
    <Document title="Aurora Organics Skin Report">
      {/*
        One flowing page rather than a page per topic. The old layout pinned
        each block to a fixed sheet, which left pages two and three around half
        empty, and page one carried wrap={false} so a longer model summary was
        silently truncated instead of continuing overleaf.
      */}
      <Page size="A4" style={reportStyles.page}>
        <ReportPageFooter />

        <ReportDocumentHeader
          logoSrc={logoSrc}
          scanDate={scanDate}
          userName={userName}
          captureMode={captureMode}
        />

        <ReportSection title={REPORT_SECTION_TITLES.snapshot} first>
          <Text
            style={[
              reportStyles.bodyStrong,
              { color: getBandPdfColor(assessment.overallBand) },
            ]}
          >
            {formatBand(assessment.overallBand)}
          </Text>
          <Text style={[reportStyles.body, { marginTop: 4 }]}>
            {formatSkinHeadline(assessment.overallBand, assessment.dimensions)}
          </Text>
          <Text style={[reportStyles.body, { marginTop: 6 }]}>
            {assessment.summary}
          </Text>
          {assessment.concernsNotVisible.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={reportStyles.rowLabel}>
                {CONCERNS_NOT_VISIBLE_TITLE}
              </Text>
              {assessment.concernsNotVisible.map((item) => (
                <Text
                  key={item.concern}
                  style={[reportStyles.rowNote, { marginTop: 2 }]}
                >
                  {formatConcernLabel(item.concern)}: {item.note}
                </Text>
              ))}
            </View>
          ) : null}
        </ReportSection>

        <ReportSection title={REPORT_SECTION_TITLES.dosha}>
          <Text style={reportStyles.bodyStrong}>
            Primary lean: {formatDoshaLabel(assessment.doshaTyping.primary)}
            {assessment.doshaTyping.secondary &&
            assessment.doshaTyping.secondary !== assessment.doshaTyping.primary
              ? ` · Secondary: ${formatDoshaLabel(assessment.doshaTyping.secondary)}`
              : ""}
          </Text>
          <Text style={[reportStyles.body, { marginTop: 6 }]}>
            {assessment.doshaTyping.note}
          </Text>
        </ReportSection>

        <ReportSection title={REPORT_SECTION_TITLES.weather}>
          <WeatherSection
            climateContext={climateContext}
            locationLabel={locationLabel}
            hasClimateBands={hasClimateBands}
          />
        </ReportSection>

        <View style={reportStyles.section}>
          {/*
            Heading, caption and chart are one unbreakable block. The chart
            cannot be split across pages, and minPresenceAhead on the heading
            alone was not enough to keep it from being left behind when the
            chart moved overleaf.
          */}
          <View wrap={false}>
            <Text style={reportStyles.sectionTitle}>
              {REPORT_SECTION_TITLES.areas}
            </Text>
            <Text style={reportStyles.chartCaption}>
              Band levels from minimal (center) to elevated (outer edge)
            </Text>
            <DimensionRadarSvg dimensions={assessment.dimensions} />
          </View>
          {/* The cards read the chart back in words, so they belong to the
              same heading rather than opening a page with no title of their own. */}
          <View style={reportStyles.dimensionCards}>
            <DimensionCards assessment={assessment} />
          </View>
        </View>

        {assessment.naturalRecommendations.length > 0 ? (
          <ReportSection title={REPORT_SECTION_TITLES.everydayCare}>
            <Text style={[reportStyles.body, { marginBottom: 8 }]}>
              {RECOMMENDATION_SECTIONS.everydayCare.description}
            </Text>
            {assessment.naturalRecommendations.map((item) => {
              const scheduleLabel = formatApplicationSchedule(
                item.applicationTime,
                item.applicationFrequency,
              )

              return (
                <View key={item.id} wrap={false} style={reportStyles.bulletRow}>
                  <View style={reportStyles.bullet} />
                  <View style={{ flex: 1 }}>
                    <Text style={reportStyles.rowLabel}>{item.title}</Text>
                    {scheduleLabel ? (
                      <Text style={[reportStyles.meta, { marginBottom: 2 }]}>
                        {scheduleLabel}
                      </Text>
                    ) : null}
                    <Text style={reportStyles.rowNote}>{item.description}</Text>
                  </View>
                </View>
              )
            })}
          </ReportSection>
        ) : null}

        <ReportSection
          title={REPORT_SECTION_TITLES.products}
          minPresence={sectionMinPresence.products}
        >
          <Text style={[reportStyles.body, { marginBottom: 8 }]}>
            {RECOMMENDATION_SECTIONS.recommendedProducts.description}
          </Text>
          <View style={reportStyles.twoColumnGrid}>
            {assessment.recommendations.map((item) => {
              const imageSrc = item.imageUrl?.trim()
                ? productImageDataUris?.get(item.imageUrl)
                : null
              const scheduleLabel = formatApplicationSchedule(
                item.applicationTime,
                item.applicationFrequency,
              )

              return (
                <View key={item.id} wrap={false} style={reportStyles.productCell}>
                  {imageSrc ? (
                    <Image src={imageSrc} style={reportStyles.productImage} />
                  ) : null}
                  <View style={reportStyles.productBody}>
                    <Text style={reportStyles.rowLabel}>{item.name}</Text>
                    {scheduleLabel ? (
                      <Text style={[reportStyles.meta, { marginBottom: 2 }]}>
                        {scheduleLabel}
                      </Text>
                    ) : null}
                    <Text style={reportStyles.rowNote}>{item.reason}</Text>
                    {item.storeUrl ? (
                      <Link src={item.storeUrl} style={reportStyles.productLink}>
                        View on Aurora Organics
                      </Link>
                    ) : null}
                  </View>
                </View>
              )
            })}
          </View>
        </ReportSection>

        <View wrap={false} style={reportStyles.disclaimer}>
          <Text style={reportStyles.disclaimerText}>{SKIN_DISCLAIMER}</Text>
          <Link src={CONSULTATION_BOOKING_URL} style={reportStyles.disclaimerLink}>
            Book a consultation
          </Link>
        </View>
      </Page>
    </Document>
  )
}
