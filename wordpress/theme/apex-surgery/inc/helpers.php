<?php
/**
 * Language, wording, icons, images and links. Each helper matches the one of the same name in
 * assets/js/core.js (A.lang, A.t, A.ic, A.img, A.esc, A.fmtNum, A.fmtDate), so the PHP templates
 * produce the same markup the scripts produced in the design.
 */
defined( 'ABSPATH' ) || exit;

const APEX_LANGS = [ 'en', 'th' ];

/** Current language: Polylang's when it is active, otherwise the ?lang= or the site default. */
function apex_lang(): string {
	static $forced = null;
	if ( isset( $GLOBALS['apex_lang_override'] ) ) return $GLOBALS['apex_lang_override'];
	if ( function_exists( 'pll_current_language' ) ) {
		$l = pll_current_language( 'slug' );
		if ( in_array( $l, APEX_LANGS, true ) ) return $l;
	}
	return apex_default_lang();
}
function apex_default_lang(): string {
	if ( function_exists( 'pll_default_language' ) ) {
		$l = pll_default_language( 'slug' );
		if ( in_array( $l, APEX_LANGS, true ) ) return $l;
	}
	return 'en';
}
/** Run $fn with the language set to $lang (the importer and the data layer use this). */
function apex_with_lang( string $lang, callable $fn ) {
	$prev = $GLOBALS['apex_lang_override'] ?? null;
	$GLOBALS['apex_lang_override'] = $lang;
	try { return $fn(); } finally {
		if ( $prev === null ) unset( $GLOBALS['apex_lang_override'] ); else $GLOBALS['apex_lang_override'] = $prev;
	}
}
function apex_post_lang( $post_id ): string {
	if ( function_exists( 'pll_get_post_language' ) ) {
		$l = pll_get_post_language( $post_id, 'slug' );
		if ( $l ) return $l;
	}
	$l = get_post_meta( $post_id, '_apex_lang', true );
	return $l ?: apex_default_lang();
}

/* ---------- wording ---------- */
function apex_i18n(): array {
	static $t = null;
	if ( $t === null ) {
		$t = json_decode( (string) file_get_contents( APEX_DIR . '/data/i18n.json' ), true ) ?: [];
		// editors can change any label from Apex settings > Wording
		foreach ( APEX_LANGS as $l ) {
			$over = get_option( 'apex_wording_' . $l );
			if ( is_array( $over ) ) foreach ( $over as $k => $v ) if ( $v !== '' ) $t[ $l ][ $k ] = $v;
		}
	}
	return $t;
}
function apex_t( string $key ): string {
	$t = apex_i18n();
	$l = apex_lang();
	return (string) ( $t[ $l ][ $key ] ?? $t['en'][ $key ] ?? $key );
}

/* ---------- escaping, numbers, dates ---------- */
function apex_e( $s ): string {
	return str_replace( [ '&', '<', '>', '"', "'" ], [ '&amp;', '&lt;', '&gt;', '&quot;', '&#39;' ], (string) ( $s ?? '' ) );
}
/** Inline formatting written in the editor, carried as **bold**, *italic* and [text](link). Escaped first, so
 *  nothing else can turn into markup; core.js A.inl() does exactly the same in the browser. */
function apex_inl( $s ): string {
	$h = apex_e( $s );
	$h = preg_replace( '#\[([^\]\n]+)\]\(((?:https?://|mailto:|tel:|/|\#)[^\s()]*)\)#u', '<a href="$2">$1</a>', $h );
	$h = preg_replace( '#\*\*([^*\n]+?)\*\*#u', '<strong>$1</strong>', $h );
	return preg_replace( '#(^|[^*\w])\*([^*\s](?:[^*\n]*?[^*\s])?)\*(?![*\w])#u', '$1<em>$2</em>', $h );
}
function apex_fmt_num( $n ): string {
	$n = (float) $n;
	return number_format( $n, floor( $n ) == $n ? 0 : 2 );
}
function apex_fmt_date( $s ): string {
	if ( ! $s || ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})/', (string) $s, $m ) ) return (string) $s;
	[ , $y, $mo, $d ] = $m;
	$mo = (int) $mo; $d = (int) $d;
	if ( apex_lang() === 'th' ) {
		$th = [ 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม' ];
		return $d . ' ' . $th[ $mo - 1 ] . ' ' . ( (int) $y + 543 );
	}
	$en = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
	return $d . ' ' . $en[ $mo - 1 ] . ' ' . $y;
}

