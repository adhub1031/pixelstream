/**
 * @pixelstream/core — Progressive image streaming for the modern web.
 *
 * Pure framework-agnostic loader that swaps an `<img>` element through
 * tier widths (e.g. 64 → 256 → 1024 → original), giving instant blurry
 * preview while the full image streams in.
 *
 * Works with any image CDN that supports URL-based resize (Cloudinary,
 * ImageKit, Imgix, Vercel, Supabase, Bunny, ...) or with build-time
 * generated tier files via `@pixelstream/cli`.
 */

export { PRESETS, resolveTransformer } from "./presets.js"
export type { PresetName, PresetOrTransformer, Transformer } from "./presets.js"

import { resolveTransformer, type PresetOrTransformer } from "./presets.js"

// 기본 tier 폭. 64 → 즉시 블러, 256 → 윤곽, 1024 → 충분, 원본 → 마지막.
export const DEFAULT_TIERS: readonly number[] = [64, 256, 1024]

export interface LoadOptions {
  /** 어느 CDN/포맷의 URL 변환 규칙을 쓸지. 기본 `static` */
  preset?: PresetOrTransformer
  /** tier 폭 배열 (가장 작은 → 가장 큰). 기본 [64, 256, 1024] */
  tiers?: readonly number[]
  /** 원본도 마지막에 로드할지 (false 면 가장 큰 tier 까지만). 기본 true */
  loadOriginal?: boolean
  /** 첫 tier 적용 시 CSS blur(px). 기본 8 */
  blur?: number
  /** swap 시 fade transition (ms). 기본 300 */
  transition?: number
  /** 각 tier 로드 시 호출 — 디버깅·계측용 */
  onTierLoad?: (tier: number, url: string) => void
  /** 마지막 tier (또는 원본) 로드 후 호출 */
  onComplete?: () => void
  /** 로드 실패 시 호출 — fallback 처리 등 */
  onError?: (error: Error) => void
  /** AbortSignal 로 중간 취소 */
  signal?: AbortSignal
}

const DEFAULT_BLUR_PX = 8
const DEFAULT_TRANSITION_MS = 300

/**
 * `<img>` 요소를 progressive 로 로드한다.
 *
 * @example
 * ```ts
 * import { loadProgressive } from '@pixelstream/core'
 *
 * const img = document.querySelector('img')!
 * await loadProgressive(img, '/images/photo.jpg', { preset: 'static' })
 * ```
 */
export async function loadProgressive(
  img: HTMLImageElement,
  src: string,
  options: LoadOptions = {},
): Promise<void> {
  const {
    preset = "static",
    tiers = DEFAULT_TIERS,
    loadOriginal = true,
    blur = DEFAULT_BLUR_PX,
    transition = DEFAULT_TRANSITION_MS,
    onTierLoad,
    onComplete,
    onError,
    signal,
  } = options

  if (signal?.aborted) return

  try {
    const transformer = resolveTransformer(preset)

    // 트랜지션 셋업 (한 번만)
    img.style.transition = `filter ${transition}ms ease-out`

    // 첫 tier — 즉시 블러 적용
    img.style.filter = `blur(${blur}px)`
    const firstUrl = transformer(src, tiers[0])
    img.src = firstUrl
    await waitImage(img, signal)
    onTierLoad?.(tiers[0], firstUrl)

    // 중간 tiers — 큰 사이즈를 백그라운드에서 prefetch 후 swap
    for (let i = 1; i < tiers.length; i++) {
      if (signal?.aborted) return
      const url = transformer(src, tiers[i])
      await preloadImage(url, signal)
      img.src = url
      onTierLoad?.(tiers[i], url)
    }

    // 원본
    if (loadOriginal) {
      if (signal?.aborted) return
      await preloadImage(src, signal)
      img.src = src
      onTierLoad?.(0, src) // tier=0 = 원본 표식
    }

    // 블러 제거 — 가장 큰 사이즈 자리 잡은 후
    img.style.filter = "none"
    onComplete?.()
  } catch (err) {
    if (signal?.aborted) return
    const error = err instanceof Error ? err : new Error(String(err))
    if (onError) {
      onError(error)
    } else {
      throw error
    }
  }
}

/**
 * `<img>` 의 현재 src 가 로드 완료될 때까지 기다림.
 * 이미 complete 면 즉시 resolve.
 */
function waitImage(
  img: HTMLImageElement,
  signal?: AbortSignal,
): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(`Failed to load: ${img.src}`))
    }
    const onAbort = () => {
      cleanup()
      resolve() // abort 는 reject 가 아니라 silent return
    }
    const cleanup = () => {
      img.removeEventListener("load", onLoad)
      img.removeEventListener("error", onError)
      signal?.removeEventListener("abort", onAbort)
    }
    img.addEventListener("load", onLoad, { once: true })
    img.addEventListener("error", onError, { once: true })
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

/**
 * URL 을 `Image()` 객체로 prefetch — 브라우저 캐시에 올림.
 * `<img>` swap 직전에 호출하면 swap 이 깜빡임 없이 됨.
 */
function preloadImage(url: string, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const i = new Image()
    const onAbort = () => {
      i.src = "" // 일부 브라우저에서 fetch 취소 효과
      resolve()
    }
    i.onload = () => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }
    i.onerror = () => {
      signal?.removeEventListener("abort", onAbort)
      reject(new Error(`Failed to preload: ${url}`))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
    i.src = url
  })
}
