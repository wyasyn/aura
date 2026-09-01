"use client"

import { useState, useTransition } from "react"
import { IconExternalLink, IconTrash } from "@tabler/icons-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AURORA_STORE_ORIGIN,
  PRODUCT_BENEFIT_OPTIONS,
  PRODUCT_CLIMATE_TAGS,
  PRODUCT_CONCERN_OPTIONS,
  PRODUCT_SKIN_TYPE_OPTIONS,
} from "@/lib/products/constants"
import { allClassifications } from "@/lib/products/classification"
import {
  CONFIDENT_RECOMMENDATION_THRESHOLD,
  assessCompleteness,
} from "@/lib/products/completeness"
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/lib/products/actions"
import { parseInciList } from "@/lib/products/parse-inci"
import {
  CLIMATE_BANDS,
  PRODUCT_AVAILABILITY,
  PRODUCT_CLASSIFICATIONS,
  ROUTINE_CATEGORIES,
  type ProductFormInput,
} from "@/lib/products/schemas"
import { resolveStoreUrl } from "@/lib/products/store-url"
import { cn } from "@/lib/utils"

export type ProductRecord = {
  id: string
  sku: string
  name: string
  slug: string
  description: string
  brand: string | null
  category: string
  ingredients: string | null
  targetConcerns: string[]
  suitableSkinTypes: string[]
  climateTags: string[]
  imageUrl: string | null
  storeUrl: string | null
  isActive: boolean
  primaryClassification: string | null
  secondaryClassifications: string[]
  cosmeticBenefits: string[]
  routineCategory: string | null
  suitableHumidity: string[]
  suitableTemperature: string[]
  suitableUv: string[]
  environmentalNotes: string | null
  priceCents: number | null
  currency: string | null
  availability: string
  isRecommendable: boolean
  completenessScore: number
}

const EMPTY_FORM: ProductFormInput = {
  name: "",
  description: "",
  brand: "",
  category: "",
  ingredients: "",
  targetConcerns: [],
  suitableSkinTypes: [],
  climateTags: [],
  imageUrl: "",
  storeUrl: "",
  isActive: true,
  classifications: [],
  primaryClassification: null,
  cosmeticBenefits: [],
  routineCategory: null,
  suitableHumidity: [],
  suitableTemperature: [],
  suitableUv: [],
  environmentalNotes: "",
  priceCents: null,
  currency: null,
  availability: "unknown",
  isRecommendable: true,
}

type ProductEditorProps = {
  product: ProductRecord | null
  onSaved: () => void
  onDeleted: () => void
}

function toggleItem(list: string[], item: string) {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
}

function ChipSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="rounded-lg capitalize"
              onClick={() => onChange(toggleItem(selected, option))}
            >
              {option.replace(/_/g, " ")}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * How much of this product a recommendation could actually reason from.
 *
 * Live rather than on save, because the point is to make the gap visible while
 * it can still be closed. It names what is missing instead of only scoring:
 * "62%" tells an administrator nothing they can act on, "no skin types" does.
 */
function CompletenessMeter({ form }: { form: ProductFormInput }) {
  const report = assessCompleteness({
    name: form.name,
    description: form.description,
    brand: form.brand,
    imageUrl: form.imageUrl,
    primaryClassification: form.primaryClassification,
    targetConcerns: form.targetConcerns,
    suitableSkinTypes: form.suitableSkinTypes,
    cosmeticBenefits: form.cosmeticBenefits,
    climateTags: form.climateTags,
    ingredients: form.ingredients,
    routineCategory: form.routineCategory,
    priceCents: form.priceCents,
  })

  const confident = report.score >= CONFIDENT_RECOMMENDATION_THRESHOLD

  return (
    <div className="border-border/60 mt-4 space-y-2 rounded-lg border p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Recommendation readiness</span>
        <span className="font-mono text-sm tabular-nums">{report.score}%</span>
      </div>

      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            confident ? "bg-primary" : "bg-muted-foreground/50",
          )}
          style={{ width: `${report.score}%` }}
        />
      </div>

      {report.missing.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Missing: {report.missing.join(" · ")}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Everything a recommendation needs is filled in.
        </p>
      )}
    </div>
  )
}

