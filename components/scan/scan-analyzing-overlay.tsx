"use client"

import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

type ScanAnalyzingOverlayProps = {
  className?: string
  activePhase?: number
}

export function ScanAnalyzingOverlay({
  className,
  activePhase = 0,
}: ScanAnalyzingOverlayProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-3 rounded-[1.25rem] border border-primary/30" />
      <div className="absolute inset-3 rounded-[1.25rem] border border-primary/15 [mask-image:linear-gradient(135deg,white,transparent_55%)]" />

      {!reduceMotion ? (
        <>
          <motion.div
            className="absolute inset-3 rounded-[1.25rem] opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(to right, transparent 0%, color-mix(in oklab, var(--primary) 18%, transparent) 50%, transparent 100%), linear-gradient(to bottom, transparent 0%, color-mix(in oklab, var(--primary) 12%, transparent) 50%, transparent 100%)",
              backgroundSize: "24px 24px",
            }}
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="absolute inset-x-3 h-px bg-primary/70 shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
            animate={{ top: ["12%", "88%", "12%"] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: activePhase * 0.15,
            }}
          />

          <motion.div
            className="absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl"
            animate={{ opacity: [0.2, 0.55, 0.2], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : (
        <div className="absolute inset-3 rounded-[1.25rem] bg-primary/10" />
      )}

      <div className="absolute left-4 top-4 size-5 border-l-2 border-t-2 border-primary/50" />
      <div className="absolute right-4 top-4 size-5 border-r-2 border-t-2 border-primary/50" />
      <div className="absolute bottom-4 left-4 size-5 border-b-2 border-l-2 border-primary/50" />
      <div className="absolute bottom-4 right-4 size-5 border-b-2 border-r-2 border-primary/50" />
    </div>
  )
}
