# Platform Specifications, Safe Zones, Multi-Platform Adaptation & Quality Rules
(Machine-readable values: `tools/specs.json`. Last reviewed 2026-11.)

## 1. Platform identification
Before designing anything, identify:
- the target platform(s), which the user chooses (`SKILL.md` §1);
- the content format and intended placement;
- the exact dimensions;
- the platform's current safe zones and interface overlays;
- how the asset appears on mobile, and on desktop where that differs.

Supported platforms: TikTok, Instagram, Facebook, LinkedIn, YouTube, X (Twitter) and Pinterest. **Never assume that all platforms use the same dimensions or safe zones.**

**Status labels used below:**
- **official**: from the platform's help center.
- **tested**: used and checked in real productions.
- **common**: the widely used industry size.
- **estimate**: third-party guidance, not published by the platform.

Report estimate values to the user as estimates, never as official specifications.

## 2. Dimensions per platform

### TikTok
| Asset | Size (px) | Ratio | Preset | Status |
|---|---|---|---|---|
| Video | 1080 × 1920 | 9:16 | `tiktok-9x16` | common · zones estimated |
| Cover | 1080 × 1920 | 9:16 | `cover-9x16` (grid crop) + `tiktok-9x16` | tested |
| Photo post / carousel | 1080 × 1350 | 4:5 | `ig-feed-4x5` (dimensions only) | common; TikTok's overlay on photos is unverified, so keep text away from the bottom third and the right column |

### Instagram
| Asset | Size (px) | Ratio | Preset | Status |
|---|---|---|---|---|
| Square post | 1080 × 1080 | 1:1 | `ig-feed-1x1` | tested; the profile grid (3:4) **cuts ~135 px from each side** |
| Portrait post | 1080 × 1350 | 4:5 | `ig-feed-4x5` | tested |
| Tall portrait | 1080 × 1440 | 3:4 | `ig-feed-3x4` | tested; fills the profile-grid tile exactly (native since 2025) |
| Landscape | 1080 × 566 | ~1.91:1 | `feed-landscape` | common; small in the feed, and the grid cuts most of it |
| Carousel | same size on **every** slide | — | as above | — |
| Reels | 1080 × 1920 | 9:16 | `ig-reels-9x16` | zones estimated (conservative) |
| Reel cover | 1080 × 1920 | 9:16 | `cover-9x16` | tested; the grid shows the central 3:4 |
| Story | 1080 × 1920 | 9:16 | `story-9x16` | tested |

### Facebook
| Asset | Size (px) | Ratio | Preset | Status |
|---|---|---|---|---|
| Square / portrait post | 1080 × 1080 / 1080 × 1350 | 1:1 / 4:5 | `ig-feed-1x1` / `ig-feed-4x5` (ignore the IG grid panel) | tested |
| Landscape | 1080 × 566 | ~1.91:1 | `feed-landscape` | common |
| Carousel | 1080 × 1080 | 1:1 | `ig-feed-1x1` | common |
| Reels | 1080 × 1920 | 9:16 | `fb-reels-9x16` | zones estimated |
| Stories | 1080 × 1920 | 9:16 | `story-9x16` | tested |
| Link preview | 1200 × 630 | 1.91:1 | `link-preview` | common |
| Page cover | 1640 × 624 | — | `fb-page-cover` | approximate; desktop and mobile crop differently |

Facebook treats uploaded videos as Reels, so 9:16 is the right default for Facebook video.

### LinkedIn
| Asset | Size (px) | Ratio | Preset | Status |
|---|---|---|---|---|
| Square / portrait post | 1080 × 1080 / 1080 × 1350 | 1:1 / 4:5 | `ig-feed-1x1` / `ig-feed-4x5` (ignore the IG grid panel) | common |
| Landscape post | 1200 × 627 | 1.91:1 | `linkedin-landscape` | common |
| Document carousel | 1080 × 1080 or 1080 × 1350, uploaded as a **PDF** | 1:1 / 4:5 | as above | common |
| Video, landscape | 1920 × 1080 | 16:9 | `video-16x9` | zones estimated |
| Video, portrait | 1080 × 1350 | 4:5 | `ig-feed-4x5` | common |
| Video, vertical | 1080 × 1920 | 9:16 | `linkedin-9x16` | zones estimated |
| Personal cover | 1584 × 396 | 4:1 | `linkedin-banner` | approximate; the profile photo overlaps bottom-left |
| Company (Page) cover | **4200 × 700** | 6:1 | `linkedin-company-cover` | **official** (LinkedIn Help). Some guides say 1512 × 256 or 1128 × 191; the official value wins. The logo overlap is approximate. |

