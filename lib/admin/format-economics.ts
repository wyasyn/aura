/**
 * Display helpers for unit-economics values.
 *
 * Every per-unit metric is nullable by design (see `perUnit`), so each helper
 * renders an em-dash for `null`. That distinction matters: an em-dash says "no
 * denominator in this window", a "$0.0000" would claim the unit is free.
 */

import { formatMicroUsdCompact } from "@/lib/pricing/format-cost"

export const NO_VALUE = "—"

export function formatMicrosOrDash(micros: number | null): string {
  return micros === null ? NO_VALUE : formatMicroUsdCompact(Math.round(micros))
}

export function formatPercentOrDash(value: number | null, digits = 1): string {
  return value === null ? NO_VALUE : `${value.toFixed(digits)}%`
}

export function formatTokensOrDash(value: number | null): string {
  return value === null ? NO_VALUE : Math.round(value).toLocaleString()
}

export function formatRatioOrDash(value: number | null, digits = 2): string {
  return value === null ? NO_VALUE : value.toFixed(digits)
}

export function formatMsOrDash(value: number | null): string {
  if (value === null) return NO_VALUE
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
  return `${Math.round(value)}ms`
}

/** Micro-USD to a plain dollar string, for totals rather than unit costs. */
export function formatMicrosAsDollars(micros: number): string {
  return formatMicroUsdCompact(Math.round(micros))
}

export function formatDaysOrDash(days: number | null): string {
  if (days === null) return NO_VALUE
  return days >= 10 ? `${Math.round(days)}` : days.toFixed(1)
}
