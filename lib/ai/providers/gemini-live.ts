import { GoogleGenAI, Modality } from "@google/genai"

import { buildLiveSystemPrompt } from "@/lib/ai/prompts/system"

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }
  return new GoogleGenAI({ apiKey })
}

export type LiveScanTokenResult = {
  token: string
  modelId: string
  apiVersion: "v1alpha"
}

export async function createLiveScanToken(
  modelId: string,
): Promise<LiveScanTokenResult> {
  const ai = getGeminiClient()
  const systemInstruction = buildLiveSystemPrompt()
  const expireAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: expireAt,
      newSessionExpireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      liveConnectConstraints: {
        model: modelId,
        config: {
          responseModalities: [Modality.TEXT],
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      },
    },
  })

  if (!token.name) {
    throw new Error("Failed to create live scan token")
  }

  return {
    token: token.name,
    modelId,
    apiVersion: "v1alpha",
  }
}
