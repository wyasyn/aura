"use client"

import type { ReactNode } from "react"
import {
  IconLock,
  IconMessageCircle,
  IconMicrophone,
  IconPhotoOff,
} from "@tabler/icons-react"
import { motion, useReducedMotion } from "motion/react"

import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

function VisualShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-muted/35 relative overflow-hidden rounded-xl border border-border",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,var(--primary)_0%,transparent_62%)] opacity-[0.06]"
        aria-hidden
      />
      {children}
    </div>
  )
}

/** Honest bands — three band chips settle into place. */
export function BandsVisual() {
  const reduceMotion = useReducedMotion()
  const bands = [
    { label: "Hydration", value: "Balanced" },
    { label: "Tone", value: "Even" },
    { label: "Texture", value: "Smooth" },
  ] as const

  return (
    <VisualShell className="aspect-[16/10]">
      <div className="flex size-full flex-col justify-center gap-2 p-4">
        {bands.map((band, i) => (
          <motion.div
            key={band.label}
            className="bg-background flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 shadow-sm"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: reduceMotion ? 0 : 0.1 + i * 0.12,
              duration: 0.4,
              ease: EASE_OUT,
            }}
          >
            <span className="text-muted-foreground text-[11px]">{band.label}</span>
            <span className="bg-primary/12 text-primary rounded-md px-1.5 py-0.5 text-[11px] font-medium">
              {band.value}
            </span>
          </motion.div>
        ))}
      </div>
    </VisualShell>
  )
}

/** Ayurvedic lean — three soft markers, one highlighted. */
export function LeanVisual() {
  const reduceMotion = useReducedMotion()
  const doshas = [
    { label: "Vata", active: false },
    { label: "Pitta", active: true },
    { label: "Kapha", active: false },
  ] as const

  return (
    <VisualShell className="aspect-[16/10]">
      <div className="flex size-full flex-col items-center justify-center gap-3 p-4">
        <div className="flex w-full items-end justify-center gap-2.5">
          {doshas.map((d, i) => (
            <motion.div
              key={d.label}
              className="flex flex-1 flex-col items-center gap-1.5"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: reduceMotion ? 0 : 0.1 + i * 0.12,
                duration: 0.4,
                ease: EASE_OUT,
              }}
            >
              <motion.div
                className={cn(
                  "w-full rounded-lg",
                  d.active ? "bg-primary/70 h-14" : "bg-muted h-8",
                )}
                animate={
                  d.active && !reduceMotion
                    ? { opacity: [0.7, 1, 0.7] }
                    : undefined
                }
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <span
                className={cn(
                  "text-[11px]",
                  d.active
                    ? "text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                {d.label}
              </span>
            </motion.div>
          ))}
        </div>
        <motion.span
          className="bg-primary/12 text-primary rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.4, ease: EASE_OUT }}
        >
          Pitta lean
        </motion.span>
      </div>
    </VisualShell>
  )
}

/** Allergy filter — unsafe ingredient struck, safe kept. */
export function AllergyVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <VisualShell className="aspect-[16/10]">
      <div className="flex size-full flex-col justify-center gap-2 p-4">
        <motion.div
          className="bg-background flex items-center justify-between rounded-lg border border-border px-2.5 py-2 opacity-55"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 0.55, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <span className="text-muted-foreground text-[11px] line-through">
            Fragrance (Parfum)
          </span>
          <span className="text-muted-foreground text-[10px]">Filtered</span>
        </motion.div>

        {["Niacinamide", "Squalane"].map((item, i) => (
          <motion.div
            key={item}
            className="bg-background flex items-center justify-between rounded-lg border border-border px-2.5 py-2 shadow-sm"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: reduceMotion ? 0 : 0.2 + i * 0.12,
              duration: 0.4,
              ease: EASE_OUT,
            }}
          >
            <span className="text-foreground text-[11px]">{item}</span>
            <span className="bg-primary/12 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              Safe
            </span>
          </motion.div>
        ))}
      </div>
    </VisualShell>
  )
}

/** Climate — humidity meter settling to local conditions. */
export function ClimateVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <VisualShell className="aspect-[16/10]">
      <div className="flex size-full flex-col justify-center gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">Your climate</span>
          <motion.span
            className="text-primary text-[11px] font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            Humid · Warm
          </motion.span>
        </div>

        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <motion.div
            className="bg-primary/70 h-full rounded-full"
            initial={{ width: reduceMotion ? "72%" : "0%" }}
            whileInView={{ width: "72%" }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.8, ease: EASE_OUT }}
          />
        </div>

        <div className="text-muted-foreground flex justify-between text-[10px]">
          <span>Dry</span>
          <span>Humid</span>
        </div>

        <motion.div
          className="bg-background rounded-lg border border-border px-2.5 py-2 text-center shadow-sm"
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.4, ease: EASE_OUT }}
        >
          <p className="text-foreground text-[11px] font-medium">
            Lightweight serum preferred
          </p>
        </motion.div>
      </div>
    </VisualShell>
  )
}

/** Privacy — photo fades out, lock remains. */
export function PrivacyVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <VisualShell className="aspect-[16/10]">
      <div className="relative flex size-full items-center justify-center p-4">
        <motion.div
          className="bg-muted/80 absolute flex size-16 items-center justify-center rounded-xl border border-border"
          animate={
            reduceMotion
              ? { opacity: 0.25 }
              : { opacity: [0.85, 0.85, 0.15, 0.15] }
          }
          transition={{
            duration: 3.2,
            times: [0, 0.35, 0.55, 1],
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <IconPhotoOff
            className="text-muted-foreground size-6"
            aria-hidden
          />
        </motion.div>

        <motion.div
          className="bg-background relative z-10 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 shadow-sm"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.45, ease: EASE_OUT }}
        >
          <IconLock className="text-primary size-3.5" aria-hidden />
          <span className="text-foreground text-[11px] font-medium">
            Photo discarded
          </span>
        </motion.div>
      </div>
    </VisualShell>
  )
}

/** Follow-ups — chat + voice bubbles. */
export function ChatVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <VisualShell className="aspect-[16/10]">
      <div className="flex size-full flex-col justify-center gap-2 p-4">
        <motion.div
          className="bg-background mr-6 rounded-2xl rounded-bl-md border border-border px-3 py-2 shadow-sm"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <p className="text-foreground text-[11px]">
            Why was hydration marked balanced?
          </p>
        </motion.div>

        <motion.div
          className="bg-primary/10 ml-6 rounded-2xl rounded-br-md px-3 py-2"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: reduceMotion ? 0 : 0.25,
            duration: 0.4,
            ease: EASE_OUT,
          }}
        >
          <p className="text-foreground text-[11px]">
            Based on your scan bands and climate.
          </p>
        </motion.div>

        <motion.div
          className="mt-1 flex items-center justify-center gap-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <span className="bg-background text-muted-foreground inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px]">
            <IconMessageCircle className="size-3" aria-hidden />
            Text
          </span>
          <span className="bg-background text-muted-foreground inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px]">
            <IconMicrophone className="size-3" aria-hidden />
            Voice
          </span>
        </motion.div>
      </div>
    </VisualShell>
  )
}
