import type { CSSProperties } from "react"

import type { TenantBranding } from "@/lib/clinics/tenant"

/** Three- or six-digit hex, the only format the branding form accepts. */
const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim())
}

/** Normalizes to lowercase six-digit hex so stored values are comparable. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  if (!HEX_PATTERN.test(trimmed)) return null

  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return trimmed
}

/** sRGB channel to linear light, per WCAG relative-luminance. */
function toLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number | null {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null

  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Picks black or white text for a clinic's brand colour.
 *
 * Without this, a clinic choosing a pale brand colour would get white-on-pale
 * buttons, because --primary-foreground is otherwise a fixed near-white from
 * the platform theme. The 0.5 threshold is the usual midpoint for this
 * two-option choice.
 */
export function contrastingForeground(hex: string): string {
  const luminance = relativeLuminance(hex)
  if (luminance === null) return "#ffffff"
  return luminance > 0.5 ? "#111111" : "#ffffff"
}

/**
 * Brand colours as CSS custom properties, applied to a wrapper element so they
 * cascade into every Tailwind utility below it. Only colours that are actually
 * set are emitted, so a clinic that configures nothing inherits the platform
 * theme untouched, in both light and dark mode.
 */
export function brandingStyle(branding: TenantBranding): CSSProperties {
  const style: Record<string, string> = {}

  const primary = branding.primaryColor && normalizeHexColor(branding.primaryColor)
  if (primary) {
    style["--primary"] = primary
    style["--primary-foreground"] = contrastingForeground(primary)
    // Focus rings and chart accents both read from --ring, which would
    // otherwise stay the platform's terracotta on a rebranded page.
    style["--ring"] = primary
  }

  const accent = branding.accentColor && normalizeHexColor(branding.accentColor)
  if (accent) {
    style["--accent"] = accent
    style["--accent-foreground"] = contrastingForeground(accent)
  }

  return style as CSSProperties
}

export const PLATFORM_BRAND_NAME = "Aurora Organics"

/** The name to show for a scan/report: the clinic's, or Aurora's if unbranded. */
export function brandNameOrPlatform(
  branding: Pick<TenantBranding, "displayName"> | null,
): string {
  return branding?.displayName?.trim() || PLATFORM_BRAND_NAME
}
