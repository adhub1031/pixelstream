/**
 * @pixelstream/element — Vanilla `<pixel-image>` Web Component.
 *
 * 사용법:
 * ```html
 * <script type="module" src="https://unpkg.com/@pixelstream/element"></script>
 *
 * <pixel-image
 *   src="https://res.cloudinary.com/x/upload/v1/photo.jpg"
 *   preset="cloudinary"
 *   tiers="64,256,1024"
 *   blur="8"
 *   transition="300"
 *   lazy
 *   alt="..."
 * ></pixel-image>
 * ```
 */

import {
  loadProgressive,
  type LoadOptions,
  type PresetOrTransformer,
} from "@pixelstream/core"

const TAG_NAME = "pixel-image"

/**
 * `<pixel-image>` Custom Element.
 * `<img>` 를 wrapping 한 가벼운 컨테이너 — Shadow DOM 을 쓰지 않아 외부 CSS 와
 * 자연스럽게 어울린다.
 */
export class PixelImageElement extends HTMLElement {
  private _img: HTMLImageElement | null = null
  private _controller: AbortController | null = null

  static get observedAttributes(): string[] {
    return [
      "src",
      "preset",
      "tiers",
      "load-original",
      "blur",
      "transition",
      "lazy",
      "fallback",
      "alt",
      "loading",
      "decoding",
      "fetchpriority",
      "crossorigin",
      "referrerpolicy",
      "sizes",
      "class",
    ]
  }

  connectedCallback() {
    if (!this._img) {
      this._img = document.createElement("img")
      this.appendChild(this._img)
    }
    this._syncImgAttributes()
    this._reload()
  }

  disconnectedCallback() {
    this._controller?.abort()
    this._controller = null
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null) {
    if (!this._img) return
    this._syncImgAttributes()
    if (name === "src" || name === "preset" || name === "tiers" || name === "lazy") {
      this._reload()
    }
  }

  /** `<img>` 에 그대로 흘려야 하는 표준 속성들을 동기화 */
  private _syncImgAttributes() {
    if (!this._img) return
    const passthrough = [
      "alt",
      "loading",
      "decoding",
      "fetchpriority",
      "crossorigin",
      "referrerpolicy",
      "sizes",
      "class",
    ]
    for (const attr of passthrough) {
      const value = this.getAttribute(attr)
      if (value !== null) this._img.setAttribute(attr, value)
      else this._img.removeAttribute(attr)
    }
  }

  /** options 파싱 후 loadProgressive 시작 */
  private _reload() {
    if (!this._img) return
    const src = this.getAttribute("src")
    if (!src) return

    this._controller?.abort()
    const controller = new AbortController()
    this._controller = controller

    const options: LoadOptions = {
      preset: (this.getAttribute("preset") ?? "static") as PresetOrTransformer,
      signal: controller.signal,
    }

    const tiersAttr = this.getAttribute("tiers")
    if (tiersAttr) {
      const parsed = tiersAttr
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
      if (parsed.length > 0) options.tiers = parsed
    }

    const loadOriginal = this.getAttribute("load-original")
    if (loadOriginal !== null) options.loadOriginal = loadOriginal !== "false"

    const blurAttr = this.getAttribute("blur")
    if (blurAttr !== null) {
      const n = parseInt(blurAttr, 10)
      if (Number.isFinite(n)) options.blur = n
    }

    const transitionAttr = this.getAttribute("transition")
    if (transitionAttr !== null) {
      const n = parseInt(transitionAttr, 10)
      if (Number.isFinite(n)) options.transition = n
    }

    const lazyAttr = this.getAttribute("lazy")
    if (lazyAttr !== null) options.lazy = true

    const fallback = this.getAttribute("fallback")
    if (fallback) options.fallback = fallback

    void loadProgressive(this._img, src, options)
  }
}

/**
 * `<pixel-image>` 를 customElements 에 등록.
 * 한 번만 호출되도록 가드. 중복 호출시 silently no-op.
 *
 * 사용자가 명시적으로 정의하지 않아도 모듈 import 시 자동 호출된다.
 */
export function defineElement(name = TAG_NAME): void {
  if (typeof customElements === "undefined") return
  if (customElements.get(name)) return
  customElements.define(name, PixelImageElement)
}

// Side effect: import 만 해도 자동 등록
defineElement()
