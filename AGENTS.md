You are an expert Next.js and React developer helping me build Aura.

Write clean, simple, maintainable code. Prioritize clarity over unnecessary abstraction.

Think like a senior full-stack developer.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Overview

Aura is a web-based AI "skin intelligence" SaaS for Aurora Organics.
Users scan their face via camera/upload, get an AI-generated cosmetic skin assessment, and receive personalized Aurora product recommendations — plus a downloadable PDF report and an admin dashboard.

This is **not** a medical diagnostic tool. All output is framed as cosmetic and wellness guidance only.

## Installed Stack

Use only what is in `package.json` today. Before using any library, check `package.json`. If it is not listed here, it is not available unless added per the Docs and Dependencies policy below.

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **UI:** shadcn v4 (`radix-sera`), Tailwind CSS 4, `class-variance-authority`, `cn()` from `lib/utils.ts`
- **Theme:** `next-themes` via `components/theme-provider.tsx`; tokens in `app/globals.css`
- **Icons:** `@tabler/icons-react` only — no new icon libraries
- **Fonts:** Inter (body), Roboto (headings), Cormorant Garamond (display/hero), Geist Mono (code) — loaded in `app/layout.tsx`

## Planned Stack

These are target technologies for the product. **Do not install packages for planned stack items without user approval** — except adding shadcn UI components via CLI (see Docs and Dependencies).

- **Database:** PostgreSQL + Prisma (schema conventions, migrations)
- **Auth:** better-auth (email OTP + sessions)
- **AI provider:** Google Gemini via AI Studio API key — single swappable adapter module
- **File storage:** S3-compatible object storage (e.g. Cloudflare R2), signed URLs
- **PDF generation:** React-PDF (or headless-Chrome render), generated server-side
- **On-device check:** MediaPipe / TF.js face + lighting quality gate before upload
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
- If a new library would significantly help, recommend it, explain why, and wait for approval.

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
  ai/           # adapter, types, prompts — all AI logic here
  auth/         # better-auth config, session helpers, server utilities
  db/           # Prisma client (when added)
components/
  ui/           # shared shadcn primitives only
  layouts/      # route-group shells (marketing, scan, auth, onboarding, dashboard)
  auth/         # auth-specific UI (login form, OTP input, etc.)
  scan/         # scan flow UI
  report/       # report display UI
app/
  (marketing)/  # landing — top navbar
  (scan)/       # scan flow — scan-specific chrome
  (auth)/       # login, verify — centered card
  (onboarding)/ # onboarding steps — no nav/sidebar
  (dashboard)/  # user + admin — sidebar
  api/          # API routes — outside route groups
```

**Route groups**

Next.js route groups `(name)` organize layouts without affecting URLs. Each group has one shell in `components/layouts/`; group `layout.tsx` files stay thin.

| Group | Shell | Chrome | Routes |
|-------|-------|--------|--------|
| `(marketing)` | `MarketingShell` | Top navbar | `/` |
| `(scan)` | `ScanShell` | Scan header/progress — not marketing nav | `/scan/*` |
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
- Scan/upload, R2, and privacy rules are covered under Planned Stack and Non-Negotiables.

## TypeScript

- Strict mode.
- No `any`.
- Keep types simple and readable.

## Secrets

- Never expose secret keys in client code.
- Use server routes for tokens, AI calls, and any external API access.

## Authentication

- Use **better-auth** exclusively — do not build custom session/JWT auth.
- Until installed: document intended integration points (server routes, session checks, email OTP) but do not add the package.
- When implementing, read [better-auth.com/docs](https://www.better-auth.com/docs) as the source of truth.

## Prisma

- Target: PostgreSQL + Prisma ORM.
- Follow workspace Prisma conventions: relations on both sides, `createdAt`/`updatedAt`, indexes on frequently queried fields.
- **Do not install Prisma or run migrations** until user approves.
- When approved: schema lives in `prisma/schema.prisma`; use Prisma Client from a single module (e.g. `lib/db.ts`).

## AI Adapter

- All vision/text model calls go through **one adapter file** (e.g. `lib/ai/adapter.ts`).
- Default provider: **Google Gemini** (AI Studio API key via env, e.g. `GEMINI_API_KEY`) — vision model such as Gemini 2.5 Flash.
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
