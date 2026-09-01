import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

import { formatMoneyCents } from "@/lib/payments/format"
import { reportColors } from "@/lib/pdf/report-styles"

export type ReceiptBilling = {
  fullName: string
  email: string
  phone?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  taxId?: string | null
}

export type ReceiptData = {
  receiptNumber: string
  paidAt: string
  description: string
  tierLabel: string
  scanCount: number
  amountCents: number
  currency: string
  cardBrand: string | null
  cardLast4: string | null
  billing: ReceiptBilling
  logoDataUri: string
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Inter",
    color: reportColors.foreground,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: reportColors.primary,
    paddingBottom: 16,
  },
  logo: { width: 36, height: 36, marginBottom: 8 },
  brand: { fontSize: 14, fontFamily: "Inter", fontWeight: 700 },
  muted: { color: reportColors.muted },
  title: { fontSize: 18, fontFamily: "Inter", fontWeight: 700 },
  headerRight: { alignItems: "flex-end" },
  columns: { flexDirection: "row", marginTop: 24, gap: 32 },
  column: { flex: 1 },
  columnTitle: {
    fontSize: 9,
    fontFamily: "Inter",
    fontWeight: 700,
    color: reportColors.mutedLight,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  line: { fontSize: 10, lineHeight: 1.5, color: reportColors.muted },
  lineStrong: {
    fontSize: 10,
    lineHeight: 1.5,
    fontFamily: "Inter",
    fontWeight: 700,
  },
  table: { marginTop: 28 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: reportColors.surface,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: reportColors.border,
  },
  cellDescription: { flex: 3 },
  cellQty: { flex: 1, textAlign: "right" },
  cellAmount: { flex: 1, textAlign: "right" },
  headCell: {
    fontSize: 9,
    fontFamily: "Inter",
    fontWeight: 700,
    color: reportColors.mutedLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", gap: 24, paddingVertical: 4 },
  totalLabel: { fontSize: 10, color: reportColors.muted, width: 90, textAlign: "right" },
  totalValue: { fontSize: 10, width: 90, textAlign: "right" },
  grandLabel: {
    fontSize: 11,
    fontFamily: "Inter",
    fontWeight: 700,
    width: 90,
    textAlign: "right",
  },
  grandValue: {
    fontSize: 11,
    fontFamily: "Inter",
    fontWeight: 700,
    width: 90,
    textAlign: "right",
  },
  paidBadge: {
    marginTop: 20,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: reportColors.surfaceAlt,
    fontSize: 9,
    fontFamily: "Inter",
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: reportColors.border,
    paddingTop: 10,
    fontSize: 8,
    color: reportColors.mutedLight,
  },
})

function addressLines(billing: ReceiptBilling): string[] {
  const cityLine = [billing.city, billing.state, billing.postalCode]
    .filter(Boolean)
    .join(", ")

  return [
    billing.addressLine1,
    billing.addressLine2,
    cityLine || null,
    billing.country,
    billing.phone,
    billing.taxId ? `Tax ID: ${billing.taxId}` : null,
  ].filter((line): line is string => Boolean(line))
}

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  const amount = formatMoneyCents(data.amountCents, data.currency)
  const paymentMethod =
    data.cardBrand && data.cardLast4
      ? `${data.cardBrand} ending ${data.cardLast4}`
      : "Card"

  return (
    <Document
      title={`Aurora receipt ${data.receiptNumber}`}
      author="Aurora"
      subject="Payment receipt"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.logoDataUri} style={styles.logo} />
            <Text style={styles.brand}>Aurora</Text>
            <Text style={styles.muted}>AI skin analysis</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>Receipt</Text>
            <Text style={styles.muted}>{data.receiptNumber}</Text>
            <Text style={styles.muted}>{data.paidAt}</Text>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Billed to</Text>
            <Text style={styles.lineStrong}>{data.billing.fullName}</Text>
            <Text style={styles.line}>{data.billing.email}</Text>
            {addressLines(data.billing).map((line) => (
              <Text key={line} style={styles.line}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Payment</Text>
            <Text style={styles.line}>{paymentMethod}</Text>
            <Text style={styles.line}>Plan: {data.tierLabel}</Text>
            <Text style={styles.line}>Currency: {data.currency}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.headCell, styles.cellDescription]}>
              Description
            </Text>
            <Text style={[styles.headCell, styles.cellQty]}>Scans</Text>
            <Text style={[styles.headCell, styles.cellAmount]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellDescription}>{data.description}</Text>
            <Text style={styles.cellQty}>{data.scanCount}</Text>
            <Text style={styles.cellAmount}>{amount}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{amount}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>
              {formatMoneyCents(0, data.currency)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>Total paid</Text>
            <Text style={styles.grandValue}>{amount}</Text>
          </View>
        </View>

        <Text style={styles.paidBadge}>PAID</Text>

        <Text style={styles.footer} fixed>
          Thank you for using Aurora. Questions about this receipt? Reply to the
          email address on your account and quote {data.receiptNumber}.
        </Text>
      </Page>
    </Document>
  )
}
