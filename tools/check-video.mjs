// Video check (reel / story / short).
//   node check-video.mjs <video.mp4> --preset <name> [--max-mb N] [--allow-cuts]
// Checks: dimensions, fps, H.264, yuv420p, AAC, MP4, faststart, duration, file size, black frames,
// flashes (sudden luminance jumps), hard cuts. Writes _qc/<name>-frames.png: frames with platform UI zones.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { args, preset, report, FFMPEG, sharp, overlaySVG, qcDir, fmtSize } from './lib.mjs'

const a = args()
const file = a._[0]
if (!file) { console.log('Usage: node check-video.mjs <video> --preset <name> [--max-mb N] [--allow-cuts]'); process.exit(2) }
const p = preset(a.preset)
const r = report(`Video: ${path.basename(file)} → ${p.label}`)
const v = p.video ?? { fps: [30], codec: 'h264', audio: 'aac', maxMB: 15, hardMaxMB: 25 }

const info = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr
const vs = /Stream #\S+.*Video: (\w+)(?: \(([^)]+)\))?[^,]*, (\w+)[^,]*,(?:[^,]*,)*? (\d+)x(\d+)/.exec(info)
const fps = +(/([\d.]+) fps/.exec(info)?.[1] ?? 0)
const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(info)
const dur = d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0
const bytes = fs.statSync(file).size
if (!vs) r.fail('No video stream found')
else {
  const [, codec, profile, pix, w, h] = vs
  ;+w === p.w && +h === p.h ? r.ok(`Dimensions ${w}×${h}`) : r.fail(`Dimensions ${w}×${h} — required ${p.w}×${p.h}`)
  codec === v.codec ? r.ok(`Codec ${codec}${profile ? ` (${profile})` : ''}`) : r.fail(`Codec ${codec} — required ${v.codec}`)
  pix === 'yuv420p' ? r.ok('Pixel format yuv420p') : r.fail(`Pixel format ${pix} — use yuv420p (otherwise it won't play everywhere)`)
}
v.fps.some((f) => Math.abs(f - fps) < 0.05) ? r.ok(`${fps} fps`) : r.fail(`${fps} fps — expected ${v.fps.join(' or ')}`)
;/Audio: aac/.test(info) ? r.ok('AAC audio') : /Audio:/.test(info) ? r.fail('Audio is not AAC') : r.warn('No audio track — add silent AAC or music')
r.ok(`Duration ${dur.toFixed(1)}s`)
;/\.mp4$/i.test(file) ? r.ok('MP4 container') : r.fail('File must be .mp4')
const head = Buffer.alloc(64 * 1024)
const fd = fs.openSync(file, 'r'); fs.readSync(fd, head, 0, head.length, 0); fs.closeSync(fd)
const moov = head.indexOf('moov'), mdat = head.indexOf('mdat')
moov >= 0 && (mdat < 0 || moov < mdat) ? r.ok('faststart (starts playing immediately on the web)') : r.warn('Not faststart — encode with -movflags +faststart')
const maxMB = +(a['max-mb'] ?? v.maxMB), hard = v.hardMaxMB ?? maxMB * 2
const mb = bytes / 1024 / 1024
if (mb <= maxMB) r.ok(`File size ${fmtSize(bytes)} (target ≤ ${maxMB} MB)`)
else if (mb <= hard) r.warn(`File size ${fmtSize(bytes)} > target ${maxMB} MB — run compress.mjs`)
else r.fail(`File size ${fmtSize(bytes)} > limit ${hard} MB — run compress.mjs`)

// per-frame luminance + scene-cut detection
const an = spawnSync(FFMPEG, ['-hide_banner', '-i', file, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG,scdet=threshold=14', '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr
const y = [...an.matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)].map((m) => +m[1])
const cuts = [...an.matchAll(/lavfi\.scd\.time: ([\d.]+)/g)].map((m) => +m[1])
const f = fps || 30
const black = y.map((val, i) => [val, i]).filter(([val]) => val < 6)
black.length ? r.fail(`Black frames: ${black.length} (e.g. ${(black[0][1] / f).toFixed(2)}s)`) : r.ok(`No black frames (${y.length} frames)`)
const flashes = []
for (let i = 1; i < y.length; i++) if (Math.abs(y[i] - y[i - 1]) > 9) flashes.push(`${(i / f).toFixed(2)}s (ΔY ${(y[i] - y[i - 1]).toFixed(1)})`)
flashes.length ? r.fail(`Flashes (sudden luminance jumps): ${flashes.length} → ${flashes.slice(0, 8).join(', ')}${flashes.length > 8 ? '…' : ''}`) : r.ok('No flashes')
if (cuts.length) (a['allow-cuts'] ? r.warn : r.fail)(`Hard cuts: ${cuts.map((c) => c.toFixed(2) + 's').join(', ')}${a['allow-cuts'] ? ' (allowed)' : ''}`)
else r.ok('No hard cuts')

// frame sheet with UI zones
const N = 8
const frames = []
for (let i = 0; i < N; i++) {
  const t = Math.min(dur - 0.05, (dur * (i + 0.5)) / N)
  const out = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', file, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 1 << 27 })
  if (!out.stdout?.length) continue
  const full = await sharp(out.stdout).resize(p.w, p.h, { fit: 'fill' }).composite([{ input: overlaySVG(p) }]).png().toBuffer()
  frames.push({ t, buf: await sharp(full).resize({ height: 640 }).png().toBuffer() })
}
if (frames.length) {
  const fw = Math.round((640 * p.w) / p.h)
  const W = frames.length * (fw + 12) + 12
  const labels = frames.map((fr, i) => `<text x="${12 + i * (fw + 12)}" y="30" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#fff">${fr.t.toFixed(1)}s</text>`).join('')
  const comps = [{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="40">${labels}</svg>`), left: 0, top: 0 }]
  frames.forEach((fr, i) => comps.push({ input: fr.buf, left: 12 + i * (fw + 12), top: 44 }))
  const sheet = path.join(qcDir(file), `${path.parse(file).name}-frames.png`)
  await sharp({ create: { width: W, height: 44 + 640 + 12, channels: 3, background: '#2a2a2a' } }).composite(comps).png().toFile(sheet)
  r.ok(`Frame sheet with UI zones: ${sheet}`)
}
r.done()
