import { StatCard } from "@/components/dashboard/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatMicrosOrDash,
  formatPercentOrDash,
  formatRatioOrDash,
  formatTokensOrDash,
  NO_VALUE,
} from "@/lib/admin/format-economics"
import type { AdminEconomics } from "@/lib/admin/unit-economics"
import { formatExactMicroUsd } from "@/lib/pricing/format-cost"
import {
  AVG_CHAT_TOKENS_PER_MESSAGE,
  CHAT_MESSAGE_TOKEN_ESTIMATE,
} from "@/lib/scans/constants"

function EconomicsPanel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="surface-panel rounded-xl border border-border/60 p-5">
      <h2 className="font-heading text-sm font-medium">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 overflow-x-auto">{children}</div>
    </div>
  )
}

/** Exact micro-USD as a tooltip, so the compact card value stays readable. */
function exactCost(micros: number | null): string | undefined {
  return micros === null ? undefined : formatExactMicroUsd(Math.round(micros))
}

export function UsageUnitEconomics({
  economics,
}: {
  economics: AdminEconomics
}) {
  const { unit, chatBudget, counts } = economics

  const efficiencyRows: { label: string; value: string; note?: string }[] = [
    {
      label: "Tokens per scan",
      value: formatTokensOrDash(unit.tokensPerScan),
      note: `${counts.scans.toLocaleString()} scans measured`,
    },
    {
      label: "Tokens per chat reply",
      value: formatTokensOrDash(unit.tokensPerChatReply),
      note: `estimate assumes ${AVG_CHAT_TOKENS_PER_MESSAGE.toLocaleString()}, debits up to ${CHAT_MESSAGE_TOKEN_ESTIMATE.toLocaleString()}`,
    },
    {
      label: "Tokens per conversation",
      value: formatTokensOrDash(unit.tokensPerConversation),
      note: `${counts.conversations.toLocaleString()} conversations`,
    },
    {
      label: "Chat replies per scan credit",
      value: formatRatioOrDash(unit.chatRepliesPerScan),
    },
    {
      label: "Chat tokens per scan credit",
      value: formatTokensOrDash(unit.chatTokensPerScan),
      note: "compare against the per-tier grant on the right",
    },
    {
      label: "Cost per chat reply",
      value: formatMicrosOrDash(unit.costPerChatReply),
      note: "reply call only, no guardrail",
    },
    {
      label: "Cost per active user",
      value: formatMicrosOrDash(unit.costPerActiveUser),
      note: `${counts.activeUsers.toLocaleString()} users with activity`,
    },
  ]

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-medium">Unit economics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What one scan and one chat turn actually cost to serve.
          {unit.loadedApplicable
            ? null
            : " Loaded costs are hidden while a model or source filter is active, because the filter shrinks the cost but not the credits it is divided by."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cost per scan (loaded)"
          value={formatMicrosOrDash(unit.costPerScanLoaded)}
          tooltip={exactCost(unit.costPerScanLoaded)}
          hint="All provider spend divided by credits debited"
        />
        <StatCard
          label="Cost per scan (direct)"
          value={formatMicrosOrDash(unit.costPerScanDirect)}
          tooltip={exactCost(unit.costPerScanDirect)}
          hint={
            unit.tokensPerScan === null
              ? "Scan analysis calls only"
              : `${formatTokensOrDash(unit.tokensPerScan)} tokens per scan`
          }
        />
        <StatCard
          label="Cost per chat turn"
          value={formatMicrosOrDash(unit.costPerChatTurnLoaded)}
          tooltip={exactCost(unit.costPerChatTurnLoaded)}
          hint="Reply plus its guardrail and recommendation passes"
        />
        <StatCard
          label="Cost per conversation"
          value={formatMicrosOrDash(unit.costPerConversation)}
          tooltip={exactCost(unit.costPerConversation)}
          hint={
            unit.tokensPerConversation === null
              ? undefined
              : `${formatTokensOrDash(unit.tokensPerConversation)} tokens each`
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EconomicsPanel
          title="Efficiency"
          description="Averages over the selected window."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {efficiencyRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <p className="font-medium">{row.label}</p>
                    {row.note ? (
                      <p className="text-xs text-muted-foreground">{row.note}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums align-top">
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </EconomicsPanel>

        <EconomicsPanel
          title="Chat budget calibration"
          description="Actual chat tokens spent per scan credit against the grant each tier receives. Well under 100% means the grant is more generous than it needs to be; at or over 100% means users are hitting the wall."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Granted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chatBudget.map((row) => (
                <TableRow key={row.tier}>
                  <TableCell className="font-medium capitalize">
                    {row.tier}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.grantedTokensPerScan.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokensOrDash(row.actualTokensPerScan)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercentOrDash(row.utilizationPercent, 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Tier attribution follows each model&apos;s current assigned tier, so
            reassigning a model moves its historical rows. Rows read {NO_VALUE}{" "}
            until a tier has scan activity in the window.
          </p>
        </EconomicsPanel>
      </div>
    </section>
  )
}
