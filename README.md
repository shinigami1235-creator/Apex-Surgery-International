# Apex Surgery International

Redesign of apexsurgeryhospital.com for Apex. Thai pages sit at the root and English pages under `/en/`, each built from the same templates. This folder holds the design stage as plain pages for review on GitHub Pages. The WordPress theme comes next, once Apex's IT gives server access.

## Decisions

| Item | Decision |
|---|---|
| Platform | WordPress, since Apex's IT already runs the current site on it |
| Layout | Custom theme with fixed blocks editors fill in. No Elementor unless Apex asks for it |
| Order | Design first on GitHub Pages, then the WordPress theme |
| Languages | English first, Thai the same day. Thai keeps the current URLs and English goes under `/en/` |
| Translation | Done by us, priced as a small extra |
| Content | All of Apex's pages, 25 articles and reviews, and promotions are in the design |
| LINE reminders | The opt-in tick and frequency choice are in the design. Sending waits until Gid has discussed it with Apex |
| Pricing | ฿340,000 for the design stage and ฿210,000 for the WordPress stage, ฿550,000 in total. Implant size viewer later at ฿25,000 |

## Features in the design

| Feature | Page | Notes |
|---|---|---|
| Body map | Home | Male and female particle bodies from the MakeHuman base mesh (CC0). Tap an area to zoom in and see its procedures, concerns and recovery |
| Nose preview | `nose.html` | Front, 45 degree and profile photos, preset noses, drag handles, save to phone. Runs in the browser |
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
| `site/` | The site. Thai pages at the root, English in `site/en/` |
| `site/assets/data/th/`, `site/assets/data/en/` | All content as data files, one per page, service and article. These become the WordPress fields |
| `site/assets/features/` | One folder per interactive feature |
| `site/lab/` | Test pages for each feature |
| `build.py` | Rebuilds every HTML page in both languages. Run it after changing page templates or titles |
| `_source/crawl.json` | The content crawled from the live site on 21 Oct 2026 |
| `BRIEF.md` | Design tokens and writing rules |
| `REQUIREMENTS.md` | Apex IT's checklist and the status of each item |

## Current site findings

- Every page on the live site sends `noindex, nofollow` (checked 21 Oct 2026), which keeps the whole site out of Google. IT should fix this now.
- Five hidden pages are live, including `/test-lipo/` with "John Doe" placeholder reviews.
- Prices only appear inside promotion images.
- Some live URLs carry a typo (`/facelift-apex-sugery/`, `/liposuction-apex-sugery/`). Keep them working through redirects since they hold the current rankings.

## Before launch

1. Ask Apex whether the English pages, the nose preview and the game prizes need สบส. approval. The footer carries permit number ฆสพ.สบส.866/2569, which was issued for the Thai content.
2. Get Apex's own nose shapes and names to replace the placeholder presets.
3. Get Apex's prize list and confirm the score targets with a human playtest.
4. Confirm WhatsApp +66 85 000 2001 (the Apex group's international line) is the right number for this hospital.
5. Check the composite before/after images and set their layout.
6. Ask IT whether they prefer Polylang or WPML.
7. Review the articles the translators flagged. Several make claims the advertising rules may not allow, and some recovery times in the articles differ from the service pages:
   - "look up to 20 years younger";
   - "leader in facelift";
   - generic rhinoplasty market prices.
