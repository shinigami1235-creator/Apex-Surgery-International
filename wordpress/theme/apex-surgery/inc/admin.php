<?php
/**
 * The admin, arranged for the hospital's editors: a start panel on the dashboard, clearer menu names,
 * thumbnails and flags in the lists, and links from each list to the page it feeds.
 */
defined( 'ABSPATH' ) || exit;

/* "Posts" are the site's articles, reviews and news */
add_action( 'init', function () {
	$o = get_post_type_object( 'post' );
	if ( ! $o ) return;
	foreach ( [ 'name' => 'Articles', 'singular_name' => 'Article', 'menu_name' => 'Articles', 'all_items' => 'All articles', 'add_new_item' => 'Add article', 'edit_item' => 'Edit article', 'new_item' => 'New article', 'view_item' => 'View article', 'search_items' => 'Search articles', 'not_found' => 'No articles found' ] as $k => $v ) $o->labels->$k = $v;
}, 20 );

/* ---------- list columns ---------- */
function apex_thumb_html( string $src ): string { return $src ? '<img src="' . esc_url( apex_img( $src ) ) . '" alt="" style="width:72px;height:54px;object-fit:cover;border-radius:6px;border:1px solid #ddd">' : ''; }
add_filter( 'manage_apex_offer_posts_columns', fn( $c ) => array_slice( $c, 0, 1 ) + [ 'apex_img' => '' ] + array_slice( $c, 1, 1 ) + [ 'apex_cat' => __( 'Procedure', 'apex' ), 'apex_price' => __( 'Price', 'apex' ), 'apex_where' => __( 'Shown on', 'apex' ) ] + array_slice( $c, 2 ) );
add_action( 'manage_apex_offer_posts_custom_column', function ( $col, $id ) {
	$o = apex_read_post( $id, 'apex_offer' );
	if ( $col === 'apex_img' ) echo apex_thumb_html( $o['src'] );
	if ( $col === 'apex_cat' ) echo esc_html( apex_service_keys()[ $o['cat'] ] ?? '—' );
	if ( $col === 'apex_price' ) echo $o['price'] ? esc_html( number_format( (float) $o['price'] ) . ' ฿' ) : '—';
	if ( $col === 'apex_where' ) echo esc_html( implode( ', ', array_filter( [ $o['onHome'] ? __( 'Home', 'apex' ) . ( $o['homeOrder'] ? ' #' . $o['homeOrder'] : '' ) : '', $o['onPromotions'] ? __( 'Promotions', 'apex' ) . ( $o['order'] ? ' #' . $o['order'] : '' ) : '' ] ) ) ?: '—' );
}, 10, 2 );
add_filter( 'manage_apex_case_posts_columns', fn( $c ) => array_slice( $c, 0, 1 ) + [ 'apex_img' => '' ] + array_slice( $c, 1, 1 ) + [ 'apex_cat' => __( 'Procedure', 'apex' ) ] + array_slice( $c, 2 ) );
add_action( 'manage_apex_case_posts_custom_column', function ( $col, $id ) {
	if ( $col === 'apex_img' ) echo apex_thumb_html( (string) get_post_meta( $id, 'apex_src', true ) );
	if ( $col === 'apex_cat' ) echo esc_html( apex_service_keys()[ get_post_meta( $id, 'apex_cat', true ) ] ?? '—' );
}, 10, 2 );
add_filter( 'manage_apex_service_posts_columns', fn( $c ) => array_slice( $c, 0, 2 ) + [ 'apex_key' => __( 'Procedure', 'apex' ) ] + array_slice( $c, 2 ) );
add_action( 'manage_apex_service_posts_custom_column', function ( $col, $id ) { if ( $col === 'apex_key' ) echo esc_html( apex_service_keys()[ get_post_meta( $id, '_apex_key', true ) ] ?? '' ); }, 10, 2 );
add_filter( 'manage_apex_episode_posts_columns', fn( $c ) => array_slice( $c, 0, 1 ) + [ 'apex_n' => 'EP' ] + array_slice( $c, 1 ) );
add_action( 'manage_apex_episode_posts_custom_column', function ( $col, $id ) { if ( $col === 'apex_n' ) echo (int) get_post_meta( $id, 'apex_n', true ); }, 10, 2 );
/* lists that are shown in a set order follow that order */
add_action( 'pre_get_posts', function ( $q ) {
	if ( ! is_admin() || ! $q->is_main_query() ) return;
	$t = $q->get( 'post_type' );
	if ( in_array( $t, [ 'apex_service', 'apex_case', 'apex_branch', 'apex_doctor', 'apex_episode' ], true ) && ! $q->get( 'orderby' ) ) { $q->set( 'orderby', [ 'menu_order' => 'ASC', 'ID' => 'ASC' ] ); }
} );
/* design pages show which page of the site they are */
add_filter( 'display_post_states', function ( $states, $post ) {
	$k = get_post_meta( $post->ID, '_apex_page', true );
	if ( $k ) $states['apex'] = apex_page_types()[ $k ][0] ?? $k;
	return $states;
}, 10, 2 );

