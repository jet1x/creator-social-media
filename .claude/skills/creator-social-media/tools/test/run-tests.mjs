// Self-test: proves the tools catch real problems and pass correct assets.
//   npm test   (from the tools/ folder)
// Generates fixtures in a temp folder, runs every tool and compares against the expected outcome.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { FFMPEG, sharp } from '../lib.mjs'

const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cropproof-test-'))
const FIX = path.join(TOOLS, 'test', 'fixtures')
let failed = 0

function run(name, tool, argv, expect) {
  const res = spawnSync(process.execPath, [path.join(TOOLS, tool), ...argv], { encoding: 'utf8' })
  const out = res.stdout + res.stderr
  const pass = /RESULT: PASS/.test(out)
  const okResult = expect.result === 'PASS' ? pass : expect.result === 'ERROR' ? res.status !== 0 && !pass : /RESULT: FAIL/.test(out)
  const missing = (expect.contains ?? []).filter((s) => !out.includes(s))
  const ok = okResult && !missing.length
  console.log(`${ok ? '✓' : '✗'} ${name}`)
  if (!ok) {
    failed++
    console.log(`    expected ${expect.result}${missing.length ? `, missing: ${missing.join(' | ')}` : ''}\n${out.split('\n').map((l) => '    ' + l).join('\n')}`)
  }
}

// --- HTML (measured) ---
run('check-html: correct static design passes', 'check-html.mjs', [path.join(FIX, 'good.html'), '--preset', 'ig-feed-4x5'], { result: 'PASS' })
run('check-html: catches edge text, clipped text, text below safe zone', 'check-html.mjs', [path.join(FIX, 'bad.html'), '--preset', 'ig-feed-4x5'],
  { result: 'FAIL', contains: ['[outside safe zone] "Title at the edge"', '[clipped text] "A very long line that gets clipped"', '[outside safe zone] "Below the safe zone"'] })
run('check-html: animated — finds the exact time text falls under the TikTok caption', 'check-html.mjs', [path.join(FIX, 'anim.html'), '--preset', 'reel-9x16', '--step', '0.5'],
  { result: 'FAIL', contains: ['over UI: bottom caption/music/username', '2.0–3.0s'] })

// --- images ---
const big = path.join(TMP, 'cover.png')
await sharp({ create: { width: 1080, height: 1920, channels: 3, background: '#0b231c' } })
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${Array.from({ length: 400 }, (_, i) => `<circle cx="${(i * 97) % 1080}" cy="${(i * 211) % 1920}" r="${20 + (i % 30)}" fill="hsl(${i * 7},70%,50%)"/>`).join('')}</svg>`) }])
  .png({ compressionLevel: 0 }).toFile(big)
run('check-image: oversized PNG is flagged', 'check-image.mjs', [big, '--preset', 'cover-9x16'], { result: 'FAIL', contains: ['run compress.mjs'] })
run('compress: image fits the 500 KB target, dimensions unchanged', 'compress.mjs', [big, '--max-kb', '500'], { result: 'PASS', contains: ['Within the 500 KB target', 'Dimensions unchanged 1080×1920'] })
run('check-image: compressed image passes', 'check-image.mjs', [path.join(TMP, 'cover-small.jpg'), '--preset', 'cover-9x16'], { result: 'PASS' })
const wrong = path.join(TMP, 'wrong.jpg')
await sharp({ create: { width: 1080, height: 1080, channels: 3, background: '#333' } }).jpeg().toFile(wrong)
run('check-image: wrong dimensions are caught', 'check-image.mjs', [wrong, '--preset', 'cover-9x16'], { result: 'FAIL', contains: ['required 1080×1920'] })
const thumb = path.join(TMP, 'thumb.jpg')
await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#24324a' } }).jpeg().toFile(thumb)
run('check-image: --size scales a preset to a same-ratio canvas', 'check-image.mjs', [thumb, '--preset', 'yt-thumbnail', '--size', '1920x1080'], { result: 'PASS', contains: ['Dimensions 1920×1080'] })
run('check-image: --size with a different aspect ratio is refused', 'check-image.mjs', [thumb, '--preset', 'yt-thumbnail', '--size', '1080x1080'], { result: 'ERROR', contains: ['different aspect ratio'] })

// --- overlays ---
const ovDir = path.join(TMP, 'overlays')
run('make-overlays: five transparent 1080×1920 platform overlays', 'make-overlays.mjs', ['--out', ovDir], { result: 'PASS', contains: ['TikTok', 'Instagram Reels', 'Facebook Reels', 'LinkedIn vertical video', 'YouTube Shorts'] })

// --- video ---
const vid = path.join(TMP, 'reel.mp4')
spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x2a5a3a:s=1080x1920:d=2:r=30', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-shortest', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-movflags', '+faststart', vid])
run('check-video: correct reel passes', 'check-video.mjs', [vid, '--preset', 'reel-9x16'], { result: 'PASS', contains: ['SDR Rec.709', 'Square pixels', 'Progressive scan'] })
run('check-video: platform preset (TikTok) is checked and flagged as estimated', 'check-video.mjs', [vid, '--preset', 'tiktok-9x16'], { result: 'PASS', contains: ['NOT verified'] })
const sar = path.join(TMP, 'sar.mp4')
spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x2a5a3a:s=1080x1920:d=1:r=30', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-shortest', '-vf', 'setsar=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', sar])
run('check-video: non-square pixels are caught', 'check-video.mjs', [sar, '--preset', 'reel-9x16'], { result: 'FAIL', contains: ['SAR 2:1'] })
const flash = path.join(TMP, 'flash.mp4')
spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x2a5a3a:s=1080x1920:d=1:r=30', '-f', 'lavfi', '-i', 'color=c=white:s=1080x1920:d=1:r=30',
  '-filter_complex', '[0][1]concat=n=2:v=1[v]', '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', flash])
run('check-video: flash / hard cut / missing audio are caught', 'check-video.mjs', [flash, '--preset', 'reel-9x16'], { result: 'FAIL', contains: ['Flashes', 'No audio track'] })

fs.rmSync(TMP, { recursive: true, force: true })
console.log(failed ? `\n${failed} test(s) FAILED` : '\nAll tests passed ✓')
process.exitCode = failed ? 1 : 0
