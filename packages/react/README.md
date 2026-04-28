# @pixelstream/react

React component wrapper for [PixelStream](https://github.com/adhub1031/pixelstream) progressive image streaming.

```bash
npm install @pixelstream/react
```

```tsx
import { PixelImage } from '@pixelstream/react'

<PixelImage
  src="https://res.cloudinary.com/x/image/upload/v1/photo.jpg"
  preset="cloudinary"
  alt="..."
/>
```

The `<img>` starts at 64 px (blurred), upgrades through 256 → 1024 → original — usually in under a second on a fast connection. Plays nicely with SSR (no hydration mismatch — initial markup is a regular `<img>` element).

Presets: `cloudinary`, `imagekit`, `imgix`, `vercel`, `supabase`, `bunny`, `static`. You can also pass a function `(src, width) => url`.

See the [main README](https://github.com/adhub1031/pixelstream) for full options and examples.

[MIT](https://github.com/adhub1031/pixelstream/blob/main/LICENSE) © Sage
