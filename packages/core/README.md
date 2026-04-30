# @cn2kcorp/pixelstream-core

Framework-agnostic progressive image loader. Works with any image CDN that supports URL-based resize.

```bash
npm install @cn2kcorp/pixelstream-core
```

```ts
import { loadProgressive } from '@cn2kcorp/pixelstream-core'

const img = document.querySelector('img')!
await loadProgressive(img, '/images/photo.jpg', {
  preset: 'static',
  tiers: [64, 256, 1024],
})
```

Built-in presets: `cloudinary`, `imagekit`, `imgix`, `vercel`, `supabase`, `bunny`, `static`.

For React, see [`@cn2kcorp/pixelstream-react`](https://www.npmjs.com/package/@cn2kcorp/pixelstream-react). For build-time variants, see [`@cn2kcorp/pixelstream-cli`](https://www.npmjs.com/package/@cn2kcorp/pixelstream-cli).

[MIT](https://github.com/adhub1031/pixelstream/blob/main/LICENSE) © Sage