/* ---------- icons ---------- */
function apex_ic( string $n, string $cls = '' ): string {
	static $I = null;
	if ( $I === null ) $I = json_decode( (string) file_get_contents( APEX_DIR . '/data/icons.json' ), true ) ?: [];
	if ( $n === 'close' ) $n = 'x';
	$brand = str_starts_with( $n, 'brand:' ) ? ( ( $n = substr( $n, 6 ) ) !== '' ) : $n !== 'x';   // plain "x" is the close cross, "brand:x" the X logo
	if ( $brand && isset( $I[ 'b_' . $n ] ) ) return '<svg class="i br ' . $cls . '" viewBox="0 0 24 24" aria-hidden="true"><path d="' . $I[ 'b_' . $n ] . '"/></svg>';
	if ( isset( $I[ 'l_' . $n ] ) ) return '<svg class="i l ' . $cls . '" viewBox="0 0 24 24" aria-hidden="true">' . $I[ 'l_' . $n ] . '</svg>';
	return '';
}
function apex_soc_icon( string $k ): string { return apex_ic( 'brand:' . $k ) ?: apex_ic( 'globe' ); }

/* ---------- images ---------- */
/** Images saved as "~/wp-content/uploads/..." sit at the site root. A local copy can point them at the live
 *  site instead (define APEX_MEDIA_BASE in wp-config.php), since its uploads folder is empty. */
function apex_media_base(): string {
	if ( defined( 'APEX_MEDIA_BASE' ) ) return trailingslashit( APEX_MEDIA_BASE );
	return trailingslashit( get_option( 'home' ) );
}
function apex_img( $s ): string {
	$s = (string) ( $s ?? '' );
	if ( $s === '' ) return '';
	if ( str_starts_with( $s, '~/' ) ) return apex_media_base() . substr( $s, 2 );
	if ( preg_match( '#^(img|video|fonts|css|js|features)/#', $s ) ) return apex_asset( $s );   // a file that ships with the theme
	return $s;
}
/** The reverse, for storing: an upload URL on this site becomes "~/..." so content survives a domain move. */
function apex_img_store( $s ): string {
	$s = trim( (string) $s );
	$base = trailingslashit( get_option( 'home' ) );
	foreach ( array_unique( [ $base, apex_media_base(), 'https://www.apexsurgeryhospital.com/' ] ) as $b ) {
		if ( $b && str_starts_with( $s, $b . 'wp-content/' ) ) return '~/' . substr( $s, strlen( $b ) );
	}
	return $s;
}
/** srcset and sizes for a wide photo that `wp apex webp` made phone-size copies of; '' for any other photo. */
function apex_srcset( $src, string $sizes ): string {
	static $map = null;
	if ( $map === null ) { $map = get_option( 'apex_photo_sizes' ); $map = is_array( $map ) ? $map : []; }
	$src = (string) $src;
	if ( ! $map || ! preg_match( '#/wp-content/uploads/(.+)$#', $src, $m ) ) return '';
	$rel = rawurldecode( $m[1] );
	if ( empty( $map[ $rel ]['v'] ) ) return '';
	$set = [];
	foreach ( $map[ $rel ]['v'] as $w => $r ) $set[] = esc_url( apex_img( '~/wp-content/uploads/' . $r ) ) . " {$w}w";
	$set[] = esc_url( apex_img( $src ) ) . ' ' . (int) $map[ $rel ]['w'] . 'w';
	return ' srcset="' . implode( ', ', $set ) . '" sizes="' . esc_attr( $sizes ) . '"';
}
function apex_yt( string $id ): string { return 'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg'; }
function apex_asset( string $path ): string { return APEX_URI . '/assets/' . ltrim( $path, '/' ); }

