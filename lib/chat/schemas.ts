import { z } from "zod"

import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/scans/constants"

export const sendChatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(MAX_CHAT_MESSAGE_LENGTH),
  conversationId: z.string().cuid().optional(),
})
