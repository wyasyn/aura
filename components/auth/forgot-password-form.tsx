"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { motion } from "motion/react"

import {
  AuthSplitShell,
  authItemVariants,
} from "@/components/auth/auth-split-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth/client"
import { otpRequestSchema } from "@/lib/auth/form-schemas"
import { validate, type FieldErrors } from "@/lib/onboarding/client-validation"

export function ForgotPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const validation = validate(otpRequestSchema, { email })
    if (!validation.ok) {
      setFieldErrors(validation.errors)
      return
    }

    setLoading(true)
    const { error: resetError } = await authClient.emailOtp.requestPasswordReset(
      { email },
    )

    if (resetError) {
      setLoading(false)
      setError(resetError.message ?? "Could not send a reset code.")
      return
    }

    router.push(`/reset-password?email=${encodeURIComponent(email)}`)
  }

  return (
    <AuthSplitShell
      title="Reset your"
      accent="password"
      subtitle="We will email you a six-digit code."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <motion.div variants={authItemVariants} className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id="email-error" role="alert" className="text-destructive text-sm">
              {fieldErrors.email}
            </p>
          ) : null}
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
            {loading ? "Sending" : "Send reset code"}
          </Button>
        </motion.div>
      </form>

      <motion.p
        variants={authItemVariants}
        className="text-muted-foreground mt-6 text-center text-sm"
      >
        <Link
          href="/login"
          className="hover:text-foreground underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </motion.p>
    </AuthSplitShell>
  )
}
