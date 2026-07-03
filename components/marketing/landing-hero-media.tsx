export function LandingHeroMedia() {
  return (
    <section aria-label="Hero image or video" className="px-6 pb-12">
      <div className="mx-auto flex aspect-video w-full max-w-5xl items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
        <div className="px-6 text-center">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Hero image or video
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Primary visual showing context of use — scan flow, product, or real
            people. Use next/image or embedded video.
          </p>
        </div>
      </div>
    </section>
  )
}
