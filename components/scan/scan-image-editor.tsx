"use client"

import { useCallback, useEffect, useState } from "react"
import { IconRefresh, IconTrash } from "@tabler/icons-react"

import { AnimatedBadge } from "@/components/motion/animated-badge"
import { RectCropCanvas } from "@/components/scan/rect-crop-canvas"
import { ScanStepFrame } from "@/components/scan/scan-step-frame"
import { ScanStepShell } from "@/components/scan/scan-step-shell"
import { Button } from "@/components/ui/button"
import { getCroppedImageBlob, type PixelCrop } from "@/lib/scan/crop-image"
import { pickBestFaceCrop, type NormalizedRect } from "@/lib/scan/face-crop"
import { detectFaces } from "@/lib/scan/mediapipe"

type ScanImageEditorProps = {
  imageSrc: string
  onConfirm: (blob: Blob, previewUrl: string) => void
  onRetake: () => void
  onDelete: () => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

export function ScanImageEditor({
  imageSrc,
  onConfirm,
  onRetake,
  onDelete,
}: ScanImageEditorProps) {
  const [croppedArea, setCroppedArea] = useState<PixelCrop | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detectingFace, setDetectingFace] = useState(true)
  const [initialCropRect, setInitialCropRect] = useState<NormalizedRect | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false

    async function detectFaceCrop() {
      setDetectingFace(true)
      try {
        const image = await loadImage(imageSrc)
        if (cancelled) return
        const faces = await detectFaces(image)
        if (cancelled) return
        const rect = pickBestFaceCrop(
          faces,
          image.naturalWidth,
          image.naturalHeight,
        )
        setInitialCropRect(rect)
      } catch {
        if (!cancelled) setInitialCropRect(null)
      } finally {
        if (!cancelled) setDetectingFace(false)
      }
    }

    void detectFaceCrop()
    return () => {
      cancelled = true
    }
  }, [imageSrc])

  const onCropChange = useCallback((crop: PixelCrop) => {
    setCroppedArea(crop)
  }, [])

  const handleConfirm = async () => {
    if (!croppedArea) return
    setSubmitting(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedArea, 0, "image/png")
      const previewUrl = URL.createObjectURL(blob)
      onConfirm(blob, previewUrl)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScanStepFrame>
      <ScanStepShell
        step="edit"
        title="Adjust your photo"
        description="Drag the box to move it, pull the corners to resize. Only the highlighted rectangle is analyzed."
      >
        <div className="relative">
          <RectCropCanvas
            imageSrc={imageSrc}
            onCropChange={onCropChange}
            initialCropRect={initialCropRect}
          />
          {detectingFace ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[1.5rem] bg-background/50 backdrop-blur-[1px]">
              <AnimatedBadge status="loading" size="sm">
                Positioning crop on your face…
              </AnimatedBadge>
            </div>
          ) : null}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          The dimmed area is not included in your scan.
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetake}
            className="rounded-full"
          >
            <IconRefresh className="size-3.5" />
            Retake
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="rounded-full"
          >
            <IconTrash className="size-3.5" />
            Delete
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting || detectingFace || !croppedArea}
            onClick={() => void handleConfirm()}
            className="ml-auto rounded-full px-5"
          >
            {submitting ? "Preparing…" : "Continue"}
          </Button>
        </div>
      </ScanStepShell>
    </ScanStepFrame>
  )
}
