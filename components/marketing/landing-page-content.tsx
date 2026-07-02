import Image from "next/image"
import Link from "next/link"
import {
  IconArrowRight,
  IconBottle,
  IconBrain,
  IconCamera,
  IconChartAreaLine,
  IconCheck,
  IconChevronLeft,
  IconClipboardText,
  IconCloud,
  IconDeviceMobile,
  IconDownload,
  IconDroplet,
  IconFileTypePdf,
  IconFileAnalytics,
  IconFlask,
  IconLeaf,
  IconLock,
  IconMapPin,
  IconMicroscope,
  IconPlant,
  IconReportAnalytics,
  IconRosetteDiscountCheck,
  IconShieldCheck,
  IconSparkles,
  IconStarFilled,
  IconStethoscope,
  IconSunHigh,
  IconTemperature,
  IconUserCheck,
  IconUsers,
  IconWind,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

const trustItems = [
  { label: "AI Vision", icon: IconBrain, status: "Live" },
  { label: "Dermatology-Inspired", icon: IconMicroscope, status: null },
  { label: "Ingredient Intelligence", icon: IconFlask, status: "Coming soon" },
  { label: "Climate-Aware", icon: IconCloud, status: "Roadmap" },
  { label: "Ayurvedic Wellness", icon: IconLeaf, status: "Roadmap" },
] as const

const steps = [
  {
    title: "Capture",
    text: "Take a selfie or upload a clear image.",
    icon: IconCamera,
  },
  {
    title: "Analyze",
    text: "AI reviews visible cosmetic skin indicators.",
    icon: IconBrain,
  },
  {
    title: "Personalize",
    text: "Recommendations adapt to the visible skin profile and Aurora routine options.",
    icon: IconSparkles,
  },
  {
    title: "Report",
    text: "Download a clear cosmetic skin wellness report.",
    icon: IconDownload,
  },
] as const

const features = [
  {
    title: "AI Skin Analysis",
    text: "Reviews visible texture, pores, redness, tone unevenness, and fine-line indicators.",
    icon: IconFileAnalytics,
    status: "Live",
  },
  {
    title: "Personalized Routines",
    text: "Suggests Aurora products based on cosmetic skin needs and preferences.",
    icon: IconBottle,
    status: "Live",
  },
  {
    title: "Ingredient Intelligence",
    text: "Roadmap support for explaining INCI ingredient roles in simple language.",
    icon: IconFlask,
    status: "Roadmap",
  },
  {
    title: "Climate Intelligence",
    text: "Future platform capability for adapting routines using humidity, UV, and weather context.",
    icon: IconCloud,
    status: "Coming soon",
  },
  {
    title: "PDF Reports",
    text: "Generates clean downloadable cosmetic wellness reports for reference.",
    icon: IconReportAnalytics,
    status: "Live",
  },
  {
    title: "Admin Dashboard",
    text: "A live admin workspace for reviewing reports, user activity, and platform operations.",
    icon: IconChartAreaLine,
    status: "Live",
  },
  {
    title: "Skin History",
    text: "Roadmap capability for helping users track cosmetic skin changes over time.",
    icon: IconClipboardText,
    status: "Roadmap",
  },
] as const

const products = [
  {
    name: "Aurora Gentle Cleanser",
    purpose: "Daily cleanse",
    bestFor: "Sensitive-feeling and balanced skin routines",
    reason: "Recommended to prepare skin without a stripped appearance.",
  },
  {
    name: "Aurora Glow Serum",
    purpose: "Tone support",
    bestFor: "Mild tone unevenness and dullness appearance",
    reason: "Matched to visible glow and uneven tone indicators.",
  },
  {
    name: "Aurora Daily Moisture Cream",
    purpose: "Barrier comfort",
    bestFor: "Moderate dryness signs and comfort needs",
    reason: "Selected to support a smoother, more comfortable routine.",
  },
] as const

const audiences = [
  ["Consumers", "Live AI skin scans, cosmetic reports, and Aurora product recommendations."],
  ["Admin Teams", "Live dashboard access for reviewing activity and managing platform operations."],
  ["Clinics", "Roadmap support for cosmetic intake and education workflows."],
  ["Salons & Spas", "Roadmap routines that can support premium treatment plans."],
  ["Beauty Brands", "Future platform capability for smarter product matching journeys."],
  ["Dermatology Experts", "Coming soon consult workflows for users needing expert guidance."],
  ["Ayurvedic Experts", "Coming soon wellness-aware ingredient and routine education."],
] as const

const privacyItems = [
  ["Consent before scan", IconUserCheck],
  ["Minimal photo retention", IconCamera],
  ["Secure report access", IconLock],
  ["Encrypted transport", IconShieldCheck],
  ["Delete path", IconRosetteDiscountCheck],
  ["Admin audit trail", IconClipboardText],
] as const

const faqs = [
  [
    "Is Aurora SkinSense a medical diagnosis tool?",
    "No. It provides cosmetic skin wellness insights and product recommendations only.",
  ],
  ["Do users need to install an app?", "No. It works through the web browser."],
  [
    "Does it store my photo?",
    "The intended privacy-first design stores the report by default, not the photo, unless explicit consent is given.",
  ],
  [
    "Can clinics use it?",
    "Yes. The roadmap includes white-label SaaS features for clinics, salons, and brands.",
  ],
  [
    "What does the AI analyze?",
    "Visible cosmetic indicators such as texture, tone unevenness, redness appearance, pores, and fine-line indicators.",
  ],
] as const

function SectionIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string
  title: string
  text?: string
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
        {title}
      </h2>
      {text ? (
        <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">{text}</p>
      ) : null}
    </div>
  )
}

