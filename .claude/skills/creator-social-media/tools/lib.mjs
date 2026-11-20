// Shared helpers for the CropProof tools.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

export const HERE = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
export const sharp = require('sharp')
/** Uses FFMPEG_PATH if set, otherwise the bundled ffmpeg-static binary. */
export const FFMPEG = process.env.FFMPEG_PATH || require('ffmpeg-static')
export const SPECS = JSON.parse(fs.readFileSync(path.join(HERE, 'specs.json'), 'utf8'))

/** --key value / --flag → object. Positional arguments in `_`. */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) out[k] = true
      else { out[k] = next; i++ }
    } else out._.push(a)
  }
  return out
}

const presetNames = () => Object.keys(SPECS).filter((k) => !k.startsWith('_')).join(', ')
/**
 * Loads a preset. With `size` ("WxH", e.g. from --size 3840x2160) every zone and crop is scaled
 * proportionally to that canvas — only allowed when the aspect ratio matches (±0.5%).
 */
export function preset(name, size) {
  if (!name || name === true) throw new Error(`Missing --preset. Available: ${presetNames()}`)
  const p = SPECS[name]
  if (!p) throw new Error(`Unknown preset "${name}". Available: ${presetNames()}`)
  const out = structuredClone({ name, ...p })
  if (!size || size === true) return out
  const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(String(size))
  if (!m) throw new Error(`--size must look like 3840x2160 (got "${size}")`)
  const w = +m[1], h = +m[2]
  if (Math.abs(w / h - p.w / p.h) / (p.w / p.h) > 0.005) throw new Error(`--size ${w}×${h} has a different aspect ratio than "${name}" (${p.w}×${p.h}) — use a matching preset or redesign`)
  const sx = w / p.w, sy = h / p.h
  const zone = (z) => ({ ...z, x0: Math.round(z.x0 * sx), x1: Math.round(z.x1 * sx), y0: Math.round(z.y0 * sy), y1: Math.round(z.y1 * sy) })
  out.w = w; out.h = h
  out.safe = zone(p.safe)
  if (p.avoid) out.avoid = p.avoid.map(zone)
  if (p.crops) out.crops = p.crops.map((c) => ({ ...c, x: Math.round(c.x * sx), y: Math.round(c.y * sy), w: Math.round(c.w * sx), h: Math.round(c.h * sy) }))
  out.label = `${p.label} — scaled to ${w}×${h}`
  return out
}

/** Collects check results → PASS / PASS (with warnings) / FAIL. Sets exit code 1 on FAIL. */
export function report(title) {
  const fails = [], warns = [], oks = []
  return {
    ok: (m) => oks.push(m),
    warn: (m) => warns.push(m),
    fail: (m) => fails.push(m),
    done() {
      console.log(`\n=== ${title} ===`)
      for (const m of oks) console.log(`  ✓ ${m}`)
      for (const m of warns) console.log(`  ⚠ ${m}`)
      for (const m of fails) console.log(`  ✗ ${m}`)
      const status = fails.length ? 'FAIL' : warns.length ? 'PASS (with warnings)' : 'PASS'
      console.log(`RESULT: ${status}`)
      process.exitCode = fails.length ? 1 : 0
      return status
    },
  }
}

export const qcDir = (file) => {
  const d = path.join(path.dirname(path.resolve(file)), '_qc')
  fs.mkdirSync(d, { recursive: true })
  return d
}
export const fmtSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`)

export const area = (r) => Math.max(0, r.w) * Math.max(0, r.h)
export const inter = (a, b) => ({ w: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) })
export const zoneRect = (z) => ({ x: z.x0, y: z.y0, w: z.x1 - z.x0, h: z.y1 - z.y0 })
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** SVG overlay: dims everything outside the safe zone, red UI zones, coloured crop frames. */
export function overlaySVG(p) {
  const { w, h, safe: s } = p
  const avoid = (p.avoid ?? []).map((a) => `<rect x="${a.x0}" y="${a.y0}" width="${a.x1 - a.x0}" height="${a.y1 - a.y0}" fill="rgba(255,40,40,.28)" stroke="#ff3030" stroke-width="3" stroke-dasharray="14 8"/>`).join('')
  const crops = (p.crops ?? []).map((c, i) => `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="none" stroke="${['#2fa8ff', '#ffb020', '#c070ff'][i % 3]}" stroke-width="4"/>`).join('')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <path fill="rgba(0,0,0,.45)" fill-rule="evenodd" d="M0 0H${w}V${h}H0Z M${s.x0} ${s.y0}V${s.y1}H${s.x1}V${s.y0}Z"/>
    ${avoid}${crops}
    <rect x="${s.x0}" y="${s.y0}" width="${s.x1 - s.x0}" height="${s.y1 - s.y0}" fill="none" stroke="#2bff6a" stroke-width="4"/>
  </svg>`)
}

/** QC sheet: [full asset + zone overlay] + [every platform crop, as it will appear]. */
export async function qcSheet(imageBuf, p, outFile, title = '') {
  const PANEL_H = 900
  const panels = []
  const base = await sharp(imageBuf).resize(p.w, p.h, { fit: 'fill' }).png().toBuffer()
  panels.push({ label: `FULL ${p.w}×${p.h}`, buf: await sharp(base).composite([{ input: overlaySVG(p) }]).png().toBuffer() })
  for (const c of p.crops ?? []) panels.push({ label: c.name, buf: await sharp(base).extract({ left: c.x, top: c.y, width: c.w, height: c.h }).png().toBuffer() })
  const scaled = await Promise.all(panels.map(async (pn) => {
    const r = await sharp(pn.buf).resize({ height: PANEL_H }).toBuffer({ resolveWithObject: true })
    return { ...pn, data: r.data, w: r.info.width }
  }))
  const GAP = 24, TOP = 70
  const W = scaled.reduce((s, x) => s + x.w + GAP, GAP)
  const labels = scaled.map((x, i) => {
    const left = scaled.slice(0, i).reduce((s, y) => s + y.w + GAP, GAP)
    return `<text x="${left}" y="54" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#fff">${esc(x.label)}</text>`
  }).join('')
  const legend = `${esc(title)} · green = safe zone · red = platform UI · coloured frames = crops`
  const head = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TOP}">${labels}<text x="${W - 20}" y="22" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="17" fill="#aaa">${legend}</text></svg>`)
  let x = GAP
  const comps = [{ input: head, left: 0, top: 0 }]
  for (const s of scaled) { comps.push({ input: s.data, left: x, top: TOP }); x += s.w + GAP }
  await sharp({ create: { width: W, height: TOP + PANEL_H + GAP, channels: 3, background: '#2a2a2a' } }).composite(comps).png().toFile(outFile)
  return outFile
}
