import { brandingStyle } from "@/lib/clinics/branding"
import { getServableTenant } from "@/lib/clinics/tenant"

/**
 * Applies the current clinic's brand colours to everything inside it.
 *
 * Uses `display: contents` so the wrapper contributes a custom-property scope
 * without introducing a box — dropping a real div into a layout here would
 * break any flex or grid parent it sits inside.
 *
 * Renders children untouched on the platform host, or for a clinic that is
 * suspended or unpaid, so those cases fall back to the platform theme instead
 * of half-applying a brand.
 *
 * Must be rendered inside a <Suspense> boundary: it awaits an uncached tenant
 * lookup, and Cache Components fails the build for data access that blocks the
 * document shell.
 */
export async function ClinicTheme({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const tenant = await getServableTenant()
  if (!tenant) return <>{children}</>

  return (
    <div style={{ display: "contents", ...brandingStyle(tenant.branding) }}>
      {children}
    </div>
  )
}
