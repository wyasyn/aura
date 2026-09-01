# AWS deployment

How to run this application on App Runner or ECS Fargate. Vercel remains
supported from the same commit; nothing here changes that deployment.

Companion documents: [aws-schedules.md](./aws-schedules.md) for the two cron
jobs, [production-tenancy.md](./production-tenancy.md) for host-based tenancy.

---

## ⚠️ Read first

### The container has never been built or run

The Dockerfile is written and reviewed but **no image has ever been built from
it, and no container has ever been started.** Docker was not available on the
machine where this work was done. Everything below is derived from the lockfile,
the Next.js trace output and a successful host build — not from a running
container.

**Build it once, run it, and exercise sign-in, a scan and a PDF download before
trusting any of this.** The most likely failure points, in order:

1. `sharp` resolving the wrong platform binary (see below)
2. A missing `NEXT_PUBLIC_*` build arg, which fails silently in the browser
3. `openssl` in the runner stage being needed or not

### Run a SINGLE instance

**Set desired count to 1 on ECS, or minimum and maximum size to 1 on App
Runner.** This is not a placeholder for "scale later without thinking".

Next.js caches are per-process. On Vercel the platform shares them; self-hosted,
each container keeps its own. The app calls `revalidateTag` and `revalidatePath`
in about 40 files, and every one of those becomes a local-only operation across
instances. Instance A invalidates the product catalogue after a clinic edits it;
instance B does not know and keeps serving the old one.

The exposure is concentrated rather than systemic. Four cached entries matter:

| Entry | TTL | Effect of staleness |
| --- | --- | --- |
| Global product catalogue | 60s | AI recommends from a stale catalogue |
| Per-clinic catalogue | 60s | A clinic adds a product, does not see it recommended, adds it again |
| User AI context | 300s | Five minutes of stale profile in advice |
| Scan history context | 300s | Missing the newest scan |

The catalogue TTL was lowered from 3600s to 60s specifically to bound this. That
is a mitigation, not a fix: it converts "an hour of confusing staleness" into "a
minute nobody notices". **The fix is a shared cache handler backed by Redis or
ElastiCache, and until one exists, more than one instance means users see stale
data with no error anywhere to explain it.**

**Known short-lived exposure:** a rolling deploy briefly runs two instances. For
those seconds the split above is live. Both are serving the same code and the
window is far shorter than the 60s TTL, so the realistic worst case is one stale
catalogue read. Acceptable; worth knowing rather than discovering.

---

## Environment variables

### Runtime — required

| Variable | Secret | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **secret** | Secrets Manager. Postgres connection string |
| `BETTER_AUTH_SECRET` | **secret** | Secrets Manager. Signs sessions |
| `APP_URL` | config | The canonical public origin, e.g. `https://aurora.app`. **Load-bearing** — see origin trust below |
| `NODE_ENV` | config | `production` |
| `PORT` | config | `3000`, matching the Dockerfile |

### Runtime — required for the features that use them

| Variable | Secret | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | **secret** | All scan analysis and chat |
| `STRIPE_SECRET_KEY` | **secret** | Payments |
| `STRIPE_WEBHOOK_SECRET` | **secret** | Webhook verification. Unset makes the webhook fail closed with a 500, by design |
| `RESEND_API_KEY` | **secret** | Sign-in codes and receipts |
| `CRON_SECRET` | **secret** | Both scheduled jobs. Unset refuses everything |
| `DAILY_API_KEY` | **secret** | Consultation video rooms |
| `WOOCOMMERCE_CONSUMER_KEY` | **secret** | Catalogue sync |
| `WOOCOMMERCE_CONSUMER_SECRET` | **secret** | Catalogue sync |
| `WOOCOMMERCE_WEBHOOK_SECRET` | **secret** | Affiliate order attribution |
| `WOOCOMMERCE_STORE_URL` | config | Store base URL |
| `EMAIL_FROM` | config | Sender identity |
| `BOOTSTRAP_ADMIN_EMAIL` | config | Must name an existing user, or the catalogue sync 500s |

### Runtime — optional

