"use client"

import Image from "next/image"

import type { ProductQualityRow } from "@/lib/products/catalogue-health"
import {
  originLabel,
  type ProvenanceField,
} from "@/lib/products/intelligence/provenance"
import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/products/placeholder"

/**
 * One product, with its source data and its derived intelligence kept apart.
 *
 * The separation is the point. What the store said about a product and what
 * Aurora concluded from it are different kinds of claim, and an administrator
 * deciding whether to verify needs to see which is which — a single merged list
 * would invite them to confirm a merchant's own words as though somebody had
 * checked them.
 *
 * Provenance is shown only where it was recorded. Fields written before that
 * column existed show nothing rather than a guess, because asserting an origin
 * nobody established is exactly the failure this is meant to prevent.
 */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div>
        <h4 className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h4>
        {description ? (
          <p className="text-[0.65rem] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  value,
  origin,
}: {
  label: string
  value: string | null
  origin?: ProvenanceField extends never ? never : string | null
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 py-1 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-xs text-foreground">
          {value?.trim() ? value : <span className="text-muted-foreground/50">—</span>}
        </span>
        {origin ? (
          <span className="rounded-sm border border-border px-1 text-[0.6rem] text-muted-foreground">
            {origin}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function list(values: string[]): string | null {
  return values.length > 0 ? values.join(", ") : null
}

function price(row: ProductQualityRow): string | null {
  if (row.priceCents === null) return null
  return `${(row.priceCents / 100).toFixed(2)} ${row.currency ?? ""}`.trim()
}

export function ProductIntelligenceDetail({ row }: { row: ProductQualityRow }) {
  const origin = (field: ProvenanceField) => originLabel(row.provenance[field])

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Section title="Product">
        <div className="flex gap-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-muted">
            <Image
              src={row.imageUrl?.trim() ? row.imageUrl : PRODUCT_IMAGE_PLACEHOLDER}
              alt={row.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Field label="SKU" value={row.sku} />
            <Field label="Source" value={row.source} />
            <Field label="External id" value={row.externalId} />
            <Field label="Price" value={price(row)} />
            <Field label="Availability" value={row.availability.replace(/_/g, " ")} />
          </div>
        </div>
      </Section>

      <Section
        title="Source information"
        description="Owned by the store. A sync overwrites these; nothing here is derived."
      >
        <Field label="Category" value={row.category} />
        <Field
          label="Description"
          value={
            row.description.length > 120
              ? `${row.description.slice(0, 120)}…`
              : row.description
          }
        />
        <Field label="Ingredients supplied" value={row.ingredients} />
        <Field
          label="Last synced"
          value={row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleString() : null}
        />
      </Section>

      <Section
        title="Product intelligence"
        description="Derived by extraction or corrected here. Never written by a sync once established."
      >
        <Field
          label="Classification"
          value={row.primaryClassification}
          origin={origin("primaryClassification")}
        />
        <Field
          label="Skin types"
          value={list(row.suitableSkinTypes)}
          origin={origin("suitableSkinTypes")}
        />
        <Field
          label="Concerns"
          value={list(row.targetConcerns)}
          origin={origin("targetConcerns")}
        />
        <Field
          label="Benefits"
          value={list(row.cosmeticBenefits)}
          origin={origin("cosmeticBenefits")}
        />
        <Field
          label="Climate"
          value={list(row.climateTags)}
          origin={origin("climateTags")}
        />
        <Field
          label="Routine"
          value={row.routineCategory}
          origin={origin("routineCategory")}
        />
        <Field
          label="Linked ingredients"
          value={row.ingredientLinkCount > 0 ? String(row.ingredientLinkCount) : null}
          origin={origin("ingredientList")}
        />
      </Section>
    </div>
  )
}
