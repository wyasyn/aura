You are an expert Next.js and React developer helping me build Aurora.

Write clean, simple, maintainable code. Prioritize clarity over unnecessary abstraction.

Think like a senior full-stack developer.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Overview

Aurora is a web-based AI "skin intelligence" SaaS for Aurora Organics.
Users scan their face via camera/upload, get an AI-generated cosmetic skin assessment, and receive personalized Aurora product recommendations — plus a downloadable PDF report and an admin dashboard.

This is **not** a medical diagnostic tool. All output is framed as cosmetic and wellness guidance only.

## Installed Stack

Use only what is in `package.json` today. Before using any library, check `package.json`. If it is not listed here, it is not available unless added per the Docs and Dependencies policy below.

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **UI:** shadcn v4 (`radix-sera`), Tailwind CSS 4, `class-variance-authority`, `cn()` from `lib/utils.ts`
- **Database:** PostgreSQL (Neon) + Prisma 7 (`@prisma/adapter-pg`, client in `generated/prisma`)
- **Auth:** better-auth (email OTP, email/password, admin, organizations) via `lib/auth/`
- **Email:** Resend for OTP and transactional mail (`lib/email/`)
- **Validation:** Zod for server action schemas
- **Motion:** `motion` (beUI blocks) and `react-easy-crop` (scan crop step)
- **On-device vision:** `@mediapipe/tasks-vision` — face detection + lighting quality gate (`lib/scan/mediapipe.ts`, `lib/scan/quality-gate.ts`)
- **PDF:** `@react-pdf/renderer` — server-generated skin reports (`lib/pdf/`, `app/api/reports/[scanId]/pdf/route.ts`)
- **Theme:** `next-themes` via `components/theme-provider.tsx`; tokens in `app/globals.css`
- **Icons:** `@tabler/icons-react` only — no new icon libraries
- **Fonts:** Inter (body), Roboto (headings), Cormorant Garamond (display/hero), Geist Mono (code) — loaded in `app/layout.tsx`

## Planned Stack

These are target technologies not yet fully wired. **Do not install packages for planned stack items without user approval** — except adding shadcn UI components via CLI (see Docs and Dependencies).

- **AI provider:** Google Gemini via AI Studio API key (`GEMINI_API_KEY`) — swappable adapter in `lib/ai/adapter.ts` with provider in `lib/ai/providers/gemini.ts`
- **File storage:** S3-compatible object storage (e.g. Cloudflare R2) for PDF `storageKey` and optional image retention
- **Hosting:** Vercel
- **CI:** GitHub Actions — lint, type-check, test on every PR

## Non-Negotiables

- **AI is swappable.** All model calls go through one adapter module.
- **Coarse, honest output only.** Bands, not invented numeric precision.
- **Privacy by design.** Minimal retention (store the report, not the photo, by default), encryption in transit/at rest, a real delete path, explicit consent before first scan.
- **Cosmetic framing everywhere.** Every report carries a "not a medical diagnosis" disclaimer.
- **Trunk stays green.** PR-based workflow, lint/type-check/test gates on CI.

## Docs and Dependencies

- Before implementing a framework or library feature, read the **official latest docs** — do not rely on training-data assumptions. For Next.js, use `node_modules/next/dist/docs/`.
- **Never** run `npm install` or bump package versions without user approval.
- **Allowed without asking:** add shadcn UI primitives via CLI, e.g. `npx shadcn@latest add <component>` — components land in `components/ui/`.
- **Allowed without asking:** add beUI (`@beui/*`) and Watermelon UI (`@watermelon/*`) blocks via shadcn registry CLI — animated components land in `components/motion/` or feature folders; may add `framer-motion` / `motion` as transitive deps.
- If a new library would significantly help, recommend it, explain why, and wait for approval.

## Component sources

Use the right registry for each UI need. Always style with semantic theme tokens (`bg-background`, `text-muted-foreground`, `border-border`, etc.) — never bypass taupe / radix-sera.

