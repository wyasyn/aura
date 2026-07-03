export function LandingCta() {
  return (
    <section aria-label="Call to action" className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Call to action
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Single conversion goal — one primary button (e.g. start scan). No competing
            actions.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Primary CTA button
          </p>
        </div>
      </div>
    </section>
  )
}
