// Audio check for a finished video/audio file, or a raw voice recording.
//   node check-audio.mjs <file> [--events "9.67:bonk,7.0:phone"] [--timeline] [--source]
// Finished mix (default): integrated loudness, true peak, clipping, a quiet ending (fade or loudnorm dip),
//   silent gaps, and --events: each sound effect / line at that time must stand out over the 1.5 s before it.
// --source (raw recording, e.g. a voice take from a phone): clipping, peak, noise floor. Loudness is not judged.
// --timeline prints momentary loudness every 0.5 s.
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { args, report, FFMPEG } from './lib.mjs'

const a = args()
const file = a._[0]
if (!file) { console.log('Usage: node check-audio.mjs <file> [--events "t:label,..."] [--timeline] [--source]'); process.exit(2) }
const SRC = !!a.source
const r = report(`Audio: ${path.basename(file)}${SRC ? ' (raw recording)' : ''}`)

const info = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr
if (!/Audio:/.test(info)) { r.fail('No audio track'); r.done(); process.exit() }

// 1) samples (float, 48 kHz, every channel as it is) → sample peak and clipping runs per channel.
//    Never downmix with -ac 1 here: ffmpeg sums the channels, which reads up to +6 dB hot and reports clipping that is not there.
const ch = +((/Audio:.*?, (mono|stereo|(\d+) channels)/.exec(info) || [])[1] === 'mono' ? 1 : (/(\d+) channels/.exec(info) || [, 2])[1])
const pcm = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-vn', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 2 ** 31 - 1 }).stdout
const s = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.length / 4) * 4))
let peak = 0, runs = 0, hot = 0
const run = new Array(ch).fill(0)
for (let i = 0; i < s.length; i++) {
  const c = i % ch, v = Math.abs(s[i]); if (v > peak) peak = v
  if (v >= 0.98) hot++
  if (v >= 0.999) { if (++run[c] === 3) runs++ } else run[c] = 0
}
// Phone recorders soft-limit instead of flat-topping, so a voice that "breaks" shows many samples ≥ 98 % rather than runs at 100 %.
// Calibrated 26/11 on real takes: an audibly distorted line had 112 (32/s), clean takes 0, a borderline one 28.
const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity

// 2) EBU R128: momentary loudness every 0.1 s, integrated loudness, true peak
const eb = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 2 ** 28 }).stderr
const M = [...eb.matchAll(/t:\s*([\d.]+)\s+TARGET.*?M:\s*(-?[\d.]+)/g)].map((m) => ({ t: +m[1], m: +m[2] }))
const I = +(/I:\s*(-?[\d.]+) LUFS/.exec(eb.split('Summary')[1] || '') || [])[1]
const TP = +(/Peak:\s*(-?[\d.inf]+) dBFS/.exec(eb.split('Summary')[1] || '') || [])[1]
const dur = M.length ? M[M.length - 1].t : 0
const med = (xs) => { const v = xs.filter((x) => x > -70).sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : -120 }
const at = (t0, t1) => M.filter((x) => x.t > t0 && x.t <= t1).map((x) => x.m)

// clipping: always checked
if (runs) r.fail(`Clipped: ${runs} place(s) where the waveform hits full scale for 3+ samples. The recording/mix is distorted; record further from the mic or lower the gain, then re-mix (it cannot be cleaned)`)
else if (hot > 50) r.fail(`Distorted: ${hot} samples at ≥ 98 % of full scale (sample peak ${peakDb.toFixed(1)} dBFS). The recorder was overloaded; re-record further from the mic (it cannot be cleaned)`)
else if (hot >= 10 || peakDb >= -0.3) r.warn(`Sample peak ${peakDb.toFixed(1)} dBFS, ${hot} samples at ≥ 98 %: at the edge of clipping, listen for distortion`)
else r.ok(`No clipping (sample peak ${peakDb.toFixed(1)} dBFS)`)

