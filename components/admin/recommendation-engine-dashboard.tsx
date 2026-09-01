import { requireAdmin } from "@/lib/auth/session"
import { currentCatalogueScope } from "@/lib/products/catalogue-scope"
import {
  axisContribution,
  engineHealth,
  exclusionSummary,
  productPerformance,
} from "@/lib/recommendation/analytics"

/**
 * What the engine is actually doing.
 *
 * The headline is the confidence rate: if it is low, the engine is not the
 * source of truth in practice however it is designed, and the catalogue rather
 * than the code is the thing to fix. Everything below it exists to say which
 * catalogue problem.
 */

const EXCLUSION_LABELS: Record<string, string> = {
  inactive: "Not active",
  not_recommendable: "Withdrawn from advice",
  unavailable: "Out of stock",
  allergy_conflict: "Allergy conflict",
  no_concern_match: "Addressed nothing asserted",
}

const GAP_FILL_LABELS: Record<string, string> = {
  below_minimum: "Engine found fewer than two",
  no_safe_candidates: "Everything excluded before scoring",
  no_relevant_candidates: "Nothing scored above the floor",
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-sm border border-border bg-muted/20 p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-medium text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function CountRows({
  rows,
  labels,
  empty,
}: {
  rows: Record<string, number>
  labels: Record<string, string>
  empty: string
}) {
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1])

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>
  }

  return (
    <dl className="divide-y divide-border rounded-sm border border-border">
      {entries.map(([key, count]) => (
        <div key={key} className="flex items-center justify-between px-3 py-2">
          <dt className="text-xs text-muted-foreground">{labels[key] ?? key}</dt>
          <dd className="text-xs font-medium text-foreground tabular-nums">{count}</dd>
        </div>
      ))}
    </dl>
  )
}

export async function RecommendationEngineDashboard() {
  await requireAdmin()

  // Scoped like every other catalogue read. An unscoped aggregate would let one
  // clinic read how another's catalogue performs, which is commercially
  // sensitive in a way a count does not look like until you notice it names
  // products.
  const scope = await currentCatalogueScope()

  const [health, exclusions, axes, products] = await Promise.all([
    engineHealth(scope),
    exclusionSummary(scope),
    axisContribution(scope),
    productPerformance(scope, 10),
  ])

  if (health.runs === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No scans have run through the engine yet. This fills in once scans start
        arriving.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Answered unaided"
          value={percent(health.confidenceRate)}
          hint={`${health.confidentRuns} of ${health.runs} scans`}
        />
        <Stat
          label="Chosen by the engine"
          value={String(health.engineRecommendations)}
          hint="Products scored and ranked deterministically"
        />
        <Stat
          label="Filled by the model"
          value={String(health.gapFillRecommendations)}
          hint={
            health.gapFillRecommendations === 0
              ? "The engine has not needed help"
              : `Across ${health.runsWithGapFill} scans`
          }
        />
        <Stat
          label="Candidates per scan"
          value={String(health.averageCandidates)}
          hint={
            health.runsUsingClinicWeights > 0
              ? `${health.runsUsingClinicWeights} scans used clinic weights`
              : "All scans used Aurora's default weights"
          }
        />
      </div>

      <Section
        title="Why the model was asked to fill a slot"
        description="Each reason is a different problem. Everything excluded before scoring is a safety or scoping issue; nothing scoring above the floor is a data or weighting one."
      >
        <CountRows
          rows={health.gapFillsByReason}
          labels={GAP_FILL_LABELS}
          empty="The engine has filled every slot itself."
        />
      </Section>

      <Section
        title="Why candidates were dropped"
        description="Counted across every scan. A catalogue mostly excluded on relevance needs better targeting data; one excluded on stock needs a catalogue sync."
      >
        <CountRows
          rows={exclusions}
          labels={EXCLUSION_LABELS}
          empty="Nothing has been excluded."
        />
      </Section>

      <Section
        title="Which axis carried the recommendations people rated"
        description="An axis contributing heavily to recommendations marked not relevant is weighted too high. This is what makes the weights tunable on evidence rather than instinct."
      >
        {axes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No recommendations have been rated yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Axis</th>
                  <th className="px-3 py-2 font-medium tabular-nums">Rated</th>
                  <th className="px-3 py-2 font-medium tabular-nums">Points when helpful</th>
                  <th className="px-3 py-2 font-medium tabular-nums">Points when not relevant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {axes.map((axis) => (
                  <tr key={axis.axis}>
                    <td className="px-3 py-2 text-foreground">{axis.axis}</td>
                    <td className="px-3 py-2 tabular-nums">{axis.appearances}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {Math.round(axis.helpfulPoints * 10) / 10}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {Math.round(axis.notRelevantPoints * 10) / 10}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Most recommended products"
        description="Already use it is counted apart from helpful throughout: it says the engine agreed with a choice somebody had already made, which is corroboration rather than a suggestion they acted on."
      >
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium tabular-nums">Times</th>
                <th className="px-3 py-2 font-medium tabular-nums">Avg rank</th>
                <th className="px-3 py-2 font-medium tabular-nums">Helpful</th>
                <th className="px-3 py-2 font-medium tabular-nums">Already use</th>
                <th className="px-3 py-2 font-medium tabular-nums">Not for me</th>
                <th className="px-3 py-2 font-medium tabular-nums">Did not suit</th>
                <th className="px-3 py-2 font-medium tabular-nums">Rated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.productSlug}>
                  <td className="px-3 py-2 text-foreground">{product.productName}</td>
                  <td className="px-3 py-2 tabular-nums">{product.timesRecommended}</td>
                  <td className="px-3 py-2 tabular-nums">{product.averageRank}</td>
                  <td className="px-3 py-2 tabular-nums">{product.helpful}</td>
                  <td className="px-3 py-2 tabular-nums">{product.alreadyUse}</td>
                  <td className="px-3 py-2 tabular-nums">{product.notRelevant}</td>
                  <td className="px-3 py-2 tabular-nums">{product.didNotSuit}</td>
                  <td className="px-3 py-2 tabular-nums">{percent(product.responseRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
