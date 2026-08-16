"use client"

import { IconCamera, IconChevronDown, IconLoader2 } from "@tabler/icons-react"

import { AnimatedBadge } from "@/components/motion/animated-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { VideoDeviceOption } from "@/lib/scan/camera-devices"
import { cn } from "@/lib/utils"

type ScanCameraPickerProps = {
  devices: VideoDeviceOption[]
  activeDeviceId: string | null
  activeLabel: string | null
  onSelect: (deviceId: string) => void
  disabled?: boolean
  switching?: boolean
  variant?: "header" | "badge"
  className?: string
}

export function ScanCameraPicker({
  devices,
  activeDeviceId,
  activeLabel,
  onSelect,
  disabled = false,
  switching = false,
  variant = "header",
  className,
}: ScanCameraPickerProps) {
  const label = activeLabel ?? "Camera"
  const isBusy = disabled || switching

  if (devices.length <= 1) {
    if (variant !== "badge" || !activeLabel) {
      return null
    }

    return (
      <AnimatedBadge status="neutral" size="sm" icon={<IconCamera className="size-3" />}>
        <span className="max-w-[9rem] truncate">{label}</span>
      </AnimatedBadge>
    )
  }

  if (variant === "badge") {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isBusy}
          aria-label="Select camera"
          className={cn(
            "pointer-events-auto inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-background active:scale-95 disabled:opacity-50",
            className,
          )}
        >
          {switching ? (
            <IconLoader2 className="size-3.5 shrink-0 animate-spin" />
          ) : (
            <IconCamera className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{label}</span>
          <IconChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(90vw,18rem)]">
        <DropdownMenuRadioGroup
          value={activeDeviceId ?? undefined}
          onValueChange={(value) => {
            if (value && value !== activeDeviceId) {
              onSelect(value)
            }
          }}
        >
          {devices.map((device) => (
            <DropdownMenuRadioItem
              key={device.deviceId}
              value={device.deviceId}
              className="truncate"
            >
              {device.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
