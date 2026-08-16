import { PrivacyControls } from "@/components/dashboard/privacy-controls"
import { requireAuthContext } from "@/lib/auth/context"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

export async function PrivacyControlsLoader() {
  const ctx = await requireAuthContext()
  const [scans, profile] = await Promise.all([
    withDbRetry(() =>
      prisma.scan.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true },
      }),
    ),
    withDbRetry(() =>
      prisma.userProfile.findUnique({
        where: { userId: ctx.userId },
        select: { marketingConsent: true },
      }),
    ),
  ])

  return (
    <PrivacyControls
      marketingConsent={profile?.marketingConsent ?? false}
      scans={scans.map((s) => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  )
}
