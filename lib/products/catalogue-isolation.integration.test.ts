import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, describe, it } from "node:test"

import {
  productOwnerFilter,
  recommendableProductsWhere,
  visibleProductsWhere,
} from "@/lib/products/catalogue-scope"
import { prisma } from "@/lib/db/client"

/**
 * Catalogue isolation, exercised against the real database.
 *
 * The recommendation pipeline reads products in four places, and the guarantee
 * is that all four are bounded by the same rule: Aurora's products plus the
 * current clinic's, never a third party's. The rule itself is pure and tested
 * directly; the queries it produces are run against real rows, because a filter
 * that composes wrongly with `slug in (...)` would pass a unit test and leak in
 * production.
 *
 * Two clinics and their products are created here and removed afterwards.
 */

const RUN = randomUUID().slice(0, 8)
const created = { organizationIds: [] as string[], userIds: [] as string[] }

type Fixture = { organizationId: string; productId: string; slug: string }

let clinicA: Fixture
let clinicB: Fixture
let auroraSlug: string
let auroraId: string

async function makeClinicWithProduct(label: string): Promise<Fixture> {
  const userId = randomUUID()
  await prisma.user.create({
    data: {
      id: userId,
      email: `cat-${RUN}-${label}@example.test`,
      name: `Catalogue ${label}`,
      emailVerified: true,
      role: "user",
    },
  })
  created.userIds.push(userId)

  const organizationId = randomUUID()
  await prisma.organization.create({
    data: { id: organizationId, name: `Catalogue ${label} ${RUN}`, slug: `cat-${RUN}-${label}` },
  })
  created.organizationIds.push(organizationId)

  // Deliberately the SAME slug and sku in both clinics: proving two tenants can
  // hold one name is half the point of the composite uniqueness.
  const slug = `shared-serum-${RUN}`
  const product = await prisma.product.create({
    data: {
      sku: `SHARED-${RUN}`,
      slug,
      name: `${label} Vitamin C Serum`,
      description: `Private to clinic ${label}.`,
      category: "face-hands",
      primaryClassification: "clinical",
      isActive: true,
      isRecommendable: true,
      createdById: userId,
      organizationId,
    },
    select: { id: true },
  })

  return { organizationId, productId: product.id, slug }
}

before(async () => {
  clinicA = await makeClinicWithProduct("a")
  clinicB = await makeClinicWithProduct("b")

  const adminId = randomUUID()
  await prisma.user.create({
    data: {
      id: adminId,
      email: `cat-${RUN}-aurora@example.test`,
      name: "Catalogue Aurora",
      emailVerified: true,
      role: "admin",
    },
  })
  created.userIds.push(adminId)

  auroraSlug = `aurora-cleanser-${RUN}`
  const aurora = await prisma.product.create({
    data: {
      sku: `AURORA-${RUN}`,
      slug: auroraSlug,
      name: "Aurora Gentle Cleanser",
      description: "Global product.",
      category: "face-hands",
      primaryClassification: "natural", secondaryClassifications: ["organic"],
      isActive: true,
      isRecommendable: true,
      createdById: adminId,
      organizationId: null,
    },
    select: { id: true },
  })
  auroraId = aurora.id
})

after(async () => {
  await prisma.product.deleteMany({ where: { id: auroraId } })
  await prisma.product.deleteMany({
    where: { organizationId: { in: created.organizationIds } },
  })
  await prisma.organization.deleteMany({
    where: { id: { in: created.organizationIds } },
  })
  await prisma.user.deleteMany({ where: { id: { in: created.userIds } } })
})

/** The slugs a given scope may recommend from. */
async function recommendableSlugs(scope: string | null): Promise<Set<string>> {
  const rows = await prisma.product.findMany({
    where: recommendableProductsWhere(scope),
    select: { slug: true, organizationId: true },
  })
  return new Set(rows.map((r) => `${r.organizationId ?? "aurora"}:${r.slug}`))
}

