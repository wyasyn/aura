# Multi-tenancy: how a clinic is addressed

Aurora serves each clinic as its own tenant — its own address, branding,
patients, staff and data. There are **two mechanisms** for deciding which
clinic a request is for, and which one is active depends entirely on whether
`NEXT_PUBLIC_TENANT_ROOT_DOMAIN` is set.

| | Host-based (production) | Pin cookie (fallback) |
| --- | --- | --- |
| Active when | `NEXT_PUBLIC_TENANT_ROOT_DOMAIN` is set | it is unset |
| Tenant carried in | the `Host` header | the `aurora-tenant` cookie |
| Address | `wellderm.aurora.app` | `aurora.app/c/wellderm` → `aurora.app` |
| Sessions | separate per clinic (cookies are host-only) | shared with the platform |
| Clinics per browser | many at once | one at a time |

Host always wins. The cookie is consulted **only** when the host cannot name a
tenant at all, so it can never override or spoof real routing. That precedence
is expressed once, in `lib/clinics/tenant-request.ts`, and everything else
reads it:

- `proxy.ts` — whether `/` is a clinic's front door or Aurora's landing page
- `lib/clinics/tenant.ts` — which clinic this request resolves to
- `lib/auth/server.ts` — which clinic's site a sign-in is happening on

> Each of those three once decided this for itself from the `Host` header
> alone, and each was a separate production bug. Add a fourth caller by reading
> `selectedTenantSubdomain`, not by parsing the host again.

## Why the fallback exists

Vercel does not issue wildcard subdomains on `*.vercel.app`, so
`wellderm.my-project.vercel.app` will never resolve. Without a domain of your
own there is nothing in the `Host` header to identify a tenant by, and
`/c/<subdomain>` pinning is the only way to select one.

It is a fallback for previews and domainless deployments. Its trade-offs are
real, and both follow from the clinic being served on the *same origin* as the
platform:

- **One clinic at a time per browser.** The cookie holds a single subdomain.
- **The session is shared with the platform.** Cookies are scoped by origin, so
  there is exactly one session cookie. A signed-in platform administrator
  entering a clinic stays signed in as themselves.

Neither is a defect, and neither weakens isolation: identity comes only from the
session, and `lib/clinics/access-gate.ts` still decides, per request, whether
that identity is allowed on this tenant. A clinic user carried to another
clinic, or back to the platform, is treated as signed out.

## Moving to host-based tenancy

This is the recommended production configuration. It retires the fallback,
gives each clinic genuinely separate sessions, and lets one browser hold
several clinics at once.

### 1. DNS

Point a wildcard record at your host, alongside the apex:

```
*.aurora.app.   CNAME   cname.vercel-dns.com.
aurora.app.     A       76.76.21.21
```

### 2. Hosting

Add `*.aurora.app` as a domain on the project, so TLS is issued for every
subdomain. On Vercel this is *Project → Settings → Domains → Add*, entering the
wildcard exactly. A wildcard domain requires the domain's nameservers to be
managed there, or a verified delegation.

### 3. Environment

```
NEXT_PUBLIC_TENANT_ROOT_DOMAIN=aurora.app
BETTER_AUTH_URL=https://aurora.app
```

Setting the root domain changes behaviour immediately and in three places at
once, because `hostBasedTenancyConfigured()` reads it:

- clinic links become `https://wellderm.aurora.app/` instead of `/c/wellderm`
- `/c/<subdomain>` stops pinning and redirects to `/`
- any `aurora-tenant` cookie already in a browser becomes inert

Existing pinned browsers therefore fall back to the platform rather than
silently staying on a clinic. That is deliberate.

### 4. Verify before announcing it

Nothing about the switch is gradual, so check it on a preview first:

```bash
curl -sI https://wellderm.aurora.app/ | head -1        # 200, clinic front door
curl -sI https://aurora.app/ | head -1                 # 200, Aurora landing
curl -sI https://aurora.app/c/wellderm | head -1       # 307 -> /, no pin set
```

Then sign in as a clinic user on `wellderm.aurora.app` and confirm the same
credentials are refused on `aurora.app`.

### Testing it locally

`lib/auth/server.ts` registers the wildcard as `https://*.<root>` — https only,
which is right for production and means a real root domain cannot be exercised
over plain http. Signing in on `http://wellderm.aurora.test` is refused with
better-auth's `Invalid origin` (403); the same request with an `https` origin
succeeds. That 403 is the origin check, not the clinic isolation gate, and the
two are easy to confuse because both return 403.

For local work use `*.localhost` instead, which `extractSubdomain` handles
without any root domain at all:

```
http://wellderm.localhost:3000/
```

Leave `NEXT_PUBLIC_TENANT_ROOT_DOMAIN` blank locally. Subdomain routing still
works, and `http://*.localhost:<port>` is already a trusted origin.

## Custom domains

A clinic that owns `theirclinic.com` can be served at `skin.theirclinic.com`
regardless of which mechanism is active. Ownership is proven by a TXT record
(`_aurora-verify.<domain>`), and the domain is only served once verified — see
`/clinic/domain`. The subdomain keeps working throughout, so a misconfigured
custom domain never takes a clinic offline.

Verified custom domains must also be added to the hosting provider by hand.
Verification proves ownership to Aurora; it does not provision TLS at the edge.

## Attribution and auditability

A record created inside a tenant carries **both** the user who created it and
the organization it was created on. `Scan` holds `userId` and `organizationId`
together, and `lib/scan/attribution.test.ts` pins that.

This matters because platform administrators are allowed onto every tenant
(`lib/clinics/access-gate.ts`). A scan an administrator takes while working
inside a clinic is attributed to that clinic *and* to them, so the action stays
answerable. The dashboard shows a banner naming the clinic whenever the viewer
is not one of its own people, so the attribution is never a surprise.
