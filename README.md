# CropProof

**Social media design & QA skill for Claude — nothing gets cropped, nothing hides behind the buttons.**

CropProof turns Claude into a social media designer, art director and copywriter that **measures** its own work before delivering it: exact platform sizes, safe zones, profile-grid and feed crops, video checks and small file sizes — for Instagram, TikTok, Facebook, YouTube, LinkedIn and X.

> A beautiful design that gets cropped when uploaded is a failed design.
> A correctly sized design with text hidden behind the like button is a failed design too.

![QC sheet: full cover with safe zone, Instagram/TikTok grid crop, feed crop](assets/qc-cover-sheet.jpg)
*`check-image.mjs` output: the full cover with the safe zone, then exactly what the profile grid (3:4) and the feed (4:5) will show.*

![Reel frames with TikTok / Reels UI zones](assets/qc-reel-frames.jpg)
*`check-video.mjs` output: frames across the reel with the platform UI zones (top bar, caption area, action buttons) overlaid.*

## Why

Most social media skills write posts. CropProof also **checks** them, with real measurements instead of "looks fine to me":

- **One concept, a real version per platform**: never a plain resize. Each platform (TikTok, Instagram, Facebook, LinkedIn, YouTube, X) gets its own adapted layout, its own safe zone, its own export folder and its own description.
- **Measured safe zones** — positions of headlines, logos and CTAs are measured in the rendered design (static *and* animated, every 0.1 s), not eyeballed.
- **Crop previews** — see the asset exactly as the Instagram/TikTok grid (3:4) and the feed (4:5) will show it.
- **Video QA**: dimensions, fps, H.264/yuv420p/AAC/MP4/faststart, SDR Rec.709, square pixels, progressive scan, black frames, flashes (sudden brightness jumps), hard cuts, and the opening and closing frames.
- **Safe-zone overlays**: transparent PNG reference layers for TikTok, Instagram Reels, Facebook Reels, LinkedIn and YouTube Shorts, to use while editing in Photoshop, Figma, Premiere or CapCut.
- **Small files, same look** — videos ≤ 15 MB and images ≤ 500 KB, with SSIM quality measurement (e.g. 58 MB → 10 MB, SSIM 0.976).
- **Human copy** — separate captions per platform, current hashtag rules (Instagram: max 5), no invented claims, no "unleash / elevate / next level".
- **Research-based strategy** — real topic/keyword/hashtag research (or clearly flagged as unverified), hook & share/save analysis, any of the six platforms you choose (FB, IG, TikTok, X, LinkedIn, YouTube Shorts & long-form), publishing order, A/B test, and the sources actually consulted. No invented trends, stats or "best times".
- **No guessing**: every preset is marked as tested or untested. Estimated safe zones are never presented as official, and untested specs must be verified and flagged.

## Install