| Source | Registry | Use for |
|--------|----------|---------|
| shadcn v4 | default CLI | Primitives: button, input, card, form, table, dialog, etc. in `components/ui/` |
| [beUI](https://beui.dev/) | `@beui` in `components.json` | Motion blocks: OTP input, theme toggle, tabs, drawers — `npx shadcn@latest add @beui/<name>` |
| [Watermelon UI](https://ui.watermelon.sh/home) | `@watermelon` in `components.json` | Richer blocks and dashboards — `npx shadcn@latest add @watermelon/<name>` |

Pick beUI for auth motion (OTP, transitions); Watermelon for data-heavy admin blocks when available; shadcn for everything else.

## Decision Making

If something is unclear or could be improved, suggest a better approach. Do not install new libraries without approval (shadcn UI components excepted).

## Code Organization

Organize code by **feature and concern** — keep related logic together and unrelated logic apart.

**Separate concerns**

- Each domain gets its own module: auth, AI, database, storage, PDF, scan, etc.
- Do not mix domains in one file (e.g. no AI calls inside auth handlers, no auth checks inside the AI adapter).
- Route handlers and page components stay thin — delegate to feature modules in `lib/`.

**Feature-based layout**

Group files by what they do, not by file type alone:

```
lib/
  ai/           # adapter, types, prompts, providers, context loaders
  auth/         # better-auth config, session helpers, server utilities
  db/           # Prisma client + connection helpers
  pdf/          # React-PDF report document + generate-skin-report
  scan/         # types, quality gate, mediapipe, mock analysis, persist, save action
  products/     # catalog schemas, admin actions, seed map
  scans/        # scan balance grant/debit, packs, cost helpers
components/
  ui/           # shared shadcn primitives only
  layouts/      # route-group shells (marketing, scan, auth, onboarding, dashboard)
  auth/         # auth-specific UI (login form, OTP input, etc.)
  scan/         # scan wizard, report layout, modal, camera/upload panels
  reports/      # reports list client (/reports)
app/
  (marketing)/  # landing — top navbar
  (scan)/       # scan flow — /scan
  (auth)/       # login, verify — centered card
  (onboarding)/ # onboarding steps — no nav/sidebar
  (dashboard)/  # user + admin — sidebar
  api/          # auth, report PDF, etc. — outside route groups
```

**Route groups**

Next.js route groups `(name)` organize layouts without affecting URLs. Each group has one shell in `components/layouts/`; group `layout.tsx` files stay thin.

| Group | Shell | Chrome | Routes |
|-------|-------|--------|--------|
| `(marketing)` | `MarketingShell` | Top navbar | `/` |
| `(scan)` | `ScanShell` | Minimal chrome — wizard only | `/scan` |
| `(auth)` | `AuthShell` | Centered card, logo only | `/login`, `/verify` |
| `(onboarding)` | `OnboardingShell` | No navbar/sidebar — step flow only | `/onboarding/*` |
| `(dashboard)` | `DashboardShell` | Sidebar + main | `/dashboard`, `/admin`, `/reports`, `/settings` |

```
app/
  layout.tsx              # root: fonts, theme
  (marketing)/layout.tsx  # → MarketingShell
  (scan)/layout.tsx       # → ScanShell
  (auth)/layout.tsx       # → AuthShell
  (onboarding)/layout.tsx # → OnboardingShell
  (dashboard)/layout.tsx  # → DashboardShell
  api/                    # no page chrome
```

- New pages go in the correct group — do not add navbar/sidebar logic inside individual pages.
- Only `(marketing)` owns `/`; all other groups use a path segment.
- `app/api/` stays outside route groups.

- Add a new folder under `lib/` or `components/` when a feature grows — do not dump everything into `lib/utils.ts` or a single catch-all file.
- Co-locate feature types, helpers, and components with that feature when they are not shared app-wide.
- Shared utilities that are truly generic (e.g. `cn()`) stay in `lib/`.

**Imports**

- Features may import from `components/ui/` and shared `lib/` utilities.
- Features should not import from each other's internals — expose a clear public API per module (e.g. `lib/ai/adapter.ts`, `lib/auth/session.ts`).
- `components/ui/` must not import from feature modules.

## UI Rules

For any UI task:

**Component usage**

- Use shadcn/ui components from `@/components/ui/*` for all interactive UI (buttons, inputs, dialogs, etc.).
- If a needed primitive is missing, add it via shadcn CLI — do not hand-roll equivalents.
- Compose with `cn()` for class merging; extend via component `variant` props / CVA, not one-off duplicates.

**No hard-coding**

- Use semantic Tailwind tokens: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, `rounded-lg` (from `--radius`), etc.
- **Forbidden:** raw hex/rgb/oklch in JSX, inline `style={{ color: ... }}`, arbitrary color classes like `bg-[#...]` or `text-orange-500` unless they map to theme tokens.
- Spacing, radius, and typography should follow shadcn/Tailwind conventions and existing component patterns (see `components/ui/button.tsx`).

**Layout fidelity**

- When Figma or other designs are provided, match layout, spacing, padding, font sizes, font hierarchy, colors, border radius, shadows, alignment, and proportions exactly.
- Still use theme tokens and shadcn components — do not bypass the design system.
- Do not approximate. Do not simplify unless explicitly asked.

## Styling and Theme

Theme is configured in `components.json` (`radix-sera`, `taupe`) and `app/globals.css`.

- **Style preset:** `radix-sera`
- **Base color:** `taupe`
- **CSS variables:** defined in `app/globals.css` — light/dark via `.dark` class
- **Dark mode:** `next-themes`, `attribute="class"`, system default
- Use semantic tokens: `bg-primary`, `text-muted-foreground`, `border-border`, `rounded-lg`
- Never hard-code colors (`#fff`, `bg-orange-500`, inline styles)
- Do not edit theme tokens for one-off screens; propose a global token change if the design system needs updating.
- Test both light and dark themes for new UI.

**Typography**

- **Body:** Inter — default via `font-sans` on `html` / `body`
- **Headings:** Roboto — use `font-heading` on `h1`–`h6` and section titles
- **Display / hero:** Cormorant Garamond — use `font-display` for hero titles and other special emphasis only; do not use for general headings or body text
- **Code / mono:** Geist Mono — use `font-mono` for code and technical labels
- Do not add other font families or load fonts outside `app/layout.tsx`

## Icons

- Import from `@tabler/icons-react` only (matches `iconLibrary: "tabler"` in `components.json`).
- Use consistent sizing via Tailwind (`size-4`, etc.) or shadcn `Button` icon slots.
- Do not add other icon packs (Lucide, Heroicons, etc.).

## Image Rule

- Use `next/image` for UI images — no raw `<img>` unless there is a documented exception.
- Use assets from `public/` (or add assets there); do not hotlink external images in production UI.
- **Scan exception:** blob URLs and live camera previews use `<img>` in `components/scan/` (object URLs and `HTMLVideoElement` frames cannot use `next/image`). Photos are not uploaded or stored by default.

## Scan flow

Implemented at `/scan` via `components/scan/scan-wizard.tsx`.

**Wizard steps:** `capture` → `edit` (crop) → `quality` → `analyzing` → `results`

| Concern | Location | Notes |
| -------- | -------- | ----- |
| UI shell | `scan-wizard.tsx`, `scan-capture-panel.tsx`, `scan-camera-view.tsx` | Camera mounts only when Camera tab is active |
| Quality gate | `lib/scan/quality-gate.ts`, `lib/scan/mediapipe.ts` | VIDEO mode for live camera; IMAGE mode for stills |
| Analysis | `lib/ai/adapter.ts`, `lib/scan/analyze-action.ts` | Server-side Gemini vision; structured `SkinAssessment` |
| Results layout | `scan-report-layout.tsx`, `skin-report-content.tsx` | Two-column desktop; image left, bands right |
| Report modal | `scan-report-modal.tsx` | `ResponsiveDialog`; same content as results |
| Persist | `lib/scan/analyze-action.ts` | Atomic analyze + save + debit; `imageRetained: false` always |
| PDF download | `lib/pdf/`, `app/api/reports/[scanId]/pdf/` | Generated on demand from DB; text-only (no photo) |
| History | `app/(dashboard)/reports/`, `components/reports/` | Modal + PDF per saved scan |
| Scan allowance | `lib/scans/balance.ts` | 1 scan debited per successful analysis (`scan_debit`) |

**Privacy:** Cropped photo lives in browser memory (`URL.createObjectURL`) for the session only. Revoke on rescan. Never write `imageStorageKey` unless explicit opt-in retention is added later.

**Output:** Coarse `AssessmentBand` labels only — no fake health percentages. Use `formatBand()` / `formatSkinHeadline()` from `lib/scan/format.ts`.

**Desktop camera:** Resizable embedded preview via `hooks/use-scan-camera-height.ts` (preference in `localStorage`).

**Model selection:** `User.scanTier` → `AiModelRate.assignedTier` (not `isScanDefault`).

## Pricing & scan allowances

Users have **one active tier** at a time (`User.scanTier`) and a **single scan balance** (`ScanBalance.remaining`). Each successful analysis debits **1 scan** — no metered credits.

### Tiers and models

Model strength climbs with the tier: smallest on Starter, latest Flash on Plus, strongest available model on Pro.

| Tier | Still model | Thinking | Input / output / cached per 1M | Live scan |
|------|-------------|----------|--------------------------------|-----------|
| **Starter** | `gemini-3.5-flash-lite` | low | $0.30 / $2.50 / $0.03 | no |
| **Plus** | `gemini-3.6-flash` | medium | $1.50 / $7.50 / $0.15 | no |
| **Pro** | `gemini-3.1-pro-preview` | high | $2.00 / $12.00 / $0.20 | yes |

Pro's live scan uses `gemini-3.1-flash-live-preview` ($1.00 image input / $4.50 text output per 1M, no context caching).

A tier owns one still model and one live model, enforced by `@@unique([assignedTier, supportsLive])` on `AiModelRate`. Resolution lives in `lib/models/queries.ts` (`getScanModelForTier`, `getLiveScanModel`); rates are seeded from the published paid-tier pricing in `scripts/seed-model-rates.ts`. Retired models stay in the table as inactive rows so historical `AiUsage` can still be costed.

### Free tier

- New users get **3 free Starter scans** on onboarding complete (`signup_bonus` ledger entry, idempotent).
- Env override: `FREE_STARTER_SCANS` (default `3`).

### Paid packs (catalog in `ScanPack` table)

| Tier | Pack | Scans | Price |
|------|------|-------|-------|
| Starter | Standard | 20 | $9.99 |
| Starter | Volume | 50 | $19.99 |
| Plus | Standard | 12 | $14.99 |
| Plus | Volume | 30 | $34.99 |
| Pro | Standard | 10 | $24.99 |
| Pro | Volume | 25 | $49.99 |

Seed via `npm run db:seed-packs`.

### Checkout and payments

Users buy packs at `/dashboard/billing`. The gateway sits behind a driver interface so the simulation can be swapped for a real processor without touching the schema, the actions, or the UI.

| Concern | Location |
|---------|----------|
| Driver interface | `lib/payments/types.ts` (`PaymentDriver`) |
| Driver selection | `lib/payments/index.ts`, env `PAYMENT_PROVIDER` (default `mock`) |
| Simulated gateway | `lib/payments/mock/driver.ts`, outcomes keyed off `lib/payments/test-cards.ts` |
| Checkout actions | `lib/billing/actions.ts` |
| Receipt PDF | `lib/pdf/receipt-document.tsx`, `app/api/billing/receipt/[paymentId]/route.ts` |

To add a real processor: write `lib/payments/<provider>/driver.ts` implementing `PaymentDriver`, register it in `getPaymentDriver()`, and set `PAYMENT_PROVIDER`. Prices always come from `ScanPack.priceCents` server side, never from the client. Card PANs are never persisted, only brand and last four.

`confirmPaymentAction` claims the payment with a conditional `updateMany` before granting, so a double submit or a replayed webhook can only grant once.

### Single-tier upgrade rule

Changing tier **replaces** `scansRemaining` with the new pack size. Unused scans on the old tier are forfeited. The checkout dialog warns before confirming.

### Profit floor (when adding packs)

```
minPriceCents = ceil(scanCount × tierP95CostMicros × 1.3 / (1 - targetMarginBps/10000) / 10000)
```

- `tierP95CostMicros` = p95 of `ScanUsage.estimatedCostMicros` per tier (recompute quarterly from production data).
- Default `targetMarginBps = 7000` (70% gross margin floor).
- `1.3` = safety buffer for usage spikes and infra.

### Internal cost tracking

`ScanUsage.estimatedCostMicros` records provider cost per scan for admin margin monitoring — **not** exposed to users.

### Key modules

| Concern | Location |
|---------|----------|
| Balance grant/debit | `lib/scans/balance.ts` |
| Pack catalog | `lib/scans/packs.ts`, `ScanPack` model |
| Provider cost estimate | `lib/scans/cost.ts` |
| Ledger labels | `lib/dashboard/ledger-label.ts` |
| Admin grant | `lib/admin/actions.ts` → `grantAdminScansAction` |

## TypeScript

- Strict mode.
- No `any`.
- Keep types simple and readable.

## Secrets

- Never expose secret keys in client code.
- Use server routes for tokens, AI calls, and any external API access.

## Authentication

- Use **better-auth** exclusively — config in `lib/auth/server.ts`, client in `lib/auth/client.ts`, session helpers in `lib/auth/session.ts`.
- Plugins: email OTP, email/password, admin (ban, impersonate, roles), organization (companies).
- API handler: `app/api/auth/[...all]/route.ts`.
- Route protection: thin cookie check in root [`proxy.ts`](proxy.ts) (Next.js 16+; `middleware.ts` is deprecated). Full session, onboarding, and role checks in route-group layouts via `lib/auth/session.ts`.
- Read [better-auth.com/docs](https://www.better-auth.com/docs) as the source of truth.

## Prisma

- PostgreSQL on Neon; schema in `prisma/schema.prisma`; client from `generated/prisma` via `lib/db/client.ts`.
- `lib/db/client.ts` normalizes `DATABASE_URL` (strips `channel_binding`, sets `sslmode=verify-full` for Neon + node-pg).
- Key domain models: `Scan`, `ScanResult`, `Report`, `Product`, `ScanBalance`, `ScanLedger`, `ScanPack`.
- Follow workspace Prisma conventions: relations on both sides, `createdAt`/`updatedAt`, indexes on frequently queried fields.
- Run `npx prisma migrate dev` after schema changes.

## AI Adapter

- All vision/text model calls go through **`lib/ai/adapter.ts`** (`analyzeSkin`).
- Default provider **Google Gemini** (`GEMINI_API_KEY`); model from `User.scanTier` → `AiModelRate.assignedTier`.
- `analyzeScanAction` persists result server-side and debits 1 scan from `ScanBalance`.
- The adapter exposes a stable app-level interface (e.g. `analyzeSkin(image): SkinAssessment`); swap provider by changing adapter internals only.
- Read [Google AI Gemini API docs](https://ai.google.dev/gemini-api/docs) at implementation time — model IDs and APIs change.
- Coarse band output only (see Non-Negotiables).

## Communication

Be concise. Explain what changed and how to test it.

## Final Reminder

Before every feature:

- Read this file.
- Follow it strictly.
- Build clean, simple code.
- Replicate UI exactly when designs are provided.
