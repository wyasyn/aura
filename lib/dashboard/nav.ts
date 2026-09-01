import type { TablerIcon } from "@tabler/icons-react"
import {
  IconBrain,
  IconBuildingHospital,
  IconCalendarEvent,
  IconCalendarTime,
  IconChartBar,
  IconCoin,
  IconCreditCard,
  IconGift,
  IconHistory,
  IconHome,
  IconLock,
  IconMessage,
  IconPackage,
  IconTargetArrow,
  IconPalette,
  IconPlug,
  IconScan,
  IconSettings,
  IconShieldCheck,
  IconStethoscope,
  IconTag,
  IconUser,
  IconUserCheck,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react"

export type AppRole = "user" | "admin" | "expert" | "company_admin" | "affiliate"

export type NavItem = {
  href: string
  label: string
  icon: TablerIcon
  badge?: string
}

export type NavSection = {
  title: string
  items: NavItem[]
}

const OVERVIEW: NavSection = {
  title: "Overview",
  items: [
    { href: "/dashboard", label: "Home", icon: IconHome },
    { href: "/dashboard/usage", label: "Usage", icon: IconChartBar },
  ],
}

const YOUR_DATA: NavSection = {
  title: "Your data",
  items: [
    { href: "/dashboard/profile", label: "Profile", icon: IconUser },
    { href: "/reports", label: "Scans", icon: IconScan },
    { href: "/chats", label: "Skin advice", icon: IconMessage },
    { href: "/dashboard/privacy", label: "Privacy", icon: IconLock },
  ],
}

const MARKETPLACE: NavSection = {
  title: "Experts",
  items: [
    { href: "/experts", label: "Talk to an expert", icon: IconStethoscope },
    { href: "/dashboard/appointments", label: "My appointments", icon: IconCalendarEvent },
  ],
}

const ACCOUNT: NavSection = {
  title: "Account",
  items: [
    { href: "/dashboard/billing", label: "Billing", icon: IconCreditCard },
    { href: "/dashboard/expert-application", label: "Become an expert", icon: IconUserCheck },
    { href: "/dashboard/affiliate-application", label: "Become an affiliate", icon: IconGift },
    { href: "/settings", label: "Settings", icon: IconSettings },
  ],
}

const EXPERT: NavSection = {
  title: "Expert",
  items: [
    { href: "/expert", label: "Bookings", icon: IconCalendarEvent },
    { href: "/expert/availability", label: "Availability", icon: IconCalendarTime },
    { href: "/expert/validation", label: "Validate", icon: IconShieldCheck },
  ],
}

const AFFILIATE: NavSection = {
  title: "Affiliate",
  items: [
    { href: "/affiliate", label: "Overview", icon: IconGift },
    { href: "/affiliate/products", label: "Products & links", icon: IconPackage },
    { href: "/affiliate/earnings", label: "Earnings", icon: IconCoin },
  ],
}

// Only ever reachable on a clinic's own subdomain; the routes themselves 404
// on the platform host, where there is no tenant to resolve.
const CLINIC: NavSection = {
  title: "Clinic",
  items: [
    { href: "/clinic", label: "Patients", icon: IconUsers },
    { href: "/clinic/analytics", label: "Analytics", icon: IconChartBar },
    { href: "/clinic/team", label: "Team", icon: IconUserCheck },
    { href: "/clinic/products", label: "Products", icon: IconPackage },
    { href: "/clinic/recommendations", label: "Recommendations", icon: IconTargetArrow },
    { href: "/clinic/branding", label: "Branding", icon: IconPalette },
    { href: "/clinic/domain", label: "Domain", icon: IconWorld },
    { href: "/clinic/data", label: "Data sharing", icon: IconShieldCheck },
    { href: "/clinic/billing", label: "Billing", icon: IconCreditCard },
    { href: "/clinic/api", label: "API", icon: IconPlug },
  ],
}

const ADMIN: NavSection = {
  title: "Administration",
  items: [
    { href: "/admin", label: "Analytics", icon: IconChartBar },
    { href: "/admin/usage", label: "Usage", icon: IconChartBar },
    { href: "/admin/users", label: "Users", icon: IconUsers },
    { href: "/admin/tokens", label: "Allowances", icon: IconCoin },
    { href: "/admin/models", label: "Models", icon: IconBrain },
    { href: "/admin/scan-packs", label: "Scan packs", icon: IconTag },
    { href: "/admin/products", label: "Products", icon: IconPackage },
    { href: "/admin/recommendations", label: "Recommendations", icon: IconTargetArrow },
    { href: "/admin/experts", label: "Expert applications", icon: IconStethoscope },
    { href: "/admin/affiliates", label: "Affiliates", icon: IconGift },
    { href: "/admin/clinics", label: "Clinics", icon: IconBuildingHospital },
    { href: "/admin/training", label: "Training data", icon: IconShieldCheck },
    { href: "/admin/audit", label: "Audit log", icon: IconHistory },
    { href: "/admin/feedback", label: "Feedback", icon: IconMessage },
  ],
}

// ─── workspaces ─────────────────────────────────────────────────────────────

/**
 * A workspace is a persona, not a permission.
 *
 * Switching changes what the navigation shows and where "home" is. It grants
 * nothing: every route and every server action keeps its own guard, so a user
 * who somehow selected a workspace they are not entitled to would still be
 * refused at each door. The list below is derived from the caller's real role
 * on the server, so an unavailable workspace never reaches the browser either.
 */
export type WorkspaceId =
  | "personal"
  | "expert"
  | "clinic"
  | "affiliate"
  | "admin"
  | "ai_ops"

export type Workspace = {
  id: WorkspaceId
  label: string
  description: string
  icon: TablerIcon
  home: string
  sections: NavSection[]
}

const AI_OPS: NavSection = {
  title: "AI operations",
  items: [
    { href: "/admin/training", label: "Training data", icon: IconShieldCheck },
    { href: "/admin/models", label: "Models", icon: IconBrain },
    { href: "/admin/usage", label: "Model usage", icon: IconChartBar },
  ],
}

const WORKSPACES: Record<WorkspaceId, Workspace> = {
  personal: {
    id: "personal",
    label: "My account",
    description: "Your own scans, reports and appointments",
    icon: IconUser,
    home: "/dashboard",
    sections: [OVERVIEW, YOUR_DATA, MARKETPLACE, ACCOUNT],
  },
  expert: {
    id: "expert",
    label: "Expert",
    description: "Consultations, availability and assessment review",
    icon: IconStethoscope,
    home: "/expert",
    sections: [EXPERT],
  },
  clinic: {
    id: "clinic",
    label: "Clinic",
    description: "Your clinic's patients, branding and billing",
    icon: IconBuildingHospital,
    home: "/clinic",
    sections: [CLINIC],
  },
  affiliate: {
    id: "affiliate",
    label: "Affiliate",
    description: "Your referral code and earnings",
    icon: IconGift,
    home: "/affiliate",
    sections: [AFFILIATE],
  },
  admin: {
    id: "admin",
    label: "Administration",
    description: "Users, tenants, catalogue and platform operations",
    icon: IconSettings,
    home: "/admin",
    sections: [ADMIN],
  },
  ai_ops: {
    id: "ai_ops",
    label: "AI operations",
    description: "Training data, models and spend",
    icon: IconBrain,
    home: "/admin/training",
    sections: [AI_OPS],
  },
}

/**
 * What a person can do, resolved from their profiles and memberships rather
 * than from the single role field. Plain booleans, so this crosses the
 * server-to-client boundary safely.
 */
export type WorkspaceCapabilities = {
  isAdmin: boolean
  isExpert: boolean
  isAffiliate: boolean
  isClinicMember: boolean
}

/**
 * Which workspaces this person may use.
 *
 * Everyone has a personal one. The rest follow capabilities, not the role
 * string: someone can be an administrator and a consulting dermatologist at
 * once, and keying off role alone gave them only whichever the field happened
 * to hold. The switcher still offers nothing the backend would refuse — each
 * capability is proven at its source before it appears here.
 */
export function availableWorkspaces(
  capabilities: WorkspaceCapabilities,
): Workspace[] {
  const list: Workspace[] = [WORKSPACES.personal]

  if (capabilities.isExpert) list.push(WORKSPACES.expert)
  if (capabilities.isClinicMember) list.push(WORKSPACES.clinic)
  if (capabilities.isAffiliate) list.push(WORKSPACES.affiliate)
  if (capabilities.isAdmin) {
    list.push(WORKSPACES.admin, WORKSPACES.ai_ops)
  }

  return list
}

/**
 * Resolves a stored preference against what the caller may actually use, so a
 * stale or tampered cookie falls back rather than showing an empty sidebar.
 */
export function resolveWorkspace(
  capabilities: WorkspaceCapabilities,
  requested: string | null | undefined,
): Workspace {
  const available = availableWorkspaces(capabilities)
  return (
    available.find((workspace) => workspace.id === requested) ?? available[0]
  )
}

/** The workspace a path belongs to, used to follow a deep link into the right view. */
export function workspaceForPath(
  capabilities: WorkspaceCapabilities,
  pathname: string,
): Workspace | null {
  const available = availableWorkspaces(capabilities)

  // Most specific match wins, so /admin/training resolves to AI operations
  // rather than to Administration.
  let best: { workspace: Workspace; length: number } | null = null

  for (const workspace of available) {
    for (const item of workspace.sections.flatMap((section) => section.items)) {
      const matches = pathname === item.href || pathname.startsWith(`${item.href}/`)
      if (matches && (!best || item.href.length > best.length)) {
        best = { workspace, length: item.href.length }
      }
    }
  }

  return best?.workspace ?? null
}

/**
 * The workspace whose navigation should be shown, given what the caller holds,
 * what they last selected, and where they are.
 *
 * The stored preference is kept whenever it actually contains the current path,
 * and the path decides only when it does not.
 *
 * Neither half alone is correct. Preference-always-wins is what shipped first,
 * and it hid the entire administration menu: `resolveWorkspace` falls back to
 * the first available workspace, `personal` is always first, so an
 * administrator with no stored preference — a fresh browser, cleared cookies —
 * got the personal sidebar on /admin while the page itself rendered fine.
 * Path-always-wins fails the other way: /admin/models and /admin/training
 * belong to both Administration and AI operations, so it would tip an
 * AI-operations user back into Administration on their own pages.
 */
export function resolveActiveWorkspace(
  capabilities: WorkspaceCapabilities,
  storedId: string | null | undefined,
  pathname: string,
): Workspace {
  const stored = resolveWorkspace(capabilities, storedId)

  const storedHoldsPath = stored.sections
    .flatMap((section) => section.items)
    .some((item) => isNavItemActive(pathname, item.href))

  if (storedHoldsPath) return stored

  return workspaceForPath(capabilities, pathname) ?? stored
}

export function canSeeAdminNav(role: AppRole): boolean {
  return role === "admin"
}

export function getNavSections(role: AppRole): NavSection[] {
  const sections: NavSection[] = [OVERVIEW, YOUR_DATA, MARKETPLACE, ACCOUNT]

  if (role === "expert") {
    sections.push(EXPERT)
  }

  if (role === "affiliate") {
    sections.push(AFFILIATE)
  }

  if (role === "company_admin") {
    sections.push(CLINIC)
  }

  if (canSeeAdminNav(role)) {
    sections.push(ADMIN)
  }

  return sections
}

const EXACT_MATCH_HREFS = new Set([
  "/dashboard",
  "/admin",
  "/expert",
  "/affiliate",
  "/clinic",
])

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true
  }

  if (EXACT_MATCH_HREFS.has(href)) {
    return false
  }

  return pathname.startsWith(`${href}/`)
}

/**
 * Searches every workspace the person holds, not just the active one, so the
 * mobile header still names the page after following a link that crossed into
 * another workspace.
 */
export function getActiveNavItem(
  pathname: string,
  capabilities: WorkspaceCapabilities,
): NavItem | null {
  const items = availableWorkspaces(capabilities)
    .flatMap((workspace) => workspace.sections)
    .flatMap((section) => section.items)

  return items.find((item) => isNavItemActive(pathname, item.href)) ?? null
}

export function getRoleLabel(role: AppRole): string {
  switch (role) {
    case "admin":
      return "Platform admin"
    case "expert":
      return "Expert"
    case "company_admin":
      return "Company admin"
    case "affiliate":
      return "Affiliate"
    default:
      return "Member"
  }
}

export const ASSIGNABLE_ROLES: AppRole[] = [
  "user",
  "admin",
  "expert",
  "company_admin",
  "affiliate",
]
