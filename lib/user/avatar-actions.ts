"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { avatarUrl, checkAvatar, isUploadedAvatar } from "@/lib/user/avatar"

/**
 * Uploading and removing a profile picture.
 *
 * Takes the file itself rather than a URL: asking someone to host their own
 * picture somewhere and paste a link is not a feature, and a remote URL is a
 * request the app would then make on every render.
 *
 * The bytes are always the caller's own — the row is addressed by the session's
 * user id, never by anything in the payload, so there is no id to point at
 * somebody else's account.
 */

type AvatarResult = { ok: true; imageUrl: string } | { ok: false; error: string }

export async function uploadAvatarAction(formData: FormData): Promise<AvatarResult> {
  const session = await requireSession()

  const file = formData.get("avatar")
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose a picture to upload." }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const checked = checkAvatar({ bytes, declaredType: file.type })
  if (!checked.ok) {
    return { ok: false, error: checked.error }
  }

  const updatedAt = new Date()
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      avatarData: Buffer.from(bytes),
      avatarMimeType: checked.mimeType,
      avatarUpdatedAt: updatedAt,
      // Points every existing surface at the new picture without any of them
      // needing to know it is stored as bytes.
      image: avatarUrl(session.user.id, updatedAt),
    },
  })

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true, imageUrl: avatarUrl(session.user.id, updatedAt) }
}

export async function removeAvatarAction(): Promise<AvatarResult> {
  const session = await requireSession()

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { image: true },
  })

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      avatarData: null,
      avatarMimeType: null,
      avatarUpdatedAt: null,
      // Only clear `image` if it pointed at the uploaded picture. Wiping it
      // unconditionally would also throw away the avatar a federated sign-in
      // supplied, which this action never stored and cannot restore.
      ...(isUploadedAvatar(current.image) ? { image: null } : {}),
    },
  })

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true, imageUrl: "" }
}
