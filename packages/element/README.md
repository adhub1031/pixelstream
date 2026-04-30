# @cn2kcorp/pixelstream-element

Vanilla `<pixel-image>` Web Component for [PixelStream](https://github.com/adhub1031/pixelstream) progressive image streaming. Drop into any HTML page — no React, Vue, or build step required.

```bash
npm install @cn2kcorp/pixelstream-element
```

```html
<script type="module">
  import '@cn2kcorp/pixelstream-element'
</script>

<pixel-image
  src="https://res.cloudinary.com/x/image/upload/v1/photo.jpg"
  preset="cloudinary"
  alt="..."
  lazy
></pixel-image>
```

Or via CDN (no install):

```html
<script type="module" src="https://unpkg.com/@cn2kcorp/pixelstream-element"></script>
<pixel-image src="/images/photo.jpg" preset="static" alt="..."></pixel-image>
```

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | string | — | Original image URL (required) |
| `preset` | string | `"static"` | CDN preset (`cloudinary`, `imagekit`, `imgix`, `vercel`, `supabase`, `bunny`, `static`) |
| `tiers` | comma-list | `64,256,1024` | Widths to step through |
| `load-original` | boolean | `true` | Load full-size as last step |
| `blur` | px | `8` | CSS blur on first tier |
| `transition` | ms | `300` | Fade duration |
| `lazy` | flag | off | Wait for viewport entry (IntersectionObserver) |
| `fallback` | URL | — | Used if any tier fails to load |
| `alt`, `loading`, `decoding`, `class`, `sizes`, ... | — | — | Forwarded to inner `<img>` |

[MIT](https://github.com/adhub1031/pixelstream/blob/main/LICENSE) © Sage
