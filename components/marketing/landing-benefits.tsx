"use client"

import { useRef, type ComponentType } from "react"
import {
  IconCamera,
  IconFileDownload,
  IconShieldCheck,
  IconWaveSine,
} from "@tabler/icons-react"
import { motion, type Variants } from "motion/react"

import {
  AmbientBeams,
  AnimatedBeam,
} from "@/components/marketing/animated-beam"
import { FramedPanel } from "@/components/marketing/framed-panel"
import { EASE_OUT } from "@/lib/ease"

type Benefit = {
  Icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

const BENEFITS: Benefit[] = [
  {
    Icon: IconCamera,
    title: "Photo, camera, or live scan",
    description:
      "Upload a photo or scan live. Your device checks lighting and framing first.",
  },
  {
    Icon: IconWaveSine,
    title: "Six plain-language bands",
    description:
      "Hydration, tone, texture and more, in words you can act on. Never invented percentages.",
  },
  {
    Icon: IconShieldCheck,
    title: "Allergy and climate aware",
    description:
      "Full ingredient lists checked against your profile and the conditions where you live.",
  },
  {
    Icon: IconFileDownload,
    title: "A report you keep",
    description:
      "Download the PDF whenever you want. The photo itself is never stored.",
  },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09 },
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

/**
 * Three linked cards showing the pieces the scan brings together: quality
 * gate, skin read, and the matched product. Widths are capped in percentages
 * so the composition survives narrow screens inside its frame.
 */
function BenefitsDiagram() {
  const containerRef = useRef<HTMLDivElement>(null)
  const balanceRef = useRef<HTMLDivElement>(null)
  const qualityRef = useRef<HTMLDivElement>(null)
  const matchRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className="relative h-[400px] w-full max-w-md sm:h-[440px]"
    >
      <AmbientBeams />

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={qualityRef}
        toRef={balanceRef}
        curvature={55}
        delay={0.2}
        duration={4}
        startYOffset={-8}
        endYOffset={12}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={qualityRef}
        toRef={matchRef}
        curvature={-40}
        delay={1.4}
        duration={4.2}
        reverse
        startYOffset={8}
        endYOffset={-8}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={balanceRef}
        toRef={matchRef}
        curvature={70}
        delay={2.6}
        duration={4.5}
        startXOffset={20}
        endXOffset={-10}
      />

      <div
        ref={balanceRef}
        className="border-border/60 bg-background/85 dark:bg-card/80 absolute top-0 left-0 z-10 w-[min(16rem,86%)] space-y-2 rounded-xl border p-4 shadow-md backdrop-blur-md"
      >
        <p className="text-muted-foreground text-xs">Skin balance</p>
        <p className="font-heading text-2xl font-semibold">
          Balanced
          <span className="text-muted-foreground text-sm font-normal">
            {" "}
            band
          </span>
        </p>
        <div className="flex gap-2 text-[10px]">
          <span className="bg-primary/15 text-primary rounded-md px-2 py-0.5">
            Hydration
          </span>
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5">
            Texture
          </span>
        </div>
        <p className="text-muted-foreground text-xs">Even tone: moderate</p>
      </div>

      <div
        ref={qualityRef}
        className="border-border/60 bg-background/90 dark:bg-card/80 absolute top-24 right-0 z-20 w-[min(15rem,80%)] space-y-3 rounded-xl border p-4 shadow-lg backdrop-blur-md"
      >
        <p className="text-muted-foreground text-xs">Scan quality</p>
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">
            Lighting &amp; framing
          </span>{" "}
          passed
        </p>
        <div className="flex h-2 w-full gap-1">
          <div className="bg-primary w-[40%] rounded-full" />
          <div className="bg-primary/60 w-[35%] rounded-full" />
          <div className="bg-primary/30 w-[25%] rounded-full" />
        </div>
        <div className="text-muted-foreground flex gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="bg-primary size-2 rounded-full" />
            Face
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-primary/60 size-2 rounded-full" />
            Light
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-primary/30 size-2 rounded-full" />
            Steady
          </span>
        </div>
      </div>

      <div
        ref={matchRef}
        className="border-border/60 bg-background/90 dark:bg-card/80 absolute bottom-0 left-0 z-10 w-[min(16rem,84%)] space-y-3 rounded-xl border p-4 shadow-lg backdrop-blur-md sm:left-6"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Top match</span>
          <span className="text-muted-foreground text-xs">Aurora</span>
        </div>
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">
            Gentle daily serum
          </span>{" "}
          recommended
        </p>
        <div className="flex gap-2 text-[10px]">
          <span className="bg-primary/15 text-primary rounded-md px-2 py-0.5">
            Routine
          </span>
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5">
            Climate-aware
          </span>
        </div>
      </div>
    </div>
  )
}

export function LandingBenefits() {
  return (
    <section
      id="benefits"
      aria-label="Benefits"
      className="bg-muted/30 relative overflow-hidden py-28 md:py-36"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_100%_10%,var(--primary)_0%,transparent_55%)] opacity-[0.05]"
        aria-hidden
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16"
      >
        <div className="flex flex-col">
          <motion.p
            variants={itemVariants}
            className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase"
          >
            Made for your skin
          </motion.p>

          <motion.h2
            variants={itemVariants}
            className="font-heading text-foreground text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl"
          >
            Guidance that fits you
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed sm:text-base"
          >
            Most skincare advice is written for an average face. Aurora reads
            yours, then filters every recommendation through your allergies,
            your climate, and what your skin is doing today.
          </motion.p>

          {/* One divided surface rather than four small cards: the list is
              supporting detail and should not compete with the heading. */}
          <motion.ul
            variants={itemVariants}
            className="surface-panel border-border/60 divide-border/50 mt-8 divide-y overflow-hidden rounded-2xl border"
          >
            {BENEFITS.map(({ Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3.5 p-4 sm:p-5">
                <span className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium">{title}</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div variants={itemVariants} className="relative">
          <div
            className="bg-primary/15 pointer-events-none absolute inset-x-[-6%] top-1/4 bottom-1/4 rounded-full blur-3xl"
            aria-hidden
          />
          <FramedPanel
            className="border-border/60 relative"
            innerClassName="flex justify-center p-6 sm:p-8"
          >
            <BenefitsDiagram />
          </FramedPanel>
        </motion.div>
      </motion.div>
    </section>
  )
}
