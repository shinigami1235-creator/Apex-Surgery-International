<?php
/**
 * The admin forms, built from inc/schema.php: a "Page content" box on every service, episode, offer, case,
 * branch, doctor, article and design page, and Apex settings (site settings per language, and wording).
 * Titles, summaries and long text stay in WordPress's own title, excerpt and block editor.
 */
defined( 'ABSPATH' ) || exit;

/** Which schema an edit screen uses, or '' for none. */
function apex_schema_for( WP_Post $p ): string {
	if ( $p->post_type === 'page' ) {
		$k = (string) get_post_meta( $p->ID, '_apex_page', true );
		return $k !== '' && apex_schema( 'page:' . $k ) ? 'page:' . $k : '';
	}
	return in_array( $p->post_type, [ 'apex_service', 'apex_episode', 'apex_offer', 'apex_case', 'apex_branch', 'apex_doctor', 'apex_fresh', 'post' ], true ) ? $p->post_type : '';
}

/* ---------- design pages: no block editor, their content is the form (unless the page has body text, like the privacy policy) ---------- */
function apex_page_has_body( WP_Post $post ): bool {
	foreach ( apex_schema( 'page:' . get_post_meta( $post->ID, '_apex_page', true ) ) as $f ) if ( $f['t'] === 'content' ) return true;
	return false;
}
add_filter( 'use_block_editor_for_post', function ( $use, $post ) {
	if ( $post && $post->post_type === 'page' && get_post_meta( $post->ID, '_apex_page', true ) !== '' && ! apex_page_has_body( $post ) ) return false;
	return $use;
}, 10, 2 );
add_action( 'add_meta_boxes_page', function ( $post ) {
	if ( get_post_meta( $post->ID, '_apex_page', true ) === '' || apex_page_has_body( $post ) ) return;
	remove_post_type_support( 'page', 'editor' );
	remove_post_type_support( 'page', 'thumbnail' );
	remove_post_type_support( 'page', 'custom-fields' );
} );

add_action( 'add_meta_boxes', function ( $type, $post ) {
	if ( ! $post instanceof WP_Post ) return;
	$schema = apex_schema_for( $post );
	if ( ! $schema ) return;
	$title = $post->post_type === 'page' ? __( 'Page content', 'apex' ) : __( 'Details', 'apex' );
	add_meta_box( 'apex-fields', $title, 'apex_fields_box', null, 'normal', 'high', [ 'schema' => $schema, '__back_compat_meta_box' => false ] );
}, 10, 2 );

function apex_fields_box( WP_Post $post, array $box ): void {
	$schema = $box['args']['schema'];
	$vals = apex_read_post( $post, $schema );
	wp_nonce_field( 'apex_fields_' . $post->ID, 'apex_fields_nonce' );
	$lang = apex_post_lang( $post->ID );
	echo '<div class="apex-fields" data-lang="' . esc_attr( $lang ) . '">';
	if ( $post->post_type === 'page' ) {
		$k = substr( $schema, 5 );
		$label = apex_page_types()[ $k ][0] ?? $k;
		echo '<p class="apex-note">' . sprintf( esc_html__( 'This is the %s page. Its layout is fixed; fill in the text and pictures here. Wording shared by every page (buttons, menus) is under Apex settings › Wording.', 'apex' ), '<b>' . esc_html( $label ) . '</b>' ) . '</p>';
	}
	foreach ( apex_schema( $schema ) as $f ) {
		if ( ! empty( $f['src'] ) ) continue;              // the title, excerpt or date box WordPress shows
		if ( $f['t'] === 'content' ) {
			echo '<div class="apex-field apex-in-editor"><label>' . esc_html( $f['l'] ) . '</label><p class="description">' . esc_html( $f['h'] ?? __( 'Written in the editor above.', 'apex' ) ) . '</p></div>';
			continue;
		}
		apex_field_html( $f, $vals[ $f['k'] ] ?? null, 'apex[' . $f['k'] . ']', $lang );
	}
	echo '</div>';
}

