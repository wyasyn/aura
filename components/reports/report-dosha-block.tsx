import { formatDoshaLabel } from "@/lib/scan/dosha"
import type { DoshaTyping } from "@/lib/scan/types"

type ReportDoshaBlockProps = {
  doshaTyping: DoshaTyping
}

export function ReportDoshaBlock({ doshaTyping }: ReportDoshaBlockProps) {
  const secondary =
    doshaTyping.secondary && doshaTyping.secondary !== doshaTyping.primary
      ? formatDoshaLabel(doshaTyping.secondary)
      : null

  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium text-foreground">
        Primary lean: {formatDoshaLabel(doshaTyping.primary)}
        {secondary ? ` · Secondary: ${secondary}` : null}
      </p>
      {doshaTyping.note ? (
        <p className="leading-relaxed text-muted-foreground">{doshaTyping.note}</p>
      ) : null}
    </div>
  )
}
