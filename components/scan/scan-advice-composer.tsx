"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  IconArrowUp,
  IconLoader2,
  IconMicrophone,
  IconPaperclip,
  IconPlus,
  IconSparkles,
  IconX,
} from "@tabler/icons-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChatMessageContent } from "@/components/chat/chat-message-content"
import { ChatMessageFooter } from "@/components/chat/chat-message-footer"
import { ChatNaturalRecommendations } from "@/components/chat/chat-natural-recommendations"
import { ChatProductList } from "@/components/chat/chat-product-list"
import { BloomGlow } from "@/components/chat/bloom-glow"
import { ChatThinkingIndicator } from "@/components/chat/chat-thinking-indicator"
import { VoiceRecordingBar } from "@/components/chat/voice-recording-bar"
import { useVoiceDictation } from "@/hooks/use-voice-dictation"
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/scans/constants"
import { toUserFacingChatError } from "@/lib/chat/errors"
import type { ChatMessageMetadata } from "@/lib/chat/types"
import { cn } from "@/lib/utils"

import { useEntitlement } from "@/components/billing/entitlement-provider"
import {
  UpgradeGateDialog,
  useUpgradeGate,
} from "@/components/billing/upgrade-gate-dialog"
import type { AdviceChatToolbarProps } from "@/components/scan/advice-chat-toolbar"

export type ChatMessageItem = {
  id: string
  role: "user" | "assistant" | "system_refusal"
  content: string
  blocked?: boolean
  imageUrl?: string | null
  metadata?: ChatMessageMetadata | null
}

type ScanAdviceComposerProps = {
  mode: "advice" | "follow_up"
  scanId?: string
  placeholder?: string
  collapsedLabel?: string
  suggestions?: string[]
  /** When true, skip viewport-corner positioning — parent controls placement. */
  anchored?: boolean
  className?: string
  /** Inline layout for capture screen (always expanded, no pill). */
  inline?: boolean
  /** Resume a specific advice conversation (dashboard / deep link). */
  initialConversationId?: string
  /** Hide the in-chat advice title/actions row (toolbar lives in outer header). */
  hideAdviceHeader?: boolean
  /** Pin input to the bottom with messages scrolling above (dashboard chat detail). */
  dockInput?: boolean
  /** Scan-page layout: taller messages area with input pinned at bottom. */
  scanPinnedInput?: boolean
  /** Sync new-chat controls to an outer header toolbar. */
  onToolbarStateChange?: (
    state: Pick<AdviceChatToolbarProps, "onNewChat" | "startingNew" | "disabled">,
  ) => void
  /** Start with a blank advice conversation instead of resuming the latest. */
  startFresh?: boolean
}

const MORPH_OPEN_EASE = [0.34, 1.25, 0.64, 1] as const
const MORPH_CLOSE_EASE = [0.22, 1, 0.36, 1] as const

const MESSAGE_LIST_HEIGHT = {
  inline: "min-h-52 max-h-80",
  docked: "min-h-0 flex-1",
  scanPinned: "min-h-0 flex-1",
  floating: "min-h-52 max-h-[min(55vh,400px)]",
} as const

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp"

function scrollElementToTopOfContainer(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior,
) {
  const offset =
    element.getBoundingClientRect().top - container.getBoundingClientRect().top
  container.scrollTo({
    top: Math.max(0, container.scrollTop + offset),
    behavior,
  })
}

function scrollContainerToBottom(
  container: HTMLElement,
  behavior: ScrollBehavior,
) {
  container.scrollTo({
    top: container.scrollHeight,
    behavior,
  })
}

type PendingImage = {
  file: File
  previewUrl: string
}

