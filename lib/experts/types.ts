import type { ExpertSpecialty } from "@/generated/prisma/client"

export const EXPERT_SPECIALTIES: ExpertSpecialty[] = [
  "dermatologist",
  "ayurvedic_practitioner",
]

export const SPECIALTY_LABELS: Record<ExpertSpecialty, string> = {
  dermatologist: "Dermatologist",
  ayurvedic_practitioner: "Ayurvedic practitioner",
}
