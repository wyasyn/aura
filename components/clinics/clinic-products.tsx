"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  archiveClinicProductAction,
  createClinicProductAction,
  setClinicProductRecommendableAction,
} from "@/lib/clinics/product-actions"
import { PRODUCT_CLASSIFICATIONS } from "@/lib/products/schemas"

type ProductRow = {
  id: string
  name: string
  slug: string
  sku: string
  description: string
  category: string
  classifications: string[]
  imageUrl: string | null
  storeUrl: string | null
  isActive: boolean
  isRecommendable: boolean
}

const CLASSIFICATION_LABEL: Record<string, string> = {
  organic: "Organic",
  natural: "Natural",
  synthetic: "Synthetic",
  dermatological: "Dermatological",
  ayurvedic: "Ayurvedic",
  clinical: "Clinical",
  other: "Other",
}

/**
 * A clinic's view of both catalogues.
 *
 * The two lists are never merged. Aurora's products are read-only here — a
 * clinic recommends from them but does not own them — and its own are the only
 * ones carrying controls, which makes the boundary visible rather than merely
 * enforced on the server.
 */
export function ClinicProducts({
  auroraProducts,
  clinicProducts,
  clinicName,
  canManage,
}: {
  auroraProducts: ProductRow[]
  clinicProducts: ProductRow[]
  clinicName: string
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

  function run(work: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await work()
        toast.success(success)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "That didn't work")
      }
    })
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-medium">My Clinic Products</h2>
            <p className="text-muted-foreground text-sm">
              Yours alone. Offered alongside the Aurora catalogue to your patients,
              and never visible to another clinic.
            </p>
          </div>
          {canManage ? (
            <Button size="sm" onClick={() => setShowForm((open) => !open)}>
              {showForm ? "Cancel" : "Add product"}
            </Button>
          ) : null}
        </div>

        {showForm && canManage ? (
          <NewProductForm
            pending={pending}
            onCreate={(values) =>
              run(async () => {
                await createClinicProductAction(values)
                setShowForm(false)
              }, "Product added")
            }
          />
        ) : null}

        {clinicProducts.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
            No clinic products yet. Anything you add here is recommended to your
            patients alongside Aurora&apos;s catalogue.
          </p>
        ) : (
          <ul className="divide-border divide-y rounded-xl border border-border/60">
            {clinicProducts.map((product) => (
              <li key={product.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{product.name}</p>
                    <Badge variant="secondary">{clinicName}</Badge>
                    {!product.isActive ? <Badge variant="outline">archived</Badge> : null}
                    {product.isActive && !product.isRecommendable ? (
                      <Badge variant="outline">not recommended</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-sm">{product.description}</p>
                  <Classifications values={product.classifications} />
                </div>

                {canManage && product.isActive ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            setClinicProductRecommendableAction({
                              productId: product.id,
                              isRecommendable: !product.isRecommendable,
                            }),
                          product.isRecommendable
                            ? "Withdrawn from recommendations"
                            : "Available for recommendations",
                        )
                      }
                    >
                      {product.isRecommendable ? "Withdraw" : "Recommend"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => archiveClinicProductAction({ productId: product.id }),
                          "Product archived",
                        )
                      }
                    >
                      Archive
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-medium">Aurora Catalogue</h2>
          <p className="text-muted-foreground text-sm">
            Managed by Aurora and available to every clinic. Your patients can be
            recommended these; they are not yours to edit.
          </p>
        </div>

        <ul className="divide-border divide-y rounded-xl border border-border/60">
          {auroraProducts.map((product) => (
            <li key={product.id} className="space-y-1 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{product.name}</p>
                <Badge variant="outline">Aurora Catalogue</Badge>
              </div>
              <p className="text-muted-foreground text-sm">{product.description}</p>
              <Classifications values={product.classifications} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Classifications({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <p className="text-muted-foreground text-xs">Unclassified</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {values.map((value) => (
        <Badge key={value} variant="secondary" className="text-xs font-normal">
          {CLASSIFICATION_LABEL[value] ?? value}
        </Badge>
      ))}
    </div>
  )
}

/**
 * The create form.
 *
 * Carries no ownership field of any kind — the tenant comes from the session on
 * the server, so there is nothing here for a caller to point at another clinic.
 */
function NewProductForm({
  pending,
  onCreate,
}: {
  pending: boolean
  onCreate: (values: Record<string, unknown>) => void
}) {
  const [classifications, setClassifications] = useState<string[]>([])

  function toggle(value: string) {
    setClassifications((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-border/60 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const list = (key: string) =>
          String(form.get(key) ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)

        onCreate({
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
          category: String(form.get("category") ?? ""),
          sku: String(form.get("sku") ?? "") || undefined,
          slug: String(form.get("slug") ?? "") || undefined,
          ingredients: String(form.get("ingredients") ?? ""),
          imageUrl: String(form.get("imageUrl") ?? ""),
          storeUrl: String(form.get("storeUrl") ?? ""),
          targetConcerns: list("targetConcerns"),
          suitableSkinTypes: list("suitableSkinTypes"),
          climateTags: list("climateTags"),
          classifications,
          isRecommendable: form.get("isRecommendable") === "on",
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Product name" required />
        <Field name="category" label="Product type" required placeholder="face-hands" />
        <Field name="sku" label="SKU" placeholder="Generated if left blank" />
        <Field name="slug" label="Slug" placeholder="Generated if left blank" />
        <Field name="imageUrl" label="Image URL" type="url" />
        <Field name="storeUrl" label="Store URL" type="url" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" required rows={3} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ingredients">Ingredients</Label>
        <Textarea
          id="ingredients"
          name="ingredients"
          rows={2}
          placeholder="INCI list, comma separated. Used for allergy filtering."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="targetConcerns" label="Target concerns" placeholder="dryness, redness" />
        <Field name="suitableSkinTypes" label="Skin types" placeholder="dry, sensitive" />
        <Field name="climateTags" label="Climate tags" placeholder="humid, dry" />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Classification</legend>
        <p className="text-muted-foreground text-xs">
          Choose every one that applies. Organic and natural are different claims,
          so pick both only when both are true. Selecting none leaves the product
          unclassified.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {PRODUCT_CLASSIFICATIONS.map((value) => {
            const active = classifications.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggle(value)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/60"
                }`}
              >
                {CLASSIFICATION_LABEL[value] ?? value}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isRecommendable" defaultChecked className="size-4" />
        Available for recommendations
      </label>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add product"}
      </Button>
    </form>
  )
}

function Field({
  name,
  label,
  required,
  placeholder,
  type = "text",
}: {
  name: string
  label: string
  required?: boolean
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} />
    </div>
  )
}
