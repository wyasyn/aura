"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { PixelCrop } from "@/lib/scan/crop-image"
import {
  defaultCropRect,
  type NormalizedRect,
} from "@/lib/scan/face-crop"
import { cn } from "@/lib/utils"

type ImageBounds = {
  x: number
  y: number
  width: number
  height: number
}

type DragMode =
  | "move"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"

type RectCropCanvasProps = {
  imageSrc: string
  onCropChange: (crop: PixelCrop) => void
  initialCropRect?: NormalizedRect | null
  className?: string
}

const MIN_RECT_RATIO = 0.12

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getImageBounds(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): ImageBounds {
  const scale = Math.min(
    containerWidth / naturalWidth,
    containerHeight / naturalHeight,
  )
  const width = naturalWidth * scale
  const height = naturalHeight * scale
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  }
}

export function RectCropCanvas({
  imageSrc,
  onCropChange,
  initialCropRect,
  className,
}: RectCropCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [cropRect, setCropRect] = useState<NormalizedRect>(defaultCropRect)
  const dragRef = useRef<{
    mode: DragMode
    startX: number
    startY: number
    startRect: NormalizedRect
  } | null>(null)

  const imageBounds =
    containerSize.width > 0 &&
    containerSize.height > 0 &&
    naturalSize.width > 0 &&
    naturalSize.height > 0
      ? getImageBounds(
          containerSize.width,
          containerSize.height,
          naturalSize.width,
          naturalSize.height,
        )
      : null

  const emitCrop = useCallback(
    (rect: NormalizedRect) => {
      if (!naturalSize.width || !naturalSize.height) return
      onCropChange({
        x: Math.round(rect.x * naturalSize.width),
        y: Math.round(rect.y * naturalSize.height),
        width: Math.round(rect.w * naturalSize.width),
        height: Math.round(rect.h * naturalSize.height),
      })
    },
    [naturalSize.height, naturalSize.width, onCropChange],
  )

  useEffect(() => {
    emitCrop(cropRect)
  }, [cropRect, emitCrop])

  useEffect(() => {
    if (initialCropRect) {
      setCropRect(initialCropRect)
    }
  }, [initialCropRect])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const update = () => {
      const rect = node.getBoundingClientRect()
      setContainerSize({
        width: rect.width,
        height: rect.height,
      })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const startDrag = (
    mode: DragMode,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    containerRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startRect: cropRect,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || !imageBounds) return

    const dx = (event.clientX - drag.startX) / imageBounds.width
    const dy = (event.clientY - drag.startY) / imageBounds.height
    const { startRect } = drag

    let next = { ...startRect }

    if (drag.mode === "move") {
      next.x = clamp(startRect.x + dx, 0, 1 - startRect.w)
      next.y = clamp(startRect.y + dy, 0, 1 - startRect.h)
    }

    if (drag.mode === "resize-se") {
      next.w = clamp(startRect.w + dx, MIN_RECT_RATIO, 1 - startRect.x)
      next.h = clamp(startRect.h + dy, MIN_RECT_RATIO, 1 - startRect.y)
    }

    if (drag.mode === "resize-sw") {
      const newW = clamp(
        startRect.w - dx,
        MIN_RECT_RATIO,
        startRect.x + startRect.w,
      )
      const newX = startRect.x + startRect.w - newW
      next.x = clamp(newX, 0, 1 - MIN_RECT_RATIO)
      next.w = clamp(
        startRect.x + startRect.w - next.x,
        MIN_RECT_RATIO,
        1 - next.x,
      )
      next.h = clamp(startRect.h + dy, MIN_RECT_RATIO, 1 - startRect.y)
    }

    if (drag.mode === "resize-ne") {
      next.w = clamp(startRect.w + dx, MIN_RECT_RATIO, 1 - startRect.x)
      const newH = clamp(
        startRect.h - dy,
        MIN_RECT_RATIO,
        startRect.y + startRect.h,
      )
      const newY = startRect.y + startRect.h - newH
      next.y = clamp(newY, 0, 1 - MIN_RECT_RATIO)
      next.h = clamp(
        startRect.y + startRect.h - next.y,
        MIN_RECT_RATIO,
        1 - next.y,
      )
    }

    if (drag.mode === "resize-nw") {
      const newW = clamp(
        startRect.w - dx,
        MIN_RECT_RATIO,
        startRect.x + startRect.w,
      )
      const newX = startRect.x + startRect.w - newW
      next.x = clamp(newX, 0, 1 - MIN_RECT_RATIO)
      next.w = clamp(
        startRect.x + startRect.w - next.x,
        MIN_RECT_RATIO,
        1 - next.x,
      )

      const newH = clamp(
        startRect.h - dy,
        MIN_RECT_RATIO,
        startRect.y + startRect.h,
      )
      const newY = startRect.y + startRect.h - newH
      next.y = clamp(newY, 0, 1 - MIN_RECT_RATIO)
      next.h = clamp(
        startRect.y + startRect.h - next.y,
        MIN_RECT_RATIO,
        1 - next.y,
      )
    }

    setCropRect(next)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  const overlayStyle =
    imageBounds && containerSize.width > 0
      ? {
          left: imageBounds.x + cropRect.x * imageBounds.width,
          top: imageBounds.y + cropRect.y * imageBounds.height,
          width: cropRect.w * imageBounds.width,
          height: cropRect.h * imageBounds.height,
        }
      : null

  const handles: Array<{ mode: DragMode; className: string }> = [
    {
      mode: "resize-nw",
      className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    },
    {
      mode: "resize-ne",
      className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    },
    {
      mode: "resize-sw",
      className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    },
    {
      mode: "resize-se",
      className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    },
  ]

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[3/4] w-full max-h-[min(48svh,22rem)] overflow-hidden rounded-[1.5rem] bg-muted",
        className,
      )}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt="Crop source"
        draggable={false}
        className="pointer-events-none size-full object-contain"
        onLoad={(event) => {
          const image = event.currentTarget
          setNaturalSize({
            width: image.naturalWidth,
            height: image.naturalHeight,
          })
          setCropRect(initialCropRect ?? defaultCropRect())
        }}
      />

      {overlayStyle ? (
        <div
          className="absolute touch-none border-2 border-primary"
          style={{
            ...overlayStyle,
            boxShadow:
              "0 0 0 9999px color-mix(in oklab, var(--background) 35%, transparent)",
          }}
          onPointerDown={(event) => startDrag("move", event)}
        >
          {handles.map((handle) => (
            <button
              key={handle.mode}
              type="button"
              aria-label="Resize crop area"
              className={cn(
                "absolute size-3.5 rounded-full border-2 border-primary bg-background shadow-sm",
                handle.className,
              )}
              onPointerDown={(event) => startDrag(handle.mode, event)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
