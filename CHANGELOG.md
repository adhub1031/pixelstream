# Changelog

All notable changes to PixelStream packages are documented here. Versions are kept in lock-step across `@cn2kcorp/pixelstream-core`, `@cn2kcorp/pixelstream-react`, `@cn2kcorp/pixelstream-element`, and `@cn2kcorp/pixelstream-cli`.

## [0.1.0] — 2026-04-28

Initial public release.

### Added

- **`@cn2kcorp/pixelstream-core`** — framework-agnostic `loadProgressive(img, src, options)`
  - 7 CDN presets: `cloudinary`, `imagekit`, `imgix`, `vercel`, `supabase`, `bunny`, `static`
  - Custom `(src, width) => url` transformer support
  - `lazy` option (boolean or `IntersectionObserverInit`) for viewport-based loading
  - `fallback` URL for graceful error recovery
  - `AbortSignal` for clean cancellation on unmount
  - Auto-sets `decoding="async"` when caller hasn't specified
- **`@cn2kcorp/pixelstream-react`** — `<PixelImage />` component
  - SSR-safe (no hydration mismatch — renders a regular `<img>`)
  - `aspectRatio` prop for layout-shift prevention
  - `forwardRef` support
- **`@cn2kcorp/pixelstream-element`** — vanilla `<pixel-image>` Web Component
  - Auto-registers `pixel-image` custom element on import
  - Forwards standard `<img>` attributes (`alt`, `loading`, `class`, `sizes`, ...)
- **`@cn2kcorp/pixelstream-cli`** — build-time image variant generator
  - `pixelstream encode <path>` generates `<name>@<width>w.<ext>` files
  - Sharp-based — JPEG, WebP, AVIF, PNG output formats
  - Skips tiers larger than the source width
  - `--overwrite`, `--quality`, `--out`, `--format` options

### Tests

- 38 tests across all packages — preset transforms, progressive loading flow, lazy loading, fallback behavior, React component rendering, CLI resize variants.

### Bundle size

- core: 6 KB ESM
- react: 1.2 KB ESM (+ core)
- element: ~2 KB ESM (+ core)
- cli: build-time only, not bundled to clients
