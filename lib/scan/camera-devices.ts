export type VideoDeviceOption = {
  deviceId: string
  label: string
}

const FRONT_LABEL_PATTERN =
  /\b(front|user|selfie|facetime|truedepth|integrated|webcam|uvc)\b/i
const BACK_LABEL_PATTERN = /\b(back|rear|environment|world)\b/i

export function inferFacingFromLabel(
  label: string,
): "user" | "environment" | undefined {
  const normalized = label.trim()
  if (!normalized) return undefined
  if (BACK_LABEL_PATTERN.test(normalized)) return "environment"
  if (FRONT_LABEL_PATTERN.test(normalized)) return "user"
  return undefined
}

export function formatCameraLabel(label: string, index: number) {
  const trimmed = label.trim()
  if (trimmed) return trimmed
  return `Camera ${index + 1}`
}

export async function enumerateVideoDevices(): Promise<VideoDeviceOption[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return []
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: formatCameraLabel(device.label, index),
    }))
}

export function resolvePreferredDeviceId(
  devices: VideoDeviceOption[],
  savedId: string | null,
) {
  if (devices.length === 0) return null
  if (savedId && devices.some((device) => device.deviceId === savedId)) {
    return savedId
  }
  return devices[0]?.deviceId ?? null
}

export function getDeviceLabel(
  devices: VideoDeviceOption[],
  deviceId: string | null,
) {
  if (!deviceId) return null
  return devices.find((device) => device.deviceId === deviceId)?.label ?? null
}
