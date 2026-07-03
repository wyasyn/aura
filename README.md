# Aura

Web-based AI skin intelligence for Aurora Organics. Users scan their face, receive a cosmetic skin assessment, and get personalized product recommendations.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and shadcn/ui.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm (included with Node.js)
- [Docker](https://www.docker.com/) (optional, for containerized runs)

## Getting started (local)

1. Clone the repository and enter the project directory.
 
2. install dependences
   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The first `dev` or `build` run generates Next.js type files under `.next/`. If TypeScript reports missing `.next/dev/types` files, run `npm run build` or `npm run dev` again.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start dev server with hot reload     |
| `npm run build`   | Create a production build            |
| `npm run start`   | Serve the production build locally   |
| `npm run lint`    | Run ESLint                           |
| `npm run typecheck` | Run TypeScript without emitting    |
| `npm run format`  | Format TypeScript files with Prettier |

## Docker

Build and run the app in a container (production mode):

```bash
docker build -t aura .
docker run --rm -p 3000:3000 aura
```

Then open [http://localhost:3000](http://localhost:3000).

To pass environment variables:

```bash
docker run --rm -p 3000:3000 --env-file .env aura
```

The image uses Next.js [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) for a minimal production bundle.

## Project structure

```
app/
  (marketing)/    # Landing page — top navbar
  (scan)/         # Scan flow — scan-specific chrome
  (auth)/         # Login and OTP verification
  (onboarding)/   # Onboarding steps — no nav/sidebar
  (dashboard)/    # User and admin — sidebar
components/
  ui/             # shadcn primitives
  layouts/        # Route-group shells
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

Create a `.env.local` file for local development when environment variables are needed. Planned variables (not all required yet):

| Variable        | Description                    |
| --------------- | ------------------------------ |
| `GEMINI_API_KEY` | Google AI Studio API key (planned) |
| `DATABASE_URL`   | PostgreSQL connection string (planned) |

Server-only secrets must not be exposed to the client. See [AGENTS.md](AGENTS.md).
