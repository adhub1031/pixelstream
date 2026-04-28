import { describe, expect, it } from "vitest"
import { PRESETS, resolveTransformer } from "./presets.js"

describe("PRESETS", () => {
  describe("cloudinary", () => {
    it("inserts width transform after /upload/", () => {
      const url =
        "https://res.cloudinary.com/test/image/upload/v1/photo.jpg"
      expect(PRESETS.cloudinary(url, 256)).toBe(
        "https://res.cloudinary.com/test/image/upload/w_256,c_limit,q_auto/v1/photo.jpg",
      )
    })

    it("returns src unchanged when /upload/ missing (defensive)", () => {
      const url = "https://example.com/photo.jpg"
      expect(PRESETS.cloudinary(url, 256)).toBe(url)
    })
  })

  describe("imagekit", () => {
    it("appends ?tr=w- on URL without query", () => {
      const url = "https://ik.imagekit.io/test/photo.jpg"
      expect(PRESETS.imagekit(url, 256)).toBe(`${url}?tr=w-256`)
    })

    it("appends &tr=w- when query already present", () => {
      const url = "https://ik.imagekit.io/test/photo.jpg?fmt=webp"
      expect(PRESETS.imagekit(url, 256)).toBe(`${url}&tr=w-256`)
    })
  })

  describe("imgix", () => {
    it("appends ?w=...&auto=format", () => {
      const url = "https://example.imgix.net/photo.jpg"
      expect(PRESETS.imgix(url, 256)).toBe(`${url}?w=256&auto=format`)
    })

    it("uses & when query exists", () => {
      const url = "https://example.imgix.net/photo.jpg?fit=crop"
      expect(PRESETS.imgix(url, 256)).toBe(`${url}&w=256&auto=format`)
    })
  })

  describe("bunny", () => {
    it("appends ?width=", () => {
      const url = "https://test.b-cdn.net/photo.jpg"
      expect(PRESETS.bunny(url, 256)).toBe(`${url}?width=256`)
    })
  })

  describe("vercel", () => {
    it("wraps src in /_next/image with w & q", () => {
      const url = "https://example.com/photo.jpg"
      expect(PRESETS.vercel(url, 256)).toBe(
        "/_next/image?url=https%3A%2F%2Fexample.com%2Fphoto.jpg&w=256&q=75",
      )
    })

    it("encodes special characters in URL", () => {
      const url = "/local/image with space.jpg"
      expect(PRESETS.vercel(url, 256)).toBe(
        "/_next/image?url=%2Flocal%2Fimage%20with%20space.jpg&w=256&q=75",
      )
    })
  })

  describe("supabase", () => {
    it("rewrites /object/public/ to /render/image/public/ + query", () => {
      const url =
        "https://x.supabase.co/storage/v1/object/public/bucket/photo.jpg"
      expect(PRESETS.supabase(url, 256)).toBe(
        "https://x.supabase.co/storage/v1/render/image/public/bucket/photo.jpg?width=256&resize=contain",
      )
    })
  })

  describe("static", () => {
    it("inserts @<w>w before extension", () => {
      expect(PRESETS.static("/images/photo.jpg", 256)).toBe(
        "/images/photo@256w.jpg",
      )
    })

    it("returns unchanged when no extension", () => {
      expect(PRESETS.static("/images/photo", 256)).toBe("/images/photo")
    })

    it("only modifies last dot (handles dotted paths)", () => {
      expect(PRESETS.static("/images/v1.0/photo.jpg", 256)).toBe(
        "/images/v1.0/photo@256w.jpg",
      )
    })
  })
})

describe("resolveTransformer", () => {
  it("returns named preset function", () => {
    const t = resolveTransformer("cloudinary")
    expect(typeof t).toBe("function")
  })

  it("passes through custom function", () => {
    const custom = (src: string, w: number) => `${src}#w=${w}`
    expect(resolveTransformer(custom)).toBe(custom)
  })

  it("throws for unknown preset", () => {
    expect(() => resolveTransformer("nonexistent" as never)).toThrow(
      /Unknown preset/,
    )
  })
})
