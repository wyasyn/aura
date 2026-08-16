"use client"

import { NotFoundGlitch } from "@/components/motion/not-found/glitch"

type ErrorViewProps = {
  retry: () => void
}

export function ErrorView({ retry }: ErrorViewProps) {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-6 py-12">
      <NotFoundGlitch
        code="500"
        title="Something went wrong"
        description="We hit a snag loading this page. Try again or head home."
        homeHref="/"
        homeLabel="Back home"
        retryLabel="Try again"
        onRetry={retry}
      />
    </div>
  )
}
