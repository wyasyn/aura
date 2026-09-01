import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/api-session"
import { prisma } from "@/lib/db/client"

type RouteContext = {
  params: Promise<{ userId: string }>
}

/**
 * Serves an uploaded profile picture.
 *
 * Addressable by user id rather than only "mine", because avatars are shown for
 * other people: an expert's picture appears on their marketplace card to every
 * patient browsing it. A self-only route would show each viewer their own face
 * on every card.
 *
 * Behind a session all the same. These are pictures of real people, and an open
 * endpoint keyed on a user id is an enumerable directory of them.
 *
 * The stored mime type is one of three the upload check proved by sniffing the
 * file's own bytes, so it cannot be a value a caller chose.
 */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireApiSession()
  if ("response" in authResult) {
    return authResult.response
  }

  const { userId } = await context.params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarData: true, avatarMimeType: true, avatarUpdatedAt: true },
  })

  if (!user?.avatarData || !user.avatarMimeType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(user.avatarData), {
    headers: {
      "Content-Type": user.avatarMimeType,
      // Private: this is a picture of a person, not a public asset. The URL
      // carries the update time, so a new upload is a new URL and this can be
      // cached hard without ever going stale.
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Length": String(user.avatarData.byteLength),
      // Belt and braces against a stored file being interpreted as anything
      // other than the image type it was verified to be.
      "X-Content-Type-Options": "nosniff",
    },
  })
}
