import { Type } from "@google/genai"

import { SKIN_DIMENSION_IDS } from "@/lib/scan/dimensions"
import { SKIN_DOSHA_VALUES } from "@/lib/scan/dosha"

export const skinAssessmentJsonSchema = {
  type: Type.OBJECT,
  required: [
    "overallBand",
    "dimensions",
    "doshaTyping",
    "summary",
    "concernsNotVisible",
    "naturalRecommendations",
    "recommendations",
  ],
  properties: {
    overallBand: {
      type: Type.STRING,
      enum: ["minimal", "mild", "moderate", "elevated", "not_assessed"],
      description:
        "Coarse overall cosmetic assessment band from visible photo evidence. Never use percentages or medical diagnoses.",
    },
    dimensions: {
      type: Type.ARRAY,
      description:
        "Exactly six cosmetic dimension assessments from visible photo evidence using the required ids.",
      minItems: SKIN_DIMENSION_IDS.length,
      maxItems: SKIN_DIMENSION_IDS.length,
      items: {
        type: Type.OBJECT,
        required: ["id", "label", "band", "note"],
        properties: {
          id: {
            type: Type.STRING,
            enum: [...SKIN_DIMENSION_IDS],
            description: "Required dimension id from the fixed catalog.",
          },
          label: { type: Type.STRING },
          band: {
            type: Type.STRING,
            enum: ["minimal", "mild", "moderate", "elevated", "not_assessed"],
          },
          note: {
            type: Type.STRING,
            description:
              "Short note on what is visibly apparent in the photo for this dimension, plus any mapped profile primaryConcerns using cosmetic language.",
          },
        },
      },
    },
    doshaTyping: {
      type: Type.OBJECT,
      required: ["primary", "note"],
      description:
        "Cosmetic Ayurvedic skin lean for wellness guidance only — not a medical constitution diagnosis.",
      properties: {
        primary: {
          type: Type.STRING,
          enum: [...SKIN_DOSHA_VALUES],
          description: "Primary cosmetic dosha lean visible in the photo.",
        },
        secondary: {
          type: Type.STRING,
          enum: [...SKIN_DOSHA_VALUES],
          nullable: true,
          description: "Optional secondary lean when clearly visible.",
        },
        note: {
          type: Type.STRING,
          description:
            "1-2 sentences on visible cosmetic traits supporting this lean.",
        },
      },
    },
    summary: {
      type: Type.STRING,
      description:
        "2-4 sentence personalized cosmetic summary grounded in visible photo patterns across dimensions. Lead with what stands out in this photo, including patterns not in the profile. Stated concerns the photo does not support belong in concernsNotVisible, not here. Not a medical diagnosis.",
    },
    concernsNotVisible: {
      type: Type.ARRAY,
      description:
        "One entry per profile primaryConcern that this photo does not support. Empty array when every stated concern is visible. Concerns listed here must not be mentioned in the summary.",
      items: {
        type: Type.OBJECT,
        required: ["concern", "note"],
        properties: {
          concern: {
            type: Type.STRING,
            description:
              "The profile primaryConcern id exactly as supplied, e.g. dryness.",
          },
          note: {
            type: Type.STRING,
            description:
              "One sentence on what the photo shows for this concern instead, in cosmetic language.",
          },
        },
      },
    },
    naturalRecommendations: {
      type: Type.ARRAY,
      description:
        "3-4 natural-care steps tied to this scan's visible photo findings, dimension bands, and profile concerns/goals. Not generic advice. Cosmetic guidance only.",
      items: {
        type: Type.OBJECT,
        required: [
          "id",
          "title",
          "description",
          "applicationTime",
          "applicationFrequency",
        ],
        properties: {
          id: {
            type: Type.STRING,
            description: "Stable snake_case id, e.g. daily_hydration.",
          },
          title: {
            type: Type.STRING,
            description: "Short action label.",
          },
          description: {
            type: Type.STRING,
            description:
              "1-2 sentences explaining the step and which scan finding or concern it addresses. Do not repeat applicationTime or applicationFrequency here.",
          },
          applicationTime: {
            type: Type.STRING,
            enum: ["morning", "evening", "anytime", "morning_and_evening"],
            description:
              "When during the day to do this step or apply this product.",
          },
          applicationFrequency: {
            type: Type.STRING,
            enum: [
              "once_daily",
              "twice_daily",
              "as_needed",
              "few_times_weekly",
              "weekly",
            ],
            description:
              "How often per day or week (e.g. once daily, twice daily, as needed).",
          },
        },
      },
    },
    recommendations: {
      type: Type.ARRAY,
      description:
        "2-4 Aurora catalog products targeting this scan's visible findings, elevated/moderate dimension bands, and matching profile concerns. id must be an exact catalog slug.",
      items: {
        type: Type.OBJECT,
        required: [
          "id",
          "name",
          "reason",
          "applicationTime",
          "applicationFrequency",
        ],
        properties: {
          id: {
            type: Type.STRING,
            description: "Exact product slug from the provided catalog.",
          },
          name: { type: Type.STRING },
          reason: {
            type: Type.STRING,
            description:
              "Why this product fits this scan's visible findings and concerns. Name the specific pattern or dimension it targets. Do not repeat applicationTime or applicationFrequency here.",
          },
          applicationTime: {
            type: Type.STRING,
            enum: ["morning", "evening", "anytime", "morning_and_evening"],
            description:
              "When during the day to apply this product.",
          },
          applicationFrequency: {
            type: Type.STRING,
            enum: [
              "once_daily",
              "twice_daily",
              "as_needed",
              "few_times_weekly",
              "weekly",
            ],
            description:
              "How often per day or week to apply this product.",
          },
        },
      },
    },
  },
} as const
