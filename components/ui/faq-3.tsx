"use client"

import type { ReactNode } from "react"
import { IconPlus } from "@tabler/icons-react"
import { motion, type Variants } from "motion/react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQSectionProps {
  badge?: string
  heading: string
  subheading?: string
  items: FAQItem[]
  /** Optional content below the heading, e.g. a link to the help center. */
  aside?: ReactNode
  className?: string
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
}

export function FAQ3({
  badge = "Frequently asked questions",
  heading,
  subheading,
  items,
  aside,
  className,
}: FAQSectionProps) {
  return (
    <section
      className={cn(
        "bg-background relative overflow-hidden py-28 md:py-36",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_0%_20%,var(--primary)_0%,transparent_55%)] opacity-[0.05]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-16">
        <div className="flex w-full flex-col items-center text-center lg:sticky lg:top-28 lg:items-start lg:text-left">
          {badge ? (
            <p className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">
              {badge}
            </p>
          ) : null}

          <h2 className="font-heading text-foreground text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">
            {heading}
          </h2>

          {subheading ? (
            <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-relaxed sm:text-base lg:max-w-md">
              {subheading}
            </p>
          ) : null}

          {aside ? <div className="mt-8 w-full">{aside}</div> : null}
        </div>

        {/* One surface with divided rows keeps a long list quiet; separate cards
            per question compete with the heading for attention. */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="surface-panel border-border/60 w-full min-w-0 overflow-hidden rounded-2xl border"
        >
          <Accordion
            type="single"
            collapsible
            defaultValue="item-0"
            className="w-full"
          >
            {items.map((item, i) => (
              // The row divider lives on the wrapper: AccordionItem's own
              // not-last rule cannot see its siblings through it.
              <motion.div
                key={item.question}
                variants={itemVariants}
                className="border-border/50 not-last:border-b"
              >
                <AccordionItem
                  value={`item-${i}`}
                  className="group transition-colors duration-300 data-[state=open]:bg-muted/25"
                >
                  <AccordionTrigger
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-5 rounded-none px-5 py-5 transition-colors hover:bg-muted/20 hover:no-underline sm:px-6",
                      "[&_[data-slot=accordion-trigger-icon]]:!hidden",
                      "focus-visible:border-transparent focus-visible:ring-0",
                    )}
                  >
                    <span className="text-foreground flex-1 text-left text-[15px] leading-snug font-medium sm:text-base">
                      {item.question}
                    </span>

                    <span className="text-muted-foreground group-data-[state=open]:bg-primary/12 group-data-[state=open]:text-primary flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 transition-all duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:border-transparent">
                      <IconPlus className="size-4" />
                    </span>
                  </AccordionTrigger>

                  <AccordionContent className="px-5 pt-0 pb-5 sm:px-6">
                    <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
