/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_TIERS, loadProgressive } from "./index.js"

/**
 * jsdom 의 `Image` 는 실제로 네트워크를 타지 않으므로 onload 가 발생하지 않는다.
 * 테스트용으로 src 가 셋되면 다음 microtask 에 onload 를 자동으로 호출하도록
 * Image 와 HTMLImageElement 를 패치한다.
 */
function autoFireImageLoad() {
  // Native Image 컨스트럭터 패치 — preloadImage 가 사용
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
      // microtask 큐에 onload 발사
      Promise.resolve().then(() => this.onload?.())
    }
  }
  global.Image = MockImage as unknown as typeof Image

  // HTMLImageElement.src setter 패치 — load 이벤트 발사
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
        const ev = new Event("load")
        this.dispatchEvent(ev)
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

describe("loadProgressive", () => {
  let restore: () => void

  beforeEach(() => {
    restore = autoFireImageLoad()
  })

  afterEach(() => {
    restore()
  })

  it("sets src through tier sequence and ends on original", async () => {
    const img = document.createElement("img")
    const seen: string[] = []
    await loadProgressive(img, "/images/photo.jpg", {
      preset: "static",
      tiers: [64, 256],
      onTierLoad: (_t, url) => seen.push(url),
    })

    // Static preset → /images/photo@64w.jpg, @256w, then original
    expect(seen).toEqual([
      "/images/photo@64w.jpg",
      "/images/photo@256w.jpg",
      "/images/photo.jpg",
    ])
    expect(img.src).toContain("/images/photo.jpg")
    // 마지막엔 블러 제거
    expect(img.style.filter).toBe("none")
  })

  it("applies blur on first tier and removes after complete", async () => {
    const img = document.createElement("img")
    const observed: string[] = []
    await loadProgressive(img, "/images/photo.jpg", {
      preset: "static",
      tiers: [64],
      blur: 12,
      onTierLoad: () => observed.push(img.style.filter),
    })

    // 첫 tier 시점엔 blur 12px
    expect(observed[0]).toBe("blur(12px)")
    // 완료 후엔 none
    expect(img.style.filter).toBe("none")
  })

  it("skips loading original when loadOriginal=false", async () => {
    const img = document.createElement("img")
    const seen: number[] = []
    await loadProgressive(img, "/images/photo.jpg", {
      preset: "static",
      tiers: [64, 256],
      loadOriginal: false,
      onTierLoad: (t) => seen.push(t),
    })

    expect(seen).toEqual([64, 256])
    expect(img.src).toContain("@256w")
  })

  it("calls onComplete when done", async () => {
    const img = document.createElement("img")
    const onComplete = vi.fn()
    await loadProgressive(img, "/images/photo.jpg", {
      preset: "static",
      tiers: [64],
      onComplete,
    })

    expect(onComplete).toHaveBeenCalledOnce()
  })

  it("aborts cleanly on signal", async () => {
    const img = document.createElement("img")
    const controller = new AbortController()
    controller.abort() // 즉시 취소
    const onComplete = vi.fn()
    await loadProgressive(img, "/images/photo.jpg", {
      preset: "static",
      signal: controller.signal,
      onComplete,
    })

    expect(onComplete).not.toHaveBeenCalled()
  })

  it("uses DEFAULT_TIERS when not provided", async () => {
    expect(DEFAULT_TIERS).toEqual([64, 256, 1024])
    const img = document.createElement("img")
    const seen: number[] = []
    await loadProgressive(img, "/images/photo.jpg", {
      preset: "static",
      onTierLoad: (t) => seen.push(t),
    })
    // 64, 256, 1024, original (0)
    expect(seen).toEqual([64, 256, 1024, 0])
  })

  it("invokes custom transformer function preset", async () => {
    const img = document.createElement("img")
    const custom = vi.fn((src: string, w: number) => `${src}#${w}`)
    await loadProgressive(img, "/images/photo.jpg", {
      preset: custom,
      tiers: [64],
      loadOriginal: false,
    })

    expect(custom).toHaveBeenCalledWith("/images/photo.jpg", 64)
  })

  it("sets decoding=async automatically when not set", async () => {
    const img = document.createElement("img")
    await loadProgressive(img, "/images/photo.jpg", {
      preset: "static",
      tiers: [64],
      loadOriginal: false,
    })
    expect(img.decoding).toBe("async")
  })

  it("respects existing decoding attribute (no override)", async () => {
    const img = document.createElement("img")
    img.decoding = "sync"
    await loadProgressive(img, "/images/photo.jpg", {
      preset: "static",
      tiers: [64],
      loadOriginal: false,
    })
    expect(img.decoding).toBe("sync")
  })

  it("falls back to fallback URL on load error", async () => {
    // ImageElement.src setter 에서 onerror 발사하도록 임시 패치
    const origDescriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "src",
    )
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      set(this: HTMLImageElement, value: string) {
        this.setAttribute("src", value)
        // 첫 tier 만 에러로 시뮬레이션
        if (value.includes("@64w")) {
          Promise.resolve().then(() => {
            this.dispatchEvent(new Event("error"))
          })
        } else {
          // fallback URL 은 정상 로드
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
        }
      },
      get() {
        return this.getAttribute("src") ?? ""
      },
    })

    try {
      const img = document.createElement("img")
      await loadProgressive(img, "/images/photo.jpg", {
        preset: "static",
        tiers: [64],
        loadOriginal: false,
        fallback: "/placeholder.jpg",
      })
      expect(img.src).toContain("/placeholder.jpg")
      expect(img.style.filter).toBe("none")
    } finally {
      if (origDescriptor) {
        Object.defineProperty(HTMLImageElement.prototype, "src", origDescriptor)
      }
    }
  })

  it("lazy=true defers load until viewport entry (mocked IntersectionObserver)", async () => {
    // jsdom 에 IntersectionObserver 가 없을 수 있어서 직접 mock
    let trigger: ((entries: IntersectionObserverEntry[]) => void) | null = null
    const origIO = (global as { IntersectionObserver?: unknown }).IntersectionObserver
    class MockIO {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        trigger = callback
      }
    }
    ;(global as { IntersectionObserver: unknown }).IntersectionObserver = MockIO

    try {
      const img = document.createElement("img")
      const onTier = vi.fn()
      const promise = loadProgressive(img, "/images/photo.jpg", {
        preset: "static",
        tiers: [64],
        loadOriginal: false,
        lazy: true,
        onTierLoad: onTier,
      })

      // 아직 viewport 미진입 → 로드 시작 X
      await new Promise((r) => setTimeout(r, 10))
      expect(onTier).not.toHaveBeenCalled()

      // viewport 진입 시뮬레이션
      trigger?.([{ isIntersecting: true } as IntersectionObserverEntry])
      await promise
      expect(onTier).toHaveBeenCalled()
    } finally {
      ;(global as { IntersectionObserver: unknown }).IntersectionObserver = origIO
    }
  })
})
