# Platform Specifications, Safe Zones & Quality Rules
(Protocol §1–7, §9–10. Machine-readable values: `tools/specs.json`.)

## 1. Platform identification
Before creating any design, identify: target platform · content format · intended placement · actual dimensions required · the platform's current safe zones · how the content will appear on desktop and mobile.

Supported: Facebook, Instagram, TikTok, YouTube, LinkedIn, X (Twitter), Pinterest, others on request.
**Never assume that all platforms use the same dimensions.**

## 2. Dimensions — quick reference

| Platform / placement | Size (px) | Ratio | Preset | Notes |
|---|---|---|---|---|
| Instagram feed 3:4 | 1080 × 1440 | 3:4 | `ig-feed-3x4` | Native since 2025 — fills the profile-grid tile exactly |
| Instagram feed portrait | 1080 × 1350 | 4:5 | `ig-feed-4x5` | Large in feed; profile grid trims a little from the sides |
| Instagram feed square | 1080 × 1080 | 1:1 | `ig-feed-1x1` | Profile grid (3:4) **cuts ~135 px from each side** |
| Instagram feed landscape | 1080 × 566 | ~1.91:1 | — | Small in feed; avoid unless needed |
| Instagram / Facebook Story | 1080 × 1920 | 9:16 | `story-9x16` | Top ~250 px and bottom ~340 px covered by UI |
| Reels / TikTok / FB Reels / YT Shorts | 1080 × 1920 | 9:16 | `reel-9x16` | Use TikTok's (strictest) safe zone for cross-posting |
| Reel / TikTok / FB Reel cover | 1080 × 1920 | 9:16 | `cover-9x16` | Grid shows 3:4 (IG & TikTok); feed may show 4:5 → keep content in y 290–1620 |
| Facebook feed post | 1080 × 1350 or 1080 × 1080 | 4:5 / 1:1 | `ig-feed-*` | |
| Facebook Page cover | 1640 × 624 (verify) | — | `fb-page-cover`* | Desktop and mobile crop differently |
| YouTube thumbnail | 1280 × 720 | 16:9 | `yt-thumbnail` | Duration badge bottom-right |
| YouTube channel banner | 2560 × 1440 | 16:9 | `yt-banner` | Official safe area 1546 × 423 (centre) |
| LinkedIn personal banner | 1584 × 396 (verify) | 4:1 | `linkedin-banner`* | Profile photo overlaps bottom-left |
| X header | 1500 × 500 (verify) | 3:1 | `x-header`* | Profile photo overlaps bottom-left |

\* = untested → check official docs before production and tell the user.
**These are starting references, not permission to ignore updated specifications.**

Facts confirmed (2026-11):
- Instagram's profile grid shows posts/reels as **3:4** (since January 2025), not square; native 3:4 (1080×1440) uploads since 2025.
- Facebook treats uploaded videos as Reels → 9:16 is the right default for FB video too.
- One 1080×1920 master can serve TikTok, Reels, FB Reels and Shorts, as long as it respects the strictest (TikTok) safe zone.

## 3. Safe-zone protocol — MANDATORY
Every design must have a clearly defined safe zone. Never position important elements outside it.

Protected elements: headlines · subtitles · logos · brand names · contact information · phone numbers · website URLs · faces · products · call-to-action buttons · important visual elements.

For vertical video (`reel-9x16`, tested in real productions):
- **Safe:** x 60–1020, y 200–1460.
- **Top 0–200:** tabs/search bar.
- **Bottom 1460–1920:** caption, username, music.
- **Right column x > 940 from y 880 down:** like/comment/share buttons.
- Instagram Reels and Facebook Reels are slightly more lenient; TikTok is the strictest → design to TikTok when cross-posting.

Do not use one universal safe-zone template for every format — calculate per placement (story ≠ reel ≠ cover ≠ feed).

## 4. Covers & profile visibility
When someone opens a profile or page, the cover must look professional and complete.
- Check desktop and mobile display, and every responsive crop.
- Keep all important text within the area visible in **all** views (for 9:16 reel covers: y 290–1620 = shared area of 3:4 grid and 4:5 feed).
- Keep logos and branding away from edges.
- Never let text disappear behind the profile picture (LinkedIn, X, Facebook).
- Use background extensions (decor, gradients, shapes) outside the safe zone — they may be cropped.
- YouTube banners: official safe area. Facebook covers: desktop vs mobile. LinkedIn: profile-image overlay.

**Never assume that uploading the correct image dimensions guarantees correct display.**

## 5. Video & reels quality control
All videos: correct aspect ratio · correct resolution · sharp and readable · properly framed · no accidental cropping · no stretched/distorted elements.

Check: text visibility throughout · subtitle positioning (not too close to the bottom) · logo positioning · transitions · intro/outro safe zones · UI overlays · cover/thumbnail appearance.

Proven technical rules (from real productions):
- **First frame = preview frame:** it must already show the complete hook text.
- **No flashes:** avoid luminance jumps > 9 (YAVG) between consecutive frames — fast white objects, screens turning on, glow sweeps across large flat surfaces cause them. `check-video.mjs` detects them.
- **Music:** deliver with a silent AAC track; the user adds trending/licensed audio inside the app (better reach, no copyright strikes). Never embed copyrighted music.
- **30 fps** H.264 High, yuv420p, AAC, MP4, `+faststart`.
- Text on screen: big enough to read on a phone (≥ 34 px body, ≥ 70 px headlines at 1080 width), on screen ≥ 1.5 s.

## 6. Professional design quality
Every design must look created by an experienced human graphic designer:
- Professional typography · strong visual hierarchy · balanced spacing · consistent alignment · proper contrast.
- Realistic photography or realistic 3D when appropriate · high-quality assets · consistent branding · clean composition.
- No unnecessary AI-looking elements · no distorted text or logos · no random decorative elements.
- Do not *automatically* use gradients, glow, excessive shadows or generic AI aesthetics — choose a style appropriate to the business and audience. **If the brand identity uses glow/gradients, follow the brand.**

## 7. Technical export requirements
Images: correct pixel dimensions and aspect ratio · JPG (or PNG only if transparency/flat graphics are needed) · sRGB · no visible compression artifacts · size per `file-size.md`.

Videos: MP4 · H.264 · AAC · correct resolution, frame rate and aspect ratio · bitrate per `file-size.md` · no black borders unless intentional.

Do not upscale low-quality assets and present them as native high-resolution designs.

## 9. Platform preview requirement
For every important cover, banner, post or video provide, when relevant:
1. Original exported design
2. Desktop preview
3. Mobile preview
4. Profile / feed thumbnail preview (crops)
5. Safe-zone overlay preview

`check-image.mjs` / `check-html.mjs` produce the overlay + crop sheet; `check-video.mjs` produces frames with UI overlays. Do not confuse the original artwork with the platform preview.

## 10. No-guessing policy
If specifications are uncertain or may have changed: check the latest official documentation; verify dimensions, safe zones and interface overlays; do not invent exact pixel measurements; **clearly identify any unverified specification** in the delivery.
