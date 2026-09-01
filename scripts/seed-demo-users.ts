/**
 * Creates or refreshes one demo account per dashboard persona.
 *
 * Test credentials only — every password here is well-known and must never be
 * used on anything real. Idempotent: existing accounts keep their id and are
 * updated in place, so seeding twice does not orphan their data.
 *
 *   npx tsx scripts/seed-demo-users.ts
 */
import "dotenv/config"
import { randomUUID } from "node:crypto"

import { hashPassword } from "better-auth/crypto"

import { prisma } from "../lib/db/client"

type DemoUser = {
  email: string
  name: string
  password: string
  role: string
  workspace: string
}

const USERS: DemoUser[] = [
  {
    email: "demo.patient@aurora.test",
    name: "Amara Patient",
    password: "Patient#750",
    role: "user",
    workspace: "My account",
  },
  {
    email: "demo.expert@aurora.test",
    name: "Dr Sarah Nakato",
    password: "Expert#750",
    role: "expert",
    workspace: "Expert",
  },
  {
    email: "demo.admin@aurora.test",
    name: "Platform Admin",
    password: "Admin#750",
    role: "admin",
    workspace: "Administration + AI operations",
  },
  {
    email: "demo.affiliate@aurora.test",
    name: "Ruth Affiliate",
    password: "Affiliate#750",
    role: "affiliate",
    workspace: "Affiliate",
  },
]

async function upsertUser(user: DemoUser) {
  const record = await prisma.user.upsert({
    where: { email: user.email },
    create: {
      id: randomUUID(),
      email: user.email,
      name: user.name,
      emailVerified: true,
      role: user.role,
      onboardingCompleted: true,
    },
    update: { role: user.role, onboardingCompleted: true },
  })

  const hashed = await hashPassword(user.password)
  const account = await prisma.account.findFirst({
    where: { userId: record.id, providerId: "credential" },
  })

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashed },
    })
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: record.id,
        providerId: "credential",
        accountId: record.id,
        password: hashed,
      },
    })
  }

  // Onboarding is marked complete so a demo login lands on the dashboard rather
  // than the welcome flow.
  await prisma.userProfile.upsert({
    where: { userId: record.id },
    create: { userId: record.id, onboardingCompletedAt: new Date() },
    update: { onboardingCompletedAt: new Date() },
  })
  await prisma.scanBalance.upsert({
    where: { userId: record.id },
    create: { userId: record.id, remaining: 5 },
    update: {},
  })

  return record
}

async function main() {
  for (const user of USERS) {
    const record = await upsertUser(user)

    // The expert persona needs an approved ExpertProfile: holding the role is
    // not the same as being vetted, and the validation queue checks the latter.
    if (user.role === "expert") {
      await prisma.expertProfile.upsert({
        where: { userId: record.id },
        create: {
          userId: record.id,
          specialty: "dermatologist",
          headline: "Consultant dermatologist",
          bio: "Demo expert account.",
          credentials: "MBChB, Dermatology",
          yearsExperience: 8,
          consultationPriceCents: 7500,
          status: "approved",
          reviewedAt: new Date(),
        },
        update: { status: "approved" },
      })
    }

    if (user.role === "affiliate") {
      await prisma.affiliateProfile.upsert({
        where: { userId: record.id },
        create: {
          userId: record.id,
          status: "approved",
          howTheyPromote: "Demo affiliate account.",
          couponCode: "AURORA-DEMO-0001",
          reviewedAt: new Date(),
        },
        update: { status: "approved" },
      })
    }

    console.log(`${user.email.padEnd(30)} ${user.password.padEnd(16)} ${user.workspace}`)
  }

  // The clinic persona is a membership rather than a platform role, so it is
  // attached to an existing clinic instead of created from nothing.
  const clinic = await prisma.clinicSettings.findFirst({
    where: { subdomain: "wellderm" },
    select: { organizationId: true, subdomain: true },
  })

  if (clinic) {
    const staff = await upsertUser({
      email: "demo.clinic@aurora.test",
      name: "Clinic Manager",
      password: "Clinic#750",
      role: "company_admin",
      workspace: "Clinic",
    })

    const existing = await prisma.member.findUnique({
      where: {
        userId_organizationId: {
          userId: staff.id,
          organizationId: clinic.organizationId,
        },
      },
    })
    if (!existing) {
      await prisma.member.create({
        data: {
          id: randomUUID(),
          userId: staff.id,
          organizationId: clinic.organizationId,
          role: "admin",
        },
      })
    }
    console.log(
      `\nClinic staff sign in at ${clinic.subdomain}.localhost:3000 — per-clinic isolation refuses them on the platform host.`,
    )
  } else {
    console.log("\nNo 'wellderm' clinic found; skipped the clinic persona.")
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
