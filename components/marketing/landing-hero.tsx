"use client"

import Image from "next/image"
import Link from "next/link"
import { IconGift, IconLock } from "@tabler/icons-react"
import { motion, useReducedMotion, type Variants } from "motion/react"

import { FramedPanel } from "@/components/marketing/framed-panel"
import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/ease"
import { scrollToSection } from "@/lib/marketing/sections"
import { PLACEHOLDER_IMAGES } from "@/lib/marketing/placeholder-images"
import { formatBand } from "@/lib/scan/format"
import type { AssessmentBand } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
}

const staticVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
}

/**
 * Illustrative rows for the hero preview card, labelled "Sample" in the UI.
 * Uses the real dimension names and band vocabulary so the hero promises
 * exactly what a report delivers.
 */
const PREVIEW_ROWS: ReadonlyArray<{ label: string; band: AssessmentBand }> = [
  { label: "Hydration", band: "moderate" },
  { label: "Redness", band: "mild" },
  { label: "Texture & pores", band: "minimal" },
]

/** Concern level rises with the band, so more segments means more to work on. */
const BAND_STEPS: Record<AssessmentBand, number> = {
  not_assessed: 0,
  minimal: 1,
  mild: 2,
  moderate: 3,
  elevated: 4,
}

const TOTAL_STEPS = 4

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--primary)_0%,transparent_55%)] opacity-[0.08]" />
      {/* Same dot language as the scan flow (.dot-field), held at half strength
          so it registers as texture without competing with the headline. The
          mask falls off gently instead of clipping the field mid-section. */}
      <div className="dot-field absolute inset-0 mask-[radial-gradient(ellipse_110%_95%_at_50%_45%,black_35%,transparent_100%)] opacity-50 md:mask-[radial-gradient(ellipse_95%_105%_at_68%_50%,black_35%,transparent_100%)]" />
    </div>
  )
}

function BandMeter({ band }: { band: AssessmentBand }) {
  const steps = BAND_STEPS[band]

  return (
    <span className="mt-1.5 flex gap-1" aria-hidden>
      {Array.from({ length: TOTAL_STEPS }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full",
            index < steps ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </span>
  )
}

/**
 * Shows the shape of a report over the hero image, so the promise in the
 * headline is visible before anyone scrolls.
 */
function HeroPreviewCard() {
  return (
    <figure className="absolute right-6 bottom-6 left-6 rounded-xl border border-border bg-background/85 p-4 shadow-lg backdrop-blur-md sm:left-auto sm:w-72">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="font-heading text-xs tracking-wider text-muted-foreground uppercase">
          Your read
        </span>
        <span className="text-[11px] text-muted-foreground">Sample</span>
      </figcaption>

      <ul className="mt-3 flex flex-col gap-2.5">
        {PREVIEW_ROWS.map(({ label, band }) => (
          <li key={label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-foreground">{label}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatBand(band)}
              </span>
            </div>
            <BandMeter band={band} />
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
        Six dimensions in every report
      </p>
    </figure>
  )
}

export function LandingHero() {
  const reducedMotion = useReducedMotion()
  const item = reducedMotion ? staticVariants : itemVariants

  return (
    <section
      id="top"
      aria-label="Hero"
      className="relative overflow-hidden bg-background lg:min-h-svh"
    >
      <HeroBackground />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-36 pb-20 lg:min-h-svh lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-40 lg:pb-24"
      >
        <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
          <motion.p
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground sm:text-sm"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            Personalized from one photo
          </motion.p>

          <motion.h1
            variants={item}
            className="max-w-xl font-display text-4xl leading-[1.1] tracking-tight text-balance text-foreground md:text-5xl lg:text-6xl"
          >
            Know your skin.
            <br />
            Find what fits.
          </motion.h1>

          <motion.p
            variants={item}
            className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Take one photo and get a clear, honest read on your skin. Then get
            Aurora matches and a routine shaped around you, your allergies, and
            your climate. Keep the report. Rescan whenever your skin changes.
          </motion.p>

          <motion.div
            variants={item}
            className="grid w-full grid-cols-1 gap-3 sm:w-fit sm:grid-cols-2"
          >
            <Button asChild size="lg" className="w-full">
              <Link href="/scan">Start your free scan</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => scrollToSection("how-it-works")}
            >
              See how it works
            </Button>
          </motion.div>

          <motion.ul
            variants={item}
            className="flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-x-5"
          >
            <li className="flex items-center gap-2">
              <IconGift className="size-4 shrink-0 text-primary" aria-hidden />
              One free scan, no card required
            </li>
            <li className="flex items-center gap-2">
              <IconLock className="size-4 shrink-0 text-primary" aria-hidden />
              Your photo is never stored
            </li>
          </motion.ul>
        </div>

        <motion.div
          variants={item}
          className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
        >
          <div
            className="pointer-events-none absolute inset-x-[-8%] top-1/4 bottom-1/4 rounded-full bg-primary/20 blur-3xl"
            aria-hidden
          />

          <FramedPanel
            className="relative"
            innerClassName="relative aspect-[4/5]"
          >
            <Image
              src={PLACEHOLDER_IMAGES.hero}
              alt="Personalized skincare routine, Aurora Organics wellness imagery"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 28rem, 45vw"
              priority
            />
          </FramedPanel>

          <HeroPreviewCard />
        </motion.div>
      </motion.div>
    </section>
  )
}
