# Apex Surgery International

Redesign of apexsurgeryhospital.com for Apex. English is the main language since the site is for international clients, so English pages sit at the root and Thai pages under `/th/`, each built from the same templates. This folder holds the design stage as plain pages for review on GitHub Pages. The WordPress theme comes next, once Apex's IT gives server access.

## Decisions

| Item | Decision |
|---|---|
| Platform | WordPress, since Apex's IT already runs the current site on it |
| Layout | Custom theme with fixed blocks editors fill in. No Elementor unless Apex asks for it |
| Order | Design first on GitHub Pages, then the WordPress theme |
| Languages | English at the root and Thai under `/th/` (changed 22 Oct 2026; Thai was at the root before). The current Thai URLs redirect to their `/th/` pages so they keep their rankings |
| Translation | Done by us, priced as a small extra |
| Content | All of Apex's pages, 25 articles and reviews, and promotions are in the design |
| LINE reminders | The opt-in tick and frequency choice are in the design. Sending waits until Gid has discussed it with Apex |
| Pricing | ฿765,000 in total (updated 22 Oct 2026). Design stage ฿535,000: the original ฿340,000, plus face analysis ฿75,000, golden proportions ฿40,000, Surgery Wars ฿25,000, the breast implant viewer ฿25,000 and the chin, forehead and nose implant viewers as a bundle at ฿30,000. The games are listed at ฿70,000 and given free. WordPress stage ฿230,000: the original ฿210,000 plus ฿20,000 for the episode post type and the new tool blocks. Moving English to the root is included at no charge |

## Features in the design

| Feature | Page | Notes |
|---|---|---|
| Body map | Home | Male and female particle bodies from the MakeHuman base mesh (CC0). Tap an area to zoom in and see its procedures, concerns and recovery |
| Nose preview | `nose.html` | Front, 45 degree and profile photos, preset noses, drag handles, save to phone. Runs in the browser |
| Golden proportions | `proportions.html` | A front photo is measured on five ratios and warped toward them: chin length (middle and lower face equal), nose width (equal to the gap between the eyes), lip balance (lower lip 1.6 times the upper), jawline (against the cheekbones, with a women and men ideal) and the golden ratio of mouth to nose. Only what treatment can change moves. Each change can be switched off, an amount slider sets the strength, and the saved image lists the ratios before and after. A golden spiral can be shown on the face and the saved image. Runs in the browser |
| Face analysis | `analysis.html` | A front photo, with two optional side photos at 45°, is read for fine lines, texture and pores, spots and evenness, redness, under the eyes, sagging and folds, shine, the upper lid fold and balance. Each gets a level and the area where it shows most, and the photo marks where it was found. A skin score, a skin age and the golden match sit above. Runs in the browser |
| Implant viewers | `breast-implants.html`, `chin-implants.html`, `forehead-implants.html`, `nose-implants.html` | One page per area, each with a 3D model beside the same model with the implant in, turned together by dragging, and the visitor's own photo as a second view. Breast: Motiva and Mentor sizes on a body of the visitor's height, weight and cup size. Chin, forehead and nose: silicone implant sizes in millimetres on a female or male face. Runs in the browser |
| Games | `play.html` | Steady Hand, Proportion, Fact Rush, Recovery Sort, Memory Match, Learn mode, daily tries, prize tiers, voucher with QR, LINE reminder opt-in |
| My Plan | `plan.html` | Procedures, vouchers, trip and notes. Sends to WhatsApp or LINE, or saves to phone |
| Trip planner | `trip.html` | Day-by-day stay with a calendar file |
| Online consultation | `consult.html` | Procedure, branch, dates, photos, consent. Sends through WhatsApp or LINE until the backend exists |
| Review stories | Service pages, reviews | Apex's own review videos in a swipe viewer |
| Before/after | Service pages | Gallery with the Thai caption the advertising rules require |
| Currency switch | Promotions, service pages | ECB rates of 20 Oct 2026, shown as approximate |

Score targets and prizes in `assets/features/games/config.js` are examples set from bot playtests. Apex replaces the prizes, and a short human playtest should confirm the targets.

## Folders

