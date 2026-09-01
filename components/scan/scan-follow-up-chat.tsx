"use client"

import { ScanAdviceComposer } from "@/components/scan/scan-advice-composer"

type ScanFollowUpChatProps = {
  scanId: string
  className?: string
}

const FOLLOW_UP_SUGGESTIONS = [
  "What does my hydration band mean?",
  "Morning routine for my climate?",
  "Why these product picks?",
]

export function ScanFollowUpChat({ scanId, className }: ScanFollowUpChatProps) {
  return (
    <ScanAdviceComposer
      mode="follow_up"
      scanId={scanId}
      scanPinnedInput
      placeholder="Ask about your scan…"
      collapsedLabel="Ask about your scan"
      suggestions={FOLLOW_UP_SUGGESTIONS}
      anchored
      className={className}
    />
  )
}
