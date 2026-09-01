"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const MAX_RECORDING_MS = 60_000
const BAR_COUNT = 48
const SILENCE_DURATION_MS = 1_500
const SPEECH_THRESHOLD = 0.045
const NO_SPEECH_TIMEOUT_MS = 8_000
const LEVELS_UPDATE_MS = 50

type UseVoiceDictationOptions = {
  lang?: string
  onTranscript: (text: string) => void | Promise<void>
  onError?: (message: string) => void
}

function getSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]

  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

function isVoiceCaptureSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean(getSupportedAudioMimeType())
  )
}

function mergeTranscript(baseText: string, transcript: string): string {
  const trimmedTranscript = transcript.trim()
  if (!trimmedTranscript) {
    return baseText.trimEnd()
  }

  const prefix = baseText.trimEnd()
  return prefix ? `${prefix} ${trimmedTranscript}` : trimmedTranscript
}

function microphoneErrorMessage(err: unknown): string {
  if (!(err instanceof DOMException)) {
    return "Could not access your microphone."
  }

  switch (err.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Microphone access was denied. Allow microphone use in your browser settings."
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone found."
    case "NotReadableError":
    case "TrackStartError":
      return "Your microphone is in use by another app."
    default:
      return "Could not access your microphone."
  }
}

function computeLevel(timeDomain: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < timeDomain.length; i += 1) {
    const centered = (timeDomain[i] - 128) / 128
    sum += centered * centered
  }
  return Math.sqrt(sum / timeDomain.length)
}

