import { DotField } from "@/components/ui/dot-field"

export function ScanShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="scan-flow relative isolate flex min-h-svh flex-col bg-background">
      <DotField />
      {children}
    </div>
  )
}
