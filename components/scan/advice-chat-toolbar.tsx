import Link from "next/link"
import { IconLoader2, IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export type AdviceChatToolbarProps = {
  onNewChat?: () => void
  startingNew?: boolean
  disabled?: boolean
  showHistoryLink?: boolean
}

export function AdviceChatToolbar({
  onNewChat,
  startingNew = false,
  disabled = false,
  showHistoryLink = false,
}: AdviceChatToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        disabled={disabled || startingNew || !onNewChat}
        onClick={() => onNewChat?.()}
      >
        {startingNew ? (
          <IconLoader2 className="size-3.5 animate-spin" />
        ) : (
          <IconPlus className="size-3.5" />
        )}
        New chat
      </Button>
      {showHistoryLink ? (
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Link href="/chats">All chats</Link>
        </Button>
      ) : null}
    </div>
  )
}
