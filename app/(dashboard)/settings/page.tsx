import { Suspense } from "react"

import { ClimateSection } from "@/components/dashboard/climate-section"
import { SettingsAccountSection } from "@/components/dashboard/settings-account-section"
import { SettingsPageHeader } from "@/components/dashboard/settings-page-header"
import { SettingsTabs } from "@/components/dashboard/settings-tabs"
import { ClimateSectionSkeleton } from "@/components/dashboard/skeletons/climate-section-skeleton"
import { PageHeaderSkeleton } from "@/components/dashboard/skeletons/page-header-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

function AccountSectionSkeleton() {
  return (
    <section className="rounded-xl border border-border/60 p-5">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-4 w-48" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </section>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<PageHeaderSkeleton withBadge />}>
        <SettingsPageHeader />
      </Suspense>

      <Suspense>
        <SettingsTabs
          account={
            <Suspense fallback={<AccountSectionSkeleton />}>
              <SettingsAccountSection />
            </Suspense>
          }
          climate={
            <Suspense fallback={<ClimateSectionSkeleton />}>
              <ClimateSection />
            </Suspense>
          }
        />
      </Suspense>
    </div>
  )
}