function StatusBadge({ label }: { label: "Live" | "Coming soon" | "Roadmap" }) {
  return (
    <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
      {label}
    </span>
  )
}

function HeroSection() {
  const bullets = [
    "AI-powered cosmetic analysis",
    "Privacy-first scan flow",
    "Personalized Aurora recommendations",
  ]

  return (
    <section className="overflow-hidden border-b border-border bg-muted/30">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-xs font-semibold tracking-widest text-primary uppercase shadow-sm">
            <IconSparkles className="size-4 text-primary" />
            AI-POWERED SKIN INTELLIGENCE
          </p>
          <h1 className="font-display text-5xl leading-none font-semibold tracking-normal text-foreground md:text-7xl">
            <span className="block">AI Skin Intelligence</span>
            <span className="block">That Understands</span>
            <span className="block italic text-primary">Your Skin</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Scan your skin in seconds using your phone or laptop camera and receive
            personalized cosmetic insights, Aurora skincare recommendations, and a
            downloadable cosmetic wellness report.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-14 px-8 text-sm">
              <Link href="/scan">
                <IconCamera className="size-5" />
                Start Free Skin Scan
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 text-sm">
              <Link href="#sample-report">View Sample Report</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {bullets.map((bullet) => (
              <div key={bullet} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <IconCheck className="size-4" />
                </span>
                {bullet}
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-4 rounded-lg border border-border bg-background p-5 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-lg border border-border text-foreground">
                <IconShieldCheck className="size-7" />
              </span>
              <div>
                <p className="text-sm font-medium">Trusted by skincare enthusiasts</p>
                <div className="mt-2 flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <IconStarFilled key={index} className="size-4" />
                  ))}
                </div>
              </div>
            </div>
            <div className="hidden h-12 w-px bg-border sm:block" />
            <div className="flex items-center gap-3">
              {["A", "U", "R", "A"].map((initial, index) => (
                <span
                  key={`${initial}-${index}`}
                  className="flex size-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold"
                >
                  {initial}
                </span>
              ))}
              <div>
                <p className="font-heading text-lg font-semibold">10K+</p>
                <p className="text-xs text-muted-foreground">Scans completed</p>
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-2xl rounded-lg border border-border bg-background/80 p-4 text-sm leading-6 text-muted-foreground">
            <IconShieldCheck className="mr-2 inline size-5 text-primary" />
            Aurora SkinSense provides cosmetic skin wellness insights and product
            recommendations. It is not a medical diagnosis tool.
          </p>
        </div>
        <div className="relative min-h-[42rem]">
          <IconLeaf className="absolute bottom-8 right-2 size-32 text-primary/10" />
          <HeroMockup />
          <HeroResults />
        </div>
      </div>
    </section>
  )
}

