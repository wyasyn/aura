import Link from "next/link"

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="font-heading text-lg font-medium tracking-wide">
            Aura
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
