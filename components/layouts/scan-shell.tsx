import Link from "next/link"

export function ScanShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Exit
          </Link>
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Skin scan
          </span>
          <span className="w-10" aria-hidden />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
        {children}
      </main>
    </div>
  )
}
