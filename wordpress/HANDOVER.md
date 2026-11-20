# Apex Surgery Hospital website: WordPress handover

This is the new apexsurgeryhospital.com as a WordPress theme, in English and Thai. It is written for whoever installs and runs the site. Please read it once before you start and follow the steps in order on a staging copy first.

## Who does what

- **Apex's IT team** sets up the hosting, staging and live, and installs the site with the steps below. The server, the domain, SSL, email sending, backups and plugin updates are theirs to run.
- **Apex's staff** edit the content in WordPress: prices, offers, before and after photos, doctors, articles, prizes, stay days, wording. Nothing in this list needs a developer.
- **Approvals** (the advertising approval, the legal review, signing off the English and Chinese text) are Apex's. The site is handed over for Apex to check.
- **Gid** sends bigger changes, a new tool or a new page design, as a new theme zip. "Updating the theme" at the end says how to install one without losing anything.

## What is in this folder

| Path | What it is |
|---|---|
| `theme/apex-surgery/` | The theme. Every page of the site is drawn by it. |
| `theme/apex-surgery/inc/` | The PHP, one file per job. `functions.php` lists them. |
| `tools/build-theme.mjs` | Copies the styles, scripts, fonts and 3D files into the theme, writes the site's content in both languages to `theme/apex-surgery/import/` for `wp apex import`, and builds `dist/apex-surgery-theme-<version>.zip`. |
| `docker/` | A local copy of the site for testing. |

The theme in the repository has no `assets/` or `import/` folder. Build it with `node wordpress/tools/build-theme.mjs` from the repository root, or use the `apex-surgery-theme-<version>.zip` Gid sent, which already has everything.

## What the server needs

- WordPress 6.4 or newer. Tested on 6.8.3.
- PHP 8.0 or newer with the GD extension. Tested on PHP 8.3. Without GD the consultation form still sends, without the photos.
- MySQL 5.7+ or MariaDB 10.4+.
- HTTPS.
- WP-CLI for the content import. Most hosts have it. If yours does not, run the import on the Docker copy and move the database across.
- Outgoing email that works. Install WP Mail SMTP or the host's own mailer, since enquiry alerts go out with `wp_mail`.
- Two-step login for every Administrator and Apex staff account, since those accounts open patient photos: the Two Factor plugin or Wordfence Login Security. Print each person's backup codes when they set it up, and keep one Administrator's codes in the office safe, or a lost phone locks that person out.
- Polylang (the free plugin) 3.9 or newer.
- Rank Math (the free plugin). The theme writes titles, descriptions, canonicals and structured data by itself. Rank Math adds what editors need page by page: a focus keyword, a canonical or noindex for one page, extra schema, and editing robots.txt. The theme fills any Rank Math field an editor leaves empty.
- A daily backup of the database and `wp-content/uploads/`, `apex-private/` included: the host's own backup, or UpdraftPlus sending to cloud storage. Keep 30 days.
- A page cache: the host's own, or a plugin such as LiteSpeed Cache or WP Super Cache. Leave logged-in users and `/wp-json/` out of it, which is the default in all of them. The cookie banner and the forms work with a cached page.
- Gzip or Brotli on HTML, CSS, JavaScript and SVG, and a one-year browser cache on the theme's files and the uploads. Most hosts and Cloudflare do both already; step 8 has the lines for a server that does not. Without compression a page sends about four times the bytes.

## Install

Do this on staging first. When staging passes the checks at the end, repeat on the live server.

