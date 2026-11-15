// MEASURES the position of text/logos/CTAs in a design built as HTML (static or animated).
//   node check-html.mjs <file.html | http://...> --preset <name> [--step 0.1] [--selector "css"]
//
// For every protected element (and at every time sample, if animated) it checks:
//   • inside the preset's safe zone      • not over platform UI zones ("avoid")
//   • text not clipped (overflow)         • not covering "obstacles" > 6% (if the page defines window.obstacles())
//
// Page contract (optional, for exact results):
//   [data-check]          → protected elements (default: h1-h4, p, li, a, button, img, .cta, .logo)
//   window.ready = true   → when loading is complete (fonts, 3D, images…)
//   window.renderAt(t, {noRender:true}) + window.DURATION → animated: checked every --step seconds
//   window.obstacles()    → [{name,x,y,w,h}] e.g. device screens / faces that text must not cover
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { args, preset, report, area, inter, zoneRect, qcDir, qcSheet } from './lib.mjs'

const { chromium } = createRequire(import.meta.url)('playwright')
const a = args()
const target = a._[0]
if (!target) { console.log('Usage: node check-html.mjs <file.html|url> --preset <name> [--step 0.1] [--selector "css"]'); process.exit(2) }
const p = preset(a.preset)
const r = report(`HTML: ${target} → ${p.label}`)
if (!p.tested) r.warn(`Preset "${p.name}" is NOT verified — check the platform's official docs`)

const isUrl = /^https?:/.test(target)
const url = isUrl ? target : pathToFileURL(path.resolve(target)).href
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(url, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
if (await page.evaluate(() => 'ready' in window)) await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 })
const animated = await page.evaluate(() => typeof window.renderAt === 'function' && typeof window.DURATION === 'number')
const dur = animated ? await page.evaluate(() => window.DURATION) : 0
const step = +(a.step ?? 0.1)

const collect = (sel) => {
  const pick = sel ? document.querySelectorAll(sel)
    : document.querySelectorAll('[data-check]').length ? document.querySelectorAll('[data-check]')
    : document.querySelectorAll('h1,h2,h3,h4,p,li,a,button,img,.cta,.logo')
  const out = []
  for (const el of pick) {
    let op = 1, n = el, hidden = false
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break }
      op *= +cs.opacity; n = n.parentElement
    }
    if (hidden || op < 0.5) continue
    const b = el.getBoundingClientRect()
    if (b.width < 2 || b.height < 2) continue
    out.push({
      text: (el.textContent || el.getAttribute('alt') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
      x: b.left, y: b.top, w: b.width, h: b.height, overflow: el.scrollWidth > el.clientWidth + 1,
    })
  }
  return { boxes: out, obstacles: typeof window.obstacles === 'function' ? window.obstacles().filter(Boolean) : [] }
}

const seen = new Map()
const note = (kind, key, t, detail) => {
  const id = kind + '|' + key
  const s = seen.get(id) ?? { kind, key, from: t, to: t, detail }
  s.to = t
  seen.set(id, s)
}
const safe = zoneRect(p.safe)
const avoid = (p.avoid ?? []).map((z) => ({ name: z.name, ...zoneRect(z) }))
const times = animated ? Array.from({ length: Math.floor(dur / step) + 1 }, (_, i) => Math.round(i * step * 1000) / 1000) : [0]
let checked = 0
for (const t of times) {
  if (animated) await page.evaluate((t) => window.renderAt(t, { noRender: true }), t)
  const { boxes, obstacles } = await page.evaluate(collect, a.selector ?? null)
  checked += boxes.length
  for (const b of boxes) {
    if (b.x < safe.x - 0.5 || b.y < safe.y - 0.5 || b.x + b.w > safe.x + safe.w + 0.5 || b.y + b.h > safe.y + safe.h + 0.5) note('outside safe zone', b.text, t, `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}`)
    for (const z of avoid) if (area(inter(b, z)) > 1) note(`over UI: ${z.name}`, b.text, t, '')
    if (b.overflow) note('clipped text', b.text, t, '')
    for (const o of obstacles) {
      const ov = area(inter(b, o)) / area(b)
      if (ov > 0.06) note(`covers ${o.name}`, b.text, t, `${Math.round(ov * 100)}%`)
    }
  }
}
if (!checked) r.fail('No elements found to check — add data-check or --selector')
else r.ok(`${checked} measurements at ${times.length} ${animated ? `time samples (0–${dur}s every ${step}s)` : 'snapshot'}`)
for (const e of errors) r.fail(`Page error: ${e}`)
for (const s of seen.values()) r.fail(`[${s.kind}] "${s.key}"${animated ? ` ${s.from.toFixed(1)}–${s.to.toFixed(1)}s` : ''} ${s.detail}`)
if (!seen.size && checked) r.ok('All protected elements inside the safe zone, clear of UI, not clipped')

if (!animated) {
  const shot = await page.screenshot({ type: 'png' })
  const base = isUrl ? 'page' : path.parse(target).name
  const sheet = await qcSheet(shot, p, path.join(qcDir(isUrl ? '.' : target), `${base}-qc.png`), p.name)
  r.ok(`Visual QC sheet: ${sheet}`)
}
await browser.close()
r.done()
