import { bandToScore } from "@/lib/scan/band-score"
import type { AssessmentBand, SkinDimension } from "@/lib/scan/types"

export const MAX_BAND_SCORE = 4

export type DimensionChartPoint = {
  label: string
  band: AssessmentBand
  score: number
  angle: number
  x: number
  y: number
}

export type DimensionChartGeometry = {
  center: number
  outerRadius: number
  points: DimensionChartPoint[]
  polygonPoints: string
  gridRings: number[]
}

export function buildDimensionChartGeometry(
  dimensions: SkinDimension[],
  size: number,
  outerRadiusRatio = 0.38,
): DimensionChartGeometry {
  const center = size / 2
  const outerRadius = size * outerRadiusRatio
  const count = dimensions.length

  const points: DimensionChartPoint[] = dimensions.map((dimension, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    const score = bandToScore(dimension.band)
    const radius = (score / MAX_BAND_SCORE) * outerRadius
    const x = center + radius * Math.cos(angle)
    const y = center + radius * Math.sin(angle)

    return {
      label: dimension.label,
      band: dimension.band,
      score,
      angle,
      x,
      y,
    }
  })

  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ")

  const gridRings = [0.25, 0.5, 0.75, 1].map((ratio) => outerRadius * ratio)

  return {
    center,
    outerRadius,
    points,
    polygonPoints,
    gridRings,
  }
}

export function getAxisLabelPosition(
  angle: number,
  center: number,
  radius: number,
  padding = 12,
) {
  const labelRadius = radius + padding
  return {
    x: center + labelRadius * Math.cos(angle),
    y: center + labelRadius * Math.sin(angle),
  }
}

export function getAxisLabelTextAnchor(
  angle: number,
): "start" | "middle" | "end" {
  const cos = Math.cos(angle)
  if (cos > 0.2) return "start"
  if (cos < -0.2) return "end"
  return "middle"
}

export function getAxisLabelDominantBaseline(
  angle: number,
): "middle" | "hanging" | "auto" {
  const sin = Math.sin(angle)
  if (sin < -0.25) return "auto"
  if (sin > 0.25) return "hanging"
  return "middle"
}
