<?php
/**
 * Prices by country.
 *
 * Every offer has a price in baht, the Thailand price. Under Apex settings › Prices by country an editor adds
 * country price lists: which countries, which currency, a percentage on the baht price, and what happens to a
 * poster whose printed price no longer matches (a plain card with the right price, or the offer hidden). Each
 * offer can then set its own price, poster or visibility per list under "Prices by country" on its edit screen.
 *
 * Pages stay cacheable: the server draws Thailand's prices, and when at least one list exists the page asks
 * GET /wp-json/apex/v1/pricing, which works out the visitor's list and returns that list only. The browser
 * script (assets/features/pricing/index.js) then changes the offers on the page.
 *
 * The visitor's country comes from the header the host or CDN adds (Cloudflare's CF-IPCountry and the others
 * below), or from APEX_COUNTRY_HEADER in wp-config.php, and falls back to the browser's time zone.
 */
defined( 'ABSPATH' ) || exit;

const APEX_PRICE_CURRENCIES = [ 'THB', 'USD', 'AUD', 'GBP', 'EUR', 'SGD', 'CNY', 'JPY', 'AED', 'HKD', 'KRW', 'PHP' ];
/* headers a CDN or the server sets. A host that names the country in another header (X-Country-Code, say) sets
   APEX_COUNTRY_HEADER, since a browser can send such a header itself. */
const APEX_COUNTRY_HEADERS = [ 'HTTP_CF_IPCOUNTRY', 'HTTP_CLOUDFRONT_VIEWER_COUNTRY', 'GEOIP_COUNTRY_CODE', 'GEOIP2_COUNTRY_CODE' ];

/* ---------- the settings ---------- */
function apex_pricing_schema(): array {
	$cur = array_combine( APEX_PRICE_CURRENCIES, APEX_PRICE_CURRENCIES );
	$other = [ 'base' => __( 'Thailand prices in baht', 'apex' ) ] + apex_pricing_region_options();
	return [
		apex_f( 'base', 'group', 'Thailand prices', [ 'h' => 'The baht price on each offer. Its name shows in the "Prices for" list.', 'f' => [
			apex_f( 'en', 'text', 'Name in English', [ 'h' => 'For example Thailand' ] ),
			apex_f( 'th', 'text', 'Name in Thai', [ 'h' => 'For example ประเทศไทย' ] ),
		] ] ),
		apex_f( 'regions', 'repeater', 'Country price lists', [ 'h' => 'One row per group of countries that pays a different price.', 'f' => [
			apex_f( 'en', 'text', 'Name in English', [ 'h' => 'For example Australia and New Zealand' ] ),
			apex_f( 'th', 'text', 'Name in Thai' ),
			apex_f( 'id', 'text', 'Short code', [ 'h' => 'Letters and numbers, for example anz. Offers point to the list by this code, so keep it once offers use it. Empty makes one from the English name.' ] ),
			apex_f( 'countries', 'text', 'Countries', [ 'h' => 'Two-letter country codes separated by commas, for example AU, NZ' ] ),
			apex_f( 'cur', 'select', 'Currency', [ 'o' => $cur ] ),
			apex_f( 'adjust', 'number', 'Change on the baht price (%)', [ 'h' => '15 shows each baht price 15% higher, converted into this currency. 0 converts it as it is. An offer\'s own price for this list wins.' ] ),
			apex_f( 'ask', 'bool', 'Ask for the price, unless the offer has its own price for this list' ),
			apex_f( 'mismatch', 'select', 'When a poster shows a different price', [ 'o' => [ 'card' => 'Show a plain card with this list\'s price', 'hide' => 'Hide the offer' ] ] ),
		] ] ),
		apex_f( 'other', 'select', 'Countries in no list', [ 'o' => $other ] ),
		apex_f( 'choose', 'bool', 'Visitors can pick a price list', [ 'h' => 'Adds a "Prices for" list beside the currency switch. Untick to show each visitor only their own country\'s prices.' ] ),
	];
}

