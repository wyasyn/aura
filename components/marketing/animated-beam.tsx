"use client"

import { useEffect, useId, useState, type RefObject } from "react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

const AMBIENT_PATHS = [
  {
    d: "M 20 60 C 120 20, 220 100, 360 40",
    delay: 0,
    duration: 5.5,
  },
  {
    d: "M 40 320 C 140 260, 240 340, 380 280",
    delay: 1.8,
    duration: 6,
  },
  {
    d: "M 10 180 C 100 120, 200 240, 390 160",
    delay: 3.2,
    duration: 5.2,
  },
] as const

/** Soft background strokes with traveling light — Vite-style ambient energy. */
export function AmbientBeams({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const baseId = useId()

  return (
    <svg
      fill="none"
      viewBox="0 0 400 380"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-0 size-full transform-gpu opacity-70",
        className,
      )}
      aria-hidden
    >
      {AMBIENT_PATHS.map((path, index) => {
        const gradientId = `${baseId}-${index}`
        return (
          <g key={gradientId}>
            <path
              d={path.d}
              stroke="var(--border)"
              strokeWidth={1}
              strokeOpacity={0.55}
              strokeLinecap="round"
            />
            <path
              d={path.d}
              stroke={`url(#${gradientId})`}
              strokeWidth={1.25}
              strokeLinecap="round"
            />
            <defs>
              <motion.linearGradient
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        x1: ["0%", "100%"],
                        x2: ["20%", "120%"],
                        y1: ["0%", "0%"],
                        y2: ["0%", "0%"],
                      }
                }
                transition={{
                  delay: path.delay,
                  duration: path.duration,
                  ease: [0.16, 1, 0.3, 1],
                  repeat: Infinity,
                  repeatDelay: 1.2,
                }}
              >
                <stop stopColor="var(--primary)" stopOpacity="0" />
                <stop stopColor="var(--primary)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </motion.linearGradient>
            </defs>
          </g>
        )
      })}
    </svg>
  )
}

type AnimatedBeamProps = {
  className?: string
  containerRef: RefObject<HTMLElement | null>
  fromRef: RefObject<HTMLElement | null>
  toRef: RefObject<HTMLElement | null>
  curvature?: number
  reverse?: boolean
  delay?: number
  duration?: number
  pathWidth?: number
  startXOffset?: number
  startYOffset?: number
  endXOffset?: number
  endYOffset?: number
}

/**
 * Light that travels along a curved SVG path between two elements.
 * Inspired by Vite / Magic UI beam patterns; colors come from theme tokens.
 */
export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 4.5,
  delay = 0,
  pathWidth = 1.5,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: AnimatedBeamProps) {
  const id = useId()
  const reduceMotion = useReducedMotion()
  const [pathD, setPathD] = useState("")
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 })

  const gradientCoordinates = reverse
    ? {
        x1: ["90%", "-10%"],
        x2: ["100%", "0%"],
        y1: ["0%", "0%"],
        y2: ["0%", "0%"],
      }
    : {
        x1: ["10%", "110%"],
        x2: ["0%", "100%"],
        y1: ["0%", "0%"],
        y2: ["0%", "0%"],
      }

  useEffect(() => {
    const updatePath = () => {
      if (!containerRef.current || !fromRef.current || !toRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const rectA = fromRef.current.getBoundingClientRect()
      const rectB = toRef.current.getBoundingClientRect()

      setSvgDimensions({
        width: containerRect.width,
        height: containerRect.height,
      })

      const startX =
        rectA.left - containerRect.left + rectA.width / 2 + startXOffset
      const startY =
        rectA.top - containerRect.top + rectA.height / 2 + startYOffset
      const endX =
        rectB.left - containerRect.left + rectB.width / 2 + endXOffset
      const endY =
        rectB.top - containerRect.top + rectB.height / 2 + endYOffset

      const controlY = startY - curvature
      setPathD(
        `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`,
      )
    }

    const resizeObserver = new ResizeObserver(updatePath)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    updatePath()

    return () => resizeObserver.disconnect()
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
  ])

  if (!pathD || svgDimensions.width === 0) return null

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "pointer-events-none absolute inset-0 transform-gpu",
        className,
      )}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
      aria-hidden
    >
      <path
        d={pathD}
        stroke="var(--border)"
        strokeWidth={pathWidth}
        strokeOpacity={0.7}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        stroke={`url(#${id})`}
        strokeWidth={pathWidth + 0.5}
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          className="transform-gpu"
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{
            x1: "0%",
            x2: "0%",
            y1: "0%",
            y2: "0%",
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  x1: gradientCoordinates.x1,
                  x2: gradientCoordinates.x2,
                  y1: gradientCoordinates.y1,
                  y2: gradientCoordinates.y2,
                }
          }
          transition={{
            delay,
            duration,
            ease: [0.16, 1, 0.3, 1],
            repeat: Infinity,
            repeatDelay: 0.8,
          }}
        >
          <stop stopColor="var(--primary)" stopOpacity="0" />
          <stop stopColor="var(--primary)" />
          <stop offset="32.5%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}