1. Back up the live database and the whole `wp-content/uploads/` folder.
2. Start from a clean WordPress install with the live site's `wp-content/uploads/` copied in. The content refers to the same image files the live site uses, so the folder has to be there.
3. Install and activate Polylang: `wp plugin install polylang --activate`.
4. Upload the theme zip under Appearance › Themes, or copy `apex-surgery/` into `wp-content/themes/`, and activate it. The zip is about 49 MB since it carries the face tracking and 3D libraries, so copy the folder over SFTP if the host's upload limit is smaller.
5. Import the content: `wp apex import`. It takes about a minute and can be run again at any time. Each item is found by its key and language and updated in place. At the end it saves a WebP copy of each JPEG and PNG photo the pages show (the old site had ten, up to 1.2 MB each) and makes phone-size copies of wide photos, named `photo-w800.webp` and `photo-w1200.webp`, next to the originals. Phones download those instead of the full photo. The originals stay where they are.
6. Check the import: `wp apex check`. It should end with `All 110 content objects match the design`.
7. Add these lines to `wp-config.php`:

   ```php
   define( 'DISALLOW_FILE_EDIT', true );
   // only when the site sits behind Cloudflare and cannot be reached any other way
   define( 'APEX_IP_HEADER', 'HTTP_CF_CONNECTING_IP' );
   // the daily jobs (deleting old enquiries, the social feed) run from the server's clock rather than on visits
   define( 'DISABLE_WP_CRON', true );
   ```

   With `DISABLE_WP_CRON`, add a cron job on the server that runs every 15 minutes: `wp cron event run --due-now --path=/path/to/wordpress`. Without it, the daily deletion of old enquiries waits for visitors.

   Two optional lines:

   ```php
   // patient photos outside the public web folder (recommended). Make the folder first, writable by PHP.
   define( 'APEX_PRIVATE_DIR', '/home/apex/private-photos' );
   // HTTPS only. Browsers remember it for this many seconds, so start with a day and raise it to a year after a week.
   define( 'APEX_HSTS', 86400 );
   ```

   Set `APEX_PRIVATE_DIR` before the first enquiry arrives. If enquiries already exist, back up `wp-content/uploads/apex-private/` and the database first, then move the folder's contents into the new folder, keeping the year and month folders, since staff cannot open a photo whose file is missing. Set `APEX_HSTS` only once every address of the site works over HTTPS.

8. On nginx, add the rules below. Apache reads the `.htaccess` files the theme writes, so it needs nothing.

   ```nginx
   location ^~ /wp-content/uploads/apex-private/ { deny all; }
   location ~* /wp-content/uploads/.*\.php$ { deny all; }
   location = /xmlrpc.php { deny all; }
   location ~* ^/(readme\.html|license\.txt)$ { deny all; }
   ```

   On Apache the same three lines go in the site's `.htaccess`:

   ```apache
   <Files xmlrpc.php>
     Require all denied
   </Files>
   <FilesMatch "^(readme\.html|license\.txt)$">
     Require all denied
   </FilesMatch>
   ```

   In `php.ini`, set `expose_php = Off`, so pages stop naming the PHP version. The face tracking files end in `.wasm`: check the server sends them as `application/wasm` (`curl -sI https://<site>/wp-content/themes/apex-surgery/assets/vendor/face_mesh/face_mesh_solution_wasm_bin.wasm`). Most servers do.

   Check compression and caching with `curl -sI -H "Accept-Encoding: gzip" https://<site>/wp-content/themes/apex-surgery/assets/css/site.css`. It should show `Content-Encoding: gzip` (or `br`) and a `Cache-Control` with a long `max-age`. If not, on nginx:

   ```nginx
   gzip on; gzip_types text/css application/javascript text/javascript image/svg+xml application/json;
   location ~* /wp-content/(themes/apex-surgery/assets|uploads)/.*\.(css|js|woff2|webp|jpe?g|png|svg|bin)$ { expires 1y; add_header Cache-Control "public"; }
   ```

   and on Apache, with mod_deflate and mod_expires on:

   ```apache
   AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript image/svg+xml application/json
   ExpiresActive On
   ExpiresByType text/css "access plus 1 year"
   ExpiresByType application/javascript "access plus 1 year"
   ExpiresByType font/woff2 "access plus 1 year"
   ExpiresByType image/webp "access plus 1 year"
   ```

   A year is safe since every file the pages load carries the build's version in its address, including the files each tool loads in turn, and the version changes whenever a file does.

