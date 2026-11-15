// Image check (post / cover / story / banner / thumbnail).
//   node check-image.mjs <image> --preset <name> [--max-kb N]
// Checks: exact dimensions, format, colour space, file size.
// Writes: _qc/<name>-qc.png = full asset with safe zones + every platform crop (for visual review).
// Note: text POSITION is only measured for HTML designs (check-html.mjs). For a finished image, review the sheet.
import fs from 'node:fs'
import path from 'node:path'
import { args, preset, report, sharp, qcDir, qcSheet, fmtSize } from './lib.mjs'

const a = args()
const file = a._[0]
if (!file) { console.log('Usage: node check-image.mjs <image> --preset <name> [--max-kb N]'); process.exit(2) }
const p = preset(a.preset)
const r = report(`Image: ${path.basename(file)} → ${p.label}`)

const meta = await sharp(file).metadata()
const bytes = fs.statSync(file).size
if (!p.tested) r.warn(`Preset "${p.name}" is NOT verified — check the platform's official docs`)
meta.width === p.w && meta.height === p.h ? r.ok(`Dimensions ${meta.width}×${meta.height}`) : r.fail(`Dimensions ${meta.width}×${meta.height} — required ${p.w}×${p.h}`)
;['jpeg', 'png', 'webp'].includes(meta.format) ? r.ok(`Format ${meta.format}`) : r.fail(`Format ${meta.format} — use JPG or PNG`)
if (meta.format === 'webp') r.warn('WebP: some platforms reject it for upload — prefer JPG')
;(meta.space === 'srgb' || meta.space === 'b-w') ? r.ok(`Colour space ${meta.space}`) : r.warn(`Colour space ${meta.space} — convert to sRGB`)
if (meta.hasAlpha && meta.format === 'jpeg') r.warn('Transparency is lost in JPG')
const maxKB = +(a['max-kb'] ?? p.image?.maxKB ?? 500), hardKB = p.image?.hardMaxKB ?? maxKB * 2
if (bytes <= maxKB * 1024) r.ok(`File size ${fmtSize(bytes)} (target ≤ ${maxKB} KB)`)
else if (bytes <= hardKB * 1024) r.warn(`File size ${fmtSize(bytes)} > target ${maxKB} KB — run compress.mjs`)
else r.fail(`File size ${fmtSize(bytes)} > limit ${hardKB} KB — run compress.mjs`)
if (meta.width < p.w || meta.height < p.h) r.fail('Lower resolution than required — do NOT upscale; re-create at the right size')

const sheet = await qcSheet(fs.readFileSync(file), p, path.join(qcDir(file), `${path.parse(file).name}-qc.png`), `${p.name} · ${fmtSize(bytes)}`)
r.ok(`Visual QC sheet: ${sheet}`)
r.done()
