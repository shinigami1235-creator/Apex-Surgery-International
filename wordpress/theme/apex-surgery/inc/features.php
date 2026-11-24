<?php
/**
 * Parts of the site Apex switches on when they are ready: Apex settings › Features.
 *
 * A part that is off is linked from nowhere (menus, home page, footer, other pages), its pages leave the
 * sitemap, and a visitor who opens one of its addresses lands on the home page. Staff who are logged in can
 * still open the pages to check them. The same switches reach the browser as shared.features, so the
 * scripts (core.js A.on) leave out the same links.
 */
defined( 'ABSPATH' ) || exit;

/** key => [ label, what it covers, waiting for, on by default ] */
function apex_feature_list(): array {
	return [
		'games'      => [ __( 'Games and vouchers', 'apex' ), __( 'The Play and win page, the games in the Try it menu, on the home page, the services page and the promotions page, and the games button in My Plan.', 'apex' ), __( 'The real prizes and scores (item 2.3), and whether the advertising approval covers the games (4.1).', 'apex' ), true ],
		'wars'       => [ __( 'Surgery Wars', 'apex' ), __( 'The Transformations page, the Surgery Wars page and its episodes, the Surgery Wars section on the home page and the Transformations link in the menu.', 'apex' ), __( 'Final approval of the episodes from Apex and the channel (3.4).', 'apex' ), true ],
		'treatments' => [ __( 'Non-surgical treatments', 'apex' ), __( 'The non-surgical treatments page and its links in the Services menu, the footer and the services page.', 'apex' ), __( 'Confirmation that the October 2026 list is current (2.8).', 'apex' ), true ],
		'zh'         => [ __( 'Chinese (中文)', 'apex' ), __( 'The Chinese pages under /zh/ and 中文 in the language switch. While off, staff who are logged in still see 中文 in the switch and can read every Chinese page to check it.', 'apex' ), __( 'Review of the Chinese medical text by Palm (3.2).', 'apex' ), false ],
	];
}
function apex_features(): array {
	static $f = null;
	if ( $f === null ) {
		$o = get_option( 'apex_features' );
		$f = [];
		foreach ( apex_feature_list() as $k => $x ) $f[ $k ] = is_array( $o ) && array_key_exists( $k, $o ) ? (bool) $o[ $k ] : $x[3];
	}
	return $f;
}
function apex_on( string $k ): bool { return apex_features()[ $k ] ?? true; }
/** Staff see the Chinese switch and the hidden pages, to check them before they go public. */
function apex_staff(): bool { return is_user_logged_in() && current_user_can( 'edit_pages' ); }

/** The design page each switch hides (core.js A.FEATURE_PAGES). */
const APEX_FEATURE_PAGES = [ 'play.html' => 'games', 'surgery-wars.html' => 'wars', 'transformations.html' => 'wars', 'treatments.html' => 'treatments' ];
const APEX_FEATURE_KEYS = [ 'play' => 'games', 'war' => 'wars', 'shows' => 'wars', 'treatments' => 'treatments' ];
function apex_page_on( string $file ): bool {
	$f = APEX_FEATURE_PAGES[ basename( strtok( $file, '?#' ) ) ] ?? null;
	return ! $f || apex_on( $f );
}
/** Languages in the switch: Chinese only when it is on, for staff, or on a Chinese page already. */
function apex_lang_list(): array {
	$all = [ [ 'en', 'EN' ], [ 'th', 'TH' ], [ 'zh', '中文' ] ];
	return array_values( array_filter( $all, fn( $x ) => $x[0] !== 'zh' || apex_on( 'zh' ) || apex_lang() === 'zh' || apex_staff() ) );
}

/* a hidden part's addresses go to the home page; a Chinese page while Chinese is off goes to the same page in English */
add_action( 'template_redirect', function () {
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || apex_staff() ) return;
	$r = apex_route();
	if ( apex_lang() === 'zh' && ! apex_on( 'zh' ) ) {
		$en = apex_alternates()['en'] ?? '';
		// the cookie keeps Polylang from sending the visitor straight back to Chinese from the home page
		setcookie( 'pll_language', 'en', [ 'expires' => time() + YEAR_IN_SECONDS, 'path' => COOKIEPATH ?: '/', 'samesite' => 'Lax', 'secure' => is_ssl() ] );
		wp_safe_redirect( $en ?: apex_home_url( 'en' ), 302 );
		exit;
	}
	$f = APEX_FEATURE_KEYS[ $r['page'] ] ?? null;
	if ( $f && ! apex_on( $f ) ) { wp_safe_redirect( apex_home_url(), 302 ); exit; }
}, 1 );

