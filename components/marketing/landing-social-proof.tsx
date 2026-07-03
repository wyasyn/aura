export function LandingSocialProof() {
  return (
    <section aria-label="Social proof" className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Social proof
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Testimonials, review scores, customer logos, or case study links — specific
            and credible.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {["Testimonial", "Testimonial"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10"
            >
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Quote, customer name, and photo placeholder.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
