/**
 * Minimal Daily.co REST client — plain fetch, no SDK. Rooms are embedded
 * client-side via a plain iframe (Daily's "Prebuilt" UI), so no JS SDK is
 * needed on the client either.
 */

export type VideoRoom = {
  name: string
  url: string
}

function getApiKey(): string | null {
  return process.env.DAILY_API_KEY?.trim() || null
}

/**
 * Creates a room scoped to the appointment window (expires shortly after
 * end time). Returns null if no API key is configured yet, so booking
 * confirmation never fails just because video isn't wired up.
 */
export async function createVideoRoomForBooking(
  bookingId: string,
  startTime: Date,
  endTime: Date,
): Promise<VideoRoom | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn(
      "[video] DAILY_API_KEY not set — booking confirmed without a video room",
    )
    return null
  }

  const nbfUnix = Math.floor(startTime.getTime() / 1000) - 10 * 60 // joinable 10 min early
  const expUnix = Math.floor(endTime.getTime() / 1000) + 30 * 60 // stays open 30 min after

  const response = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `aurora-consult-${bookingId}`,
      privacy: "public",
      properties: {
        nbf: nbfUnix,
        exp: expUnix,
        enable_chat: true,
        enable_screenshare: true,
        max_participants: 2,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`Daily.co room creation failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as { name: string; url: string }
  return { name: data.name, url: data.url }
}
