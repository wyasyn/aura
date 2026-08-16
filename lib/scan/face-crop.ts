import type { FaceDetection } from "@/lib/scan/types"

export type NormalizedRect = {
  x: number
  y: number
  w: number
  h: number
}

const MIN_FACE_CONFIDENCE = 0.4
const FACE_PADDING_RATIO = 0.4
const MIN_CROP_RATIO = 0.55

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function defaultCropRect(): NormalizedRect {
  const w = 0.72
  const h = 0.72
  return {
    x: (1 - w) / 2,
    y: (1 - h) / 2,
    w,
    h,
  }
}

export function computeFaceCropRect(
  face: FaceDetection,
  imageWidth: number,
  imageHeight: number,
): NormalizedRect {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return defaultCropRect()
  }

  const padding = Math.max(face.width, face.height) * FACE_PADDING_RATIO
  const cropSize = Math.max(face.width, face.height) + padding * 2

  const centerX = face.x + face.width / 2
  const centerY = face.y + face.height / 2

  let cropW = cropSize / imageWidth
  let cropH = cropSize / imageHeight

  const minRatio = MIN_CROP_RATIO
  cropW = Math.max(cropW, minRatio)
  cropH = Math.max(cropH, minRatio)

  const aspect = imageWidth / imageHeight
  if (cropW / cropH > aspect) {
    cropH = cropW / aspect
  } else {
    cropW = cropH * aspect
  }

  cropW = Math.min(cropW, 1)
  cropH = Math.min(cropH, 1)

  let x = centerX / imageWidth - cropW / 2
  let y = centerY / imageHeight - cropH / 2

  x = clamp(x, 0, 1 - cropW)
  y = clamp(y, 0, 1 - cropH)

  return { x, y, w: cropW, h: cropH }
}

export function pickBestFaceCrop(
  faces: FaceDetection[],
  imageWidth: number,
  imageHeight: number,
): NormalizedRect {
  const confident = faces.filter((face) => face.confidence >= MIN_FACE_CONFIDENCE)
  if (confident.length === 0) {
    return defaultCropRect()
  }

  const primary = confident.reduce((best, face) =>
    face.confidence > best.confidence ? face : best,
  )

  return computeFaceCropRect(primary, imageWidth, imageHeight)
}