9. Fill in Apex settings in the admin:
   - **Forms:** the email addresses that get enquiry alerts. Leave it empty and the alerts go to the WordPress admin address, so check that address first.
   - **Tracking and code:** the Tag Manager container, set to GTM-WJQF6Z62. Below it are boxes for code in the head, after `<body>` and before `</body>`, plus custom CSS and JavaScript. Only administrators can change them. Code in these boxes runs before the visitor answers the cookie banner, so pixels belong in Tag Manager.
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
| One doctor | `/doctors/somboon-waiphrip/` | `/th/doctors/somboon-waiphrip/` |

A first visit to `/` from a browser set to Thai goes to `/th/`. After that the visitor's own choice of language is kept.

Old addresses: `/about-us/` goes to `/th/about-us/`, `/review/smas/` to `/th/review/smas/`, `/facelift-apex-sugery/` to `/th/surgery/facelift-apex-sugery/`, and the same for every page, service and article of the old site. Apex settings › Redirects adds others and has a box to test any address.

## How the theme works

Each page is drawn in PHP from the same content structure the design used, with the same markup, so the design's styles and scripts run on it unchanged. The scripts add the behaviour (menus, galleries, filters, the 3D tools) to the page the server sent.

- `inc/schema.php` lists the fields of every content type. The admin forms, the importer and the templates all read it.
- `inc/data.php` builds each page's content from the posts, fields and settings and caches it. Any save clears the cache.
- `inc/render-pages.php` is a PHP copy of `assets/js/pages.js`. When one changes, change the other the same way and run `tests/wordpress/ssr.mjs`, which compares the two on every page.
- Articles, episodes and service sections are written in the block editor. Headings, paragraphs, lists, images, YouTube, tables, buttons and the Details block (for questions and answers) are the blocks the site draws.
- The page also prints its content as JSON for the scripts, and `?apex_data=<lang>/<id>` serves the same content to the tools that load it later. Only published content goes through it.

## What editors can do

- **Finding where something is edited.** Logged in, every section of the live site shows an Edit link at its top right that opens the screen holding its words and pictures. "Edit links on/off" in the black toolbar hides them. On a service, the page's sections are the text in the block editor; the banner, introduction, recovery timeline, before and after photos, offers, videos, questions and SEO fields are in the Details box under the text, which a note at the top of the editor points to.
- Bold, italic and links inside paragraphs, list items, table cells and question answers. A link can go to a web address, an email, a phone number or a page on the site.
- Headings from H2 to H6.
- Preview shows a draft, or the unsaved changes of a published page, the way it will look. Only logged-in editors can open it, and search engines are told to skip it.
- Tags on an article show as small labels under the text. The site has no tag pages, so the labels are not links.
- A plain page (one without a design of its own, such as the privacy policy) has two templates under Page attributes › Template: Wide text, and Text then the consultation band.
- Redirects move for good (301). A line ending in 302 moves only for now.
- The privacy policy is the page Privacy policy, at `/privacy-policy/` and `/th/privacy-policy/`, written in the block editor. The import sets it as WordPress's privacy page (Settings › Privacy), and every footer links to it.
- JPEG and PNG uploads are saved as WebP at quality 82, which loads faster. Settings › Media turns this off. Once a day the site also makes the phone-size copies of new wide photos; `wp apex webp` does it straight away.
- One photo in the article "Brow Lift: Restore a Bright Face with Endotine" and its Thai version (`/wp-content/uploads/2025/05/image-13.png`) is missing on the live site too. Upload it again or take the image block out.

