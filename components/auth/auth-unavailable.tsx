"use client"

import { useTransition } from "react"
import { IconRefresh } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

type AuthUnavailableProps = {
  title?: string
  description?: string
}

export function AuthUnavailable({
  title = "Reconnecting",
  description = "The database took too long to respond. This is usually temporary — try again in a few seconds.",
}: AuthUnavailableProps) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4 rounded-[2rem] border border-border bg-background p-6 text-center">
        <h1 className="font-heading text-lg font-semibold text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button
          type="button"
          className="rounded-full"
          disabled={pending}
          onClick={() => {
            startTransition(() => {
              window.location.reload()
            })
          }}
        >
          <IconRefresh className={pending ? "size-4 animate-spin" : "size-4"} />
          {pending ? "Retrying…" : "Try again"}
        </Button>
      </div>
    </div>
  )
}
