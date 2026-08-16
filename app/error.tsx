"use client"

import type { ErrorInfo } from "next/error"

import { ErrorView } from "@/components/errors/error-view"

export default function Error({ unstable_retry }: ErrorInfo) {
  return <ErrorView retry={unstable_retry} />
}
