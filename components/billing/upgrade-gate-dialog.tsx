"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  IconCamera,
  IconMessage,
  IconSparkles,
  type TablerIcon,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { BILLING_HREF } from "@/lib/billing/constants"

export type GatedFeature = "scan" | "chat"

const COPY: Record<
  GatedFeature,
  { icon: TablerIcon; title: string; description: string; points: string[] }
> = {
  scan: {
    icon: IconCamera,
    title: "You're out of scans",
    description:
      "Scanning needs an active plan. Pick a pack to keep analyzing your skin.",
    points: [
      "Full skin analysis with product recommendations",
      "Downloadable PDF report for every scan",
      "Follow-up chat about your results",
    ],
  },
  chat: {
    icon: IconMessage,
    title: "You're out of skin advice",
    description:
      "Sending messages needs an active plan. Your past chats stay readable.",
    points: [
      "Unlimited follow-up questions within your plan",
      "Advice grounded in your own scan history",
      "Product suggestions matched to your skin",
    ],
  },
}

export function UpgradeGateDialog({
  open,
  feature,
  onCancel,
  cancelLabel = "Not now",
  dismissible = true,
}: {
  open: boolean
  feature: GatedFeature
  /** Runs when the user declines, including Esc and clicks outside. */
  onCancel: () => void
  cancelLabel?: string
  /** When false, only the two buttons can close the dialog. */
  dismissible?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const copy = COPY[feature]
  const Icon = copy.icon

  function onContinue() {
    startTransition(() => {
      router.push(BILLING_HREF)
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) {
          onCancel()
        }
      }}
      title={copy.title}
      description={copy.description}
      className="sm:max-w-md"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
        <ul className="space-y-2.5">
          {copy.points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm">
              <span
                aria-hidden
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                <Icon className="size-3" />
              </span>
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            className="flex-1"
            onClick={onContinue}
            disabled={pending}
            autoFocus
          >
            <IconSparkles className="size-4" />
            {pending ? "Opening billing..." : "View plans"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

/**
 * Gate for an in-page action: opens on demand and closes back to the page the
 * user is already on, so chat history stays reachable behind it.
 */
export function useUpgradeGate() {
  const [open, setOpen] = useState(false)
  return {
    open,
    show: () => setOpen(true),
    close: () => setOpen(false),
  }
}