- The before and after photos are under Before and after. "How the photo is split" says where the before and the after sit in the photo. The results machine at the top of the Reviews page runs only the photos split left and right, grouped by procedure, so a new facelift, rhinoplasty or liposuction case set to left and right goes into it by itself.
- Each service has "Stay in Thailand after surgery (days)", which the trip planner uses for clients from abroad. Empty uses the planner's own number for that procedure.
- Each service has a "Recovery timeline": the steps in the Recovery box at the top of its page, also used in the key facts box on articles about that procedure.
- **A new procedure.** Add a service under Services, in both languages, with the same "Procedure code" on the English and Thai pages (left empty, it is made from the page address). It then shows in the menus and service cards, in the Procedure lists on offers and before and after photos, in the promotions and reviews filters, in My Plan, the trip planner and the consultation form, all by themselves.
- **Videos in each language.** The English and Thai pages each have their own YouTube video ids, on every service and every Surgery Wars episode. Put the English-dubbed or English-subtitled upload on the English page. The player opens in the page's language, so a video with English captions shows them first on the English site. YouTube's own multi-language audio (several audio tracks on one video) plays the track that matches each viewer's YouTube language.
- The service icons are under Services › In menus and service cards › Icon. Facial bone surgery has none yet, so its tile shows no icon until one is uploaded.

## Doctors

Doctors holds the surgical team. Each doctor is one post per language, shown as "Surgical team", and the Order box under Page attributes sets their place in the team strip and on the Doctors page. The card shows the photo, short name, name, license line, role and the specialties on the card. Each doctor and the founder have a page of their own at `/doctors/<name>/`, which Google can find and list: the license line, the other-language name, a quote, and the education, training, expertise, work, memberships and talks lists, one item per line. A line written "2016: Workshop name" shows the year in bold. The license line shows on every card, in the team strip on the home, about and service pages, and on the page. The address is the post's slug: keep it the same on the English and Thai post.

The heading and introduction above the team are on the Doctors page under Pages. The Shown as column tells the doctor posts apart: the founder has a biography of her own, and the "Lead surgeon card" shows only while the team is empty.

## What's new

The home page opens with What's new, the newest entries across the site, and a New tag marks each one on its cards anywhere on the site.

- **What goes in.** Surgeries, promotions, articles, Surgery Wars episodes and surgical team doctors go in by themselves when first published, since each has a "New from" date that fills in on that first publish. Clear the date to leave one out, or set an earlier date to move it down the list. Content brought in by `wp apex import` has no date, so the site does not open with everything marked new.
- **Launches with no page of their own.** A product, a package or an event goes under What's new › Add What's new item, with a kind, one line about it, a picture and the page it opens. Pick its language in the Languages box, since each language has its own list.
- **How long.** What's new › Settings sets how many days an entry stays (30 by default) and how many days the New tag stays after a visitor first sees it (7 by default). The tag also goes as soon as the visitor opens the entry. The same page lists what the home page shows now in each language.
- **Where the tags live.** Each visitor's browser remembers what they have seen, so every visitor gets the same cached page and the tags change only on their own screen.

At most 12 entries show, newest first. With nothing new, the home page leaves the section out.

## Prices by country

Every offer has a price in baht, and that is the Thailand price. Countries that pay a different price get a price list under Apex settings › Prices by country. With no lists, every visitor sees the baht prices and the site never asks which country they are in.

A list has:

| Field | What it does |
|---|---|
| Name in English, Name in Thai | Shown in the "Prices for" list beside the currency switch |
| Short code | Offers point to the list by it, for example `anz`. Keep it once offers use it |
| Countries | Two-letter codes, for example `AU, NZ` |
| Currency | The currency its prices are in |
| Change on the baht price (%) | Used for any offer without its own price for this list. 15 shows each baht price 15% higher, converted into the list's currency at the rates in `assets/features/currency/index.js` |
| Ask for the price | Shows "Ask for the price" on every offer without its own price for this list |
| When a poster shows a different price | A plain card with the list's price, or hide the offer |

Countries in no list get the baht prices, or one of the lists, as set under "Countries in no list". Untick "Visitors can pick a price list" to show each visitor only their own country's prices.

