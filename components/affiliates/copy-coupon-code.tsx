"use client"

import { useState } from "react"
import { IconCheck, IconCopy } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export function CopyCouponCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy}>
      {copied ? (
        <>
          <IconCheck className="size-4" /> Copied
        </>
      ) : (
        <>
          <IconCopy className="size-4" /> Copy code
        </>
      )}
    </Button>
  )
}
