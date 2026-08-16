import { LandingBenefits } from "@/components/marketing/landing-benefits"
import { LandingCta } from "@/components/marketing/landing-cta"
import { LandingFaq } from "@/components/marketing/landing-faq"
import { LandingFooter } from "@/components/marketing/landing-footer"
import { LandingHero } from "@/components/marketing/landing-hero"
import { LandingHowItWorks } from "@/components/marketing/landing-how-it-works"
import { LandingProofPoints } from "@/components/marketing/landing-proof-points"

export function LandingPageContent() {
  return (
    <div className="flex flex-col">
      <LandingHero />
      <LandingBenefits />
      <LandingHowItWorks />
      <LandingProofPoints />
      <LandingFaq />
      <LandingCta />
      <LandingFooter />
    </div>
  )
}
