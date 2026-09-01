"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from "@/lib/user/avatar"
import { removeAvatarAction, uploadAvatarAction } from "@/lib/user/avatar-actions"

/**
 * Picking a profile picture from the device.
 *
 * The preview is the selected file itself, shown before the upload finishes, so
 * choosing the wrong photo is obvious immediately rather than after a round
 * trip. The server checks the file again regardless — the size and type limits
 * here are a courtesy, not the enforcement.
 */
export function AvatarUpload({
  name,
  email,
  imageUrl,
}: {
  name: string
  email: string
  imageUrl: string | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(null)

  const shown = preview ?? imageUrl

  function initials(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }

  function onPick(file: File | undefined) {
    if (!file) return

    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("Pictures must be 2 MB or smaller.")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    const body = new FormData()
    body.set("avatar", file)

    startTransition(async () => {
      const result = await uploadAvatarAction(body)
      URL.revokeObjectURL(objectUrl)

      if (!result.ok) {
        setPreview(null)
        toast.error(result.error)
        return
      }

      setPreview(null)
      toast.success("Profile picture updated")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar size="lg" className="size-20">
        <AvatarImage src={shown ?? undefined} alt={name || email} />
        <AvatarFallback className="text-lg">{initials(name || email)}</AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "Uploading…" : shown ? "Change picture" : "Upload picture"}
          </Button>

          {imageUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await removeAvatarAction()
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  toast.success("Profile picture removed")
                  router.refresh()
                })
              }
            >
              Remove
            </Button>
          ) : null}
        </div>

        <p className="text-muted-foreground text-xs">
          JPEG, PNG or WebP, up to 2 MB.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_MIME_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => {
          onPick(event.target.files?.[0])
          // Reset so choosing the same file twice still fires a change.
          event.target.value = ""
        }}
      />
    </div>
  )
}