### YouTube
| Asset | Size (px) | Ratio | Preset | Status |
|---|---|---|---|---|
| Shorts video | 1080 × 1920 | 9:16 | `yt-shorts-9x16` | zones estimated |
| Shorts cover | 1080 × 1920 | 9:16 | `cover-9x16` | tested. Use 2160 × 3840 (`--size 2160x3840`) **only** if the source really is 4K; never upscale. |
| Standard video | 1920 × 1080 | 16:9 | `video-16x9` | common |
| Standard thumbnail | **1280 × 720** | 16:9 | `yt-thumbnail` | **official recommendation**; duration badge bottom-right. 1920 × 1080 or 3840 × 2160 works via `--size` if kept ≤ 2 MB. "4K / 50 MB" limits are reported only by third parties. |
| Community post | 1080 × 1080 / 1280 × 720 | 1:1 / 16:9 | `ig-feed-1x1` / `yt-community-16x9` | common |
| Channel banner | 2560 × 1440 | 16:9 | `yt-banner` | official; safe area 1546 × 423 in the centre |
| Profile picture | 800 × 800 | 1:1, shown as a circle | `yt-profile` | common |

### X (Twitter) and Pinterest
| Asset | Size (px) | Preset | Status |
|---|---|---|---|
| X header | 1500 × 500 | `x-header` | approximate; the profile photo overlaps bottom-left |
| X in-feed image / video | 16:9 (1600 × 900 / 1920 × 1080) or 4:5 / 9:16 video | `video-16x9`, `ig-feed-4x5` | verify before production |
| Pinterest pin | 1000 × 1500 (2:3) | — | verify before production |

**These tables are starting references, not permission to ignore updated specifications** (see §11).

## 3. Safe zones (mandatory)
Every asset has a defined safe zone. Protected elements stay inside it: headlines, subtitles, logos, brand names, contact information, phone numbers, URLs, faces, products, CTAs and key visuals.

**The same 1080 × 1920 canvas has different safe zones on each platform:**

| Platform (1080 × 1920) | Top | Bottom | Left | Right | Preset | Status |
|---|---|---|---|---|---|---|
| TikTok | 240 | 660 | 120 | 120, plus the button column x > 940 from y 880 | `tiktok-9x16` | estimate (TikTok publishes template files, not pixel values) |
| Instagram Reels | 269 | 672 | 65 | 65, plus the button column | `ig-reels-9x16` | estimate (Meta ads guidance 14 % / 35 % / 6 %) |
| Facebook Reels | 217 | 415 | 100 | 180 | `fb-reels-9x16` | estimate (conservative end of 60–100 / 150–180) |
| YouTube Shorts | 250 | 420 | 60 | 190 | `yt-shorts-9x16` | estimate (conservative end of 230–250 / 350–420) |
| LinkedIn vertical | 192 (10 %) | 192 (10 %) | 54 (5 %) | 54 (5 %) | `linkedin-9x16` | estimate |
| Generic vertical (from real productions) | 200 | 460 | 60 | 60, plus the button column | `reel-9x16` | tested |
| Story | 250 | 340 | 60 | 60 | `story-9x16` | tested |
| Reel / TikTok cover | 290 | 300 | 30 | 30 | `cover-9x16` | tested: the area shared by the 3:4 grid and 4:5 feed crops |

### Strict safe-zone rules
1. Never place important text outside the safe zone.
2. Never place logos under interface buttons.
3. Never put subtitles at the very bottom; keep them above the platform's bottom zone.
4. Never place important information against the edges.
5. Keep faces and key subjects visible and uncovered by UI or text (`window.obstacles()` in `check-html.mjs`).
6. Always check the Instagram profile-grid crop (3:4).
7. Check the mobile preview for every platform.
8. Distinguish official specifications from estimated safe zones, in your own work and in the report.
9. On a different canvas size with the same ratio, scale zones proportionally (`--size WxH` on every tool).
10. When the interface position is uncertain, use the conservative margin (the presets above already do).