/** The saved lists, cleaned, with defaults filled in. */
function apex_pricing_cfg(): array {
	static $C = null;
	if ( $C !== null ) return $C;
	$o = get_option( 'apex_pricing' );
	$o = is_array( $o ) ? $o : [];
	$regions = [];
	foreach ( (array) ( $o['regions'] ?? [] ) as $r ) {
		if ( ! is_array( $r ) || empty( $r['id'] ) ) continue;
		$regions[] = [
			'id' => (string) $r['id'],
			'name' => [ 'en' => (string) ( $r['en'] ?? '' ) ?: (string) $r['id'], 'th' => (string) ( $r['th'] ?? '' ) ?: (string) ( $r['en'] ?? $r['id'] ) ],
			'countries' => array_values( (array) ( $r['countries'] ?? [] ) ),
			'cur' => in_array( $r['cur'] ?? '', APEX_PRICE_CURRENCIES, true ) ? $r['cur'] : 'THB',
			'adjust' => (float) ( $r['adjust'] ?? 0 ),
			'ask' => ! empty( $r['ask'] ),
			'mismatch' => ( $r['mismatch'] ?? '' ) === 'hide' ? 'hide' : 'card',
		];
	}
	$ids = array_column( $regions, 'id' );
	return $C = [
		'base' => [ 'en' => (string) ( $o['base']['en'] ?? '' ) ?: 'Thailand', 'th' => (string) ( $o['base']['th'] ?? '' ) ?: 'ประเทศไทย' ],
		'regions' => $regions,
		'other' => in_array( $o['other'] ?? '', $ids, true ) ? $o['other'] : 'base',
		'choose' => ! array_key_exists( 'choose', $o ) || ! empty( $o['choose'] ),
	];
}
function apex_pricing_multi(): bool { return (bool) apex_pricing_cfg()['regions']; }
/** code => name, for the select on each offer. */
function apex_pricing_region_options(): array {
	$o = get_option( 'apex_pricing' );
	$out = [];
	foreach ( (array) ( is_array( $o ) ? ( $o['regions'] ?? [] ) : [] ) as $r ) if ( is_array( $r ) && ! empty( $r['id'] ) ) $out[ (string) $r['id'] ] = (string) ( ( $r['en'] ?? '' ) ?: $r['id'] );
	return $out;
}

/* ---------- the visitor's country ---------- */
function apex_country_code( $v ): string {
	$v = strtoupper( trim( (string) $v ) );
	return preg_match( '/^[A-Z]{2}$/', $v ) && ! in_array( $v, [ 'XX', 'ZZ', 'T1', 'EU', 'AP' ], true ) ? $v : '';
}
/** The country and where it came from: a header, the browser's time zone, or nothing. */
function apex_visitor_country( string $tz = '' ): array {
	$heads = defined( 'APEX_COUNTRY_HEADER' ) ? [ (string) APEX_COUNTRY_HEADER ] : APEX_COUNTRY_HEADERS;
	foreach ( $heads as $h ) if ( ( $c = apex_country_code( $_SERVER[ $h ] ?? '' ) ) !== '' ) return [ $c, $h ];
	if ( $tz !== '' && in_array( $tz, timezone_identifiers_list( DateTimeZone::ALL_WITH_BC ), true ) ) {
		try {
			$c = apex_country_code( ( new DateTimeZone( $tz ) )->getLocation()['country_code'] ?? '' );
			if ( $c !== '' ) return [ $c, 'time zone' ];
		} catch ( Exception $e ) { /* unknown zone */ }
	}
	return [ '', '' ];
}

