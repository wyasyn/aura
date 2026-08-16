export function getCameraAccessError(): string | null {
  if (typeof window === "undefined") return null

  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return "Camera requires a secure connection (HTTPS). On mobile, use Upload instead, or test via localhost or an HTTPS tunnel."
  }

  return null
}

export function getCameraPermissionError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return "Camera permission denied. Allow camera access in your browser settings and try again."
      case "NotFoundError":
        return "No camera found on this device."
      case "NotReadableError":
        return "Camera is in use by another app. Close it and try again."
      case "OverconstrainedError":
        return "This camera does not support the requested settings."
      case "SecurityError":
        return "Camera access is blocked. Use HTTPS or try photo upload instead."
      default:
        break
    }
  }

  if (err instanceof Error && err.message) {
    return err.message
  }

  return "Camera access is required for live capture."
}
