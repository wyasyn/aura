// User-facing ledger copy: never surface token counts, costs, or model ids here,
// those stay in the admin usage views.
const REASON_LABELS: Record<string, string> = {
  scan_debit: "Scan",
  chat_token_debit: "Skin advice chat",
  signup_bonus: "Free Starter scans",
  admin_grant: "Admin grant",
  pack_grant: "Scan pack",
  tier_upgrade: "Tier upgrade",
  adjustment: "Adjustment",
}

function humanizeReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, " ")
}

export function getLedgerShortLabel(reason: string): string {
  return humanizeReason(reason)
}

export function getLedgerDetail(reason: string): string | null {
  return reason === "chat_token_debit" ? "1 message" : null
}

export function getLedgerFullLabel(reason: string): string {
  const detail = getLedgerDetail(reason)
  const short = getLedgerShortLabel(reason)
  return detail ? `${short} · ${detail}` : short
}
