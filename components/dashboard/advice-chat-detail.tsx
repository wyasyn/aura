"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconLoader2, IconTrash } from "@tabler/icons-react"

import {
  AdviceChatToolbar,
  type AdviceChatToolbarProps,
} from "@/components/scan/advice-chat-toolbar"
import { ScanAdviceComposer } from "@/components/scan/scan-advice-composer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteAdviceChatAction } from "@/lib/chat/actions"

type AdviceChatDetailProps = {
  conversationId: string
  title: string
  description: string
}

type AdviceToolbarState = Pick<
  AdviceChatToolbarProps,
  "onNewChat" | "startingNew" | "disabled"
>

export function AdviceChatDetail({
  conversationId,
  title,
  description,
}: AdviceChatDetailProps) {
  const router = useRouter()
  const [toolbar, setToolbar] = useState<AdviceToolbarState>({})
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteAdviceChatAction(conversationId)
      router.push("/chats")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete chat.")
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AdviceChatToolbar
              onNewChat={toolbar.onNewChat}
              startingNew={toolbar.startingNew}
              disabled={toolbar.disabled}
              showHistoryLink
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
                  disabled={deleting}
                >
                  {deleting ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconTrash className="size-3.5" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the conversation and its messages.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDelete()}>
                    Delete chat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="min-h-0 flex-1">
        <ScanAdviceComposer
          mode="advice"
          inline
          dockInput
          hideAdviceHeader
          initialConversationId={conversationId}
          placeholder="Ask about routines, concerns & recommendations…"
          onToolbarStateChange={setToolbar}
          className="h-full"
        />
      </div>
    </div>
  )
}
