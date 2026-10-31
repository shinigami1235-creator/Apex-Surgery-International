# Apex Surgery Hospital redesign: shared brief for every agent

## The project

A redesign of https://www.apexsurgeryhospital.com, a plastic surgery hospital in Thailand (Phloen Chit, Bangkok and Phuket) that belongs to the Apex Medical Center group. The site is aimed at international clients first. Thai is the main language of the existing content and English is the priority for the new site, so everything ships in both.

The design is a static preview for GitHub Pages, and `wordpress/` turns it into the WordPress theme that goes live. Keep data separate from markup and keep every feature self-contained.

- Site root: `site/`
  - English pages at the root, Thai pages under `/th/`.
  - Shared assets in `/assets/`.
- Crawled source content (Thai, verbatim): `_source/crawl.json`.
  - `pages` is keyed by URL path.
  - Each entry has `blocks`, a list of `{t: type, x: text, src, h: link, alt}`.
  - Image paths starting with `~/` are relative to `https://www.apexsurgeryhospital.com/`.
- Review video files: `_source/videos.json`. Paths are relative to `https://www.apexsurgeryhospital.com/wp-content/uploads/`.
- Reference code from the group's main site, which already uses this design system: `_ref/` (not committed).
  - `apex.css`: design tokens and components.
  - `core.js`: page shell.
  - `atlas.js`: the particle face built from the MediaPipe canonical face mesh, using three.js.
  - `facemesh.js`: that mesh, as `window.FACEMESH`.
  - `whatif-core.js`: a face-landmark photo tool on @mediapipe/face_mesh.

## The seven procedures (service keys)

| key | Thai | English | Service page |
|---|---|---|---|
| facelift | ดึงหน้า | Facelift | `service.html?p=facelift` |
| browlift | ยกคิ้ว | Brow lift | `service.html?p=browlift` |
| rhinoplasty | เสริมจมูก | Rhinoplasty | `service.html?p=rhinoplasty` |
| eyelid | ทำตาสองชั้น | Double eyelid surgery | `service.html?p=eyelid` |
| bone | ศัลยกรรมโครงหน้า | Facial bone surgery | `service.html?p=bone` |
| breast | เสริมหน้าอก | Breast augmentation | `service.html?p=breast` |
| lipo | ดูดไขมัน | Liposuction | `service.html?p=lipo` |

Liposuction treatment areas on their site: abdomen, upper arms, thighs, waist and back, chin and jaw, hips and buttocks, calves.

### Recovery facts, from their own service pages

- **Facelift:** light activity after about 2 to 3 weeks. No strenuous exercise for 4 to 6 weeks. Results last about 7 to 10 years.
- **Brow lift:** initial recovery 7 to 14 days. No strenuous exercise for 4 to 6 weeks. Final shape at 3 to 6 months. Results last about 5 to 10 years.
- **Rhinoplasty:** rest at least 7 to 14 days. Swelling eases around 2 weeks. Shape settles in 1 to 3 months. Best result at 3 to 6 months. Soft food for 1 to 2 weeks.
- **Double eyelid:** swelling eases in 7 to 14 days. Final shape at 3 to 6 months. No alcohol for 1 month.
- **Breast augmentation:** soreness for 3 to 7 days. 5 to 7 days off work. Exercise after about 1 to 2 months.
- **Liposuction:** compression garment 24 hours a day for the first month, then daytime for 1 to 2 more months. Driving after 3 to 7 days. Results settle in 3 to 6 months.

## Design system

Reuse the tokens in `_ref/apex.css`.

| Token | Value |
|---|---|
| `--plum` | #6A388C |
| `--plum-700` | #55286F |
| `--night` | #1F0A30 |
| `--night-2` | #2A0F40 |
| `--lilac` | #A886CD |
| `--lilac-300` | #C9B3DD |
| `--lilac-100` | #F1EAF7 |
| `--wash` | #FBF3FB |
| `--ink` | #2A1F33 |
| `--ink-2` | #5A4A66 |
| `--on-night` | #F6EEFB |
| `--on-night-2` | #CDB9DD |
| Accent rose (from the surgery site) | #CC3366 |

