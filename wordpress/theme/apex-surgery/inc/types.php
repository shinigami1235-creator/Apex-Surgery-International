<?php
/**
 * Content types, their Polylang registration, and slugs shared across languages.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'init', function () {
	$cpt = function ( string $type, string $one, string $many, array $args ) {
		register_post_type( $type, $args + [
			'labels' => [ 'name' => $many, 'singular_name' => $one, 'add_new_item' => "Add $one", 'edit_item' => "Edit $one", 'new_item' => "New $one", 'view_item' => "View $one", 'search_items' => "Search $many", 'not_found' => "No $many found", 'all_items' => "All $many", 'menu_name' => $many ],
			'show_in_rest' => true,
			'menu_position' => 21,
		] );
	};
	$cpt( 'apex_service', 'Service', 'Services', [ 'public' => true, 'menu_icon' => 'dashicons-heart', 'supports' => [ 'title', 'editor', 'revisions', 'page-attributes' ], 'rewrite' => [ 'slug' => 'surgery', 'with_front' => false ], 'has_archive' => false ] );
	$cpt( 'apex_episode', 'Episode', 'Surgery Wars', [ 'public' => true, 'menu_icon' => 'dashicons-video-alt3', 'supports' => [ 'title', 'editor', 'excerpt', 'revisions' ], 'rewrite' => [ 'slug' => 'surgery-wars', 'with_front' => false ], 'has_archive' => false ] );
	$hidden = [ 'public' => false, 'show_ui' => true, 'show_in_menu' => true, 'exclude_from_search' => true, 'publicly_queryable' => false, 'rewrite' => false ];
	$cpt( 'apex_offer', 'Offer', 'Offers', $hidden + [ 'menu_icon' => 'dashicons-tag', 'supports' => [ 'title', 'revisions' ] ] );
	$cpt( 'apex_case', 'Before and after case', 'Before and after', $hidden + [ 'menu_icon' => 'dashicons-images-alt2', 'supports' => [ 'title', 'page-attributes' ] ] );
	$cpt( 'apex_branch', 'Branch', 'Branches', $hidden + [ 'menu_icon' => 'dashicons-location', 'supports' => [ 'title', 'page-attributes' ] ] );
	$cpt( 'apex_doctor', 'Doctor', 'Doctors', $hidden + [ 'menu_icon' => 'dashicons-businessperson', 'supports' => [ 'title', 'page-attributes', 'revisions' ] ] );
	// enquiries and vouchers hold personal details: no REST, no search, editors and admins only
	$private = [ 'public' => false, 'show_ui' => true, 'show_in_menu' => true, 'show_in_rest' => false, 'exclude_from_search' => true, 'publicly_queryable' => false, 'rewrite' => false, 'capability_type' => 'post', 'map_meta_cap' => true, 'capabilities' => [ 'create_posts' => 'do_not_allow' ] ];
	$cpt( 'apex_lead', 'Enquiry', 'Enquiries', $private + [ 'menu_icon' => 'dashicons-email-alt', 'supports' => [ 'title' ], 'menu_position' => 3 ] );
	$cpt( 'apex_voucher', 'Voucher', 'Vouchers', $private + [ 'menu_icon' => 'dashicons-tickets-alt', 'supports' => [ 'title' ], 'menu_position' => 4 ] );

	// the site has no comments or trackbacks anywhere
	foreach ( [ 'post', 'page', 'attachment' ] as $t ) { remove_post_type_support( $t, 'comments' ); remove_post_type_support( $t, 'trackbacks' ); }

	register_post_meta( '', '_apex_key', [ 'type' => 'string', 'single' => true, 'show_in_rest' => false ] );
	register_post_meta( 'page', '_apex_page', [ 'type' => 'string', 'single' => true, 'show_in_rest' => false ] );
} );

/* Polylang translates these; enquiries and vouchers stay single-language records */
add_filter( 'pll_get_post_types', function ( $types, $is_settings ) {
	foreach ( [ 'apex_service', 'apex_episode', 'apex_offer', 'apex_case', 'apex_branch', 'apex_doctor' ] as $t ) $types[ $t ] = $t;
	unset( $types['apex_lead'], $types['apex_voucher'] );
	return $types;
}, 10, 2 );

/* ---------- one slug in both languages ----------
   Polylang (free) makes every slug unique across languages, so /th/surgery-wars/ep-1/ would become ep-1-2.
   A slug is allowed again when every other post that has it is in another language. Polylang Pro and WPML
   do this themselves; the filter steps aside when they are active. */
