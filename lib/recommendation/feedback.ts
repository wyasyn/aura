"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireSession } from "@/lib/auth/session"
import { recommendationFeedbackState } from "@/lib/recommendation/feedback-queries"
import { RECOMMENDATION_VERDICTS } from "@/lib/recommendation/feedback-vocabulary"
import { prisma } from "@/lib/db/client"

/**
 * What a person thought of one recommendation.
 *
 * Attached to the recommendation rather than the scan: "this scan was useful"
 * cannot say which of four products was the useful one, and that distinction is
 * the only thing that makes the feedback able to inform the weights.
 */

const feedbackSchema = z.object({
  recommendationId: z.string().min(1),
  verdict: z.enum(RECOMMENDATION_VERDICTS),
  note: z.string().trim().max(1000).optional(),
})

export type SubmitFeedbackResult = { ok: true } | { ok: false; error: string }

export async function submitRecommendationFeedback(
  input: unknown,
): Promise<SubmitFeedbackResult> {
  const session = await requireSession()
  const parsed = feedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid feedback" }
  }

  const { recommendationId, verdict, note } = parsed.data

  // Addressed through the owning scan, never by the payload alone. The id
  // arrives from the client, and without this join anyone could rate anyone
  // else's recommendation — and, worse, learn which products a stranger was
  // advised by watching which ids succeed.
  const recommendation = await prisma.scanRecommendation.findFirst({
    where: { id: recommendationId, scan: { userId: session.user.id } },
    select: { id: true },
  })

  if (!recommendation) {
    // Deliberately the same answer as a malformed id. Distinguishing "not
    // yours" from "does not exist" would confirm the existence of a row the
    // caller has no right to know about.
    return { ok: false, error: "Invalid feedback" }
  }

  await prisma.recommendationFeedback.upsert({
    where: { recommendationId: recommendation.id },
    create: {
      recommendationId: recommendation.id,
      userId: session.user.id,
      verdict,
      note: note || null,
    },
    // Changing your mind replaces the verdict rather than adding a second one.
    // Two verdicts from one person on one product would double their weight in
    // every aggregate that reads this table.
    update: { verdict, note: note || null },
  })

  // Deliberately not audited. The audit log records administrative and
  // security-relevant acts; a patient rating their own recommendation is
  // neither, the feedback row is already the record of it, and the note is
  // free text somebody wrote about their own skin.

  revalidatePath("/scan")
  return { ok: true }
}

/**
 * The feedback controls a report should render, addressed by product slug.
 *
 * A server action because the whole report tree is client-rendered. Returns a
 * plain object rather than a Map, which does not survive the boundary, and an
 * empty one for a scan the caller does not own — the report then renders
 * without controls rather than with dead ones.
 */
export async function loadRecommendationFeedback(
  scanId: string,
): Promise<Record<string, { recommendationId: string; verdict: string | null }>> {
  const session = await requireSession()
  const state = await recommendationFeedbackState(scanId, session.user.id)

  return Object.fromEntries(state)
}