function MessageBubble({
  message,
  showBookingButton = true,
}: {
  message: ChatMessageItem
  showBookingButton?: boolean
}) {
  const isUser = message.role === "user"
  const useMarkdown = message.role === "assistant" || message.role === "system_refusal"

  // Recommendations, disclaimer, and JSON fence are already split out server
  // side (parse-recommendations.ts / mapMessageForClient), so render as stored.
  const naturalRecommendations = message.metadata?.naturalRecommendations ?? []
  const productRecommendations = message.metadata?.productRecommendations ?? []
  const body = message.content
  const consultationNoteText = message.metadata?.consultationNote
  const hasStructuredContent =
    naturalRecommendations.length > 0 || productRecommendations.length > 0

  return (
    <div
      data-message-id={message.id}
      className={cn("flex w-full min-w-0", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words",
          isUser
            ? "w-fit max-w-[min(85%,18rem)] bg-primary/10 text-foreground"
            : hasStructuredContent
              ? "w-full max-w-[min(100%,34rem)] bg-muted/40 text-foreground"
              : "w-[80%] max-w-[80%] bg-muted/40 text-foreground",
        )}
      >
        {message.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- chat attachment preview / persisted data URL
          <img
            src={message.imageUrl}
            alt="Attached skin photo"
            className="max-h-40 w-full rounded-xl object-cover"
          />
        ) : null}
        {body ? (
          <ChatMessageContent
            content={body}
            markdown={useMarkdown}
          />
        ) : null}
        {naturalRecommendations.length > 0 ? (
          <ChatNaturalRecommendations items={naturalRecommendations} />
        ) : null}
        {productRecommendations.length > 0 ? (
          <ChatProductList products={productRecommendations} />
        ) : null}
        {consultationNoteText ? (
          <ChatMessageFooter
            consultationNote={consultationNoteText}
            showBookingButton={showBookingButton}
          />
        ) : null}
      </div>
    </div>
  )
}