On each offer, the "Prices by country" box takes one row per list: the price in that list's currency, a poster with that price on it, and whether to show the poster, a plain card or nothing. Rows set on the English offer also apply to the Thai one unless it has its own. Service pages show the same poster as an offer and follow that offer's rows.

Most of Apex's posters have the baht price printed on them. Where a list shows a different price, such a poster gives way to a plain card in Apex's colours with the procedure name and the list's price, or the offer is hidden, as the list says. Tick "The poster has no price on it" on an offer whose poster shows no price, and it keeps its poster in every list. When a list hides every offer on a page, the page shows a line asking visitors to message Apex on LINE or WhatsApp for that month's offers. The message they send names the list, so the team knows which prices to quote.

The visitor's country comes from the header the host or CDN adds: Cloudflare's `CF-IPCountry`, CloudFront's `CloudFront-Viewer-Country`, or nginx GeoIP's `GEOIP_COUNTRY_CODE`. Turn on IP Geolocation under Cloudflare › Network if the site sits behind Cloudflare. A host with another header name, `X-Country-Code` say, sets it in `wp-config.php` since a browser can send such a header itself:

```php
define( 'APEX_COUNTRY_HEADER', 'HTTP_X_MY_COUNTRY' );
```

Without a header the site places visitors by their browser's time zone, which is right for most people and wrong for someone travelling. The top of Apex settings › Prices by country shows the country the site sees for you and where it came from.

The page cache keeps working since every page is drawn with the baht prices. When at least one list exists the page asks `/wp-json/apex/v1/pricing`, which returns the visitor's list only, and the script changes the offers. Leave `/wp-json/` out of the page cache, as the server list at the top already asks. Search engines see the baht prices, and the structured data stays in baht.

To check a list, open the promotions page with `?country=AU` (or any code) at the end of the address while visitors can pick a list.

## Social feeds

The "Latest from Apex" section on the home and contact pages shows Apex's newest Instagram and TikTok posts as square tiles. Every hour the site asks Instagram and TikTok for the newest posts and saves a 480 px copy of each cover in `wp-content/uploads/apex-social/`, so the pages load nothing from either network. Until the keys below are in, the section shows a follow tile for Instagram, TikTok and Facebook only. Apex settings › Social feeds shows when the last fetch ran, what it found and any error, and "Save and fetch now" runs one straight away.

WordPress runs the hourly fetch when someone visits the site. On a quiet site, or to be exact about it, run it from the server's cron instead: `*/15 * * * * wp --path=/var/www/html cron event run --due-now`.

### Instagram

The apex_surgery account has to be a professional (business or creator) account.

1. At developers.facebook.com, create an app of the Business type and add the Instagram product. Choose the API setup with Instagram login.
2. Under "Generate access tokens", add the apex_surgery account, sign in with it and copy the token it gives.
3. Paste it into Apex settings › Social feeds › Access token and press "Save and fetch now".

The token lasts 60 days and the site renews it every week, so it keeps working as long as the fetch runs. If the account's password changes, make a new token the same way.

### TikTok

1. At developers.tiktok.com, create an app and add Login Kit with the scopes `user.info.basic` and `video.list`. Set a redirect address on Apex's own domain, for example `https://www.apexsurgeryhospital.com/`.
2. Copy the client key and client secret into Apex settings › Social feeds.
3. Open this address in a browser, with the client key and redirect address filled in, and sign in with the apex_surgery account:

   ```
   https://www.tiktok.com/v2/auth/authorize/?client_key=KEY&scope=user.info.basic,video.list&response_type=code&redirect_uri=REDIRECT&state=apex
   ```

4. The browser lands on the redirect address with `?code=` in it. Copy that code, decode it (`%2A` becomes `*`) and exchange it for the tokens within a few minutes:

   ```bash
   curl -X POST https://open.tiktokapis.com/v2/oauth/token/ \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_key=KEY&client_secret=SECRET&code=CODE&grant_type=authorization_code&redirect_uri=REDIRECT"
   ```

