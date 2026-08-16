import type { Metadata } from "next"

import { LandingPageContent } from "@/components/marketing/landing-page-content"

export const metadata: Metadata = {
  title: "Understand your skin, discover your routine",
  description:
    "One photo reads six dimensions of your skin in honest bands, not invented scores. Get an Ayurvedic skin lean, Aurora Organics matches filtered to your allergies and climate, and a report you keep. Three free scans, no card required.",
  alternates: {
    canonical: "/",
  },
}

export default function LandingPage() {
  return <LandingPageContent />
}