| Variable | Secret | Notes |
| --- | --- | --- |
| `BETTER_AUTH_URL` | config | Overrides `APP_URL`. Leave unset and use `APP_URL` |
| `TRUSTED_ORIGINS` | config | Comma-separated additional origins. Exact hosts, no wildcards |
| `NEXT_PUBLIC_TENANT_ROOT_DOMAIN` | config | Apex for clinic subdomains. **Runtime, not build-time** — despite the prefix it is read only in server modules, always at call time |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | **secret** | Federated sign-in |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` / `APPLE_APP_BUNDLE_IDENTIFIER` | **secret** | Federated sign-in |
| `PRIVACY_EMAIL` | config | Shown on the privacy and deletion pages |
| `PAYMENT_PROVIDER`, `PAYMENT_CURRENCY`, `FREE_STARTER_SCANS`, `PRICING_MARGIN_BPS`, `TARGET_MARGIN_BPS`, `MOCK_PAYMENT_DELAY_MS` | config | Behaviour tuning |

### Build-time arguments — cannot be changed without rebuilding

`NEXT_PUBLIC_*` values read in **client** components are inlined into the
JavaScript bundle when the image is built. Setting them in a task definition or
App Runner config **has no effect** — the browser already has the bundle.

| Build arg | Consequence of omitting |
| --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | The card form renders with no Stripe client. Everything looks fine until someone tries to pay |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | Defaults to `true`. Omit only if you want the Google button shown |
| `NEXT_PUBLIC_APPLE_AUTH_ENABLED` | Defaults to `false`. Set `true` only with the Apple credentials configured |

```bash
docker build \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... \
  --build-arg NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true \
  --build-arg NEXT_PUBLIC_APPLE_AUTH_ENABLED=false \
  -t aurora:latest .
```

The publishable key is public by design — baking it is correct, and it is not a
secret to be protected.

**A change to any of these is a rebuild and redeploy, not a config change.**
That is the single most surprising property of this image.

---

## Origin trust — read before setting `APP_URL`

On Vercel, `VERCEL_URL` and its siblings are injected by the platform and cannot
be forged by a request, so matching a request's `Host` against them proved the
deployment owned that host. **Behind an ALB or App Runner there is no
equivalent**: `Host` is whatever the client sent.

So trust comes from configuration alone. A request-derived origin is accepted
only if it exactly matches `APP_URL`, an entry in `TRUSTED_ORIGINS`, or a
verified custom domain resolved from the database.

Consequences worth stating plainly:

- **If `APP_URL` is wrong, nobody can sign in.** The failure is a 403
  `INVALID_ORIGIN`, not a redirect loop or a blank page.
- **If `APP_URL` is unset**, the canonical origin falls back to
  `http://localhost:3000` and every real request is refused. Failing closed is
  deliberate.
- Put every hostname the app is reachable on into `APP_URL` or
  `TRUSTED_ORIGINS`. If the ALB is reachable by its own DNS name and people use
  it, that name needs to be listed or sign-in fails there.
- Matching is whole-origin and exact. No wildcards, no suffix matching. Port is
  part of an origin.

### The one deliberate wildcard

`lib/auth/server.ts` emits `https://*.${NEXT_PUBLIC_TENANT_ROOT_DOMAIN}` as a
trusted origin pattern, matched by better-auth itself. This is a **deliberate
exception** to the no-wildcards rule, and it is separate from the allowlist
above.

It exists because clinic subdomains are different origins from `APP_URL`, and
without it no patient or staff member can sign in on any clinic's site. It is
scoped to a root domain you control, so it cannot be widened by an attacker
registering a domain.

**If the AWS deployment does not use wildcard DNS, this is dead weight** — leave
`NEXT_PUBLIC_TENANT_ROOT_DOMAIN` unset and the pattern is never emitted. Tenancy
then falls back to `/c/<subdomain>` cookie pinning. See
[production-tenancy.md](./production-tenancy.md).

---

## Health check

| | |
| --- | --- |
| **Path** | `/login` |
| **Method** | `GET` |
| **Expected** | `200` with HTML |
| **Interval** | 10s, 5s timeout, 3 unhealthy / 2 healthy |

There is no dedicated `/api/health` route. `/login` is the best available
choice: it renders without a session, exercises the framework and the config,
and does not touch the database — so a database blip does not cycle the tasks
while the app is still able to serve.

