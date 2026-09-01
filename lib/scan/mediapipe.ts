"use client"

import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision"

import { installMediapipeLogFilter } from "@/lib/scan/mediapipe-log-filter"
import type { FaceDetection } from "@/lib/scan/types"

type ImageSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | ImageBitmap

const MEDIAPIPE_WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"

const FACE_MODEL = {
  shortRange:
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
  fullRange:
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite",
} as const

const MIN_DETECTION_CONFIDENCE = 0.45
const VIDEO_FRAME_MS = 33

let imageDetector: FaceDetector | null = null
let imageDetectorPromise: Promise<FaceDetector> | null = null
let videoDetector: FaceDetector | null = null
let videoDetectorPromise: Promise<FaceDetector> | null = null
let nextVideoTimestampMs = 0

export function resetImageFaceDetector() {
  if (imageDetector) {
    imageDetector.close()
    imageDetector = null
  }
  imageDetectorPromise = null
}

export function resetVideoFaceDetector() {
  if (videoDetector) {
    videoDetector.close()
    videoDetector = null
  }
  videoDetectorPromise = null
  nextVideoTimestampMs = 0
}

function bumpVideoTimestamp() {
  nextVideoTimestampMs += VIDEO_FRAME_MS
  return nextVideoTimestampMs
}

async function getImageFaceDetector(): Promise<FaceDetector> {
  if (!imageDetectorPromise) {
    installMediapipeLogFilter()
    imageDetectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE)

      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_MODEL.fullRange,
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
      })

      imageDetector = detector
      return detector
    })()
  }

  return imageDetectorPromise
}

async function getVideoFaceDetector(): Promise<FaceDetector> {
  if (!videoDetectorPromise) {
    installMediapipeLogFilter()
    videoDetectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE)

      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_MODEL.shortRange,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
      })

      videoDetector = detector
      return detector
    })()
  }

  return videoDetectorPromise
}

function mapDetections(
  detections: ReturnType<FaceDetector["detect"]>["detections"],
): FaceDetection[] {
  return detections.map((detection) => {
    const box = detection.boundingBox
    return {
      x: box?.originX ?? 0,
      y: box?.originY ?? 0,
      width: box?.width ?? 0,
      height: box?.height ?? 0,
      confidence: detection.categories[0]?.score ?? 0,
    }
  })
}

function isVideoReadyForDetection(video: HTMLVideoElement) {
  return (
    !video.paused &&
    !video.ended &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  )
}

async function detectFacesInVideo(
  source: HTMLVideoElement,
): Promise<FaceDetection[]> {
  if (!isVideoReadyForDetection(source)) {
    return []
  }

  const run = async () => {
    const detector = await getVideoFaceDetector()
    if (!isVideoReadyForDetection(source)) {
      return []
    }
    const result = detector.detectForVideo(source, bumpVideoTimestamp())
    return mapDetections(result.detections)
  }

  try {
    return await run()
  } catch {
    resetVideoFaceDetector()
    try {
      return await run()
    } catch {
      return []
    }
  }
}

async function detectFacesInImage(
  source: Exclude<ImageSource, HTMLVideoElement>,
): Promise<FaceDetection[]> {
  const run = async () => {
    const detector = await getImageFaceDetector()
    const result = detector.detect(source)
    return mapDetections(result.detections)
  }

  try {
    return await run()
  } catch {
    resetImageFaceDetector()
    try {
      return await run()
    } catch {
      return []
    }
  }
}

export async function detectFaces(
  source: ImageSource,
): Promise<FaceDetection[]> {
  if (source instanceof HTMLVideoElement) {
    if (source.videoWidth === 0 || source.videoHeight === 0) {
      return []
    }

    return detectFacesInVideo(source)
  }

  return detectFacesInImage(source)
}
