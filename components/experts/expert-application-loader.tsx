import { ExpertApplicationForm } from "@/components/experts/expert-application-form"
import { Badge } from "@/components/ui/badge"
import { requireSession } from "@/lib/auth/session"
import { getMyExpertProfile } from "@/lib/experts/queries"
import { SPECIALTY_LABELS } from "@/lib/experts/types"

export async function ExpertApplicationLoader() {
  const session = await requireSession()
  const profile = await getMyExpertProfile(session.user.id)

  if (profile?.status === "approved") {
    return (
      <div className="space-y-2 rounded-xl border border-border/60 p-5">
        <div className="flex items-center gap-2">
          <Badge>Approved</Badge>
          <p className="font-medium">
            You're listed as a {SPECIALTY_LABELS[profile.specialty]}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your availability and bookings from the Expert dashboard.
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
        <ExpertApplicationForm
          initial={{
            specialty: profile.specialty,
            headline: profile.headline,
            bio: profile.bio,
            credentials: profile.credentials,
            yearsExperience: profile.yearsExperience,
            consultationPriceCents: profile.consultationPriceCents,
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
      <ExpertApplicationForm
        initial={
          profile
            ? {
                specialty: profile.specialty,
                headline: profile.headline,
                bio: profile.bio,
                credentials: profile.credentials,
                yearsExperience: profile.yearsExperience,
                consultationPriceCents: profile.consultationPriceCents,
              }
            : undefined
        }
      />
    </div>
  )
}
