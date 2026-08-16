import { Badge } from "@/components/ui/badge"

export { StatCard, type StatTrend } from "@/components/dashboard/stat-card"

export function DashboardPageHeader({
  title,
  description,
  badge,
}: {
  title: string
  description?: string
  badge?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">{title}</h1>
        {badge ? (
          <Badge variant="secondary" className="font-normal">
            {badge}
          </Badge>
        ) : null}
      </div>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
