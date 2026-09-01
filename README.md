# Aurora

Web-based AI skin intelligence for Aurora Organics. Users scan their face, receive a cosmetic skin assessment, and get personalized product recommendations — plus a downloadable PDF report, scan history, and follow-up chat in the dashboard.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, PostgreSQL (Neon) + Prisma 7, Google Gemini, and better-auth.

> **Not a medical tool.** All output is cosmetic and wellness guidance only.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm (included with Node.js)
- A [Neon](https://neon.tech/) PostgreSQL database (or compatible Postgres)
- [Docker](https://www.docker.com/) (optional, for containerized runs)
- A [Google AI Studio](https://aistudio.google.com/) API key for skin analysis (`GEMINI_API_KEY`)

## Getting started (local)

1. Clone the repository and enter the project directory.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment variables and fill in required values:

   ```bash
   cp .env.example .env
   ```

   At minimum you need `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `GEMINI_API_KEY`. See [Environment variables](#environment-variables) below.

4. Run database migrations:

   ```bash
   npm run db:migrate
   ```

5. Seed data (recommended):

   ```bash
   npm run db:seed-admin      # promotes BOOTSTRAP_ADMIN_EMAIL to admin
   npm run db:seed-products   # static Aurora catalog fallback
   npm run db:seed-ingredients # INCI reference actives + backfill ingredientList
   npm run db:seed-packs      # scan pack catalog
   npm run db:seed-rates      # AI model rates per tier
   ```

   Sign in once via OTP with `BOOTSTRAP_ADMIN_EMAIL` before running seed scripts that require an admin user.

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

The first `dev` or `build` run generates Next.js type files under `.next/`. If TypeScript reports missing `.next/dev/types` files, run `npm run build` or `npm run dev` again.

## Scan flow (`/scan`)

The scan wizard runs in the browser; analysis and persistence happen server-side:

| Step | What happens |
| ---- | ------------ |
| **Capture** | Upload a photo, use the camera tab, or **Live** (Pro tier) for real-time guidance |
| **Crop** | Adjust framing with the image editor |
| **Quality** | On-device MediaPipe face + lighting checks |
| **Analyze** | Gemini vision via `lib/ai/adapter.ts` — climate context, prior scans, ingredient actives |
| **Results** | Two-column layout on desktop — photo left, assessment right |

**Capture modes:**

- **Upload** — still photo from disk
- **Camera** — live preview with quality hints (camera mounts only when the Camera tab is active)
- **Live** — Pro-tier real-time scan (`ScanLivePanel` → `/api/scan/live/complete`)
- **Advice** — chat with Aurora without starting a new scan

**Privacy:** Photos stay in browser memory for the session and are **not** stored in the database (`imageRetained: false`). Only the assessment text, recommendations, and report metadata are persisted.

**Reports:**

- **View report** opens a modal with the same layout as the results screen
- **Download PDF** generates a server-side PDF via `@react-pdf/renderer` (`GET /api/reports/[scanId]/pdf`)
- Past scans are listed at `/reports` (text-only in the modal — no photo for historical reports)

**Desktop camera:** The embedded preview height is draggable (grip below the view); double-click the grip to reset. Preference is saved in `localStorage`.

## Features

| Area | Implementation |
| ---- | ---------------- |
| **AI analysis** | Gemini vision + structured `SkinAssessment` (bands, dimensions, dosha, natural + product recs) |
| **Recommendations** | Catalog-constrained slugs, climate ranking, allergy filtering, INCI-aware prompts |
| **INCI parser** | `lib/products/parse-inci.ts` → `Product.ingredientList`; reference `Ingredient` table |
| **Climate** | Open-Meteo sync, location context, `climateTags` on products |
| **Chat** | Follow-up and general advice with structured recommendation cards |
| **Dashboard** | Scan balance, usage chart, **skin journey** trend chart |
| **Admin** | Users, products, models, usage analytics, scan grants, feedback |
| **Catalog sync** | Admin **Sync from store** or `npm run db:sync-products` (WooCommerce API or JSON fallback) |
| **Store integration** | Product deep links to auroraorganics.co; embed CTA at `/embed/scan` for iframe on the store site |

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Generate Prisma client and create a production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting |
| `npm run test` | Run unit tests (`node:test` via tsx) |
| `npm run format` | Format TypeScript files with Prettier |
| `npm run db:migrate` | Apply Prisma migrations (`prisma migrate dev`) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed-admin` | Bootstrap admin user from `BOOTSTRAP_ADMIN_EMAIL` |
| `npm run db:seed-products` | Seed Aurora product catalog from static JSON |
| `npm run db:sync-products` | Sync catalog from WooCommerce API or fallback JSON |
| `npm run db:seed-ingredients` | Seed INCI reference actives and backfill `ingredientList` |
| `npm run db:seed-packs` | Seed scan pack catalog |
| `npm run db:seed-rates` | Seed AI model rates per tier |
| `npm run db:reset-domain` | Reset domain data (destructive) |

## CI

GitHub Actions runs on pushes and PRs to `main` and `review`:

- `npm run lint`
- `npm run typecheck`
- `npm run test`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Docker

The image uses Next.js [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) for a minimal production bundle. **Secrets are not baked into the image** — `.env` files are excluded via `.dockerignore`. Inject them at runtime instead.

### Build

```bash
docker build -t aura .
```

To enable Apple Sign In in the client bundle, pass the public flag at **build** time (not run time):

```bash
docker build \
  --build-arg NEXT_PUBLIC_APPLE_AUTH_ENABLED=true \
  -t aura .
```

### Run

Apply migrations before starting the container (one-off, outside the app process):

```bash
npx prisma migrate deploy
```

Then start the app with your env file:

```bash
docker run --rm -p 3000:3000 --env-file .env aura
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables in Docker

| When | Variables | How |
| ---- | --------- | --- |
| **Build** | `NEXT_PUBLIC_*` only (e.g. `NEXT_PUBLIC_APPLE_AUTH_ENABLED`) | `docker build --build-arg ...` |
| **Runtime** | Everything else (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `GEMINI_API_KEY`, etc.) | `docker run --env-file .env` or `-e VAR=value` |

**Production checklist:**

1. Copy `.env.example` to a production env file (never commit it).
2. Set `BETTER_AUTH_URL` to your public HTTPS domain — not `http://localhost:3000`.
3. Use your production Neon `DATABASE_URL`.
4. Set `GEMINI_API_KEY` for analysis and chat.
5. Run `prisma migrate deploy` before starting the container.
6. Pass any `NEXT_PUBLIC_*` flags at build time if needed.

For production, prefer injecting vars from your platform's secret store (`-e` flags, Docker Compose secrets, K8s Secrets) instead of a file on disk.

## Aurora Organics website integration

Aurora links **out** to Aurora product pages and can be embedded on the store site:

- Product cards use `storeUrl` / `AURORA_STORE_ORIGIN` (`https://www.auroraorganics.co`)
- **Embed page:** [`/embed/scan`](http://localhost:3000/embed/scan) — minimal CTA for an iframe on auroraorganics.co
- **Catalog sync:** optional WooCommerce REST API (see env vars below) or static fallback via `db:seed-products` / `db:sync-products`

## Optional: scheduled catalog sync (not required locally)

`vercel.json` defines a daily cron job at `/api/cron/sync-products`. This is **optional** — you do not need it for local development.

To enable on Vercel later:

1. Set `CRON_SECRET` to a long random string in Vercel environment variables.
2. Set `BOOTSTRAP_ADMIN_EMAIL` (the sync runs as that admin user).
3. Optionally set WooCommerce credentials for live catalog pulls.

Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically. You can also trigger sync manually from **Admin → Products → Sync from store** or `npm run db:sync-products`.

## Project structure

```
app/
  (marketing)/     # Landing page — top navbar
  (scan)/          # Scan wizard — /scan
  (auth)/          # Login and OTP verification
  (onboarding)/    # Onboarding steps
  (dashboard)/     # User dashboard, reports, admin — sidebar
  embed/           # Store embed CTA — /embed/scan
  api/             # Auth, scan analyze, report PDF, cron, etc.
components/
  scan/            # Scan wizard, live panel, report layout
  reports/         # Report document and product cards
  chat/            # Chat message rendering and recommendation cards
  admin/           # Product editor, analytics
lib/
  ai/              # Gemini adapter, prompts, catalog context
  scan/            # Quality gate, analyze pipeline, persist
  products/        # Catalog, INCI parser, ingest, allergy filter
  ingredients/     # Reference actives and recommendation rules
  climate/         # Weather sync and tag matching
  pdf/             # React-PDF report document
  auth/            # better-auth config and session helpers
  db/              # Prisma client
prisma/
  schema.prisma    # Users, scans, products, ingredients, scan packs
```

See [AGENTS.md](AGENTS.md) for full conventions and stack details.

## Adding shadcn components

```bash
npx shadcn@latest add button
```

Components are added to `components/ui/`. Import them in your app:

```tsx
import { Button } from "@/components/ui/button"
```

## Environment variables

Copy `.env.example` to `.env` for local development.

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | Yes | Neon pooled PostgreSQL URL; use `sslmode=verify-full` |
| `BETTER_AUTH_SECRET` | Yes | Secret for better-auth sessions |
| `BETTER_AUTH_URL` | Yes | App URL, e.g. `http://localhost:3000` (HTTPS in production for mobile camera) |
| `GEMINI_API_KEY` | Yes | Google AI Studio key for scan analysis and chat |
| `RESEND_API_KEY` | For email OTP | Resend API key |
| `EMAIL_FROM` | For email OTP | Sender address for transactional mail |
| `BOOTSTRAP_ADMIN_EMAIL` | For seeds | Email promoted to admin by `db:seed-admin`; required for catalog sync scripts |
| `FREE_STARTER_SCANS` | No | Free Starter scans on onboarding (default `3`) |
| `WOOCOMMERCE_STORE_URL` | No | Store origin for WooCommerce sync (default auroraorganics.co) |
| `WOOCOMMERCE_CONSUMER_KEY` | No | WooCommerce REST API key — omit to use static JSON fallback |
| `WOOCOMMERCE_CONSUMER_SECRET` | No | WooCommerce REST API secret |
| `CRON_SECRET` | No | Secures `/api/cron/*` — only needed if you enable Vercel Cron |

OAuth variables (`GOOGLE_*`, `APPLE_*`, `NEXT_PUBLIC_APPLE_AUTH_ENABLED`) are optional.

Server-only secrets must not be exposed to the client. See [AGENTS.md](AGENTS.md).

## Planned next

- Stripe checkout for scan packs
- Object storage (R2) for PDF `storageKey` and optional image retention
- Deeper WooCommerce integration (webhooks, stock, inbound store auth)
- Expanded INCI reference data and automated ingredient scraping from product pages
