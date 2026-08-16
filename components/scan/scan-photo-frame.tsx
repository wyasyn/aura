"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ScanPhotoFrameProps = {
  src: string
  alt: string
  children?: ReactNode
  className?: string
}

/**
 * Shared preview frame for the crop-check and analyzing steps so a photo keeps
 * the exact same size and chrome as the user moves between them.
 */
export function ScanPhotoFrame({
  src,
  alt,
  children,
  className,
}: ScanPhotoFrameProps) {
  return (
    <div
      className={cn(
        "scan-viewport relative mx-auto w-fit overflow-hidden rounded-[1.5rem] border border-border/70 bg-muted/30",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="mx-auto aspect-3/4 h-[min(52svh,24rem)] w-auto max-w-full object-cover"
      />
      {children}
    </div>
  )
}
