/**
 * SVG displacement filters that give the glass a real *refractive* lens warp
 * (the iOS 26 "Liquid Glass" signature), not just a flat blur. Referenced from
 * CSS via `backdrop-filter: ... url(#lg)`. Chromium applies these to the
 * backdrop; browsers that can't fall back to plain blur (see index.css).
 *
 * Rendered once at the app root.
 */
export function GlassFilters() {
  return (
    <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute h-0 w-0">
      <defs>
        {/* Strong lensing for small floating "pucks" (LCD, buttons, badges). */}
        <filter id="lg" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.010 0.013" numOctaves="2" seed="42" result="n" />
          <feGaussianBlur in="n" stdDeviation="2.2" result="nb" />
          <feDisplacementMap in="SourceGraphic" in2="nb" scale="44" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Gentler lensing for large chrome (toolbar, sidebar) — cheaper, keeps
            text behind legible. */}
        <filter id="lg-soft" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.009" numOctaves="2" seed="8" result="n" />
          <feGaussianBlur in="n" stdDeviation="2.5" result="nb" />
          <feDisplacementMap in="SourceGraphic" in2="nb" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