export function ScanAdviceComposer({
  mode,
  scanId,
  placeholder = "Ask about your skin…",
  collapsedLabel,
  suggestions = [],
  anchored = false,
  className,
  inline = false,
  initialConversationId,
  hideAdviceHeader = false,
  dockInput = false,
  scanPinnedInput = false,
  onToolbarStateChange,
  startFresh = false,
}: ScanAdviceComposerProps) {
  const reduce = useReducedMotion()
  const { canChat } = useEntitlement()
  const upgradeGate = useUpgradeGate()
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tempIdCounter = useRef(0)
  const sendingRef = useRef(false)
  const handleSendRef = useRef<(text?: string) => Promise<void>>(async () => {})

  const [open, setOpen] = useState(inline)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  )
  const [draft, setDraft] = useState("")
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null)
  const [sending, setSending] = useState(false)
  const [startingNew, setStartingNew] = useState(false)
  const [loading, setLoading] = useState(!inline)
  const [error, setError] = useState<string | null>(null)
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | null>(
    null,
  )

  const {
    supported: voiceSupported,
    listening,
    processing: voiceProcessing,
    levels: voiceLevels,
    elapsedMs: voiceElapsedMs,
    startListening,
    cancelListening,
    confirmListening,
  } = useVoiceDictation({
    onTranscript: async (text) => {
      const message = text.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH)
      if (message) {
        await handleSendRef.current(message)
      }
    },
    onError: (message) => setError(message),
  })

  const label =
    collapsedLabel ??
    (mode === "follow_up" ? "Ask about your scan" : "Ask about your skin")

  useEffect(() => {
    return () => {
      if (pendingImage?.previewUrl) {
        URL.revokeObjectURL(pendingImage.previewUrl)
      }
    }
  }, [pendingImage])

  useEffect(() => {
    let cancelled = false

    async function loadConversation(
      res: Response,
      data: {
        ok: boolean
        error?: string
        conversation?: {
          id: string | null
          messages: ChatMessageItem[]
          estimatedMessagesRemaining: number
        }
      },
    ) {
      if (!data.ok || !data.conversation) {
        setError(toUserFacingChatError(data.error, res.status))
        return
      }
      setConversationId(data.conversation.id)
      setMessages(data.conversation.messages)
      setEstimatedRemaining(data.conversation.estimatedMessagesRemaining)
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (mode === "follow_up" && scanId) {
          const res = await fetch(`/api/scan/${scanId}/chat`)
          const data = (await res.json()) as {
            ok: boolean
            error?: string
            conversation?: {
              id: string | null
              messages: ChatMessageItem[]
              estimatedMessagesRemaining: number
            }
          }
          if (!cancelled) {
            await loadConversation(res, data)
          }
        } else if (startFresh && !initialConversationId) {
          const res = await fetch("/api/chat/advice")
          const data = (await res.json()) as {
            ok: boolean
            error?: string
            conversation?: {
              id: string | null
              messages: ChatMessageItem[]
              estimatedMessagesRemaining: number
            }
          }
          if (!cancelled) {
            await loadConversation(res, data)
          }
        } else {
          const activeConversationId = initialConversationId
          const query = activeConversationId
            ? `?conversationId=${encodeURIComponent(activeConversationId)}`
            : ""
          const res = await fetch(`/api/chat/advice${query}`)
          const data = (await res.json()) as {
            ok: boolean
            error?: string
            conversation?: {
              id: string | null
              messages: ChatMessageItem[]
              estimatedMessagesRemaining: number
            }
          }
          if (!cancelled) {
            await loadConversation(res, data)
          }
        }
      } catch {
        if (!cancelled) {
          setError(toUserFacingChatError("Could not load chat."))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [initialConversationId, mode, scanId, startFresh])

  function detachPendingImage() {
    setPendingImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function clearPendingImage() {
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl)
    }
    detachPendingImage()
  }

  const handleNewChat = useCallback(async () => {
    if (mode !== "advice" || sending || startingNew) return

    cancelListening()
    setStartingNew(true)
    setError(null)
    detachPendingImage()
    setDraft("")
    setConversationId(null)
    setMessages([])

    try {
      const res = await fetch("/api/chat/advice")
      const data = (await res.json()) as {
        ok: boolean
        error?: string
        conversation?: {
          id: string | null
          messages: ChatMessageItem[]
          estimatedMessagesRemaining: number
        }
      }

      if (!data.ok || !data.conversation) {
        setError(toUserFacingChatError(data.error, res.status))
        return
      }

      setConversationId(data.conversation.id)
      setMessages(data.conversation.messages)
      setEstimatedRemaining(data.conversation.estimatedMessagesRemaining)
    } catch {
      setError(toUserFacingChatError("Could not start a new chat."))
    } finally {
      setStartingNew(false)
    }
  }, [mode, sending, startingNew, cancelListening])

  useEffect(() => {
    if (mode !== "advice" || !onToolbarStateChange) return

    onToolbarStateChange({
      onNewChat: () => void handleNewChat(),
      startingNew,
      disabled: sending || startingNew,
    })
  }, [handleNewChat, mode, onToolbarStateChange, sending, startingNew])

  useEffect(() => {
    const container = listRef.current
    if (!container || messages.length === 0) return

    const behavior: ScrollBehavior = reduce ? "auto" : "smooth"
    const last = messages[messages.length - 1]

    const scrollToMessageStart = (messageId: string) => {
      const element = container.querySelector(
        `[data-message-id="${messageId}"]`,
      )
      if (element instanceof HTMLElement) {
        scrollElementToTopOfContainer(container, element, behavior)
      }
    }

    const align = () => {
      if (
        last.role === "assistant" ||
        last.role === "system_refusal"
      ) {
        scrollToMessageStart(last.id)
        return
      }

      scrollContainerToBottom(container, behavior)
    }

    const frame = requestAnimationFrame(align)
    const retry =
      last.role === "assistant" || last.role === "system_refusal"
        ? window.setTimeout(() => scrollToMessageStart(last.id), 120)
        : undefined

    return () => {
      cancelAnimationFrame(frame)
      if (retry) window.clearTimeout(retry)
    }
  }, [messages, open, pendingImage, sending, reduce])

  useEffect(() => {
    if (!open || inline) return
    const timer = window.setTimeout(
      () => textareaRef.current?.focus(),
      reduce ? 0 : 400,
    )
    return () => window.clearTimeout(timer)
  }, [open, inline, reduce])

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPEG, PNG, or WebP image.")
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be 4 MB or smaller.")
      return
    }

    clearPendingImage()
    setPendingImage({
      file,
      previewUrl: URL.createObjectURL(file),
    })
    setError(null)
  }

  async function handleSend(text?: string) {
    const content = (text ?? draft).trim()
    const imageToSend = pendingImage
    if ((!content && !imageToSend) || sendingRef.current) return

    // Paywall check runs before the draft is cleared, so declining the gate
    // leaves the message intact to send after they top up.
    if (!canChat) {
      cancelListening()
      upgradeGate.show()
      return
    }

    cancelListening()
    sendingRef.current = true
    setSending(true)
    setError(null)
    setDraft("")
    if (imageToSend) {
      detachPendingImage()
    }

    tempIdCounter.current += 1
    const tempId = `temp-${tempIdCounter.current}`
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "user",
        content,
        imageUrl: imageToSend?.previewUrl ?? null,
      },
    ])

    try {
      const endpoint =
        mode === "follow_up" && scanId
          ? `/api/scan/${scanId}/chat`
          : "/api/chat/advice"

      let res: Response
      if (imageToSend) {
        const formData = new FormData()
        if (content) {
          formData.set("message", content)
        }
        formData.set("image", imageToSend.file)
        if (conversationId) {
          formData.set("conversationId", conversationId)
        }
        res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        })
      } else {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId: conversationId ?? undefined,
          }),
        })
      }

      const data = (await res.json()) as {
        ok: boolean
        error?: string
        conversationId?: string
        assistantMessage?: string
        assistantMetadata?: ChatMessageMetadata | null
        blocked?: boolean
        estimatedMessagesRemaining?: number
      }

      if (!data.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setDraft(content)
        if (imageToSend) {
          setPendingImage(imageToSend)
        }
        setError(toUserFacingChatError(data.error, res.status))
        return
      }

      if (data.conversationId) {
        setConversationId(data.conversationId)
      }
      if (data.estimatedMessagesRemaining != null) {
        setEstimatedRemaining(data.estimatedMessagesRemaining)
      }

      tempIdCounter.current += 1
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${tempIdCounter.current}`,
          role: data.blocked ? "system_refusal" : "assistant",
          content: data.assistantMessage ?? "",
          metadata: data.assistantMetadata ?? null,
        },
      ])
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setDraft(content)
      if (imageToSend) {
        setPendingImage(imageToSend)
      }
      setError(toUserFacingChatError("Could not send message."))
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  handleSendRef.current = handleSend

  function handleSuggestion(suggestion: string) {
    void handleSend(suggestion)
  }

  const canSend = Boolean(draft.trim() || pendingImage)
  const pinnedInput = dockInput || scanPinnedInput

  const panel = (
    <motion.div
      layout
      transition={{
        layout: {
          duration: reduce ? 0 : open ? 0.4 : 0.28,
          ease: open ? MORPH_OPEN_EASE : MORPH_CLOSE_EASE,
        },
      }}
      className={cn(
        "pointer-events-auto overflow-hidden bg-background",
        inline
          ? cn(
              "w-full",
              pinnedInput
                ? "flex h-full min-h-0 flex-col rounded-[1.5rem]"
                : "rounded-2xl",
            )
          : open
            ? cn(
                "w-[min(92vw,380px)] rounded-[2rem] p-3 shadow-lg",
                scanPinnedInput &&
                  "flex max-h-[min(80vh,560px)] min-h-[28rem] flex-col",
              )
            : "h-12 w-auto rounded-full p-0 shadow-lg",
      )}
    >
      {!open && !inline ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground transition-opacity hover:opacity-90"
        >
          <IconSparkles className="size-4 shrink-0" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ) : (
        <div
          className={cn(
            "flex flex-col",
            pinnedInput ? "min-h-0 flex-1 gap-0" : "gap-3",
          )}
        >
          {mode === "advice" && !hideAdviceHeader && !inline ? (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <IconSparkles className="size-4 text-primary" />
                <span className="font-heading text-sm font-semibold">
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs"
                  disabled={sending || startingNew}
                  onClick={() => void handleNewChat()}
                >
                  {startingNew ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconPlus className="size-3.5" />
                  )}
                  New chat
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={() => {
                    cancelListening()
                    setOpen(false)
                  }}
                  aria-label="Close chat"
                >
                  <IconX className="size-4" />
                </Button>
              </div>
            </div>
          ) : !inline ? (
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <IconSparkles className="size-4 text-primary" />
                <span className="font-heading text-sm font-semibold">
                  {label}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => {
                  cancelListening()
                  setOpen(false)
                }}
                aria-label="Close chat"
              >
                <IconX className="size-4" />
              </Button>
            </div>
          ) : null}

          <div
            ref={listRef}
            className={cn(
              "chat-message-scroll flex flex-col gap-3 overflow-y-auto scroll-pt-1 bg-background px-1 py-1",
              pinnedInput
                ? MESSAGE_LIST_HEIGHT.scanPinned
                : inline
                  ? MESSAGE_LIST_HEIGHT.inline
                  : MESSAGE_LIST_HEIGHT.floating,
            )}
          >
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : messages.length === 0 ? (
              suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestion(suggestion)}
                      disabled={sending}
                      className="rounded-full bg-muted/40 px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    showBookingButton={mode !== "follow_up"}
                  />
                ))}
                {sending ? <ChatThinkingIndicator /> : null}
              </>
            )}
          </div>

          <div
            className={cn(
              "space-y-3",
              pinnedInput &&
                "shrink-0 bg-background px-1 pt-3",
              dockInput && "pb-6",
            )}
          >
          {estimatedRemaining != null ? (
            <p className="px-1 text-xs text-muted-foreground">
              ~{estimatedRemaining} messages left
            </p>
          ) : null}

          {error ? (
            <p className="px-1 text-sm text-destructive">{error}</p>
          ) : null}

          {pendingImage ? (
            <div className="relative mx-1 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- local attachment preview */}
              <img
                src={pendingImage.previewUrl}
                alt="Attachment preview"
                className="h-24 w-24 rounded-xl object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute -top-2 -right-2 size-7 rounded-full shadow-sm"
                onClick={clearPendingImage}
                aria-label="Remove attachment"
              >
                <IconX className="size-3.5" />
              </Button>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="sr-only"
            onChange={handleImageSelect}
            aria-label="Attach image"
          />

          <div
            className={cn(
              "overflow-hidden rounded-2xl border border-border bg-muted/20",
              (listening || voiceProcessing) && "ring-2 ring-primary/30",
            )}
          >
            {listening || voiceProcessing ? (
              <VoiceRecordingBar
                levels={voiceLevels}
                elapsedMs={voiceElapsedMs}
                processing={voiceProcessing}
                disabled={sending}
                onAttach={() => fileInputRef.current?.click()}
                onCancel={cancelListening}
                onConfirm={confirmListening}
                className="border-0 bg-transparent"
              />
            ) : (
              <>
                <Textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  maxLength={MAX_CHAT_MESSAGE_LENGTH}
                  disabled={sending}
                  className="max-h-32 min-h-14 resize-none border-0 bg-transparent px-3 pt-3 pb-2 text-sm leading-5 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 rounded-full text-muted-foreground"
                      disabled={sending}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach image"
                    >
                      <IconPaperclip className="size-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    {voiceSupported ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 rounded-full text-muted-foreground"
                        disabled={sending || voiceProcessing}
                        onClick={() => startListening(draft)}
                        aria-label="Start voice input"
                      >
                        <IconMicrophone className="size-4" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="icon-sm"
                      className="shrink-0 rounded-full"
                      disabled={sending || !canSend}
                      onClick={() => void handleSend()}
                      aria-label="Send message"
                    >
                      {sending ? (
                        <span className="inline-flex size-4 items-center justify-center overflow-hidden">
                          <BloomGlow size={16} dotSize={2} />
                        </span>
                      ) : (
                        <IconArrowUp className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      )}
    </motion.div>
  )

  const gateDialog = (
    <UpgradeGateDialog
      open={upgradeGate.open}
      feature="chat"
      onCancel={upgradeGate.close}
    />
  )

  if (inline) {
    return (
      <div
        className={cn(
          "w-full",
          pinnedInput && "h-full min-h-0",
          className,
        )}
      >
        {panel}
        {gateDialog}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "pointer-events-none z-30",
        anchored ? "relative" : "absolute bottom-4 right-4",
        className,
      )}
    >
      <AnimatePresence mode="wait">{panel}</AnimatePresence>
      {gateDialog}
    </div>
  )
}