function mapProductToForm(product: ProductRecord): ProductFormInput {
  return {
    name: product.name,
    description: product.description,
    brand: product.brand ?? "",
    category: product.category,
    ingredients: product.ingredients ?? "",
    targetConcerns: product.targetConcerns,
    suitableSkinTypes: product.suitableSkinTypes,
    climateTags: product.climateTags,
    imageUrl: product.imageUrl ?? "",
    storeUrl: product.storeUrl ?? "",
    isActive: product.isActive,
    // Storage splits primary from the rest; the form works with the flat set
    // plus a nomination, so the two are recombined here and split again on save.
    classifications: allClassifications(product) as ProductFormInput["classifications"],
    primaryClassification:
      product.primaryClassification as ProductFormInput["primaryClassification"],
    cosmeticBenefits: product.cosmeticBenefits as ProductFormInput["cosmeticBenefits"],
    routineCategory: product.routineCategory as ProductFormInput["routineCategory"],
    suitableHumidity: product.suitableHumidity as ProductFormInput["suitableHumidity"],
    suitableTemperature:
      product.suitableTemperature as ProductFormInput["suitableTemperature"],
    suitableUv: product.suitableUv as ProductFormInput["suitableUv"],
    environmentalNotes: product.environmentalNotes ?? "",
    priceCents: product.priceCents,
    currency: product.currency,
    availability: product.availability as ProductFormInput["availability"],
    isRecommendable: product.isRecommendable,
  }
}

export function ProductEditorForm({
  product,
  onSaved,
  onDeleted,
}: ProductEditorProps) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [editorTab, setEditorTab] = useState("basics")
  const [form, setForm] = useState<ProductFormInput>(
    product ? mapProductToForm(product) : EMPTY_FORM,
  )
  const isEditing = Boolean(product)
/**
 * What to tell the administrator after a product is created.
 *
 * Extraction succeeding is not the same as the product being usable, and the
 * message says which happened. "Needs review" is an honest outcome, not an
 * error: the extraction ran and found too little in the product's own
 * description for the engine to rely on.
 */
