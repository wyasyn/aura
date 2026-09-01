import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { permissionsForTenantRole } from "@/lib/clinics/permissions"

/**
 * Who may manage which catalogue.
 *
 * The isolation tests prove the queries are scoped. These prove the shape
 * around them: that a clinic action derives its tenant instead of accepting
 * one, that ownership is matched inside the where clause, and that the Aurora
 * catalogue stays administrator-only.
 */

const clinicActions = readFileSync("lib/clinics/product-actions.ts", "utf8")
const adminActions = readFileSync("lib/products/actions.ts", "utf8")
const schemas = readFileSync("lib/products/schemas.ts", "utf8")
const scope = readFileSync("lib/products/catalogue-scope.ts", "utf8")
const catalog = readFileSync("lib/ai/context/catalog.ts", "utf8")
const syncCatalog = readFileSync("lib/products/ingest/sync-catalog.ts", "utf8")
const reconcile = readFileSync("lib/products/ingest/reconcile.ts", "utf8")

describe("a clinic acts only on its own catalogue", () => {
  it("every mutation authorizes as a member and checks a permission", () => {
    const fns = [...clinicActions.matchAll(/export async function (\w+)/g)].map((m) => m[1])
    assert.ok(fns.length >= 5, `expected the clinic product actions, saw ${fns.length}`)

    for (const fn of fns) {
      const body = clinicActions.match(new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`))
      assert.ok(body, `expected the body of ${fn}`)
      assert.match(body[0], /requireClinicMember\(\)/, `${fn} must resolve a membership`)
      assert.match(body[0], /requirePermission\(session, "PRODUCT_/, `${fn} must check a permission`)
    }
  })

  // The tenant is minted from an active membership, never named by the caller.
  it("the owner comes from the session on create", () => {
    assert.match(clinicActions, /organizationId: session\.scope/)
  })

  it("ownership is matched inside the where clause, not checked afterwards", () => {
    assert.match(clinicActions, /where: \{ id: productId, organizationId: session\.scope \}/)
    assert.doesNotMatch(clinicActions, /product\.findUnique\(\{\s*where: \{ id/)
  })

  it("a product outside the tenant is refused and recorded", () => {
    assert.match(clinicActions, /recordDenied/)
    assert.match(clinicActions, /not_owned_by_tenant/)
  })

  // Archiving keeps the row so reports a patient already holds still resolve.
  it("archiving is a state change, never a delete", () => {
    assert.doesNotMatch(clinicActions, /product\.delete\(/)
    assert.match(clinicActions, /data: \{ isActive: false, isRecommendable: false \}/)
  })
})

describe("ownership cannot be expressed by a caller", () => {
  // Stronger than validating it away: the field is not in the schema at all,
  // so "create this for another clinic" has no representation.
  it("the clinic form schema has no ownership field", () => {
    const form = schemas.match(/export const clinicProductFormSchema[\s\S]*?\n\}\)/)
    assert.ok(form)
    for (const forbidden of ["organizationId", "createdById", "isActive"]) {
      assert.doesNotMatch(form[0], new RegExp(forbidden), `${forbidden} must not be settable`)
    }
  })

  it("the admin form schema has no ownership field either", () => {
    assert.doesNotMatch(schemas, /organizationId:\s*z\./)
  })
})

describe("the Aurora catalogue stays platform-administered", () => {
  it("every admin product action requires an administrator", () => {
    const fns = [...adminActions.matchAll(/export async function (\w+)/g)].map((m) => m[1])
    for (const fn of fns) {
      const body = adminActions.match(new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`))
      assert.ok(body)
      assert.match(body[0], /requireAdmin\(\)/, `${fn} must require an administrator`)
    }
  })

  it("clinic staff have no route to it — the clinic actions never call requireAdmin", () => {
    assert.doesNotMatch(clinicActions, /requireAdmin/)
  })

  // The store owns the Aurora catalogue and nothing else. A sync that read the
  // whole product table could overwrite — or archive — a clinic product that
  // happens to share a slug with something on the shelf.
  it("the WooCommerce sync only ever loads global products", () => {
    assert.match(syncCatalog, /where: \{ organizationId: null \}/)
    // No unscoped read of the product table anywhere in the sync.
    assert.doesNotMatch(syncCatalog, /prisma\.product\.findMany\(\{\s*select/)
  })

  // Identity moved from slug to the source's own id. A slug is derived from the
  // product name, so matching on it created a duplicate Aurora row the moment
  // somebody renamed a product upstream.
  it("the sync matches products by their source identity, not their name", () => {
    assert.match(reconcile, /row\.externalId === input\.externalId/)
    assert.doesNotMatch(syncCatalog, /where: \{ slug: product\.slug/)
  })
})

describe("permissions", () => {
  it("owners and clinic admins may manage products", () => {
    for (const role of ["owner", "admin"]) {
      const granted = permissionsForTenantRole(role)
      assert.ok(granted.includes("PRODUCT_VIEW"), `${role} should view products`)
      assert.ok(granted.includes("PRODUCT_MANAGE"), `${role} should manage products`)
    }
  })

  it("an ordinary member may view but not manage", () => {
    const granted = permissionsForTenantRole("member")
    assert.ok(granted.includes("PRODUCT_VIEW"))
    assert.ok(!granted.includes("PRODUCT_MANAGE"))
  })
})

describe("the candidate catalogue is scoped and cached per tenant", () => {
  it("the AI catalogue query is bounded by the resolved scope", () => {
    assert.match(catalog, /recommendableProductsWhere\(scope\)/)
    assert.match(catalog, /currentCatalogueScope\(\)/)
  })

  // A single cache covering both catalogues would serve the first tenant's
  // private products to everyone else until the TTL expired.
  it("a clinic's products are cached under that clinic's own tag", () => {
    assert.match(catalog, /tenantCatalogContextTag\(organizationId\)/)
    const global = catalog.match(/getCachedGlobalCatalog = unstable_cache\([\s\S]*?\)\n/)
    assert.ok(global)
    assert.match(global[0], /fetchProducts\(null\)/, "the shared entry must hold Aurora products only")
  })

  it("the scope is resolved, never taken from a caller", () => {
    assert.match(scope, /getTenantOrganizationIdSafe\(\)/)
    assert.doesNotMatch(scope, /organizationId\?\s*:\s*string.*input/i)
  })
})

describe("every product read in the recommendation pipeline is scoped", () => {
  const PIPELINE = [
    "lib/ai/context/catalog.ts",
    "lib/products/validate-catalog-recommendations.ts",
    "lib/products/enrich-recommendations.ts",
    "lib/products/filter-recommendations-by-allergies.ts",
  ]

  for (const file of PIPELINE) {
    it(`${file} resolves a scope before reading products`, () => {
      const src = readFileSync(file, "utf8")
      assert.match(src, /currentCatalogueScope/, `${file} must resolve the tenant`)
      assert.match(
        src,
        /recommendableProductsWhere|visibleProductsWhere/,
        `${file} must apply the owner filter`,
      )
    })
  }
})