/* ---------- each offer's rows, keyed by the poster's file name ---------- */
function apex_offer_key( string $src ): string {
	$parts = explode( '/', $src );
	return rawurldecode( (string) end( $parts ) );
}
/** The offers' rows for one list. An offer with no rows in this language takes them from its other language. */
function apex_pricing_offers( string $region, string $lang ): array {
	$by = [];
	$langs = array_unique( [ $lang, ...APEX_LANGS ] );
	foreach ( $langs as $l ) foreach ( apex_posts( 'apex_offer', $l ) as $id ) {
		$o = apex_read_post( $id, 'apex_offer' );
		$k = apex_offer_key( (string) ( $o['src'] ?? '' ) );
		if ( $k === '' ) continue;
		$row = null;
		foreach ( (array) ( $o['regions'] ?? [] ) as $r ) if ( ( $r['region'] ?? '' ) === $region ) { $row = $r; break; }
		if ( isset( $by[ $k ] ) ) {
			if ( $by[ $k ]['_row'] || ! $row ) continue;   // the visitor's own language already set it
		}
		$by[ $k ] = [ 'noPrice' => ! empty( $o['noPrice'] ), 'price' => (float) ( $row['price'] ?? 0 ), 'poster' => (string) ( $row['poster'] ?? '' ), 'show' => in_array( $row['show'] ?? '', [ 'poster', 'card', 'hide' ], true ) ? $row['show'] : 'auto', '_row' => (bool) $row ];
	}
	foreach ( $by as &$x ) unset( $x['_row'] );
	return $by;
}

/** What the page script needs for one visitor: the list that applies and that list's offer rows. */
function apex_pricing_for( string $country, string $want, string $lang ): array {
	$C = apex_pricing_cfg();
	$find = fn( $id ) => current( array_filter( $C['regions'], fn( $r ) => $r['id'] === $id ) ) ?: null;
	$r = $want !== '' && $C['choose'] ? $find( $want ) : null;
	if ( ! $r && ! ( $want === 'base' && $C['choose'] ) ) {
		if ( $country !== '' ) foreach ( $C['regions'] as $x ) if ( in_array( $country, $x['countries'], true ) ) { $r = $x; break; }
		if ( ! $r && $C['other'] !== 'base' ) $r = $find( $C['other'] );
	}
	$region = $r ? array_diff_key( $r, [ 'countries' => 1 ] ) : [ 'id' => 'base', 'name' => $C['base'], 'cur' => 'THB', 'adjust' => 0, 'ask' => false, 'mismatch' => 'card' ];
	return [
		'choose' => $C['choose'],
		'country' => $country,
		'regions' => $C['choose'] ? array_merge( [ [ 'id' => 'base', 'name' => $C['base'] ] ], array_map( fn( $x ) => [ 'id' => $x['id'], 'name' => $x['name'] ], $C['regions'] ) ) : [],
		'region' => $region,
		'offers' => $region['id'] === 'base' ? (object) [] : (object) apex_pricing_offers( $region['id'], $lang ),
	];
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'apex/v1', '/pricing', [ 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $req ) {
		$lang = in_array( $req->get_param( 'lang' ), APEX_LANGS, true ) ? $req->get_param( 'lang' ) : 'en';
		[ $country ] = apex_visitor_country( substr( (string) $req->get_param( 'tz' ), 0, 64 ) );
		// ?country= tries another country, the same as picking a list; it is off when visitors may not pick
		$try = apex_country_code( $req->get_param( 'country' ) );
		if ( $try !== '' && apex_pricing_cfg()['choose'] ) $country = $try;
		$want = sanitize_key( (string) $req->get_param( 'region' ) );
		$res = new WP_REST_Response( apex_pricing_for( $country, $want, $lang ) );
		$res->header( 'Cache-Control', 'private, max-age=600' );
		return $res;
	} ] );
} );

