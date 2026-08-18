import type { TenantScope } from "@/lib/clinics/membership"
import { prisma } from "@/lib/db/client"

export type ClinicAnalytics = {
  totalScans: number
  scansLast30Days: number
  scansPrevious30Days: number
  /** Percent change vs the previous window, or null when there is no baseline. */
  trendPercent: number | null
  bandBreakdown: { band: string; count: number }[]
  dailyVolume: { date: string; count: number }[]
  uniquePatients: number
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

/**
 * Reporting figures for one clinic. Every query is filtered by the branded
 * TenantScope, so these numbers can only ever describe the caller's own tenant.
 */
export async function getClinicAnalytics(
  organizationId: TenantScope,
): Promise<ClinicAnalytics> {
  const thirtyDaysAgo = daysAgo(30)
  const sixtyDaysAgo = daysAgo(60)

  const [totalScans, recentScans, previousScans, bands, patients] =
    await Promise.all([
      prisma.scan.count({ where: { organizationId } }),
      prisma.scan.findMany({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.scan.count({
        where: {
          organizationId,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      prisma.scanResult.groupBy({
        by: ["overallBand"],
        where: { scan: { organizationId } },
        _count: { _all: true },
      }),
      prisma.scan.findMany({
        where: { organizationId },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ])

  const scansLast30Days = recentScans.length

  // Null rather than 100% when there is no baseline: "up 100%" from zero is
  // misleading in a dashboard someone makes decisions from.
  const trendPercent =
    previousScans === 0
      ? null
      : Math.round(((scansLast30Days - previousScans) / previousScans) * 100)

  return {
    totalScans,
    scansLast30Days,
    scansPrevious30Days: previousScans,
    trendPercent,
    bandBreakdown: bands
      .map((row) => ({ band: row.overallBand, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    dailyVolume: toDailySeries(recentScans.map((scan) => scan.createdAt)),
    uniquePatients: patients.length,
  }
}

/**
 * Buckets scans by UTC day across the whole window, including days with no
 * scans — a chart that silently omits empty days misrepresents a quiet period
 * as a continuous line.
 */
function toDailySeries(dates: Date[]): { date: string; count: number }[] {
  const counts = new Map<string, number>()

  for (const date of dates) {
    const key = startOfDayUtc(date).toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const series: { date: string; count: number }[] = []
  const today = startOfDayUtc(new Date())

  for (let i = 29; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const key = day.toISOString().slice(0, 10)
    series.push({ date: key, count: counts.get(key) ?? 0 })
  }

  return series
}

/** CSV of the clinic's scans, for reporting outside the app. */
export async function buildClinicScanCsv(
  organizationId: TenantScope,
): Promise<string> {
  const scans = await prisma.scan.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      captureMode: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      result: { select: { overallBand: true } },
    },
  })

  const header = [
    "scan_id",
    "created_at",
    "status",
    "capture_mode",
    "overall_band",
    "patient_name",
    "patient_email",
  ]

  const rows = scans.map((scan) =>
    [
      scan.id,
      scan.createdAt.toISOString(),
      scan.status,
      scan.captureMode,
      scan.result?.overallBand ?? "",
      scan.user.name,
      scan.user.email,
    ].map(csvCell),
  )

  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n")
}

/**
 * Quotes a CSV cell, and defuses values a spreadsheet would otherwise execute
 * as a formula when the file is opened.
 */
function csvCell(value: string): string {
  const escaped = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${escaped.replace(/"/g, '""')}"`
}
