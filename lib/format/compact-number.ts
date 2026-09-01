export const COMPACT_NUMBER_THRESHOLD = 1000

export function formatExactNumber(
  value: number,
  locale?: string | string[],
): string {
  return value.toLocaleString(locale)
}

export function formatCompactNumber(
  value: number,
  locale?: string | string[],
): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value)
}

export function shouldCompactNumber(
  value: number,
  threshold = COMPACT_NUMBER_THRESHOLD,
): boolean {
  return Math.abs(value) >= threshold
}

export function getCompactNumberDisplay(
  value: number,
  locale?: string | string[],
): {
  compact: string
  exact: string
  showTooltip: boolean
} {
  const exact = formatExactNumber(value, locale)
  const compact = formatCompactNumber(value, locale)

  return {
    compact,
    exact,
    showTooltip: shouldCompactNumber(value) && compact !== exact,
  }
}
