import { ProfileEditor } from "@/components/dashboard/profile-editor"
import { requireAuthContext } from "@/lib/auth/context"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

export async function ProfileEditorLoader() {
  const ctx = await requireAuthContext()
  const [profile, location] = await withDbRetry(() =>
    Promise.all([
      prisma.userProfile.findUnique({ where: { userId: ctx.userId } }),
      prisma.userLocation.findUnique({ where: { userId: ctx.userId } }),
    ]),
  )

  const lifestyle = (profile?.lifestyleFactors ?? {}) as Record<string, string>
  const routine = (profile?.currentRoutine ?? {}) as Record<string, string>

  return (
    <ProfileEditor
      profile={{
        name: ctx.user.name,
        dateOfBirth: profile?.dateOfBirth?.toISOString().slice(0, 10) ?? "",
        biologicalSex: profile?.biologicalSex ?? "",
        skinType: profile?.skinType ?? "",
        fitzpatrickBand: profile?.fitzpatrickBand ?? "",
        skinDosha: profile?.skinDosha ?? "",
        primaryConcerns: profile?.primaryConcerns ?? [],
        skinGoals: profile?.skinGoals ?? [],
        allergies: profile?.allergies ?? "",
        routineAm: routine.am ?? "",
        routinePm: routine.pm ?? "",
        sunExposure: lifestyle.sunExposure ?? "moderate",
        smoking: lifestyle.smoking ?? "never",
        sleepHours: lifestyle.sleepHours ?? "7_to_8",
        waterIntake: lifestyle.waterIntake ?? "moderate",
        city: location?.city ?? "",
        region: location?.region ?? "",
        country: location?.country ?? "",
      }}
    />
  )
}
