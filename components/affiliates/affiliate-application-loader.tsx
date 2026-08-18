import { AffiliateApplicationForm } from "@/components/affiliates/affiliate-application-form"
import { Badge } from "@/components/ui/badge"
import { requireSession } from "@/lib/auth/session"
import { getMyAffiliateProfile } from "@/lib/affiliates/queries"

export async function AffiliateApplicationLoader() {
  const session = await requireSession()
  const profile = await getMyAffiliateProfile(session.user.id)

  if (profile?.status === "approved") {
    return (
      <div className="space-y-2 rounded-xl border border-border/60 p-5">
        <div className="flex items-center gap-2">
          <Badge>Approved</Badge>
          <p className="font-medium">You're an Aurora Organics affiliate</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Find your referral code and earnings on the Affiliate dashboard.
        </p>
      </div>
    )
  }

  if (profile?.status === "pending") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-border/60 p-5">
          <Badge variant="secondary">Pending review</Badge>
          <p className="text-sm text-muted-foreground">
            Your application is with our team. You can update it below while
            it's pending.
          </p>
        </div>
        <AffiliateApplicationForm
          initial={{
            howTheyPromote: profile.howTheyPromote,
            website: profile.website ?? undefined,
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {profile?.status === "rejected" ? (
        <div className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <Badge variant="destructive">Not approved</Badge>
          {profile.rejectionReason ? (
            <p className="text-sm text-muted-foreground">
              {profile.rejectionReason}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            You can update your application below and resubmit.
          </p>
        </div>
      ) : null}
      <AffiliateApplicationForm
        initial={
          profile
            ? {
                howTheyPromote: profile.howTheyPromote,
                website: profile.website ?? undefined,
              }
            : undefined
        }
      />
    </div>
  )
}
