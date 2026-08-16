import { inferFacingFromLabel } from "@/lib/scan/camera-devices"

export type CameraFacingMode = "user" | "environment"

const PREFERRED_VIDEO = {
  width: { min: 1280, ideal: 1920 },
  height: { min: 720, ideal: 1080 },
} as const

const FALLBACK_VIDEO = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
} as const

export function getCameraVideoConstraints(facingMode: CameraFacingMode) {
  return {
    video: {
      facingMode,
      ...PREFERRED_VIDEO,
    },
    audio: false as const,
  }
}

export function getCameraVideoConstraintsFallback(facingMode: CameraFacingMode) {
  return {
    video: {
      facingMode,
      ...FALLBACK_VIDEO,
    },
    audio: false as const,
  }
}

export function getCameraVideoConstraintsForDevice(deviceId: string) {
  return {
    video: {
      deviceId: { exact: deviceId },
      ...PREFERRED_VIDEO,
    },
    audio: false as const,
  }
}

export function getCameraVideoConstraintsForDeviceFallback(deviceId: string) {
  return {
    video: {
      deviceId: { exact: deviceId },
      ...FALLBACK_VIDEO,
    },
    audio: false as const,
  }
}

async function openWithFallback(
  preferred: MediaStreamConstraints,
  fallback: MediaStreamConstraints,
) {
  try {
    return await navigator.mediaDevices.getUserMedia(preferred)
  } catch (err) {
    if (err instanceof DOMException && err.name === "OverconstrainedError") {
      return navigator.mediaDevices.getUserMedia(fallback)
    }
    throw err
  }
}

export async function openCameraStream(facingMode: CameraFacingMode) {
  return openWithFallback(
    getCameraVideoConstraints(facingMode),
    getCameraVideoConstraintsFallback(facingMode),
  )
}

export async function openCameraStreamWithDevice(deviceId: string) {
  return openWithFallback(
    getCameraVideoConstraintsForDevice(deviceId),
    getCameraVideoConstraintsForDeviceFallback(deviceId),
  )
}

export function getStreamVideoTrack(stream: MediaStream | null) {
  return stream?.getVideoTracks()[0] ?? null
}

export function getStreamFacingMode(
  stream: MediaStream | null,
): CameraFacingMode | undefined {
  const facing = getStreamVideoTrack(stream)?.getSettings().facingMode
  if (facing === "user" || facing === "environment") {
    return facing
  }
  return undefined
}

export function getStreamDeviceId(stream: MediaStream | null): string | undefined {
  return getStreamVideoTrack(stream)?.getSettings().deviceId
}

export function shouldMirrorStream(
  stream: MediaStream | null,
  deviceLabel?: string | null,
) {
  const facing = getStreamFacingMode(stream)
  if (facing === "environment") return false
  if (facing === "user") return true

  const track = getStreamVideoTrack(stream)
  const label = track?.label || deviceLabel || ""
  if (label) {
    const inferred = inferFacingFromLabel(label)
    if (inferred === "environment") return false
    if (inferred === "user") return true
  }

  // Face-scan preview: mirror by default (selfie-style) unless back camera
  return true
}

export function getActualVideoResolution(video: HTMLVideoElement) {
  return {
    width: video.videoWidth,
    height: video.videoHeight,
  }
}
