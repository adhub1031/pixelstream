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
})