const APEX_SHARED_SLUG_TYPES = [ 'post', 'page', 'apex_service', 'apex_episode' ];
add_filter( 'wp_unique_post_slug', function ( $slug, $post_id, $status, $type, $parent, $original ) {
	if ( $slug === $original || ! in_array( $type, APEX_SHARED_SLUG_TYPES, true ) || ! function_exists( 'pll_get_post_language' ) ) return $slug;
	if ( defined( 'POLYLANG_PRO' ) || defined( 'ICL_SITEPRESS_VERSION' ) ) return $slug;
	$lang = pll_get_post_language( $post_id, 'slug' );
	if ( ! $lang ) return $slug;
	global $wpdb;
	$sql = "SELECT ID FROM $wpdb->posts WHERE post_name = %s AND post_type = %s AND ID != %d AND post_status NOT IN ('trash','auto-draft','inherit')";
	$args = [ $original, $type, (int) $post_id ];
	if ( is_post_type_hierarchical( $type ) ) { $sql .= ' AND post_parent = %d'; $args[] = (int) $parent; }
	$others = $wpdb->get_col( $wpdb->prepare( $sql, ...$args ) );
	foreach ( $others as $o ) if ( pll_get_post_language( (int) $o, 'slug' ) === $lang ) return $slug;
	return $original;
}, 20, 6 );

/** Language of the current request from its address: /th/... is Thai, anything else the default. */
function apex_request_lang(): string {
	$path = trim( (string) parse_url( $_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH ), '/' );
	$home = trim( (string) parse_url( home_url( '/' ), PHP_URL_PATH ), '/' );
	if ( $home && str_starts_with( $path, $home ) ) $path = trim( substr( $path, strlen( $home ) ), '/' );
	foreach ( APEX_LANGS as $l ) if ( $l !== apex_default_lang() && ( $path === $l || str_starts_with( $path, $l . '/' ) ) ) return $l;
	return apex_default_lang();
}

/* With shared slugs, a page or post address must be resolved within its language: WordPress would
   otherwise return whichever post with that slug it finds first. */
add_filter( 'request', function ( $qv ) {
	if ( is_admin() || ! function_exists( 'pll_get_post_language' ) ) return $qv;
	$lang = apex_request_lang();
	$pick = function ( array $ids ) use ( $lang ) {
		foreach ( $ids as $id ) if ( pll_get_post_language( (int) $id, 'slug' ) === $lang ) return (int) $id;
		return 0;
	};
	global $wpdb;
	if ( ! empty( $qv['pagename'] ) ) {
		$parts = array_values( array_filter( explode( '/', $qv['pagename'] ) ) );
		$leaf = sanitize_title( rawurldecode( end( $parts ) ) );
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM $wpdb->posts WHERE post_name = %s AND post_type = 'page' AND post_status IN ('publish','private')", $leaf ) );
		if ( count( $ids ) > 1 && ( $id = $pick( $ids ) ) ) { unset( $qv['pagename'] ); $qv['page_id'] = $id; }
	} elseif ( ! empty( $qv['name'] ) ) {
		$type = $qv['post_type'] ?? 'post';
		if ( is_array( $type ) || ! in_array( $type, APEX_SHARED_SLUG_TYPES, true ) ) return $qv;
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM $wpdb->posts WHERE post_name = %s AND post_type = %s AND post_status = 'publish'", sanitize_title( rawurldecode( $qv['name'] ) ), $type ) );
		// an article address names its category too: only posts filed under it count, so /review/smas/
		// (the old Thai address) does not open the English article that shares the slug
		if ( count( $ids ) > 1 && ! empty( $qv['category_name'] ) ) {
			$cat = basename( (string) $qv['category_name'] );
			$in = array_values( array_filter( $ids, fn( $id ) => has_term( $cat, 'category', (int) $id ) ) );
			if ( ! $in ) return [ 'error' => '404' ];                  // the slug exists, but not under this category
			if ( count( $in ) === 1 ) { $qv['p'] = (int) $in[0]; $qv['post_type'] = $type; unset( $qv['name'], $qv['category_name'] ); return $qv; }
			$ids = $in;
		}
		if ( count( $ids ) > 1 && ( $id = $pick( $ids ) ) ) { $qv['p'] = $id; $qv['post_type'] = $type; unset( $qv['name'], $qv['category_name'] ); }
	}
	return $qv;
}, 5 );
