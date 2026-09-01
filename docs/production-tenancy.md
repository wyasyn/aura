# Production multi-tenancy

How AURORA decides which clinic a request belongs to, what that decision is
allowed to grant, and what has to be true of DNS and cookies before it is
deployed on real domains.

Companion documents: [multi-tenancy.md](./multi-tenancy.md) for the model,
[tenant-ownership.md](./tenant-ownership.md) for which tables belong to a
tenant.

---

## 1. One resolver, one precedence

Every tenant decision in the system flows through a single expression, in
`lib/clinics/tenant-request.ts`:

```
host subdomain  ->  verified custom domain  ->  pin cookie  ->  platform
```

Three call sites consume it — `proxy.ts` (routing), `lib/clinics/tenant.ts`
(`resolveTenant`, the request-time tenant), and `lib/auth/server.ts`
(`hostOrganizationId`, the sign-in gate). None of them re-derives the order.

Other modules read the `Host` header, but for a different question. They build
*origins* — where to send a Stripe return, what to put in an invite link — and
never map a host to a tenant:

| File | Reads Host for |
| --- | --- |
| `lib/billing/return-href.ts` | Stripe return URL is same-origin |
| `lib/clinics/request-origin.ts` | Origin for generated links |
| `lib/site-url.ts` | Deployment's own site URL |
| `lib/auth/server.ts` (`trustedOriginsForRequest`) | CSRF origin allowlist |

**Rule.** Adding a fourth way to answer "which tenant is this?" is a defect,
even if it agrees with the other three today.

---

## 2. Two deployment modes

### Host-based (production)

Set `NEXT_PUBLIC_TENANT_ROOT_DOMAIN` to the apex tenants hang off:

```
NEXT_PUBLIC_TENANT_ROOT_DOMAIN=aurora.app
```

Requires wildcard DNS and a wildcard TLS certificate:

```
*.aurora.app.  CNAME  cname.vercel-dns.com.
aurora.app.    A/ALIAS <platform>
```

Tenants are then served at `wellderm.aurora.app`, and the apex serves the
platform.

### Cookie fallback (previews, domainless deploys)

Leave `NEXT_PUBLIC_TENANT_ROOT_DOMAIN` unset. `*.vercel.app` cannot host
wildcard subdomains, so there is nothing in the `Host` header to identify a
tenant by. Visiting `/c/<subdomain>` pins the browser with the `aurora-tenant`
cookie instead.

The trade-off is one clinic at a time per browser. It is a fallback, not
something a production tenant should rely on.

### The fallback disables itself

This is the property that makes the fallback safe to ship. When a root domain
is configured:

- `selectedTenantSubdomain` returns `null` rather than consulting the cookie —
  the pin is not lower priority, it is **not read at all**;
- `/c/<subdomain>` issues **no** `Set-Cookie` and redirects to `/`.

Verified on a running server:

| Mode | Request | Result |
| --- | --- | --- |
| host-based | `wellderm.aurora.app` + pin `verifyclinic` | **wellderm** |
| host-based | `aurora.app` + pin `wellderm` | **platform** |
| host-based | `GET /c/wellderm` | 302, no `Set-Cookie` |
| fallback | `localhost` + pin `wellderm` | **wellderm** |
| fallback | `GET /c/wellderm` | 302 + `aurora-tenant=wellderm; Path=/; HttpOnly; SameSite=lax` |

---

## 3. Hosts that are not tenants

`extractSubdomain` returns `null` for anything not unambiguously a tenant host.
Confirmed against the running server:

| Host | Resolves to |
| --- | --- |
| `aurora.app` (apex) | platform |
| `admin.aurora.app` | platform (reserved label) |
| `a.b.aurora.app` | platform (multi-label prefix) |
| `nosuchclinic.aurora.app` | **404** |
| `aurora-git-br.vercel.app` | **404** |
| `192.168.1.5` | **404** |

`extractSubdomain` never reads a branch name as a tenant: a host that does not
end in the configured root returns `null`. But `isTenantRequest` then treats
that same host as a *possible custom domain* — it cannot check, since custom
domains are database rows and the proxy runs at the edge — so `/` is rewritten
to `/clinic-home`, and `resolveTenant`, which can check, finds no clinic and
returns `notFound()`.

**This is the consequence that matters when going live** (see §9): once a root
domain is configured, the deployment's own `*.vercel.app` URL and any request
arriving by bare IP stop serving the platform home and return 404. The platform
is reachable at the apex, and only there. A health check pointed at `/` by IP
will fail; point it at the apex hostname.

`RESERVED_SUBDOMAINS` (34 labels) is enforced twice — when a subdomain is
validated before being stored, and again when one is extracted from a host.

---

## 4. Custom domains

A clinic may serve on its own domain. Three things guard it:

1. **The platform's own hosts are refused.** `validateCustomDomain` rejects the
   root domain and every subdomain of it, so a clinic cannot claim `aurora.app`
   or intercept another tenant's subdomain.
2. **Ownership is proved by DNS.** A random `aurora-verify-<32 hex>` token must
   appear in a TXT record at `_aurora-verify.<domain>` before
   `customDomainVerifiedAt` is set.
3. **Unverified means unserved.** Both places that map a host to a tenant —
   `resolveTenant` and `hostOrganizationId` — require
   `customDomainVerifiedAt`. An unproven domain resolves to nothing.

Changing the domain clears the verification, so a swap cannot inherit the
previous proof.

---

## 5. Cookies

No `Domain` attribute is set anywhere in the system. `better-auth` has no
`advanced` block, so it uses its defaults.

