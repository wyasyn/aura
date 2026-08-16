"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { setUserRoleAction, setUserScanTierAction } from "@/lib/admin/actions"
import { ASSIGNABLE_ROLES, type AppRole } from "@/lib/dashboard/nav"
import {
  SCAN_TIER_LABELS,
  SCAN_TIERS,
  type ScanTier,
} from "@/lib/models/types"
import { authClient } from "@/lib/auth/client"

type AdminUser = {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
  scanTier?: ScanTier
}

export function UsersTable({ initialUsers }: { initialUsers: AdminUser[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function withLoading(userId: string, fn: () => Promise<void>) {
    setLoadingId(userId)
    await fn()
    router.refresh()
    setLoadingId(null)
  }

  return (
    <div className="rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Scan tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={loadingId === user.id}>
                      {user.role ?? "user"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {ASSIGNABLE_ROLES.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() =>
                          withLoading(user.id, async () => {
                            await setUserRoleAction(user.id, role as AppRole)
                          })
                        }
                      >
                        {role}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={loadingId === user.id}>
                      {SCAN_TIER_LABELS[user.scanTier ?? "starter"]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {SCAN_TIERS.map((tier) => (
                      <DropdownMenuItem
                        key={tier}
                        onClick={() =>
                          withLoading(user.id, async () => {
                            await setUserScanTierAction(user.id, tier)
                          })
                        }
                      >
                        {SCAN_TIER_LABELS[tier]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>{user.banned ? "Banned" : "Active"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {user.banned ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === user.id}
                      onClick={() =>
                        withLoading(user.id, async () => {
                          await authClient.admin.unbanUser({ userId: user.id })
                        })
                      }
                    >
                      Unban
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === user.id}
                      onClick={() =>
                        withLoading(user.id, async () => {
                          await authClient.admin.banUser({
                            userId: user.id,
                            banReason: "Blocked by admin",
                          })
                        })
                      }
                    >
                      Block
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={loadingId === user.id}
                    onClick={() =>
                      withLoading(user.id, async () => {
                        await authClient.admin.impersonateUser({ userId: user.id })
                        window.location.href = "/dashboard"
                      })
                    }
                  >
                    Impersonate
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={loadingId === user.id}>
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {user.email}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Permanently removes this user account. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            withLoading(user.id, async () => {
                              await authClient.admin.removeUser({ userId: user.id })
                            })
                          }
                        >
                          Delete user
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
