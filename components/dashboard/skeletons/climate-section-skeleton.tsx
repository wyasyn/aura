import { Skeleton } from "@/components/ui/skeleton"

export function ClimateSectionSkeleton() {
  return (
    <section className="rounded-xl border border-border/60 p-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-4 w-48" />
      <Skeleton className="mt-4 h-9 w-40 rounded-lg" />
    </section>
  )
}