export function useVoiceDictation({
  lang = "en-US",
  onTranscript,
  onError,
}: UseVoiceDictationOptions) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [supported, setSupported] = useState(false)
  const [levels, setLevels] = useState<number[]>(() =>
    new Array(BAR_COUNT).fill(0),
  )
  const [elapsedMs, setElapsedMs] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef("audio/webm")
  const baseTextRef = useRef("")
  const shouldTranscribeRef = useRef(true)
  const levelHistoryRef = useRef<number[]>(new Array(BAR_COUNT).fill(0))
  const animationFrameRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const lastLevelsUpdateRef = useRef(0)
  const speechDetectedRef = useRef(false)
  const silenceStartedAtRef = useRef<number | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  const timeDomainRef = useRef<Uint8Array | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const onErrorRef = useRef(onError)

  onTranscriptRef.current = onTranscript
  onErrorRef.current = onError

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }, [])

  const stopAnalysisLoop = useCallback(() => {
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const releaseAudioGraph = useCallback(async () => {
    stopAnalysisLoop()
    analyserRef.current = null

    const audioContext = audioContextRef.current
    audioContextRef.current = null
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close().catch(() => undefined)
    }
  }, [stopAnalysisLoop])

  const releaseMediaStream = useCallback(() => {
    for (const track of mediaStreamRef.current?.getTracks() ?? []) {
      track.stop()
    }
    mediaStreamRef.current = null
  }, [])

  const resetVisualizer = useCallback(() => {
    levelHistoryRef.current = new Array(BAR_COUNT).fill(0)
    setLevels(new Array(BAR_COUNT).fill(0))
    setElapsedMs(0)
    speechDetectedRef.current = false
    silenceStartedAtRef.current = null
    startedAtRef.current = 0
    lastLevelsUpdateRef.current = 0
  }, [])

  const transcribeRecording = useCallback(
    async (blob: Blob, baseText: string) => {
      if (blob.size === 0) {
        onErrorRef.current?.("No speech detected. Try again.")
        return
      }

      setProcessing(true)
      try {
        const formData = new FormData()
        formData.append("audio", blob, "voice-input.webm")
        formData.append("lang", lang)

        const response = await fetch("/api/chat/transcribe", {
          method: "POST",
          body: formData,
        })

        const data = (await response.json()) as {
          ok: boolean
          text?: string
          error?: string
        }

        if (!response.ok || !data.ok) {
          onErrorRef.current?.(
            data.error ??
              "Couldn't transcribe your voice. Check your connection and try again.",
          )
          return
        }

        if (!data.text?.trim()) {
          onErrorRef.current?.("No speech detected. Try again.")
          return
        }

        const next = mergeTranscript(baseText, data.text ?? "")
        setProcessing(false)

        try {
          await Promise.resolve(onTranscriptRef.current(next))
        } catch {
          onErrorRef.current?.(
            "Could not send your voice message. Please try again.",
          )
        }
      } catch {
        onErrorRef.current?.(
          "Couldn't reach Aurora to transcribe your voice. Check your connection and try again.",
        )
      } finally {
        setProcessing(false)
        resetVisualizer()
      }
    },
    [lang, resetVisualizer],
  )

  const finishRecording = useCallback(
    (shouldTranscribe: boolean) => {
      shouldTranscribeRef.current = shouldTranscribe
      clearStopTimer()
      stopAnalysisLoop()

      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === "inactive") {
        setListening(false)
        if (!shouldTranscribe) {
          resetVisualizer()
          releaseMediaStream()
          void releaseAudioGraph()
        }
        return
      }

      recorder.stop()
      setListening(false)
    },
    [
      clearStopTimer,
      releaseAudioGraph,
      releaseMediaStream,
      resetVisualizer,
      stopAnalysisLoop,
    ],
  )

  const confirmListening = useCallback(() => {
    if (!listening || processing) {
      return
    }
    finishRecording(true)
  }, [finishRecording, listening, processing])

  const cancelListening = useCallback(() => {
    if (!listening || processing) {
      return
    }
    finishRecording(false)
  }, [finishRecording, listening, processing])

  const startAnalysisLoop = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) {
      return
    }

    if (!timeDomainRef.current) {
      timeDomainRef.current = new Uint8Array(analyser.fftSize)
    }

    const tick = (timestamp: number) => {
      const timeDomain = timeDomainRef.current
      const activeAnalyser = analyserRef.current
      if (!timeDomain || !activeAnalyser || !mediaRecorderRef.current) {
        return
      }

      activeAnalyser.getByteTimeDomainData(
        timeDomain as Uint8Array<ArrayBuffer>,
      )
      const level = computeLevel(timeDomain)
      const now = Date.now()
      const elapsed = now - startedAtRef.current

      levelHistoryRef.current = [
        ...levelHistoryRef.current.slice(1),
        level,
      ]

      if (timestamp - lastLevelsUpdateRef.current >= LEVELS_UPDATE_MS) {
        lastLevelsUpdateRef.current = timestamp
        setLevels([...levelHistoryRef.current])
        setElapsedMs(elapsed)
      }

      if (level >= SPEECH_THRESHOLD) {
        speechDetectedRef.current = true
        silenceStartedAtRef.current = null
      } else if (speechDetectedRef.current) {
        if (silenceStartedAtRef.current == null) {
          silenceStartedAtRef.current = now
        } else if (now - silenceStartedAtRef.current >= SILENCE_DURATION_MS) {
          finishRecording(true)
          return
        }
      } else if (elapsed >= NO_SPEECH_TIMEOUT_MS) {
        shouldTranscribeRef.current = false
        finishRecording(false)
        onErrorRef.current?.("No speech detected. Try again.")
        return
      }

      animationFrameRef.current = requestAnimationFrame(tick)
    }

    animationFrameRef.current = requestAnimationFrame(tick)
  }, [finishRecording])

  const startListening = useCallback(
    async (baseText: string) => {
      if (listening || processing) {
        return
      }

      const mimeType = getSupportedAudioMimeType()
      if (!mimeType) {
        onErrorRef.current?.(
          "Voice input is not supported in this browser. Try Chrome or Safari.",
        )
        return
      }

      baseTextRef.current = baseText
      chunksRef.current = []
      mimeTypeRef.current = mimeType
      shouldTranscribeRef.current = true
      resetVisualizer()

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream

        const audioContext = new AudioContext()
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.65
        source.connect(analyser)
        analyserRef.current = analyser

        const recorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = recorder

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data)
          }
        }

        recorder.onerror = () => {
          clearStopTimer()
          releaseMediaStream()
          void releaseAudioGraph()
          mediaRecorderRef.current = null
          chunksRef.current = []
          resetVisualizer()
          setListening(false)
          onErrorRef.current?.("Voice recording failed. Please try again.")
        }

        recorder.onstop = () => {
          clearStopTimer()
          releaseMediaStream()
          void releaseAudioGraph()
          mediaRecorderRef.current = null

          const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
          chunksRef.current = []
          const capturedBaseText = baseTextRef.current
          baseTextRef.current = ""
          const shouldTranscribe = shouldTranscribeRef.current
          shouldTranscribeRef.current = true

          if (shouldTranscribe) {
            void transcribeRecording(blob, capturedBaseText)
          } else {
            resetVisualizer()
          }
        }

        recorder.start(250)
        startedAtRef.current = Date.now()
        setListening(true)
        startAnalysisLoop()

        stopTimerRef.current = window.setTimeout(() => {
          finishRecording(true)
        }, MAX_RECORDING_MS)
      } catch (err) {
        releaseMediaStream()
        void releaseAudioGraph()
        mediaRecorderRef.current = null
        chunksRef.current = []
        resetVisualizer()
        setListening(false)
        onErrorRef.current?.(microphoneErrorMessage(err))
      }
    },
    [
      clearStopTimer,
      finishRecording,
      listening,
      processing,
      releaseAudioGraph,
      releaseMediaStream,
      resetVisualizer,
      startAnalysisLoop,
      transcribeRecording,
    ],
  )

  useEffect(() => {
    setSupported(isVoiceCaptureSupported())
  }, [])

  useEffect(() => {
    return () => {
      clearStopTimer()
      if (mediaRecorderRef.current?.state === "recording") {
        shouldTranscribeRef.current = false
        mediaRecorderRef.current.stop()
      }
      releaseMediaStream()
      void releaseAudioGraph()
      mediaRecorderRef.current = null
      chunksRef.current = []
    }
  }, [clearStopTimer, releaseAudioGraph, releaseMediaStream])

  return {
    supported,
    listening,
    processing,
    levels,
    elapsedMs,
    startListening,
    cancelListening,
    confirmListening,
  }
}
