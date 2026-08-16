import { Suspense } from "react"

import { UsersTableLoader } from "@/components/dashboard/users-table-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"

function UsersTableSkeleton() {
  return (
    <div className="rounded-xl border border-border/60">
      <div className="border-b border-border p-4">
        <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Users"
        description="Block, change roles or scan tiers, impersonate, or delete user accounts."
        badge="Admin"
      />
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTableLoader />
      </Suspense>
    </div>
  )
}
