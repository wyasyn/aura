import { redirect } from "next/navigation"
import { Suspense } from "react"

import { SocialCompleteFallback } from "@/components/auth/social-complete"
import { completeSignInAction } from "@/lib/auth/post-sign-in"
import { getSession } from "@/lib/auth/session"

export default function SocialCompletePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ callbackUrl?: string }>
}>) {
  return (
    <Suspense fallback={<SocialCompleteFallback />}>
      <SocialCompleteRedirect searchParams={searchParams} />
    </Suspense>
  )
}

async function SocialCompleteRedirect({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}): Promise<never> {
  const { callbackUrl } = await searchParams
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const destination = await completeSignInAction(
    session.user.id,
    session.user.email,
    session.user.name,
    callbackUrl,
  )

  redirect(destination)
}
