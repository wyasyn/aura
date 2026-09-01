"use client"

import { detectFaces } from "@/lib/scan/mediapipe"
import type {
  CropSubject,
  LightingBand,
  QualityCheckResult,
} from "@/lib/scan/types"

type ImageSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | ImageBitmap

const MIN_FACE_CONFIDENCE = 0.45
const MIN_FACE_AREA_RATIO = 0.06
const MAX_FACE_AREA_RATIO = 0.7
const MIN_LIGHTING = 0.22
const MAX_LIGHTING = 0.82
const MIN_WIDTH = 320
const MIN_HEIGHT = 320

/**
 * Fraction of the crop that must read as skin tone for a close-up with no face
 * in frame (a cheek, forehead or jawline patch) to count as a valid subject.
 */
const MIN_SKIN_COVERAGE = 0.55
const SKIN_SAMPLE_EDGE = 128

/**
 * "Skin detail" is advisory, so both bars sit low enough that a normal photo
 * clears them and only genuinely unusable input (blurred, or barely any skin
 * in frame) trips the warning.
 */
const MIN_PLAUSIBLE_SKIN_COVERAGE = 0.3
const MIN_SKIN_DETAIL = 0.006
const DETAIL_PATCH_EDGE = 256

const RELAXED_MIN_FACE_CONFIDENCE = 0.4
const RELAXED_MIN_FACE_AREA_RATIO = 0.04
const RELAXED_MAX_FACE_AREA_RATIO = 0.85
const RELAXED_CENTER_THRESHOLD = 0.28

export type QualityGateOptions = {
  /**
   * User cropped to skin/face — skip strict full-face re-check.
   * Used on the quality step; live camera preview stays strict.
   */
  trustUserCrop?: boolean
}

function getSourceSize(source: ImageSource) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight }
  }

  return { width: source.width, height: source.height }
}

function sampleLighting(
  source: ImageSource,
  face?: { x: number; y: number; width: number; height: number },
): { score: number; band: LightingBand } {
  const { width, height } = getSourceSize(source)
  if (width === 0 || height === 0) {
    return { score: 0, band: "too_dark" }
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    return { score: 0, band: "too_dark" }
  }

  ctx.drawImage(source, 0, 0, width, height)

  const region = face ?? {
    x: width * 0.25,
    y: height * 0.15,
    width: width * 0.5,
    height: height * 0.7,
  }

  const sx = Math.max(0, Math.floor(region.x))
  const sy = Math.max(0, Math.floor(region.y))
  const sw = Math.min(width - sx, Math.floor(region.width))
  const sh = Math.min(height - sy, Math.floor(region.height))

  if (sw <= 0 || sh <= 0) {
    return { score: 0, band: "too_dark" }
  }

  const imageData = ctx.getImageData(sx, sy, sw, sh).data
  let total = 0
  let count = 0

  for (let i = 0; i < imageData.length; i += 16) {
    const r = imageData[i] ?? 0
    const g = imageData[i + 1] ?? 0
    const b = imageData[i + 2] ?? 0
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    total += luminance
    count += 1
  }

  const score = count > 0 ? total / count : 0
  let band: LightingBand = "ok"
  if (score < MIN_LIGHTING) band = "too_dark"
  if (score > MAX_LIGHTING) band = "too_bright"

  return { score, band }
}

/**
 * Rough skin-tone test in YCbCr, which holds up across skin tones far better
 * than a raw RGB rule. Very dark and blown-out pixels are excluded by the
 * caller so shadows and specular highlights do not skew the ratio.
 */
function isSkinPixel(r: number, g: number, b: number) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
  return cb >= 77 && cb <= 133 && cr >= 130 && cr <= 180 && r > b
}

/**
 * Share of usable pixels that read as skin. Sampled from a downscaled copy so
 * this stays cheap on large uploads.
 */
function sampleSkinCoverage(source: ImageSource) {
  const { width, height } = getSourceSize(source)
  if (width === 0 || height === 0) return 0

  const scale = Math.min(1, SKIN_SAMPLE_EDGE / Math.max(width, height))
  const sampleWidth = Math.max(1, Math.round(width * scale))
  const sampleHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = sampleWidth
  canvas.height = sampleHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return 0

  ctx.drawImage(source, 0, 0, sampleWidth, sampleHeight)
  const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data

  let usable = 0
  let skin = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    if (luminance < 0.12 || luminance > 0.96) continue
    usable += 1
    if (isSkinPixel(r, g, b)) skin += 1
  }

  return usable > 0 ? skin / usable : 0
}

/**
 * How much fine texture the photo carries: the RMS neighbour-to-neighbour
 * luminance gradient over a centre patch, read at native resolution so
 * downscaling does not wash the detail away. Soft or out-of-focus photos land
 * near zero, real pores and texture land well above it.
 */
function sampleSkinDetail(source: ImageSource) {
  const { width, height } = getSourceSize(source)
  if (width === 0 || height === 0) return 0

  const patch = Math.min(DETAIL_PATCH_EDGE, width, height)
  const sx = Math.floor((width - patch) / 2)
  const sy = Math.floor((height - patch) / 2)

  const canvas = document.createElement("canvas")
  canvas.width = patch
  canvas.height = patch
  const ctx = canvas.getContext("2d")
  if (!ctx) return 0

  ctx.drawImage(source, sx, sy, patch, patch, 0, 0, patch, patch)
  const data = ctx.getImageData(0, 0, patch, patch).data

  const luma = new Float32Array(patch * patch)
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    luma[p] =
      (0.2126 * (data[i] ?? 0) +
        0.7152 * (data[i + 1] ?? 0) +
        0.0722 * (data[i + 2] ?? 0)) /
      255
  }

  let sumSquares = 0
  let count = 0
  for (let y = 1; y < patch; y += 1) {
    for (let x = 1; x < patch; x += 1) {
      const here = luma[y * patch + x] ?? 0
      const dx = here - (luma[y * patch + x - 1] ?? 0)
      const dy = here - (luma[(y - 1) * patch + x] ?? 0)
      sumSquares += dx * dx + dy * dy
      count += 2
    }
  }

  return count > 0 ? Math.sqrt(sumSquares / count) : 0
}

