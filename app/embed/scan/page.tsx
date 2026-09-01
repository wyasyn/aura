import Link from "next/link"
import { IconSparkles } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { DotField } from "@/components/ui/dot-field"

export default function EmbedScanPage() {
  return (
    <main className="bg-background text-foreground relative isolate flex min-h-svh items-center justify-center p-6">
      <DotField />
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="font-display text-3xl">Aurora Organics</p>
        <p className="text-muted-foreground text-sm">
          Cosmetic skin wellness scan for Aurora Organics customers.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/scan" target="_top">
            <IconSparkles className="size-4" />
            Open skin scan
          </Link>
        </Button>
        <p className="text-muted-foreground text-xs">
          Embed this page on auroraorganics.co with an iframe pointing to
          /embed/scan.
        </p>
      </div>
    </main>
  )
}
