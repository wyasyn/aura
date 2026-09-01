"use client"

import { Fragment, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { IconAlertTriangle, IconCircleCheck, IconClock, IconRefresh } from "@tabler/icons-react"

import { retryProductExtractionAction } from "@/lib/products/actions"
import {
  revokeProductVerificationAction,
  verifyProductIntelligenceAction,
} from "@/lib/products/intelligence/verification-actions"
import type { ProductQualityRow } from "@/lib/products/catalogue-health"
import { CONFIDENT_RECOMMENDATION_THRESHOLD } from "@/lib/products/completeness"
import { Badge } from "@/components/ui/badge"
import { ProductBulkExtract } from "@/components/admin/product-bulk-extract"
import { ProductIntelligenceDetail } from "@/components/admin/product-intelligence-detail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * The catalogue as an administrator needs to read it.
 *
 * Source data and derived intelligence are shown as separate groups of columns,
 * because the difference is the whole point of the ingestion architecture: the
 * store says what a product is, and the extraction pass says how the engine can
 * understand it. A table that mixed them would make a merchant's fact and an
 * inference look identical.
 */

export type QualityFilter =
  | "all"
  | "complete"
  | "incomplete"
  | "verified"
  | "unverified"
  | "recommendable"
  | "not_recommendable"
  | "active"
  | "archived"
  | "needs_extraction"
  | "failed"
  | "stale"
  | "ineligible"
  | "unavailable"
  | "manual"
  | "woocommerce"

const FILTERS: ReadonlyArray<{ value: QualityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "needs_extraction", label: "Needs extraction" },
  { value: "incomplete", label: "Incomplete" },
  { value: "complete", label: "Complete" },
  { value: "unverified", label: "Unverified" },
  { value: "verified", label: "Verified" },
  { value: "recommendable", label: "Recommendable" },
  { value: "not_recommendable", label: "Not recommendable" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "failed", label: "Extraction failed" },
  { value: "stale", label: "Stale" },
  { value: "ineligible", label: "Not eligible" },
  { value: "unavailable", label: "Unavailable" },
  { value: "manual", label: "Manual" },
  { value: "woocommerce", label: "WooCommerce" },
]

export function matchesFilter(row: ProductQualityRow, filter: QualityFilter): boolean {
  switch (filter) {
    case "complete":
      return row.missing.length === 0
    case "incomplete":
      return row.missing.length > 0
    case "verified":
      return row.verificationStatus === "confirmed"
    case "unverified":
      return row.verificationStatus !== "confirmed"
    case "recommendable":
      return row.isActive && row.isRecommendable
    case "not_recommendable":
      return !row.isActive || !row.isRecommendable
    case "active":
      return row.isActive
    case "archived":
      return !row.isActive
    case "failed":
      return row.intelligenceStatus === "failed"
    case "stale":
      return row.intelligenceStale
    case "ineligible":
      return row.eligibilityReasons.length > 0
    case "unavailable":
      return row.availability === "out_of_stock" || row.availability === "discontinued"
    case "manual":
      return row.source === "manual"
    case "woocommerce":
      return row.source === "woocommerce"
    case "needs_extraction":
      return row.intelligenceStale || row.primaryClassification === null
    default:
      return true
  }
}

function QualityBar({ score }: { score: number }) {
  const confident = score >= CONFIDENT_RECOMMENDATION_THRESHOLD
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", confident ? "bg-primary" : "bg-amber-500")}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{score}%</span>
    </div>
  )
}

function Cell({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-xs text-muted-foreground/50">—</span>
  }
  return (
    <span className="text-xs text-foreground">
      {values.length > 2
        ? `${values.slice(0, 2).join(", ")} +${values.length - 2}`
        : values.join(", ")}
    </span>
  )
}

/**
 * Where this product is in the extraction lifecycle.
 *
 * Extraction status and human verification are different questions and are
 * shown as such. A product can be fully extracted and unverified; collapsing
 * the two would make an automated pass look like somebody signed it off.
 */
