export type PixelCrop = {
  x: number
  y: number
  width: number
  height: number
}

const MIN_OUTPUT_DIMENSION = 1024

function upscaleCanvasIfNeeded(
  source: HTMLCanvasElement,
  minDimension: number,
): HTMLCanvasElement {
  const { width, height } = source
  const shortEdge = Math.min(width, height)
  if (shortEdge >= minDimension) {
    return source
  }

  const scale = minDimension / shortEdge
  const outWidth = Math.round(width * scale)
  const outHeight = Math.round(height * scale)
  const scaled = document.createElement("canvas")
  scaled.width = outWidth
  scaled.height = outHeight
  const scaledCtx = scaled.getContext("2d")
  if (!scaledCtx) {
    return source
  }

  scaledCtx.imageSmoothingEnabled = true
  scaledCtx.imageSmoothingQuality = "high"
  scaledCtx.drawImage(source, 0, 0, width, height, 0, 0, outWidth, outHeight)
  return scaled
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (error) => reject(error))
    image.setAttribute("crossOrigin", "anonymous")
    image.src = url
  })
}

function getRadianAngle(degree: number) {
  return (degree * Math.PI) / 180
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  mimeType = "image/jpeg",
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas is not available")
  }

  const rotRad = getRadianAngle(rotation)
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  )

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
  )

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.putImageData(data, 0, 0)

  const outputCanvas = upscaleCanvasIfNeeded(canvas, MIN_OUTPUT_DIMENSION)

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"))
          return
        }
        resolve(blob)
      },
      mimeType,
      0.92,
    )
  })
}
