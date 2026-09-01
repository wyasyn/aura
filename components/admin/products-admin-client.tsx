"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"

import { CatalogueSyncPanel } from "@/components/admin/catalogue-sync-panel"
import {
  ProductEditorForm,
  type ProductRecord,
} from "@/components/admin/product-editor"
import { ProductQualityTable } from "@/components/admin/product-quality-table"
import type { CatalogueHealth, ProductQualityRow } from "@/lib/products/catalogue-health"
import { Button } from "@/components/ui/button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"

/**
 * The catalogue admin surface.
 *
 * Sync first, then the catalogue as a data-quality table. The card grid it
 * replaces showed a product's picture and one concern tag, which is the view
 * for choosing a product rather than for maintaining one — an administrator
 * looking at this page needs to see which products the engine cannot yet
 * understand, and that is not visible in a photograph.
 */

type ProductsAdminClientProps = {
  products: ProductRecord[]
  rows: ProductQualityRow[]
  health: CatalogueHealth
}

export function ProductsAdminClient({
  products,
  rows,
  health,
}: ProductsAdminClientProps) {
  const router = useRouter()
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = products.find((product) => product.id === selectedId) ?? null

  function openCreate() {
    setSelectedId(null)
    setEditorOpen(true)
  }

  function handleClose(open: boolean) {
    setEditorOpen(open)
    if (!open) setSelectedId(null)
  }

  return (
    <>
      <div className="space-y-6">
        <CatalogueSyncPanel health={health} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-sm font-medium">Catalogue</h2>
              <p className="text-xs text-muted-foreground">
                Source data comes from the store; intelligence is extracted and
                may be corrected here. Average completeness {health.averageCompleteness}%.
              </p>
            </div>
            <Button type="button" size="sm" onClick={openCreate}>
              <IconPlus className="size-4" aria-hidden />
              Add product
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products yet.</p>
          ) : (
            <ProductQualityTable
              rows={rows}
              onOpen={(id) => {
                setSelectedId(id)
                setEditorOpen(true)
              }}
            />
          )}
        </div>
      </div>

      <ResponsiveDialog
        open={editorOpen}
        onOpenChange={handleClose}
        title={selected ? "Edit product" : "Add product"}
        description={
          selected
            ? "Tune recommendation matching tags and product summary."
            : "Add a product for personalized scan recommendations."
        }
      >
        <ProductEditorForm
          key={selected?.id ?? "new"}
          product={selected}
          onSaved={() => {
            setEditorOpen(false)
            setSelectedId(null)
            router.refresh()
          }}
          onDeleted={() => {
            setEditorOpen(false)
            setSelectedId(null)
            router.refresh()
          }}
        />
      </ResponsiveDialog>
    </>
  )
}