5. Paste the `refresh_token` from the answer into Apex settings › Social feeds › Refresh token and press "Save and fetch now".

The refresh token lasts a year and the site gets a new one on every fetch. TikTok has to approve the app before it can read videos from an account outside its sandbox, which takes a few days.

## LINE reminders

When a player claims a game voucher, the site can offer "Remind me on LINE". It is off until Apex turns it on, and players don't see the option while it is off.

1. In the LINE Developers console, open the Messaging API channel of the Apex Surgery LINE account (the one under Site settings › LINE).
2. Copy the Channel secret (Basic settings) and issue a long-lived Channel access token (Messaging API).
3. In WordPress, open Apex settings › Games and prizes › LINE reminders. Paste both, tick "Offer reminders" and save.
4. Copy the Webhook URL shown there into the channel's Webhook settings, turn on "Use webhook" and press Verify.
5. Claim a voucher on your phone with "Remind me on LINE" ticked, tap "Turn on reminders in LINE" and send the message. LINE replies that reminders are on.

The player picks daily (when their game tries reset), weekly, or only before the voucher ends. Every player also gets one message three days before the voucher ends. Messages go out at 10:00 Bangkok time and stop when the voucher is used or ends, or when the player sends STOP or blocks the account. The settings page shows the last run and the last error from LINE. A 401 there means the token is wrong or has been reissued.

## Who can see what

| Role | Content | Enquiries and patient photos | Vouchers |
|---|---|---|---|
| Administrator | All | Yes | Yes |
| Apex staff | None | Yes | Yes |
| Editor | All | No | Check and mark as used |

Give the front desk and the patient coordinators the Apex staff role. Give an outside agency Editor, which keeps patient photos away from them. Editors can still change the phone, LINE and WhatsApp links under Site settings, and each change goes into the access log.

Enquiries › Access log, for Administrators only, lists who opened an enquiry, viewed a photo, changed or deleted an enquiry, exported or erased personal data, changed a setting or a role, and when staff with access to enquiries logged in. It keeps the newest 3,000 entries from the last 400 days. Check it once a month and after anyone leaves.

## Enquiries and patient data

- The online consultation saves each enquiry as a private Enquiry and emails the team a reference number and a link. The email carries no name, contact, questions or photos.
- Photos are saved as new JPEGs no larger than 2400 px, with the camera data (including GPS location) removed, under `uploads/apex-private/` with random file names. Only Administrators and Apex staff can open them, from the enquiry screen.
- Enquiries are deleted after 365 days, photos included. Apex settings › Forms changes the number of days. Deleting an enquiry by hand deletes its photos too.
- Vouchers are deleted 90 days after they expire.
- With LINE reminders on, a voucher keeps the player's LINE user ID while reminders run. The ID is deleted when the voucher is used or ends, when the player sends STOP, or when they block the account.
- Tools › Erase Personal Data finds enquiries by email address. Enquiries that came in by WhatsApp or LINE have to be deleted by hand from the Enquiries list.
- Backups copy `uploads/apex-private/` like any other folder. Keep backups encrypted and on the same retention period.
- The cookie banner holds back analytics and advertising cookies until the visitor accepts (Google Consent Mode v2). Tags in the Tag Manager container must use Consent Mode for this to hold.
- The Facebook page window and the Google maps open by themselves only after the visitor accepts advertising cookies, since both set their own cookies. Until then each shows a button that opens it on a tap.
- The face tracking (MediaPipe), the age guess (face-api) and the 3D viewers (three.js) load from the theme's own `assets/vendor/` folder rather than a CDN. `site/assets/vendor/README.md` in the repository lists the versions.
- The events the site sends to Tag Manager (`apex_consult_submit`, `apex_plan_add`, `apex_contact_click` and others) carry the tool, button, branch and channel. They leave out the procedure since an ad tag in the container would pass a person's interest in a surgery on to Google, Meta or TikTok. Keep Google Ads, Meta and TikTok tags off the consultation page and the photo tools, and turn off Meta's automatic advanced matching, which reads email and phone boxes on the page.

