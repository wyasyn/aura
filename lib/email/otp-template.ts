type OtpType = "sign-in" | "email-verification" | "forget-password" | "change-email"

const EXPIRES_MINUTES = 10
const BRAND_NAME = "Aurora Organics"

function introForType(type: OtpType): string {
  switch (type) {
    case "forget-password":
      return "Enter this code to reset your password"
    case "email-verification":
      return "Enter this code to verify your email"
    case "change-email":
      return "Enter this code to confirm your new email address"
    default:
      return "Enter this code to sign in to your account"
  }
}

function subjectForType(type: OtpType): string {
  switch (type) {
    case "sign-in":
      return `Your ${BRAND_NAME} sign-in code`
    case "email-verification":
      return `Verify your ${BRAND_NAME} email`
    case "forget-password":
      return `Reset your ${BRAND_NAME} password`
    case "change-email":
      return `Confirm your new ${BRAND_NAME} email`
    default:
      return `Your ${BRAND_NAME} verification code`
  }
}

export function buildOtpEmailText({
  otp,
  type,
  expiresMinutes = EXPIRES_MINUTES,
}: {
  otp: string
  type: OtpType
  expiresMinutes?: number
}): string {
  const intro = introForType(type)

  return `${intro}:\n\n${otp}\n\nThis code expires in ${expiresMinutes} minutes. If you did not request this, you can safely ignore this email.\n\n${BRAND_NAME}\nThoughtful skincare, made personal.`
}

export function buildOtpEmailHtml({
  otp,
  type,
  expiresMinutes = EXPIRES_MINUTES,
}: {
  otp: string
  type: OtpType
  expiresMinutes?: number
}): string {
  const intro = introForType(type)
  const subject = subjectForType(type)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f3f0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2a2520;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f3f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border:1px solid #e8e4df;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #f0ece7;">
              <p style="margin:0;font-family:Roboto,Segoe UI,sans-serif;font-size:20px;font-weight:500;letter-spacing:0.04em;color:#a67c52;">Aurora Organics</p>
              <p style="margin:8px 0 0;font-size:13px;color:#7a7268;">Thoughtful skincare, made personal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a443c;">${intro}:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:20px 16px;background-color:#faf9f7;border:1px solid #e8e4df;border-radius:12px;">
                    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:600;letter-spacing:0.35em;color:#2a2520;">${otp}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7a7268;">
                This code expires in <strong style="color:#4a443c;">${expiresMinutes} minutes</strong>.
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;background-color:#faf9f7;border-top:1px solid #f0ece7;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#9a9288;text-align:center;">
                ${BRAND_NAME} · Thoughtful skincare, made personal.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export type { OtpType }
export { subjectForType }
