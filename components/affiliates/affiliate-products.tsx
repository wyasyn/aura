"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { IconCopy, IconExternalLink, IconSearch } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type AffiliateProductRow = {
  id: string
  name: string
  category: string
  imageUrl: string | null
  shareLink: string | null
}

export function AffiliateProducts({
  products,
  couponCode,
}: {
  products: AffiliateProductRow[]
  couponCode: string | null
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return products
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term),
    )
  }, [products, query])

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  }

  if (!couponCode) {
    return (
      <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
        Your referral code hasn&apos;t been issued yet, so share links can&apos;t
        be generated. Check back shortly.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel space-y-3 rounded-xl border border-border/60 p-5">
        <p className="font-medium">How you get paid</p>
        <p className="text-muted-foreground text-sm">
          Commission is earned on your <strong>code</strong>, not on the link.
          The links below carry the code so customers don&apos;t have to
          remember it — but whether it applies automatically depends on the
          store, and a customer who types it at checkout is always credited.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md border border-border/60 bg-muted px-3 py-1.5 font-mono text-sm">
            {couponCode}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(couponCode, "Code")}
          >
            <IconCopy className="size-4" />
            Copy code
          </Button>
        </div>
      </div>

      <div className="relative">
        <IconSearch className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by name or category"
          className="pl-9"
          aria-label="Search products"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
          {products.length === 0
            ? "No products in the catalogue yet."
            : `Nothing matches "${query}".`}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="surface-panel flex flex-col gap-3 rounded-xl border border-border/60 p-4"
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- catalogue
                // images come from the store on arbitrary hosts.
                <img
                  src={product.imageUrl}
                  alt=""
                  className="h-32 w-full rounded-lg bg-white object-contain p-2"
                />
              ) : (
                <div className="text-muted-foreground flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs">
                  No image
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm font-medium">{product.name}</p>
                <Badge variant="outline">{product.category}</Badge>
              </div>

              {product.shareLink ? (
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => copy(product.shareLink!, "Link")}
                  >
                    <IconCopy className="size-4" />
                    Copy link
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a
                      href={product.shareLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${product.name} in the store`}
                    >
                      <IconExternalLink className="size-4" />
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground mt-auto text-xs">
                  No store link for this product yet.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
