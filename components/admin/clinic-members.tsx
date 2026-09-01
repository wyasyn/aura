"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  adminRevokeMemberAction,
  adminSetMemberStatusAction,
} from "@/lib/admin/membership-actions"
import type { AdminClinicMemberRow } from "@/lib/admin/clinic-queries"

const STATUS_VARIANT = {
  active: "default",
  invited: "secondary",
  suspended: "outline",
  revoked: "destructive",
} as const

/**
 * Membership management for one clinic, from the platform control plane.
 *
 * The organizationId travels with each action because an administrator is not
 * a member and so has no tenant context to derive it from. It names *which*
 * membership to act on; the right to act was established by requireAdmin on the
 * server before it is read, and the membership is matched on the pair so an id
 * from another clinic cannot be reached through this form.
 */
export function AdminClinicMembers({
  organizationId,
  members,
  counts,
}: {
  organizationId: string
  members: AdminClinicMemberRow[]
  counts: {
    active: number
    invited: number
    suspended: number
    revoked: number
    pendingInvites: number
  }
}) {
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function run(memberId: string, label: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusyId(memberId)
    startTransition(async () => {
      const result = await action()
      setBusyId(null)
      if (result.ok) toast.success(label)
      else toast.error(result.error ?? "That didn't work")
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-medium">Members</h2>
        <p className="text-muted-foreground text-sm">
          {counts.active} active · {counts.suspended} suspended · {counts.revoked} revoked
          {counts.pendingInvites > 0 ? ` · ${counts.pendingInvites} invited` : ""}
        </p>
      </div>

      {members.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
          This clinic has no staff yet.
        </div>
      ) : (
        <ul className="divide-border divide-y rounded-xl border border-border/60">
          {members.map((member) => {
            const isOwner = member.role === "owner"
            const isRevoked = member.status === "revoked"
            const busy = pending && busyId === member.id

            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{member.name}</p>
                    <Badge variant="outline">{member.role}</Badge>
                    <Badge variant={STATUS_VARIANT[member.status]}>{member.status}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{member.email}</p>
                  <p className="text-muted-foreground text-xs">
                    Joined{" "}
                    {member.joinedAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                </div>

                {/* The owner is the last guaranteed route to control of a clinic,
                    and a revoked membership is ended — coming back needs a fresh
                    invitation rather than a button here. */}
                {isOwner ? (
                  <p className="text-muted-foreground text-xs">Owner — protected</p>
                ) : isRevoked ? (
                  <p className="text-muted-foreground text-xs">
                    Revoked — re-invite to restore
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        run(
                          member.id,
                          member.status === "suspended"
                            ? `${member.name} reinstated`
                            : `${member.name} suspended`,
                          () =>
                            adminSetMemberStatusAction({
                              organizationId,
                              memberId: member.id,
                              status: member.status === "suspended" ? "active" : "suspended",
                            }),
                        )
                      }
                    >
                      {member.status === "suspended" ? "Reinstate" : "Suspend"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() =>
                        run(member.id, `${member.name} revoked`, () =>
                          adminRevokeMemberAction({
                            organizationId,
                            memberId: member.id,
                          }),
                        )
                      }
                    >
                      Revoke
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
