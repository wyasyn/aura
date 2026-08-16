"use client"

import { useSyncExternalStore } from "react"
import { IconMoon, IconSun } from "@tabler/icons-react"
import { useTheme } from "next-themes"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

function useThemeMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function ThemeToggleMenuItem() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useThemeMounted()

  const isDark = resolvedTheme === "dark"
  const label = isDark ? "Light mode" : "Dark mode"

  function toggle() {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <DropdownMenuItem
      className="cursor-pointer"
      onSelect={(event) => {
        event.preventDefault()
        toggle()
      }}
    >
      {mounted ? (
        isDark ? (
          <IconSun />
        ) : (
          <IconMoon />
        )
      ) : (
        <span className="size-4" aria-hidden />
      )}
      {mounted ? label : "Theme"}
    </DropdownMenuItem>
  )
}
