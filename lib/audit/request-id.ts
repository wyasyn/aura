import { headers } from "next/headers"

/**
 * The current request's correlation id, when there is one.
 *
 * AuditLog.requestId and the viewer that displays it both already existed;
 * nothing was ever filling the column. This reads the id the platform already
 * assigns rather than minting one, so entries written while serving a single
 * request can be grouped after the fact — which is what turns "a tenant was
 * deleted" and "an export was refused" into one story instead of two rows.
 *
 * Returns null rather than throwing outside a request. A scan replayed from a
 * queue or a script has no request to correlate to, and that is a correct
 * answer rather than a failure — importantly, it must never be the reason a
 * Tier A audit write fails and rolls back a mutation.
 */
export async function currentRequestId(): Promise<string | null> {
  try {
    const headerList = await headers()
    return (
      headerList.get("x-request-id") ??
      // Vercel stamps every request with this; it is the id shown in its logs.
      headerList.get("x-vercel-id") ??
      null
    )
  } catch {
    return null
  }
}
