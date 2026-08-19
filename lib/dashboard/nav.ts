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
  IconHome,
  IconLock,
  IconMessage,
  IconPackage,
  IconPalette,
  IconPlug,
  IconScan,
  IconSettings,
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
  ],
}

const AFFILIATE: NavSection = {
  title: "Affiliate",
  items: [{ href: "/affiliate", label: "Dashboard", icon: IconGift }],
}

// Only ever reachable on a clinic's own subdomain; the routes themselves 404
// on the platform host, where there is no tenant to resolve.
const CLINIC: NavSection = {
  title: "Clinic",
  items: [
    { href: "/clinic", label: "Patients", icon: IconUsers },
    { href: "/clinic/analytics", label: "Analytics", icon: IconChartBar },
    { href: "/clinic/team", label: "Team", icon: IconUserCheck },
    { href: "/clinic/branding", label: "Branding", icon: IconPalette },
    { href: "/clinic/domain", label: "Domain", icon: IconWorld },
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
    { href: "/admin/experts", label: "Expert applications", icon: IconStethoscope },
    { href: "/admin/affiliates", label: "Affiliates", icon: IconGift },
    { href: "/admin/clinics", label: "Clinics", icon: IconBuildingHospital },
    { href: "/admin/feedback", label: "Feedback", icon: IconMessage },
  ],
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

export function getActiveNavItem(
  pathname: string,
  role: AppRole,
): NavItem | null {
  const items = getNavSections(role).flatMap((section) => section.items)
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
