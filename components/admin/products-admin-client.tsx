"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { IconPlus, IconRefresh } from "@tabler/icons-react"

import {
  ProductEditorForm,
  type ProductRecord,
} from "@/components/admin/product-editor"
import { ProductCard } from "@/components/products/product-card"
import { syncProductsFromStoreAction } from "@/lib/products/ingest/actions"
import { resolveStoreUrl } from "@/lib/products/store-url"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"

function formatCatalogSubtitle(product: ProductRecord) {
  const concern = product.targetConcerns[0]?.replace(/_/g, " ")
  if (product.category && concern) {
    return `${product.category} · ${concern}`
  }
  return product.category || concern || "No matching tags yet"
}

type ProductsAdminClientProps = {
  products: ProductRecord[]
}

export function ProductsAdminClient({ products }: ProductsAdminClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = products.find((product) => product.id === selectedId) ?? null

  function openCreate() {
    setSelectedId(null)
    setEditorOpen(true)
  }

  function openEdit(id: string) {
    setSelectedId(id)
    setEditorOpen(true)
  }

  function handleClose(open: boolean) {
    setEditorOpen(open)
    if (!open) {
      setSelectedId(null)
    }
  }

  return (
    <>
      <div className="rounded-lg  ">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-medium">Catalog</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    const result = await syncProductsFromStoreAction()
                    setSyncMessage(result.message)
                    router.refresh()
                  } catch (error) {
                    setSyncMessage(
                      error instanceof Error ? error.message : "Sync failed",
                    )
                  }
                })
              }
            >
              <IconRefresh className="size-4" />
              Sync from store
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              <IconPlus className="size-4" />
              Add product
            </Button>
          </div>
        </div>

        {syncMessage ? (
          <p className="text-muted-foreground mt-3 text-xs">{syncMessage}</p>
        ) : null}
        <p className="text-muted-foreground mt-2 text-xs">
          Store embed: iframe <code className="font-mono">/embed/scan</code> on
          auroraorganics.co
        </p>

        {products.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">No products yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                subtitle={formatCatalogSubtitle(product)}
                imageUrl={product.imageUrl}
                storeUrl={resolveStoreUrl({
                  storeUrl: product.storeUrl,
                  slug: product.slug,
                })}
                imageAspect="square"
                selected={selectedId === product.id && editorOpen}
                onClick={() => openEdit(product.id)}
                badge={
                  !product.isActive ? (
                    <Badge variant="secondary">Inactive</Badge>
                  ) : null
                }
              />
            ))}
          </div>
        )}
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
