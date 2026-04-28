import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { mkdir, rm, readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import sharp from "sharp"
import { resizeOne } from "./index.js"

const TMP = join(tmpdir(), `pixelstream-cli-test-${Date.now()}`)

async function makeJpeg(path: string, width = 2000, height = 1500) {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .jpeg({ quality: 80 })
    .toFile(path)
}

describe("resizeOne", () => {
  beforeAll(async () => {
    await mkdir(TMP, { recursive: true })
  })

  afterAll(async () => {
    await rm(TMP, { recursive: true, force: true })
  })

  it("generates @64w, @256w, @1024w variants by default", async () => {
    const src = join(TMP, "photo.jpg")
    await makeJpeg(src)

    const result = await resizeOne(src)
    expect(result.source).toContain("photo.jpg")
    expect(result.generated.map((g) => g.tier).sort((a, b) => a - b)).toEqual([
      64, 256, 1024,
    ])

    const files = await readdir(TMP)
    expect(files).toContain("photo@64w.jpg")
    expect(files).toContain("photo@256w.jpg")
    expect(files).toContain("photo@1024w.jpg")
  })

  it("skips tiers larger than source width", async () => {
    const src = join(TMP, "tiny.jpg")
    await makeJpeg(src, 200, 150)

    const result = await resizeOne(src, { tiers: [64, 256, 1024] })
    // 256, 1024 가 200보다 크니까 건너뜀
    expect(result.generated.map((g) => g.tier)).toEqual([64])
  })

  it("respects custom tiers", async () => {
    const src = join(TMP, "custom.jpg")
    await makeJpeg(src)

    const result = await resizeOne(src, { tiers: [128, 512] })
    expect(result.generated.map((g) => g.tier).sort((a, b) => a - b)).toEqual([
      128, 512,
    ])
  })

  it("writes to outDir when provided", async () => {
    const src = join(TMP, "outdir-src.jpg")
    const out = join(TMP, "out")
    await mkdir(out, { recursive: true })
    await makeJpeg(src)

    await resizeOne(src, { tiers: [64], outDir: out })
    const files = await readdir(out)
    expect(files).toContain("outdir-src@64w.jpg")
  })

  it("converts to webp when format=webp", async () => {
    const src = join(TMP, "convert.jpg")
    await makeJpeg(src, 1500, 1000)

    const result = await resizeOne(src, {
      tiers: [64],
      format: "webp",
      overwrite: true,
    })
    expect(result.generated[0]?.path).toMatch(/\.webp$/)
  })

  it("does not regenerate by default when target exists", async () => {
    const src = join(TMP, "existing.jpg")
    await makeJpeg(src)

    const r1 = await resizeOne(src, { tiers: [64] })
    const firstSize = r1.generated[0]?.bytes ?? 0

    // 두 번째 호출은 읽기만 (재생성 X). 사이즈 동일
    const r2 = await resizeOne(src, { tiers: [64] })
    expect(r2.generated[0]?.bytes).toBe(firstSize)
  })
})