/* Polylang's first-visit language guess never picks Chinese while it is off */
add_filter( 'pll_preferred_language', fn( $l ) => $l === 'zh' && ! apex_on( 'zh' ) ? false : $l );

/* search engines: hidden pages and, while it is off, all of Chinese stay out */
add_filter( 'wp_robots', function ( $robots ) {
	$r = apex_route();
	$f = APEX_FEATURE_KEYS[ $r['page'] ] ?? null;
	if ( ( $f && ! apex_on( $f ) ) || ( apex_lang() === 'zh' && ! apex_on( 'zh' ) ) ) $robots['noindex'] = true;
	return $robots;
}, 20 );
add_filter( 'wp_sitemaps_posts_query_args', function ( $args, $type ) {
	// Polylang asks once per language; the Chinese sitemaps come back empty while Chinese is off
	if ( ! apex_on( 'zh' ) && ( $args['lang'] ?? '' ) === 'zh' ) $args['post__in'] = [ 0 ];
	$off = array_keys( array_filter( APEX_FEATURE_KEYS, fn( $f ) => ! apex_on( $f ) ) );
	if ( $type === 'page' && $off ) $args['meta_query'] = [ 'relation' => 'AND', $args['meta_query'] ?? [ 'relation' => 'OR' ], [ 'relation' => 'OR', [ 'key' => '_apex_page', 'compare' => 'NOT EXISTS' ], [ 'key' => '_apex_page', 'value' => $off, 'compare' => 'NOT IN' ] ] ];
	if ( $type === 'apex_episode' && ! apex_on( 'wars' ) ) $args['post__in'] = [ 0 ];
	return $args;
}, 20, 2 );
add_filter( 'wp_sitemaps_taxonomies_query_args', function ( $args ) {
	if ( ! apex_on( 'zh' ) && ( $args['lang'] ?? '' ) === 'zh' ) $args['include'] = [ PHP_INT_MAX ];
	return $args;
}, 20 );
add_filter( 'pll_rel_hreflang_attributes', fn( $h ) => apex_on( 'zh' ) ? $h : array_diff_key( (array) $h, [ 'zh' => 1, 'zh-CN' => 1, 'zh-Hans' => 1 ] ) );

