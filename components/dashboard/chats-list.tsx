import Link from "next/link"
import { IconMessageCircle } from "@tabler/icons-react"

import { DashboardEmptyState } from "@/components/dashboard/dashboard-card"
import { ChatsListClient } from "@/components/dashboard/chats-list-client"
import type { AdviceChatListItem } from "@/components/dashboard/chats-list-client"
import { Button } from "@/components/ui/button"
import { requireAuthContext } from "@/lib/auth/context"
import { listAdviceConversations } from "@/lib/chat/conversation"

const CHATS_PAGE_SIZE = 20

type ChatsListProps = {
  page?: number
}

export async function ChatsList({ page = 1 }: ChatsListProps) {
  const ctx = await requireAuthContext()
  const { conversations, totalCount, totalPages, page: safePage } =
    await listAdviceConversations(ctx.userId, page, CHATS_PAGE_SIZE)

  const items: AdviceChatListItem[] = conversations.map((conversation) => {
    const preview = conversation.messages[0]?.content ?? "No messages yet"
    return {
      id: conversation.id,
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: conversation._count.messages,
      preview:
        preview.length > 120 ? `${preview.slice(0, 117).trimEnd()}…` : preview,
    }
  })

  if (totalCount === 0) {
    return (
      <DashboardEmptyState
        icon={IconMessageCircle}
        title="No advice chats yet"
        description="Ask follow-up questions about your results by voice or text. Start from a scan, or open a new conversation."
        action={
          <Button asChild>
            <Link href="/scan">Go to scan</Link>
          </Button>
        }
      />
    )
  }

  return (
    <ChatsListClient
      chats={items}
      page={safePage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  )
}
