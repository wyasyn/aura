"use client"

import { IconCheck, IconPaperclip, IconX } from "@tabler/icons-react"

import { BloomGlow } from "@/components/chat/bloom-glow"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const BAR_COUNT = 48

type VoiceRecordingBarProps = {
  levels: number[]
  elapsedMs: number
  processing?: boolean
  disabled?: boolean
  onAttach?: () => void
  onCancel: () => void
  onConfirm: () => void
  className?: string
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function VoiceRecordingBar({
  levels,
  elapsedMs,
  processing = false,
  disabled = false,
  onAttach,
  onCancel,
  onConfirm,
  className,
}: VoiceRecordingBarProps) {
  const bars = levels.length > 0 ? levels : new Array(BAR_COUNT).fill(0)

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border bg-muted/20 px-2 py-2",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-full text-muted-foreground"
        disabled={disabled || processing}
        onClick={onAttach}
        aria-label="Attach image"
      >
        <IconPaperclip className="size-4" />
      </Button>

      <div
        className="flex min-w-0 flex-1 items-center justify-center gap-[3px] px-1"
        aria-hidden="true"
      >
        {bars.map((level, index) => {
          const active = level >= 0.08
          const height = active ? Math.max(6, Math.round(level * 22)) : 4

          return (
            <span
              key={index}
              className={cn(
                "w-[3px] shrink-0 rounded-full transition-[height,opacity] duration-75",
                active
                  ? "bg-foreground/85"
                  : "bg-muted-foreground/35",
              )}
              style={{ height }}
            />
          )
        })}
      </div>

      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
        {formatElapsed(elapsedMs)}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-full text-muted-foreground"
        disabled={disabled || processing}
        onClick={onCancel}
        aria-label="Cancel voice input"
      >
        <IconX className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-full text-muted-foreground"
        disabled={disabled || processing}
        onClick={onConfirm}
        aria-label={
          processing ? "Transcribing voice input" : "Finish voice input"
        }
      >
        {processing ? (
          <span className="inline-flex size-4 items-center justify-center overflow-hidden">
            <BloomGlow size={16} dotSize={2} />
          </span>
        ) : (
          <IconCheck className="size-4" />
        )}
      </Button>
    </div>
  )
}