/* ---------- Apex settings › Prices by country ---------- */
add_action( 'admin_menu', function () {
	add_submenu_page( 'apex-settings', __( 'Prices by country', 'apex' ), __( 'Prices by country', 'apex' ), 'edit_pages', 'apex-pricing', 'apex_pricing_page' );
} );
function apex_pricing_page(): void {
	if ( ! current_user_can( 'edit_pages' ) ) return;
	if ( isset( $_POST['apex_pricing_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_pricing_nonce'] ), 'apex_pricing' ) ) {
		$in = isset( $_POST['apex'] ) && is_array( $_POST['apex'] ) ? wp_unslash( $_POST['apex'] ) : [];
		$v = [];
		foreach ( apex_pricing_schema() as $f ) $v[ $f['k'] ] = apex_clean( $f, $in[ $f['k'] ] ?? ( $f['t'] === 'repeater' ? [] : '' ) );
		$seen = [];
		$bad = [];
		foreach ( $v['regions'] as $i => &$r ) {
			$id = sanitize_key( str_replace( ' ', '-', (string) ( ( $r['id'] ?? '' ) ?: ( $r['en'] ?? '' ) ) ) );
			if ( $id === '' || $id === 'base' || isset( $seen[ $id ] ) ) $id = 'list-' . ( $i + 1 );
			$seen[ $id ] = true;
			$r['id'] = $id;
			$codes = array_filter( array_map( 'trim', preg_split( '/[\s,;]+/', strtoupper( (string) ( $r['countries'] ?? '' ) ) ) ), 'strlen' );
			$ok = array_values( array_unique( array_filter( $codes, fn( $c ) => apex_country_code( $c ) !== '' ) ) );
			foreach ( array_diff( $codes, $ok ) as $c ) $bad[] = $c;
			$r['countries'] = $ok;
			$r['cur'] = ( $r['cur'] ?? '' ) ?: 'THB';
		}
		unset( $r );
		update_option( 'apex_pricing', $v, true );
		apex_audit( 'settings', 0, 'Prices by country' );
		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
		if ( $bad ) echo '<div class="notice notice-warning"><p>' . esc_html( sprintf( __( 'These are not two-letter country codes and were left out: %s', 'apex' ), implode( ', ', array_unique( $bad ) ) ) ) . '</p></div>';
	}
	$o = get_option( 'apex_pricing' );
	$o = is_array( $o ) ? $o : [ 'choose' => true ];
	foreach ( (array) ( $o['regions'] ?? [] ) as $i => $r ) if ( is_array( $r['countries'] ?? null ) ) $o['regions'][ $i ]['countries'] = implode( ', ', $r['countries'] );
	[ $cc, $from ] = apex_visitor_country();
	echo '<div class="wrap apex-settings"><h1>' . esc_html__( 'Prices by country', 'apex' ) . '</h1>';
	echo '<p>' . esc_html__( 'Each offer\'s price in baht is the Thailand price. Add a list here for countries that pay a different price, then set prices for that list on each offer under Offers, in the "Prices by country" box. With no lists every visitor sees the baht prices.', 'apex' ) . '</p>';
	echo '<p>' . esc_html__( 'Most posters have the baht price printed on them, so in a list where the price differs the offer shows a plain card with the list\'s price, or is hidden, as the list says. An offer can also take its own poster for a list.', 'apex' ) . '</p>';
	echo '<p><b>' . esc_html__( 'Your country as the site sees it:', 'apex' ) . '</b> ' . ( $cc !== '' ? esc_html( "$cc ($from)" ) : esc_html__( 'none. The host sends no country header, so visitors are placed by their browser\'s time zone. See the handover notes.', 'apex' ) ) . '</p>';
	echo '<form method="post" class="apex-fields">';
	wp_nonce_field( 'apex_pricing', 'apex_pricing_nonce' );
	foreach ( apex_pricing_schema() as $f ) apex_field_html( $f, $o[ $f['k'] ] ?? null, 'apex[' . $f['k'] . ']', 'en' );
	submit_button();
	echo '</form><p>' . esc_html__( 'To check a list, open the promotions page with ?country=AU (or any code) at the end of the address while visitors can pick a list.', 'apex' ) . '</p></div>';
}