function HeroMockup() {
  const progress = ["Lighting", "Face", "Analysis", "Report"]

  return (
    <div className="absolute left-1/2 top-6 z-20 w-full max-w-sm -translate-x-1/2 lg:left-[43%]">
      <div className="absolute inset-y-20 -left-20 right-0 rounded-full border border-dashed border-primary/30" />
      <div className="relative rounded-4xl border border-border bg-background p-3 shadow-xl">
        <div className="relative min-h-[34rem] overflow-hidden rounded-3xl border border-border bg-muted">
          <Image
            src="/Pasted image (3).png"
            alt="AI skin scan preview"
            width={1024}
            height={1536}
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-5 text-primary-foreground">
            <IconChevronLeft className="size-5" />
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="size-2 rounded-full bg-primary" />
              Scanning...
            </div>
            <IconSparkles className="size-5" />
          </div>
          <div className="absolute inset-0 bg-primary/10" />
          <div className="absolute left-1/2 top-28 z-20 h-80 w-56 -translate-x-1/2 rounded-[45%] border border-primary/30" />
          <div className="absolute left-[24%] right-[24%] top-44 z-30 grid grid-cols-4 gap-4">
            {Array.from({ length: 28 }).map((_, index) => (
              <span key={index} className="size-1 rounded-full bg-primary/60" />
            ))}
          </div>
          <div className="absolute inset-x-8 bottom-6 z-30">
            <div className="mb-4 flex items-center">
              {progress.map((step, index) => (
                <div key={step} className="flex flex-1 items-center">
                  <span className="flex size-5 items-center justify-center rounded-full bg-background text-primary">
                    {index < 3 ? <IconCheck className="size-3" /> : null}
                  </span>
                  {index < progress.length - 1 ? (
                    <span className="h-1 flex-1 bg-background/70" />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-primary-foreground">
              {progress.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroResults() {
  const overview = [
    ["Texture", "Balanced"],
    ["Pigmentation", "Mild"],
    ["Hydration Signs", "Moderate"],
    ["Redness Appearance", "Low"],
  ] as const

  return (
    <div className="absolute inset-y-0 right-0 z-30 hidden w-80 content-center gap-4 lg:grid">
      <div className="rounded-xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-5 flex items-center gap-3">
          <IconSparkles className="size-5 text-primary" />
          <h2 className="font-heading text-base font-semibold">Your Skin Overview</h2>
        </div>
        <div className="grid gap-4">
          {overview.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold text-primary">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-5 flex items-center gap-3">
          <IconBottle className="size-5 text-primary" />
          <h2 className="font-heading text-base font-semibold">Recommended For You</h2>
        </div>
        <div className="flex gap-5">
          <div className="flex h-32 w-24 shrink-0 items-end justify-center rounded-lg border border-border bg-muted pb-4">
            <div className="relative h-24 w-10 rounded-b-lg rounded-t-sm border border-primary/40 bg-background shadow-sm">
              <div className="absolute -top-4 left-1/2 h-5 w-4 -translate-x-1/2 rounded-t-sm border border-primary/40 bg-background" />
              <div className="absolute inset-x-1 top-8 rounded-sm border border-border bg-muted px-1 py-2 text-center font-mono text-[0.55rem] leading-none text-muted-foreground">
                AURORA
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold">Aurora Glow Serum</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Brightening - Hydrating - Radiance Boost
            </p>
            <div className="mt-3 flex items-center gap-1 text-primary">
              {Array.from({ length: 5 }).map((_, index) => (
                <IconStarFilled key={index} className="size-3.5" />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">(4.8)</span>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/scan">
                View Product
                <IconArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-5 rounded-xl border border-border bg-background p-6 shadow-lg">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <IconCheck className="size-5 text-primary" />
            <h2 className="font-heading text-base font-semibold">Report Ready</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Your personalized cosmetic wellness report is ready to download.
          </p>
        </div>
        <span className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted text-primary">
          <IconFileTypePdf className="size-10" />
        </span>
      </div>
      <div className="absolute -bottom-16 right-0 hidden items-end gap-4 lg:flex">
        <div className="flex h-24 w-32 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
          <div className="h-14 w-20 rounded-t-full border border-primary/40 bg-muted" />
        </div>
        <div className="h-28 w-12 rounded-full border border-border bg-background shadow-sm" />
      </div>
    </div>
  )
}

function TrustStrip() {
  return (
    <section id="technology" className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
        {trustItems.map(({ label, icon: Icon, status }) => (
          <div key={label} className="flex items-center gap-4">
            <Icon className="size-8 shrink-0 text-primary" />
            <div className="grid gap-1">
              <span className="font-heading text-base font-semibold text-foreground">{label}</span>
              {status ? (
                <span className="text-sm text-muted-foreground">{status}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="How it works"
          title="From selfie to cosmetic skin insight in a guided flow"
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ title, text, icon: Icon }, index) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ScanPreview() {
  const checks = ["Lighting check", "Face detected", "Skin zones reviewed", "Report ready"]

  return (
    <section className="border-y border-border bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">
            Live AI scan preview
          </p>
          <h2 className="text-3xl font-semibold md:text-4xl">See the scan journey in action</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Aurora SkinSense guides users from image capture to cosmetic insight with a
            simple, privacy-first flow.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              "Camera and upload support",
              "Image quality guidance",
              "Coarse confidence bands",
              "Report generated after consent",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                <IconCheck className="size-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Scan progress
              </p>
              <p className="mt-1 font-heading text-xl font-semibold">Quality review</p>
            </div>
            <IconDeviceMobile className="size-7 text-primary" />
          </div>
          <div className="mt-6 h-3 rounded-full bg-muted">
            <div className="h-3 w-4/5 rounded-full bg-primary" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-[0.8fr_1fr]">
            <div className="relative min-h-64 rounded-xl border border-border bg-muted">
              <div className="absolute inset-x-8 top-8 h-44 rounded-full border border-primary/60" />
              <div className="absolute inset-x-14 top-20 h-20 rounded-full border border-border" />
              <div className="absolute inset-x-10 bottom-6 rounded-lg bg-background p-3 text-center text-xs text-muted-foreground">
                User consent confirmed
              </div>
            </div>
            <div className="grid content-center gap-3">
              {checks.map((check) => (
                <div key={check} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconCheck className="size-4" />
                  </span>
                  <span className="text-sm font-medium">{check}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureGrid() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Core features"
          title="A practical skin intelligence layer for modern beauty journeys"
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, text, icon: Icon, status }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <Icon className="size-7 text-primary" />
                <StatusBadge label={status} />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ReportPreview() {
  const metrics = [
    ["Visible texture", "Smooth"],
    ["Tone unevenness", "Mild"],
    ["Redness appearance", "Low"],
    ["Fine-line indicators", "Low"],
    ["Hydration appearance", "Moderate dryness signs"],
  ] as const

  return (
    <section id="sample-report" className="border-y border-border bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Sample report"
          title="A clear cosmetic skin report users can keep"
          text="Designed for honest, readable bands instead of invented precision."
        />
        <div className="mt-12 rounded-2xl border border-border bg-card p-4 shadow-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="rounded-xl border border-border bg-background p-6">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Overall cosmetic skin profile
                </p>
                <h3 className="mt-3 text-2xl font-semibold">
                  Balanced with mild dryness indicators
                </h3>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {metrics.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
                Cosmetic wellness guidance only - not a medical diagnosis.
              </p>
            </div>
            <div className="grid gap-4">
              {products.map((product) => (
                <div key={product.name} className="flex gap-4 rounded-xl border border-border bg-background p-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <IconBottle className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold">{product.name}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{product.purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductRecommendations() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Aurora recommendations"
          title="Personalized Aurora product routines"
          text="Live Aurora recommendations are matched to visible cosmetic skin indicators. Ingredient compatibility and environmental context are roadmap intelligence layers."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {products.map((product) => (
            <div key={product.name} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="relative mb-6 flex h-36 items-center justify-center rounded-lg border border-border bg-muted">
                <Image
                  src="/aurora-skin-product.svg"
                  alt=""
                  width={160}
                  height={160}
                  className="h-28 w-auto"
                />
              </div>
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                {product.purpose}
              </p>
              <h3 className="mt-3 text-xl font-semibold">{product.name}</h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">Best for:</span> {product.bestFor}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">Why:</span> {product.reason}
              </p>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link href="/scan">View Routine</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClimateIngredient() {
  const climate = [
    ["Humidity", "Balanced", IconDroplet],
    ["UV Index", "Moderate", IconSunHigh],
    ["Temperature", "Warm", IconTemperature],
    ["Air quality", "Fair", IconWind],
  ] as const

  return (
    <section className="border-y border-border bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex items-start justify-between gap-3">
            <IconMapPin className="size-7 text-primary" />
            <StatusBadge label="Roadmap" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">Climate-aware skincare</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Future platform capability where routine suggestions adapt to environmental
            stressors.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {climate.map(([label, value, Icon]) => (
              <div key={label} className="rounded-lg border border-border bg-background p-4">
                <Icon className="size-5 text-primary" />
                <p className="mt-3 text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex items-start justify-between gap-3">
            <IconFlask className="size-7 text-primary" />
            <StatusBadge label="Coming soon" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">Ingredient intelligence</h2>
          <div className="mt-6 rounded-xl border border-border bg-background p-6">
            <p className="font-mono text-sm text-primary">Niacinamide</p>
            <div className="mt-5 grid gap-3">
              {[
                "Supports uneven tone appearance",
                "Pairs well with moisturizers",
                "Common in brightening routines",
              ].map((item) => (
                <div key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <IconCheck className="size-4 shrink-0 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TeleDermatology() {
  const experts = [
    ["Dermatologists", IconStethoscope],
    ["Aestheticians", IconSparkles],
    ["Ayurvedic Practitioners", IconPlant],
    ["Herbalists", IconLeaf],
  ] as const

  return (
    <section id="clinics" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                Tele-dermatology preview
              </p>
              <StatusBadge label="Coming soon" />
            </div>
            <h2 className="text-3xl font-semibold md:text-4xl">
              Future expert support when users need more guidance
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              This is a roadmap marketplace capability. It is not live yet, but future
              releases can connect users with dermatologists, aestheticians, herbalists,
              and Ayurvedic practitioners for professional consultations.
            </p>
            <Button asChild className="mt-8">
              <Link href="/login">Join Expert Waitlist</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {experts.map(([expert, Icon]) => (
              <div key={expert} className="rounded-xl border border-border bg-background p-5">
                <div className="flex items-start justify-between gap-3">
                  <Icon className="size-6 text-primary" />
                  <StatusBadge label="Roadmap" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold">{expert}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function WhoItServes() {
  return (
    <section className="border-y border-border bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro eyebrow="Who it serves" title="Built for wellness, retail, and expert workflows" />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audiences.map(([title, text]) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <IconUsers className="size-6 text-primary" />
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SecurityPrivacy() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Security & privacy"
          title="Built with privacy at the center"
          text="The scan experience is designed around consent, minimal retention, and clear user control."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {privacyItems.map(([item, Icon]) => (
            <div key={item} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <Icon className="size-6 text-primary" />
              <h3 className="mt-5 font-heading text-lg font-semibold">{item}</h3>
            </div>
          ))}
        </div>
        <p className="mt-8 rounded-lg border border-border bg-muted p-4 text-sm leading-6 text-muted-foreground">
          By default, the product should store the report, not the original photo, unless
          the user explicitly consents.
        </p>
      </div>
    </section>
  )
}

function FAQSection() {
  return (
    <section id="faq" className="border-y border-border bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <SectionIntro eyebrow="FAQ" title="Clear answers before the first scan" />
        <div className="mt-12 grid gap-4">
          {faqs.map(([question, answer]) => (
            <div key={question} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-heading text-lg font-semibold">{question}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-primary p-8 text-center text-primary-foreground shadow-sm md:p-12">
        <h2 className="text-3xl font-semibold md:text-5xl">
          Discover what your skin has been trying to tell you.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-primary-foreground/80">
          Start with a simple scan and receive cosmetic skin insights, Aurora product
          recommendations, and a downloadable report.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="secondary" size="lg">
            <Link href="/scan">Start Free Skin Scan</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
            <Link href="#sample-report">View Sample Report</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  const columns = [
    ["Product", "AI Skin Analysis", "Product Recommendations", "PDF Reports", "Climate Intelligence (Roadmap)"],
    ["Platform", "For Consumers", "Admin Dashboard", "For Clinics (Roadmap)", "Expert Marketplace (Coming soon)"],
    ["Company", "About Aurora", "Contact", "Privacy", "Terms"],
  ] as const

  return (
    <footer className="border-t border-border px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_1.4fr]">
        <div>
          <Link href="/" className="font-heading text-lg font-semibold">
            Aurora SkinSense
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Aurora SkinSense provides cosmetic wellness guidance only and is not a medical
            diagnostic tool.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map(([title, ...links]) => (
            <div key={title}>
              <h3 className="font-heading text-sm font-semibold">{title}</h3>
              <div className="mt-4 grid gap-3">
                {links.map((link) => (
                  <Link
                    key={link}
                    href="/"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}

export function LandingPageContent() {
  return (
    <div className="flex flex-col bg-background text-foreground">
      <HeroSection />
      <TrustStrip />
      <HowItWorks />
      <ScanPreview />
      <FeatureGrid />
      <ReportPreview />
      <ProductRecommendations />
      <ClimateIngredient />
      <TeleDermatology />
      <WhoItServes />
      <SecurityPrivacy />
      <FAQSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  )
}
