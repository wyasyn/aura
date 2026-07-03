export function LandingBenefits() {
  return (
    <section aria-label="Benefits" className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Benefits
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Lead with positive outcomes; pair each benefit with a supporting feature.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {["Benefit one", "Benefit two", "Benefit three"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center"
            >
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Feature + benefit copy placeholder.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
