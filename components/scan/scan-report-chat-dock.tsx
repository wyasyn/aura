"use client"

import { useState } from "react"
import { IconMessage, IconSparkles } from "@tabler/icons-react"

import { ScanAdviceComposer } from "@/components/scan/scan-advice-composer"
import { FeedbackSuccessTick } from "@/components/scan/feedback-success-tick"
import {
  ScanFeedbackForm,
  ScanFeedbackWidget,
  type ScanFeedbackRecord,
} from "@/components/scan/scan-feedback-widget"
import { ScanFollowUpChat } from "@/components/scan/scan-follow-up-chat"
import { Button } from "@/components/ui/button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { cn } from "@/lib/utils"

type ScanReportChatDockProps = {
  scanId: string
  existingFeedback?: ScanFeedbackRecord | null
  className?: string
  variant?: "floating" | "footer"
}

const FOLLOW_UP_SUGGESTIONS = [
  "What does my hydration band mean?",
  "Morning routine for my climate?",
  "Why these product picks?",
]

function ScanReportFooterActions({
  scanId,
  existingFeedback = null,
  className,
}: {
  scanId: string
  existingFeedback?: ScanFeedbackRecord | null
  className?: string
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(
    existingFeedback != null,
  )

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setChatOpen(true)}
        >
          <IconSparkles className="size-3.5" />
          Ask about your scan
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={feedbackSubmitted}
          className={feedbackSubmitted ? "px-2.5" : undefined}
          onClick={() => setFeedbackOpen(true)}
        >
          {feedbackSubmitted ? (
            <FeedbackSuccessTick size="sm" />
          ) : (
            <>
              <IconMessage className="size-3.5" />
              Feedback
            </>
          )}
        </Button>
      </div>

      <ResponsiveDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        title="Ask about your scan"
        description="Follow-up questions about your results"
        className="sm:max-w-2xl"
      >
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6">
          <div className="h-[min(60vh,480px)] min-h-[24rem]">
            <ScanAdviceComposer
              mode="follow_up"
              scanId={scanId}
              inline
              scanPinnedInput
              hideAdviceHeader
              placeholder="Ask about your scan…"
              suggestions={FOLLOW_UP_SUGGESTIONS}
            />
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        title="How was your scan?"
        description="Rate your experience and share optional comments"
        className="sm:max-w-md"
      >
        <div className="px-4 pb-6 sm:px-6">
          <ScanFeedbackForm
            scanId={scanId}
            existingFeedback={existingFeedback}
            onSubmitted={() => {
              setFeedbackSubmitted(true)
              setFeedbackOpen(false)
            }}
          />
        </div>
      </ResponsiveDialog>
    </>
  )
}

export function ScanReportChatDock({
  scanId,
  existingFeedback = null,
  className,
  variant = "floating",
}: ScanReportChatDockProps) {
  if (variant === "footer") {
    return (
      <ScanReportFooterActions
        scanId={scanId}
        existingFeedback={existingFeedback}
        className={className}
      />
    )
  }

  return (
    <div className={cn("flex items-end justify-end gap-3", className)}>
      <ScanFollowUpChat scanId={scanId} className="relative shrink-0" />
      <ScanFeedbackWidget
        scanId={scanId}
        existingFeedback={existingFeedback}
        anchored
        className="pointer-events-auto relative h-12 w-12 shrink-0"
      />
    </div>
  )
}
