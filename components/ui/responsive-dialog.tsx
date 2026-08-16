"use client"

import type { ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

type ResponsiveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

function DrawerHandle() {
  return (
    <div
      aria-hidden
      className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"
    />
  )
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const showHeader = Boolean(title?.trim() || description?.trim())

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-t-2xl p-0",
            className,
          )}
        >
          <DrawerHandle />
          {showHeader ? (
            <SheetHeader className="shrink-0 border-b border-border px-6 pt-4 pb-3 text-left">
              {title?.trim() ? (
                <SheetTitle className="font-heading text-lg font-medium normal-case tracking-normal">
                  {title}
                </SheetTitle>
              ) : null}
              {description ? (
                <SheetDescription>{description}</SheetDescription>
              ) : null}
            </SheetHeader>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          className,
        )}
      >
        {showHeader ? (
          <DialogHeader className="shrink-0 border-b border-border px-6 pt-6 pb-4">
            {title?.trim() ? (
              <DialogTitle className="font-heading text-lg font-medium normal-case tracking-normal">
                {title}
              </DialogTitle>
            ) : null}
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