describe("the visibility rule itself", () => {
  it("the platform sees only Aurora products", () => {
    assert.deepEqual(productOwnerFilter(null), { organizationId: null })
  })

  it("a clinic sees Aurora products and its own", () => {
    assert.deepEqual(productOwnerFilter("org-a"), {
      OR: [{ organizationId: null }, { organizationId: "org-a" }],
    })
  })

  // Forgetting to resolve a scope must narrow the catalogue, never widen it.
  it("an absent scope fails closed", () => {
    for (const scope of [null, undefined as unknown as null, "" as unknown as null]) {
      assert.deepEqual(productOwnerFilter(scope), { organizationId: null })
    }
  })

  it("recommendable requires active and recommendable; visible requires only active", () => {
    const rec = recommendableProductsWhere("org-a")
    assert.equal(rec.isActive, true)
    assert.equal(rec.isRecommendable, true)

    const vis = visibleProductsWhere("org-a") as { isActive: boolean } & Record<string, unknown>
    assert.equal(vis.isActive, true)
    assert.equal("isRecommendable" in vis, false)
  })
})

describe("a clinic's catalogue", () => {
  it("contains Aurora products", async () => {
    const slugs = await recommendableSlugs(clinicA.organizationId)
    assert.ok(slugs.has(`aurora:${auroraSlug}`), "clinic A must see the Aurora product")
  })

  it("contains its own products", async () => {
    const slugs = await recommendableSlugs(clinicA.organizationId)
    assert.ok(slugs.has(`${clinicA.organizationId}:${clinicA.slug}`))
  })

  // The guarantee the whole feature rests on.
  it("never contains another clinic's products", async () => {
    const slugs = await recommendableSlugs(clinicA.organizationId)
    assert.ok(
      !slugs.has(`${clinicB.organizationId}:${clinicB.slug}`),
      "clinic A must not see clinic B's product",
    )
  })

  it("holds in both directions", async () => {
    const slugs = await recommendableSlugs(clinicB.organizationId)
    assert.ok(slugs.has(`${clinicB.organizationId}:${clinicB.slug}`))
    assert.ok(!slugs.has(`${clinicA.organizationId}:${clinicA.slug}`))
  })

  it("the platform sees neither clinic's products", async () => {
    const slugs = await recommendableSlugs(null)
    assert.ok(slugs.has(`aurora:${auroraSlug}`))
    assert.ok(!slugs.has(`${clinicA.organizationId}:${clinicA.slug}`))
    assert.ok(!slugs.has(`${clinicB.organizationId}:${clinicB.slug}`))
  })
})

describe("a shared slug resolves to one product per tenant", () => {
  // Both clinics hold the same slug. The lookup that resolves a recommendation
  // must return one row, not two, and it must be the caller's own.
  it("clinic A's lookup returns clinic A's row", async () => {
    const rows = await prisma.product.findMany({
      where: { slug: clinicA.slug, ...visibleProductsWhere(clinicA.organizationId) },
      select: { id: true, organizationId: true },
    })
    assert.equal(rows.length, 1, "exactly one product may match a slug per tenant")
    assert.equal(rows[0].id, clinicA.productId)
  })

  it("clinic B's lookup returns clinic B's row", async () => {
    const rows = await prisma.product.findMany({
      where: { slug: clinicB.slug, ...visibleProductsWhere(clinicB.organizationId) },
      select: { id: true },
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].id, clinicB.productId)
  })

  // The forged-slug attack: naming another clinic's product by its slug.
  it("the platform resolves the shared slug to nothing", async () => {
    const rows = await prisma.product.findMany({
      where: { slug: clinicA.slug, ...visibleProductsWhere(null) },
      select: { id: true },
    })
    assert.equal(rows.length, 0)
  })
})

describe("uniqueness is scoped to the owner", () => {
  it("two clinics may hold the same slug and sku", async () => {
    assert.equal(clinicA.slug, clinicB.slug, "the fixture uses one slug for both")
    const both = await prisma.product.findMany({
      where: { slug: clinicA.slug },
      select: { organizationId: true },
    })
    assert.equal(both.length, 2)
  })

  it("one clinic may not hold the same slug twice", async () => {
    await assert.rejects(
      () =>
        prisma.product.create({
          data: {
            sku: `DUPE-${RUN}`,
            slug: clinicA.slug,
            name: "Duplicate",
            description: "Should not be creatable.",
            category: "face-hands",
            createdById: created.userIds[0],
            organizationId: clinicA.organizationId,
          },
        }),
      /Unique constraint|P2002/,
    )
  })

  // The partial index: Postgres treats NULLs as distinct, so the composite
  // constraint alone would let two Aurora products share a slug.
  it("two Aurora products may not hold the same slug", async () => {
    await assert.rejects(
      () =>
        prisma.product.create({
          data: {
            sku: `AURORA-DUPE-${RUN}`,
            slug: auroraSlug,
            name: "Duplicate global",
            description: "Should not be creatable.",
            category: "face-hands",
            createdById: created.userIds[0],
            organizationId: null,
          },
        }),
      /Unique constraint|P2002|duplicate key/,
    )
  })
})

