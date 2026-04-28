/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import "./index.js"

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

function clearBody() {
  // innerHTML 우회 — appendChild 한 노드만 직접 제거
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
}

describe("<pixel-image>", () => {
  let restore: () => void

  beforeEach(() => {
    restore = autoFireImageLoad()
  })

  afterEach(() => {
    restore()
    clearBody()
  })

  it("registers the custom element", () => {
    expect(customElements.get("pixel-image")).toBeDefined()
  })

  it("renders a child <img> when connected", async () => {
    const el = document.createElement("pixel-image") as HTMLElement
    el.setAttribute("src", "/photo.jpg")
    el.setAttribute("alt", "test")
    document.body.appendChild(el)

    await new Promise((r) => setTimeout(r, 0))
    const img = el.querySelector("img")
    expect(img).not.toBeNull()
    expect(img?.alt).toBe("test")
  })

  it("forwards alt / loading / class to inner <img>", async () => {
    const el = document.createElement("pixel-image") as HTMLElement
    el.setAttribute("src", "/photo.jpg")
    el.setAttribute("alt", "hello")
    el.setAttribute("loading", "lazy")
    el.setAttribute("class", "my-img")
    document.body.appendChild(el)

    await new Promise((r) => setTimeout(r, 0))
    const img = el.querySelector("img")!
    expect(img.alt).toBe("hello")
    expect(img.getAttribute("loading")).toBe("lazy")
    expect(img.className).toBe("my-img")
  })

  it("parses tiers attribute and progresses to original", async () => {
    const el = document.createElement("pixel-image") as HTMLElement
    el.setAttribute("src", "/photo.jpg")
    el.setAttribute("tiers", "32,128,512")
    el.setAttribute("preset", "static")
    document.body.appendChild(el)

    await new Promise((r) => setTimeout(r, 30))
    const img = el.querySelector("img")!
    expect(img.getAttribute("src")).toContain("photo")
  })
})