## 4. Multi-platform adaptation system (NON-NEGOTIABLE)
**Never create one design and simply resize it for every platform.** One master concept does not mean one identical design.

**Step 1: master asset.** Define the concept once: main subject, brand identity, typography, main message, visual hierarchy, brand colours and original composition.

**Step 2: platform versions.** Adapt the master separately for each chosen platform:
- **TikTok:** vertical-first, a strong first-frame visual, large readable headlines, TikTok's (strictest) zones.
- **Instagram:** the most visually polished version. The Reel cover must work in the 3:4 profile grid; aim for saves and shares.
- **Facebook:** made for Facebook's audience; readable on mobile, with text and layout fitted to Facebook's interface.
- **LinkedIn:** a genuinely different, professional adaptation: clean typography, credible business presentation. Do not copy TikTok or Instagram styling (no meme captions, no sticker-style text).
- **YouTube:** a Shorts-specific vertical version, plus a **separate 16:9 thumbnail** for standard videos.

**Step 3: reposition everything for each platform.**
- Headline, logo and subject position.
- Typography, text size and spacing.
- Image crop.
- Safe zones, recalculated per preset.
- Rebuild the composition when needed.

Never stretch or distort. Never crop important content to force a ratio. If a layout can't be adapted without losing information, **redesign it**.

**Step 4: separate export files.** Every platform gets its own final asset and its own description:

```
/<campaign>/
  captions.md              ← content analysis + publishing strategy + all copy (strategy.md §5)
  /tiktok/     video.mp4 · cover.jpg · caption.md
  /instagram/  reel.mp4 · reel-cover.jpg · feed-post.jpg · caption.md
  /facebook/   reel.mp4 · cover.jpg · feed-post.jpg · caption.md
  /linkedin/   video.mp4 · post.jpg · caption.md
  /youtube/    shorts.mp4 · shorts-cover.jpg · thumbnail.jpg · caption.md   (title, description, tags)
  /_master/    high-quality masters / source HTML
```

Create only the platforms the user chose and only the deliverables that fit the content type. Each platform's `caption.md` holds that platform's ready-to-paste copy, hashtags, pinned or first comment and CTA (`copywriting.md` §B).

**HTML implementation (recommended):** build one master HTML, with a layout variant per platform (e.g. `?platform=tiktok` switching CSS). Render each variant at its own size, then run `check-html.mjs` on each one with **that platform's preset**. One shared layout checked only against the loosest preset is not acceptable.

## 5. Covers & thumbnails
Treat every platform's cover as its own design:
- correct dimensions, a clear headline, strong hierarchy and professional typography;
- readable on a phone, positioned within the safe zone, consistent with the brand, and human-designed.

When someone opens a profile or page, the cover must look complete:
- **Instagram:** always check the Reel cover in the profile grid (3:4). For 9:16 covers, keep all important content in y 290–1620, the area visible in both the grid and the feed.
- **YouTube:** standard videos need a separate 16:9 thumbnail. Shorts need a vertical cover where supported. Use a 3–5 word headline, strong contrast and no tiny text, and keep it clear of the duration badge.
- **Banners and covers:**
  - YouTube banner: official safe area.
  - Facebook cover: desktop vs mobile.
  - LinkedIn and X: the profile photo or logo overlaps.
  - Never let text disappear behind a profile picture.
- Background extensions (decor, shapes) may sit outside the safe zone; they can be cropped.

**Never assume that the correct upload size guarantees correct display.**

## 6. Video production & QC
**Export:**
- MP4 · H.264 High · yuv420p · AAC · `+faststart`.
- **30 fps**; 60 fps only if the source requires it. Use `--fps` for other legitimate rates.
- **SDR Rec.709** (tagged bt709), **square pixels (SAR 1:1)**, **progressive**.
- No unintentional black borders, no distortion, and **no platform watermarks**. Never re-upload a TikTok-watermarked download to Reels or Shorts; export a clean file for each platform.

