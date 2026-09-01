import { getTenantOrganizationIdSafe } from "@/lib/clinics/tenant"

/**
 * Which products a request may see.
 *
 * The catalogue has two owners. Aurora products carry a null organizationId and
 * belong to the platform; clinic products carry exactly one organizationId and
 * belong to that tenant alone. A patient is offered Aurora's catalogue plus the
 * catalogue of the clinic whose site they are on — never a third party's.
 *
 * Expressed once, as a Prisma `where` fragment, because the recommendation
 * pipeline reads products in four separate places: the AI's candidate list, the
 * slug allowlist, the allergy filter and the display enrichment. Any one of
 * them missing the filter would leak another clinic's private catalogue, and
 * the two that resolve products *after* the model has spoken would do it while
 * looking like a rendering detail.
 */

/** A tenant id known to be legitimate — resolved, never taken from a caller. */
export type CatalogueScope = string | null

export type ProductOwnerFilter =
  | { organizationId: null }
  | { OR: [{ organizationId: null }, { organizationId: string }] }

/**
 * The owner filter for a scope. Pure, so the rule itself can be tested without
 * a database or a request.
 *
 * A null scope is the platform: Aurora products only. It is the safe answer for
 * anything with no tenant — the apex site, a queued job, a script — and is what
 * makes forgetting to pass a scope fail closed rather than open.
 */
export function productOwnerFilter(scope: CatalogueScope): ProductOwnerFilter {
  if (!scope) return { organizationId: null }
  return { OR: [{ organizationId: null }, { organizationId: scope }] }
}

/**
 * The tenant this request belongs to, or null for the platform.
 *
 * Deliberately the same resolution that stamps Scan.organizationId when a scan
 * is taken, so a scan and the catalogue it was recommended from can never
 * disagree about which clinic they belonged to. It reads the host through the
 * existing tenancy architecture and accepts no caller-supplied id.
 */
export async function currentCatalogueScope(): Promise<CatalogueScope> {
  return getTenantOrganizationIdSafe()
}

/** The full `where` for products that may be offered to this request. */
export function recommendableProductsWhere(scope: CatalogueScope) {
  return {
    isActive: true,
    isRecommendable: true,
    ...productOwnerFilter(scope),
  }
}

/**
 * As above, but without the recommendable gate.
 *
 * Used where a product already named in a recommendation is being resolved for
 * display. A clinic withdrawing a product from the engine should stop it
 * appearing in *new* advice; it must not blank the name and image out of
 * reports a patient already holds.
 */
export function visibleProductsWhere(scope: CatalogueScope) {
  return {
    isActive: true,
    ...productOwnerFilter(scope),
  }
}
