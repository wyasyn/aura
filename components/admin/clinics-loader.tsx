import { requireAdmin } from "@/lib/auth/session"
import { ClinicsTable } from "@/components/admin/clinics-table"
import { listClinicPlans, listClinics } from "@/lib/admin/clinic-queries"
import { clinicUrl } from "@/lib/clinics/subdomain"
import { requestOrigin } from "@/lib/clinics/request-origin"

export async function ClinicsLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const [clinics, plans, origin] = await Promise.all([
    listClinics(),
    listClinicPlans(),
    requestOrigin(),
  ])

  return (
    <ClinicsTable
      // Built here rather than in the table, which is a client component and
      // so cannot read the request host or any server-only configuration.
      clinics={clinics.map((clinic) => ({
        ...clinic,
        url: clinicUrl(clinic.subdomain, "/", origin),
      }))}
      plans={plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        priceCents: plan.priceCents,
        interval: plan.interval,
      }))}
    />
  )
}
