"use client"

import Image from "next/image"
import Link from "next/link"
import { IconArrowUp, IconArrowUpRight } from "@tabler/icons-react"
import { motion, type Variants } from "motion/react"

import brandIcon from "@/app/icon.png"

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const riseItem: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.6, bounce: 0 },
  },
}

const giantTextVariant: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.8, bounce: 0 },
  },
}

type FooterLink = { label: string; href: string }

export interface Footer20Props {
  brandName?: string
  description?: string
  email?: string
  /**
   * Copyright year, resolved by the server. Reading the clock in here would
   * make the footer unprerenderable, so the caller supplies it.
   */
  year: number
  /** Small print shown beside the copyright line. */
  note?: string
  links?: {
    good: FooterLink[]
    boring: FooterLink[]
    cool: FooterLink[]
  }
}

/** Off-site and mail links get an outbound marker; in-app routes stay plain. */
function isExternal(href: string) {
  return href.startsWith("http") || href.startsWith("mailto:")
}

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <motion.div variants={riseItem} className="flex flex-col gap-5">
      <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {title}
      </h4>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1 text-[15px] transition-colors"
            >
              {link.label}
              {isExternal(link.href) ? (
                <IconArrowUpRight
                  className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export function Footer20({
  brandName = "Aurora Organics",
  description = "Clear skin insights, routines built for you, and product matches you can act on. Thoughtful skincare, made personal.",
  email = "info@auroraorganics.co",
  year,
  note = "Cosmetic and wellness guidance only. Not a medical diagnosis.",
  links = {
    good: [
      { label: "Home", href: "/" },
      { label: "Start your scan", href: "/scan" },
      { label: "Sign in", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
    boring: [
      { label: "Terms of use", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Data deletion", href: "/privacy/data-deletion" },
      { label: "Help", href: "/help" },
    ],
    cool: [
      { label: "Aurora Organics", href: "https://www.auroraorganics.co" },
      { label: "Contact", href: "mailto:info@auroraorganics.co" },
    ],
  },
}: Footer20Props) {
  return (
    <motion.footer
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      className="bg-background border-border text-muted-foreground relative w-full overflow-hidden border-t font-sans"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,var(--primary)_0%,transparent_60%)] opacity-[0.05]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-6 pt-20 md:pt-28">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-8">
          <motion.div
            variants={riseItem}
            className="flex flex-col gap-6 lg:col-span-5 xl:col-span-4"
          >
            <div className="text-foreground flex items-center gap-2.5">
              <Image
                src={brandIcon}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg"
                style={{ width: "auto", height: "auto" }}
              />
              <span className="font-heading mt-0.5 text-lg font-medium tracking-wide">
                {brandName}
              </span>
            </div>

            <p className="max-w-[320px] text-[15px] leading-relaxed">
              {description}
            </p>

            <a
              href={`mailto:${email}`}
              className="text-foreground hover:text-primary group inline-flex w-fit items-center gap-2 text-[17px] transition-colors"
            >
              {email}
              <IconArrowUpRight
                className="size-[18px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
            </a>
          </motion.div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7 lg:gap-8 xl:col-span-8">
            <LinkColumn title="Product" links={links.good} />
            <LinkColumn title="Legal" links={links.boring} />
            <LinkColumn title="Company" links={links.cool} />
          </div>
        </div>

        {/* Oversized wordmark as a closing flourish. It fades into the page
            rather than sitting as a solid block above the fine print. */}
        <motion.div
          variants={giantTextVariant}
          className="mt-16 flex w-full justify-center md:mt-24"
        >
          <span
            aria-hidden
            className="font-display text-primary/20 pointer-events-none w-full translate-y-[0.12em] text-center text-[clamp(3rem,17vw,8.5rem)] leading-none tracking-tighter select-none mask-[linear-gradient(to_bottom,black_35%,transparent_100%)]"
          >
            {brandName}
          </span>
        </motion.div>

        <motion.div
          variants={riseItem}
          className="border-border/60 flex flex-col-reverse items-center gap-4 border-t py-8 text-sm sm:flex-row sm:justify-between"
        >
          <p className="text-center sm:text-left">
            &copy; {year} {brandName}. All rights reserved.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <p className="text-center text-xs sm:text-right">{note}</p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="border-border/60 text-muted-foreground hover:text-foreground hover:border-border focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Back to top"
            >
              <IconArrowUp className="size-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  )
}
