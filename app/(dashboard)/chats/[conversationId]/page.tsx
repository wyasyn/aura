import { notFound } from "next/navigation"

import { AdviceChatDetail } from "@/components/dashboard/advice-chat-detail"
import { requireAuthContext } from "@/lib/auth/context"
import { getConversationForUser } from "@/lib/chat/conversation"
import { CAPTURE_COPY } from "@/lib/scan/capture-copy"

type ChatDetailPageProps = {
  params: Promise<{ conversationId: string }>
}

export default async function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { conversationId } = await params
  const ctx = await requireAuthContext()

  const conversation = await getConversationForUser(conversationId, ctx.userId)
  if (!conversation || conversation.kind !== "advice") {
    notFound()
  }

  const copy = CAPTURE_COPY.advice

  return (
    <div className="-my-8 mx-auto flex h-[calc(100svh-3rem)] w-full max-w-2xl min-h-0 flex-col pt-8 md:h-svh">
      <AdviceChatDetail
        conversationId={conversation.id}
        title={copy.title}
        description={`${copy.description}. Cosmetic guidance only — not a medical diagnosis.`}
      />
    </div>
  )
}
