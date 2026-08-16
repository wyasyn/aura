import type { AiModelRate } from "@/generated/prisma/client"

import type { ScanTier } from "@/lib/models/types"
import { SCAN_TIERS } from "@/lib/models/types"

export type ModelHealthIssue =
  | { kind: "tier_unassigned"; tier: ScanTier }
  | { kind: "assigned_inactive"; tier: ScanTier; modelId: string; displayName: string | null }
  | { kind: "no_eligible_replacement"; tier: ScanTier }

export type AssignableModel = {
  id: string
  modelId: string
  displayName: string | null
  eligible: boolean
  blockReason?: string
  assignedTier: ScanTier | null
  isActive: boolean
}

export type TierModelStatus = {
  tier: ScanTier
  assignedModel: {
    id: string
    modelId: string
    displayName: string | null
    isActive: boolean
  } | null
  issues: ModelHealthIssue[]
  assignableModels: AssignableModel[]
}

export type ModelHealthSummary = {
  hasIssues: boolean
  tiers: TierModelStatus[]
  issues: ModelHealthIssue[]
}

type ModelRateRow = Pick<
  AiModelRate,
  | "id"
  | "modelId"
  | "displayName"
  | "isActive"
  | "supportsVision"
  | "supportsLive"
  | "assignedTier"
>

function getEligibility(
  model: ModelRateRow,
  tier: ScanTier,
): { eligible: boolean; blockReason?: string } {
  if (!model.isActive) {
    return { eligible: false, blockReason: "Inactive" }
  }

  if (tier === "pro") {
    if (!model.supportsLive) {
      return { eligible: false, blockReason: "Missing Live API support" }
    }
  } else {
    if (!model.supportsVision) {
      return { eligible: false, blockReason: "Missing vision support" }
    }
    if (model.supportsLive) {
      return { eligible: false, blockReason: "Live-only model (Pro tier only)" }
    }
  }

  if (model.assignedTier && model.assignedTier !== tier) {
    return {
      eligible: false,
      blockReason: `Assigned to ${model.assignedTier} tier`,
    }
  }

  return { eligible: true }
}

function getTierIssues(
  tier: ScanTier,
  models: ModelRateRow[],
): ModelHealthIssue[] {
  const assigned = models.find((m) => m.assignedTier === tier)
  const issues: ModelHealthIssue[] = []

  if (!assigned) {
    issues.push({ kind: "tier_unassigned", tier })
    const hasEligible = models.some((m) => getEligibility(m, tier).eligible)
    if (!hasEligible) {
      issues.push({ kind: "no_eligible_replacement", tier })
    }
    return issues
  }

  if (!assigned.isActive) {
    issues.push({
      kind: "assigned_inactive",
      tier,
      modelId: assigned.modelId,
      displayName: assigned.displayName,
    })
    const hasEligible = models.some(
      (m) => m.id !== assigned.id && getEligibility(m, tier).eligible,
    )
    if (!hasEligible) {
      issues.push({ kind: "no_eligible_replacement", tier })
    }
  }

  return issues
}

export function buildModelHealthSummary(
  models: ModelRateRow[],
): ModelHealthSummary {
  const tiers: TierModelStatus[] = SCAN_TIERS.map((tier) => {
    const assigned = models.find((m) => m.assignedTier === tier) ?? null
    const issues = getTierIssues(tier, models)

    const assignableModels: AssignableModel[] = models.map((model) => {
      const { eligible, blockReason } = getEligibility(model, tier)
      return {
        id: model.id,
        modelId: model.modelId,
        displayName: model.displayName,
        eligible,
        blockReason,
        assignedTier: model.assignedTier,
        isActive: model.isActive,
      }
    })

    return {
      tier,
      assignedModel: assigned
        ? {
            id: assigned.id,
            modelId: assigned.modelId,
            displayName: assigned.displayName,
            isActive: assigned.isActive,
          }
        : null,
      issues,
      assignableModels,
    }
  })

  const issues = tiers.flatMap((t) => t.issues)

  return {
    hasIssues: issues.length > 0,
    tiers,
    issues,
  }
}

export function formatModelHealthIssue(issue: ModelHealthIssue): string {
  switch (issue.kind) {
    case "tier_unassigned":
      return `${issue.tier} tier has no assigned model`
    case "assigned_inactive":
      return `${issue.tier} tier model "${issue.displayName ?? issue.modelId}" is inactive`
    case "no_eligible_replacement":
      return `No eligible replacement model for ${issue.tier} tier`
  }
}
