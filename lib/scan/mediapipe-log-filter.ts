"use client"

/**
 * MediaPipe's WASM build writes TensorFlow Lite startup chatter to stdout and
 * stderr, which Emscripten routes to console.info/warn/error. None of it is
 * actionable: the XNNPACK line is a success notice, and the feedback-manager
 * warning is inherent to the BlazeFace model we ship. In dev it is forwarded
 * to the terminal (Next's logging.browserToTerminal defaults to "warn"), so
 * every scan buried the real output under a WASM stack trace.
 *
 * Filtered here rather than by turning off browser log forwarding wholesale,
 * so genuine warnings from the rest of the app still come through.
 */
const NOISE_PATTERNS = [
  "Created TensorFlow Lite XNNPACK delegate for CPU",
  "inference_feedback_manager.cc",
  "Feedback manager requires a model with a single signature inference",
  "gl_context.cc",
  "graph_profiler.cc",
] as const

type ConsoleMethod = "info" | "log" | "warn" | "error"

const PATCHED_METHODS: ConsoleMethod[] = ["info", "log", "warn", "error"]

let installed = false

function isMediapipeNoise(args: unknown[]) {
  const first = args[0]
  if (typeof first !== "string") return false
  return NOISE_PATTERNS.some((pattern) => first.includes(pattern))
}

/**
 * Idempotent, so the detector factories can call it without coordinating.
 * Returns without doing anything on the server.
 */
export function installMediapipeLogFilter() {
  if (installed || typeof window === "undefined") return
  installed = true

  for (const method of PATCHED_METHODS) {
    const original = console[method].bind(console)
    console[method] = (...args: unknown[]) => {
      if (isMediapipeNoise(args)) return
      original(...args)
    }
  }
}
