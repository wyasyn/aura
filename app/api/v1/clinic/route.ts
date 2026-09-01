import { NextResponse } from "next/server"

import { withPartnerApi } from "@/lib/api-keys/handler"
import { prisma } from "@/lib/db/client"
import { resolveScanQuota } from "@/lib/clinics/subscription"

/** GET /api/v1/clinic — the calling clinic's profile and current usage. */
export const GET = withPartnerApi(async (caller) => {
  const clinic = await prisma.clinicSettings.findUniqueOrThrow({
    where: { organizationId: caller.organizationId },
    include: {
      plan: { select: { name: true, seatLimit: true, monthlyScanQuota: true } },
    },
  })

  const quota = resolveScanQuota({
    periodScanCount: clinic.periodScanCount,
    plan: clinic.plan,
  })

  return NextResponse.json({
    clinic: {
      name: clinic.displayName,
      subdomain: clinic.subdomain,
      supportEmail: clinic.supportEmail,
    },
    plan: clinic.plan
      ? { name: clinic.plan.name, seatLimit: clinic.plan.seatLimit }
      : null,
    usage: {
      scansThisPeriod: quota.used,
      scanLimit: quota.limit,
      scansRemaining: quota.remaining,
      periodEndsAt: clinic.currentPeriodEnd?.toISOString() ?? null,
    },
  })
})
