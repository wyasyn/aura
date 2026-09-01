# Container image for self-hosted deployment (App Runner / ECS Fargate).
#
# Vercel ignores this file entirely; it builds from source with its own
# pipeline. Nothing here changes how the Vercel deployment behaves.
#
# Node 24: @prisma/client requires ^20.19 || ^22.12 || >=24.0, and next
# requires >=20.9. 24 satisfies both and is the version this is tested on.

FROM node:24-alpine AS base

# ── deps ────────────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts skips prisma's postinstall; the build stage runs
# `prisma generate` itself through `npm run build`. sharp is unaffected: its
# platform binary arrives as the prebuilt @img/sharp-linuxmusl-* package, which
# has no build step of its own.
RUN npm ci --ignore-scripts

# ── build ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time placeholders, not secrets and not used at runtime.
#
# `next build` imports modules that construct the auth and database clients at
# module load, so both values have to parse. Neither is read during a build:
# nothing connects to a database and nothing signs a token. Every real value
# arrives as a runtime environment variable, and the runner stage below starts
# from a clean base, so none of this reaches the shipped image.
ENV DATABASE_URL="postgresql://not-a-real-user:not-a-real-password@127.0.0.1:5432/build_time_placeholder"
ENV BETTER_AUTH_SECRET="build-time-placeholder-not-a-secret-replaced-at-runtime"

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# these must be supplied here rather than at runtime — setting them in the task
# definition has no effect on what the browser already received.
#
# The Stripe publishable key is public by design; baking it is correct. Omit it
# and the card form renders without a Stripe client, which fails only at the
# point someone tries to pay.
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_APPLE_AUTH_ENABLED="false"
ARG NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true"
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APPLE_AUTH_ENABLED=$NEXT_PUBLIC_APPLE_AUTH_ENABLED
ENV NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=$NEXT_PUBLIC_GOOGLE_AUTH_ENABLED

# NEXT_PUBLIC_TENANT_ROOT_DOMAIN is deliberately NOT a build arg. Despite the
# prefix it is read only in server modules, and always at call time rather than
# captured at import, so it stays a runtime variable and one image can serve
# either tenancy mode.

RUN npm run build

# ── runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# openssl: kept pending verification against a real container build. Prisma 7
# with the pg driver adapter emits no native query engine — confirmed, there
# are no .node files in generated/prisma — which removes the usual reason for
# it. It has not been removed because that could not be tested here; see
# docs/aws-deployment.md.
RUN apk add --no-cache openssl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
# Bind all interfaces: the default localhost bind is unreachable from outside
# the container, so a health check would never succeed.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
