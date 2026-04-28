# @pixelstream/core

Framework-agnostic progressive image loader. Works with any image CDN that supports URL-based resize.

```bash
npm install @pixelstream/core
```

```ts
import { loadProgressive } from '@pixelstream/core'

const img = document.querySelector('img')!
await loadProgressive(img, '/images/photo.jpg', {
  preset: 'static',
  tiers: [64, 256, 1024],
})
```

Built-in presets: `cloudinary`, `imagekit`, `imgix`, `vercel`, `supabase`, `bunny`, `static`.

For React, see [`@pixelstream/react`](https://www.npmjs.com/package/@pixelstream/react). For build-time variants, see [`@pixelstream/cli`](https://www.npmjs.com/package/@pixelstream/cli).

[MIT](https://github.com/adhub1031/pixelstream/blob/main/LICENSE) © Sage
