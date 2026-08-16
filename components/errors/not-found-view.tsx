"use client"

import { NotFoundGlitch } from "@/components/motion/not-found/glitch"

export function NotFoundView() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-6 py-12">
      <NotFoundGlitch
        code="404"
        title="Page not found"
        description="This page may have moved or no longer exists."
        homeHref="/"
        homeLabel="Back home"
        browseHref="/scan"
        browseLabel="Start a scan"
      />
    </div>
  )
}