- Font: "LINE Seed" (files in `site/assets/fonts/`), with fallbacks "Sarabun", "Noto Sans Thai" and system-ui.
- Radii: 12, 20 and 28px, plus pill.
- Easing: `cubic-bezier(.23,1,.32,1)`.
- The page shell (`site/assets/css/base.css`) already defines these variables on `:root`. A feature module can rely on them and must also set fallbacks so its demo page works alone.
- Do not use arch-shaped frames. The client has asked for a different motif.
- Respect `prefers-reduced-motion`.
- Layout: mobile first. It must work at 375px wide with a 16px side gutter and no horizontal scroll, and on desktop. Support touch and mouse.

## Feature module contract

Each interactive feature lives in `site/assets/features/<name>/`.

- `index.js` is an ES module exporting `mount(container, opts)`.
  - It injects its own CSS (a `<style>` tag or a sibling `.css` file loaded by the module).
  - It returns `{destroy()}`.
- `opts` fields:
  - `lang`: `'th'` or `'en'`.
  - `base`: URL of the `assets/` folder.
  - `serviceUrl(key)`: returns the link to a service page.
  - `onEvent(name, data)`: optional, used for analytics and My Plan, for example `onEvent('plan:add', {procedure:'rhinoplasty'})`.
- All UI strings live in the module in both English and Thai.
- Add a demo page `site/lab/<name>.html` that mounts the module full width with a TH/EN switch, for testing.
- External libraries are copied into `site/assets/vendor/` at exact pinned versions and served by the site, since code loaded from a CDN runs on pages with the camera open. The main site uses `three@0.160.0`, `@mediapipe/face_mesh@0.4.1633559619` and `@vladmandic/face-api@1.7.15` (see `site/assets/vendor/README.md`).
- Browser storage (localStorage) is allowed only for per-visitor conveniences. Wrap every read and write in try/catch so the feature works without it.
- Testing: Playwright with the preinstalled Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; do not run `playwright install`).
  - Serve the site with `npx http-server` or `python3 -m http.server`.
  - Take screenshots at 375x812 and 1440x900, look at them, and fix what looks wrong before finishing.

## Writing rules for every visible string (English and Thai)

The client is strict about this. Breaking these rules is a defect.

1. **Titles and labels are names, not sentences.** Examples: "Steady Hand", "Front view", "Consultation fee". A button is a short verb or noun.
2. **One line, one job.** Write each line either as a statement ("The treated area is the nose.") or as an instruction ("Upload a front photo."). Never write a clipped fragment followed by a sentence explaining it.
3. **No gloss sentences.** No sentence starting "That is", "This is" or "These are" whose only job is to label the sentence before it.
4. **No negative parallelism.** No "not X, but Y", no "X, not Y", and no two clipped sentences where the second contrasts the first. Join them with "while", "since" or "rather than", or state only the positive.
5. **No reassurance clauses.** Nothing like ", so nothing is lost" or "don't worry". The approved privacy line is exactly "No photo uploaded." and nothing more.
6. **Banned words:** simply, just, actually, truly, essentially, seamless, elevate, unlock, journey, crucial, vital, robust, delve, leverage, showcase, vibrant. Also no "Think of it as", "In other words" or "The whole point is".
7. **Dashes:** use a dash only where no other mark works. Write ranges with "to" ("7 to 14 days").
8. **Errors** name what failed and stop. Example: "The photo could not be read."
9. **Result screens say what changed:** score, level, prize. No quips or reaction beats.
10. **Simulations:** every simulator image is labelled "Simulation only". Results text elsewhere uses the client's phrase "Results may vary from person to person."
11. **No emoji.**

Thai strings follow the same rules: plain, polite Thai, short labels, no filler.

## Service and procedure accuracy

Medical statements must come from the client's own content in `crawl.json`. Do not invent prices, guarantees or claims. Thai advertising rules ban words like "best", "first", "guaranteed" and "free" in claims, so avoid them in anything you write.
