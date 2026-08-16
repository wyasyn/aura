import Link from "next/link"
import { IconArrowRight, IconLifebuoy } from "@tabler/icons-react"

import { FAQ3 } from "@/components/ui/faq-3"
import { LANDING_FAQ_ITEMS } from "@/lib/marketing/faq-items"

export function LandingFaq() {
  return (
    <div id="faq">
      <FAQ3
        badge="FAQ"
        heading="Answers before you scan"
        subheading="The short version: how one photo turns into a read of your skin, what happens to that photo afterwards, and what you keep."
        items={LANDING_FAQ_ITEMS}
        aside={
          <div className="border-border/60 bg-card/40 mx-auto flex max-w-sm items-start gap-3 rounded-xl border p-4 text-left lg:mx-0">
            <span className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <IconLifebuoy className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">
                Still wondering something?
              </p>
              <Link
                href="/help"
                className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 text-sm transition-colors"
              >
                Read the help center
                <IconArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        }
      />
    </div>
  )
}
