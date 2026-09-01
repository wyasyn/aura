"use client"

import Image from "next/image"
import { motion, type Variants } from "motion/react"

import { PLACEHOLDER_IMAGES } from "@/lib/marketing/placeholder-images"

export const authContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

export const authItemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
}

/**
 * The split-screen auth layout.
 *
 * Extracted from AuthForm so the forgot-password, reset-password and verify
 * screens stop being plain bordered cards. Landing on one of those used to feel
 * like leaving the product.
 */
export function AuthSplitShell({
  title,
  accent,
  subtitle,
  children,
}: {
  /** First line of the headline. */
  title: React.ReactNode
  /** Second line, set in the display italic. */
  accent: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-background text-foreground flex min-h-svh w-full flex-col font-sans antialiased lg:flex-row">
      <div className="relative hidden w-full flex-col justify-end p-4 lg:flex lg:min-h-svh lg:w-1/2">
        <div className="border-border relative h-full min-h-[480px] w-full overflow-hidden rounded-[32px] border shadow-2xl lg:min-h-0">
          <div className="absolute inset-0">
            <Image
              src={PLACEHOLDER_IMAGES.auth}
              alt="Personalized skincare routine imagery"
              fill
              className="object-cover"
              sizes="50vw"
              priority
            />
          </div>
          <div
            className="from-background/90 via-background/30 to-background/70 absolute inset-0 bg-gradient-to-t"
            aria-hidden
          />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center">
            <p className="font-display text-foreground text-3xl tracking-tight text-balance md:text-4xl lg:text-5xl">
              Understand your skin.
              <br />
              Discover your routine.
            </p>
            <p className="text-muted-foreground mt-4 max-w-sm text-sm text-balance">
              Personalized skin insights, routines, and matches made for you.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <motion.div
          variants={authContainerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[400px]"
        >
          <motion.div
            variants={authItemVariants}
            className="mb-8 text-center lg:text-left"
          >
            <h1 className="font-heading text-foreground text-3xl leading-tight font-medium tracking-tight text-balance md:text-[40px]">
              {title}
              <br />
              <span className="font-display font-normal italic">{accent}</span>
            </h1>
            {subtitle ? (
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </motion.div>

          {children}
        </motion.div>
      </div>
    </div>
  )
}
