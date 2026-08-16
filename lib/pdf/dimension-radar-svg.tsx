import { Line, Polygon, Svg, Text, View } from "@react-pdf/renderer"

import {
  buildDimensionChartGeometry,
  getAxisLabelDominantBaseline,
  getAxisLabelPosition,
  getAxisLabelTextAnchor,
} from "@/lib/scan/dimension-chart-geometry"
import type { SkinDimension } from "@/lib/scan/types"

import { reportColors } from "./report-styles"

type DimensionRadarSvgProps = {
  dimensions: SkinDimension[]
}

/**
 * The chart is drawn small but the SVG spans the full text column, because axis
 * labels are laid out in the SVG's own coordinate space and anything past its
 * edge is clipped, not wrapped. Sizing the box to the plot alone truncated the
 * longer labels ("Pigmentation & sun spots" lost its last word).
 */
const CHART_SIZE = 200
const SVG_WIDTH = 515
export const RADAR_SVG_HEIGHT = 210
/** Gap between the outer ring and the label baseline. */
const LABEL_GAP = 16

export function DimensionRadarSvg({ dimensions }: DimensionRadarSvgProps) {
  if (dimensions.length === 0) return null

  const geometry = buildDimensionChartGeometry(dimensions, CHART_SIZE, 0.38)
  const { outerRadius, points, gridRings } = geometry
  const centerX = SVG_WIDTH / 2
  const centerY = RADAR_SVG_HEIGHT / 2
  const offsetX = centerX - geometry.center
  const offsetY = centerY - geometry.center
  const count = points.length

  const offsetPolygon = points
    .map((point) => `${point.x + offsetX},${point.y + offsetY}`)
    .join(" ")

  return (
    <View wrap={false} style={{ marginVertical: 4 }}>
      <Svg
        width={SVG_WIDTH}
        height={RADAR_SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${RADAR_SVG_HEIGHT}`}
      >
        {gridRings.map((ringRadius) => {
          const ringPoints = Array.from({ length: count }, (_, index) => {
            const angle = (Math.PI * 2 * index) / count - Math.PI / 2
            const x = centerX + ringRadius * Math.cos(angle)
            const y = centerY + ringRadius * Math.sin(angle)
            return `${x},${y}`
          }).join(" ")

          return (
            <Polygon
              key={ringRadius}
              points={ringPoints}
              fill="none"
              stroke={reportColors.border}
              strokeWidth={0.5}
            />
          )
        })}

        {points.map((point) => (
          <Line
            key={point.label}
            x1={centerX}
            y1={centerY}
            x2={centerX + outerRadius * Math.cos(point.angle)}
            y2={centerY + outerRadius * Math.sin(point.angle)}
            stroke={reportColors.border}
            strokeWidth={0.5}
          />
        ))}

        <Polygon
          points={offsetPolygon}
          fill={reportColors.chartFill}
          stroke={reportColors.chart}
          strokeWidth={1.5}
        />

        {points.map((point) => {
          const { x, y } = getAxisLabelPosition(
            point.angle,
            0,
            outerRadius,
            LABEL_GAP,
          )

          return (
            <Text
              key={`axis-${point.label}`}
              x={centerX + x}
              y={centerY + y}
              textAnchor={getAxisLabelTextAnchor(point.angle)}
              dominantBaseline={getAxisLabelDominantBaseline(point.angle)}
              fill={reportColors.muted}
              style={{ fontSize: 8, fontFamily: "Inter" }}
            >
              {point.label}
            </Text>
          )
        })}
      </Svg>
    </View>
  )
}
