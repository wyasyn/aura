import net from "node:net"

import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

import { PrismaClient } from "@/generated/prisma/client"

// Node's happy-eyeballs gives each candidate address only 250ms to complete the
// TCP handshake. Neon resolves to several A/AAAA records, and on a link whose
// round trip to us-east-1 is already ~250ms every attempt aborts, surfacing as
// an ETIMEDOUT before the first query is ever sent. Give each address room for
// a few round trips.
const AUTOSELECT_ATTEMPT_TIMEOUT_MS = 3_000

function widenAddressSelectionTimeout() {
  if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout !== "function") {
    return
  }
  const current = net.getDefaultAutoSelectFamilyAttemptTimeout?.() ?? 0
  if (current >= AUTOSELECT_ATTEMPT_TIMEOUT_MS) {
    return
  }
  net.setDefaultAutoSelectFamilyAttemptTimeout(AUTOSELECT_ATTEMPT_TIMEOUT_MS)
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool: Pool | undefined
}

function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString)
    // channel_binding=require can cause timeouts with node-pg + Neon pooler.
    url.searchParams.delete("channel_binding")

    const sslmode = url.searchParams.get("sslmode")
    // pg v8 treats require/prefer/verify-ca as verify-full; set explicitly to
    // avoid the deprecation warning and keep strict SSL with Neon.
    if (
      !sslmode ||
      sslmode === "require" ||
      sslmode === "prefer" ||
      sslmode === "verify-ca"
    ) {
      url.searchParams.set("sslmode", "verify-full")
    }

    return url.toString()
  } catch {
    return connectionString
  }
}

function createPgPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  widenAddressSelectionTimeout()

  const normalized = normalizeConnectionString(connectionString)

  if (
    process.env.NODE_ENV !== "production" &&
    normalized.includes(".neon.tech") &&
    !normalized.includes("-pooler.")
  ) {
    console.warn(
      "[db] DATABASE_URL does not use a Neon pooler host. Use the *-pooler.* endpoint for serverless/dev.",
    )
  }

  // Use Neon's pooled host (*-pooler.*.neon.tech) in DATABASE_URL for serverless.
  const pool = new Pool({
    connectionString: normalized,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    connectionTimeoutMillis:
      process.env.NODE_ENV === "production" ? 20_000 : 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  })

  pool.on("error", (error) => {
    console.error("[db] idle pool client error:", error)
  })

  return pool
}

function createPrismaClient() {
  const pool = globalForPrisma.pgPool ?? createPgPool()
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = pool
  }

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
