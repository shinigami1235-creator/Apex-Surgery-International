<?php
/**
 * Changes a new theme version makes to the content once, on its own, right after IT installs it. They only fill
 * in what is empty or still as the earlier package left it, so nothing Apex has edited is overwritten and
 * `wp apex import` is not needed for these versions.
 *
 * 1.2.0  the 2026 logo (header) and its white version (footer, mobile menu); each service's recovery timeline
 *        as an editable field; each doctor's page address from their name (/doctors/somboon-waiphrip/)
 * 1.3.0  Apex's answers of 20 Nov 2026: the WhatsApp number +66 88 624 1617; 21 days' stay after facial bone
 *        surgery; a photo on the facelift, rhinoplasty, eye, breast and liposuction cards; the current facelift,
 *        brow lift and liposuction posters with their prices in place of the old ones
 * 1.3.1  Apex settings › Features with the games, Surgery Wars, the non-surgical treatments page and Chinese
 *        switched off for the launch; each procedure page's photos as its Section photos field
 */
defined( 'ABSPATH' ) || exit;

function apex_upgrade_content(): array {
	$D = [];
	foreach ( APEX_LANGS as $l ) { $f = APEX_DIR . "/import/content-$l.json"; $D[ $l ] = is_readable( $f ) ? (array) json_decode( (string) file_get_contents( $f ), true ) : []; }
	return $D;
}

add_action( 'init', function () {
	$done = (string) get_option( 'apex_upgraded', '1.1.0' );
	if ( version_compare( $done, '1.2.0', '>=' ) || ! function_exists( 'apex_post_lang' ) ) return;
	update_option( 'apex_upgraded', '1.2.0', true );   // first, so two visitors at once do not both run it
	$D = apex_upgrade_content();

	// the logo: replaced only while it is still the old file the 1.0 and 1.1 packages set
	foreach ( APEX_LANGS as $l ) {
		$S = apex_read_option( $l );
		$new = $D[ $l ]['shared'] ?? [];
		$set = [];
		if ( in_array( (string) ( $S['logo'] ?? '' ), [ '', '~/wp-content/uploads/2025/04/logo-apex-surgery.webp' ], true ) && ! empty( $new['logo'] ) ) $set['logo'] = $new['logo'];
		if ( empty( $S['logoLight'] ) && ! empty( $new['logoLight'] ) ) $set['logoLight'] = $new['logoLight'];
		if ( $set ) apex_write_option( $l, $set );
	}

	// recovery timelines: filled on services that have none yet
	foreach ( APEX_LANGS as $l ) {
		$by = [];
		foreach ( $D[ $l ]['shared']['services'] ?? [] as $m ) if ( ! empty( $m['recovery'] ) ) $by[ $m['key'] ] = $m['recovery'];
		foreach ( apex_posts( 'apex_service', $l ) as $id ) {
			$k = (string) get_post_meta( $id, '_apex_key', true );
			if ( isset( $by[ $k ] ) && ! get_post_meta( $id, apex_meta_key( 'recovery' ), true ) ) update_post_meta( $id, apex_meta_key( 'recovery' ), $by[ $k ] );
		}
	}

	// doctors' page addresses: the English name, the same in both languages, where the address is still the
	// imported one (dr-<key>, founder, surgeon-1)
	$names = [];
	foreach ( $D['en']['team']['docs'] ?? [] as $d ) $names[ $d['key'] ] = (string) ( $d['name'] ?? '' );
	if ( ! empty( $D['en']['founder']['name'] ) ) $names['founder'] = (string) $D['en']['founder']['name'];
	foreach ( APEX_LANGS as $l ) foreach ( apex_posts( 'apex_doctor', $l ) as $id ) {
		$k = (string) get_post_meta( $id, '_apex_key', true );
		$slug = (string) get_post_field( 'post_name', $id );
		if ( ! isset( $names[ $k ] ) || ! preg_match( '/^(dr-[a-z0-9-]+|founder(-\d+)?|surgeon-\d+(-\d+)?|[a-z]+-\d+)$/', $slug ) ) continue;
		$n = sanitize_title( preg_replace( '/^\s*(Dr|Prof|Assoc\.?\s*Prof)\.?\s+/i', '', $names[ $k ] ) );
		if ( $n !== '' && $n !== $slug ) wp_update_post( [ 'ID' => $id, 'post_name' => $n ] );
	}

	apex_data_bump();
	flush_rewrite_rules( false );
}, 98 );

