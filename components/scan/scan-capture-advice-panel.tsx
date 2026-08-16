"use client"

import { useState } from "react"

import {
  AdviceChatToolbar,
  type AdviceChatToolbarProps,
} from "@/components/scan/advice-chat-toolbar"
import { ScanAdviceComposer } from "@/components/scan/scan-advice-composer"
import { ScanStepShell } from "@/components/scan/scan-step-shell"
import { CAPTURE_COPY } from "@/lib/scan/capture-copy"

const ADVICE_SUGGESTIONS = [
  "Routine for dry, sensitive skin?",
  "SPF tips for high UV?",
  "Natural ingredients to try?",
]

type AdviceToolbarState = Pick<
  AdviceChatToolbarProps,
  "onNewChat" | "startingNew" | "disabled"
>

export function ScanCaptureAdvicePanel() {
  const [toolbar, setToolbar] = useState<AdviceToolbarState>({})
  const copy = CAPTURE_COPY.advice

  return (
    <ScanStepShell
      title={copy.title}
      description={copy.description}
      headerActions={
        <AdviceChatToolbar
          onNewChat={toolbar.onNewChat}
          startingNew={toolbar.startingNew}
          disabled={toolbar.disabled}
          showHistoryLink
        />
      }
    >
      <div className="h-[min(65vh,520px)] min-h-[32rem]">
        <ScanAdviceComposer
          mode="advice"
          inline
          hideAdviceHeader
          startFresh
          scanPinnedInput
          placeholder="Ask about routines, concerns & recommendations…"
          suggestions={ADVICE_SUGGESTIONS}
          onToolbarStateChange={setToolbar}
        />
      </div>
    </ScanStepShell>
  )
}
