"use client"

import Link from "next/link"
import type { ErrorInfo } from "next/error"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { parseOnboardingStep } from "@/components/onboarding/use-onboarding-step-url"

function OnboardingErrorContent({ retry }: { retry: () => void }) {
  const searchParams = useSearchParams()
  const step = parseOnboardingStep(searchParams.get("step"))
  const callbackUrl = searchParams.get("callbackUrl")
  const params = new URLSearchParams()
  if (step) params.set("step", step)
  if (callbackUrl) params.set("callbackUrl", callbackUrl)
  const query = params.toString()
  const onboardingHref = query ? `/onboarding?${query}` : "/onboarding"

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="max-w-sm space-y-2">
        <h1 className="font-heading text-xl font-medium">Connection hiccup</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We couldn&apos;t reach the server just now. Your progress is saved —
          try again in a moment.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={retry}>
          Try again
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={onboardingHref}>Back to onboarding</Link>
        </Button>
      </div>
    </div>
  )
}

export default function OnboardingError({ unstable_retry }: ErrorInfo) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
          Loading…
        </div>
      }
    >
      <OnboardingErrorContent retry={unstable_retry} />
    </Suspense>
  )
}
