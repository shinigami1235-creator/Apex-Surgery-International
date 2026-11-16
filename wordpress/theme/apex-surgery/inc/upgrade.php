<?php
/**
 * Changes a new theme version makes to the content once, on its own, right after IT installs it. They only fill
 * in what is empty or still as the earlier package left it, so nothing Apex has edited is overwritten and
 * `wp apex import` is not needed for these versions.
 *
 * 1.2.0  the 2026 logo (header) and its white version (footer, mobile menu); each service's recovery timeline
 *        as an editable field; each doctor's page address from their name (/doctors/somboon-waiphrip/)
 */
defined( 'ABSPATH' ) || exit;

add_action( 'init', function () {
	$done = (string) get_option( 'apex_upgraded', '1.1.0' );
	if ( version_compare( $done, '1.2.0', '>=' ) || ! function_exists( 'apex_post_lang' ) ) return;
	update_option( 'apex_upgraded', '1.2.0', true );   // first, so two visitors at once do not both run it
	$D = [];
	foreach ( APEX_LANGS as $l ) { $f = APEX_DIR . "/import/content-$l.json"; $D[ $l ] = is_readable( $f ) ? (array) json_decode( (string) file_get_contents( $f ), true ) : []; }

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
