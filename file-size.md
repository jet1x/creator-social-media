# File Size — small files, no visible quality loss

Platforms re-compress everything that is uploaded. Heavy files only make uploads slow and fail more often; they do not look better after upload. Deliver **small files**, keep a high-quality **master** separately.

## Targets

| Asset | Target | Hard limit | Method |
|---|---|---|---|
| Reel / Story / Short / TikTok video (≤ 60″) | **≤ 15 MB** (≈ 2.5–4 Mbps at 1080×1920) | 25 MB | light denoise + H.264 CRF 20–26 + AAC 128k + faststart |
| Longer video (YouTube etc.) | ≈ 4–8 Mbps for 1080p | — | same method, higher bitrate |
| Post / cover / story image | **≤ 500 KB** | 1 MB | JPG mozjpeg q 90→74, chroma **4:4:4** |
| Banner / YouTube thumbnail | ≤ 1 MB | 2 MB (YouTube thumbnail max) | same |
| Image that really uses transparency | ≤ 500 KB | 1 MB | PNG palette (quantized), max compression — PNGs with an unused alpha channel are converted to JPG |

## Rules
1. **Always compress with the tool**, which measures quality:
   `node <skill>/tools/compress.mjs <file> [--max-mb 15 | --max-kb 500]`
   It never overwrites the original; output is `<name>-small.mp4|jpg|png`.
2. **Video quality gate:** SSIM vs master **≥ 0.97**. Below that → raise `--max-mb` or shorten the video.
3. **Text-heavy graphics:** JPG must use chroma **4:4:4**. Default 4:2:0 smears coloured text edges (e.g. neon green on dark).
4. **Film grain / noise** is the biggest size driver in rendered video: a light denoise (hqdn3d) before encoding typically cuts 60–80% with no visible loss.
5. **After compressing, re-run** `check-video.mjs` / `check-image.mjs` on the compressed file, and visually compare a close-up crop (small text, dark gradients) — no blur, no banding.
6. Keep dimensions unchanged. Never reduce resolution to save size.
7. Report in the delivery: original size → final size, and the quality result (SSIM / visual check).

Reference result (3D-rendered reel, 28.5 s, 1080×1920): 58 MB → 10 MB, SSIM 0.976, no visible difference · cover PNG 2.3 MB → JPG 299 KB.