`check-video.mjs` verifies all of the above.

**For each platform version:**
- Check that platform's UI overlays (its own preset).
- Reposition subtitles, text and graphics.
- Check the **opening frame**, which is also the preview frame and must show the full hook, and the **closing frame**. Both are labelled OPEN and END in the frame sheet.

**Rules proven in real productions:**
- **No flashes:** avoid luminance jumps > 9 (YAVG) between frames. Fast white objects, screens turning on, and glow sweeps across large flat surfaces cause them.
- **Music:** deliver two files: one with licensed or royalty-free music (and the sound effects), and a `-no-music` version (silent AAC, or only the voice/key effects) so the user can add trending audio inside the app. Never embed copyrighted music.
- **Audio levels:** check every delivered video with `tools/check-audio.mjs`: voice and important effects must stand out over the music (`--events`), no clipping, true peak ≤ −1 dBTP, end the mix with a limiter at ≈ −2.5 dBFS (AAC overshoots on transients).
- **Readable on a phone:** body text ≥ 34 px and headlines ≥ 70 px at 1080 px wide, on screen for ≥ 1.5 s.
- Check transitions, intro and outro safe zones, and subtitle positioning throughout.

## 7. Design quality
The output must look made by an experienced human designer, not like generic AI content.

**Avoid:**
- generic AI templates and repetitive stock-style layouts;
- random gradients, excessive glow or shadows, and unnecessary neon;
- overloaded compositions and random decorative elements;
- unprofessional typography;
- distorted text or logos.

**Prioritize:**
- professional art direction and natural composition;
- strong typography, clear visual hierarchy, and balanced spacing and alignment;
- proper contrast;
- realistic photography (or realistic 3D) and high-quality assets;
- consistent branding and clean, intentional layouts.

**Brand first:** if the brand identity uses glow or gradients, follow the brand. The "no automatic glow" rule applies only without brand guidance.

## 8. Technical export
**Images:**
- exact pixel dimensions and ratio;
- JPG (PNG only for transparency or flat graphics);
- sRGB;
- no visible artifacts;
- size per `file-size.md`.

**Videos:** see §6, with bitrate per `file-size.md`.

**Never upscale low-quality assets** and present them as native high resolution.

## 9. Validation before every export
For each asset:
1. canvas dimensions;
2. content format;
3. the platform's UI overlays;
4. all important text;
5. logos;
6. subtitles;
7. faces and main subjects;
8. the cover crop(s);
9. mobile readability;
10. the final export dimensions.

If anything important overlaps a danger zone: **fix its position → re-render → validate again.**

Previews for every important asset:
- the original export;
- the safe-zone overlay;
- profile-grid and feed crops;
- mobile, and desktop where they differ.

`check-image.mjs` and `check-html.mjs` produce the overlay and crop sheet; `check-video.mjs` produces frames with UI overlays. Don't confuse the artwork with the preview. **Never claim validation passed unless the final asset was actually inspected.**

## 10. Safe-zone overlay templates
`node tools/make-overlays.mjs` builds transparent 1080 × 1920 PNG reference layers in `overlays/` for TikTok, Instagram Reels, Facebook Reels, LinkedIn vertical video and YouTube Shorts. Each one shows:
- SAFE AREA (green frame) and DANGER AREA (red);
- the platform's UI zones (hatched);
- the top, bottom, left and right margins in px;
- the platform name and canvas size;
- the note "Internal design guide — not an official platform overlay".

Any preset works (`--preset yt-thumbnail,ig-feed-4x5`, `--all`, `--size WxH`). Use them as a top layer while editing in Photoshop, Figma, Premiere or CapCut. They are **internal guides**, not platform-provided overlays.

## 11. Official verification & no guessing
When a project needs exact or current requirements, check official documentation first:
- TikTok Business Help Center (safe-zone template files);
- Meta Business Help Center / Ads Guide;
- Instagram Help Center;
- LinkedIn Help Center;
- YouTube Help Center.

- Never present estimated safe zones as official specifications.
- If an official spec differs from these tables, **the latest verified official spec wins**: use it, tell the user what changed, and update `tools/specs.json`.
- Never invent exact pixel measurements. **Clearly identify every unverified value** in the delivery.
