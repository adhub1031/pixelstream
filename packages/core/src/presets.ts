/**
 * URL 프리셋 — 이미지 CDN 별로 width 파라미터를 끼워 넣는 변환 함수.
 *
 * 새 CDN 추가하려면 (src, w) => transformedUrl 함수만 추가하면 됨.
 */

export type PresetName =
  | "cloudinary"
  | "imagekit"
  | "imgix"
  | "vercel"
  | "supabase"
  | "bunny"
  | "static"

export type Transformer = (src: string, width: number) => string

export const PRESETS: Record<PresetName, Transformer> = {
  /**
   * Cloudinary
   * https://res.cloudinary.com/<cloud>/image/upload/v1/photo.jpg
   *   → https://res.cloudinary.com/<cloud>/image/upload/w_256/v1/photo.jpg
   */
  cloudinary: (src, w) => {
    if (!src.includes("/upload/")) return src
    return src.replace("/upload/", `/upload/w_${w},c_limit,q_auto/`)
  },

  /**
   * ImageKit
   * https://ik.imagekit.io/x/photo.jpg → https://ik.imagekit.io/x/photo.jpg?tr=w-256
   */
  imagekit: (src, w) => {
    const sep = src.includes("?") ? "&" : "?"
    return `${src}${sep}tr=w-${w}`
  },

  /**
   * Imgix / Bunny CDN — generic ?w= query
   * https://example.imgix.net/photo.jpg → https://example.imgix.net/photo.jpg?w=256&auto=format
   */
  imgix: (src, w) => {
    const sep = src.includes("?") ? "&" : "?"
    return `${src}${sep}w=${w}&auto=format`
  },

  /**
   * Bunny CDN Image Optimizer
   * https://x.b-cdn.net/photo.jpg → https://x.b-cdn.net/photo.jpg?width=256
   */
  bunny: (src, w) => {
    const sep = src.includes("?") ? "&" : "?"
    return `${src}${sep}width=${w}`
  },

  /**
   * Vercel Image Optimization (Next.js / Vercel hosting)
   * Anything → /_next/image?url=<src>&w=256&q=75
   * 주의: 외부 URL 인 경우 next.config 의 remotePatterns 등록 필요.
   */
  vercel: (src, w) => {
    const u = encodeURIComponent(src)
    return `/_next/image?url=${u}&w=${w}&q=75`
  },

  /**
   * Supabase Storage Image Transform
   * https://x.supabase.co/storage/v1/object/public/bucket/photo.jpg
   *   → https://x.supabase.co/storage/v1/render/image/public/bucket/photo.jpg?width=256
   */
  supabase: (src, w) => {
    const transformed = src.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    )
    const sep = transformed.includes("?") ? "&" : "?"
    return `${transformed}${sep}width=${w}&resize=contain`
  },

  /**
   * Static — 빌드 타임에 생성된 파일명 규약 (`@pixelstream/cli` 가 만듦)
   * /images/photo.jpg → /images/photo@256w.jpg
   */
  static: (src, w) => {
    const dot = src.lastIndexOf(".")
    if (dot === -1) return src
    return `${src.slice(0, dot)}@${w}w${src.slice(dot)}`
  },
}

export type PresetOrTransformer = PresetName | Transformer

/** 프리셋 이름이거나 함수면 함수로 정규화 */
export function resolveTransformer(preset: PresetOrTransformer): Transformer {
  if (typeof preset === "function") return preset
  const t = PRESETS[preset]
  if (!t) throw new Error(`Unknown preset: ${preset}`)
  return t
}
