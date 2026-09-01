"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  IconLayoutGrid,
  IconList,
  IconLoader2,
  IconMessage,
  IconTrash,
} from "@tabler/icons-react"

import { ChatsPagination } from "@/components/dashboard/chats-pagination"
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  deleteAdviceChatAction,
  deleteAllAdviceChatsAction,
} from "@/lib/chat/actions"
import { cn } from "@/lib/utils"

export type AdviceChatListItem = {
  id: string
  updatedAt: string
  messageCount: number
  preview: string
}

type AdviceChatsViewMode = "grid" | "table"

type ChatsListClientProps = {
  chats: AdviceChatListItem[]
  page: number
  totalPages: number
  totalCount: number
}

const VIEW_MODE_STORAGE_KEY = "aura-advice-chats-view"

function formatChatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

function readStoredViewMode(): AdviceChatsViewMode {
  if (typeof window === "undefined") return "grid"
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  return stored === "table" ? "table" : "grid"
}

type DeleteChatButtonProps = {
  chatId: string
  deleting: boolean
  onDelete: (chatId: string) => void
  className?: string
}

function DeleteChatButton({
  chatId,
  deleting,
  onDelete,
  className,
}: DeleteChatButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "shrink-0 text-muted-foreground hover:text-destructive",
            className,
          )}
          disabled={deleting}
          aria-label="Delete chat"
          onClick={(event) => event.stopPropagation()}
        >
          {deleting ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconTrash className="size-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the conversation and its messages. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(chatId)}>
            Delete chat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ChatsListClient({
  chats,
  page,
  totalPages,
  totalCount,
}: ChatsListClientProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<AdviceChatsViewMode>("grid")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setViewMode(readStoredViewMode())
  }, [])

  function handleViewModeChange(mode: AdviceChatsViewMode) {
    setViewMode(mode)
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  async function handleDeleteChat(conversationId: string) {
    setPendingId(conversationId)
    setError(null)
    try {
      await deleteAdviceChatAction(conversationId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete chat.")
    } finally {
      setPendingId(null)
    }
  }

  async function handleClearAll() {
    setClearingAll(true)
    setError(null)
    try {
      await deleteAllAdviceChatsAction()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear chats.")
    } finally {
      setClearingAll(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalCount} advice {totalCount === 1 ? "chat" : "chats"} — not tied to
          a scan
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(value) =>
              handleViewModeChange(value as AdviceChatsViewMode)
            }
            variant="segment"
            roundedSegment
          >
            <TabsList
              className="border border-border"
              aria-label="Chat list layout"
            >
              <TabsTrigger value="grid" className="gap-1.5 px-3">
                <IconLayoutGrid className="size-4" />
                <span className="sr-only sm:not-sr-only">Grid</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5 px-3">
                <IconList className="size-4" />
                <span className="sr-only sm:not-sr-only">Table</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {totalCount > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={clearingAll}
                >
                  {clearingAll ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconTrash className="size-3.5" />
                  )}
                  Clear all chats
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all advice chats?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes every skin advice chat on your
                    account. Scan follow-up chats stay with their reports. This
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleClearAll()}>
                    Clear all chats
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href="/scan">New chat on scan</Link>
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {chats.map((chat) => {
            const deleting = pendingId === chat.id

            return (
              <article
                key={chat.id}
                className="relative surface-panel rounded-xl border border-border/60 p-5 transition-colors hover:bg-muted/30"
              >
                <Link
                  href={`/chats/${chat.id}`}
                  className="flex min-w-0 items-start gap-3 pr-8"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconMessage className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-heading text-sm font-semibold">
                        Skin advice chat
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatChatDate(chat.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {chat.preview}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {chat.messageCount}{" "}
                      {chat.messageCount === 1 ? "message" : "messages"}
                    </p>
                  </div>
                </Link>
                <DeleteChatButton
                  chatId={chat.id}
                  deleting={deleting}
                  onDelete={(id) => void handleDeleteChat(id)}
                  className="absolute top-3 right-3"
                />
              </article>
            )
          })}
        </div>
      ) : (
        <div className="surface-panel rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Updated</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="w-28 text-right">Messages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chats.map((chat) => {
                const deleting = pendingId === chat.id

                return (
                  <TableRow key={chat.id} className="group">
                    <TableCell className="align-top text-muted-foreground">
                      <Link
                        href={`/chats/${chat.id}`}
                        className="block hover:text-foreground"
                      >
                        {formatChatDate(chat.updatedAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-md align-top whitespace-normal">
                      <Link
                        href={`/chats/${chat.id}`}
                        className="block font-medium hover:underline"
                      >
                        Skin advice chat
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {chat.preview}
                      </p>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex h-9 items-center justify-end gap-2">
                        <Link
                          href={`/chats/${chat.id}`}
                          className="tabular-nums text-muted-foreground hover:text-foreground"
                        >
                          {chat.messageCount}
                        </Link>
                        <DeleteChatButton
                          chatId={chat.id}
                          deleting={deleting}
                          onDelete={(id) => void handleDeleteChat(id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ChatsPagination page={page} totalPages={totalPages} />
    </div>
  )
}
