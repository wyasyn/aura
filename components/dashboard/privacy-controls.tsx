"use client"

import { useState } from "react"
import { IconDownload } from "@tabler/icons-react"
import { toast } from "sonner"

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
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs"
import { useTabSearchParam } from "@/hooks/use-tab-search-param"
import {
  deleteAccountAction,
  deleteAllPersonalDataAction,
  deleteAllScansAction,
  deleteLocationDataAction,
  deleteProfileDataAction,
  deleteScanAction,
  setMarketingConsentAction,
} from "@/lib/user/data-actions"

const PRIVACY_TABS = ["data", "scans", "export", "account"] as const

export function PrivacyControls({
  scans,
  marketingConsent = false,
}: {
  scans: { id: string; status: string; createdAt: string }[]
  marketingConsent?: boolean
}) {
  const [marketing, setMarketing] = useState(marketingConsent)
  const [tab, setTab, tabPending] = useTabSearchParam(PRIVACY_TABS, "data")
  const [actionPending, setActionPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function run(
    action: () => Promise<void>,
    key: string,
    successMessage = "Done.",
  ) {
    setActionPending(key)
    setMessage(null)
    try {
      await action()
      setMessage(successMessage)
      toast.success(successMessage)
    } catch (err) {
      const failure = err instanceof Error ? err.message : "That did not work."
      setMessage(failure)
      toast.error(failure)
    } finally {
      setActionPending(null)
    }
  }

  async function toggleMarketing(granted: boolean) {
    setMarketing(granted)
    try {
      await setMarketingConsentAction(granted)
      toast.success(granted ? "Marketing emails on." : "Marketing emails off.")
    } catch {
      setMarketing(!granted)
      toast.error("Could not update your email preference.")
    }
  }

  return (
    <Tabs value={tab} onValueChange={setTab} variant="underline" className="w-full">
      <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
        <TabsTrigger value="data" pending={tabPending === "data"}>Your data</TabsTrigger>
        <TabsTrigger value="scans" pending={tabPending === "scans"}>Scans</TabsTrigger>
        <TabsTrigger value="export" pending={tabPending === "export"}>Export</TabsTrigger>
        <TabsTrigger value="account" pending={tabPending === "account"}>Account</TabsTrigger>
      </TabsList>

      <TabsContent value="data" pending={tabPending === "data"}>
        <div className="space-y-4">
          <PrivacyAction
            title="Profile & wellness data"
            description="Clears skin profile, routine, prescriptions, and lifestyle fields. Your account stays active."
            confirmLabel="Delete profile data"
            pending={actionPending === "profile"}
            onConfirm={() =>
              run(deleteProfileDataAction, "profile", "Profile data cleared.")
            }
          />
          <PrivacyAction
            title="Location & climate cache"
            description="Removes city, coordinates, and cached climate bands."
            confirmLabel="Delete location"
            pending={actionPending === "location"}
            onConfirm={() =>
              run(deleteLocationDataAction, "location", "Location cleared.")
            }
          />

          <div className="border-border/60 rounded-xl border p-4">
            <h3 className="font-heading text-sm font-medium">Marketing email</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Turn Aurora product updates on or off. This does not affect
              account or security emails.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Checkbox
                id="marketing-consent-toggle"
                checked={marketing}
                onCheckedChange={(value) => toggleMarketing(value === true)}
              />
              <label htmlFor="marketing-consent-toggle" className="text-sm">
                Email me Aurora product updates
              </label>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="export" pending={tabPending === "export"}>
        <div className="border-border/60 rounded-xl border p-4">
          <h3 className="font-heading text-sm font-medium">
            Download your data
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            A machine-readable JSON file containing your profile, location,
            consent records, every scan and its results, and your chat
            transcripts. Scan photos are never stored, so none are included.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <a href="/api/user/export" download>
              <IconDownload className="size-4" aria-hidden />
              Download JSON
            </a>
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="scans" pending={tabPending === "scans"}>
        <div className="space-y-4">
          <PrivacyAction
            title="All scans & reports"
            description="Permanently deletes every scan and associated results for your account."
            confirmLabel="Delete all scans"
            pending={actionPending === "scans"}
            onConfirm={() =>
              run(deleteAllScansAction, "scans", "All scans deleted.")
            }
            destructive
          />

          {scans.length > 0 ? (
            <div className="rounded-xl border border-border/60 p-4">
              <h3 className="font-heading text-sm font-medium">Individual scans</h3>
              <ul className="mt-3 space-y-2">
                {scans.map((scan) => (
                  <li
                    key={scan.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {new Date(scan.createdAt).toLocaleDateString()} — {scan.status}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this scan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the scan and any stored results. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => run(() => deleteScanAction(scan.id), scan.id)}
                          >
                            Delete scan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scans to delete.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="account" pending={tabPending === "account"}>
        <div className="space-y-4">
          <PrivacyAction
            title="All personal data"
            description="Deletes your profile, location, scans, chat history, feedback, and scan allowance records. Your account remains so you can sign in."
            confirmLabel="Delete all personal data"
            pending={actionPending === "all"}
            onConfirm={() =>
              run(deleteAllPersonalDataAction, "all", "Personal data deleted.")
            }
            destructive
          />
          <PrivacyAction
            title="Delete account"
            description="Permanently deletes your account and all associated data. You will be signed out."
            confirmLabel="Delete my account"
            pending={actionPending === "account"}
            onConfirm={() => run(deleteAccountAction, "account")}
            destructive
          />
        </div>
      </TabsContent>

      {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
    </Tabs>
  )
}

function PrivacyAction({
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  destructive,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  pending: boolean
  destructive?: boolean
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <h3 className="font-heading text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="mt-3"
            size="sm"
            variant={destructive ? "destructive" : "outline"}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmLabel}?</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
