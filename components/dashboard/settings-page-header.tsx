import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { requireAuthContext } from "@/lib/auth/context"
import { getRoleLabel } from "@/lib/dashboard/nav"

export async function SettingsPageHeader() {
  const ctx = await requireAuthContext()

  return (
    <DashboardPageHeader
      title="Settings"
      description="Account preferences and session."
      badge={getRoleLabel(ctx.role)}
    />
  )
}