/* ---------- Apex settings › Features ---------- */
add_action( 'admin_menu', function () {
	add_submenu_page( 'apex-settings', __( 'Features', 'apex' ), __( 'Features', 'apex' ), 'manage_options', 'apex-features', 'apex_features_page' );
}, 20 );
function apex_features_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) return;
	if ( isset( $_POST['apex_features_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_features_nonce'] ), 'apex_features' ) ) {
		$on = isset( $_POST['on'] ) && is_array( $_POST['on'] ) ? array_map( 'sanitize_key', wp_unslash( $_POST['on'] ) ) : [];
		$v = [];
		foreach ( array_keys( apex_feature_list() ) as $k ) $v[ $k ] = in_array( $k, $on, true );
		update_option( 'apex_features', $v, true );
		apex_data_bump();
		if ( function_exists( 'apex_audit' ) ) apex_audit( 'settings', 0, 'Features: ' . implode( ', ', array_map( fn( $k, $x ) => "$k " . ( $x ? 'on' : 'off' ), array_keys( $v ), $v ) ) );
		echo '<div class="notice notice-success"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
		$f = $v;
	} else {
		$f = apex_features();
	}
	// the Chinese pages: added once, from the content that ships with the theme, without touching English or Thai
	if ( isset( $_POST['apex_zh_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_zh_nonce'] ), 'apex_zh' ) ) {
		$msg = apex_add_chinese();
		echo '<div class="notice ' . ( $msg[0] ? 'notice-success' : 'notice-error' ) . '"><p>' . esc_html( $msg[1] ) . '</p></div>';
	}
	echo '<div class="wrap"><h1>' . esc_html__( 'Features', 'apex' ) . '</h1>';
	echo '<p style="max-width:760px">' . esc_html__( 'These parts of the site are built and wait for something from Apex before they go public. A part that is off has no links anywhere on the site, its pages leave the sitemap, and its addresses open the home page. Tick a part and press Save to put it on the site. Staff who are logged in can open the hidden pages to check them.', 'apex' ) . '</p>';
	echo '<form method="post">';
	wp_nonce_field( 'apex_features', 'apex_features_nonce' );
	echo '<table class="widefat striped" style="max-width:980px"><thead><tr><th style="width:70px">' . esc_html__( 'On', 'apex' ) . '</th><th>' . esc_html__( 'Part of the site', 'apex' ) . '</th><th>' . esc_html__( 'Waiting for', 'apex' ) . '</th></tr></thead><tbody>';
	foreach ( apex_feature_list() as $k => [ $label, $what, $wait ] ) {
		echo '<tr><td><input type="checkbox" name="on[]" value="' . esc_attr( $k ) . '" id="f-' . esc_attr( $k ) . '"' . checked( ! empty( $f[ $k ] ), true, false ) . '></td>';
		echo '<td><label for="f-' . esc_attr( $k ) . '"><b>' . esc_html( $label ) . '</b></label><br><span class="description">' . esc_html( $what ) . '</span></td>';
		echo '<td>' . ( empty( $f[ $k ] ) ? esc_html( $wait ) : '<span style="color:#1a7f37">' . esc_html__( 'On the site', 'apex' ) . '</span>' ) . '</td></tr>';
	}
	echo '</tbody></table>';
	submit_button( __( 'Save', 'apex' ) );
	echo '</form>';
	$have = function_exists( 'apex_posts' ) ? count( apex_posts( 'apex_service', 'zh' ) ) : 0;
	echo '<h2>' . esc_html__( 'Chinese pages', 'apex' ) . '</h2>';
	if ( $have ) {
		echo '<p>' . esc_html( sprintf( __( 'The Chinese pages are on the site (%d procedure pages). Edit them like the English and Thai ones, under the 中文 filter in each list.', 'apex' ), $have ) ) . '</p>';
	} else {
		echo '<p style="max-width:760px">' . esc_html__( 'The theme carries a Chinese translation of every page, made from the English. Press the button once to add the Chinese pages, settings and offers to WordPress. It takes about a minute. On the command line it is: wp apex import --lang=zh', 'apex' ) . '</p>';
		echo '<form method="post">';
		wp_nonce_field( 'apex_zh', 'apex_zh_nonce' );
		submit_button( __( 'Add the Chinese pages', 'apex' ), 'secondary' );
		echo '</form>';
	}
	echo '</div>';
}

/** Runs the importer for Chinese only. Returns [ ok, message ]. */
function apex_add_chinese(): array {
	if ( ! current_user_can( 'manage_options' ) || ! function_exists( 'pll_set_post_language' ) ) return [ false, __( 'Polylang is not active.', 'apex' ) ];
	@set_time_limit( 600 );
	require_once APEX_DIR . '/inc/cli-shim.php';
	require_once APEX_DIR . '/inc/cli.php';
	try {
		( new Apex_CLI() )->import( [], [ 'lang' => 'zh', 'no-webp' => true ] );
	} catch ( Throwable $e ) {
		return [ false, __( 'The Chinese pages could not be added: ', 'apex' ) . $e->getMessage() ];
	}
	if ( function_exists( 'apex_audit' ) ) apex_audit( 'settings', 0, 'Added the Chinese pages' );
	return [ true, implode( ' ', array_slice( WP_CLI::$out ?? [], -1 ) ) ?: __( 'The Chinese pages are added.', 'apex' ) ];
}

/* the page data carries the switches, so any change to them, from this screen or WP-CLI, starts it afresh */
foreach ( [ 'add_option_apex_features', 'update_option_apex_features', 'delete_option_apex_features' ] as $h ) add_action( $h, fn() => function_exists( 'apex_data_bump' ) && apex_data_bump() );
