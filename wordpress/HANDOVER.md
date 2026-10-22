# Apex Surgery Hospital website: WordPress handover

This is the new apexsurgeryhospital.com as a WordPress theme, in English and Thai. It is written for whoever installs and runs the site. Please read it once before you start and follow the steps in order on a staging copy first.

## What is in this folder

| Path | What it is |
|---|---|
| `theme/apex-surgery/` | The theme. Every page of the site is drawn by it. |
| `theme/apex-surgery/inc/` | The PHP, one file per job. `functions.php` lists them. |
| `import/` | The site's content in both languages, read by `wp apex import`. |
| `tools/build-theme.mjs` | Copies the styles, scripts, fonts and 3D files into the theme and refreshes `import/`. |
| `docker/` | A local copy of the site for testing. |
| `dist/apex-surgery-theme.zip` | The finished theme, ready to upload. |

The theme in the repository has no `assets/` folder. Build it with `node wordpress/tools/build-theme.mjs` from the repository root, or upload the zip in `dist/`, which already has everything.

## What the server needs

- WordPress 6.4 or newer. Tested on 6.8.3.
- PHP 8.0 or newer with the GD extension. Tested on PHP 8.3. Without GD the consultation form still sends, without the photos.
- MySQL 5.7+ or MariaDB 10.4+.
- HTTPS.
- WP-CLI for the content import. Most hosts have it. If yours does not, run the import on the Docker copy and move the database across.
- Outgoing email that works. Install WP Mail SMTP or the host's own mailer, since enquiry alerts go out with `wp_mail`.
- Polylang (the free plugin) 3.9 or newer.
- Rank Math is optional. With it the theme fills only the fields Rank Math leaves empty.

## Install

Do this on staging first. When staging passes the checks at the end, repeat on the live server.

1. Back up the live database and the whole `wp-content/uploads/` folder.
2. Start from a clean WordPress install with the live site's `wp-content/uploads/` copied in. The content refers to the same image files the live site uses, so the folder has to be there.
3. Install and activate Polylang: `wp plugin install polylang --activate`.
4. Upload the theme zip under Appearance › Themes, or copy `apex-surgery/` into `wp-content/themes/`, and activate it.
5. Import the content: `wp apex import`. It takes about 30 seconds and can be run again at any time. Each item is found by its key and language and updated in place.
6. Check the import: `wp apex check`. It should end with `All 100 content objects match the design`.
7. Add these lines to `wp-config.php`:

   ```php
   define( 'DISALLOW_FILE_EDIT', true );
   // only when the site sits behind Cloudflare and cannot be reached any other way
   define( 'APEX_IP_HEADER', 'HTTP_CF_CONNECTING_IP' );
   ```

8. On nginx, add the rules below. Apache reads the `.htaccess` files the theme writes, so it needs nothing.

   ```nginx
   location ^~ /wp-content/uploads/apex-private/ { deny all; }
   location ~* /wp-content/uploads/.*\.php$ { deny all; }
   ```

9. Fill in Apex settings in the admin:
   - **Forms:** the email addresses that get enquiry alerts. Leave it empty and the alerts go to the WordPress admin address, so check that address first.
   - **Tracking:** the Tag Manager container. It is set to GTM-WJQF6Z62.
   - **Games and prizes:** the three prizes and the score each game needs.
   - **Site settings:** check the phone numbers, LINE and WhatsApp in both languages.
10. Create the staff accounts (see Who can see what).

The import also sets the permalinks (`/%category%/%postname%/`), the Polylang settings, the front page and the time zone. Leave Polylang's URL settings as they are since the addresses below depend on them.

## Addresses

English is at the root and Thai is under `/th/`. The old site was Thai only and lived at the root, so every old address forwards to its Thai page with a 301.

| Page | English | Thai |
|---|---|---|
| Home | `/` | `/th/` |
| Services | `/services/` | `/th/surgery/` |
| One service | `/surgery/facelift/` | `/th/surgery/facelift-apex-sugery/` |
| Articles | `/articles/` | `/th/blogs/` |
| One article | `/reviews/<slug>/`, `/articles/<slug>/`, `/hospital-news/<slug>/` | `/th/review/<slug>/`, `/th/blog/<slug>/`, `/th/news/<slug>/` |
| Surgery Wars | `/surgery-wars/ep-3/` | `/th/surgery-wars/ep-3/` |

A first visit to `/` from a browser set to Thai goes to `/th/`. After that the visitor's own choice of language is kept.

Old addresses: `/about-us/` goes to `/th/about-us/`, `/review/smas/` to `/th/review/smas/`, `/facelift-apex-sugery/` to `/th/surgery/facelift-apex-sugery/`, and the same for every page, service and article of the old site. Apex settings › Redirects adds others and has a box to test any address.

