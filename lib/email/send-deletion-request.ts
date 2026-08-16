import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const from = process.env.EMAIL_FROM ?? "Aurora Organics <onboarding@resend.dev>"
const privacyTo =
  process.env.PRIVACY_EMAIL ?? "info@auroraorganics.co"

export async function sendDeletionRequestEmail({
  email,
  message,
  userId,
}: {
  email: string
  message?: string
  userId?: string
}): Promise<void> {
  const subject = `Data deletion request — ${email}`
  const text = [
    "A user submitted a data deletion request via Aurora Organics.",
    "",
    `Email: ${email}`,
    userId ? `User ID: ${userId}` : "User ID: (not signed in)",
    "",
    message ? `Message:\n${message}` : "Message: (none)",
  ].join("\n")

  if (!resend) {
    console.info(`[dev] Deletion request\n${text}`)
    return
  }

  await resend.emails.send({
    from,
    to: privacyTo,
    replyTo: email,
    subject,
    text,
  })
}
