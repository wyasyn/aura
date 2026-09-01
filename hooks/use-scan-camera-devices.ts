"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import {
  getStreamDeviceId,
  openCameraStream,
  openCameraStreamWithDevice,
  shouldMirrorStream,
} from "@/lib/scan/camera-constraints"
import { getCameraAccessError, getCameraPermissionError } from "@/lib/scan/camera-access"
import {
  enumerateVideoDevices,
  getDeviceLabel,
  resolvePreferredDeviceId,
  type VideoDeviceOption,
} from "@/lib/scan/camera-devices"
import { resetVideoFaceDetector } from "@/lib/scan/mediapipe"

const STORAGE_KEY = "aura:scan-camera-device-id"

function readSavedDeviceId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function persistDeviceId(deviceId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, deviceId)
  } catch {
    // ignore quota errors
  }
}

function clearSavedDeviceId() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore quota errors
  }
}

function isStreamLive(stream: MediaStream | null) {
  return stream?.getVideoTracks().some((track) => track.readyState === "live") ?? false
}

function syncActiveDeviceFromStream(
  stream: MediaStream,
  devices: VideoDeviceOption[],
) {
  const deviceId = getStreamDeviceId(stream) ?? null
  return {
    deviceId,
    label: getDeviceLabel(devices, deviceId),
    shouldMirror: shouldMirrorStream(stream, getDeviceLabel(devices, deviceId)),
  }
}

type UseScanCameraDevicesOptions = {
  enabled?: boolean
  onStreamReady?: (stream: MediaStream) => void
}

