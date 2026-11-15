// Compression for social media without visible loss — with quality measurement.
//   node compress.mjs <input> [--out path] [--max-mb 15] [--max-kb 500] [--min-ssim 0.97]
//
// VIDEO: tries a ladder of settings (light denoise + H.264 CRF + AAC + faststart) and keeps the FIRST one
//        that fits the MB target. Measures SSIM against the original (≥ 0.97 = no visible difference).
// IMAGE: JPG (mozjpeg, chroma 4:4:4 so coloured text stays sharp), quality 90→74 until it fits the KB target.
//        Images with transparency → quantized PNG.
// The original is never modified (keep it as your master).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { args, report, FFMPEG, sharp, fmtSize } from './lib.mjs'

const a = args()
const input = a._[0]
if (!input) { console.log('Usage: node compress.mjs <input> [--out path] [--max-mb 15] [--max-kb 500] [--min-ssim 0.97]'); process.exit(2) }
const minSsim = +(a['min-ssim'] ?? 0.97)
const isVideo = /\.(mp4|mov|m4v|webm|mkv)$/i.test(input)
const r = report(`Compress: ${path.basename(input)}`)
const inBytes = fs.statSync(input).size

if (isVideo) {
  const out = path.resolve(a.out ?? input.replace(/(\.[^.]+)$/, '-small.mp4'))
  const maxMB = +(a['max-mb'] ?? 15)
  const info = spawnSync(FFMPEG, ['-hide_banner', '-i', input], { encoding: 'utf8' }).stderr
  const fps = Math.round(+(/([\d.]+) fps/.exec(info)?.[1] ?? 30))
  const hasAudio = /Audio:/.test(info)
  const LADDER = [
    { vf: 'hqdn3d=1.5:1.5:4:4', crf: 20, max: 6 },
    { vf: 'hqdn3d=2:2:5:5', crf: 22, max: 5 },
    { vf: 'hqdn3d=2:2:5:5', crf: 24, max: 4 },
    { vf: 'hqdn3d=2.5:2.5:6:6', crf: 26, max: 3 },
  ]
  let chosen = null, encoded = false
  for (const s of LADDER) {
    const ff = ['-hide_banner', '-loglevel', 'error', '-y', '-i', input]
    if (!hasAudio) ff.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-shortest')
    ff.push('-map', '0:v:0', '-map', hasAudio ? '0:a:0' : '1:a:0',
      '-vf', s.vf, '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-preset', 'slower', '-crf', String(s.crf),
      '-maxrate', `${s.max}M`, '-bufsize', `${s.max * 2}M`, '-x264-params', 'aq-mode=3:aq-strength=0.9',
      '-pix_fmt', 'yuv420p', '-g', String(fps * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out)
    const enc = spawnSync(FFMPEG, ff, { encoding: 'utf8' })
    if (enc.status !== 0) { r.fail(`ffmpeg: ${enc.stderr.slice(-400)}`); break }
    encoded = true
    const size = fs.statSync(out).size
    console.log(`  try CRF ${s.crf} / ${s.max} Mbps → ${fmtSize(size)}`)
    if (size <= maxMB * 1024 * 1024) { chosen = { ...s, size }; break }
  }
  if (chosen) {
    const ss = spawnSync(FFMPEG, ['-hide_banner', '-i', out, '-i', input, '-lavfi', '[0:v][1:v]ssim', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
    const ssim = +(/All:([\d.]+)/.exec(ss)?.[1] ?? 0)
    r.ok(`${fmtSize(inBytes)} → ${fmtSize(chosen.size)} (−${Math.round((1 - chosen.size / inBytes) * 100)}%) · CRF ${chosen.crf}`)
    ssim >= minSsim ? r.ok(`SSIM ${ssim.toFixed(4)} ≥ ${minSsim} (no visible difference)`) : r.warn(`SSIM ${ssim.toFixed(4)} < ${minSsim} — review a close-up crop or raise --max-mb`)
    r.ok(`Output: ${out}`)
    r.ok('Next: run check-video.mjs on the new file')
  } else if (encoded) r.fail(`Could not fit ${maxMB} MB even at the strongest setting — shorten the video or raise --max-mb`)
} else {
  const maxKB = +(a['max-kb'] ?? 500)
  const meta = await sharp(input).metadata()
  // PNG only if transparency is actually used (many exports carry an unused alpha channel)
  const png = meta.hasAlpha && !(await sharp(input).stats()).isOpaque && a.png !== 'false'
  const out = path.resolve(a.out ?? input.replace(/(\.[^.]+)$/, png ? '-small.png' : '-small.jpg'))
  let buf, q
  if (png) {
    for (q = 95; q >= 60; q -= 5) {
      buf = await sharp(input).png({ palette: true, quality: q, effort: 10, compressionLevel: 9 }).toBuffer()
      if (buf.length <= maxKB * 1024) break
    }
  } else {
    for (q = 90; q >= 74; q -= 2) {
      buf = await sharp(input).flatten({ background: '#ffffff' }).toColorspace('srgb').jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer()
      if (buf.length <= maxKB * 1024) break
    }
  }
  fs.writeFileSync(out, buf)
  r.ok(`${fmtSize(inBytes)} → ${fmtSize(buf.length)} (−${Math.round((1 - buf.length / inBytes) * 100)}%) · ${png ? 'PNG palette' : 'JPG 4:4:4'} q${q}`)
  buf.length <= maxKB * 1024 ? r.ok(`Within the ${maxKB} KB target`) : r.warn(`Above ${maxKB} KB even at the lowest acceptable quality — acceptable if ≤ 1 MB`)
  const [o, n] = await Promise.all([sharp(input).metadata(), sharp(buf).metadata()])
  o.width === n.width && o.height === n.height ? r.ok(`Dimensions unchanged ${n.width}×${n.height}`) : r.fail('Dimensions changed!')
  r.ok(`Output: ${out}`)
  r.ok('Next: run check-image.mjs on the new file and review the QC sheet')
}
r.done()
