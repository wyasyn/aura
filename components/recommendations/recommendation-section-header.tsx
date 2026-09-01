import { cn } from "@/lib/utils"

type RecommendationSectionHeaderProps = {
  title: string
  /** Omitted in chat, where the surrounding report already prints it. */
  description?: string
  className?: string
}

export function RecommendationSectionHeader({
  title,
  description,
  className,
}: RecommendationSectionHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-foreground">{title}</p>
      {description ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}
