export function formatMicroUsd(micros: number, decimals = 4): string {
  return `$${(micros / 1_000_000).toFixed(decimals)}`
}

export function formatExactMicroUsd(micros: number): string {
  return formatMicroUsd(micros)
}

export function formatMicroUsdCompact(micros: number): string {
  const dollars = micros / 1_000_000
  if (dollars >= 1_000) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(dollars)
  }
  if (dollars >= 1) {
    return `$${dollars.toFixed(2)}`
  }
  if (dollars >= 0.01) {
    return `$${dollars.toFixed(3)}`
  }
  return formatMicroUsd(micros)
}

export function shouldCompactMicroUsd(micros: number): boolean {
  return micros / 1_000_000 >= 1_000
}

export function sumMicros(values: Array<number | null | undefined>): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
}
