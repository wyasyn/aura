/**
 * Ties existing patients to the clinic they already scanned through.
 *
 * Per-clinic login isolation refuses anyone with no link to the clinic whose
 * site they are on. Without this backfill, every patient who scanned through a
 * clinic before the link existed would be locked out of that clinic's site.
 *
 * Run once after deploying the ClinicPatient migration:
 *   npx tsx scripts/backfill-clinic-patients.ts
 */
import "dotenv/config"

import { prisma } from "../lib/db/client"

async function main() {
  // Earliest clinic scan wins, so someone who scanned at two clinics is tied to
  // the one they used first rather than whichever row happens to come back last.
  const scans = await prisma.scan.findMany({
    where: { organizationId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { userId: true, organizationId: true, createdAt: true },
  })

  const firstClinicByUser = new Map<string, string>()
  for (const scan of scans) {
    if (!scan.organizationId) continue
    if (!firstClinicByUser.has(scan.userId)) {
      firstClinicByUser.set(scan.userId, scan.organizationId)
    }
  }

  // Staff already have a Member row, which the gate accepts on its own. Adding
  // a patient link for them too would be harmless but misleading in the data.
  const staff = await prisma.member.findMany({ select: { userId: true } })
  const staffIds = new Set(staff.map((member) => member.userId))

  let created = 0
  let skipped = 0

  for (const [userId, organizationId] of firstClinicByUser) {
    if (staffIds.has(userId)) {
      skipped++
      continue
    }

    const existing = await prisma.clinicPatient.findUnique({ where: { userId } })
    if (existing) {
      skipped++
      continue
    }

    await prisma.clinicPatient.create({ data: { userId, organizationId } })
    created++
  }

  const multiClinic = [...firstClinicByUser.keys()].filter((userId) => {
    const orgs = new Set(
      scans.filter((s) => s.userId === userId).map((s) => s.organizationId),
    )
    return orgs.size > 1
  })

  console.log({
    usersWithClinicScans: firstClinicByUser.size,
    linksCreated: created,
    skippedStaffOrExisting: skipped,
    // Surfaced rather than silently resolved: these people scanned at more than
    // one clinic and can now only sign in at the first.
    usersWithScansAtMultipleClinics: multiClinic.length,
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
