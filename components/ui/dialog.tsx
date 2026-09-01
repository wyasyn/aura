"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { usePanelMotion, usePanelPresence } from "@/components/motion/panel-presence"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconX } from "@tabler/icons-react"

const DialogOpenContext = React.createContext(false)
const DialogExitContext = React.createContext<(() => void) | null>(null)

function Dialog({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
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
    <DialogOpenContext.Provider value={isOpen}>
      <DialogExitContext.Provider value={onExitComplete}>
        <DialogPrimitive.Root
          open={radixOpen}
          onOpenChange={handleOpenChange}
          {...props}
        />
      </DialogExitContext.Provider>
    </DialogOpenContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const open = React.useContext(DialogOpenContext)
  const onExitComplete = React.useContext(DialogExitContext)
  const { overlay, surface, content } = usePanelMotion("center")

  return (
    <DialogPortal>
      <AnimatePresence onExitComplete={onExitComplete ?? undefined}>
        {open ? (
          <>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                key="dialog-overlay"
                data-slot="dialog-overlay"
                className="fixed inset-0 isolate z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-sm"
                initial={overlay.initial}
                animate={overlay.animate}
                exit={overlay.exit}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount {...props}>
              <motion.div
                key="dialog-content"
                data-slot="dialog-content"
                className={cn(
                  "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] gap-6 rounded-xl bg-popover p-6 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none sm:max-w-md",
                  className,
                )}
                style={{ x: "-50%", y: "-50%" }}
                initial={{ ...surface.initial, x: "-50%", y: "-50%" }}
                animate={{ ...surface.animate, x: "-50%", y: "-50%" }}
                exit={{ ...surface.exit, x: "-50%", y: "-50%" }}
              >
                <motion.div
                  className="contents"
                  initial={content.initial}
                  animate={content.animate}
                  exit={content.exit}
                >
                  {children}
                </motion.div>
                {showCloseButton ? (
                  <DialogPrimitive.Close data-slot="dialog-close" asChild>
                    <Button
                      variant="ghost"
                      className="absolute top-5 right-5 bg-secondary"
                      size="icon-sm"
                    >
                      <IconX />
                      <span className="sr-only">Close</span>
                    </Button>
                  </DialogPrimitive.Close>
                ) : null}
              </motion.div>
            </DialogPrimitive.Content>
          </>
        ) : null}
      </AnimatePresence>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      ) : null}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-none font-semibold tracking-wider uppercase",
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
