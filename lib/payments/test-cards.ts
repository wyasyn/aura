export type TestCardOutcome =
  | "succeeds"
  | "declined"
  | "insufficient_funds"
  | "requires_action"

export type TestCard = {
  number: string
  label: string
  outcome: TestCardOutcome
}

/**
 * Simulation-only cards. Outcome is keyed off the number so QA runs are
 * reproducible. A real driver ignores this file entirely.
 */
export const TEST_CARDS: TestCard[] = [
  {
    number: "4242424242424242",
    label: "Payment succeeds",
    outcome: "succeeds",
  },
  {
    number: "4000000000000002",
    label: "Card declined",
    outcome: "declined",
  },
  {
    number: "4000000000009995",
    label: "Insufficient funds",
    outcome: "insufficient_funds",
  },
  {
    number: "4000000000003220",
    label: "Extra verification, then succeeds",
    outcome: "requires_action",
  },
]

export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, "")
}

export function formatCardNumber(value: string): string {
  return normalizeCardNumber(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim()
}

export function getTestCardOutcome(number: string): TestCardOutcome {
  const digits = normalizeCardNumber(number)
  return TEST_CARDS.find((card) => card.number === digits)?.outcome ?? "succeeds"
}
