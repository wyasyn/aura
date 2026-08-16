"use client"

import Image from "next/image"
import Link from "next/link"
import { IconGift, IconLock } from "@tabler/icons-react"
import { motion, type Variants } from "motion/react"

import { FramedPanel } from "@/components/marketing/framed-panel"
import { IphoneMockup } from "@/components/marketing/iphone-mockup"
import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/ease"

import reportDark from "../../assets/cta-report-dark.webp"
import reportLight from "../../assets/cta-report-light.webp"

const SCREENSHOT_ALT =
  "Aura skin report on a phone, showing band levels across six key skin areas"

const SCREEN_SIZES = "(max-width: 640px) 230px, (max-width: 1024px) 248px, 264px"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
}

function CtaPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[230px] sm:max-w-[248px] lg:max-w-[264px]">
      <div
        className="bg-primary/20 pointer-events-none absolute inset-x-[-18%] top-1/4 bottom-1/4 rounded-full blur-3xl"
        aria-hidden
      />

      {/* Both captures are cut to the phone panel aspect, so each fills the
          screen and only the active theme copy is displayed. */}
      <IphoneMockup className="relative">
        <Image
          src={reportLight}
          alt={SCREENSHOT_ALT}
          fill
          sizes={SCREEN_SIZES}
          className="object-cover dark:hidden"
        />
        <Image
          src={reportDark}
          alt={SCREENSHOT_ALT}
          fill
          sizes={SCREEN_SIZES}
          className="hidden object-cover dark:block"
        />
      </IphoneMockup>
    </div>
  )
}

export function LandingCta() {
  return (
    <section
      aria-label="Start your scan"
      className="bg-muted/30 relative overflow-hidden py-28 md:py-36"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,var(--primary)_0%,transparent_55%)] opacity-[0.06]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <FramedPanel className="border-border/60 bg-muted/25 overflow-visible">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="bg-card/40 relative grid items-center gap-10 overflow-hidden px-6 py-12 sm:px-10 lg:grid-cols-2 lg:gap-12 lg:py-14 lg:pr-8"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_100%_50%,var(--primary)_0%,transparent_55%)] opacity-[0.07]"
              aria-hidden
            />

            <div className="relative flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              <motion.p
                variants={itemVariants}
                className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
              >
                Start free
              </motion.p>

              <motion.h2
                variants={itemVariants}
                className="font-heading text-foreground max-w-md text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl"
              >
                Your skin report is one photo away
              </motion.h2>

              <motion.div variants={itemVariants}>
                <Button asChild size="lg">
                  <Link href="/scan">Start your free scan</Link>
                </Button>
              </motion.div>

              <motion.ul
                variants={itemVariants}
                className="text-muted-foreground flex flex-col items-center gap-2 text-sm sm:flex-row sm:gap-x-5 lg:items-start"
              >
                <li className="flex items-center gap-2">
                  <IconGift
                    className="text-primary size-4 shrink-0"
                    aria-hidden
                  />
                  Three free scans, no card
                </li>
                <li className="flex items-center gap-2">
                  <IconLock
                    className="text-primary size-4 shrink-0"
                    aria-hidden
                  />
                  Photo never stored
                </li>
              </motion.ul>
            </div>

            <motion.div
              variants={itemVariants}
              className="relative flex justify-center lg:justify-end"
            >
              <CtaPhone />
            </motion.div>
          </motion.div>
        </FramedPanel>
      </div>
    </section>
  )
}
