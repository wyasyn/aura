import { Suspense } from "react"

import { ChatsList } from "@/components/dashboard/chats-list"
import { DashboardPageHeader } from "@/components/dashboard/page-header"

type ChatsPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function ChatsPage({ searchParams }: ChatsPageProps) {
  const params = await searchParams
  const page = params.page ? Number.parseInt(params.page, 10) : 1

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Skin advice"
        description="Cosmetic guidance chats that are not linked to a scan report."
      />

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading chats…</p>
        }
      >
        <ChatsList page={page} />
      </Suspense>
    </div>
  )
}
