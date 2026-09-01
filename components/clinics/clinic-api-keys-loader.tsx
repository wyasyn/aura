import { ClinicApiKeys } from "@/components/clinics/clinic-api-keys"
import { canManageClinic, requireClinicMember } from "@/lib/clinics/membership"
import { clinicUrl } from "@/lib/clinics/subdomain"
import { requestOrigin } from "@/lib/clinics/request-origin"
import { prisma } from "@/lib/db/client"

export async function ClinicApiKeysLoader() {
  const session = await requireClinicMember()

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: session.scope },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  })

  return (
    <ClinicApiKeys
      keys={keys}
      canManage={canManageClinic(session.role)}
      apiBaseUrl={clinicUrl(
        session.tenant.subdomain,
        "/",
        await requestOrigin(),
      ).replace(/\/$/, "")}
    />
  )
}
