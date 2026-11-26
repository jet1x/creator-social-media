// Reusable transparent safe-zone overlay PNGs (reference layers for editing — NOT official platform overlays).
//   node make-overlays.mjs                       → the five 9:16 platform overlays
//   node make-overlays.mjs --preset yt-thumbnail,ig-feed-4x5 [--size WxH] [--out dir]
//   node make-overlays.mjs --all
// Each PNG: transparent background · DANGER AREA (red) · SAFE AREA (green frame) · UI zones · margin sizes in px ·
// platform name · canvas size · "internal guide" note. Default output: <skill>/overlays/<preset>-overlay.png
import fs from 'node:fs'
import path from 'node:path'
import { args, preset, report, sharp, SPECS, HERE } from './lib.mjs'

const DEFAULT = ['tiktok-9x16', 'ig-reels-9x16', 'fb-reels-9x16', 'linkedin-9x16', 'yt-shorts-9x16']
const a = args()
const names = a.all ? Object.keys(SPECS).filter((k) => !k.startsWith('_')) : a.preset && a.preset !== true ? String(a.preset).split(',') : DEFAULT
const outDir = path.resolve(a.out && a.out !== true ? a.out : path.join(HERE, '..', 'overlays'))
fs.mkdirSync(outDir, { recursive: true })
const r = report(`Safe-zone overlays → ${outDir}`)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function overlayPNG(p) {
  const { w, h, safe: s } = p
  const fs0 = Math.round(Math.sqrt(w * h) / 40)
  const T = (x, y, txt, size, anchor = 'middle', fill = '#fff') =>
    `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="${size}" text-anchor="${anchor}" fill="${fill}" stroke="rgba(0,0,0,.75)" stroke-width="${Math.max(2, size / 8)}" paint-order="stroke">${esc(txt)}</text>`
  const band = (size) => Math.min(fs0, Math.floor(size * 0.42))
  const top = s.y0, bottom = h - s.y1, left = s.x0, right = w - s.x1
  const parts = []
  // danger = everything outside the safe zone
  parts.push(`<path fill="rgba(255,30,30,.30)" fill-rule="evenodd" d="M0 0H${w}V${h}H0Z M${s.x0} ${s.y0}V${s.y1}H${s.x1}V${s.y0}Z"/>`)
  // platform UI zones (hatched)
  parts.push(`<defs><pattern id="hatch" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="18" fill="rgba(255,30,30,.35)"/></pattern></defs>`)
  for (const z of p.avoid ?? []) {
    parts.push(`<rect x="${z.x0}" y="${z.y0}" width="${z.x1 - z.x0}" height="${z.y1 - z.y0}" fill="url(#hatch)" stroke="#ff3030" stroke-width="3" stroke-dasharray="14 8"/>`)
  }
  // safe frame
  parts.push(`<rect x="${s.x0}" y="${s.y0}" width="${s.x1 - s.x0}" height="${s.y1 - s.y0}" fill="none" stroke="#2bff6a" stroke-width="${Math.max(3, Math.round(fs0 / 8))}"/>`)
  const cx = w / 2
  // labels
  const fsTop = band(top), fsBot = band(bottom)
  if (fsTop >= 12) {
    parts.push(T(cx, Math.round(top * 0.38 + fsTop * 0.35), `${p.platform} · ${w}×${h}`, fsTop))
    parts.push(T(cx, Math.round(top * 0.78 + fsTop * 0.35), `DANGER AREA · top ${top}px`, Math.round(fsTop * 0.8), 'middle', '#ffb3b3'))
  }
  if (fsBot >= 12) {
    parts.push(T(cx, Math.round(s.y1 + bottom * 0.4 + fsBot * 0.35), `DANGER AREA · bottom ${bottom}px`, fsBot, 'middle', '#ffb3b3'))
    parts.push(T(cx, Math.round(s.y1 + bottom * 0.75 + fsBot * 0.3), 'Internal design guide — not an official platform overlay', Math.round(fsBot * 0.6), 'middle', '#eee'))
  }
  const fsIn = Math.round(fs0 * 0.85)
  parts.push(T(s.x0 + fsIn * 0.5, s.y0 + fsIn * 1.4, 'SAFE AREA', fsIn, 'start', '#7dffa6'))
  if (fsTop < 12) parts.push(T(s.x0 + fsIn * 0.5, s.y0 + fsIn * 2.7, `${p.platform} · ${w}×${h}`, Math.round(fsIn * 0.7), 'start'))
  const fsSide = Math.round(fs0 * 0.6)
  const my = (s.y0 + s.y1) / 2
  // vertical UI zones (e.g. the action-button column) get their name; a side margin they cover is named with them
  const vertical = (p.avoid ?? []).filter((z) => z.y1 - z.y0 > (z.x1 - z.x0) * 1.5 && z.y1 - z.y0 >= fs0 * 6)
  const covers = (x) => vertical.find((z) => x >= z.x0 && x <= z.x1 && my >= z.y0 && my <= z.y1)
  const sideLabel = (x, txt) => `<g transform="translate(${x + fsSide * 0.35} ${my}) rotate(-90)">${T(0, 0, txt, fsSide)}</g>`
  const lx = left / 2, rx = s.x1 + right / 2
  if (left >= fsSide * 1.2 && !covers(lx)) parts.push(sideLabel(lx, `left ${left}px`))
  if (right >= fsSide * 1.2 && !covers(rx)) parts.push(sideLabel(rx, `right ${right}px`))
  for (const z of vertical) {
    const zw = z.x1 - z.x0, zh = z.y1 - z.y0
    const zx = z.x0 + zw / 2, zy = z.y0 + zh / 2
    const txt = zx === rx || covers(rx) === z ? `${z.name} · right ${right}px` : covers(lx) === z ? `${z.name} · left ${left}px` : z.name
    parts.push(`<g transform="translate(${zx + fsSide * 0.35} ${zy}) rotate(-90)">${T(0, 0, txt, Math.min(fsSide, Math.round(zw * 0.4)), 'middle', '#ffb3b3')}</g>`)
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${parts.join('')}</svg>`)
}

const platformOf = (name, p) => ({
  'tiktok-9x16': 'TikTok', 'ig-reels-9x16': 'Instagram Reels', 'fb-reels-9x16': 'Facebook Reels', 'yt-shorts-9x16': 'YouTube Shorts', 'linkedin-9x16': 'LinkedIn vertical video',
}[name] ?? p.label.split(/ \(| —/)[0])

for (const name of names) {
  try {
    const p = preset(name.trim(), a.size)
    p.platform = platformOf(p.name, p)
    const file = path.join(outDir, `${p.name}${a.size && a.size !== true ? '-' + p.w + 'x' + p.h : ''}-overlay.png`)
    await sharp(overlayPNG(p)).png({ compressionLevel: 9, palette: true }).toFile(file)
    const m = await sharp(file).metadata()
    m.width === p.w && m.height === p.h && m.hasAlpha ? r.ok(`${p.platform}: ${file} (${p.w}×${p.h}, transparent${p.tested ? '' : ', estimated zones'})`) : r.fail(`${file}: wrong size or no transparency`)
  } catch (e) { r.fail(`${name}: ${e.message}`) }
}
r.done()
