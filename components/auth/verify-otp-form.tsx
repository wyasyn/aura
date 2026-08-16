"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { motion } from "motion/react"

import {
  AuthSplitShell,
  authItemVariants,
} from "@/components/auth/auth-split-shell"
import { OTPInput } from "@/components/motion/otp-input"
import { Button } from "@/components/ui/button"
import { completeSignInAction } from "@/lib/auth/post-sign-in"
import { authClient } from "@/lib/auth/client"

/** Matches the server-side rate limit on OTP issuance in lib/auth/server.ts. */
const RESEND_COOLDOWN_SECONDS = 30

export function VerifyOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const mode = searchParams.get("mode") ?? "sign-in"
  const name = searchParams.get("name") ?? ""
  const callbackUrl = searchParams.get("callbackUrl") ?? "/onboarding"

  const [otp, setOtp] = useState("")
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)

  // A code was just sent to get here, so the cooldown starts immediately.
  // Without it, "Resend code" invited users straight into the rate limiter.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  async function verifyCode(code: string) {
    if (!email) {
      setError("Missing email. Go back and try again.")
      setStatus("error")
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: signInError } = await authClient.signIn.emailOtp({
      email,
      otp: code,
      ...(mode === "sign-up" && name ? { name } : {}),
    })

    if (signInError) {
      setLoading(false)
      setError(signInError.message ?? "That code did not work. Try again.")
      setStatus("error")
      return
    }

    if (data?.user) {
      const destination = await completeSignInAction(
        data.user.id,
        data.user.email,
        data.user.name,
        callbackUrl,
      )
      setStatus("success")
      router.replace(destination)
      return
    }

    setStatus("success")
    router.replace("/onboarding")
  }

  async function resend() {
    if (!email || cooldown > 0) return
    setError(null)
    setCooldown(RESEND_COOLDOWN_SECONDS)

    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })

    if (sendError) {
      setError(sendError.message ?? "Could not send another code.")
      setStatus("error")
    }
  }

  if (!email) {
    return (
      <AuthSplitShell
        title="Check your"
        accent="inbox"
        subtitle="We do not have an email address to verify."
      >
        <Button asChild className="h-11 w-full rounded-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </AuthSplitShell>
    )
  }

  return (
    <AuthSplitShell
      title="Check your"
      accent="inbox"
      subtitle={`We sent a six-digit code to ${email}.`}
    >
      <div className="flex flex-col gap-5">
        <motion.div variants={authItemVariants}>
          <OTPInput
            length={6}
            value={otp}
            onChange={setOtp}
            onComplete={verifyCode}
            status={status}
            errorMessage={error ?? undefined}
            successMessage="Verified. Taking you through."
            disabled={loading || status === "success"}
            autoFocus
            label="Verification code"
            hint="Check your spam folder if it does not arrive."
          />
        </motion.div>

        {status === "success" ? null : (
          <motion.div variants={authItemVariants} className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 w-full rounded-full"
              disabled={loading || otp.length !== 6}
              onClick={() => verifyCode(otp)}
            >
              {loading ? "Verifying" : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full rounded-full"
              disabled={cooldown > 0}
              onClick={resend}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </Button>
          </motion.div>
        )}
      </div>
    </AuthSplitShell>
  )
}
