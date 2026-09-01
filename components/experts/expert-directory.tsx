import Link from "next/link"

import { ExpertCard, type ExpertCardData } from "@/components/experts/expert-card"
import { cn } from "@/lib/utils"
import { EXPERT_SPECIALTIES, SPECIALTY_LABELS } from "@/lib/experts/types"
import type { ExpertSpecialty } from "@/generated/prisma/client"

export function ExpertDirectory({
  experts,
  activeSpecialty,
}: {
  experts: ExpertCardData[]
  activeSpecialty?: ExpertSpecialty
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/experts"
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm",
            !activeSpecialty
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground",
          )}
        >
          All specialties
        </Link>
        {EXPERT_SPECIALTIES.map((specialty) => (
          <Link
            key={specialty}
            href={`/experts?specialty=${specialty}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              activeSpecialty === specialty
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {SPECIALTY_LABELS[specialty]}
          </Link>
        ))}
      </div>

      {experts.length === 0 ? (
        <p className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
          No experts available in this specialty yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {experts.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </div>
      )}
    </div>
  )
}
