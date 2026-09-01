import { ClinicBrandingForm } from "@/components/clinics/clinic-branding-form"
import { canManageClinic, requireClinicMember } from "@/lib/clinics/membership"

export async function ClinicBrandingLoader() {
  const session = await requireClinicMember()
  const { branding } = session.tenant

  return (
    <ClinicBrandingForm
      canEdit={canManageClinic(session.role)}
      initial={{
        displayName: branding.displayName,
        logoUrl: branding.logoUrl ?? "",
        primaryColor: branding.primaryColor ?? "",
        accentColor: branding.accentColor ?? "",
        supportEmail: branding.supportEmail ?? "",
      }}
    />
  )
}
