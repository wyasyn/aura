import { StyleSheet } from "@react-pdf/renderer"

/**
 * Minimum space (pt) a section title should keep with content below it, so a
 * heading is not stranded at the foot of a page. Blocks that cannot be split at
 * all (the radar chart) use wrap={false} instead.
 */
export const sectionMinPresence = {
  compact: 80,
  standard: 120,
  products: 160,
} as const

export const reportColors = {
  foreground: "#1a1a1a",
  muted: "#666666",
  mutedLight: "#888888",
  border: "#e5e0db",
  surface: "#f7f4f1",
  surfaceAlt: "#f0ebe6",
  chart: "#b8860b",
  chartFill: "#e8dcc8",
  primary: "#8b6914",
} as const

export const reportStyles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: "Inter",
    color: reportColors.foreground,
  },
  section: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: reportColors.primary,
  },
  sectionFirst: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter",
    fontWeight: 700,
    marginBottom: 8,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    color: reportColors.muted,
  },
  bodyStrong: {
    fontSize: 10,
    fontFamily: "Inter",
    fontWeight: 700,
    color: reportColors.foreground,
  },
  meta: {
    fontSize: 8,
    color: reportColors.mutedLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: reportColors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brandName: {
    fontSize: 11,
    fontFamily: "Inter",
    fontWeight: 700,
    color: reportColors.foreground,
  },
  brandTagline: {
    fontSize: 8,
    color: reportColors.muted,
    marginTop: 2,
  },
  headerRight: {
    fontSize: 8,
    color: reportColors.muted,
    textAlign: "right",
  },
  rowLabel: {
    fontSize: 10,
    fontFamily: "Inter",
    fontWeight: 700,
    marginBottom: 2,
  },
  rowNote: {
    fontSize: 9,
    color: reportColors.muted,
    lineHeight: 1.4,
  },
  rowValue: {
    fontSize: 10,
    fontFamily: "Inter",
    fontWeight: 700,
    textAlign: "right",
  },
  climateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  climateCell: {
    width: "48%",
    backgroundColor: reportColors.surfaceAlt,
    padding: 8,
    marginBottom: 4,
  },
  climateLabel: {
    fontSize: 8,
    color: reportColors.muted,
  },
  climateValue: {
    fontSize: 10,
    fontFamily: "Inter",
    fontWeight: 700,
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: reportColors.primary,
    marginTop: 4,
  },
  disclaimer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: reportColors.surface,
  },
  disclaimerText: {
    fontSize: 8,
    color: reportColors.muted,
    lineHeight: 1.4,
  },
  disclaimerLink: {
    marginTop: 8,
    fontSize: 8,
    color: reportColors.primary,
    textDecoration: "none",
  },
  chartCaption: {
    fontSize: 8,
    color: reportColors.muted,
    marginBottom: 8,
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dimensionCards: {
    marginTop: 8,
  },
  gridCell: {
    width: "48%",
    backgroundColor: reportColors.surfaceAlt,
    padding: 8,
    borderRadius: 4,
  },
  gridCellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 4,
  },
  productCell: {
    width: "48%",
    borderWidth: 1,
    borderColor: reportColors.border,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: reportColors.surfaceAlt,
  },
  productImage: {
    width: "100%",
    height: 120,
    objectFit: "cover",
  },
  productBody: {
    padding: 8,
    gap: 4,
  },
  productLink: {
    fontSize: 8,
    color: reportColors.primary,
    marginTop: 4,
    textDecoration: "underline",
  },
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: reportColors.border,
    paddingTop: 8,
  },
  pageFooterText: {
    fontSize: 8,
    color: reportColors.mutedLight,
  },
})
