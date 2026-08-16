import { Suspense } from "react"

import { VerifyOtpForm } from "@/components/auth/verify-otp-form"

export default function VerifyPage() {
  return (
    // The form renders its own full-height split-screen shell, so no wrapper.
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  )
}
