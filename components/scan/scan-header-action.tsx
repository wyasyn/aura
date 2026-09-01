import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const scanHeaderActionClassName =
  "h-9 w-9 shrink-0 gap-0 rounded-lg p-0 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"

type ScanHeaderActionButtonProps = {
  label: string
  icon: ReactNode
  onClick?: () => void
  variant?: "default" | "outline"
  className?: string
}

export function ScanHeaderActionButton({
  label,
  icon,
  onClick,
  variant = "outline",
  className,
}: ScanHeaderActionButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      aria-label={label}
      className={cn(scanHeaderActionClassName, className)}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

type ScanHeaderActionLinkProps = {
  label: string
  icon: ReactNode
  href: string
  className?: string
  alwaysShowLabel?: boolean
}

export function ScanHeaderActionLink({
  label,
  icon,
  href,
  className,
  alwaysShowLabel = false,
}: ScanHeaderActionLinkProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={cn(scanHeaderActionClassName, className)}
    >
      <Link href={href} aria-label={label}>
        {icon}
        <span className={alwaysShowLabel ? "inline" : "hidden sm:inline"}>
          {label}
        </span>
      </Link>
    </Button>
  )
}
