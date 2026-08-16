"use client"

import type { ReactNode } from "react"
import { IconCheck, IconDownload } from "@tabler/icons-react"
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

/** Step 1 — phone capture: shutter pulse → flash → ready. */
export function ScanVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <VisualShell className="aspect-[5/4]">
      <div className="relative flex size-full items-center justify-center p-6">
        <div className="bg-background relative w-[52%] max-w-[140px] rounded-[1.35rem] border border-border p-2 shadow-sm">
          <div className="bg-muted mx-auto mb-2 h-1.5 w-10 rounded-full" />

          <div className="bg-muted/70 relative aspect-[3/4] overflow-hidden rounded-[0.85rem]">
            <div className="border-border/70 absolute top-[18%] left-1/2 h-[58%] w-[55%] -translate-x-1/2 rounded-full border-2" />
            <div className="bg-primary/10 absolute top-[26%] left-1/2 h-[42%] w-[40%] -translate-x-1/2 rounded-full" />

            {!reduceMotion && (
              <motion.div
                className="from-primary/0 via-primary/80 to-primary/0 absolute inset-x-0 h-px bg-linear-to-r"
                animate={{ top: ["12%", "88%"], opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 2.2,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0.8,
                }}
              />
            )}

            {!reduceMotion && (
              <motion.div
                className="bg-background absolute inset-0"
                animate={{ opacity: [0, 0, 0.55, 0] }}
                transition={{
                  duration: 3,
                  times: [0, 0.72, 0.78, 1],
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            )}
          </div>

          <div className="mt-2 flex justify-center py-1">
            <motion.div
              className="border-primary/40 flex size-7 items-center justify-center rounded-full border-2"
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [1, 0.9, 1], opacity: [1, 0.75, 1] }
              }
              transition={{ duration: 3, repeat: Infinity, ease: EASE_OUT }}
            >
              <div className="bg-primary size-3.5 rounded-full" />
            </motion.div>
          </div>
        </div>

        <motion.div
          className="bg-background absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] shadow-sm"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.45, ease: EASE_OUT }}
        >
          <span className="bg-primary/15 text-primary flex size-4 items-center justify-center rounded-full">
            <IconCheck className="size-2.5" stroke={2.5} aria-hidden />
          </span>
          <span className="text-foreground font-medium">Photo ready</span>
        </motion.div>
      </div>
    </VisualShell>
  )
}

const BANDS = [
  { label: "Hydration", value: "Balanced" },
  { label: "Tone", value: "Even" },
  { label: "Texture", value: "Smooth" },
] as const

/** Step 2 — skin read: bands reveal one by one. */
export function AssessVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <VisualShell className="aspect-[5/4]">
      <div className="relative flex size-full flex-col justify-center gap-3 p-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">Skin read</span>
          {!reduceMotion && (
            <motion.span
              className="bg-primary size-1.5 rounded-full"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>

        {BANDS.map((band, i) => (
          <motion.div
            key={band.label}
            className="bg-background flex items-center justify-between rounded-lg border border-border px-3 py-2.5 shadow-sm"
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: reduceMotion ? 0 : 0.15 + i * 0.18,
              duration: 0.45,
              ease: EASE_OUT,
            }}
          >
            <span className="text-muted-foreground text-xs">{band.label}</span>
            <span className="bg-primary/12 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
              {band.value}
            </span>
          </motion.div>
        ))}

        <motion.p
          className="text-muted-foreground mt-1 text-center text-[11px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: reduceMotion ? 0 : 0.75, duration: 0.4 }}
        >
          Plain bands. No fake scores.
        </motion.p>
      </div>
    </VisualShell>
  )
}

/** Step 3 — report document assembling into a keepable PDF. */
export function ReportVisual() {
  const reduceMotion = useReducedMotion()

  return (
    <VisualShell className="aspect-[5/4]">
      <div className="relative flex size-full items-center justify-center p-6">
        <motion.div
          className="bg-background relative w-[78%] overflow-hidden rounded-xl border border-border shadow-sm"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE_OUT }}
        >
          <div className="border-border flex items-center justify-between border-b px-3.5 py-2.5">
            <div>
              <p className="text-foreground text-xs font-medium">Skin report</p>
              <p className="text-muted-foreground text-[10px]">
                Aurora Organics
              </p>
            </div>
            <span className="bg-primary/12 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              PDF
            </span>
          </div>

          <div className="space-y-2.5 p-3.5">
            <motion.div
              className="bg-primary/8 flex items-center justify-between rounded-lg px-2.5 py-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <span className="text-muted-foreground text-[11px]">Overall</span>
              <span className="text-primary text-xs font-medium">Balanced</span>
            </motion.div>

            {[78, 62, 70].map((width, i) => (
              <motion.div
                key={width}
                className="bg-muted origin-left h-1.5 rounded-full"
                style={{ width: `${width}%` }}
                initial={{ scaleX: 0, opacity: 0 }}
                whileInView={{ scaleX: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: reduceMotion ? 0 : 0.35 + i * 0.12,
                  duration: 0.45,
                  ease: EASE_OUT,
                }}
              />
            ))}

            <motion.div
              className="border-border flex items-center gap-2 rounded-lg border border-dashed px-2.5 py-2"
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: reduceMotion ? 0 : 0.75,
                duration: 0.4,
                ease: EASE_OUT,
              }}
            >
              <span className="bg-primary/20 size-6 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-[11px] font-medium">
                  Gentle daily serum
                </p>
                <p className="text-muted-foreground text-[10px]">
                  Matched to you
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="bg-background absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] shadow-sm"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9, duration: 0.45, ease: EASE_OUT }}
        >
          <IconDownload className="text-primary size-3" aria-hidden />
          <span className="text-foreground font-medium">Keep forever</span>
        </motion.div>
      </div>
    </VisualShell>
  )
}