## How the theme works

Each page is drawn in PHP from the same content structure the design used, with the same markup, so the design's styles and scripts run on it unchanged. The scripts add the behaviour (menus, galleries, filters, the 3D tools) to the page the server sent.

- `inc/schema.php` lists the fields of every content type. The admin forms, the importer and the templates all read it.
- `inc/data.php` builds each page's content from the posts, fields and settings and caches it. Any save clears the cache.
- `inc/render-pages.php` is a PHP copy of `assets/js/pages.js`. When one changes, change the other the same way and run `tests/wordpress/ssr.mjs`, which compares the two on every page.
- Articles, episodes and service sections are written in the block editor. Headings, paragraphs, lists, images, YouTube, tables, buttons and the Details block (for questions and answers) are the blocks the site draws.
- The page also prints its content as JSON for the scripts, and `?apex_data=<lang>/<id>` serves the same content to the tools that load it later. Only published content goes through it.

## Who can see what

| Role | Content | Enquiries and patient photos | Vouchers |
|---|---|---|---|
| Administrator | All | Yes | Yes |
| Apex staff | None | Yes | Yes |
| Editor | All | No | Check and mark as used |

Give the front desk and the patient coordinators the Apex staff role. Give an outside agency Editor, which keeps patient photos away from them.

## Enquiries and patient data

- The online consultation saves each enquiry as a private Enquiry and emails the team a reference number and a link. The email carries no name, contact, questions or photos.
- Photos are saved as new JPEGs no larger than 2400 px, with the camera data (including GPS location) removed, under `uploads/apex-private/` with random file names. Only Administrators and Apex staff can open them, from the enquiry screen.
- Enquiries are deleted after 365 days, photos included. Apex settings › Forms changes the number of days. Deleting an enquiry by hand deletes its photos too.
- Vouchers are deleted 90 days after they expire.
- Tools › Erase Personal Data finds enquiries by email address. Enquiries that came in by WhatsApp or LINE have to be deleted by hand from the Enquiries list.
- Backups copy `uploads/apex-private/` like any other folder. Keep backups encrypted and on the same retention period.
- The cookie banner holds back analytics and advertising cookies until the visitor accepts (Google Consent Mode v2). Tags in the Tag Manager container must use Consent Mode for this to hold.
- The events the site sends to Tag Manager (`apex_consult_submit`, `apex_plan_add`, `apex_contact_click` and others) carry the procedure, branch and button only.

## Spam and limits

- The consultation form has a hidden trap field and allows 6 enquiries an hour from one connection. Apex settings › Forms takes a Cloudflare Turnstile key for a visible check as well.
- Vouchers need a scored game of at least 10 seconds and are limited to 3 a day from one connection. The game runs on the visitor's phone, so a determined person can still fake a score. The reception check shows the code, name, prize and date, and marks the voucher used so it works once.
- After 8 wrong passwords for one username from one connection, that login waits 15 minutes.
- Behind Cloudflare or a load balancer every visitor arrives from the proxy's address. Set `APEX_IP_HEADER` (step 7) or the limits apply to everyone at once.

## Checks before going live

From the repository root, with the staging site at `$SITE`:

```bash
node tests/wordpress/ssr.mjs $SITE        # every page: the server's markup matches the scripts' (124 pages)
WP_PASS_FILE=... node tests/wordpress/admin.mjs $SITE   # opens and saves every edit screen, then wp apex check
WP_PASS_FILE=... node tests/wordpress/flows.mjs $SITE   # consultation, vouchers, redirects, page heads, cookie banner
AXE=.../axe.min.js node tests/wordpress/axe.mjs $SITE  # accessibility, WCAG 2 A and AA
```

The tests run with Playwright and need WP-CLI on the same machine. `WP_PASS_FILE` is a file holding the password of a test administrator called `apexadmin`. Delete that account afterwards.

Then by hand:

1. Send a consultation with a photo and check the alert email arrives.
2. Open the enquiry as an Apex staff user and see the photo.
3. Open `https://<site>/wp-content/uploads/apex-private/` in a private window. It must be refused.
4. Claim a voucher in a game and check it under Vouchers › Check a code.
5. Open five old addresses from Google Search Console and check each lands on its Thai page.
6. Submit the new sitemap (`/wp-sitemap.xml`) in Search Console.

## Updating the design later

The design (the `site/` folder) is still the source for styles, scripts and the 3D tools. After a change there, run `node wordpress/tools/build-theme.mjs` and upload the theme again. A change to page markup in `pages.js` also needs the same change in `inc/render-pages.php`, and `tests/wordpress/ssr.mjs` will say where they differ.

Thank you. Send me anything that does not match this and I will fix it.
