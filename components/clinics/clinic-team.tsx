"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  cancelClinicInvitationAction,
  inviteClinicMemberAction,
  removeClinicMemberAction,
  updateClinicMemberRoleAction,
} from "@/lib/clinics/member-actions"
import type { ClinicInvitationRow, ClinicMemberRow } from "@/lib/clinics/queries"

export function ClinicTeam({
  members,
  invitations,
  canManage,
  seatLimit,
  joinUrlBase,
}: {
  members: ClinicMemberRow[]
  invitations: ClinicInvitationRow[]
  canManage: boolean
  seatLimit: number | null
  joinUrlBase: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")

  const seatsUsed = members.length + invitations.length

  function run(work: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await work()
        toast.success(success)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed")
      }
    })
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              await inviteClinicMemberAction({ email, role })
              setEmail("")
            }, "Invitation created")
          }}
          className="space-y-4 rounded-xl border border-border/60 p-5"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-2">
              <Label htmlFor="invite-email">Invite a colleague</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@yourclinic.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "member")}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Inviting…" : "Send invite"}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            {seatLimit
              ? `${seatsUsed} of ${seatLimit} seats used, counting pending invites.`
              : "This clinic has no plan assigned, so it has no seats yet."}
          </p>
        </form>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Team
        </p>
        <ul className="divide-border divide-y rounded-xl border border-border/60">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{member.name}</p>
                  <Badge variant={member.role === "owner" ? "default" : "outline"}>
                    {member.role}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{member.email}</p>
              </div>

              {canManage && member.role !== "owner" ? (
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    disabled={pending}
                    onChange={(e) =>
                      run(
                        () =>
                          updateClinicMemberRoleAction({
                            memberId: member.id,
                            role: e.target.value as "admin" | "member",
                          }),
                        "Role updated",
                      )
                    }
                    className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => removeClinicMemberAction({ memberId: member.id }),
                        "Member removed",
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {invitations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Pending invitations
          </p>
          <ul className="divide-border divide-y rounded-xl border border-border/60">
            {invitations.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{invite.email}</p>
                    <Badge variant="secondary">{invite.role ?? "member"}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Expires{" "}
                    {invite.expiresAt.toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                  {canManage ? (
                    <code className="text-muted-foreground block text-xs break-all">
                      {joinUrlBase}/{invite.id}
                    </code>
                  ) : null}
                </div>

                {canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          cancelClinicInvitationAction({ invitationId: invite.id }),
                        "Invitation cancelled",
                      )
                    }
                  >
                    Cancel
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">
            Share the link with your colleague. They must sign in with the invited
            email address to accept.
          </p>
        </div>
      ) : null}
    </div>
  )
}