function IntelligenceBadge({ row }: { row: ProductQualityRow }) {
  if (row.intelligenceStatus === "failed") {
    return (
      <Badge variant="outline" className="gap-1 border-destructive/40 text-[0.65rem] text-destructive">
        <IconAlertTriangle className="size-3" aria-hidden /> Failed
      </Badge>
    )
  }
  if (row.intelligenceStatus === "extracting") {
    return (
      <Badge variant="outline" className="gap-1 text-[0.65rem]">
        <IconClock className="size-3" aria-hidden /> Extracting
      </Badge>
    )
  }
  if (row.intelligenceStale || row.intelligenceStatus === "pending") {
    return (
      <Badge variant="outline" className="gap-1 text-[0.65rem]">
        <IconClock className="size-3" aria-hidden /> Pending
      </Badge>
    )
  }
  if (row.intelligenceStatus === "needs_review") {
    return (
      <Badge variant="outline" className="gap-1 text-[0.65rem]">
        <IconAlertTriangle className="size-3" aria-hidden /> Needs review
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 border-primary/40 text-[0.65rem] text-primary">
      <IconCircleCheck className="size-3" aria-hidden /> Extracted
    </Badge>
  )
}

type ProductQualityTableProps = {
  rows: ProductQualityRow[]
  onOpen: (id: string) => void
}

export function ProductQualityTable({ rows, onOpen }: ProductQualityTableProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<QualityFilter>("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const [verifying, setVerifying] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Verification is only ever an explicit act. Nothing in the extraction path
  // sets it, and an automated pass saying a product is organic is a derivation
  // where a person saying so is a warranty.
  function verify(productId: string) {
    setVerifying(productId)
    setVerifyError(null)
    startTransition(async () => {
      try {
        const result = await verifyProductIntelligenceAction(productId)
        if (!result.ok) setVerifyError(result.error)
        else router.refresh()
      } finally {
        setVerifying(null)
      }
    })
  }

  function revoke(productId: string) {
    setVerifying(productId)
    setVerifyError(null)
    startTransition(async () => {
      try {
        await revokeProductVerificationAction(productId)
        router.refresh()
      } finally {
        setVerifying(null)
      }
    })
  }

  // An explicit retry, distinct from the automatic pass that runs on creation:
  // it forces past the in-flight guard, because somebody asking for it is
  // saying the previous attempt is not coming back.
  function retry(productId: string) {
    setRetrying(productId)
    startTransition(async () => {
      try {
        await retryProductExtractionAction(productId)
        router.refresh()
      } finally {
        setRetrying(null)
      }
    })
  }

  const counts = useMemo(() => {
    const result = {} as Record<QualityFilter, number>
    for (const { value } of FILTERS) {
      result[value] = rows.filter((row) => matchesFilter(row, value)).length
    }
    return result
  }, [rows])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false
      if (!needle) return true
      // Name, slug and classification: the three things somebody actually knows
      // when they are looking for one product in a catalogue.
      return (
        row.name.toLowerCase().includes(needle) ||
        row.slug.toLowerCase().includes(needle) ||
        (row.primaryClassification ?? "").toLowerCase().includes(needle)
      )
    })
  }, [rows, filter, search])

  const selected = useMemo(
    () =>
      rows
        .filter((row) => selectedIds.has(row.id))
        .map((row) => ({ id: row.id, name: row.name })),
    [rows, selectedIds],
  )

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Selects what is on screen, not the whole catalogue — the visible set is
  // what the administrator has actually looked at.
  function toggleAllVisible() {
    setSelectedIds((current) => {
      const allSelected = visible.every((row) => current.has(row.id))
      const next = new Set(current)
      for (const row of visible) {
        if (allSelected) next.delete(row.id)
        else next.add(row.id)
      }
      return next
    })
  }

  return (
    <div className="space-y-3">
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, slug or classification"
        className="h-8 max-w-sm text-xs"
        aria-label="Search products"
      />

      {selected.length > 0 ? (
        <ProductBulkExtract
          selected={selected}
          onClear={() => setSelectedIds(new Set())}
        />
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              "rounded-sm border px-2 py-1 text-xs font-medium transition-colors",
              filter === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            <span className="ml-1 tabular-nums opacity-60">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[70rem] text-xs">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all visible products"
                  checked={visible.length > 0 && visible.every((row) => selectedIds.has(row.id))}
                  onChange={toggleAllVisible}
                  className="cursor-pointer accent-primary"
                />
              </th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Classification</th>
              <th className="px-3 py-2 font-medium">Skin types</th>
              <th className="px-3 py-2 font-medium">Concerns</th>
              <th className="px-3 py-2 font-medium">Ingredients</th>
              <th className="px-3 py-2 font-medium">Climate</th>
              <th className="px-3 py-2 font-medium">Routine</th>
              <th className="px-3 py-2 font-medium">Data quality</th>
              <th className="px-3 py-2 font-medium">Intelligence</th>
              <th className="px-3 py-2 font-medium">Verification</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => (
              // Keyed on the fragment, not the rows: a product renders as one
              // row plus an optional detail row, and keying the children would
              // make React treat the pair as two independent siblings.
              <Fragment key={row.id}>
                <tr
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                  className="cursor-pointer hover:bg-muted/20"
                >
                  <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.name}`}
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                      className="cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-foreground">{row.name}</span>
                    <span className="block text-[0.65rem] text-muted-foreground">
                      {row.slug}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-foreground">{row.source}</span>
                    <span className="block text-[0.65rem] text-muted-foreground">
                      {row.externalId ? `#${row.externalId}` : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {row.primaryClassification ? (
                      <span className="text-foreground">{row.primaryClassification}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2"><Cell values={row.suitableSkinTypes} /></td>
                  <td className="px-3 py-2"><Cell values={row.targetConcerns} /></td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.ingredientLinkCount > 0 ? (
                      <span className="text-foreground">{row.ingredientLinkCount} linked</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2"><Cell values={row.climateTags} /></td>
                  <td className="px-3 py-2">
                    {row.routineCategory ? (
                      <span className="text-foreground">{row.routineCategory}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2"><QualityBar score={row.completenessScore} /></td>
                  <td className="px-3 py-2"><IntelligenceBadge row={row} /></td>
                  <td className="px-3 py-2">
                    {row.verificationStatus === "confirmed" ? (
                      <Badge variant="outline" className="gap-1 border-primary/40 text-[0.65rem] text-primary">
                        <IconCircleCheck className="size-3" aria-hidden /> Verified
                      </Badge>
                    ) : (
                      <span className="text-[0.65rem] text-muted-foreground">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "text-[0.65rem] font-medium",
                        row.isActive && row.isRecommendable
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {!row.isActive
                        ? "Archived"
                        : row.isRecommendable
                          ? "Recommendable"
                          : "Listed only"}
                    </span>
                    <span className="block text-[0.65rem] text-muted-foreground">
                      {row.availability.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[0.65rem] text-muted-foreground">
                    {row.lastSyncedAt
                      ? new Date(row.lastSyncedAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
                {expanded === row.id ? (
                  <tr className="bg-muted/10">
                    <td colSpan={14} className="px-3 py-3">
                      <ProductIntelligenceDetail row={row} />
                      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t border-border pt-4">
                        <div className="space-y-1">
                          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                            Data quality {row.completenessScore}%
                          </p>
                          {row.missing.length === 0 ? (
                            <p className="text-xs text-foreground">
                              Every field the pipeline reads is populated.
                            </p>
                          ) : (
                            <ul className="text-xs text-muted-foreground">
                              {row.missing.map((field) => (
                                <li key={field}>· {field}</li>
                              ))}
                            </ul>
                          )}
                          {row.intelligenceStale ? (
                            <p className="text-xs text-amber-600">
                              Source text changed since this was extracted.
                            </p>
                          ) : null}
                          {row.intelligenceError ? (
                            <p className="text-xs text-destructive">
                              Extraction failed: {row.intelligenceError}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                            Recommendation eligibility
                          </p>
                          {row.eligibilityReasons.length === 0 ? (
                            <p className="text-xs text-foreground">
                              The engine may select this product.
                            </p>
                          ) : (
                            <ul className="text-xs text-muted-foreground">
                              {row.eligibilityReasons.map((reason) => (
                                <li key={reason}>· {reason}</li>
                              ))}
                            </ul>
                          )}
                          {!row.isRecommendable && row.eligibilityReasons.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Withdrawn from advice by an administrator.
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={retrying === row.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              retry(row.id)
                            }}
                          >
                            <IconRefresh className="size-3.5" aria-hidden />
                            {retrying === row.id ? "Extracting…" : "Retry extraction"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              onOpen(row.id)
                            }}
                          >
                            Edit intelligence
                          </Button>
                          {row.verificationStatus === "confirmed" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={verifying === row.id}
                              onClick={(event) => {
                                event.stopPropagation()
                                revoke(row.id)
                              }}
                            >
                              Withdraw verification
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={verifying === row.id}
                              onClick={(event) => {
                                event.stopPropagation()
                                verify(row.id)
                              }}
                            >
                              <IconCircleCheck className="size-3.5" aria-hidden />
                              {verifying === row.id ? "Verifying…" : "Verify"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {verifyError ? (
        <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {verifyError}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">No products match this filter.</p>
      ) : null}
    </div>
  )
}