| Cookie | Scope | Flags |
| --- | --- | --- |
| `better-auth.session_token` | host-only | HttpOnly, SameSite=Lax, Secure in prod |
| `better-auth.session_data` | host-only | HttpOnly, SameSite=Lax, 60s cache |
| `aurora-tenant` | host-only | HttpOnly, SameSite=Lax, session-length |
| `aurora-workspace` | host-only | **not** HttpOnly (read by the client switcher) |

### What host-only means on wildcard subdomains

**Each tenant host has its own session.** A user who signs in at `aurora.app`
and then follows a link to `wellderm.aurora.app` arrives signed out, because
the apex cookie is not sent to the subdomain.

This is a deliberate trade, not an oversight:

- **For:** a session minted on one tenant host cannot be replayed on another.
  Tenant sessions are isolated by the browser itself, beneath any application
  logic.
- **Against:** users sign in per tenant host.

Sharing one session across all tenants would mean `Domain=.aurora.app`, which
gives up that isolation. **Do not set a cookie domain without deciding that
trade explicitly.**

### The session cookie carries no tenant

The `cookieCache` version key is `role:onboardingCompleted:banned:updatedAt` —
identity only. Tenant is resolved per request from the host. The two never
travel together, which is why a stolen or replayed session cannot carry a
tenant with it.

---

## 6. A cookie is not authorization

The pin cookie selects a tenant. It grants nothing.

- Resolving a tenant does not create a session. `resolveClinicSession` requires
  an **active** `Member` row for that user and that organization.
- A platform admin is not automatically a member. `resolveClinicSession`
  returns `not_a_member` for them, so a support login cannot read patient
  records.
- A suspended or revoked membership returns `membership_inactive`, distinct
  from `not_a_member`, and grants nothing.
- `TenantScope` is a branded type mintable only by `asTenantScope`, which is
  private to `membership.ts` and called only after that active row is found.

Verified: with `aurora-tenant=wellderm` and no session, `/scan`, `/clinic` and
`/dashboard` all return 307 to `/login`. The redirect is **relative**, so under
host-based tenancy the browser stays on the tenant host and the tenant survives
the round trip through sign-in.

---

## 7. Attribution survives everything

Tenant-owned rows carry both the actor and the tenant:

| Model | Actor | Tenant | On tenant delete |
| --- | --- | --- | --- |
| `Scan` | `userId` (required) | `organizationId` | `SetNull` |
| `Booking` | `userId` (required) | `organizationId` | `SetNull` |
| `ClinicPatient` | `userId` | `organizationId` | `Cascade` |
| `ApiKey` | `createdById` | `organizationId` | `Cascade` |
| `AuditLog` | `actorId` | `organizationId` | *(no FK — outlives the tenant)* |

`SetNull` on `Scan` and `Booking` is what lets a clinic be deleted without
destroying the patient's own record of their scan. The `userId` is untouched,
so an administrator's action inside a tenant stays attributable after the
tenant is gone.

---

## 8. Audited routing changes

Anything that changes **which host serves a tenant**, or **who can reach a
tenant programmatically**, writes an audit entry:

| Action | Recorded on |
| --- | --- |
| `tenant.domain_claimed` | claim; `denied` when the domain is held by another clinic |
| `tenant.domain_verified` | proof accepted; `denied` when DNS proof fails |
| `tenant.domain_removed` | release, naming the domain and whether it was verified |
| `apikey.created` | issue, with name and prefix |
| `apikey.revoked` | revoke; `denied` for an id outside the tenant |

**Never in metadata:** session tokens, cookies, passwords, API keys, Stripe
secrets, authorization headers. The custom-domain verification token is
excluded for the same reason — it is the secret that proves ownership, and an
audit log is read by more people than may claim a domain. API key entries carry
the name and prefix only; the plaintext is never stored anywhere, and the hash
is not useful in a log.

---

## 9. Deployment checklist

- [ ] `NEXT_PUBLIC_TENANT_ROOT_DOMAIN` set to the apex
- [ ] Wildcard DNS `*.<root>` pointed at the platform
- [ ] Wildcard TLS certificate covering `*.<root>`
- [ ] Apex resolves to the platform
- [ ] `BETTER_AUTH_URL` on the apex
- [ ] `STRIPE_WEBHOOK_SECRET` set (webhooks fail closed without it — a 500, by
      design, rather than accepting unverified events)
- [ ] Reserved labels confirmed not to be live tenants
- [ ] Verify a tenant subdomain, the apex, and an unknown subdomain (expect 404)
- [ ] Health checks target the apex hostname, not the server's IP (§3)
- [ ] Anyone using the `*.vercel.app` URL told to use the apex instead (§3)

Setting the root domain and relying on `*.vercel.app` preview URLs are mutually
exclusive. Previews that must serve the platform home should leave
`NEXT_PUBLIC_TENANT_ROOT_DOMAIN` unset and use `/c/<subdomain>` pinning, which
is what that fallback exists for.

---

## 10. Rules

1. Tenant precedence is expressed once, in `tenant-request.ts`. Do not add a
   second resolver.
2. Do not read `Host` to determine a tenant outside that module. Reading it to
   build an origin is fine.
3. An unverified custom domain serves nothing.
4. The pin cookie is a fallback. It must stay unread whenever a root domain is
   configured.
5. Selecting a tenant is not joining one. Access comes from an active `Member`
   row, never from a cookie or a host.
6. Do not set a cookie `Domain` without deciding the isolation trade in §5.
7. Tenant-owned writes carry both `userId` and `organizationId`.
8. Routing and credential changes are audited, and never with secrets in the
   metadata.
