import { Resend } from "resend"

import { getServableTenant } from "@/lib/clinics/tenant"

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
  // A code requested from a clinic's site is sent in that clinic's name.
  // Resolved defensively: a branding lookup failing must never stop someone
  // receiving the code they need to sign in.
  let brandName: string | undefined
  try {
    const tenant = await getServableTenant()
    brandName = tenant?.branding.displayName
  } catch (error) {
    console.warn("[email] Could not resolve tenant branding for OTP", error)
  }

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
    subject: subjectForType(type, brandName),
    text: buildOtpEmailText({ otp, type, brandName }),
    html: buildOtpEmailHtml({ otp, type, brandName }),
  })

  if (error) {
    console.error("[email] Failed to send OTP", { type, error })
    throw new Error("Could not send the verification email. Please try again.")
  }
}
