/**
 * @pixelstream/react — React component wrapper for progressive image streaming.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
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
  /** 각 tier 로드 시 콜백 — 디버깅·계측용 */
  onTierLoad?: LoadOptions["onTierLoad"]
  /** 모든 tier 완료 후 콜백 */
  onComplete?: LoadOptions["onComplete"]
  /** 로드 에러 시 콜백 */
  onLoadError?: LoadOptions["onError"]
}

/**
 * Progressive image 컴포넌트 — `<img>` 의 src 를 자동으로 tier 별 swap 합니다.
 *
 * @example
 * ```tsx
 * import { PixelImage } from '@pixelstream/react'
 *
 * <PixelImage src="/images/photo.jpg" alt="..." />
 *
 * // CDN 프리셋
 * <PixelImage
 *   src="https://res.cloudinary.com/x/upload/v1/photo.jpg"
 *   preset="cloudinary"
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
      onTierLoad,
      onComplete,
      onLoadError,
      ...rest
    },
    ref,
  ): ReactElement {
    const imgRef = useRef<HTMLImageElement | null>(null)

    // 외부 ref 와 내부 ref 결합
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
        onTierLoad,
        onComplete,
        onError: onLoadError,
        signal: controller.signal,
      })
      return () => {
        controller.abort()
      }
      // tiers / preset 등은 안정 ref 가정 — 사용자가 매 렌더 새 배열 만드는 케이스는 의도된 reload.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, preset, tiers, loadOriginal, blur, transition])

    return <img ref={imgRef} {...rest} />
  },
)
