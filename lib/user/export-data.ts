import { prisma } from "@/lib/db/client"

export const EXPORT_FORMAT_VERSION = "1.0"

/**
 * Builds a portable copy of everything held about a user.
 *
 * GDPR Article 20 asks for a structured, commonly used, machine-readable form,
 * which the per-scan PDF is not. Every category the privacy policy says we hold
 * appears here, so the two documents can be checked against each other.
 *
 * Chat image bytes are described but not inlined: including base64 blobs would
 * make the file unusable, and the metadata is enough to show what is held.
 */
export async function buildUserDataExport(userId: string) {
  const [user, profile, location, scans, conversations, balance, ledger, feedback] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.userLocation.findUnique({ where: { userId } }),
      prisma.scan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { result: true, usage: true, report: true },
      }),
      prisma.chatConversation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              content: true,
              metadata: true,
              createdAt: true,
              imageMimeType: true,
              imageData: true,
            },
          },
        },
      }),
      prisma.scanBalance.findUnique({ where: { userId } }),
      prisma.scanLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.scanFeedback.findMany({ where: { userId } }),
    ])

  return {
    exportFormatVersion: EXPORT_FORMAT_VERSION,
    generatedAt: new Date().toISOString(),
    notes: [
      "Scan photos are never stored, so none appear in this export.",
      "Chat image bytes are summarised rather than inlined; sizes are in bytes.",
    ],
    account: user,
    profile,
    location,
    scans: scans.map((scan) => ({
      id: scan.id,
      createdAt: scan.createdAt,
      status: scan.status,
      captureMode: scan.captureMode,
      imageRetained: scan.imageRetained,
      profileSnapshot: scan.profileSnapshot,
      locationSnapshot: scan.locationSnapshot,
      consentSnapshot: scan.consentSnapshot,
      result: scan.result,
      usage: scan.usage,
      report: scan.report,
    })),
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      kind: conversation.kind,
      scanId: conversation.scanId,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        metadata: message.metadata,
        createdAt: message.createdAt,
        attachedImage: message.imageData
          ? {
              mimeType: message.imageMimeType,
              sizeBytes: message.imageData.length,
            }
          : null,
      })),
    })),
    scanBalance: balance,
    scanLedger: ledger,
    feedback,
  }
}

export function exportFilename(now: Date = new Date()): string {
  return `aurora-organics-data-${now.toISOString().slice(0, 10)}.json`
}