function isFaceCentered(
  face: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
  threshold: number,
) {
  const centerX = face.x + face.width / 2
  const centerY = face.y + face.height / 2
  const dx = Math.abs(centerX - width / 2) / width
  const dy = Math.abs(centerY - height / 2) / height
  return dx < threshold && dy < threshold
}

export async function runQualityGate(
  source: ImageSource,
  options?: QualityGateOptions,
): Promise<QualityCheckResult> {
  const trustCrop = options?.trustUserCrop ?? false
  const minConfidence = trustCrop
    ? RELAXED_MIN_FACE_CONFIDENCE
    : MIN_FACE_CONFIDENCE
  const minAreaRatio = trustCrop
    ? RELAXED_MIN_FACE_AREA_RATIO
    : MIN_FACE_AREA_RATIO
  const maxAreaRatio = trustCrop
    ? RELAXED_MAX_FACE_AREA_RATIO
    : MAX_FACE_AREA_RATIO
  const centerThreshold = trustCrop ? RELAXED_CENTER_THRESHOLD : 0.18

  const { width, height } = getSourceSize(source)
  const issues: string[] = []

  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    issues.push(
      `Photo is too small (${width}×${height}). Use a larger crop or retake.`,
    )
  }

  let faces: Awaited<ReturnType<typeof detectFaces>> = []
  try {
    faces = await detectFaces(source)
  } catch {
    if (!trustCrop) {
      issues.push("Face detection is unavailable. Try again or upload a photo.")
    }
  }

  const confidentFaces = faces.filter(
    (face) => face.confidence >= minConfidence,
  )
  const faceDetected = trustCrop
    ? confidentFaces.length >= 1
    : confidentFaces.length === 1
  const primaryFace = confidentFaces[0]

  // A crop can legitimately be a close-up skin patch with no face in frame, so
  // fall back to skin coverage before rejecting it. The live camera preview
  // stays face-only.
  const skinCoverage = trustCrop ? sampleSkinCoverage(source) : 0
  const cropSubject: CropSubject =
    confidentFaces.length >= 1
      ? "face"
      : skinCoverage >= MIN_SKIN_COVERAGE
        ? "skin"
        : "none"

  if (confidentFaces.length === 0 && !trustCrop) {
    issues.push("No face detected. Center your face in the guide.")
  } else if (cropSubject === "none" && trustCrop) {
    issues.push(
      "This crop does not look like a face or a close-up of skin. Adjust the crop or retake.",
    )
  } else if (confidentFaces.length > 1) {
    issues.push("Multiple faces detected. Only one person should be in frame.")
  }

  let faceCentered = trustCrop
  if (primaryFace && width > 0 && height > 0 && !trustCrop) {
    const areaRatio =
      (primaryFace.width * primaryFace.height) / (width * height)
    faceCentered = isFaceCentered(primaryFace, width, height, centerThreshold)

    if (areaRatio < minAreaRatio) {
      issues.push("Move closer so your face fills more of the frame.")
    }
    if (areaRatio > maxAreaRatio) {
      issues.push("Move back slightly so your full face is visible.")
    }
    if (!faceCentered) {
      issues.push("Center your face within the oval guide.")
    }
  }

  const { score: lightingScore, band: lightingBand } = sampleLighting(
    source,
    primaryFace,
  )

  if (lightingBand === "too_dark") {
    issues.push("Lighting is too dim. Face a window or brighter light.")
  }
  if (lightingBand === "too_bright") {
    issues.push("Lighting is too harsh. Avoid direct glare on your face.")
  }

  const resolutionOk = width >= MIN_WIDTH && height >= MIN_HEIGHT
  const lightingOk = lightingBand === "ok"
  const singleOrNoFace = confidentFaces.length <= 1
  const strictFaceOk =
    confidentFaces.length === 1 &&
    faceCentered &&
    lightingOk &&
    resolutionOk &&
    (primaryFace?.confidence ?? 0) >= MIN_FACE_CONFIDENCE

  // Measured from the pixels rather than inferred from the face check, so a
  // valid close-up does not get flagged just because no face was found.
  const skinDetail = trustCrop ? sampleSkinDetail(source) : 0
  const isPlausibleSkin = trustCrop
    ? skinCoverage >= MIN_PLAUSIBLE_SKIN_COVERAGE &&
      skinDetail >= MIN_SKIN_DETAIL
    : strictFaceOk

  if (trustCrop && !isPlausibleSkin) {
    issues.push(
      skinDetail < MIN_SKIN_DETAIL
        ? "Photo looks soft or out of focus. A sharper close-up gives a more reliable read."
        : "Not much skin fills this crop. Tighten the crop onto the area you want analyzed.",
    )
  }

  const passed =
    lightingOk &&
    resolutionOk &&
    singleOrNoFace &&
    (strictFaceOk || (trustCrop && cropSubject !== "none"))

  return {
    faceDetected,
    faceCount: confidentFaces.length,
    faceCentered,
    lightingScore,
    lightingBand,
    skinCoverage,
    skinDetail,
    cropSubject,
    isPlausibleSkin,
    issues,
    passed,
  }
}
