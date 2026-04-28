/**
 * @vitest-environment jsdom
 */
import { render, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { PixelImage } from "./index.js"

function autoFireImageLoad() {
  const origImage = global.Image
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    private _src = ""
    get src() {
      return this._src
    }
    set src(value: string) {
      this._src = value
      if (value === "") return
      Promise.resolve().then(() => this.onload?.())
    }
  }
  global.Image = MockImage as unknown as typeof Image

  const origDescriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "src",
  )
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    set(this: HTMLImageElement, value: string) {
      this.setAttribute("src", value)
      Object.defineProperty(this, "complete", {
        configurable: true,
        get: () => true,
      })
      Object.defineProperty(this, "naturalWidth", {
        configurable: true,
        get: () => 100,
      })
      Promise.resolve().then(() => {
        this.dispatchEvent(new Event("load"))
      })
    },
    get() {
      return this.getAttribute("src") ?? ""
    },
  })

  return () => {
    global.Image = origImage
    if (origDescriptor) {
      Object.defineProperty(HTMLImageElement.prototype, "src", origDescriptor)
    }
  }
}

describe("<PixelImage />", () => {
  let restore: () => void

  beforeEach(() => {
    restore = autoFireImageLoad()
  })

  afterEach(() => {
    cleanup()
    restore()
  })

  it("renders an <img> element", () => {
    const { container } = render(<PixelImage src="/photo.jpg" alt="test" />)
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    expect(img?.alt).toBe("test")
  })

  it("forwards extra props (className, style)", () => {
    const { container } = render(
      <PixelImage
        src="/photo.jpg"
        alt="t"
        className="my-img"
        style={{ width: 100 }}
      />,
    )
    const img = container.querySelector("img")
    expect(img?.className).toBe("my-img")
    expect(img?.style.width).toBe("100px")
  })

  it("calls onTierLoad as tiers progress", async () => {
    const seen: number[] = []
    render(
      <PixelImage
        src="/photo.jpg"
        alt="t"
        tiers={[64, 256]}
        loadOriginal={false}
        onTierLoad={(t) => seen.push(t)}
      />,
    )

    // microtask 큐 비우기 (loadProgressive 의 await 들이 완료될 시간)
    await new Promise((r) => setTimeout(r, 30))
    expect(seen).toEqual([64, 256])
  })

  it("calls onComplete after all tiers", async () => {
    let done = false
    render(
      <PixelImage
        src="/photo.jpg"
        alt="t"
        tiers={[64]}
        loadOriginal={false}
        onComplete={() => {
          done = true
        }}
      />,
    )
    await new Promise((r) => setTimeout(r, 30))
    expect(done).toBe(true)
  })

  it("applies aspectRatio prop as CSS", () => {
    const { container } = render(
      <PixelImage src="/photo.jpg" alt="t" aspectRatio="16/9" />,
    )
    const img = container.querySelector("img")
    // 브라우저는 "16 / 9" 로 normalize, jsdom 은 "16/9" 그대로 — 둘 다 허용
    expect(img?.style.aspectRatio?.replace(/\s+/g, "")).toBe("16/9")
  })

  it("aspectRatio number is stringified", () => {
    const { container } = render(
      <PixelImage src="/photo.jpg" alt="t" aspectRatio={1.5} />,
    )
    const img = container.querySelector("img")
    // jsdom 은 일부 CSS 값을 normalize 할 수 있음 — 1.5 가 문자열로만 들어가면 OK
    expect(img?.style.aspectRatio).toContain("1.5")
  })

  it("preserves user-provided style alongside aspectRatio", () => {
    const { container } = render(
      <PixelImage
        src="/photo.jpg"
        alt="t"
        aspectRatio="4/3"
        style={{ width: "100%" }}
      />,
    )
    const img = container.querySelector("img")
    expect(img?.style.width).toBe("100%")
    expect(img?.style.aspectRatio?.replace(/\s+/g, "")).toBe("4/3")
  })
})