Requirements: [Claude Code](https://claude.com/claude-code), Node.js ≥ 20, git.

The skill lives in [`.claude/skills/creator-social-media`](.claude/skills/creator-social-media). Skill URL for importers:
`https://github.com/jet1x/CropProof/tree/main/.claude/skills/creator-social-media`

**macOS / Linux** — install for all your projects
```bash
git clone https://github.com/jet1x/CropProof.git
mkdir -p ~/.claude/skills && cp -r CropProof/.claude/skills/creator-social-media ~/.claude/skills/
cd ~/.claude/skills/creator-social-media/tools
npm install && npm run setup && npm test
```

**Windows (PowerShell)** — install for all your projects
```powershell
git clone https://github.com/jet1x/CropProof.git
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse CropProof\.claude\skills\creator-social-media "$HOME\.claude\skills\"
cd "$HOME\.claude\skills\creator-social-media\tools"
npm install; npm run setup; npm test
```

**One project only:** copy `.claude/skills/creator-social-media` into `<your-project>/.claude/skills/`, then run the same `npm` commands in its `tools/` folder.

- `npm run setup` downloads the headless Chromium used for measuring HTML designs.
- `npm test` runs the self-test (14 checks: correct assets must pass, deliberately broken ones must fail).
- The tools use `sharp`, `playwright` and `ffmpeg-static` (~110 MB in `tools/node_modules`). If your npm blocks install scripts and ffmpeg is missing, run `npm rebuild ffmpeg-static`, or set `FFMPEG_PATH` to your own ffmpeg.

## Use

Just ask Claude for social media content — the skill loads automatically:

```
Make an Instagram + TikTok reel and covers announcing my new web app, with captions.
Create a YouTube thumbnail and a LinkedIn post for my case study.
Check this cover before I upload it: ./cover.png
```

Or call it directly with `/creator-social-media`.

Claude will: ask which platforms you want (unless you named them) → identify placements → verify specs → design → **run the measuring tools and fix until everything passes** → review the QC sheets → compress → deliver one folder per platform (assets + `caption.md`) with a QC report, plus the full copy package and publishing strategy.

## Tools

Run from `.claude/skills/creator-social-media/tools/` (Claude runs them for you; you can too):

| Command | What it does |
|---|---|
| `node check-html.mjs <design.html> --preset <p> [--size WxH] [--step 0.1]` | Measures protected elements in an HTML design (static or animated) vs safe zone, UI overlays, clipping, obstacles |
| `node check-image.mjs <image> --preset <p> [--size WxH]` | Dimensions, format, sRGB, file size + crop/safe-zone sheet in `_qc/` |
| `node check-video.mjs <video.mp4> --preset <p> [--size WxH] [--fps 30,60]` | Specs (incl. Rec.709, SAR 1:1, progressive), size, black frames, flashes, hard cuts, plus a frame sheet (opening to closing frame) with UI zones |
| `node compress.mjs <file> [--max-mb 15 \| --max-kb 500]` | Compresses with quality measurement; never overwrites the original |
| `node make-overlays.mjs [--preset a,b \| --all] [--size WxH]` | Transparent safe-zone overlay PNGs; by default the five 9:16 platform overlays in `overlays/` |

`--size WxH` scales any preset proportionally to a canvas with the same ratio (e.g. a 3840×2160 thumbnail).

Every tool prints ✓ / ⚠ / ✗ and `RESULT: PASS | FAIL` (exit code 1 on FAIL), so it fits in scripts and CI.

### HTML contract (for exact measurements)
- `data-check` on protected elements (headline, logo, CTA, URL…)
- `window.ready = true` when fonts/3D/images are loaded
- animations: `window.DURATION` (seconds) + `window.renderAt(t, { noRender })`
- optional `window.obstacles()` → `[{ name, x, y, w, h }]` — things text must not cover (device screens, faces)

### Presets (`tools/specs.json`)

| Preset | Size | For |
|---|---|---|
| `tiktok-9x16`* | 1080×1920 | TikTok video: 240 top / 660 bottom / 120 sides, plus the button column |
| `ig-reels-9x16`* | 1080×1920 | Instagram Reels: 269 / 672 / 65, plus the button column |
| `fb-reels-9x16`* | 1080×1920 | Facebook Reels: 217 / 415 / 100 left / 180 right |
| `yt-shorts-9x16`* | 1080×1920 | YouTube Shorts: 250 / 420 / 60 left / 190 right |
| `linkedin-9x16`* | 1080×1920 | LinkedIn vertical video: 10 % top and bottom / 5 % sides |
| `reel-9x16` | 1080×1920 | Generic vertical video, measured in real productions |
| `cover-9x16` | 1080×1920 | Reel / TikTok covers — content kept inside both the 3:4 grid and 4:5 feed crops |
| `story-9x16` | 1080×1920 | Instagram / Facebook Stories |
| `ig-feed-3x4` | 1080×1440 | Instagram feed — fills the profile-grid tile exactly |
| `ig-feed-4x5` | 1080×1350 | Instagram / Facebook feed portrait |
| `ig-feed-1x1` | 1080×1080 | Feed square (warning: the 3:4 grid cuts the sides) |
| `yt-thumbnail` | 1280×720 | YouTube thumbnail (duration badge zone) |
| `yt-banner` | 2560×1440 | YouTube banner (official 1546×423 safe area) |
| `fb-page-cover`* | 1640×624 | Facebook Page cover (desktop vs mobile crops) |
| `linkedin-banner`* | 1584×396 | LinkedIn profile banner (profile-photo overlap) |
| `x-header`* | 1500×500 | X header (profile-photo overlap) |
| `video-16x9`* | 1920×1080 | YouTube long-form / LinkedIn landscape video |
| `feed-landscape`* | 1080×566 | Instagram / Facebook landscape post |
| `link-preview`* | 1200×630 | Facebook link preview / Open Graph |
| `linkedin-landscape`* | 1200×627 | LinkedIn landscape post |
| `linkedin-company-cover`* | 4200×700 | LinkedIn Page cover (size per LinkedIn Help; logo overlap approximate) |
| `yt-community-16x9`* | 1280×720 | YouTube Community post |
| `yt-profile`* | 800×800 | YouTube profile picture (circle) |

\* untested: estimated values, often from third-party guidance rather than the platforms; Claude verifies them against official docs and flags them. Platform interfaces change: corrections via issues/PRs are welcome.

## What's inside

```
.claude/skills/creator-social-media/
├── SKILL.md            the protocol + workflow + checklist (loaded with the skill)
├── platform-specs.md   dimensions per platform, safe zones, multi-platform adaptation, covers, video QC, overlays
├── copywriting.md      per-platform deliverables, hashtag research, limits, human tone, CTA rules
├── strategy.md         research protocol, content analysis, publishing strategy, output format, QA
├── file-size.md        size targets and the compression method
├── overlays/           transparent safe-zone overlay PNGs (TikTok, IG Reels, FB Reels, LinkedIn, YT Shorts)
└── tools/              measuring, compression and overlay tools, presets, self-test
assets/                 README images
```

## Example

The images above are generated by the tools themselves from a demo cover and a 4-second demo reel (both built as HTML, measured with `check-html.mjs`, then checked with `check-image.mjs` / `check-video.mjs`). In real productions the same loop has been used on 3D-rendered case-study reels — e.g. a 28.5 s reel compressed from 58 MB to 10 MB at SSIM 0.976.

## License

MIT — see [LICENSE](LICENSE).
Not affiliated with Meta, TikTok, Google/YouTube, LinkedIn or X. Platform names are trademarks of their owners.
