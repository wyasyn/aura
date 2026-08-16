import { Type } from "@google/genai"

const APPLICATION_TIME = {
  type: Type.STRING,
  enum: ["morning", "evening", "anytime", "morning_and_evening"],
  description: "When during the day to do this step or apply this product.",
} as const

const APPLICATION_FREQUENCY = {
  type: Type.STRING,
  enum: [
    "once_daily",
    "twice_daily",
    "as_needed",
    "few_times_weekly",
    "weekly",
  ],
  description: "How often per day or week.",
} as const

/**
 * Response schema for the chat recommendation extraction call.
 *
 * The chat reply itself is free prose. This second, constrained call reads that
 * prose and emits the card payload, so the model never hand-authors JSON inside
 * markdown and the cards cannot drift from what was actually said.
 */
export const chatRecommendationsJsonSchema = {
  type: Type.OBJECT,
  required: ["hasRecommendations", "naturalRecommendations", "productRecommendations"],
  properties: {
    hasRecommendations: {
      type: Type.BOOLEAN,
      description:
        "False for casual replies, greetings, explanations, and any answer that does not put forward habits or products. When false, both arrays must be empty.",
    },
    naturalRecommendations: {
      type: Type.ARRAY,
      description:
        "Up to 4 natural or lifestyle steps drawn from the reply. Empty when the reply does not give any.",
      maxItems: 4,
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
            description: "Stable snake_case id, e.g. evening_double_cleanse.",
          },
          title: { type: Type.STRING, description: "Short action label." },
          description: {
            type: Type.STRING,
            description:
              "1-2 sentences naming the finding or concern this step addresses. Do not restate the timing fields here.",
          },
          applicationTime: APPLICATION_TIME,
          applicationFrequency: APPLICATION_FREQUENCY,
        },
      },
    },
    productRecommendations: {
      type: Type.ARRAY,
      description:
        "Up to 3 Aurora catalog products put forward by the reply. id must be an exact catalog slug. Empty when the reply recommends no products.",
      maxItems: 3,
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
            description: "Exact product slug from the supplied catalog.",
          },
          name: { type: Type.STRING },
          reason: {
            type: Type.STRING,
            description:
              "Why this product fits, naming the specific finding or concern. Do not restate the timing fields here.",
          },
          applicationTime: APPLICATION_TIME,
          applicationFrequency: APPLICATION_FREQUENCY,
        },
      },
    },
  },
} as const