describe("archived and withdrawn products", () => {
  it("an archived product leaves the recommendable catalogue", async () => {
    await prisma.product.update({
      where: { id: clinicA.productId },
      data: { isActive: false },
    })
    const slugs = await recommendableSlugs(clinicA.organizationId)
    assert.ok(!slugs.has(`${clinicA.organizationId}:${clinicA.slug}`))

    await prisma.product.update({
      where: { id: clinicA.productId },
      data: { isActive: true },
    })
  })

  // Withdrawing from the engine must not blank a report the patient already
  // holds, so it leaves the recommendable set but stays visible.
  it("a withdrawn product leaves the engine but stays resolvable", async () => {
    await prisma.product.update({
      where: { id: clinicA.productId },
      data: { isRecommendable: false },
    })

    const recommendable = await recommendableSlugs(clinicA.organizationId)
    assert.ok(!recommendable.has(`${clinicA.organizationId}:${clinicA.slug}`))

    const visible = await prisma.product.findMany({
      where: { slug: clinicA.slug, ...visibleProductsWhere(clinicA.organizationId) },
      select: { id: true },
    })
    assert.equal(visible.length, 1, "still resolvable for existing recommendations")

    await prisma.product.update({
      where: { id: clinicA.productId },
      data: { isRecommendable: true },
    })
  })
})

describe("a WooCommerce sync cannot reach a clinic's product", () => {
  /**
   * The sync matches on slug, and a clinic may legitimately hold the same slug
   * as a store product. This reproduces the lookup the sync performs and proves
   * it selects the global row — matching on slug alone would return two rows
   * here, and updating by slug would have overwritten the clinic's own.
   */
  it("the sync lookup selects the global row when a clinic shares the slug", async () => {
    const shared = `sync-collision-${RUN}`

    const global = await prisma.product.create({
      data: {
        sku: `SYNC-GLOBAL-${RUN}`,
        slug: shared,
        name: "Store Product",
        description: "Owned by the WooCommerce catalogue.",
        category: "face-hands",
        createdById: created.userIds[0],
        organizationId: null,
      },
      select: { id: true },
    })

    const clinicOwned = await prisma.product.create({
      data: {
        sku: `SYNC-CLINIC-${RUN}`,
        slug: shared,
        name: "Clinic Product",
        description: "Owned by clinic A, same slug.",
        category: "face-hands",
        createdById: created.userIds[0],
        organizationId: clinicA.organizationId,
      },
      select: { id: true, name: true, updatedAt: true },
    })

    // Exactly the where clause lib/products/ingest/sync-catalog.ts uses.
    const matched = await prisma.product.findFirst({
      where: { slug: shared, organizationId: null },
      select: { id: true },
    })
    assert.equal(matched?.id, global.id, "the sync must match the global product")

    // Apply a sync-shaped update through that match, then check the clinic's
    // product is byte-for-byte where it was.
    await prisma.product.update({
      where: { id: matched!.id },
      data: { name: "Store Product (synced)", isActive: true },
    })

    const after = await prisma.product.findUniqueOrThrow({
      where: { id: clinicOwned.id },
      select: { name: true, updatedAt: true },
    })
    assert.equal(after.name, clinicOwned.name, "the clinic's product must be untouched")
    assert.equal(
      after.updatedAt.getTime(),
      clinicOwned.updatedAt.getTime(),
      "the clinic's product must not even have been written to",
    )

    await prisma.product.deleteMany({ where: { id: { in: [global.id, clinicOwned.id] } } })
  })
})

describe("the existing Aurora catalogue is untouched", () => {
  it("all 24 seeded products remain global and active", async () => {
    const seeded = await prisma.product.count({
      where: { organizationId: null, NOT: { slug: { contains: RUN } } },
    })
    assert.ok(seeded >= 24, `expected the Aurora catalogue intact, saw ${seeded}`)
  })
})
