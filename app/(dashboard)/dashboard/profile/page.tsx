import { Suspense } from "react"

import { ProfileEditorLoader } from "@/components/dashboard/profile-editor-loader"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { ProfileSkeleton } from "@/components/dashboard/skeletons/profile-skeleton"

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Profile"
        description="Update your wellness profile, routine, and location. Cosmetic self-report only — not a medical record."
      />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileEditorLoader />
      </Suspense>
    </div>
  )
}
