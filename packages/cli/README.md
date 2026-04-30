# @cn2kcorp/pixelstream-cli

Build-time image resizer for [PixelStream](https://github.com/adhub1031/pixelstream). Pre-generates `<name>@<width>w.<ext>` variants alongside source files so the `static` preset works with any static host.

```bash
npm install -D @cn2kcorp/pixelstream-cli
```

```bash
npx pixelstream encode public/images
# → public/images/photo@64w.jpg
# → public/images/photo@256w.jpg
# → public/images/photo@1024w.jpg
```

## Options

```bash
pixelstream encode <path> [options]

  --tiers 64,256,1024         widths to generate
  --format jpeg|webp|avif|png  output format (default: keep source)
  --out <dir>                  output directory (default: alongside source)
  --quality 1-100              quality (default: 80)
  --overwrite                  re-generate even if target exists
```

## Programmatic API

```ts
import { resize } from '@cn2kcorp/pixelstream-cli'

await resize('public/images', {
  tiers: [64, 256, 1024],
  format: 'webp',
  quality: 85,
})
```

[MIT](https://github.com/adhub1031/pixelstream/blob/main/LICENSE) © Sage
