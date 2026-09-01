import { NextResponse } from "next/server"

import { authorizeCronRequest } from "@/lib/cron/authorize"
import { prisma } from "@/lib/db/client"
import { RETENTION, cutoffDate } from "@/lib/privacy/retention"

/**
 * Enforces the published retention schedule.
 *
 * Nothing here previously aged out: chat photos, expired sessions with their
 * recorded IP and user agent, spent verification codes and per-call spend logs
 * all grew without bound. The windows come from lib/privacy/retention.ts, which
 * is the same source the privacy policy quotes.
 *
 * Deliberately does not touch scans, results or profiles. Those are the user's
 * own records and only they decide when those go.
 */
export async function GET(request: Request) {
  const authorized = authorizeCronRequest(request)
  if (!authorized.ok) return authorized.response

  const now = new Date()

  // Clears the image bytes but keeps the message, so a conversation still reads
  // correctly after its attachments age out.
  const chatImages = await prisma.chatMessage.updateMany({
    where: {
      imageData: { not: null },
      createdAt: { lt: cutoffDate(RETENTION.chatImageDays, now) },
    },
    data: { imageData: null, imageMimeType: null },
  })

  const sessions = await prisma.session.deleteMany({
    where: { expiresAt: { lt: cutoffDate(RETENTION.expiredSessionDays, now) } },
  })

  const verifications = await prisma.verification.deleteMany({
    where: { expiresAt: { lt: cutoffDate(RETENTION.verificationDays, now) } },
  })

  const usage = await prisma.aiUsage.deleteMany({
    where: { createdAt: { lt: cutoffDate(RETENTION.aiUsageDays, now) } },
  })

  // Withdrawn training records are deleted outright once the grace window has
  // passed. Withdrawal already excluded them from every query; this is what
  // makes the removal real rather than a flag.
  const withdrawnTraining = await prisma.trainingRecord.deleteMany({
    where: {
      status: "withdrawn",
      withdrawnAt: {
        lt: cutoffDate(RETENTION.withdrawnTrainingRecordDays, now),
      },
    },
  })

  // The audit trail is never edited, only aged out — which is why this is the
  // one place in the codebase that deletes from it.
  const auditRows = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoffDate(RETENTION.auditLogDays, now) } },
  })

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    retention: RETENTION,
    purged: {
      chatImages: chatImages.count,
      expiredSessions: sessions.count,
      verifications: verifications.count,
      aiUsageRows: usage.count,
      withdrawnTrainingRecords: withdrawnTraining.count,
      auditRows: auditRows.count,
    },
  })
}
