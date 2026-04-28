/**
 * @pixelstream/react — React component wrapper for progressive image streaming.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactElement,
} from "react"
import {
  loadProgressive,
  type LoadOptions,
  type PresetOrTransformer,
} from "@pixelstream/core"

export type {
  LoadOptions,
  PresetOrTransformer,
  PresetName,
  Transformer,
} from "@pixelstream/core"
export { PRESETS, DEFAULT_TIERS } from "@pixelstream/core"

export interface PixelImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  /** 원본 이미지 URL */
  src: string
  /** CDN preset 또는 커스텀 변환 함수. 기본 "static" */
  preset?: PresetOrTransformer
  /** tier 폭 배열 (작은 → 큰). 기본 [64, 256, 1024] */
  tiers?: readonly number[]
  /** 원본도 마지막에 로드할지. 기본 true */
  loadOriginal?: boolean
  /** 첫 tier 적용 시 CSS blur(px). 기본 8 */
  blur?: number
  /** swap 시 fade transition (ms). 기본 300 */
  transition?: number
  /**
   * IntersectionObserver lazy loading.
   * `true` = 뷰포트 200px 마진으로 자동 lazy.
   * `false` (기본) = 즉시 로드 (above-the-fold 권장).
   * 객체 = IntersectionObserverInit 커스터마이즈.
   */
  lazy?: boolean | IntersectionObserverInit
  /** 로드 실패 시 fallback URL */
  fallback?: string
  /**
   * aspect-ratio CSS — 레이아웃 시프트 방지에 권장.
   * 예: "16/9", "4/3", "1.5" (= 3/2), 또는 width/height 둘 다 prop 으로 전달.
   */
  aspectRatio?: string | number
  /** 각 tier 로드 콜백 — 디버깅·계측용 */
  onTierLoad?: LoadOptions["onTierLoad"]
  /** 모든 tier 완료 콜백 */
  onComplete?: LoadOptions["onComplete"]
  /** 로드 에러 콜백 (fallback 이 없을 때만 호출됨) */
  onLoadError?: LoadOptions["onError"]
}

/**
 * Progressive image 컴포넌트 — `<img>` 의 src 를 자동으로 tier 별 swap.
 *
 * @example
 * ```tsx
 * import { PixelImage } from '@pixelstream/react'
 *
 * <PixelImage src="/images/photo.jpg" alt="..." />
 *
 * <PixelImage
 *   src="https://res.cloudinary.com/x/upload/v1/photo.jpg"
 *   preset="cloudinary"
 *   aspectRatio="16/9"
 *   lazy
 *   alt="..."
 * />
 * ```
 */
export const PixelImage = forwardRef<HTMLImageElement, PixelImageProps>(
  function PixelImage(
    {
      src,
      preset = "static",
      tiers,
      loadOriginal,
      blur,
      transition,
      lazy,
      fallback,
      aspectRatio,
      onTierLoad,
      onComplete,
      onLoadError,
      style,
      ...rest
    },
    ref,
  ): ReactElement {
    const imgRef = useRef<HTMLImageElement | null>(null)

    useImperativeHandle<HTMLImageElement | null, HTMLImageElement | null>(
      ref,
      () => imgRef.current,
      [],
    )

    useEffect(() => {
      const img = imgRef.current
      if (!img) return
      const controller = new AbortController()
      void loadProgressive(img, src, {
        preset,
        tiers,
        loadOriginal,
        blur,
        transition,
        lazy,
        fallback,
        onTierLoad,
        onComplete,
        onError: onLoadError,
        signal: controller.signal,
      })
      return () => {
        controller.abort()
      }
      // tiers / preset 등 안정 ref 가정. 사용자가 매 렌더 새 배열을 만들면 의도된 reload.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, preset, tiers, loadOriginal, blur, transition, lazy, fallback])

    // aspectRatio 가 있으면 style 에 합성 — 레이아웃 시프트 방지
    const mergedStyle = useMemo<CSSProperties | undefined>(() => {
      if (aspectRatio === undefined) return style
      const ar =
        typeof aspectRatio === "number" ? String(aspectRatio) : aspectRatio
      return { aspectRatio: ar, ...style }
    }, [aspectRatio, style])

    return <img ref={imgRef} style={mergedStyle} {...rest} />
  },
)
