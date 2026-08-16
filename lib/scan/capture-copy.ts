import type { CaptureMode } from "@/lib/scan/types"

export const LIVE_SESSION_PRIVACY_LINE =
  "Video stays on your device until you finish — only your saved report is stored."

export const CAPTURE_COPY: Record<
  CaptureMode,
  { title: string; description: string }
> = {
  upload: {
    title: "Scan your skin",
    description: "Clear photo, personalized guidance & product picks",
  },
  camera: {
    title: "Scan your skin",
    description: "Live lighting check, then your skin report",
  },
  live: {
    title: "Live skin scan",
    description: "Real-time Pro guidance",
  },
  advice: {
    title: "Skin advice",
    description: "Ask about routines, concerns & recommendations",
  },
}

export const CAPTURE_TAB_TOOLTIPS = {
  upload: "Upload a clear face photo for a personalized skin report",
  camera: "Use your camera with live lighting guidance for a scan",
  advice: "Chat about routines, products, and skin concerns",
  live: "Real-time Pro live skin scan with guided observations",
  dashboard: "Open your dashboard for reports, usage, and account settings",
} as const
