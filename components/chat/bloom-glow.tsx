"use client"

import { DotmSquare17 } from "@/components/ui/dotm-square-17"

type BloomGlowProps = {
  size?: number
  dotSize?: number
}

export function BloomGlow({ size = 32, dotSize = 4 }: BloomGlowProps) {
  return (
    <DotmSquare17
      size={size}
      dotSize={dotSize}
      speed={1.2}
      bloom
    />
  )
}
