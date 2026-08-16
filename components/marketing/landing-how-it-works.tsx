"use client"

import type { ComponentType } from "react"
import { motion, type Variants } from "motion/react"

import {
  AssessVisual,
  ReportVisual,
  ScanVisual,
} from "@/components/marketing/how-it-works-visuals"
import { EASE_OUT } from "@/lib/ease"

type Step = {
  number: string
  label: string
  title: string
  description: string
  Visual: ComponentType
}

const steps: Step[] = [
  {
    number: "1",
    label: "Step one",
    title: "Take a photo",
    description:
      "Snap once, or upload one you already have. Lighting and framing are checked on your device before anything leaves it.",
    Visual: ScanVisual,
  },
  {
    number: "2",
    label: "Step two",
    title: "See your skin read",
    description:
      "Six dimensions come back as plain bands: hydration, tone, texture, and more. No invented scores.",
    Visual: AssessVisual,
  },
  {
    number: "3",
    label: "Step three",
    title: "Get your report",
    description:
      "Keep the PDF with your bands, your routine, and the Aurora matches picked for your skin.",
    Visual: ReportVisual,
  },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.16 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
}

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-label="How it works"
      className="bg-background relative overflow-hidden py-28 md:py-36"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,var(--primary)_0%,transparent_55%)] opacity-[0.05]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <p className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">
            How it works
          </p>
          <h2 className="font-heading text-foreground text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">
            Three steps to your report
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
            One photo in, a full read out. The whole thing takes about a minute,
            and nothing is stored but the report you keep.
          </p>
        </div>

        <motion.ol
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="relative grid gap-10 md:grid-cols-3 md:gap-6"
        >
          {/* Timeline rail behind the step markers. The markers carry the page
              background, so the dashes only show in the gaps between them. */}
          <div
            className="border-border absolute top-4 right-4 left-4 hidden border-t border-dashed mask-[linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] md:block"
            aria-hidden
          />

          {steps.map((step) => {
            const Visual = step.Visual

            return (
              <motion.li
                key={step.title}
                variants={itemVariants}
                className="relative flex flex-col gap-5"
              >
                <div className="bg-background relative flex w-fit items-center gap-3 pr-3">
                  <span className="bg-primary text-primary-foreground font-heading flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {step.number}
                  </span>
                  <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    {step.label}
                  </span>
                </div>

                <div className="surface-panel border-border/60 h-full rounded-2xl border p-3 transition-shadow duration-300 hover:shadow-md sm:p-4">
                  <Visual />

                  <div className="space-y-2 px-2 pt-5 pb-3 sm:px-3 sm:pb-4">
                    <h3 className="font-heading text-foreground text-lg font-semibold">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </motion.ol>
      </div>
    </section>
  )
}
