import {
  BillingDetailsForm,
  type BillingDetailsValues,
} from "@/components/billing/billing-details-form"
import { requireAuthContext } from "@/lib/auth/context"
import { getBillingProfile } from "@/lib/billing/queries"

export async function BillingDetailsSection() {
  const ctx = await requireAuthContext()
  const profile = await getBillingProfile(ctx.userId)

  const initialValues: BillingDetailsValues = {
    fullName: profile?.fullName ?? ctx.user.name ?? "",
    email: profile?.email ?? ctx.user.email ?? "",
    phone: profile?.phone ?? "",
    addressLine1: profile?.addressLine1 ?? "",
    addressLine2: profile?.addressLine2 ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    postalCode: profile?.postalCode ?? "",
    country: profile?.country ?? "",
    taxId: profile?.taxId ?? "",
  }

  return (
    <section className="surface-panel rounded-xl border border-border/60 p-5">
      <h2 className="font-heading text-sm font-medium">Billing details</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Used on checkout and frozen onto each receipt at the time of purchase.
      </p>
      <div className="mt-5">
        <BillingDetailsForm initialValues={initialValues} />
      </div>
    </section>
  )
}
