export function formatSlotLabel(startTime: Date | string, endTime: Date | string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const dateLabel = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const timeLabel = `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  return `${dateLabel}, ${timeLabel}`
}
