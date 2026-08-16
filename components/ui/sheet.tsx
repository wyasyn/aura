"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { usePanelMotion, usePanelPresence } from "@/components/motion/panel-presence"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconX } from "@tabler/icons-react"

const SheetOpenContext = React.createContext(false)
const SheetExitContext = React.createContext<(() => void) | null>(null)

function Sheet({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false)
  const isOpen = openProp ?? internalOpen
  const { radixOpen, onExitComplete } = usePanelPresence(isOpen)

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) {
        setInternalOpen(next)
      }
      onOpenChange?.(next)
    },
    [onOpenChange, openProp],
  )

  return (
    <SheetOpenContext.Provider value={isOpen}>
      <SheetExitContext.Provider value={onExitComplete}>
        <SheetPrimitive.Root
          open={radixOpen}
          onOpenChange={handleOpenChange}
          {...props}
        />
      </SheetExitContext.Provider>
    </SheetOpenContext.Provider>
  )
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const open = React.useContext(SheetOpenContext)
  const onExitComplete = React.useContext(SheetExitContext)
  const { overlay, surface, content } = usePanelMotion(side)

  return (
    <SheetPortal>
      <AnimatePresence onExitComplete={onExitComplete ?? undefined}>
        {open ? (
          <>
            <SheetPrimitive.Overlay asChild forceMount>
              <motion.div
                key="sheet-overlay"
                data-slot="sheet-overlay"
                className="fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-sm"
                initial={overlay.initial}
                animate={overlay.animate}
                exit={overlay.exit}
              />
            </SheetPrimitive.Overlay>
            <SheetPrimitive.Content asChild forceMount {...props}>
              <motion.div
                key="sheet-content"
                data-slot="sheet-content"
                data-side={side}
                className={cn(
                  "fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-md data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
                  className,
                )}
                initial={surface.initial}
                animate={surface.animate}
                exit={surface.exit}
              >
                <motion.div
                  className="flex min-h-0 flex-1 flex-col"
                  initial={content.initial}
                  animate={content.animate}
                  exit={content.exit}
                >
                  {children}
                </motion.div>
                {showCloseButton ? (
                  <SheetPrimitive.Close data-slot="sheet-close" asChild>
                    <Button
                      variant="ghost"
                      className="absolute top-4 right-4 bg-secondary"
                      size="icon-sm"
                    >
                      <IconX />
                      <span className="sr-only">Close</span>
                    </Button>
                  </SheetPrimitive.Close>
                ) : null}
              </motion.div>
            </SheetPrimitive.Content>
          </>
        ) : null}
      </AnimatePresence>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-8", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-8", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-lg font-semibold tracking-wider text-foreground uppercase",
        className,
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
}