## The consultation form

Apex settings › Forms sets the form up without code:

- **Fields.** Travel dates, country, questions and photos can each be left off; country can be made optional. Name, contact method and consent are always asked. Procedures are the services under Services and branches the ones under Branches.
- **More questions.** Up to 10 questions after Questions, in English and Thai: a short answer, a long answer or one choice from a list, required or not. Answers show on the enquiry, in the export and in the webhook.
- **Wording.** Every heading, hint and button on the form in both languages. An empty box keeps the wording shown in grey.

**Export.** Enquiries › Export downloads the enquiries between two dates as a CSV file that Excel and Google Sheets open, Thai included. It holds names and contacts but no photos, and each export is written in the access log.

**Webhook to Google Sheets.** Each new enquiry can also be sent to an address a few seconds after it arrives. The settings screen has a Google Apps Script to paste into a sheet (Extensions › Apps Script), with steps: deploy it as a web app, paste its address into "Webhook address", and press "Send a test". Any other system can take it too (a CRM, Zapier, Make): it is a JSON POST, signed in the `X-Apex-Signature` header with HMAC SHA-256 of the body and the token. A send that fails is tried twice more, an hour apart, and the enquiry shows whether it was sent. It copies personal data to another service, so the Data Protection Officer should agree to it first. Photos never leave the website.

## Spam and limits

- The consultation form has a hidden trap field and allows 6 enquiries an hour from one connection. Apex settings › Forms takes a Cloudflare Turnstile key for a visible check as well.
- Vouchers need a scored game of at least 10 seconds and are limited to 4 a day from one connection, the 3 daily runs plus the one a Learn set adds. The game runs on the visitor's phone, so a determined person can still fake a score. The reception check shows the code, name, prize and date, and marks the voucher used so it works once.
- After 8 wrong passwords for one username from one connection, that login waits 15 minutes.
- Behind Cloudflare or a load balancer every visitor arrives from the proxy's address. Set `APEX_IP_HEADER` (step 7) or the limits apply to everyone at once.

## Checks before going live

From the repository root, with the staging site at `$SITE`:

```bash
node tests/wordpress/ssr.mjs $SITE        # every page: the server's markup matches the scripts' (132 pages)
WP_PASS_FILE=... node tests/wordpress/admin.mjs $SITE   # opens and saves every edit screen, then wp apex check
WP_PASS_FILE=... node tests/wordpress/flows.mjs $SITE   # consultation, vouchers, redirects, page heads, cookie banner, editor tools
AXE=.../axe.min.js node tests/wordpress/axe.mjs $SITE  # accessibility, WCAG 2 A and AA
```

The tests run with Playwright and need WP-CLI on the same machine. `WP_PASS_FILE` is a file holding the password of a test administrator called `apexadmin`. Delete that account afterwards.

Then by hand:

1. Send a consultation with a photo and check the alert email arrives.
2. Open the enquiry as an Apex staff user and see the photo.
3. Open `https://<site>/wp-content/uploads/apex-private/` in a private window. It must be refused.
4. Claim a voucher in a game and check it under Vouchers › Check a code.
5. If Apex has country price lists, check Apex settings › Prices by country shows your country from a header rather than the time zone, then open the promotions page with `?country=` set to one country from each list.
6. Open five old addresses from Google Search Console and check each lands on its Thai page.
7. Submit the new sitemap (`/wp-sitemap.xml`) in Search Console.
8. Measure Core Web Vitals on staging with the cache on: PageSpeed Insights, mobile, on the home page, one service, one article and the breast implant viewer. Aim for LCP under 2.5 s, INP under 200 ms and CLS under 0.1. Search Console shows the figures from real visitors about 28 days after launch.
9. Restore one backup to a spare copy, to know the backup works.

