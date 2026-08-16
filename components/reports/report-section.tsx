import { cn } from "@/lib/utils"

type ReportSectionProps = {
  title: string
  children: React.ReactNode
  className?: string
  first?: boolean
}

export function ReportSection({
  title,
  children,
  className,
  first = false,
}: ReportSectionProps) {
  return (
    <section
      className={cn(
        "font-sans",
        first ? "pt-0" : "border-t-2 border-primary/40 pt-6",
        className,
      )}
    >
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}
