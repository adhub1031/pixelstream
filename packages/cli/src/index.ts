/**
 * @cn2kcorp/pixelstream-cli — Build-time image resizer.
 *
 * Generates `<name>@<width>w.<ext>` variants alongside source images so that
 * `@cn2kcorp/pixelstream-core` 의 `static` preset 이 그대로 동작하도록 한다.
 *
 * Programmatic API:
 *
 * ```ts
 * import { resize } from '@cn2kcorp/pixelstream-cli'
 * await resize('src/images/photo.jpg', { tiers: [64, 256, 1024] })
 * ```
 *
 * CLI:
 *
 * ```bash
 * pixelstream encode src/images
 * pixelstream encode src/images --tiers 64,256,1024 --format webp
 * ```
 */

import { readdir, stat } from "node:fs/promises"
import { extname, join, parse, resolve } from "node:path"
import sharp from "sharp"

export interface ResizeOptions {
  /** 생성할 width 들 (px). 기본 [64, 256, 1024] */
  tiers?: readonly number[]
  /** 출력 포맷. 기본 원본 포맷 유지 */
  format?: "jpeg" | "webp" | "avif" | "png"
  /** 출력 디렉터리. 기본 source 옆에 같이 저장 */
  outDir?: string
  /** 이미 존재하는 파일 덮어쓸지. 기본 false */
  overwrite?: boolean
  /** JPEG/WebP/AVIF 품질 (1-100). 기본 80 */
  quality?: number
}

export interface ResizeResult {
  source: string
  generated: { tier: number; path: string; bytes: number }[]
}

const DEFAULT_TIERS = [64, 256, 1024] as const
const SUPPORTED_INPUT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tiff",
  ".gif",
])

/** 단일 이미지 파일 → tier 별 리사이즈 변형본 생성. */
export async function resizeOne(
  inputPath: string,
  options: ResizeOptions = {},
): Promise<ResizeResult> {
  const tiers = options.tiers ?? DEFAULT_TIERS
  const overwrite = options.overwrite ?? false
  const quality = options.quality ?? 80

  const parsed = parse(resolve(inputPath))
  const outDir = options.outDir ? resolve(options.outDir) : parsed.dir
  const outFormat = options.format
  const outExt = outFormat ? `.${outFormat}` : parsed.ext

  const result: ResizeResult = {
    source: resolve(inputPath),
    generated: [],
  }

  // 메타데이터로 원본 width 확보 — 원본보다 큰 tier 는 스킵 (의미 없음)
  const metadata = await sharp(inputPath).metadata()
  const sourceWidth = metadata.width ?? Number.MAX_SAFE_INTEGER

  for (const tier of tiers) {
    if (tier >= sourceWidth) {
      // 원본보다 큰 사이즈는 만들지 않음 (단, 원본이 매우 작으면 그대로 첫 tier 가 마지막)
      continue
    }
    const outName = `${parsed.name}@${tier}w${outExt}`
    const outPath = join(outDir, outName)

    if (!overwrite) {
      try {
        await stat(outPath)
        // 이미 있음 — 결과에는 포함하되 다시 안 만듦
        const stats = await stat(outPath)
        result.generated.push({ tier, path: outPath, bytes: stats.size })
        continue
      } catch {
        // 없음 — 생성 진행
      }
    }

    let pipeline = sharp(inputPath).resize({ width: tier, withoutEnlargement: true })
    if (outFormat === "jpeg" || (!outFormat && /\.jpe?g$/i.test(parsed.ext))) {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true })
    } else if (outFormat === "webp" || (!outFormat && parsed.ext === ".webp")) {
      pipeline = pipeline.webp({ quality })
    } else if (outFormat === "avif" || (!outFormat && parsed.ext === ".avif")) {
      pipeline = pipeline.avif({ quality })
    } else if (outFormat === "png" || (!outFormat && parsed.ext === ".png")) {
      pipeline = pipeline.png({ compressionLevel: 9 })
    }

    const info = await pipeline.toFile(outPath)
    result.generated.push({ tier, path: outPath, bytes: info.size })
  }

  return result
}

/** 디렉터리 안 모든 이미지 → 각각 resizeOne 적용. 재귀 X (1 depth) */
export async function resizeDirectory(
  dirPath: string,
  options: ResizeOptions = {},
): Promise<ResizeResult[]> {
  const dir = resolve(dirPath)
  const entries = await readdir(dir, { withFileTypes: true })
  const results: ResizeResult[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = extname(entry.name).toLowerCase()
    if (!SUPPORTED_INPUT.has(ext)) continue
    // 이미 변형된 파일(@64w 등)은 스킵 — 무한 루프 방지
    if (/@\d+w\./.test(entry.name)) continue

    const inputPath = join(dir, entry.name)
    const result = await resizeOne(inputPath, options)
    results.push(result)
  }

  return results
}

/** 단일 파일 또는 디렉터리 자동 분기 */
export async function resize(
  path: string,
  options: ResizeOptions = {},
): Promise<ResizeResult[]> {
  const target = resolve(path)
  const stats = await stat(target)
  if (stats.isDirectory()) {
    return resizeDirectory(target, options)
  }
  if (stats.isFile()) {
    return [await resizeOne(target, options)]
  }
  throw new Error(`Not a file or directory: ${target}`)
}