/* ---------- one field ---------- */
function apex_field_html( array $f, $v, string $name, string $lang, bool $in_row = false ): void {
	$id = 'apx-' . substr( md5( $name ), 0, 10 );
	$help = ! empty( $f['h'] ) ? '<p class="description">' . esc_html( $f['h'] ) . '</p>' : '';
	$label = '<label for="' . $id . '">' . esc_html( $f['l'] ) . '</label>';
	$t = $f['t'];
	echo '<div class="apex-field apex-t-' . esc_attr( $t ) . '">';
	switch ( $t ) {
		case 'text': case 'url':
			echo $label . '<input type="text" class="widefat" id="' . $id . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $v ) . '"' . ( $t === 'url' ? ' inputmode="url" spellcheck="false"' : '' ) . '>' . $help;
			break;
		case 'date':
			echo $label . '<input type="date" id="' . $id . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $v ) . '">' . $help;
			break;
		case 'number':
			echo $label . '<input type="number" step="any" class="small-text" id="' . $id . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $v === null ? '' : (string) $v ) . '">' . $help;
			break;
		case 'textarea':
			echo $label . '<textarea class="widefat" rows="3" id="' . $id . '" name="' . esc_attr( $name ) . '">' . esc_textarea( (string) $v ) . '</textarea>' . $help;
			break;
		case 'lines': case 'posts':
			if ( $t === 'posts' ) { apex_posts_field( $f, (array) $v, $name, $lang, $id ); break; }
			echo $label . '<textarea class="widefat" rows="' . max( 3, min( 14, count( (array) $v ) + 1 ) ) . '" id="' . $id . '" name="' . esc_attr( $name ) . '">' . esc_textarea( implode( "\n", (array) $v ) ) . '</textarea>' . $help;
			break;
		case 'scalars':
			$img = ( $f['item'] ?? '' ) === 'image';
			echo $label . '<textarea class="widefat apex-scalars" rows="' . max( 3, min( 12, count( (array) $v ) + 1 ) ) . '" id="' . $id . '" name="' . esc_attr( $name ) . '" spellcheck="false">' . esc_textarea( implode( "\n", (array) $v ) ) . '</textarea>'
				. '<p><button type="button" class="button apex-media-add" data-for="' . $id . '" data-type="' . ( $img ? 'image' : 'video' ) . '">' . esc_html( $img ? __( 'Add images', 'apex' ) : __( 'Add videos', 'apex' ) ) . '</button></p>'
				. ( $help ?: '<p class="description">' . esc_html__( 'One per line, in the order they show.', 'apex' ) . '</p>' );
			break;
		case 'image':
			$src = apex_img( (string) $v );
			echo $label . '<div class="apex-image"><span class="apex-thumb">' . ( $src ? '<img src="' . esc_url( $src ) . '" alt="">' : '' ) . '</span><input type="text" class="widefat" id="' . $id . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $v ) . '" spellcheck="false"><button type="button" class="button apex-media" data-for="' . $id . '">' . esc_html__( 'Choose', 'apex' ) . '</button></div>' . $help;
			break;
		case 'bool':
			echo '<label class="apex-check"><input type="hidden" name="' . esc_attr( $name ) . '" value="0"><input type="checkbox" id="' . $id . '" name="' . esc_attr( $name ) . '" value="1"' . checked( (bool) $v, true, false ) . '> ' . esc_html( $f['l'] ) . '</label>' . $help;
			break;
		case 'select':
			echo $label . '<select id="' . $id . '" name="' . esc_attr( $name ) . '">';
			// a saved value that is not in the list stays selected, so saving the screen does not change it
			if ( (string) $v !== '' && ! array_key_exists( (string) $v, $f['o'] ) ) echo '<option value="' . esc_attr( (string) $v ) . '" selected>' . esc_html( (string) $v ) . '</option>';
			foreach ( $f['o'] as $k => $x ) echo '<option value="' . esc_attr( $k ) . '"' . selected( (string) $v, (string) $k, false ) . '>' . esc_html( $x ) . '</option>';
			echo '</select>' . $help;
			break;
		case 'group':
			echo '<fieldset class="apex-group"><legend>' . esc_html( $f['l'] ) . '</legend>' . $help;
			foreach ( $f['f'] as $sf ) apex_field_html( $sf, is_array( $v ) ? ( $v[ $sf['k'] ] ?? null ) : null, $name . '[' . $sf['k'] . ']', $lang, true );
			echo '</fieldset>';
			break;
		case 'repeater':
			$rows = is_array( $v ) ? array_values( $v ) : [];
			echo '<fieldset class="apex-group apex-repeater" data-name="' . esc_attr( $name ) . '" data-tpl="' . esc_attr( $name ) . '"><legend>' . esc_html( $f['l'] ) . '</legend>' . $help . '<ol class="apex-rows">';
			foreach ( $rows as $i => $row ) apex_row_html( $f, $row, $name . '[' . $i . ']', $lang );
			echo '</ol><template class="apex-row-tpl">';
			apex_row_html( $f, [], $name . '[__i__]', $lang );
			echo '</template><p><button type="button" class="button apex-add">' . esc_html__( 'Add', 'apex' ) . '</button></p></fieldset>';
			break;
	}
	echo '</div>';
}
function apex_row_html( array $f, $row, string $name, string $lang ): void {
	echo '<li class="apex-row"><div class="apex-row-tools"><button type="button" class="button-link apex-up" aria-label="' . esc_attr__( 'Move up', 'apex' ) . '">↑</button><button type="button" class="button-link apex-down" aria-label="' . esc_attr__( 'Move down', 'apex' ) . '">↓</button><button type="button" class="button-link apex-del">' . esc_html__( 'Remove', 'apex' ) . '</button></div>';
	foreach ( $f['f'] as $sf ) apex_field_html( $sf, is_array( $row ) ? ( $row[ $sf['k'] ] ?? null ) : null, $name . '[' . $sf['k'] . ']', $lang, true );
	echo '</li>';
}
/** Articles picked by key: four drop-downs of the published articles in the page's language. */
function apex_posts_field( array $f, array $v, string $name, string $lang, string $id ): void {
	$opts = [ '' => '—' ];
	foreach ( apex_post_list( $lang ) as $p ) $opts[ $p['key'] ] = $p['title'];
	echo '<label>' . esc_html( $f['l'] ) . '</label><div class="apex-posts">';
	for ( $i = 0; $i < 4; $i++ ) {
		echo '<select name="' . esc_attr( $name ) . '[]" aria-label="' . esc_attr( $f['l'] . ' ' . ( $i + 1 ) ) . '">';
		foreach ( $opts as $k => $x ) echo '<option value="' . esc_attr( $k ) . '"' . selected( $v[ $i ] ?? '', (string) $k, false ) . '>' . esc_html( $x ) . '</option>';
		echo '</select>';
	}
	echo '</div>' . ( ! empty( $f['h'] ) ? '<p class="description">' . esc_html( $f['h'] ) . '</p>' : '' );
}

