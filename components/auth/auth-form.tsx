"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useId } from "react"
import { AnimatePresence, LayoutGroup, motion, type Variants } from "motion/react"

import { PasswordInput } from "@/components/auth/password-input"
import { PasswordStrengthMeter } from "@/components/auth/password-strength"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeSignInAction, ensureUserRecordsAction } from "@/lib/auth/post-sign-in"
import { authClient } from "@/lib/auth/client"
import {
  otpRequestSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/form-schemas"
import { validate, type FieldErrors } from "@/lib/onboarding/client-validation"
import { PLACEHOLDER_IMAGES } from "@/lib/marketing/placeholder-images"
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease"
import { cn } from "@/lib/utils"

const collapseTransition =
  "transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
  </svg>
)

type AuthMethod = "password" | "otp"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/onboarding"
  const isSignUp = mode === "sign-up"
  const authMethodPillId = useId()

  const [authMethod, setAuthMethod] = useState<AuthMethod>("password")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  // Both providers are gated the same way now. Google used to render
  // unconditionally, so with GOOGLE_CLIENT_ID unset the button failed from the
  // server with nothing useful to show the user.
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "false"
  const appleEnabled = process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === "true"
  const anySocialEnabled = googleEnabled || appleEnabled

  async function handleSocial(provider: "google" | "apple") {
    setError(null)
    setFieldErrors({})

    setLoading(true)
    const { error: socialError } = await authClient.signIn.social({
      provider,
      callbackURL: `/social-complete?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    })
    setLoading(false)

    if (socialError) {
      setError(socialError.message ?? "Social sign-in failed.")
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const validation = isSignUp
      ? validate(signUpSchema, { name, email, password, confirmPassword })
      : validate(signInSchema, { email, password })

    if (!validation.ok) {
      setFieldErrors(validation.errors)
      return
    }

    setLoading(true)

    if (isSignUp) {
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: name || email.split("@")[0] || "Member",
      })

      if (signUpError) {
        setLoading(false)
        setError(signUpError.message ?? "Could not create account.")
        return
      }

      if (data?.user) {
        // Stay disabled through record creation and the redirect. Clearing
        // `loading` first left a window where the button could be pressed
        // again mid-navigation.
        await ensureUserRecordsAction(data.user.id, data.user.email, data.user.name)
        router.push("/onboarding")
        router.refresh()
        return
      }

      setLoading(false)
      return
    }

    const { data, error: signInError } = await authClient.signIn.email({
      email,
      password,
    })

    if (signInError) {
      setLoading(false)
      setError(signInError.message ?? "Invalid email or password.")
      return
    }

    if (data?.user) {
      const destination = await completeSignInAction(
        data.user.id,
        data.user.email,
        data.user.name,
        callbackUrl,
      )
      setLoading(false)
      router.replace(destination)
      return
    }

    setLoading(false)
  }

  async function handleOtpSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const validation = validate(otpRequestSchema, { email })
    if (!validation.ok) {
      setFieldErrors(validation.errors)
      return
    }

    setLoading(true)

    const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })

    setLoading(false)

    if (otpError) {
      setError(otpError.message ?? "Could not send code.")
      return
    }

    const params = new URLSearchParams({
      email,
      mode,
      callbackUrl,
    })
    if (isSignUp && name) {
      params.set("name", name)
    }
    router.push(`/verify?${params.toString()}`)
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh w-full flex-col font-sans antialiased lg:flex-row">
      <div className="relative hidden w-full flex-col justify-end p-4 lg:flex lg:min-h-svh lg:w-1/2">
        <div className="border-border relative h-full min-h-[480px] w-full overflow-hidden rounded-[32px] border shadow-2xl lg:min-h-0">
          <div className="absolute inset-0">
            <Image
              src={PLACEHOLDER_IMAGES.auth}
              alt="Personalized skincare routine imagery"
              fill
              className="object-cover"
              sizes="50vw"
              priority
            />
          </div>
          <div
            className="from-background/90 via-background/30 to-background/70 absolute inset-0 bg-gradient-to-t"
            aria-hidden
          />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center">
            <h1 className="font-display text-foreground text-3xl tracking-tight text-balance md:text-4xl lg:text-5xl">
              Understand your skin.
              <br />
              Discover your routine.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-sm text-sm text-balance">
              Personalized skin insights, routines, and matches made for you.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[400px]"
        >
          <motion.div variants={itemVariants} className="mb-8 text-center lg:text-left">
            <h2 className="font-heading text-foreground text-3xl leading-tight font-medium tracking-tight text-balance md:text-[40px]">
              {isSignUp ? (
                <>
                  Create your
                  <br />
                  <span className="font-display font-normal italic">account</span>
                </>
              ) : (
                <>
                  Welcome
                  <br />
                  <span className="font-display font-normal italic">back</span>
                </>
              )}
            </h2>
          </motion.div>

          {anySocialEnabled ? (
            <>
              <motion.div
                variants={itemVariants}
                className={cn(
                  "mb-6 grid gap-3",
                  googleEnabled && appleEnabled ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {googleEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full"
                    disabled={loading}
                    onClick={() => handleSocial("google")}
                  >
                    <GoogleIcon className="mr-2 size-4" />
                    Google
                  </Button>
                ) : null}
                {appleEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full"
                    disabled={loading}
                    onClick={() => handleSocial("apple")}
                  >
                    <AppleIcon className="mr-2 size-4" />
                    Apple
                  </Button>
                ) : null}
              </motion.div>

              <motion.div variants={itemVariants} className="relative mb-6 flex items-center">
                <div className="border-border grow border-t" />
                <span className="text-muted-foreground px-4 text-[11px] font-medium tracking-wider uppercase">
                  Or
                </span>
                <div className="border-border grow border-t" />
              </motion.div>
            </>
          ) : null}

          <motion.div variants={itemVariants}>
            <LayoutGroup id={authMethodPillId}>
              <div className="bg-muted/50 relative mb-6 flex rounded-lg p-1">
                {(["password", "otp"] as const).map((method) => {
                  const isActive = authMethod === method
                  const label = method === "password" ? "Password" : "Email code"

                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setAuthMethod(method)}
                      className="relative flex-1 rounded-md py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {isActive ? (
                        <motion.span
                          layoutId={authMethodPillId}
                          transition={SPRING_SWAP}
                          className="bg-background absolute inset-0 rounded-md shadow-sm"
                        />
                      ) : null}
                      <motion.span
                        layout="position"
                        transition={{ duration: 0.28, ease: EASE_OUT }}
                        animate={{
                          opacity: isActive ? 1 : 0.55,
                        }}
                        className={cn(
                          "relative z-10 block text-sm font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {label}
                      </motion.span>
                    </button>
                  )
                })}
              </div>
            </LayoutGroup>
          </motion.div>

          <form
            onSubmit={authMethod === "password" ? handlePasswordSubmit : handleOtpSubmit}
            className="flex flex-col gap-4"
          >
            {isSignUp ? (
              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </motion.div>
            ) : null}

            <motion.div variants={itemVariants} className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email ? (
                <p id="email-error" role="alert" className="text-destructive text-sm">
                  {fieldErrors.email}
                </p>
              ) : null}
            </motion.div>

            <div
              className={cn(
                "grid",
                collapseTransition,
                authMethod === "password"
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <PasswordInput
                      id="password"
                      label="Password"
                      minLength={8}
                      value={password}
                      onChange={setPassword}
                      error={fieldErrors.password}
                      placeholder="Enter your password"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      tabIndex={authMethod === "password" ? 0 : -1}
                    />
                    {isSignUp ? <PasswordStrengthMeter value={password} /> : null}
                  </div>
                  {isSignUp ? (
                    <PasswordInput
                      id="confirmPassword"
                      label="Confirm password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      error={fieldErrors.confirmPassword}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      tabIndex={authMethod === "password" ? 0 : -1}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <motion.div layout transition={{ duration: 0.3, ease: EASE_OUT }}>
              <Button type="submit" className="h-11 w-full rounded-full" disabled={loading}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={loading ? "loading" : authMethod}
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                    className="block"
                  >
                    {loading
                      ? "Please wait…"
                      : authMethod === "otp"
                        ? "Send code"
                        : isSignUp
                          ? "Create account"
                          : "Sign in"}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </motion.div>
          </form>

          {!isSignUp ? (
            <div
              className={cn(
                "grid",
                collapseTransition,
                authMethod === "password"
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="mt-4 text-center text-sm">
                  <Link
                    href="/forgot-password"
                    className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                    tabIndex={authMethod === "password" ? 0 : -1}
                  >
                    Forgot password?
                  </Link>
                </p>
              </div>
            </div>
          ) : null}

          <motion.p variants={itemVariants} className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-foreground underline underline-offset-4">
              Terms of use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-foreground underline underline-offset-4">
              Privacy policy
            </Link>
            .
          </motion.p>

          <motion.p variants={itemVariants} className="text-muted-foreground mt-4 text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <Link
                  href={`/login${callbackUrl !== "/onboarding" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                  className="text-foreground font-medium underline underline-offset-4"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link
                  href={`/signup${callbackUrl !== "/onboarding" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                  className="text-foreground font-medium underline underline-offset-4"
                >
                  Create account
                </Link>
              </>
            )}
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
