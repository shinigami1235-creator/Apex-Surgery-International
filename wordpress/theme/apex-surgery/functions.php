<?php
/**
 * Apex Surgery Hospital theme.
 *
 * Every public page is drawn by PHP from the same content structure the design used (see inc/data.php),
 * with the same markup, so the design's styles and scripts run on it unchanged. The scripts only attach
 * behaviour to the server-rendered page; they do not draw it again.
 *
 * inc/helpers.php   language, wording, icons, image and page links
 * inc/schema.php    the fields of every content type, shared by the admin, the importer and the data layer
 * inc/types.php     content types, Polylang registration, shared slugs across languages
 * inc/fields.php    the admin forms built from the schema
 * inc/blocks.php    article and service text in the block editor, read back as the design's blocks
 * inc/data.php      content as the design's data structure
 * inc/render-*.php  the page templates (a PHP copy of assets/js/core.js and pages.js)
 * inc/seo.php       titles, descriptions, Open Graph, JSON-LD, hreflang when no SEO plugin is active
 * inc/redirects.php old URLs to new ones
 * inc/forms.php     online consultation, game vouchers, the reception voucher check
 * inc/social.php    Latest from Apex: Instagram and TikTok posts fetched every hour, Apex settings › Social feeds
 * inc/fresh.php     What's new on the home page and the New tags: the list, New from dates, What's new › Settings
 * inc/pricing.php   prices by country: the price lists, each visitor's list, Apex settings › Prices by country
 * inc/tracking.php  Google Tag Manager with Consent Mode v2 and the cookie banner
 * inc/media.php     uploads saved as WebP
 * inc/security.php  hardening
 * inc/audit.php     access log: who opened enquiries and photos, changed settings or roles
 * inc/admin.php     admin menus, columns and help
 * inc/cli.php       wp apex import | export | check
 */
defined( 'ABSPATH' ) || exit;

define( 'APEX_VERSION', '1.0.0' );
define( 'APEX_DIR', __DIR__ );
define( 'APEX_URI', get_template_directory_uri() );

foreach ( [ 'helpers', 'schema', 'types', 'fields', 'blocks', 'data', 'render-shell', 'render-pages', 'seo', 'redirects', 'forms', 'pricing', 'social', 'fresh', 'tracking', 'media', 'security', 'audit', 'admin' ] as $f ) {
	require_once APEX_DIR . "/inc/$f.php";
}
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	require_once APEX_DIR . '/inc/cli.php';
}