/** The short code an imported offer or case is keyed by: the first 10 characters of the md5 of the file name. */
function apex_upgrade_hash( string $src ): string { return substr( md5( basename( $src ) ), 0, 10 ); }

add_action( 'init', function () {
	$done = (string) get_option( 'apex_upgraded', '1.1.0' );
	if ( version_compare( $done, '1.2.0', '<' ) || version_compare( $done, '1.3.0', '>=' ) || ! function_exists( 'apex_post_lang' ) ) return;
	update_option( 'apex_upgraded', '1.3.0', true );
	$D = apex_upgrade_content();

	// WhatsApp: only while it is still the group's international line the earlier packages set
	foreach ( APEX_LANGS as $l ) {
		$S = apex_read_option( $l );
		if ( in_array( (string) ( $S['whatsapp']['h'] ?? '' ), [ '', 'https://wa.me/66850002001' ], true ) ) apex_write_option( $l, [ 'whatsapp' => [ 'x' => '+66 88 624 1617', 'h' => 'https://wa.me/66886241617' ] ] );
	}

	// services: the card photo where there is none, and 21 days for facial bone surgery while it is still 14
	foreach ( APEX_LANGS as $l ) {
		$by = [];
		foreach ( $D[ $l ]['shared']['services'] ?? [] as $m ) $by[ $m['key'] ] = $m;
		foreach ( apex_posts( 'apex_service', $l ) as $id ) {
			$k = (string) get_post_meta( $id, '_apex_key', true );
			$menu = (array) get_post_meta( $id, apex_meta_key( 'menu' ), true );
			if ( ! empty( $by[ $k ]['tile'] ) && empty( $menu['tile'] ) ) apex_write_post( $id, 'apex_service', [ 'menu' => [ 'tile' => $by[ $k ]['tile'] ] + $menu ] );
			$stay = (int) get_post_meta( $id, apex_meta_key( 'stay' ), true );
			if ( $k === 'bone' && in_array( $stay, [ 0, 14 ], true ) ) update_post_meta( $id, apex_meta_key( 'stay' ), 21 );
		}
	}

	// offers: the old facelift, Endotine brow lift and liposuction posters come off the promotions and home
	// pages while they still show the poster they were imported with; the posts stay, unticked
	$old = [ '0309fde25c', '2ee76afe66', '5b7ecf8581', '6c0bd4045e', '8b60bdd6e7', 'ab57076d4c', 'cb78621d15', 'db1a147827', 'e1b77a8813', 'ab9383e4ce', 'd499bde2c4' ];
	$made = [];
	foreach ( APEX_LANGS as $l ) {
		$have = [];
		foreach ( get_posts( [ 'post_type' => 'apex_offer', 'post_status' => 'any', 'posts_per_page' => -1, 'lang' => '', 'suppress_filters' => true, 'fields' => 'ids' ] ) as $id ) {
			if ( apex_post_lang( $id ) !== $l ) continue;
			$have[ (string) get_post_meta( $id, '_apex_key', true ) ] = $id;
			$o = apex_read_post( $id, 'apex_offer' );
			$h = apex_upgrade_hash( (string) $o['src'] );
			if ( in_array( $h, $old, true ) && get_post_meta( $id, '_apex_key', true ) === "offer-$h" ) apex_write_post( $id, 'apex_offer', [ 'onPromotions' => false, 'onHome' => false ] );
		}
		$promo = $D[ $l ]['promotions']['items'] ?? [];
		$home = $D[ $l ]['home']['promos']['items'] ?? [];
		$home_at = [];
		foreach ( $home as $i => $p ) $home_at[ $p['src'] ] = $i + 1;
		foreach ( $promo as $i => $p ) {
			$key = 'offer-' . apex_upgrade_hash( $p['src'] );
			$vals = [ 'order' => $i + 1 ];
			if ( str_starts_with( (string) $p['src'], 'img/promo/' ) ) {
				$vals += [ 'alt' => $p['alt'] ?? '', 'src' => $p['src'], 'cat' => $p['cat'] ?? '', 'price' => $p['price'] ?? '', 'from' => ! empty( $p['from'] ), 'ends' => $p['ends'] ?? '', 'onPromotions' => true ];
				if ( isset( $home_at[ $p['src'] ] ) ) $vals += [ 'onHome' => true, 'homeOrder' => $home_at[ $p['src'] ] ];
				if ( empty( $have[ $key ] ) ) {
					$id = wp_insert_post( [ 'post_type' => 'apex_offer', 'post_status' => 'publish', 'post_title' => $vals['alt'], 'comment_status' => 'closed', 'ping_status' => 'closed', 'meta_input' => [ '_apex_key' => $key, '_apex_new_set' => 1 ] ], true );
					if ( is_wp_error( $id ) ) continue;
					pll_set_post_language( $id, $l );
					$have[ $key ] = $id;
				}
				$made[ $key ][ $l ] = $have[ $key ];
			}
			if ( ! empty( $have[ $key ] ) ) apex_write_post( $have[ $key ], 'apex_offer', $vals );
		}
	}
	if ( function_exists( 'pll_save_post_translations' ) ) foreach ( $made as $ids ) if ( count( $ids ) > 1 ) pll_save_post_translations( $ids );

	// the offer posters on the facelift, brow lift and liposuction pages, while they are still the imported ones
	$was = [ 'facelift' => [ '2ee76afe66' ], 'browlift' => [ '2ee76afe66', 'cb78621d15' ], 'lipo' => [ '1446b44fbc', '42a84c26ce', '451ad1ce0a', '4c467a38ad', '58e8d6a842', '60c024c713', '9e9ee55bac', 'bd2439d87e' ] ];
	foreach ( APEX_LANGS as $l ) foreach ( apex_posts( 'apex_service', $l ) as $id ) {
		$k = (string) get_post_meta( $id, '_apex_key', true );
		if ( ! isset( $was[ $k ], $D[ $l ][ "svc:$k" ]['promos'] ) ) continue;
		$now = array_map( fn( $r ) => apex_upgrade_hash( (string) ( $r['src'] ?? '' ) ), (array) get_post_meta( $id, apex_meta_key( 'promos' ), true ) );
		sort( $now );
		if ( $now === $was[ $k ] ) apex_write_post( $id, 'apex_service', [ 'promos' => $D[ $l ][ "svc:$k" ]['promos'] ] );
	}

	apex_data_bump();
}, 99 );

