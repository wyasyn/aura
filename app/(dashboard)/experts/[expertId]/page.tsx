import { Suspense } from "react"

import { ExpertProfileLoader } from "@/components/experts/expert-profile-loader"
import { Skeleton } from "@/components/ui/skeleton"

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-60 w-full rounded-xl" />
    </div>
  )
}

export default async function ExpertProfilePage({
  params,
}: {
  params: Promise<{ expertId: string }>
}) {
  const { expertId } = await params

  return (
    <div className="space-y-8">
      <Suspense fallback={<ProfileSkeleton />}>
        <ExpertProfileLoader expertId={expertId} />
      </Suspense>
    </div>
  )
}
