<?php
/**
 * Old addresses keep working. The live site was Thai only, at the root; Thai now lives under /th/.
 * Every page, service and article the import brought over carries its old address (meta _apex_old), so a visit
 * to /review/smas/ lands on /th/review/smas/ with a permanent (301) redirect. Apex settings › Redirects adds
 * any others by hand, one "old -> new" per line, with 302 at the end of the line for a temporary move.
 */
defined( 'ABSPATH' ) || exit;

/** The old live site's service landing pages and test pages, by service key. */
const APEX_OLD_LANDINGS = [
	'facelift-service' => 'facelift', 'liposuction-service' => 'lipo', 'nose-surgery-service' => 'rhinoplasty',
	'breast-surgery-service' => 'breast', 'test-lipo' => 'lipo',
];

function apex_norm_path( string $p ): string {
	$p = rawurldecode( (string) parse_url( $p, PHP_URL_PATH ) );
	$home = trim( (string) parse_url( home_url( '/' ), PHP_URL_PATH ), '/' );
	$p = trim( $p, '/' );
	if ( $home !== '' && str_starts_with( $p, $home . '/' ) ) $p = substr( $p, strlen( $home ) + 1 );
	return mb_strtolower( $p );
}

/** Where an old address should go now, or '' when it is not one we know. */
function apex_redirect_for( string $path ): string {
	$p = apex_norm_path( $path );
	if ( $p === '' ) return '';
	// 1. typed in by an editor
	foreach ( apex_manual_redirects() as $from => $r ) if ( $from === $p ) return $r['to'];
	// 2. an item that came from the old site
	$ids = get_posts( [ 'post_type' => 'any', 'post_status' => 'publish', 'meta_key' => '_apex_old', 'meta_value' => $p, 'posts_per_page' => 1, 'fields' => 'ids', 'lang' => '', 'suppress_filters' => true ] );
	if ( $ids ) return get_permalink( $ids[0] );
	// 3. the old service landing pages
	if ( isset( APEX_OLD_LANDINGS[ $p ] ) ) { $id = apex_key_id( 'apex_service', APEX_OLD_LANDINGS[ $p ], 'th' ); if ( $id ) return get_permalink( $id ); }
	// 4. old category archives: /review/, /category/review/ and their pages
	if ( preg_match( '#^(?:category/)?(review|blog|news|tips)(?:/page/\d+)?$#', $p, $m ) ) {
		if ( $m[1] !== 'tips' ) foreach ( get_terms( [ 'taxonomy' => 'category', 'hide_empty' => false, 'lang' => '', 'meta_key' => '_apex_cat', 'meta_value' => $m[1] ] ) as $t ) {
			if ( apex_term_lang( $t->term_id ) === 'th' ) { $l = get_term_link( $t ); if ( ! is_wp_error( $l ) ) return $l; }
		}
		return apex_link( 'blog.html', 'th' );
	}
	return '';
}
function apex_term_lang( int $id ): string { return function_exists( 'pll_get_term_language' ) ? (string) pll_get_term_language( $id, 'slug' ) : 'th'; }
function apex_manual_redirects(): array {
	$out = [];
	foreach ( preg_split( '/\r\n|\r|\n/', (string) get_option( 'apex_redirects', '' ) ) as $line ) {
		if ( ! preg_match( '/^\s*(\S+)\s*(?:->|=>|\s)\s*(\S+?)(?:\s+(30[1278]))?\s*$/u', $line, $m ) ) continue;
		$to = $m[2];
		if ( ! preg_match( '#^https?://#', $to ) ) $to = home_url( '/' . ltrim( $to, '/' ) );
		$out[ apex_norm_path( $m[1] ) ] = [ 'to' => $to, 'code' => (int) ( $m[3] ?? 0 ) ?: 301 ];
	}
	return $out;
}

/* runs before WordPress guesses a page for the missing address */
add_action( 'template_redirect', function () {
	if ( ! is_404() ) return;
	$to = apex_redirect_for( $_SERVER['REQUEST_URI'] ?? '' );
	if ( ! $to ) return;
	$q = (string) parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_QUERY );
	if ( $q !== '' && ! str_contains( $to, '?' ) ) $to .= '?' . $q;
	// addresses an administrator typed under Apex settings › Redirects may go to another site, and may be temporary
	$manual = apex_manual_redirects()[ apex_norm_path( $_SERVER['REQUEST_URI'] ?? '' ) ] ?? null;
	$manual ? wp_redirect( $to, $manual['code'], 'Apex' ) : wp_safe_redirect( $to, 301, 'Apex' );
	exit;
}, 1 );

/* Apex settings › Redirects */
add_action( 'admin_menu', function () {
	add_submenu_page( 'apex-settings', __( 'Redirects', 'apex' ), __( 'Redirects', 'apex' ), 'manage_options', 'apex-redirects', function () {
		if ( ! current_user_can( 'manage_options' ) ) return;
		if ( isset( $_POST['apex_redirects_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_redirects_nonce'] ), 'apex_redirects' ) ) {
			update_option( 'apex_redirects', sanitize_textarea_field( wp_unslash( $_POST['apex_redirects'] ?? '' ) ), false );
			echo '<div class="notice notice-success"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
		}
		$test = isset( $_GET['test'] ) ? sanitize_text_field( wp_unslash( $_GET['test'] ) ) : '';
		echo '<div class="wrap"><h1>' . esc_html__( 'Redirects', 'apex' ) . '</h1>';
		echo '<p>' . esc_html__( 'Addresses from the old site already forward to their new pages. Add others here, one per line: the old address, an arrow, the new one. They move for good (301). Add 302 at the end of a line for a move that is only for now, such as a page down for a week.', 'apex' ) . '</p><p><code>/old-page/ -> /th/promotions/</code><br><code>/summer/ -> /th/promotions/ 302</code></p>';
		echo '<form method="post">';
		wp_nonce_field( 'apex_redirects', 'apex_redirects_nonce' );
		echo '<textarea name="apex_redirects" rows="12" class="large-text code">' . esc_textarea( (string) get_option( 'apex_redirects', '' ) ) . '</textarea>';
		submit_button();
		echo '</form><h2>' . esc_html__( 'Test an old address', 'apex' ) . '</h2><form method="get"><input type="hidden" name="page" value="apex-redirects"><input class="regular-text" name="test" value="' . esc_attr( $test ) . '" placeholder="/review/smas/"> ';
		submit_button( __( 'Test', 'apex' ), 'secondary', '', false );
		echo '</form>';
		if ( $test !== '' ) {
			$to = apex_redirect_for( $test );
			$code = ( apex_manual_redirects()[ apex_norm_path( $test ) ]['code'] ?? 301 );
			echo '<p>' . ( $to ? esc_html__( 'Goes to', 'apex' ) . ' <a href="' . esc_url( $to ) . '">' . esc_html( rawurldecode( $to ) ) . '</a> (' . $code . ')' : esc_html__( 'No redirect: this address shows its own page, or the not-found page.', 'apex' ) ) . '</p>';
		}
		echo '</div>';
	} );
} );
