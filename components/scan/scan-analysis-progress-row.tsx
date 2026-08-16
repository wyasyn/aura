"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { BloomGlow } from "@/components/chat/bloom-glow"
import { cn } from "@/lib/utils"

type ScanAnalysisProgressRowProps = {
  label: string
  loading?: boolean
}

export function ScanAnalysisProgressRow({
  label,
  loading = true,
}: ScanAnalysisProgressRowProps) {
  const reduce = useReducedMotion()

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm">
      <span className="relative min-w-0 flex-1" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
            className={cn(
              "chat-thinking-text inline-block",
              reduce && "text-muted-foreground",
            )}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
      {loading ? <BloomGlow size={16} dotSize={2} /> : null}
    </div>
  )
}
