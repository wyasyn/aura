"use client"

import { useState, useTransition } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useTabSearchParam } from "@/hooks/use-tab-search-param"
import { FITZPATRICK_OPTIONS, formatSkinOptionLabel } from "@/lib/onboarding/constants"
import { SKIN_DOSHA_OPTIONS } from "@/lib/scan/dosha"
import {
  updateBasicsAction,
  updateLocationAction,
  updateRoutineAction,
  updateSkinAction,
} from "@/lib/user/profile-actions"

const PROFILE_TABS = ["basics", "skin", "routine", "location"] as const

type ProfileFormProps = {
  profile: {
    name: string
    dateOfBirth: string
    biologicalSex: string
    skinType: string
    fitzpatrickBand: string
    skinDosha: string
    primaryConcerns: string[]
    skinGoals: string[]
    allergies: string
    routineAm: string
    routinePm: string
    sunExposure: string
    smoking: string
    sleepHours: string
    waterIntake: string
    city: string
    region: string
    country: string
  }
}

const CONCERNS = ["acne", "aging", "dryness", "redness", "hyperpigmentation", "sensitivity", "texture", "oiliness"]
const GOALS = ["hydration", "even_tone", "clear_skin", "barrier_support", "sun_protection", "gentle_routine"]

export function ProfileEditor({ profile }: ProfileFormProps) {
  const [tab, setTab, tabPending] = useTabSearchParam(PROFILE_TABS, "basics")
  const [message, setMessage] = useState<string | null>(null)
  const [savePending, startSaveTransition] = useTransition()
  const [basics, setBasics] = useState({
    name: profile.name,
    dateOfBirth: profile.dateOfBirth,
    biologicalSex: profile.biologicalSex,
  })
  const [skin, setSkin] = useState({
    skinType: profile.skinType,
    fitzpatrickBand: profile.fitzpatrickBand,
    skinDosha: profile.skinDosha,
    primaryConcerns: profile.primaryConcerns,
    skinGoals: profile.skinGoals,
    allergies: profile.allergies,
  })
  const [routine, setRoutine] = useState({ am: profile.routineAm, pm: profile.routinePm })
  const [location, setLocation] = useState({
    city: profile.city,
    region: profile.region,
    country: profile.country,
    locationSource: "manual" as const,
  })

  function toggle(list: string[], item: string) {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
  }

  function save(section: string, action: () => Promise<void>) {
    startSaveTransition(async () => {
      try {
        await action()
        setMessage(`${section} saved.`)
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Save failed")
      }
    })
  }

  return (
    <Tabs value={tab} onValueChange={setTab} variant="underline" className="w-full">
      <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
        <TabsTrigger value="basics" pending={tabPending === "basics"}>Basics</TabsTrigger>
        <TabsTrigger value="skin" pending={tabPending === "skin"}>Skin</TabsTrigger>
        <TabsTrigger value="routine" pending={tabPending === "routine"}>Routine</TabsTrigger>
        <TabsTrigger value="location" pending={tabPending === "location"}>Location</TabsTrigger>
      </TabsList>

      <TabsContent value="basics" pending={tabPending === "basics"}>
        <section className="space-y-4 rounded-xl border border-border/60 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={basics.name} onChange={(e) => setBasics({ ...basics, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={basics.dateOfBirth} onChange={(e) => setBasics({ ...basics, dateOfBirth: e.target.value })} />
            </div>
          </div>
          <Button disabled={savePending} onClick={() => save("Basics", () => updateBasicsAction({ ...basics, biologicalSex: basics.biologicalSex || undefined }))}>
            Save basics
          </Button>
        </section>
      </TabsContent>

      <TabsContent value="skin" pending={tabPending === "skin"}>
        <section className="space-y-4 rounded-xl border border-border/60 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select value={skin.skinType} onValueChange={(v) => setSkin({ ...skin, skinType: v })}>
              <SelectTrigger><SelectValue placeholder="Skin type" /></SelectTrigger>
              <SelectContent>
                {["oily", "dry", "combination", "sensitive", "normal"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={skin.fitzpatrickBand || "unsure"}
              onValueChange={(v) =>
                setSkin({ ...skin, fitzpatrickBand: v === "unsure" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sun sensitivity (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unsure">I&apos;m not sure — skip</SelectItem>
                {FITZPATRICK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} — {option.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={skin.skinDosha || "unsure"}
              onValueChange={(v) =>
                setSkin({ ...skin, skinDosha: v === "unsure" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Ayurvedic lean (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unsure">I&apos;m not sure — skip</SelectItem>
                {SKIN_DOSHA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} — {option.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONCERNS.map((c) => (
              <Button key={c} type="button" size="sm" variant={skin.primaryConcerns.includes(c) ? "default" : "outline"} onClick={() => setSkin({ ...skin, primaryConcerns: toggle(skin.primaryConcerns, c) })}>
                {formatSkinOptionLabel(c)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Button key={g} type="button" size="sm" variant={skin.skinGoals.includes(g) ? "default" : "outline"} onClick={() => setSkin({ ...skin, skinGoals: toggle(skin.skinGoals, g) })}>
                {formatSkinOptionLabel(g)}
              </Button>
            ))}
          </div>
          <Textarea value={skin.allergies} onChange={(e) => setSkin({ ...skin, allergies: e.target.value })} placeholder="Allergies" />
          <Button disabled={savePending} onClick={() => save("Skin profile", () => updateSkinAction(skin))}>Save skin profile</Button>
        </section>
      </TabsContent>

      <TabsContent value="routine" pending={tabPending === "routine"}>
        <section className="space-y-4 rounded-xl border border-border/60 p-5">
          <Textarea value={routine.am} onChange={(e) => setRoutine({ ...routine, am: e.target.value })} placeholder="Morning routine" />
          <Textarea value={routine.pm} onChange={(e) => setRoutine({ ...routine, pm: e.target.value })} placeholder="Evening routine" />
          <Button disabled={savePending} onClick={() => save("Routine", () => updateRoutineAction({ currentRoutine: routine }))}>Save routine</Button>
        </section>
      </TabsContent>

      <TabsContent value="location" pending={tabPending === "location"}>
        <section className="space-y-4 rounded-xl border border-border/60 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} placeholder="City" />
            <Input value={location.region} onChange={(e) => setLocation({ ...location, region: e.target.value })} placeholder="Region" />
            <Input value={location.country} onChange={(e) => setLocation({ ...location, country: e.target.value })} placeholder="Country" />
          </div>
          <Button disabled={savePending} onClick={() => save("Location", () => updateLocationAction(location))}>Save location</Button>
        </section>
      </TabsContent>

      {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
    </Tabs>
  )
}