/* ---------- cleaning what the form sends ---------- */
function apex_clean_link( string $s ): string {
	$s = trim( $s );
	if ( $s === '' ) return '';
	if ( str_starts_with( $s, '~/' ) ) return '~/' . ltrim( preg_replace( '#[^\w\-./%~]#u', '', substr( $s, 2 ) ), '/' );
	if ( preg_match( '#^(img|video|fonts|css|js|features)/#', $s ) ) return preg_replace( '#[^\w\-./]#', '', $s );   // a file in the theme
	return esc_url_raw( $s, [ 'http', 'https', 'tel', 'mailto' ] );
}
/** Plain text with tags removed, where a "<" or "&" the editor typed stays the character itself. */
function apex_plain( string $v, bool $multi = false ): string {
	$v = $multi ? sanitize_textarea_field( $v ) : sanitize_text_field( $v );
	return html_entity_decode( $v, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
}
function apex_clean( array $f, $v ) {
	switch ( $f['t'] ) {
		case 'text': return apex_plain( (string) $v );
		case 'textarea': return apex_plain( (string) $v, true );
		case 'url': return apex_clean_link( (string) $v );
		case 'image': return apex_img_store( apex_clean_link( (string) $v ) );
		case 'number': $v = trim( (string) $v ); return is_numeric( $v ) ? $v + 0 : '';
		case 'date': $v = trim( (string) $v ); return preg_match( '/^\d{4}-\d{2}-\d{2}$/', $v ) ? $v : '';
		case 'bool': return ! empty( $v ) && $v !== '0';
		case 'select': return array_key_exists( (string) $v, $f['o'] ) ? (string) $v : ( ! empty( $f['keep'] ) ? sanitize_key( (string) $v ) : '' );
		case 'lines': return array_values( array_filter( array_map( 'apex_plain', preg_split( '/\r\n|\r|\n/', (string) $v ) ), 'strlen' ) );
		case 'scalars': return array_values( array_filter( array_map( fn( $x ) => apex_img_store( apex_clean_link( $x ) ), preg_split( '/\r\n|\r|\n/', (string) $v ) ), 'strlen' ) );
		case 'posts': return array_values( array_filter( array_map( 'sanitize_title', (array) $v ), 'strlen' ) );
		case 'group':
			$o = [];
			foreach ( $f['f'] as $sf ) $o[ $sf['k'] ] = apex_clean( $sf, is_array( $v ) ? ( $v[ $sf['k'] ] ?? '' ) : '' );
			return $o;
		case 'repeater':
			$rows = [];
			foreach ( is_array( $v ) ? $v : [] as $k => $row ) {
				if ( $k === '__i__' || ! is_array( $row ) ) continue;
				$r = apex_clean( [ 't' => 'group', 'f' => $f['f'] ], $row );
				if ( array_filter( $r, fn( $x ) => $x !== '' && $x !== [] && $x !== false ) ) $rows[] = $r;
			}
			return $rows;
	}
	return '';
}

add_action( 'save_post', function ( $id, $post ) {
	if ( ! isset( $_POST['apex_fields_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['apex_fields_nonce'] ), 'apex_fields_' . $id ) ) return;
	if ( wp_is_post_autosave( $id ) || wp_is_post_revision( $id ) || ! current_user_can( 'edit_post', $id ) ) return;
	$schema = apex_schema_for( $post );
	if ( ! $schema ) return;
	$in = isset( $_POST['apex'] ) && is_array( $_POST['apex'] ) ? wp_unslash( $_POST['apex'] ) : [];
	$vals = [];
	foreach ( apex_schema( $schema ) as $f ) {
		if ( ! empty( $f['src'] ) || $f['t'] === 'content' ) continue;
		if ( ! array_key_exists( $f['k'], $in ) && ! in_array( $f['t'], [ 'repeater', 'posts' ], true ) ) continue;
		$v = apex_clean( $f, $in[ $f['k'] ] ?? [] );
		if ( $f['k'] === 'key' ) $v = sanitize_title( (string) $v );
		$vals[ $f['k'] ] = $v;
	}
	apex_write_post( $id, $schema, $vals );
	apex_data_bump();
}, 20, 2 );

/* ---------- Apex settings: site settings and wording, per language ---------- */
add_action( 'admin_menu', function () {
	add_menu_page( __( 'Apex settings', 'apex' ), __( 'Apex settings', 'apex' ), 'edit_pages', 'apex-settings', 'apex_settings_page', 'dashicons-admin-site-alt3', 2 );
	add_submenu_page( 'apex-settings', __( 'Site settings', 'apex' ), __( 'Site settings', 'apex' ), 'edit_pages', 'apex-settings', 'apex_settings_page' );
	add_submenu_page( 'apex-settings', __( 'Wording', 'apex' ), __( 'Wording', 'apex' ), 'edit_pages', 'apex-wording', 'apex_wording_page' );
} );
function apex_lang_tabs( string $page, string $cur ): string {
	$o = '<nav class="nav-tab-wrapper">';
	foreach ( [ 'en' => 'English', 'th' => 'ไทย' ] as $l => $x ) $o .= '<a class="nav-tab' . ( $l === $cur ? ' nav-tab-active' : '' ) . '" href="' . esc_url( admin_url( 'admin.php?page=' . $page . '&lang=' . $l ) ) . '">' . esc_html( $x ) . '</a>';
	return $o . '</nav>';
}
function apex_admin_lang(): string {
	$l = isset( $_GET['lang'] ) ? sanitize_key( $_GET['lang'] ) : 'en';
	return in_array( $l, APEX_LANGS, true ) ? $l : 'en';
}
function apex_settings_page(): void {
	if ( ! current_user_can( 'edit_pages' ) ) return;
	$lang = apex_admin_lang();
	if ( isset( $_POST['apex_settings_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_settings_nonce'] ), 'apex_settings_' . $lang ) ) {
		$in = isset( $_POST['apex'] ) && is_array( $_POST['apex'] ) ? wp_unslash( $_POST['apex'] ) : [];
		$vals = [];
		foreach ( apex_schema( 'shared' ) as $f ) $vals[ $f['k'] ] = apex_clean( $f, $in[ $f['k'] ] ?? ( $f['t'] === 'repeater' ? [] : '' ) );
		apex_write_option( $lang, $vals );
		apex_audit( 'settings', 0, 'Site settings (' . $lang . ')' );
		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
	}
	$v = apex_read_option( $lang );
	echo '<div class="wrap apex-settings"><h1>' . esc_html__( 'Site settings', 'apex' ) . '</h1><p>' . esc_html__( 'The header, footer, contact buttons and branch details on every page. Branches, doctors and services have their own menus on the left.', 'apex' ) . '</p>' . apex_lang_tabs( 'apex-settings', $lang );
	echo '<form method="post" class="apex-fields">';
	wp_nonce_field( 'apex_settings_' . $lang, 'apex_settings_nonce' );
	foreach ( apex_schema( 'shared' ) as $f ) apex_field_html( $f, $v[ $f['k'] ] ?? null, 'apex[' . $f['k'] . ']', $lang );
	submit_button();
	echo '</form></div>';
}
function apex_wording_page(): void {
	if ( ! current_user_can( 'edit_pages' ) ) return;
	$lang = apex_admin_lang();
	$defaults = json_decode( (string) file_get_contents( APEX_DIR . '/data/i18n.json' ), true ) ?: [];
	$base = $defaults[ $lang ] ?? [];
	if ( isset( $_POST['apex_wording_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_wording_nonce'] ), 'apex_wording_' . $lang ) ) {
		$in = isset( $_POST['w'] ) && is_array( $_POST['w'] ) ? wp_unslash( $_POST['w'] ) : [];
		$over = [];
		foreach ( $base as $k => $def ) {
			$x = apex_plain( (string) ( $in[ $k ] ?? '' ), true );
			if ( $x !== '' && $x !== $def ) $over[ $k ] = $x;
		}
		update_option( 'apex_wording_' . $lang, $over, true );
		apex_audit( 'settings', 0, 'Wording (' . $lang . ')' );
		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
	}
	$over = get_option( 'apex_wording_' . $lang );
	$over = is_array( $over ) ? $over : [];
	echo '<div class="wrap apex-settings"><h1>' . esc_html__( 'Wording', 'apex' ) . '</h1><p>' . esc_html__( 'Buttons, menus and short labels used across the site. Leave a box empty to keep the original wording, shown in grey.', 'apex' ) . '</p>' . apex_lang_tabs( 'apex-wording', $lang );
	echo '<p><input type="search" class="regular-text apex-filter" placeholder="' . esc_attr__( 'Find a label…', 'apex' ) . '"></p><form method="post"><table class="widefat striped apex-wording"><tbody>';
	wp_nonce_field( 'apex_wording_' . $lang, 'apex_wording_nonce' );
	foreach ( $base as $k => $def ) {
		$long = mb_strlen( $def ) > 70;
		echo '<tr><th scope="row"><code>' . esc_html( $k ) . '</code></th><td>' . ( $long
			? '<textarea class="widefat" rows="2" name="w[' . esc_attr( $k ) . ']" placeholder="' . esc_attr( $def ) . '">' . esc_textarea( $over[ $k ] ?? '' ) . '</textarea>'
			: '<input type="text" class="widefat" name="w[' . esc_attr( $k ) . ']" value="' . esc_attr( $over[ $k ] ?? '' ) . '" placeholder="' . esc_attr( $def ) . '">' ) . '</td></tr>';
	}
	echo '</tbody></table>';
	submit_button();
	echo '</form></div>';
}

/* ---------- scripts for the forms ---------- */
add_action( 'admin_enqueue_scripts', function ( $hook ) {
	$on = in_array( $hook, [ 'post.php', 'post-new.php' ], true ) || str_contains( (string) $hook, 'apex-' );
	if ( ! $on ) return;
	wp_enqueue_media();
	wp_enqueue_style( 'apex-admin', APEX_URI . '/admin/admin.css', [], APEX_VERSION );
	wp_enqueue_script( 'apex-admin', APEX_URI . '/admin/admin.js', [ 'jquery' ], APEX_VERSION, true );
	wp_localize_script( 'apex-admin', 'APEX_ADMIN', [ 'media' => apex_media_base(), 'home' => trailingslashit( home_url() ), 'choose' => __( 'Use this', 'apex' ) ] );
} );
