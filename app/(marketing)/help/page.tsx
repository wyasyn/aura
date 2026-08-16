import Link from "next/link"

import { LandingFooter } from "@/components/marketing/landing-footer"
import { FAQ3 } from "@/components/ui/faq-3"
import { MARKETING_FAQ_ITEMS } from "@/lib/marketing/faq-items"

export default function HelpPage() {
  return (
    <>
      <article className="mx-auto max-w-3xl px-6 pt-32 pb-16">
        <header className="mb-10 space-y-3">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Support
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Help center
          </h1>
          <p className="text-sm text-muted-foreground">
            Answers about Aurora Organics, your account, and your data.
          </p>
        </header>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium text-foreground">
              Getting started
            </h2>
            <p>
              Create an account, complete onboarding (including a required
              consent step for photo processing), then start a scan from{" "}
              <Link
                href="/scan"
                className="text-foreground underline underline-offset-4"
              >
                /scan
              </Link>
              . You can upload a photo or use your camera. On-device checks help
              ensure good lighting and framing before analysis. Each scan uses
              one allowance from your tier; your report is saved to your
              dashboard and can be downloaded as a text-only PDF.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium text-foreground">
              Account and onboarding
            </h2>
            <p>
              Sign in with email and password, a one-time code, Google, or Apple
              (where available). After your first sign-in, onboarding collects
              your skin profile, routine, lifestyle, and optional location for
              climate-aware guidance. You must accept photo-processing consent
              before scans can begin. You can update profile details anytime
              from your dashboard settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium text-foreground">
              Scan tiers
            </h2>
            <p>
              Aurora Organics offers three tiers, each with different analysis
              capabilities:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Starter</strong> —
                still-photo scans. New accounts receive three free Starter
                scans.
              </li>
              <li>
                <strong className="text-foreground">Thinking</strong> —
                still-photo scans with deeper AI analysis.
              </li>
              <li>
                <strong className="text-foreground">Pro</strong> — still-photo
                scans plus live camera scans with real-time AI analysis.
              </li>
            </ul>
            <p>
              Each saved analysis uses one scan allowance. Additional scans can
              be purchased by tier when billing is available.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium text-foreground">
              Privacy and your data
            </h2>
            <p>
              Read our{" "}
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-4"
              >
                privacy policy
              </Link>{" "}
              for full details on what we collect, how photos are processed by
              AI, and which third-party providers we use. Logged-in users can
              delete scans, profile data, or their entire account from{" "}
              <Link
                href="/dashboard/privacy"
                className="text-foreground underline underline-offset-4"
              >
                dashboard privacy settings
              </Link>
              . To request deletion by email, use our{" "}
              <Link
                href="/privacy/data-deletion"
                className="text-foreground underline underline-offset-4"
              >
                data deletion request form
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium text-foreground">
              Contact
            </h2>
            <p>
              Still need help? Email{" "}
              <a
                href="mailto:info@auroraorganics.co"
                className="text-foreground underline underline-offset-4"
              >
                info@auroraorganics.co
              </a>{" "}
              and we will get back to you as soon as we can.
            </p>
          </section>
        </div>

        <div className="mt-16">
          <FAQ3
            badge="FAQ"
            heading="Common questions"
            subheading="Quick answers on scans, privacy, your report, and how personalized guidance works."
            items={MARKETING_FAQ_ITEMS}
          />
        </div>
      </article>
      <LandingFooter />
    </>
  )
}