## Updating the theme

Gid sends an update as a new `apex-surgery-theme-<version>.zip`, for example `apex-surgery-theme-1.1.0.zip`, with a short note of what changed. The version on the site is at the bottom right of every admin page ("Apex Surgery theme 1.1.0") and under Appearance › Themes.

1. Back up the database and `wp-content/` first.
2. Install it on staging: Appearance › Themes › Add New › Upload Theme, choose the zip and pick "Replace current with uploaded". Or copy the new `apex-surgery/` folder over the old one by SFTP.
3. Check the pages the note names, then do the same on the live site.

The content, photos, enquiries, vouchers and settings live in the database and `uploads/`, so a new theme leaves them as they are. **Don't run `wp apex import` on a site Apex has been editing** unless the update note asks for it: the import writes the content from the package over the posts with the same key, and Apex's own edits to those posts would be lost.

For the developer: the design (the `site/` folder) is the source for styles, scripts and the 3D tools. After a change there, run `node wordpress/tools/build-theme.mjs` to build the zip. A change to page markup in `pages.js` also needs the same change in `inc/render-pages.php`, and `tests/wordpress/ssr.mjs` will say where they differ.

## Versions

| Version | Date | What changed | Run `wp apex import` after installing? |
|---|---|---|---|
| 1.3.0 | 20 Nov 2026 | Apex's answers of 20 November. Each procedure page shows Apex's own photos: the treated area, a consultation and the operating room. The facelift, rhinoplasty, eye, breast and liposuction cards carry a photo, set per service under In menus and service cards › Card photo. The facelift, brow lift and liposuction offers are the current posters with their prices: 5 facelift and brow lift offers and 10 liposuction offers, the liposuction ones until 31 December 2026. An offer can show "From" before its price and has a Last day: it shows "Until 31 December 2026" under the price and leaves the site the day after. WhatsApp is +66 88 624 1617. A client from abroad stays 21 days after facial bone surgery in the trip planner. | No. The theme makes these changes on its own on the first page load after installing, and only where staging still has what 1.2.0 left: the old WhatsApp number, 14 days for facial bone surgery, an empty card photo, and the old facelift, Endotine and liposuction posters. The old offers stay under Offers, unticked from the promotions and home pages. |
| 1.2.0 | 16 Nov 2026 | Apex's feedback of 16 November. The 2026 logo in the header, and its white version in the footer and mobile menu. The My Plan button has its own icon, apart from the menu button. Promotion pictures in What's new fill their box. The purple panel behind photos stays behind the photo on phones, and the founder's license card no longer covers the Founder profile button. Before and after photos on the results machine keep their shape. Every doctor and the founder have a page of their own at `/doctors/<name>/`, with their license number, and the license shows on every doctor card. Each service has an editable Recovery timeline. A service added later joins every procedure list, the form and the planning tools; facial bone surgery enquiries are now accepted. The consultation form is set up under Apex settings › Forms (fields, more questions, wording), Enquiries › Export downloads a CSV, and a webhook can copy each enquiry to Google Sheets. Edit links on the live site for logged-in staff. YouTube players open in the page's language. | No. The theme makes its few content changes on its own on the first page load after installing (logo, recovery timelines, doctor page addresses), and only where they are still as 1.1.0 left them, so edits made on staging stay. |
| 1.1.0 | 15 Nov 2026 | Service banners show whole, since their text was cut at the edges. Facial bone surgery has its icon. The mobile menu, the photo viewer and the before and after zoom are native dialogs: Esc closes them, keyboard focus stays inside, and the page behind can't be reached. Service banners keep their space while they load. The admin shows the version. | Yes, once on staging, since the icon is content and staging's content was older than 1.0.0. Nobody has edited staging yet, so nothing is lost. |
| 1.0.0 | 13 Nov 2026 | First trial for staging. | Yes, the first time. |

Thank you. Send me anything that does not match this and I will fix it.
