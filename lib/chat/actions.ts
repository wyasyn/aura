"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

export async function deleteAdviceChatAction(conversationId: string) {
  const session = await requireSession()

  const conversation = await prisma.chatConversation.findFirst({
    where: {
      id: conversationId,
      userId: session.user.id,
      kind: "advice",
    },
  })

  if (!conversation) {
    throw new Error("Chat not found")
  }

  await prisma.chatConversation.delete({ where: { id: conversationId } })

  revalidatePath("/chats")
  revalidatePath(`/chats/${conversationId}`)
}

export async function deleteAllAdviceChatsAction() {
  const session = await requireSession()

  await prisma.chatConversation.deleteMany({
    where: {
      userId: session.user.id,
      kind: "advice",
    },
  })

  revalidatePath("/chats")
}