/* ---------- links ----------
   The templates keep the design's page names ('plan.html', 'service.html?p=facelift') so they read the same as
   pages.js; apex_link() turns each into the WordPress address in the current language. */
const APEX_PAGES = [
	'index.html' => 'home', 'about.html' => 'about', 'services.html' => 'services', 'doctor.html' => 'doctor',
	'promotions.html' => 'promotions', 'reviews.html' => 'reviews', 'blog.html' => 'blog', 'surgery-wars.html' => 'war',
	'contact.html' => 'contact', 'treatments.html' => 'treatments', 'transformations.html' => 'shows', 'filler.html' => 'filler',
	'nose.html' => 'implNose', 'analysis.html' => 'analysis', 'proportions.html' => 'proportions',
	'breast-implants.html' => 'implBreast', 'chin-implants.html' => 'implChin', 'forehead-implants.html' => 'implForehead',
	'nose-implants.html' => 'implNose', 'play.html' => 'play', 'plan.html' => 'plan', 'trip.html' => 'trip', 'consult.html' => 'consult', 'privacy.html' => 'privacy',
	// names the feature modules use
	'my-plan.html' => 'plan', 'games.html' => 'play', 'bodymap.html' => 'home',
];
/** WordPress page id for a design page key in a language, or 0. */
function apex_page_id( string $key, ?string $lang = null ): int {
	static $map = null;
	$lang = $lang ?: apex_lang();
	if ( $map === null ) {
		$map = [];
		$q = get_posts( [ 'post_type' => 'page', 'post_status' => [ 'publish', 'private', 'draft' ], 'posts_per_page' => -1, 'meta_key' => '_apex_page', 'lang' => '', 'suppress_filters' => true, 'fields' => 'ids' ] );
		foreach ( $q as $id ) {
			$k = get_post_meta( $id, '_apex_page', true );
			$l = apex_post_lang( $id );
			if ( $k && get_post_status( $id ) === 'publish' ) $map[ $k ][ $l ] = $id;
			elseif ( $k && ! isset( $map[ $k ][ $l ] ) ) $map[ $k ][ $l ] = $id;
		}
	}
	return (int) ( $map[ $key ][ $lang ] ?? 0 );
}
function apex_home_url( ?string $lang = null ): string {
	$lang = $lang ?: apex_lang();
	if ( function_exists( 'pll_home_url' ) ) return pll_home_url( $lang );
	return home_url( '/' );
}
/** Post id of a content item by its design key (services, articles, episodes). */
function apex_key_id( string $type, string $key, ?string $lang = null ): int {
	static $cache = [];
	$pv = $GLOBALS['apex_preview'] ?? null;
	if ( $pv && $pv->post_type === $type && (string) get_post_meta( $pv->ID, '_apex_key', true ) === $key ) return (int) $pv->ID;
	$lang = $lang ?: apex_lang();
	$ck = "$type|$key|$lang";
	if ( isset( $cache[ $ck ] ) ) return $cache[ $ck ];
	$ids = get_posts( [ 'post_type' => $type, 'post_status' => 'publish', 'posts_per_page' => -1, 'meta_key' => '_apex_key', 'meta_value' => $key, 'lang' => '', 'suppress_filters' => true, 'fields' => 'ids' ] );
	$found = 0;
	foreach ( $ids as $id ) if ( apex_post_lang( $id ) === $lang ) { $found = (int) $id; break; }
	return $cache[ $ck ] = $found;
}
function apex_link( string $href, ?string $lang = null ): string {
	$lang = $lang ?: apex_lang();
	if ( preg_match( '#^(https?:|tel:|mailto:|\#)#', $href ) ) return $href;
	$hash = '';
	if ( ( $p = strpos( $href, '#' ) ) !== false ) { $hash = substr( $href, $p ); $href = substr( $href, 0, $p ); }
	$query = '';
	if ( ( $p = strpos( $href, '?' ) ) !== false ) { $query = substr( $href, $p + 1 ); $href = substr( $href, 0, $p ); }
	parse_str( $query, $q );
	$file = $href === '' ? 'index.html' : $href;
	if ( $file === 'service.html' && ! empty( $q['p'] ) ) {
		$id = apex_key_id( 'apex_service', $q['p'], $lang );
		return ( $id ? get_permalink( $id ) : apex_link( 'services.html', $lang ) ) . $hash;
	}
	if ( $file === 'article.html' && ! empty( $q['p'] ) ) {
		$id = apex_key_id( 'post', $q['p'], $lang );
		return ( $id ? get_permalink( $id ) : apex_link( 'blog.html', $lang ) ) . $hash;
	}
	if ( $file === 'surgery-wars.html' && ! empty( $q['ep'] ) ) {
		$id = apex_key_id( 'apex_episode', (string) $q['ep'], $lang );
		if ( $id ) return get_permalink( $id ) . $hash;
		unset( $q['ep'] );
	}
	$key = APEX_PAGES[ $file ] ?? null;
	if ( $file === 'bodymap.html' ) $hash = $hash ?: '#hero';
	if ( ! $key ) return $href . ( $query ? '?' . $query : '' ) . $hash;
	$url = $key === 'home' ? apex_home_url( $lang ) : ( ( $id = apex_page_id( $key, $lang ) ) ? get_permalink( $id ) : apex_home_url( $lang ) );
	return $url . ( $q ? '?' . http_build_query( $q ) : '' ) . $hash;
}
function apex_svc_url( string $k ): string { return apex_link( 'service.html?p=' . rawurlencode( $k ) ); }
function apex_post_url( string $k ): string { return apex_link( 'article.html?p=' . rawurlencode( $k ) ); }

