export interface MarketingFaqItem {
  question: string
  answer: string
  /**
   * Shown on the landing page. Featured answers are written to stand alone, so
   * the landing section stays short; the rest are help-center detail.
   */
  featured?: boolean
}

export const MARKETING_FAQ_ITEMS: MarketingFaqItem[] = [
  {
    question: "How does a scan work?",
    answer:
      "Take a photo or use your camera live. On-device checks confirm your lighting and framing first, then you get a plain-language skin report with Aurora matches in seconds.",
    featured: true,
  },
  {
    question: "What do I get back?",
    answer:
      "A read on six skin areas in honest bands rather than invented percentages, written in plain language. Every saved report downloads as a text-only PDF from your dashboard.",
    featured: true,
  },
  {
    question: "Is this a medical diagnosis?",
    answer:
      "No. This is cosmetic and wellness guidance only. Results use simple bands, not clinical scores, and are not a substitute for professional care.",
    featured: true,
  },
  {
    question: "What happens to my photo?",
    answer:
      "Your cropped photo goes to Google Gemini for the cosmetic analysis and is not stored by default, so we keep the report and not the picture. Everything is encrypted in transit and at rest, and you can delete scans, profile data, or your account at any time.",
    featured: true,
  },
  {
    question: "How are products matched to me?",
    answer:
      "Your scan combines with your profile, including allergies, current routine, and climate, to filter the Aurora Organics formulas that fit you.",
    featured: true,
  },
  {
    question: "How many scans do I get?",
    answer:
      "Three free Starter scans when you sign up, then one scan per saved analysis. Starter and Thinking cover still photos; Pro adds live camera scans.",
    featured: true,
  },
  {
    question: "What are scan tiers?",
    answer:
      "Starter, Thinking, and Pro. Starter covers still scans with three free on signup. Thinking goes deeper. Pro adds live camera scans. Each saved analysis uses one scan.",
  },
  {
    question: "What do the skin bands mean?",
    answer:
      "Clear labels for hydration, tone, texture, and more. Easy to read, honest about what a photo can tell you—no fake percentages.",
  },
  {
    question: "Can I download my report?",
    answer:
      "Yes. Open any saved report in your dashboard and download a text-only PDF. No photo is included.",
  },
  {
    question: "How is my data protected?",
    answer:
      "Encrypted in transit and at rest. We collect only what the report needs. Explicit consent is required before your first scan.",
  },
]

export const LANDING_FAQ_ITEMS = MARKETING_FAQ_ITEMS.filter(
  (item) => item.featured,
)