add_action( 'init', function () {
	$done = (string) get_option( 'apex_upgraded', '1.1.0' );
	if ( version_compare( $done, '1.3.0', '<' ) || version_compare( $done, '1.3.1', '>=' ) || ! function_exists( 'apex_post_lang' ) ) return;
	update_option( 'apex_upgraded', '1.3.1', true );
	$D = apex_upgrade_content();

	// the parts waiting for Apex start switched off; Apex settings › Features turns each on
	if ( get_option( 'apex_features' ) === false ) update_option( 'apex_features', [ 'games' => false, 'wars' => false, 'treatments' => false, 'zh' => false ], true );

	// the photos beside each procedure page's sections were in the theme's code until 1.3.0; now they are a field
	foreach ( [ 'en', 'th' ] as $l ) foreach ( apex_posts( 'apex_service', $l ) as $id ) {
		$k = (string) get_post_meta( $id, '_apex_key', true );
		$want = $D[ $l ][ "svc:$k" ]['photos'] ?? null;
		if ( $want && ! get_post_meta( $id, apex_meta_key( 'photos' ), true ) ) apex_write_post( $id, 'apex_service', [ 'photos' => $want ] );
	}
	// the sample faces in Face analysis and Golden proportions were fixed in the tools' code; now they are settings
	foreach ( [ 'en', 'th' ] as $l ) {
		$o = get_option( 'apex_shared_' . $l );
		if ( is_array( $o ) && empty( $o['samples'] ) && ! empty( $D[ $l ]['shared']['samples'] ) ) { $o['samples'] = $D[ $l ]['shared']['samples']; update_option( 'apex_shared_' . $l, $o ); }
	}
	apex_data_bump();
}, 100 );
