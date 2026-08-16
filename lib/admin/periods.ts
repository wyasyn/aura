/**
 * Period and bucketing helpers for admin analytics.
 *
 * Everything here works in UTC so that period boundaries, SQL `date_trunc`
 * buckets, and the labels rendered on charts always agree. Mixing local and UTC
 * is what used to shift buckets by a day on non-UTC servers.
 */

export type UsagePeriod =
  | "today"
  | "week"
  | "7d"
  | "30d"
  | "month"
  | "quarter"
  | "year"
  | "all"

export type BucketGranularity = "hour" | "day" | "week" | "month"

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** Longest span of buckets we will render for open-ended periods. */
const MAX_BUCKETS = 60

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

export function utcDaysAgo(days: number, from: Date = new Date()): Date {
  const start = startOfUtcDay(from)
  start.setUTCDate(start.getUTCDate() - days)
  return start
}

/** Monday-based start of the week containing `date`. */
export function startOfUtcWeek(date: Date): Date {
  const start = startOfUtcDay(date)
  const weekday = (start.getUTCDay() + 6) % 7
  start.setUTCDate(start.getUTCDate() - weekday)
  return start
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function startOfUtcQuarter(date: Date): Date {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1))
}

export function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
}

export function getPeriodStart(
  period: UsagePeriod,
  now: Date = new Date(),
): Date | null {
  switch (period) {
    case "today":
      return startOfUtcDay(now)
    case "week":
      return startOfUtcWeek(now)
    case "7d":
      return utcDaysAgo(6, now)
    case "30d":
      return utcDaysAgo(29, now)
    case "month":
      return startOfUtcMonth(now)
    case "quarter":
      return startOfUtcQuarter(now)
    case "year":
      return startOfUtcYear(now)
    case "all":
      return null
  }
}

export function getBucketGranularity(period: UsagePeriod): BucketGranularity {
  switch (period) {
    case "today":
      return "hour"
    case "week":
    case "7d":
    case "30d":
    case "month":
      return "day"
    case "quarter":
      return "week"
    case "year":
    case "all":
      return "month"
  }
}

export function bucketKey(date: Date, granularity: BucketGranularity): string {
  const iso = date.toISOString()
  switch (granularity) {
    case "hour":
      return `${iso.slice(11, 13)}:00`
    case "day":
      return iso.slice(0, 10)
    case "week":
      return startOfUtcWeek(date).toISOString().slice(0, 10)
    case "month":
      return iso.slice(0, 7)
  }
}

export function bucketLabel(
  key: string,
  granularity: BucketGranularity,
): string {
  switch (granularity) {
    case "hour":
      return key
    case "day":
    case "week":
      return key.slice(5)
    case "month": {
      const [, month] = key.split("-")
      return MONTH_NAMES[Number(month) - 1] ?? key
    }
  }
}

/**
 * Every bucket in the period, oldest first, so charts show empty days rather
 * than collapsing them. `earliest` seeds the open-ended "all" period.
 */
export function buildBucketKeys(
  period: UsagePeriod,
  options: { now?: Date; earliest?: Date | null } = {},
): string[] {
  const now = options.now ?? new Date()
  const granularity = getBucketGranularity(period)

  if (granularity === "hour") {
    return Array.from(
      { length: 24 },
      (_, hour) => `${hour.toString().padStart(2, "0")}:00`,
    )
  }

  let start =
    period === "all"
      ? (options.earliest ?? startOfUtcMonth(now))
      : (getPeriodStart(period, now) ?? startOfUtcMonth(now))

  if (period === "all") {
    // Keep the most recent window rather than truncating the newest months.
    const oldestAllowed = startOfUtcMonth(now)
    oldestAllowed.setUTCMonth(oldestAllowed.getUTCMonth() - (MAX_BUCKETS - 1))
    if (start < oldestAllowed) {
      start = oldestAllowed
    }
  }

  const keys: string[] = []
  const cursor =
    granularity === "week"
      ? startOfUtcWeek(start)
      : granularity === "month"
        ? startOfUtcMonth(start)
        : startOfUtcDay(start)

  while (cursor <= now && keys.length < MAX_BUCKETS) {
    keys.push(bucketKey(cursor, granularity))
    if (granularity === "day") cursor.setUTCDate(cursor.getUTCDate() + 1)
    else if (granularity === "week") cursor.setUTCDate(cursor.getUTCDate() + 7)
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return keys
}

/** Postgres `date_trunc` unit matching a granularity. */
export function truncUnit(granularity: BucketGranularity): string {
  return granularity
}
