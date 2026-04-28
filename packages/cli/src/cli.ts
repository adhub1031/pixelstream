#!/usr/bin/env node
/**
 * @pixelstream/cli — CLI entrypoint
 *
 * Usage:
 *   pixelstream encode <path>
 *   pixelstream encode src/images --tiers 64,256,1024
 *   pixelstream encode photo.jpg --format webp --quality 85
 */

import { resize, type ResizeOptions } from "./index.js"

interface ParsedArgs {
  command?: string
  path?: string
  tiers?: number[]
  format?: ResizeOptions["format"]
  outDir?: string
  overwrite?: boolean
  quality?: number
  help?: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {}
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === "--help" || a === "-h") {
      args.help = true
      i++
    } else if (a === "--tiers") {
      args.tiers = (argv[i + 1] ?? "")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
      i += 2
    } else if (a === "--format") {
      args.format = argv[i + 1] as ResizeOptions["format"]
      i += 2
    } else if (a === "--out") {
      args.outDir = argv[i + 1]
      i += 2
    } else if (a === "--quality") {
      args.quality = parseInt(argv[i + 1] ?? "80", 10)
      i += 2
    } else if (a === "--overwrite") {
      args.overwrite = true
      i++
    } else if (!args.command) {
      args.command = a
      i++
    } else if (!args.path) {
      args.path = a
      i++
    } else {
      i++
    }
  }
  return args
}

const HELP = `pixelstream — progressive image streaming CLI

USAGE
  pixelstream encode <path> [options]

OPTIONS
  --tiers <list>     Comma-separated widths (default: 64,256,1024)
  --format <fmt>     Output format: jpeg|webp|avif|png (default: keep source)
  --out <dir>        Output directory (default: alongside source)
  --quality <n>      JPEG/WebP/AVIF quality 1-100 (default: 80)
  --overwrite        Re-generate even if target file exists
  -h, --help         Show this help

EXAMPLES
  pixelstream encode src/images
  pixelstream encode src/images --tiers 96,384,1536
  pixelstream encode photo.jpg --format webp --quality 85
`

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || !args.command) {
    console.log(HELP)
    process.exit(args.help ? 0 : 1)
  }

  if (args.command !== "encode") {
    console.error(`Unknown command: ${args.command}`)
    console.error(HELP)
    process.exit(1)
  }

  if (!args.path) {
    console.error("Error: missing <path>")
    console.error(HELP)
    process.exit(1)
  }

  const options: ResizeOptions = {}
  if (args.tiers) options.tiers = args.tiers
  if (args.format) options.format = args.format
  if (args.outDir) options.outDir = args.outDir
  if (args.overwrite) options.overwrite = args.overwrite
  if (args.quality) options.quality = args.quality

  const startedAt = Date.now()
  const results = await resize(args.path, options)

  let totalGenerated = 0
  let totalBytes = 0
  for (const r of results) {
    if (r.generated.length === 0) continue
    console.log(`✓ ${r.source}`)
    for (const g of r.generated) {
      const kb = (g.bytes / 1024).toFixed(1)
      console.log(`    ${g.tier}w → ${g.path} (${kb} KB)`)
      totalGenerated++
      totalBytes += g.bytes
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2)
  const totalKb = (totalBytes / 1024).toFixed(1)
  console.log(
    `\nDone — ${totalGenerated} variant(s) across ${results.length} source(s), ${totalKb} KB total in ${elapsed}s`,
  )
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
