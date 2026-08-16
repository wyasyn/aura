"use client"

import * as React from "react"
import {
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react"

import { EASE_DRAWER, EASE_OUT, SPRING_PANEL } from "@/lib/ease"

export type PanelSide = "top" | "right" | "bottom" | "left" | "center"

type PanelMotionState = TargetAndTransition

type PanelLayerMotion = {
  initial: PanelMotionState
  animate: PanelMotionState
  exit: PanelMotionState
  enterTransition: Transition
}

export function usePanelPresence(open: boolean) {
  const [present, setPresent] = React.useState(open)

  React.useEffect(() => {
    if (open) {
      setPresent(true)
    }
  }, [open])

  const onExitComplete = React.useCallback(() => {
    setPresent(false)
  }, [])

  return {
    present,
    radixOpen: open || present,
    onExitComplete,
  }
}

export function usePanelMotion(side: PanelSide) {
  const reducedMotion = useReducedMotion()

  const overlayEnter: Transition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.25, ease: EASE_OUT }

  const overlayExit: Transition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.22, ease: EASE_OUT, delay: 0.1 }

  const surfaceEnter: Transition = reducedMotion
    ? { duration: 0.15, ease: EASE_OUT }
    : SPRING_PANEL

  const surfaceExit: Transition = reducedMotion
    ? { duration: 0.15, ease: EASE_OUT }
    : { duration: 0.3, ease: EASE_DRAWER, delay: 0.06 }

  const contentEnter: Transition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.22, ease: EASE_OUT, delay: 0.04 }

  const contentExit: Transition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.2, ease: EASE_OUT }

  const surfaceStates = panelSurfaceStates(side, Boolean(reducedMotion))

  const overlay: PanelLayerMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: overlayEnter },
    exit: { opacity: 0, transition: overlayExit },
    enterTransition: overlayEnter,
  }

  const surface: PanelLayerMotion = {
    initial: surfaceStates.initial,
    animate: { ...surfaceStates.animate, transition: surfaceEnter },
    exit: { ...surfaceStates.exit, transition: surfaceExit },
    enterTransition: surfaceEnter,
  }

  const content: PanelLayerMotion = {
    initial: { opacity: 0, filter: "blur(4px)" },
    animate: { opacity: 1, filter: "blur(0px)", transition: contentEnter },
    exit: { opacity: 0, filter: "blur(4px)", transition: contentExit },
    enterTransition: contentEnter,
  }

  return { overlay, surface, content }
}

function panelSurfaceStates(
  side: PanelSide,
  reducedMotion: boolean,
): {
  initial: PanelMotionState
  animate: PanelMotionState
  exit: PanelMotionState
} {
  if (reducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    }
  }

  switch (side) {
    case "top":
      return {
        initial: { opacity: 0, y: "-100%" },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: "-100%" },
      }
    case "bottom":
      return {
        initial: { opacity: 0, y: "100%" },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: "100%" },
      }
    case "left":
      return {
        initial: { opacity: 0, x: "-100%" },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: "-100%" },
      }
    case "right":
      return {
        initial: { opacity: 0, x: "100%" },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: "100%" },
      }
    case "center":
    default:
      return {
        initial: { opacity: 0, scale: 0.96, filter: "blur(4px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0.96, filter: "blur(4px)" },
      }
  }
}
