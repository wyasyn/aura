import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/scans/constants"
import { readChatImageFile, type ChatImageInput } from "@/lib/chat/image"

export type ParsedChatRequest = {
  message: string
  conversationId?: string
  image?: ChatImageInput
}

export async function parseChatRequest(
  request: Request,
): Promise<ParsedChatRequest | { error: string }> {
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return { error: "Invalid request body." }
    }

    const messageField = formData.get("message")
    const message =
      typeof messageField === "string" ? messageField.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH) : ""

    const conversationField = formData.get("conversationId")
    const conversationId =
      typeof conversationField === "string" && conversationField.trim()
        ? conversationField.trim()
        : undefined

    const imageField = formData.get("image")
    let image: ChatImageInput | undefined
    if (imageField instanceof Blob && imageField.size > 0) {
      const parsedImage = await readChatImageFile(imageField)
      if ("error" in parsedImage) {
        return parsedImage
      }
      image = parsedImage
    }

    if (!message && !image) {
      return { error: "Message or image is required." }
    }

    return { message, conversationId, image }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { error: "Invalid request body." }
  }

  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." }
  }

  const record = body as Record<string, unknown>
  const message =
    typeof record.message === "string"
      ? record.message.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH)
      : ""
  const conversationId =
    typeof record.conversationId === "string" && record.conversationId.trim()
      ? record.conversationId.trim()
      : undefined

  if (!message) {
    return { error: "Message cannot be empty." }
  }

  return { message, conversationId }
}
