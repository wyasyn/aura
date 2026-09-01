import Link from "next/link"
import { IconBuildingHospital } from "@tabler/icons-react"

import { belongsToTenant, getAffiliationByUserId } from "@/lib/clinics/access-gate"
import { resolveTenant } from "@/lib/clinics/tenant"
import { isPinnedTenancy } from "@/lib/clinics/tenant-mode"

/**
 * Says which clinic's site the dashboard is currently being used on.
 *
 * White-label branding alone does not answer that question. It swaps Aurora's
 * name and logo for the clinic's, which reads as "this is the clinic's product"
 * rather than "you are working inside this clinic" — and those differ for
 * anyone who is not one of the clinic's own people.
 *
 * It matters most for platform administrators, who are allowed onto every
 * tenant by lib/clinics/access-gate.ts. Records they create here are attributed
 * to the clinic, not to Aurora: a scan carries both the user who took it and
 * the organization it was taken on (lib/scan/persist-scan-result.ts). That is what keeps
 * an administrator's actions auditable, and it should not be a surprise.
 */
export async function TenantBanner({ userId }: { userId: string }) {
  const result = await resolveTenant()
  if (result.kind !== "tenant") return null

  const { displayName, organizationId } = {
    displayName: result.tenant.branding.displayName,
    organizationId: result.tenant.organizationId,
  }

  const affiliation = await getAffiliationByUserId(userId)
  const belongsHere = affiliation
    ? belongsToTenant(affiliation, organizationId)
    : false

  // The pin is the only tenant selection a person can undo from inside the app.
  // On a real subdomain you leave by going to another host, so offering an
  // "exit" that cannot work would be worse than offering none.
  const canLeave = await isPinnedTenancy()

  return (
    <div
      className={
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-6 py-2 text-sm " +
        (belongsHere
          ? "border-border bg-muted text-muted-foreground"
          : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200")
      }
    >
      <span className="flex items-center gap-2">
        <IconBuildingHospital className="size-4 shrink-0" aria-hidden />
        {belongsHere ? (
          <span>
            You are on <strong className="font-medium">{displayName}</strong>&apos;s
            site.
          </span>
        ) : (
          <span>
            You are working inside{" "}
            <strong className="font-medium">{displayName}</strong>. Scans and
            records created here are attributed to {displayName}.
          </span>
        )}
      </span>

      {canLeave ? (
        <Link
          href="/c/exit"
          className="shrink-0 underline underline-offset-4 hover:no-underline"
        >
          Leave {displayName}
        </Link>
      ) : null}
    </div>
  )
}