export function useScanCameraDevices({
  enabled = true,
  onStreamReady,
}: UseScanCameraDevicesOptions = {}) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const devicesRef = useRef<VideoDeviceOption[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const bindingRef = useRef(false)
  const switchingRef = useRef(false)
  const onStreamReadyRef = useRef(onStreamReady)
  const activeDeviceIdRef = useRef<string | null>(null)
  const [devices, setDevices] = useState<VideoDeviceOption[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shouldMirror, setShouldMirror] = useState(true)

  useEffect(() => {
    onStreamReadyRef.current = onStreamReady
  }, [onStreamReady])

  useEffect(() => {
    devicesRef.current = devices
  }, [devices])

  useEffect(() => {
    activeDeviceIdRef.current = activeDeviceId
  }, [activeDeviceId])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null
    }
    setReady(false)
  }, [])

  const refreshDevices = useCallback(async () => {
    const list = await enumerateVideoDevices()
    setDevices(list)
    devicesRef.current = list
    return list
  }, [])

  const bindStreamToVideo = useCallback(async (stream: MediaStream) => {
    if (bindingRef.current) return false
    const video = videoElementRef.current
    if (!video) return false

    bindingRef.current = true
    try {
      video.srcObject = stream
      await video.play()

      const { deviceId, shouldMirror: mirror } = syncActiveDeviceFromStream(
        stream,
        devicesRef.current,
      )
      setShouldMirror(mirror)
      setActiveDeviceId(deviceId)
      activeDeviceIdRef.current = deviceId
      if (deviceId) {
        persistDeviceId(deviceId)
      }
      streamRef.current = stream
      setReady(true)
      onStreamReadyRef.current?.(stream)
      return true
    } catch {
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = null
      }
      setReady(false)
      return false
    } finally {
      bindingRef.current = false
    }
  }, [])

  const openStreamForDevice = useCallback(async (deviceId: string | null) => {
    if (deviceId) {
      return openCameraStreamWithDevice(deviceId)
    }
    return openCameraStream("user")
  }, [])

  const openAndBind = useCallback(
    async (deviceId: string | null) => {
      const stream = await openStreamForDevice(deviceId)
      const bound = await bindStreamToVideo(stream)
      if (!bound) {
        stream.getTracks().forEach((track) => track.stop())
        return null
      }
      return stream
    },
    [bindStreamToVideo, openStreamForDevice],
  )

  const startingRef = useRef(false)
  const startStreamRef = useRef<
    (preferredDeviceId?: string | null) => Promise<MediaStream | null>
  >(async () => null)

  const startStream = useCallback(
    async (preferredDeviceId?: string | null) => {
      if (startingRef.current || switchingRef.current) return streamRef.current
      startingRef.current = true

      try {
        if (switchingRef.current) return streamRef.current

        setError(null)
        stopStream()
        resetVideoFaceDetector()

        const accessError = getCameraAccessError()
        if (accessError) {
          setError(accessError)
          return null
        }

        if (!videoElementRef.current) {
          setError("Camera preview is not ready. Try again.")
          return null
        }

        const savedId = preferredDeviceId ?? readSavedDeviceId()

        try {
          let stream = await openAndBind(savedId)
          if (!stream && savedId) {
            clearSavedDeviceId()
            stream = await openAndBind(null)
          }
          if (!stream) {
            setError("Could not start camera preview. Try again.")
            return null
          }
          await refreshDevices()
          return stream
        } catch (err) {
          if (savedId) {
            clearSavedDeviceId()
            try {
              const stream = await openAndBind(null)
              if (stream) {
                await refreshDevices()
                return stream
              }
            } catch {
              // fall through
            }
          }
          setError(getCameraPermissionError(err))
          return null
        }
      } finally {
        startingRef.current = false
      }
    },
    [openAndBind, refreshDevices, stopStream],
  )

  startStreamRef.current = startStream

  const selectDevice = useCallback(
    async (deviceId: string) => {
      if (!enabled || deviceId === activeDeviceIdRef.current || switchingRef.current) {
        return streamRef.current
      }

      switchingRef.current = true
      setSwitching(true)
      setError(null)
      setReady(false)
      resetVideoFaceDetector()

      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = null
      }

      try {
        const stream = await openAndBind(deviceId)
        if (!stream) {
          setError("Could not switch camera. Try again.")
          await startStream(activeDeviceIdRef.current)
          return null
        }
        await refreshDevices()
        return stream
      } catch (err) {
        setError(getCameraPermissionError(err))
        await startStream(activeDeviceIdRef.current)
        return null
      } finally {
        switchingRef.current = false
        setSwitching(false)
      }
    },
    [enabled, openAndBind, refreshDevices, startStream],
  )

  const flipCamera = useCallback(async () => {
    const list = devices.length > 0 ? devices : await refreshDevices()
    if (list.length < 2) return null

    const currentIndex = list.findIndex(
      (device) => device.deviceId === activeDeviceIdRef.current,
    )
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % list.length : 0
    return selectDevice(list[nextIndex]!.deviceId)
  }, [devices, refreshDevices, selectDevice])

  const setVideoElement = useCallback(
    (node: HTMLVideoElement | null) => {
      videoElementRef.current = node
      if (!node || !enabled || switchingRef.current) return

      const stream = streamRef.current
      if (stream && isStreamLive(stream) && node.srcObject === stream) {
        return
      }

      void startStreamRef.current()
    },
    [enabled],
  )

  const canFlipCamera = devices.length >= 2

  useLayoutEffect(() => {
    if (!enabled) {
      stopStream()
    }

    return () => {
      stopStream()
      resetVideoFaceDetector()
    }
  }, [enabled, stopStream])

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.addEventListener) return

    const handleDeviceChange = () => {
      void (async () => {
        if (switchingRef.current) return

        const list = await refreshDevices()
        const stream = streamRef.current

        if (stream && isStreamLive(stream)) {
          const { deviceId, shouldMirror: mirror } = syncActiveDeviceFromStream(
            stream,
            list,
          )
          if (deviceId) {
            setActiveDeviceId(deviceId)
            activeDeviceIdRef.current = deviceId
            setShouldMirror(mirror)
          }
          return
        }

        const preferred = resolvePreferredDeviceId(
          list,
          activeDeviceIdRef.current ?? readSavedDeviceId(),
        )
        if (!preferred) {
          setError("No camera found on this device.")
          stopStream()
          return
        }

        await selectDevice(preferred)
      })()
    }

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [enabled, refreshDevices, selectDevice, stopStream])

  const activeLabel = getDeviceLabel(devices, activeDeviceId)

  return {
    devices,
    activeDeviceId,
    activeLabel,
    ready,
    switching,
    error,
    shouldMirror,
    streamRef,
    setVideoElement,
    selectDevice,
    flipCamera,
    canFlipCamera,
    refreshDevices,
    stopStream,
    startStream,
  }
}