| Path | Contents |
|---|---|
| `site/` | The site. English pages at the root, Thai in `site/th/`. `site/en/` only forwards the old review links to the root |
| `site/assets/data/th/`, `site/assets/data/en/` | All content as data files, one per page, service and article. These become the WordPress fields |
| `site/assets/features/` | One folder per interactive feature |
| `site/lab/` | Test pages for each feature |
| `build.py` | Rebuilds every HTML page in both languages. Run it after changing page templates or titles |
| `_source/crawl.json` | The content crawled from the live site on 21 Oct 2026 |
| `BRIEF.md` | Design tokens and writing rules |
| `REQUIREMENTS.md` | Apex IT's checklist and the status of each item |

## Golden proportions

The ratios and their limits are in `site/assets/features/proportions/geometry.js`. The ideals are standard clinical proportions and the caps keep every change inside what surgery or filler can do: the chin moves at most 12% of the lower face, the nose narrows at most 18%, a lip fills by at most 35% and the jaw narrows by at most 10%. Apex's surgeons should check the ideals and caps, the women and men jaw ideals in particular, before launch. `tests/proportions/` runs it on eleven test photos.

The golden spiral is decoration and has no score, since a spiral can be scaled and turned to fit almost any face. It curls into the pupil of the eye nearer the camera, and its first arc passes through the bottom of the chin, so it sits the same way on every face and moves with the chin in the after picture.

## Face analysis

`site/assets/features/analysis/` has three parts. `skin.js` does the reading: it crops the face so the pupils sit 240 pixels apart, marks out the areas from the face mesh and keeps only pixels close to the skin colour, so hair, glasses and beards drop out. `factors.js` turns the readings into levels, the skin score and the skin age. `index.js` is the page. The reading runs in a background worker so the page keeps moving on slower phones, and takes about 3 to 4 seconds on a phone-speed CPU.

| Factor | How it is read |
|---|---|
| Fine lines | Thin dark lines on the forehead (side to side), between the brows (up and down), at the eye corners and under the eyes |
| Texture | Fine grain and pores on the cheeks, nose and forehead |
| Spots | Small patches darker and browner than the skin around them, and how evenly colour spreads |
| Redness | Skin that is redder in hue, so shade and darker skin do not count as red |
| Under the eyes | Darkness against the cheek below, and the hollow under the lid |
| Sagging | The folds beside the nose and below the mouth corners, mouth corners and brow height. Side photos add the jawline and the fold seen from the side |
| Upper lids | Whether a fold line shows above the lashes |
| Balance | Left and right mesh points mirrored across the middle of the face. Shown only when the face looks straight at the camera |

The ranges in `factors.js` were first set on 28 stock photos of people from their twenties to their eighties (`tests/analysis/faces/`, `tests/proportions/faces/`), then tightened on 22 October 2026 against 25 captures from Gid's Trica skin scanner, which scores each face itself, and against phone selfies. On the scanner set the skin score ranks faces in close agreement with the scanner's wrinkle score (Spearman 0.82), and the age read from the skin alone is within 5 years of the scanner's skin age on average. The scanner photos are patient photos, so they were used in the working session only and are not in this repository. A soft phone photo has its thresholds lowered to match, since phone smoothing flattens lines and pores. Apex's doctors should still check the levels against their own patients before launch.

The skin age comes from the age model in face-api (MIT licence, loaded from jsDelivr), weighed 60/40 with an age read from the skin readings and kept at 18 or over. The model reads young Asian women several years young, which is why it is not shown alone. The photo checks warn when the face is small, smoothed by a beauty mode, blurred, dimly or unevenly lit, or turned.

## Implant viewers

`site/assets/features/implants/` holds the four viewers. `index.js` is the page and takes the area from the page. `shapes.js` does the geometry, `scene.js` draws the 3D view with three.js, `photo.js` does the photo view and `catalog.js` holds the sizes.

