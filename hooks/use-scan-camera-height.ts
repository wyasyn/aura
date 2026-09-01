"use client"

import { useCallback, useEffect, useState } from "react"

// v2: the preview baseline grew, so previously stored (smaller) heights are
// intentionally discarded instead of pinning returning users to the old size.
const STORAGE_KEY = "aura:scan-camera-height:v2"

export const SCAN_CAMERA_HEIGHT = {
  min: 280,
  default: 520,
  maxPx: 840,
  maxVh: 0.82,
} as const

function getMaxHeight() {
  if (typeof window === "undefined") return SCAN_CAMERA_HEIGHT.maxPx
  return Math.min(
    window.innerHeight * SCAN_CAMERA_HEIGHT.maxVh,
    SCAN_CAMERA_HEIGHT.maxPx,
  )
}

function clampHeight(value: number) {
  return Math.round(
    Math.min(getMaxHeight(), Math.max(SCAN_CAMERA_HEIGHT.min, value)),
  )
}

export function useScanCameraHeight() {
  const [height, setHeightState] = useState<number>(SCAN_CAMERA_HEIGHT.default)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN
    // Also clamps the default, so the taller baseline still fits short viewports.
    const next = clampHeight(
      Number.isFinite(parsed) ? parsed : SCAN_CAMERA_HEIGHT.default,
    )
    setHeightState((current) => (current === next ? current : next))
  }, [])

  const setHeight = useCallback((value: number) => {
    const next = clampHeight(value)
    setHeightState(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }, [])

  return { height, setHeight, clampHeight }
}