function describeCreation(
  extraction: Awaited<ReturnType<typeof createProductAction>>["extraction"],
): string {
  if (!extraction.ok) {
    if (extraction.status === "failed") {
      return "Product saved, but intelligence extraction failed. It can be retried from the catalogue."
    }
    return `Product saved. Extraction skipped: ${extraction.reason}`
  }

  if (extraction.status === "extracted") {
    return `Product saved and intelligence extracted (${extraction.completenessScore}% complete). It is now recommendable.`
  }

  return `Product saved and intelligence extracted (${extraction.completenessScore}% complete), but it needs review before the engine can use it. Missing: ${extraction.missing.join(", ")}`
}


  const ingredientPreview = parseInciList(form.ingredients ?? "")
  const previewStoreUrl =
    isEditing && product
      ? resolveStoreUrl({
          storeUrl: form.storeUrl,
          slug: product.slug,
        })
      : form.storeUrl?.trim() || null

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          try {
            if (isEditing && product) {
              await updateProductAction(product.id, form)
              setMessage("Product updated.")
            } else {
              // Creation runs the extraction server-side and returns its
              // outcome, so the administrator learns in one step whether the
              // product is usable rather than having to go looking.
              const { extraction } = await createProductAction(form)
              setMessage(describeCreation(extraction))
              setForm(EMPTY_FORM)
            }
            onSaved()
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Save failed",
            )
          }
        })
      }}
    >
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isEditing && product ? (
          <p className="text-muted-foreground mb-4 font-mono text-xs">
            {product.sku} · {product.slug}
          </p>
        ) : null}

        <Tabs value={editorTab} onValueChange={setEditorTab} variant="underline">
          <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="targeting">Targeting</TabsTrigger>
            <TabsTrigger value="intelligence">Classification</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
            <TabsTrigger value="display">Store &amp; display</TabsTrigger>
          </TabsList>

          <CompletenessMeter form={form} />

          <TabsContent value="basics">
            <section className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">How it helps</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  required
                  rows={3}
                  placeholder="Short cosmetic summary for recommendations"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Product type</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  required
                  placeholder="e.g. serum, cleanser, moisturizer"
                />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="targeting">
            <section className="space-y-4">
              <p className="text-muted-foreground text-xs">
                Used to match this product to scan results and skin goals.
              </p>

              <ChipSelect
                label="Target concerns"
                options={PRODUCT_CONCERN_OPTIONS}
                selected={form.targetConcerns}
                onChange={(targetConcerns) => setForm({ ...form, targetConcerns })}
              />

              <ChipSelect
                label="Suitable skin types"
                options={PRODUCT_SKIN_TYPE_OPTIONS}
                selected={form.suitableSkinTypes}
                onChange={(suitableSkinTypes) =>
                  setForm({ ...form, suitableSkinTypes })
                }
              />

              <ChipSelect
                label="Climate tags"
                options={PRODUCT_CLIMATE_TAGS}
                selected={form.climateTags}
                onChange={(climateTags) => setForm({ ...form, climateTags })}
              />

              <div className="border-border/60 space-y-4 rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Climate suitability</p>
                  <p className="text-muted-foreground text-xs">
                    Which conditions this suits, in the same bands a user&apos;s
                    live climate is recorded in. Leave a row empty to say nothing
                    rather than to say &ldquo;none&rdquo;.
                  </p>
                </div>

                <ChipSelect
                  label="Humidity"
                  options={CLIMATE_BANDS}
                  selected={form.suitableHumidity}
                  onChange={(next) =>
                    setForm({
                      ...form,
                      suitableHumidity: next as ProductFormInput["suitableHumidity"],
                    })
                  }
                />

                <ChipSelect
                  label="Temperature"
                  options={CLIMATE_BANDS}
                  selected={form.suitableTemperature}
                  onChange={(next) =>
                    setForm({
                      ...form,
                      suitableTemperature:
                        next as ProductFormInput["suitableTemperature"],
                    })
                  }
                />

                <ChipSelect
                  label="UV"
                  options={CLIMATE_BANDS}
                  selected={form.suitableUv}
                  onChange={(next) =>
                    setForm({
                      ...form,
                      suitableUv: next as ProductFormInput["suitableUv"],
                    })
                  }
                />

                <div className="space-y-2">
                  <Label htmlFor="environmentalNotes">Environmental notes</Label>
                  <Textarea
                    id="environmentalNotes"
                    value={form.environmentalNotes ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, environmentalNotes: event.target.value })
                    }
                    rows={2}
                    placeholder="Anything that does not fit a band"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ingredients">Key ingredients</Label>
                <Textarea
                  id="ingredients"
                  value={form.ingredients ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, ingredients: event.target.value })
                  }
                  rows={3}
                  placeholder="Optional — helps explain why it fits certain concerns"
                />
                {form.ingredients?.trim() ? (
                  <p className="text-muted-foreground text-xs">
                    {ingredientPreview.isLikelyInciList
                      ? `Parsed: ${ingredientPreview.items.length} INCI ingredient${ingredientPreview.items.length === 1 ? "" : "s"}`
                      : "Not a valid INCI list — saved as key-ingredient notes only"}
                  </p>
                ) : null}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="intelligence">
            <section className="space-y-4">
              <p className="text-muted-foreground text-xs">
                What this product is, so a recommendation can match a
                preference. Organic and natural are different claims — pick both
                only when both are true.
              </p>

              <ChipSelect
                label="Classifications"
                options={PRODUCT_CLASSIFICATIONS}
                selected={form.classifications}
                onChange={(next) => {
                  const classifications =
                    next as ProductFormInput["classifications"]
                  setForm({
                    ...form,
                    classifications,
                    // A primary that is no longer selected would claim something
                    // the form is not asserting.
                    primaryClassification: classifications.includes(
                      form.primaryClassification ??
                        ("" as ProductFormInput["classifications"][number]),
                    )
                      ? form.primaryClassification
                      : (classifications[0] ?? null),
                  })
                }}
              />

              {form.classifications.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="primaryClassification">
                    Principally a…
                  </Label>
                  <select
                    id="primaryClassification"
                    className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm capitalize"
                    value={form.primaryClassification ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        primaryClassification: (event.target.value ||
                          null) as ProductFormInput["primaryClassification"],
                      })
                    }
                  >
                    {form.classifications.map((value) => (
                      <option key={value} value={value}>
                        {value.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <p className="text-muted-foreground text-xs">
                    The one answer to &ldquo;what is this?&rdquo;. The rest stay
                    as secondary claims.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Unclassified. Deliberately different from choosing
                  &ldquo;other&rdquo;, which says it was assessed and fits
                  nothing.
                </p>
              )}

              <ChipSelect
                label="Cosmetic benefits"
                options={PRODUCT_BENEFIT_OPTIONS}
                selected={form.cosmeticBenefits}
                onChange={(next) =>
                  setForm({
                    ...form,
                    cosmeticBenefits: next as ProductFormInput["cosmeticBenefits"],
                  })
                }
              />

              <div className="space-y-2">
                <Label htmlFor="routineCategory">Routine step</Label>
                <select
                  id="routineCategory"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm capitalize"
                  value={form.routineCategory ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      routineCategory: (event.target.value ||
                        null) as ProductFormInput["routineCategory"],
                    })
                  }
                >
                  <option value="">Not placed</option>
                  {ROUTINE_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  Ordering is derived from this, so two products in the same
                  category always sort together.
                </p>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="commercial">
            <section className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={form.brand ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, brand: event.target.value })
                  }
                  placeholder="Who makes it"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                      typeof form.priceCents === "number"
                        ? (form.priceCents / 100).toFixed(2)
                        : ""
                    }
                    onChange={(event) => {
                      const raw = event.target.value.trim()
                      setForm({
                        ...form,
                        // Stored in minor units so no rounding survives a save.
                        priceCents: raw
                          ? Math.round(Number.parseFloat(raw) * 100)
                          : null,
                      })
                    }}
                    placeholder="Leave blank if priced in the store"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={form.currency ?? ""}
                    maxLength={3}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        currency: event.target.value.toUpperCase() || null,
                      })
                    }
                    placeholder="USD"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <select
                  id="availability"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={form.availability}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      availability: event.target
                        .value as ProductFormInput["availability"],
                    })
                  }
                >
                  {PRODUCT_AVAILABILITY.map((value) => (
                    <option key={value} value={value}>
                      {value.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={form.isRecommendable}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isRecommendable: checked === true })
                  }
                />
                <span>
                  Available for recommendations
                  <span className="text-muted-foreground block text-xs">
                    Unticking withdraws it from new advice while leaving it
                    listed, so reports a patient already holds still resolve.
                  </span>
                </span>
              </label>
            </section>
          </TabsContent>

          <TabsContent value="display">
            <section className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeUrl">Store page URL</Label>
                <Input
                  id="storeUrl"
                  type="url"
                  value={form.storeUrl ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, storeUrl: event.target.value })
                  }
                  placeholder={`${AURORA_STORE_ORIGIN}/product/...`}
                />
                {previewStoreUrl ? (
                  <a
                    href={previewStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                  >
                    Open live product page
                    <IconExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={form.imageUrl ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, imageUrl: event.target.value })
                  }
                  placeholder="https://"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(value) =>
                    setForm({ ...form, isActive: value === true })
                  }
                />
                Include in recommendations
              </label>
            </section>
          </TabsContent>
        </Tabs>

        {message ? (
          <p
            className={cn(
              "text-sm",
              message.includes("failed") || message.includes("Delete")
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {message}
          </p>
        ) : null}
      </div>

      <div className="bg-background shrink-0 border-t border-border px-6 py-4">
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEditing ? "Save changes" : "Create product"}
          </Button>
          {isEditing && product ? (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (!product) return
                  if (!window.confirm(`Delete ${product.name}?`)) return
                  try {
                    await deleteProductAction(product.id)
                    setMessage("Product deleted.")
                    onDeleted()
                  } catch (error) {
                    setMessage(
                      error instanceof Error ? error.message : "Delete failed",
                    )
                  }
                })
              }
            >
              <IconTrash className="size-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  )
}

export function ProductEditor(props: ProductEditorProps) {
  return <ProductEditorForm key={props.product?.id ?? "new"} {...props} />
}
