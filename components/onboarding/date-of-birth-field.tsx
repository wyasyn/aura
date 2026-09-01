"use client"

import { IconCalendar } from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const ITEM_HEIGHT = 36
const WHEEL_HEIGHT = ITEM_HEIGHT * 5
const WHEEL_PAD = ITEM_HEIGHT * 2

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

type DateParts = {
  year: number
  month: number
  day: number
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

function toIso({ year, month, day }: DateParts) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function isValidDate({ year, month, day }: DateParts) {
  if (month < 1 || month > 12 || day < 1) return false
  if (day > daysInMonth(month, year)) return false
  const parsed = new Date(`${toIso({ year, month, day })}T00:00:00`)
  return !Number.isNaN(parsed.getTime())
}

function parseIso(value: string): DateParts | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
  return isValidDate(parts) ? parts : null
}

function parseFlexibleInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const iso = parseIso(trimmed)
  if (iso) return toIso(iso)

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const parts = {
      month: Number(slash[1]),
      day: Number(slash[2]),
      year: Number(slash[3]),
    }
    if (isValidDate(parts)) return toIso(parts)
  }

  const dash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dash) {
    const parts = {
      month: Number(dash[1]),
      day: Number(dash[2]),
      year: Number(dash[3]),
    }
    if (isValidDate(parts)) return toIso(parts)
  }

  return null
}

function defaultParts(): DateParts {
  const today = new Date()
  return {
    year: today.getFullYear() - 25,
    month: 1,
    day: 1,
  }
}

function partsFromValue(value: string): DateParts {
  return parseIso(value) ?? defaultParts()
}

type WheelColumnProps<T extends string | number> = {
  items: readonly T[]
  value: T
  onChange: (value: T) => void
  format: (value: T) => string
  ariaLabel: string
}

function WheelColumn<T extends string | number>({
  items,
  value,
  onChange,
  format,
  ariaLabel,
}: WheelColumnProps<T>) {
  const listRef = useRef<HTMLUListElement>(null)
  const scrollTimer = useRef<number | null>(null)
  const selectedIndex = Math.max(0, items.indexOf(value))

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "auto") => {
    const list = listRef.current
    if (!list) return
    list.scrollTo({ top: index * ITEM_HEIGHT, behavior })
  }, [])

  useEffect(() => {
    scrollToIndex(selectedIndex)
  }, [selectedIndex, scrollToIndex])

  function settleScroll() {
    const list = listRef.current
    if (!list) return
    const index = Math.min(
      items.length - 1,
      Math.max(0, Math.round(list.scrollTop / ITEM_HEIGHT)),
    )
    scrollToIndex(index, "smooth")
    const next = items[index]
    if (next !== undefined && next !== value) {
      onChange(next)
    }
  }

  function handleScroll() {
    if (scrollTimer.current) {
      window.clearTimeout(scrollTimer.current)
    }
    scrollTimer.current = window.setTimeout(settleScroll, 80)
  }

  useEffect(() => {
    return () => {
      if (scrollTimer.current) {
        window.clearTimeout(scrollTimer.current)
      }
    }
  }, [])

  return (
    <div className="relative flex-1">
      <ul
        ref={listRef}
        aria-label={ariaLabel}
        className="h-[180px] overflow-y-auto overscroll-y-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "y mandatory" }}
        onScroll={handleScroll}
      >
        <li aria-hidden className="shrink-0" style={{ height: WHEEL_PAD }} />
        {items.map((item) => {
          const active = item === value
          return (
            <li
              key={String(item)}
              className={cn(
                "flex shrink-0 snap-center items-center justify-center px-2 text-sm transition-colors",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
              style={{ height: ITEM_HEIGHT }}
            >
              {format(item)}
            </li>
          )
        })}
        <li aria-hidden className="shrink-0" style={{ height: WHEEL_PAD }} />
      </ul>
    </div>
  )
}

function DateWheel({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const currentYear = new Date().getFullYear()
  const parts = partsFromValue(value)

  const years = useMemo(
    () => Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i),
    [currentYear],
  )

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    [],
  )

  const days = useMemo(() => {
    const count = daysInMonth(parts.month, parts.year)
    return Array.from({ length: count }, (_, i) => i + 1)
  }, [parts.month, parts.year])

  function update(next: Partial<DateParts>) {
    const merged = { ...parts, ...next }
    const maxDay = daysInMonth(merged.month, merged.year)
    if (merged.day > maxDay) {
      merged.day = maxDay
    }
    if (!isValidDate(merged)) return
    onChange(toIso(merged))
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-9 -translate-y-1/2 rounded-md border border-border bg-muted/50"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-popover to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-popover to-transparent"
        aria-hidden
      />
      <div className="flex" style={{ height: WHEEL_HEIGHT }}>
        <WheelColumn
          ariaLabel="Month"
          items={months}
          value={parts.month}
          onChange={(month) => update({ month })}
          format={(month) => MONTHS[month - 1] ?? String(month)}
        />
        <WheelColumn
          ariaLabel="Day"
          items={days}
          value={Math.min(parts.day, days.length)}
          onChange={(day) => update({ day })}
          format={(day) => String(day)}
        />
        <WheelColumn
          ariaLabel="Year"
          items={years}
          value={parts.year}
          onChange={(year) => update({ year })}
          format={(year) => String(year)}
        />
      </div>
    </div>
  )
}

type DateOfBirthFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

export function DateOfBirthField({
  id,
  value,
  onChange,
  className,
}: DateOfBirthFieldProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  function commitDraft(raw: string) {
    const parsed = parseFlexibleInput(raw)
    if (parsed) {
      onChange(parsed)
      setDraft(parsed)
      return true
    }
    if (value) {
      setDraft(value)
    }
    return false
  }

  return (
    <div className={cn("relative flex items-center gap-1", className)}>
      <Input
        id={id}
        value={draft}
        placeholder="YYYY-MM-DD or MM/DD/YYYY"
        inputMode="text"
        autoComplete="bday"
        className="pr-10"
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          const parsed = parseFlexibleInput(next)
          if (parsed) {
            onChange(parsed)
          }
        }}
        onBlur={() => {
          commitDraft(draft)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraft(draft)
            setOpen(false)
          }
        }}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground absolute right-0 shrink-0"
            aria-label="Open date picker"
          >
            <IconCalendar className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="w-[min(calc(100vw-2rem),18rem)] rounded-lg p-3"
        >
          <DateWheel
            value={value || toIso(defaultParts())}
            onChange={(next) => {
              onChange(next)
              setDraft(next)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
