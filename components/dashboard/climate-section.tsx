import { Button } from "@/components/ui/button"
import { requireAuthContext } from "@/lib/auth/context"
import { syncUserClimateAction } from "@/lib/onboarding/actions"
import { prisma } from "@/lib/db/client"

export async function ClimateSection() {
  const ctx = await requireAuthContext()
  const location = await prisma.userLocation.findUnique({
    where: { userId: ctx.userId },
  })

  async function syncClimate() {
    "use server"
    await syncUserClimateAction()
  }

  return (
    <section className="rounded-xl border border-border/60 p-5">
      <h2 className="font-heading text-sm font-medium">Climate cache</h2>
      {location?.city ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {location.city}, {location.region} — {location.climateZone ?? "unknown"}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No location on file.</p>
      )}
      <form action={syncClimate} className="mt-4">
        <Button type="submit" variant="secondary">
          Refresh climate bands
        </Button>
      </form>
    </section>
  )
}
