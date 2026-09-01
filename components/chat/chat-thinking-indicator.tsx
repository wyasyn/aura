"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { BloomGlow } from "@/components/chat/bloom-glow"
import { cn } from "@/lib/utils"

const THINKING_PHRASES = [
  "Thinking...",
  "Considering...",
  "Reflecting...",
  "Almost there...",
] as const

const PHRASE_INTERVAL_MS = 2_400

export function ChatThinkingIndicator() {
  const reduce = useReducedMotion()
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    if (reduce) return

    const timer = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % THINKING_PHRASES.length)
    }, PHRASE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [reduce])

  const phrase = THINKING_PHRASES[phraseIndex]

  return (
    <div className="flex w-full justify-start">
      <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2 text-sm">
        <BloomGlow size={16} dotSize={2} />
        <span className="relative min-w-[7.5rem]" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phrase}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
              className={cn(
                "chat-thinking-text inline-block",
                reduce && "text-muted-foreground",
              )}
            >
              {phrase}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
    </div>
  )
}
