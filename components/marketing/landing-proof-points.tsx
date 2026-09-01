"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import { IconArrowRight } from "@tabler/icons-react"
import { motion, type Variants } from "motion/react"

import {
  AllergyVisual,
  BandsVisual,
  ChatVisual,
  ClimateVisual,
  LeanVisual,
  PrivacyVisual,
} from "@/components/marketing/proof-point-visuals"
import { EASE_OUT } from "@/lib/ease"
import {
  PROOF_POINTS,
  PROOF_SECTION,
  type ProofVisualId,
} from "@/lib/marketing/proof-points"

const VISUALS: Record<ProofVisualId, ComponentType> = {
  bands: BandsVisual,
  lean: LeanVisual,
  allergy: AllergyVisual,
  climate: ClimateVisual,
  privacy: PrivacyVisual,
  chat: ChatVisual,
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
}

export function LandingProofPoints() {
  return (
    <section
      id="what-you-get"
      aria-label="What you get"
      className="bg-muted/30 relative overflow-hidden py-28 md:py-36"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,var(--primary)_0%,transparent_55%)] opacity-[0.04]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <p className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">
            {PROOF_SECTION.badge}
          </p>
          <h2 className="font-heading text-foreground text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">
            {PROOF_SECTION.heading}
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
            {PROOF_SECTION.subheading}
          </p>
        </div>

        {/* Six separate cards read as clutter. One panel split by hairlines
            keeps the set calm and lets each cell stay dense. */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="bg-border/60 border-border/60 grid gap-px overflow-hidden rounded-2xl border shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          {PROOF_POINTS.map((point) => {
            const Visual = VISUALS[point.visual]

            return (
              <motion.div
                key={point.title}
                variants={itemVariants}
                className="bg-card/70 hover:bg-card flex flex-col gap-4 p-5 transition-colors duration-300"
              >
                <Visual />

                <div className="space-y-2">
                  <h3 className="font-heading text-foreground text-lg font-semibold">
                    {point.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          All six in every report.{" "}
          <Link
            href="/scan"
            className="text-foreground hover:text-primary inline-flex items-center gap-1 font-medium transition-colors"
          >
            Start your free scan
            <IconArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>
    </section>
  )
}
