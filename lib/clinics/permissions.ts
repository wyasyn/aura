/**
 * What a tenant role may do inside its tenant.
 *
 * One matrix, in one file, so a permission question has a single answer.
 * Callers ask `can(context, "PATIENT_VIEW")` rather than re-deriving
 * `role === "owner" || role === "admin"` at each call site, which is how the
 * same rule ends up written three slightly different ways.
 *
 * Deliberately small. These are the permissions the application already
 * enforces somewhere, named — not an invented taxonomy. Add one when a module
 * needs it, not in anticipation.
 *
 * Scope: this answers "what may this member do in this tenant". Platform-level
 * authorization stays with requireAdmin and the global role; see the note on
 * PLATFORM_ADMIN_TENANT_PERMISSIONS below for why an administrator is not
 * silently granted everything here.
 */

export const TENANT_PERMISSIONS = [
  "TENANT_VIEW",
  "TENANT_MANAGE",
  "MEMBERS_VIEW",
  "MEMBERS_MANAGE",
  "PATIENT_VIEW",
  "SCAN_VIEW",
  "APPOINTMENT_VIEW",
  "APPOINTMENT_MANAGE",
  "PAYMENT_VIEW",
  "REPORT_VIEW",
  "API_KEY_MANAGE",
  "DATA_SHARING_MANAGE",
  "PRODUCT_VIEW",
  "PRODUCT_MANAGE",
  "RECOMMENDATION_VIEW",
  "RECOMMENDATION_CONFIGURE",
] as const

export type TenantPermission = (typeof TENANT_PERMISSIONS)[number]

/**
 * Tenant roles as they exist in Member.role today: `owner`, `admin`, `member`.
 *
 * Read from the data rather than invented — the seed creates clinic staff as
 * `owner` and `admin`, and invited staff as `member`. An unrecognised role
 * gets the `member` set rather than nothing, so a role added by the
 * organization plugin cannot lock existing staff out of their own clinic.
 */
const OWNER: readonly TenantPermission[] = TENANT_PERMISSIONS

const CLINIC_ADMIN: readonly TenantPermission[] = [
  "TENANT_VIEW",
  "TENANT_MANAGE",
  "MEMBERS_VIEW",
  "MEMBERS_MANAGE",
  "PATIENT_VIEW",
  "SCAN_VIEW",
  "APPOINTMENT_VIEW",
  "APPOINTMENT_MANAGE",
  "PAYMENT_VIEW",
  "REPORT_VIEW",
  "API_KEY_MANAGE",
  "DATA_SHARING_MANAGE",
  "PRODUCT_VIEW",
  "PRODUCT_MANAGE",
  "RECOMMENDATION_VIEW",
  "RECOMMENDATION_CONFIGURE",
]

const MEMBER: readonly TenantPermission[] = [
  "TENANT_VIEW",
  "MEMBERS_VIEW",
  "PATIENT_VIEW",
  "SCAN_VIEW",
  "APPOINTMENT_VIEW",
  "REPORT_VIEW",
  "PRODUCT_VIEW",
  // Read without write, matching PRODUCT_VIEW/PRODUCT_MANAGE. Staff may see
  // how their clinic tunes recommendations; changing it is an owner or admin
  // act, because it changes the advice every patient receives.
  "RECOMMENDATION_VIEW",
]

const BY_ROLE: Record<string, readonly TenantPermission[]> = {
  owner: OWNER,
  admin: CLINIC_ADMIN,
  member: MEMBER,
}

/**
 * What a platform administrator may do inside a tenant they are not a member of.
 *
 * Empty, and that is the point. A platform admin may reach a clinic's site —
 * see decideAccess — but reaching it is not membership. Tenant data stays
 * behind a real Member row so a support login cannot silently read patient
 * records. Anything an administrator genuinely needs across tenants belongs in
 * the admin control plane behind requireAdmin, where it is visible as such.
 *
 * Present as a named, empty constant rather than an absence so that granting
 * something here is a deliberate, reviewable edit.
 */
export const PLATFORM_ADMIN_TENANT_PERMISSIONS: readonly TenantPermission[] = []

/** The permission set for a tenant role. Unknown roles fall back to `member`. */
export function permissionsForTenantRole(
  role: string | null | undefined,
): readonly TenantPermission[] {
  if (!role) return []
  return BY_ROLE[role] ?? MEMBER
}

/** Whether a resolved permission set allows an action. */
export function hasPermission(
  permissions: readonly TenantPermission[],
  permission: TenantPermission,
): boolean {
  return permissions.includes(permission)
}

/** Anything carrying a resolved permission set — in practice a tenant context. */
export type PermissionCarrier = { permissions: readonly TenantPermission[] }

/**
 * Whether this context may perform an action in its tenant.
 *
 * Ask this instead of comparing roles. A role comparison at a call site is a
 * copy of the matrix that will not be updated when the matrix is.
 */
export function can(
  context: PermissionCarrier,
  permission: TenantPermission,
): boolean {
  return hasPermission(context.permissions, permission)
}

/**
 * Throws unless the context allows the action.
 *
 * Never a substitute for tenant-scoped queries: this says what the caller may
 * do, while TenantScope says which rows they may do it to. Both are required.
 */
export function requirePermission(
  context: PermissionCarrier,
  permission: TenantPermission,
): void {
  if (!can(context, permission)) {
    throw new Error(`Missing permission: ${permission}`)
  }
}
