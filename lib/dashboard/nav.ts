import type { TablerIcon } from "@tabler/icons-react"
import {
  IconBrain,
  IconChartBar,
  IconCoin,
  IconCreditCard,
  IconHome,
  IconLock,
  IconMessage,
  IconPackage,
  IconScan,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-react"

export type AppRole = "user" | "admin" | "expert" | "company_admin"

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

const ACCOUNT: NavSection = {
  title: "Account",
  items: [
    { href: "/dashboard/billing", label: "Billing", icon: IconCreditCard },
    { href: "/settings", label: "Settings", icon: IconSettings },
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
    { href: "/admin/products", label: "Products", icon: IconPackage },
    { href: "/admin/feedback", label: "Feedback", icon: IconMessage },
  ],
}

export function canSeeAdminNav(role: AppRole): boolean {
  return role === "admin"
}

export function getNavSections(role: AppRole): NavSection[] {
  const sections: NavSection[] = [OVERVIEW, YOUR_DATA, ACCOUNT]

  if (canSeeAdminNav(role)) {
    sections.push(ADMIN)
  }

  return sections
}

const EXACT_MATCH_HREFS = new Set(["/dashboard", "/admin"])

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
    default:
      return "Member"
  }
}

export const ASSIGNABLE_ROLES: AppRole[] = [
  "user",
  "admin",
  "expert",
  "company_admin",
]
