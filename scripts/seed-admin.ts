/**
 * Bootstrap the first platform admin by email.
 * Run after migrations: npx tsx scripts/seed-admin.ts
 */
import "dotenv/config"

import { prisma } from "../lib/db/client"

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  if (!email) {
    console.error("Set BOOTSTRAP_ADMIN_EMAIL in .env")
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found for ${email}. Sign in once via OTP first.`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
  })

  console.log(`Granted admin role to ${email}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
