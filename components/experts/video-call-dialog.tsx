"use client"

import { ResponsiveDialog } from "@/components/ui/responsive-dialog"

export function VideoCallDialog({
  roomUrl,
  open,
  onOpenChange,
}: {
  roomUrl: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Video consultation"
      className="sm:max-w-3xl"
    >
      <div className="aspect-video w-full overflow-hidden rounded-b-xl bg-black">
        {roomUrl ? (
          <iframe
            src={roomUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="h-full w-full border-0"
          />
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}
