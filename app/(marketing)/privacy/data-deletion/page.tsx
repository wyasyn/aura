import Link from "next/link"
import { Suspense } from "react"

import { LandingFooter } from "@/components/marketing/landing-footer"
import { DeletionRequestForm } from "@/components/marketing/deletion-request-form"
import { getSession } from "@/lib/auth/session"

async function DeletionRequestSection() {
  const session = await getSession()

  return (
    <DeletionRequestForm
      defaultEmail={session?.user.email ?? ""}
      isLoggedIn={Boolean(session)}
    />
  )
}

export default function DataDeletionPage() {
  return (
    <>
      <article className="mx-auto max-w-3xl px-6 pt-32 pb-16">
        <header className="mb-10 space-y-3">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Privacy
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Request data deletion
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask us to delete personal data associated with your account.
          </p>
        </header>

        <div className="mb-10 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            You have the right to request deletion of your personal data. If you
            are signed in, you can delete data instantly from your dashboard
            without waiting for a support response.
          </p>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium text-foreground">
              Delete from your dashboard
            </h2>
            <p>
              Signed-in users can manage deletion from{" "}
              <Link
                href="/dashboard/privacy"
                className="text-foreground underline underline-offset-4"
              >
                dashboard privacy settings
              </Link>
              :
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">
                  Profile and wellness data
                </strong>{" "}
                — clears skin profile, routine, and lifestyle fields; your
                account stays active.
              </li>
              <li>
                <strong className="text-foreground">
                  Location and climate cache
                </strong>{" "}
                — removes city, coordinates, and cached climate bands.
              </li>
              <li>
                <strong className="text-foreground">Individual scans</strong> —
                delete specific scans and their reports.
              </li>
              <li>
                <strong className="text-foreground">
                  All scans and reports
                </strong>{" "}
                — permanently removes every scan for your account.
              </li>
              <li>
                <strong className="text-foreground">All personal data</strong> —
                removes scans, profile, location, and consent records; your
                account remains but is reset.
              </li>
              <li>
                <strong className="text-foreground">Account</strong> —
                permanently deletes your account and all associated data.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-medium text-foreground">
              Request deletion by email
            </h2>
            <p>
              Use the form below if you cannot access your dashboard or prefer
              to submit a request by email. Submissions are reviewed manually by
              our team — they do not trigger automatic erasure. We will confirm
              by email, typically within 30 days.
            </p>
            <p>
              For urgent requests, contact{" "}
              <a
                href="mailto:info@auroraorganics.co"
                className="text-foreground underline underline-offset-4"
              >
                info@auroraorganics.co
              </a>
              .
            </p>
          </section>
        </div>

        <Suspense
          fallback={<DeletionRequestForm defaultEmail="" isLoggedIn={false} />}
        >
          <DeletionRequestSection />
        </Suspense>
      </article>
      <LandingFooter />
    </>
  )
}
