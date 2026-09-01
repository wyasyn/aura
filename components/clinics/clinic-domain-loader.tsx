import { ClinicDomain } from "@/components/clinics/clinic-domain"
import { canManageClinic, requireClinicMember } from "@/lib/clinics/membership"
import { clinicUrl } from "@/lib/clinics/subdomain"
import { requestOrigin } from "@/lib/clinics/request-origin"
import { prisma } from "@/lib/db/client"

export async function ClinicDomainLoader() {
  const session = await requireClinicMember()

  const clinic = await prisma.clinicSettings.findUniqueOrThrow({
    where: { id: session.tenant.clinicId },
    select: {
      customDomain: true,
      customDomainToken: true,
      customDomainVerifiedAt: true,
    },
  })

  return (
    <ClinicDomain
      canManage={canManageClinic(session.role)}
      state={{
        domain: clinic.customDomain,
        token: clinic.customDomainToken,
        verifiedAt: clinic.customDomainVerifiedAt,
        subdomainUrl: clinicUrl(
          session.tenant.subdomain,
          "/",
          await requestOrigin(),
        ).replace(/\/$/, ""),
      }}
    />
  )
}
