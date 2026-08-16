export const SKIN_DOSHA_VALUES = [
  "vata",
  "pitta",
  "kapha",
  "balanced",
] as const

export type SkinDosha = (typeof SKIN_DOSHA_VALUES)[number]

export const SKIN_DOSHA_OPTIONS: ReadonlyArray<{
  value: SkinDosha
  label: string
  hint: string
}> = [
  {
    value: "vata",
    label: "Vata",
    hint: "Often feels dry, delicate, or changeable",
  },
  {
    value: "pitta",
    label: "Pitta",
    hint: "Often feels warm, reactive, or easily flushed",
  },
  {
    value: "kapha",
    label: "Kapha",
    hint: "Often feels smooth, supple, or oil-prone",
  },
  {
    value: "balanced",
    label: "Balanced",
    hint: "No strong lean — or unsure",
  },
] as const

export function formatDoshaLabel(value: SkinDosha | string | null | undefined) {
  if (!value) return "Not assessed"
  const option = SKIN_DOSHA_OPTIONS.find((entry) => entry.value === value)
  return option?.label ?? value
}

export function isSkinDosha(value: string): value is SkinDosha {
  return SKIN_DOSHA_VALUES.includes(value as SkinDosha)
}
