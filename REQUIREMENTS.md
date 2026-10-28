# Apex Surgery requirements checklist

This is Apex IT's list (October 2026) with the status of each item. Tier: full CMS on WordPress, since Apex's IT team maintains the site.

**Key:** Design = covered in the current design stage. WordPress = built in the WordPress stage. Apex = Apex supplies or decides.

## CMS

| Item | Status |
|---|---|
| Admin for pages, services, doctors, branches, articles, promotions, reviews | WordPress. Every editable area in the design carries a `data-field` name for its WordPress field |
| Rich text editor H2 to H6, images, tables, links | WordPress block editor |
| Categories, tags, URL slugs, page templates | WordPress |
| Draft, preview, scheduled publish, revisions | WordPress |
| Roles, two-factor login for admins, activity log | WordPress |
| Custom code fields, admin only | WordPress, WPCode |
| Prices by country (raised by Apex IT on 28 Oct 2026) | WordPress, Apex settings › Prices by country, with a price, poster or hide per offer for each list. The price lists are Apex's to set |

## SEO

| Item | Status |
|---|---|
| Focus keyword, SEO title, meta description, canonical, index or noindex, Open Graph | Design has titles, descriptions, canonical and Open Graph per page. WordPress adds Rank Math, which Apex already uses |
| JSON-LD | Design: Hospital, MedicalClinic per branch, Physician, MedicalProcedure, Article, FAQPage, BreadcrumbList |
| Sitemap and robots.txt | WordPress, Rank Math |
| 301 and 302 redirects, old URL map | WordPress. Old URLs are listed in `_source/crawl.json` |
| Hreflang with x-default | Design |
| Server-rendered HTML | WordPress. The design renders in the browser and is for review only |
| 404 page | Design |
| Google Business Profile per branch | Apex |

## Media

| Item | Status |
|---|---|
| Media library with alt text per language | WordPress |
| WebP or AVIF, lazy loading | WordPress conversion plugin. Images in the design lazy-load |
| Video from YouTube or a CDN | Apex's review videos are uploaded MP4 files today. Move them to YouTube or a CDN in the WordPress stage |

## Tracking

| Item | Status |
|---|---|
| GTM with GA4, Google Ads, Meta Pixel | Apex's container GTM-WJQF6Z62 is on the live site. Added in the WordPress stage |
| Conversion events | Design: every feature sends events (`consult:submit`, `plan:add`, `nose:saved`, `game:end`, call, LINE and WhatsApp clicks) to `dataLayer` |
| Cookie consent with Consent Mode v2 | WordPress |

## Forms, privacy, accessibility

| Item | Status |
|---|---|
| Consultation form to Apex's inbox and the admin | Design has the form. WordPress connects the `send()` function to a real endpoint |
| Spam protection | WordPress, Turnstile and a honeypot |
| PDPA consent | Design has consent ticks on the consultation form and voucher claim |
| WCAG 2.2 AA | Design: keyboard access, focus styles, labelled fields. Full audit before launch |

## Performance and security

| Item | Status |
|---|---|
| Responsive | Design, tested at 375px and 1440px |
| Core Web Vitals | Body map, nose tool and games load only when opened. Measure on the live server |
| Cache, CDN, SSL | WordPress stage with Cloudflare |
| Staging copy, backups, uptime monitor | WordPress stage |

## Handover

| Item | Status |
|---|---|
| HANDOVER.md | Written in the WordPress stage |
| Source, database, admin access | WordPress stage |
