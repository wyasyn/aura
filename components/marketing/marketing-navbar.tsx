"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react"
import { IconMenu2, IconMoon, IconSun } from "@tabler/icons-react"
import { motion, useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"

import brandIcon from "@/app/icon.png"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SPRING_LAYOUT } from "@/lib/ease"
import {
  SECTIONS,
  scrollToSection,
  type SectionId,
} from "@/lib/marketing/sections"
import { cn } from "@/lib/utils"

/** Past this point the bar is over page content and needs its frosted layer. */
const BLUR_BELOW_Y = 8

/**
 * Reading line for the active section, as a fraction of the viewport height.
 * A section becomes current once its top crosses this line.
 */
const ACTIVE_LINE_RATIO = 0.3

/**
 * The last section to have crossed the reading line is the one being read.
 * Resolving from scroll position rather than intersection events keeps the
 * answer correct at any offset, including after a jump link or a page reload
 * partway down.
 */
function resolveActiveSection(): SectionId {
  const line = window.innerHeight * ACTIVE_LINE_RATIO
  let current: SectionId = SECTIONS[0].id

  for (const { id } of SECTIONS) {
    const element = document.getElementById(id)
    if (element && element.getBoundingClientRect().top <= line) {
      current = id
    }
  }

  return current
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Theme" disabled />
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <IconSun className="size-5" aria-hidden />
      ) : (
        <IconMoon className="size-5" aria-hidden />
      )}
    </Button>
  )
}

export function MarketingNavbar() {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  const isLanding = pathname === "/"
  const [activeSection, setActiveSection] = useState<SectionId>("top")
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let ticking = false

    const update = () => {
      setScrolled(window.scrollY > BLUR_BELOW_Y)
      if (isLanding) {
        setActiveSection(resolveActiveSection())
      }
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        update()
        ticking = false
      })
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [isLanding])

  // Section links stay real anchors so they can be opened in a new tab or
  // copied; only a plain left-click on the landing page is taken over to
  // scroll smoothly instead of jumping.
  const handleSectionNav = (
    event: MouseEvent<HTMLAnchorElement>,
    id: SectionId
  ) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    setMenuOpen(false)
    if (!isLanding) return

    event.preventDefault()
    scrollToSection(id)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Transparent over the top of the page; once scrolling starts, a frosted
          layer fades in so the nav stays legible over whatever is behind it. */}
      <div
        className={cn(
          "border-b transition-colors duration-300 motion-reduce:transition-none",
          scrolled
            ? "border-border bg-background/60 backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6"
        >
          <Link
            href="/"
            className="flex min-w-0 shrink items-center gap-2.5 text-foreground transition-colors hover:text-muted-foreground"
          >
            <Image
              src={brandIcon}
              alt=""
              width={32}
              height={32}
              className="size-7 shrink-0 rounded-md"
              style={{ width: "auto", height: "auto" }}
            />
            <span className="truncate font-heading text-sm font-medium tracking-wide">
              Aurora Organics
            </span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {SECTIONS.map(({ id, label }) => {
              const isActive = isLanding && activeSection === id

              return (
                <li key={id}>
                  <Link
                    href={`/#${id}`}
                    onClick={(event) => handleSectionNav(event, id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "relative block rounded-full px-3 py-1.5 text-sm transition-colors outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="marketing-nav-pill"
                        transition={
                          reducedMotion ? { duration: 0 } : SPRING_LAYOUT
                        }
                        className="absolute inset-0 rounded-full bg-muted"
                        aria-hidden
                      />
                    ) : null}
                    <span className="relative">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
            >
              <Link href="/login">Sign in</Link>
            </Button>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className="md:hidden"
                >
                  <IconMenu2 className="size-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                showCloseButton={false}
                className="rounded-t-2xl p-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              >
                <div
                  aria-hidden
                  className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border"
                />
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                <nav
                  aria-label="Mobile"
                  className="flex flex-col gap-1 px-4 pt-4"
                >
                  {SECTIONS.map(({ id, label }) => {
                    const isActive = isLanding && activeSection === id

                    return (
                      <Link
                        key={id}
                        href={`/#${id}`}
                        onClick={(event) => handleSectionNav(event, id)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-3 py-3 text-base transition-colors outline-none",
                          "focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {label}
                        {isActive ? (
                          <span
                            aria-hidden
                            className="size-1.5 rounded-full bg-primary"
                          />
                        ) : null}
                      </Link>
                    )
                  })}

                  <div className="mt-4 grid gap-2 border-t border-border pt-4">
                    <SheetClose asChild>
                      <Button asChild variant="outline" size="lg">
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </SheetClose>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  )
}
