"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addAvailabilitySlotAction,
  removeAvailabilitySlotAction,
} from "@/lib/experts/availability-actions"
import { formatSlotLabel } from "@/lib/experts/format"

export type AvailabilitySlotRow = {
  id: string
  startTime: Date | string
  endTime: Date | string
  isBooked: boolean
}

const DURATIONS = [15, 30, 45, 60] as const

export function AvailabilityManager({
  slots,
}: {
  slots: AvailabilitySlotRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [start, setStart] = useState("")
  const [duration, setDuration] = useState<number>(30)
  const [error, setError] = useState<string | null>(null)

  function onAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!start) return

    const startDate = new Date(start)
    const endDate = new Date(startDate.getTime() + duration * 60_000)

    startTransition(async () => {
      const result = await addAvailabilitySlotAction({
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success("Slot added")
      setStart("")
      router.refresh()
    })
  }

  function onRemove(id: string) {
    startTransition(async () => {
      const result = await removeAvailabilitySlotAction(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onAdd}
        className="flex flex-wrap items-end gap-4 rounded-xl border border-border/60 p-5"
      >
        <div className="space-y-2">
          <Label htmlFor="slot-start">Start time</Label>
          <Input
            id="slot-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slot-duration">Duration</Label>
          <select
            id="slot-duration"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((mins) => (
              <option key={mins} value={mins}>
                {mins} min
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          Add slot
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>

      <div className="rounded-xl border border-border/60">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-medium">Upcoming slots</h2>
        </div>
        <ul className="divide-y divide-border">
          {slots.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              No upcoming slots. Add one above.
            </li>
          ) : (
            slots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <p className="text-sm">{formatSlotLabel(slot.startTime, slot.endTime)}</p>
                {slot.isBooked ? (
                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    Booked
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => onRemove(slot.id)}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
