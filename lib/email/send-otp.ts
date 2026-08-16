import { Resend } from "resend"

import {
  buildOtpEmailHtml,
  buildOtpEmailText,
  subjectForType,
  type OtpType,
} from "@/lib/email/otp-template"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const from = process.env.EMAIL_FROM ?? "Aurora Organics <onboarding@resend.dev>"

export async function sendOtpEmail({
  email,
  otp,
  type,
}: {
  email: string
  otp: string
  type: OtpType
}): Promise<void> {
  if (!resend) {
    console.info(`[dev] OTP for ${email} (${type}): ${otp}`)
    return
  }

  // The Resend SDK reports API failures in `error` rather than throwing, so a
  // silent failure here would show the user "code sent" for a code that was
  // never delivered. Surface it to the caller instead.
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: subjectForType(type),
    text: buildOtpEmailText({ otp, type }),
    html: buildOtpEmailHtml({ otp, type }),
  })

  if (error) {
    console.error("[email] Failed to send OTP", { type, error })
    throw new Error("Could not send the verification email. Please try again.")
  }
}