- **Breast:** each implant is built as a height field with the catalogue's width, projection and height. Its edge is shaped so the volume matches the catalogue cc exactly, and soft-gel lines settle toward the lower pole. The tissue over it blurs the edge, and the result is added to the body along the chest wall, so each breast grows by the implant's volume (`tests/implants/volumes.mjs` checks this to within 2%). The body is scaled to the visitor's height and morphed for weight and current cup. A warning shows when the implant is wider than the breast base. "See the implant" shows the implant through the skin.
- **Chin, forehead and nose:** the implant is a thickness map in millimetres laid on the skin along its normal. The face is set to an average nasion-to-chin length (112 mm for women, 122 mm for men), so millimetres are true to an average face. The skin follows the implant at 90 to 95%.
- **Photo view:** a side photo of the face is traced against the wall to find the nose, lips and chin points. The visitor can drag any point. The breast uses a front photo with four points the visitor places, and the 3D view shows projection better.
- **Meshes:** `torso.bin` (282 KB) and `face.bin` (326 KB) are built from the MakeHuman base mesh (CC0, the same source and morphs as the body map) by `build/build_implants.py`.
- **Sizes:** Motiva Round and Ergonomix from Motiva's catalogue. Mentor MemoryGel, MemoryGel Xtra and the CPG teardrops from Mentor's 2021 EMEA catalogue. Chin and nose from the Implantech 2025 catalogue. Forehead from Park 2016 and Eppley. The sources are listed at the top of `catalog.js`.
- **To check with Apex:** which lines and sizes Apex stocks, whether Mentor's teardrop is sold in Thailand under the CPG or MemoryShape name, and the chin and nose shapes Apex's surgeons carve.
- **Estimate:** the L-shape tip lift is an estimate, since no maker publishes one, and the page says so.

## Surgery Wars

`surgery-wars.html` lists the eight episodes and `surgery-wars.html?ep=N` shows one: the YouTube video behind the episode cover, a photo strip that opens full screen, the article, the procedures it mentions and links to the other episodes. The home page has a rail of the episodes and the main menu links to the hub.

The articles and photos come from the writers' Google Docs and the "รูปไฟนอล" Drive folders (October 2026). `build/war_import.py` turns the docs into `data/<lang>/war.js` and `data/<lang>/war/<n>.js`. The English text is a translation of the Thai.

In WordPress this becomes a custom post type, "Surgery Wars", one post per episode:

| Field | Type |
|---|---|
| Episode number | Number, sets the order and the `EP.N` label |
| Title, card title | Text. The card title is the short line under the cover |
| YouTube link | URL. The ID is taken from it |
| Cover | Image, also the video poster and the Open Graph image |
| Article | Block editor, with images placed in the text |
| Photos | Gallery. Defaults to the images in the article |
| SEO title, meta description | Rank Math |

A new episode is one new post. The hub, the home rail, the episode buttons and the next and previous links update from the list.

## Current site findings

- Every page on the live site sends `noindex, nofollow` (checked 21 Oct 2026), which keeps the whole site out of Google. IT should fix this now.
- Five hidden pages are live, including `/test-lipo/` with "John Doe" placeholder reviews.
- Prices only appear inside promotion images.
- Some live URLs carry a typo (`/facelift-apex-sugery/`, `/liposuction-apex-sugery/`). Keep them working through redirects since they hold the current rankings.

## Before launch

1. Ask Apex whether the English pages, the nose preview, the face analysis (its skin score and skin age in particular), the implant viewers (they name Motiva, Mentor and Implantech) and the game prizes need สบส. approval. The footer carries permit number ฆสพ.สบส.866/2569, which was issued for the Thai content.
2. Get Apex's own nose shapes and names to replace the placeholder presets.
3. Get Apex's prize list and confirm the score targets with a human playtest.
4. Confirm WhatsApp +66 85 000 2001 (the Apex group's international line) is the right number for this hospital.
5. Check the composite before/after images and set their layout.
6. Ask IT whether they prefer Polylang or WPML. Either one sets English as the default language at the root and Thai under `/th/`. Each current Thai URL needs a 301 redirect to its `/th/` page, the typo URLs included.
7. Review the articles the translators flagged. Several make claims the advertising rules may not allow, and some recovery times in the articles differ from the service pages:
   - "look up to 20 years younger";
   - "leader in facelift";
   - generic rhinoplasty market prices.
8. The Surgery Wars docs say the hospital and the channel still had to check the text and photos. Confirm the final wording with Apex before launch. The writer's notes also say the raw footage may not be published yet; only the YouTube episodes are used.