/* ---------- the start panel ---------- */
add_action( 'wp_dashboard_setup', function () {
	wp_add_dashboard_widget( 'apex_start', __( 'Apex Surgery Hospital', 'apex' ), 'apex_dashboard' );
	remove_meta_box( 'dashboard_primary', 'dashboard', 'side' );
	remove_meta_box( 'dashboard_quick_press', 'dashboard', 'side' );
	remove_meta_box( 'dashboard_site_health', 'dashboard', 'normal' );
} );
function apex_dashboard(): void {
	$new = get_posts( [ 'post_type' => 'apex_lead', 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => 'apex_status', 'meta_value' => 'new' ] );
	$page = fn( $k, $l ) => ( $id = apex_page_id( $k, $l ) ) ? get_edit_post_link( $id ) : '';
	echo '<p style="font-size:15px"><a href="' . esc_url( admin_url( 'edit.php?post_type=apex_lead' ) ) . '"><b>' . sprintf( esc_html( _n( '%d new enquiry', '%d new enquiries', count( $new ), 'apex' ) ), count( $new ) ) . '</b></a> · <a href="' . esc_url( admin_url( 'edit.php?post_type=apex_voucher&page=apex-voucher-check' ) ) . '">' . esc_html__( 'Check a voucher', 'apex' ) . '</a></p>';
	echo '<table class="widefat striped"><thead><tr><th>' . esc_html__( 'To change', 'apex' ) . '</th><th>English</th><th>ไทย</th></tr></thead><tbody>';
	$rows = [
		[ __( 'Home page', 'apex' ), $page( 'home', 'en' ), $page( 'home', 'th' ) ],
		[ __( 'About page', 'apex' ), $page( 'about', 'en' ), $page( 'about', 'th' ) ],
		[ __( 'Header, footer, LINE, phone numbers', 'apex' ), admin_url( 'admin.php?page=apex-settings&lang=en' ), admin_url( 'admin.php?page=apex-settings&lang=th' ) ],
		[ __( 'Buttons and labels', 'apex' ), admin_url( 'admin.php?page=apex-wording&lang=en' ), admin_url( 'admin.php?page=apex-wording&lang=th' ) ],
	];
	foreach ( $rows as [ $label, $en, $th ] ) echo '<tr><td>' . esc_html( $label ) . '</td><td>' . ( $en ? '<a href="' . esc_url( $en ) . '">' . esc_html__( 'Edit', 'apex' ) . '</a>' : '' ) . '</td><td>' . ( $th ? '<a href="' . esc_url( $th ) . '">' . esc_html__( 'Edit', 'apex' ) . '</a>' : '' ) . '</td></tr>';
	echo '</tbody></table><ul style="margin-top:12px">';
	foreach ( [ 'apex_offer' => __( 'Offers and prices: the promotions page and the home page offers', 'apex' ), 'apex_case' => __( 'Before and after photos', 'apex' ), 'apex_service' => __( 'Procedures: each service page', 'apex' ), 'post' => __( 'Articles, reviews and news', 'apex' ), 'apex_episode' => __( 'Surgery Wars episodes', 'apex' ), 'apex_branch' => __( 'Branches: addresses, phones, maps', 'apex' ), 'apex_doctor' => __( 'Doctors', 'apex' ) ] as $t => $x ) echo '<li><a href="' . esc_url( admin_url( 'edit.php?post_type=' . $t ) ) . '">' . esc_html( $x ) . '</a></li>';
	echo '</ul><p class="description">' . esc_html__( 'Every item exists once in English and once in Thai. Use the language column in each list (or the + beside it) to open the other version.', 'apex' ) . '</p>';
}

/* the toolbar on the site: one click to the form that fills the page you are looking at */
add_action( 'admin_bar_menu', function ( $bar ) {
	if ( is_admin() || ! current_user_can( 'edit_pages' ) ) return;
	$r = apex_route();
	if ( $r['id'] && ! $bar->get_node( 'edit' ) ) $bar->add_node( [ 'id' => 'edit', 'title' => __( 'Edit this page', 'apex' ), 'href' => get_edit_post_link( $r['id'] ) ] );
	$bar->add_node( [ 'id' => 'apex-settings', 'title' => __( 'Site settings', 'apex' ), 'href' => admin_url( 'admin.php?page=apex-settings&lang=' . apex_lang() ) ] );
}, 80 );