if (SRC) {
  // raw recording: noise floor = quietest 10 % of momentary values
  const v = M.map((x) => x.m).filter((x) => x > -120).sort((p, q) => p - q)
  const floor = v.length ? v[Math.floor(v.length * 0.1)] : -120
  floor > -45 ? r.warn(`Noise floor ≈ ${floor.toFixed(0)} LUFS: noisy room (fan, AC, street); clean with highpass + denoise, or re-record`) : r.ok(`Noise floor ≈ ${floor.toFixed(0)} LUFS`)
  r.ok(`Duration ${dur.toFixed(1)}s`)
} else {
  // integrated loudness: social platforms normalise around -14 LUFS; -18…-11 is the safe range
  if (Number.isFinite(I)) I < -18 ? r.warn(`Integrated loudness ${I.toFixed(1)} LUFS: quiet next to other reels (aim −16…−13)`) : I > -11 ? r.warn(`Integrated loudness ${I.toFixed(1)} LUFS: very loud, the platform will turn it down and it may sound squashed`) : r.ok(`Integrated loudness ${I.toFixed(1)} LUFS`)
  if (Number.isFinite(TP)) TP > 0 ? r.fail(`True peak ${TP.toFixed(1)} dBTP: over 0, will distort after the platform's re-encode (use a limiter at −1.5)`) : TP > -1 ? r.warn(`True peak ${TP.toFixed(1)} dBTP: keep ≤ −1 dBTP for headroom`) : r.ok(`True peak ${TP.toFixed(1)} dBTP`)
  // quiet ending: last 1 s vs the body (catches loudnorm pulling down an abrupt ending, or a CTA lost under a fade)
  const body = med(at(0.5, dur - 1.2)), end = med(at(dur - 1.0, dur))
  if (dur > 3 && body > -60 && end < body - 12) r.warn(`Ending is ${(body - end).toFixed(0)} LU quieter than the body (last 1 s ≈ ${end.toFixed(0)} vs ${body.toFixed(0)} LUFS): fine if it is a planned fade; if a line/CTA is there, it is being lost (pad the voice before loudnorm, shorten the fade)`)
  else r.ok('Ending holds its level')
  // silent gaps inside the video
  let gap = 0, gapAt = -1, worst = 0, worstAt = 0
  for (const x of M) { if (x.t < 0.5 || x.t > dur - 0.5) continue; if (x.m < -45) { if (!gap) gapAt = x.t; gap += 0.1; if (gap > worst) { worst = gap; worstAt = gapAt } } else gap = 0 }
  worst >= 1.0 ? r.warn(`Silence of ${worst.toFixed(1)}s at ${worstAt.toFixed(1)}s: intended (a beat) or a missing sound?`) : r.ok('No silent gaps')
}

// events: each cue must stand out over what plays right before it
if (a.events && a.events !== true) {
  for (const ev of String(a.events).split(',')) {
    const [ts, label = ''] = ev.split(':'); const t = +ts
    const before = med(at(t - 1.5, t - 0.1)), hit = Math.max(-120, ...at(t, t + 0.7))
    const d = hit - before, name = `${label || 'event'} @ ${t.toFixed(2)}s`
    if (hit < -60) r.fail(`${name}: nothing audible there`)
    else if (d < 1.5) r.fail(`${name}: buried, only ${d >= 0 ? '+' : ''}${d.toFixed(1)} LU over the 1.5 s before it (${hit.toFixed(0)} vs ${before.toFixed(0)} LUFS). Raise it or duck the music under it`)
    else r.ok(`${name} stands out (+${d.toFixed(1)} LU)`)
  }
}

if (a.timeline) {
  const line = []
  for (let t = 0.5; t <= dur + 1e-6; t += 0.5) { const v = at(t - 0.5, t); line.push(`${t.toFixed(1)}:${v.length ? Math.max(...v).toFixed(0) : '-'}`) }
  r.ok(`Timeline (max momentary LUFS per 0.5 s): ${line.join(' ')}`)
}
r.done()