**Do not health-check `/`.** With `NEXT_PUBLIC_TENANT_ROOT_DOMAIN` configured,
any request whose `Host` is not the apex or a known subdomain is treated as a
possible custom domain and returns **404** — including a health check that
arrives by IP or by the load balancer's own DNS name. Point the check at a
hostname matching `APP_URL`, or use `/login` which is not host-sensitive.

Adding a real `/api/health` that checks database connectivity is worth doing
before this is load-bearing, but a failing database should page someone rather
than restart containers in a loop.

---

## Database migrations

```bash
npx prisma migrate deploy
```

**This must not run on container start.** Two instances starting together would
race, and `prisma migrate deploy` is not safe to run concurrently.

Run it as a **separate one-off task before the new image is deployed** — an ECS
`RunTask` on the same image and task definition with the command overridden, or
a CodeBuild step in the pipeline. It needs `DATABASE_URL` and nothing else.

The migration history is in `prisma/migrations/`. Every migration to date is
additive, so a new image can run against the old schema for the length of a
deploy — but that is a property of the migrations written so far, not a
guarantee. Check any new migration for column drops or type narrowing before
relying on it.

---

## Prisma engines — do not re-add `binaryTargets`

Prisma 7 with the `prisma-client` generator and `@prisma/adapter-pg` emits **no
native query engine**. Verified: there are no `.node` files anywhere in
`generated/prisma`.

The usual musl-versus-glibc problem therefore does not arise, and
`binaryTargets = ["linux-musl-openssl-3.0.x"]` is **not needed and should not be
added**. If someone adds it after seeing an unrelated alpine error, it will not
help and will slow every build.

This is also why the alpine base image is fine and no glibc variant is required.

---

## Image notes

**Base image is `node:24-alpine`.** `@prisma/client` requires
`^20.19 || ^22.12 || >=24.0`; Next requires `>=20.9`. Node 24 satisfies both.

**`openssl` is installed in the runner stage and may be unnecessary.** With no
Prisma engine to link against, the usual reason for it is gone. It was not
removed because that could not be verified without building. Remove it, build,
run, and exercise sign-in and a PDF download before concluding it was unused.

**`sharp` was made an explicit dependency.** It is required by `next/image`,
which is used in 14 components, and was previously present only transitively —
a clean `npm ci` had no guarantee of getting it, and the failure mode is images
silently not optimising.

**The local trace resolved `@img/sharp-win32-x64`**, because the verification
build ran on Windows. The alpine build will resolve `@img/sharp-linuxmusl-x64`
instead. Both are in the lockfile. This means **the traced output that was
inspected is not the one that will ship** — another reason to build the image
once and confirm images render before trusting it.

`npm ci --ignore-scripts` skips Prisma's postinstall; the build stage runs
`prisma generate` itself via `npm run build`. sharp is unaffected because its
platform binary is a prebuilt package with no build step.

---

## Unresolved from the Phase 0 audit

1. **The container has never been built or run.** Everything above is reasoned,
   not observed.
2. **No shared cache handler.** Single instance only until one exists.
3. **`openssl` may be dead weight** in the runner stage.
4. **How the crons are scheduled on Vercel is unconfirmed.** There is no
   `vercel.json`, so they are either configured in the dashboard or not running.
   If both platforms are live, both schedulers fire — both jobs are idempotent,
   so nothing breaks, but the retention purge would run twice a day.
5. **`CRON_SECRET` is empty in `.env.local`.** Locally both cron endpoints
   therefore refuse everything, which is correct behaviour but easy to mistake
   for a bug.
6. **`@vercel/analytics` remains a dependency.** It is gated behind explicit
   consent and reports nowhere off Vercel. Harmless; remove it only when Vercel
   support is dropped, which is out of scope here.
7. **No `/api/health` route.** `/login` is being used instead; see above.
8. **The privacy page names Neon as the database provider** while
   `DATABASE_URL` points at Prisma Postgres. Whichever is correct, moving to RDS
   makes both wrong — the published subprocessor list needs updating as part of
   the cutover, and it is a data-protection disclosure rather than a comment.
