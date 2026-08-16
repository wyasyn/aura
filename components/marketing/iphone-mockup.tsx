import {
  IconAntennaBars5,
  IconBatteryFilled,
  IconWifi,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"

const RAIL_BUTTON = "device-rail absolute w-[1.4cqw]"

/**
 * iPhone 17 Pro frame for marketing screenshots.
 *
 * Every dimension is a container-query width unit, so a parent only sets a
 * width and the chassis, bezel, island and buttons scale together. The screen
 * keeps the real 1206x2622 panel aspect.
 */
export function IphoneMockup({
  children,
  time = "9:41",
  className,
}: {
  children: React.ReactNode
  time?: string
  className?: string
}) {
  return (
    <div className={cn("@container relative w-full", className)}>
      {/* Action, volume up, volume down, side, camera control. Offsets and
          lengths are scaled off the real chassis. Buttons render before the rail
          so it overlaps their inner edge. */}
      <span
        aria-hidden
        className={cn(
          RAIL_BUTTON,
          "top-[40cqw] -left-[1cqw] h-[9cqw] rounded-l-[0.7cqw]"
        )}
      />
      <span
        aria-hidden
        className={cn(
          RAIL_BUTTON,
          "top-[55cqw] -left-[1cqw] h-[17cqw] rounded-l-[0.7cqw]"
        )}
      />
      <span
        aria-hidden
        className={cn(
          RAIL_BUTTON,
          "top-[76cqw] -left-[1cqw] h-[17cqw] rounded-l-[0.7cqw]"
        )}
      />
      <span
        aria-hidden
        className={cn(
          RAIL_BUTTON,
          "top-[56cqw] -right-[1cqw] h-[27cqw] rounded-r-[0.7cqw]"
        )}
      />
      <span
        aria-hidden
        className={cn(
          RAIL_BUTTON,
          "top-[90cqw] -right-[1cqw] h-[17cqw] rounded-r-[0.7cqw]"
        )}
      />

      <div className="device-rail relative rounded-[14cqw] p-[1.1cqw] shadow-2xl">
        <div className="device-bezel rounded-[13cqw] p-[2.2cqw]">
          <div className="relative aspect-[1206/2622] overflow-hidden rounded-[10.8cqw] bg-background">
            {children}

            <div className="absolute inset-x-0 top-[2.6cqw] flex h-[8.8cqw] items-center justify-between px-[7cqw]">
              <span className="text-[3.6cqw] font-semibold text-foreground tabular-nums">
                {time}
              </span>
              <span className="flex items-center gap-[1.4cqw] text-foreground">
                <IconAntennaBars5 className="size-[4.4cqw]" aria-hidden />
                <IconWifi className="size-[4.2cqw]" aria-hidden />
                <IconBatteryFilled className="size-[4.6cqw]" aria-hidden />
              </span>
            </div>

            <div
              className="device-bezel absolute top-[2.6cqw] left-1/2 h-[8.8cqw] w-[29cqw] -translate-x-1/2 rounded-full"
              aria-hidden
            />

            <div
              className="absolute bottom-[1.8cqw] left-1/2 h-[1.1cqw] w-[30cqw] -translate-x-1/2 rounded-full bg-foreground/40"
              aria-hidden
            />

            <div
              className="device-glare pointer-events-none absolute inset-0"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  )
}
