import { LandingBenefits } from "@/components/marketing/landing-benefits"
import { LandingClosingStatement } from "@/components/marketing/landing-closing-statement"
import { LandingCta } from "@/components/marketing/landing-cta"
import { LandingHeadline } from "@/components/marketing/landing-headline"
import { LandingHeroMedia } from "@/components/marketing/landing-hero-media"
import { LandingReinforcingStatement } from "@/components/marketing/landing-reinforcing-statement"
import { LandingSocialProof } from "@/components/marketing/landing-social-proof"
import { LandingSupportingHeadline } from "@/components/marketing/landing-supporting-headline"

export function LandingPageContent() {
  return (
    <div className="flex flex-col">
      <LandingHeadline />
      <LandingSupportingHeadline />
      <LandingHeroMedia />
      <LandingBenefits />
      <LandingSocialProof />
      <LandingReinforcingStatement />
      <LandingClosingStatement />
      <LandingCta />
    </div>
  )
}