/** Every design page name and content key mapped to its address, for the scripts (the feature modules
 *  still link to 'consult.html' and the like). */
function apex_link_map( ?string $lang = null ): array {
	$lang = $lang ?: apex_lang();
	$ck = 'apex_links_' . (int) get_option( 'apex_data_v', 1 ) . '_' . $lang;
	$hit = get_transient( $ck );
	if ( is_array( $hit ) ) return $hit;
	$m = apex_link_map_build( $lang );
	set_transient( $ck, $m, DAY_IN_SECONDS );
	return $m;
}
function apex_link_map_build( string $lang ): array {
	$m = [];
	foreach ( array_keys( APEX_PAGES ) as $f ) $m[ $f ] = apex_link( $f, $lang );
	foreach ( [ 'apex_service' => 'service', 'post' => 'article', 'apex_episode' => 'ep' ] as $type => $pre ) {
		$ids = get_posts( [ 'post_type' => $type, 'post_status' => 'publish', 'posts_per_page' => -1, 'lang' => '', 'suppress_filters' => true, 'fields' => 'ids' ] );
		foreach ( $ids as $id ) {
			if ( apex_post_lang( $id ) !== $lang ) continue;
			$k = get_post_meta( $id, '_apex_key', true );
			if ( $k !== '' ) $m[ $pre . ':' . $k ] = get_permalink( $id );
		}
	}
	return $m;
}

/** A small request parameter reader that ignores anything but short slugs. */
function apex_param( string $k ): ?string {
	if ( isset( $GLOBALS['apex_params'][ $k ] ) ) return (string) $GLOBALS['apex_params'][ $k ];
	if ( ! isset( $_GET[ $k ] ) ) return null;
	$v = sanitize_text_field( wp_unslash( $_GET[ $k ] ) );
	return preg_match( '/^[\p{L}\p{N}_-]{1,80}$/u', $v ) ? $v : null;
}
