"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { motion } from "motion/react"

import {
  AuthSplitShell,
  authItemVariants,
} from "@/components/auth/auth-split-shell"
import { PasswordInput } from "@/components/auth/password-input"
import { PasswordStrengthMeter } from "@/components/auth/password-strength"
import { OTPInput } from "@/components/motion/otp-input"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"
import { validate, type FieldErrors } from "@/lib/onboarding/client-validation"
import { passwordSchema } from "@/lib/onboarding/schemas"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const validation = validate(passwordSchema, { password, confirmPassword })
    if (!validation.ok) {
      setFieldErrors(validation.errors)
      return
    }

    if (otp.length !== 6) {
      setError("Enter the six-digit code from your email.")
      return
    }

    setLoading(true)
    const { error: resetError } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    })

    if (resetError) {
      setLoading(false)
      setError(resetError.message ?? "Could not reset your password.")
      return
    }

    router.push("/login")
  }

  if (!email) {
    return (
      <AuthSplitShell
        title="Reset your"
        accent="password"
        subtitle="We need to send you a code first."
      >
        <Button asChild className="h-11 w-full rounded-full">
          <Link href="/forgot-password">Request a reset code</Link>
        </Button>
      </AuthSplitShell>
    )
  }

  return (
    <AuthSplitShell
      title="Choose a new"
      accent="password"
      subtitle={`Enter the code we sent to ${email}.`}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <motion.div variants={authItemVariants}>
          <OTPInput
            length={6}
            value={otp}
            onChange={setOtp}
            label="Reset code"
            disabled={loading}
            autoFocus
          />
        </motion.div>

        <motion.div variants={authItemVariants} className="space-y-2">
          <PasswordInput
            id="new-password"
            label="New password"
            minLength={8}
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            autoComplete="new-password"
            disabled={loading}
          />
          <PasswordStrengthMeter value={password} />
        </motion.div>

        <motion.div variants={authItemVariants}>
          <PasswordInput
            id="confirm-new-password"
            label="Confirm password"
            minLength={8}
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            disabled={loading}
          />
        </motion.div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <motion.div variants={authItemVariants}>
          <Button
            type="submit"
            className="h-11 w-full rounded-full"
            disabled={loading}
          >
            {loading ? "Saving" : "Reset password"}
          </Button>
        </motion.div>
      </form>
    </AuthSplitShell>
  )
}
