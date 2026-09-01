import { findIdentifierLeaks } from "@/lib/training/deidentify"
import { prisma } from "@/lib/db/client"

/**
 * Builds the exportable dataset.
 *
 * Only validated records leave. Pending ones have not been checked by anyone,
 * rejected ones were judged unusable, and withdrawn ones are out on consent or
 * retention grounds — none belong in something a model learns from.
 */

/**
 * A dataset this small is re-identifiable almost by construction: with a
 * handful of rows, knowing one participant is often enough to pick them out.
 * Refusing is safer than shipping something that looks anonymous and is not.
 */
export const MIN_EXPORT_SIZE = 25

export type ExportRow = {
  /** Stable id for the example itself. Carries no link back to a person. */
  exampleId: string
  deidentVersion: string
  payload: unknown
  label: {
    /** What an expert says the answer should be. */
    band: string
    /** Whether the model's original answer matched. */
    modelWasCorrect: boolean
    notes: string | null
  }
}

export type ExportResult =
  | { ok: true; rows: ExportRow[]; count: number }
  | { ok: false; reason: "too_small"; available: number; minimum: number }
  | { ok: false; reason: "leak_detected"; offending: number }

export async function buildTrainingExport(): Promise<ExportResult> {
  const records = await prisma.trainingRecord.findMany({
    where: { status: "validated", validation: { isNot: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      payload: true,
      deidentVersion: true,
      validation: {
        select: { verdict: true, correctedBand: true, notes: true },
      },
    },
  })

  if (records.length < MIN_EXPORT_SIZE) {
    return {
      ok: false,
      reason: "too_small",
      available: records.length,
      minimum: MIN_EXPORT_SIZE,
    }
  }

  const rows: ExportRow[] = []
  let offending = 0

  for (const record of records) {
    // Re-checked at the boundary rather than trusted from collection time. The
    // rules may have changed since, and this is the last point before the data
    // leaves the system.
    if (findIdentifierLeaks(record.payload).length > 0) {
      offending += 1
      console.error("[training] Record blocked from export by leak check", {
        recordId: record.id,
      })
      continue
    }

    const validation = record.validation
    if (!validation) continue

    const payload = record.payload as { assessment?: { overallBand?: string } }
    const originalBand = payload?.assessment?.overallBand ?? "not_assessed"

    rows.push({
      // The record id, not the scan or user id. Lets a specific example be
      // discussed or withdrawn without naming the person behind it.
      exampleId: record.id,
      deidentVersion: record.deidentVersion,
      payload: record.payload,
      label: {
        band: validation.correctedBand ?? originalBand,
        modelWasCorrect: validation.verdict === "confirmed",
        notes: validation.notes,
      },
    })
  }

  // A leak here means the allowlist has a hole. Exporting the remainder would
  // ship a dataset built by rules we no longer trust, so the whole export
  // fails and someone has to look.
  if (offending > 0) {
    return { ok: false, reason: "leak_detected", offending }
  }

  return { ok: true, rows, count: rows.length }
}

export function describeExportFailure(
  result: Extract<ExportResult, { ok: false }>,
): string {
  if (result.reason === "too_small") {
    return `Only ${result.available} validated records. At least ${result.minimum} are needed, because a smaller set is re-identifiable.`
  }
  return `${result.offending} record(s) failed the identifier check. Export blocked — the de-identification rules need review before anything leaves.`
}
