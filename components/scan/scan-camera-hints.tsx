"use client"

import { useCallback, useEffect, useState } from "react"
import {
  IconBulb,
  IconChevronDown,
  IconCrop,
  IconSun,
  IconUpload,
  IconUser,
  IconX,
} from "@tabler/icons-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

const HINTS_VERSION = "2"
const STORAGE_KEY = "aura-scan-camera-hints-dismissed"
const PANEL_TITLE = "Tips for better scans"

type HintItem = {
  id: string
  icon: typeof IconUser
  title: string
  body: string
}

const HINTS: HintItem[] = [
  {
    id: "distance",
    icon: IconUser,
    title: "Move closer",
    body: "Fill the oval. Your face should cover 40 to 60% of the frame height.",
  },
  {
    id: "lighting",
    icon: IconSun,
    title: "Improve lighting",
    body: "Face a window or soft front light. Avoid backlight and harsh overhead glare.",
  },
  {
    id: "crop",
    icon: IconCrop,
    title: "On the crop step",
    body: "Expand the crop box so your face fills most of it, not the background.",
  },
  {
    id: "upload",
    icon: IconUpload,
    title: "Try photo upload",
    body: "A phone photo (2 to 4MP+) usually assesses better than a laptop webcam.",
  },
]

function isHintsDismissed() {
  if (typeof window === "undefined") return true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { version?: string; dismissed?: boolean }
    return parsed.version === HINTS_VERSION && parsed.dismissed === true
  } catch {
    return false
  }
}

function persistDismissed() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: HINTS_VERSION, dismissed: true }),
  )
}

type ScanCameraHintsProps = {
  /**
   * `section` docks the rail beside the capture card on xl+ screens,
   * `inline` collapses it under the card below xl, and `fullscreen` pins it
   * to the screen edge over the mobile camera.
   */
  placement?: "section" | "inline" | "fullscreen"
  className?: string
}

export function ScanCameraHints({
  placement = "section",
  className,
}: ScanCameraHintsProps) {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setVisible(!isHintsDismissed())
  }, [])

  const dismissAll = useCallback(() => {
    persistDismissed()
    setVisible(false)
  }, [])

  if (!visible) {
    return null
  }

  const stagger = (index: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, x: 20, filter: "blur(4px)" },
          animate: {
            opacity: 1,
            x: 0,
            filter: "blur(0px)",
            transition: {
              duration: 0.28,
              ease: EASE_OUT,
              delay: 0.06 + index * 0.07,
            },
          },
          exit: {
            opacity: 0,
            x: 12,
            filter: "blur(4px)",
            transition: { duration: 0.18, ease: EASE_OUT },
          },
        }

  const hintCards = HINTS.map((hint, index) => {
    const Icon = hint.icon
    return (
      <motion.div
        key={hint.id}
        layout={!reduceMotion}
        {...stagger(index)}
        className="scan-surface rounded-2xl border border-border/70 p-3 backdrop-blur-xl"
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold leading-none text-foreground">
              {hint.title}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {hint.body}
            </p>
          </div>
        </div>
      </motion.div>
    )
  })

  if (placement === "inline") {
    return (
      <div
        className={cn(
          "w-full max-w-2xl xl:hidden",
          className,
        )}
      >
        <div className="scan-surface overflow-hidden rounded-2xl border border-border/70 backdrop-blur-xl">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <IconBulb className="size-3.5" aria-hidden />
              </span>
              <span className="truncate text-xs font-semibold text-foreground">
                {PANEL_TITLE}
              </span>
              <IconChevronDown
                aria-hidden
                className={cn(
                  "ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </button>
            <button
              type="button"
              onClick={dismissAll}
              aria-label="Dismiss tips"
              className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconX className="size-3.5" />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                key="hints"
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                <div className="grid gap-2 border-t border-border/60 p-3 sm:grid-cols-2">
                  {hintCards}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <motion.aside
      initial={reduceMotion ? false : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className={cn(
        "pointer-events-none z-20 w-60",
        placement === "section" &&
          "absolute left-[calc(100%+1rem)] top-0 hidden max-h-[calc(100svh-8rem)] overflow-y-auto xl:block",
        placement === "fullscreen" &&
          "fixed right-3 top-[max(5.5rem,env(safe-area-inset-top))] xl:hidden",
        className,
      )}
      aria-label={PANEL_TITLE}
    >
      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="scan-surface flex items-center justify-between gap-2 rounded-2xl border border-border/70 px-3 py-2 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
              <IconBulb className="size-3.5" aria-hidden />
            </span>
            <p className="truncate text-xs font-semibold text-foreground">
              {PANEL_TITLE}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissAll}
            aria-label="Dismiss tips"
            className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="size-3.5" />
          </button>
        </div>

        <AnimatePresence initial={false}>{hintCards}</AnimatePresence>
      </div>
    </motion.aside>
  )
}
