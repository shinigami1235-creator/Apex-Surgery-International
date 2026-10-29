<?php
/**
 * What's new: the newest surgeries, promotions, articles, episodes and doctors, plus launches with no page of their
 * own (a product, a package, an event) added under What's new in the admin.
 *
 * An entry is new from its "New from" date for the number of days set under What's new › Settings. The date is
 * filled in when an entry is first published in the admin; imported content never gets one, so the site does
 * not open with everything marked new. An editor can change the date or clear it.
 *
 * The list goes to every page as the content object "fresh". The home page draws the What's new section from it,
 * and assets/js/core.js puts a New tag on any card whose data-new id is in the list, until that visitor opens it
 * or a set number of days after they first saw it. The tags live in the visitor's browser, so pages stay cacheable.
 */
defined( 'ABSPATH' ) || exit;

const APEX_FRESH_TYPES = [ 'apex_offer', 'apex_service', 'post', 'apex_episode', 'apex_doctor', 'apex_fresh' ];
const APEX_FRESH_MAX = 12;

function apex_fresh_days(): int { $d = (int) get_option( 'apex_fresh_days', 30 ); return $d > 0 ? $d : 30; }
function apex_fresh_keep(): int { $d = (int) get_option( 'apex_fresh_keep', 7 ); return $d > 0 ? $d : 7; }
function apex_fresh_cap( string $s ): string {
	$s = trim( preg_replace( '/\s+/u', ' ', wp_strip_all_tags( $s ) ) );
	return mb_strlen( $s ) > 110 ? rtrim( mb_substr( $s, 0, 108 ) ) . '…' : $s;
}
/** The data-new attribute a card carries so the New tag can find it. */
function apex_new_attr( string $id ): string { return ' data-new="' . apex_e( $id ) . '"'; }

/** page:filler and the like when the link is one of the site's own pages, so that page's cards carry the tag too. */
function apex_fresh_page_id( string $link, string $lang ): string {
	if ( $link === '' ) return '';
	if ( preg_match( '/#tour-([\w-]+)$/', $link, $m ) ) return 'tour:' . $m[1];   // a branch's 3D tour
	$path = fn( $u ) => untrailingslashit( (string) wp_parse_url( $u, PHP_URL_PATH ) );
	$host = wp_parse_url( $link, PHP_URL_HOST );
	if ( $host && $host !== wp_parse_url( home_url(), PHP_URL_HOST ) ) return '';
	foreach ( array_keys( APEX_PAGES ) as $file ) {
		if ( $file === 'index.html' ) continue;
		if ( $link === $file || $path( $link ) === $path( apex_link( $file, $lang ) ) ) return 'page:' . basename( $file, '.html' );
	}
	return '';
}

/** One language's list: {days, keep, items: [{id, kind, title, text, img, fit, href, date}]}, newest first. */
function apex_fresh_data( string $lang ): array {
	$days = apex_fresh_days();
	$today = wp_date( 'Y-m-d' );
	$cut = gmdate( 'Y-m-d', strtotime( "$today -$days days" ) );
	$S = apex_data( 'shared', $lang ) ?: [];
	$items = [];
	$add = function ( array $x ) use ( &$items, $cut, $today ) {
		if ( empty( $x['date'] ) || $x['date'] <= $cut || $x['date'] > $today || ( $x['title'] ?? '' ) === '' ) return;
		$items[] = array_filter( $x, fn( $v ) => $v !== '' && $v !== null );
	};
	foreach ( APEX_FRESH_TYPES as $type ) {
		foreach ( apex_posts( $type, $lang ) as $id ) {
			$date = (string) get_post_meta( $id, apex_meta_key( 'newFrom' ), true );
			if ( $date === '' || $date <= $cut ) continue;
			$v = apex_read_post( $id, $type );
			$key = (string) get_post_meta( $id, '_apex_key', true );
			switch ( $type ) {
				case 'apex_offer':
					$o = apex_offer_of( [ 'src' => $v['src'], 'alt' => $v['alt'], 'cat' => $v['cat'], 'price' => $v['price'] ], $S );
					$add( [ 'id' => 'offer:' . apex_offer_key( (string) $v['src'] ), 'kind' => 'promotion', 'title' => $o['label'], 'img' => $v['src'], 'fit' => 'contain', 'href' => 'promotions.html' . ( $o['cat'] ? '?c=' . $o['cat'] : '' ), 'date' => $date ] );
					break;
				case 'apex_service':
					$add( [ 'id' => 'svc:' . $v['key'], 'kind' => 'surgery', 'title' => ( $v['menu']['name'] ?? '' ) ?: $v['name'], 'text' => apex_fresh_cap( (string) ( $v['desc'] ?? '' ) ), 'img' => $v['hero'] ?? '', 'href' => 'service.html?p=' . $v['key'], 'date' => $date ] );
					break;
				case 'post':
					$cat = apex_post_cat( $id );
					$add( [ 'id' => 'post:' . $key, 'kind' => $cat === 'review' ? 'review' : ( $cat === 'news' ? 'news' : 'article' ), 'title' => $v['title'], 'text' => apex_fresh_cap( (string) ( ( $v['excerpt'] ?? '' ) ?: ( $v['desc'] ?? '' ) ) ), 'img' => $v['img'] ?? '', 'href' => 'article.html?p=' . $key, 'date' => $date ] );
					break;
				case 'apex_episode':
					$add( [ 'id' => 'war:' . $v['n'], 'kind' => 'episode', 'title' => 'EP.' . $v['n'] . ' ' . ( ( $v['title'] ?? '' ) ?: $v['full'] ), 'text' => apex_fresh_cap( (string) ( $v['desc'] ?? '' ) ), 'img' => $v['cover'] ?? '', 'href' => 'surgery-wars.html?ep=' . $v['n'], 'date' => $date ] );
					break;
				case 'apex_doctor':
					if ( $v['kind'] !== 'team' ) break;
					$key = $key ?: (string) get_post_field( 'post_name', $id );
					$add( [ 'id' => 'doc:' . $key, 'kind' => 'doctor', 'title' => $v['name'], 'text' => (string) ( $v['role'] ?? '' ), 'img' => $v['photo'] ?? '', 'fit' => 'top', 'href' => 'doctor.html#dr-' . $key, 'date' => $date ] );
					break;
				case 'apex_fresh':
					$add( [ 'id' => apex_fresh_page_id( (string) ( $v['link'] ?? '' ), $lang ) ?: 'item:' . $id, 'kind' => $v['kind'] ?: 'other', 'title' => $v['title'], 'text' => apex_fresh_cap( (string) ( $v['text'] ?? '' ) ), 'img' => $v['img'] ?? '', 'fit' => $v['fit'] === 'contain' ? 'contain' : '', 'href' => (string) ( $v['link'] ?? '' ) ?: '#whats-new', 'date' => $date ] );
					break;
			}
		}
	}
	usort( $items, fn( $a, $b ) => strcmp( $b['date'], $a['date'] ) );
	return [ 'days' => $days, 'keep' => apex_fresh_keep(), 'items' => array_slice( $items, 0, APEX_FRESH_MAX ) ];
}

/* ---------- "New from" is filled in on the first publish in the admin ---------- */
add_action( 'save_post', function ( $id, $post ) {
	if ( ! in_array( $post->post_type, APEX_FRESH_TYPES, true ) || $post->post_status !== 'publish' ) return;
	if ( defined( 'WP_CLI' ) && WP_CLI ) return;   // wp apex import marks what it writes as not new
	if ( wp_is_post_autosave( $id ) || wp_is_post_revision( $id ) || get_post_meta( $id, '_apex_new_set', true ) ) return;
	if ( (string) get_post_meta( $id, apex_meta_key( 'newFrom' ), true ) === '' ) update_post_meta( $id, apex_meta_key( 'newFrom' ), wp_date( 'Y-m-d' ) );
	update_post_meta( $id, '_apex_new_set', 1 );
	apex_data_bump();
}, 99, 2 );

/* ---------- What's new › Settings, with what the home page shows now ---------- */
add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=apex_fresh', __( "What's new settings", 'apex' ), __( 'Settings', 'apex' ), 'edit_pages', 'apex-fresh', 'apex_fresh_page' );
} );
add_action( 'admin_notices', function () {
	$s = get_current_screen();
	if ( ! $s || $s->id !== 'edit-apex_fresh' ) return;
	echo '<div class="notice notice-info"><p>' . esc_html__( "Surgeries, promotions, articles, episodes and doctors go under What's new by themselves when they are first published. Add an item here only for something without its own page on the site, such as a product, a package or an event.", 'apex' ) . ' <a href="' . esc_url( admin_url( 'edit.php?post_type=apex_fresh&page=apex-fresh' ) ) . '">' . esc_html__( 'See what the home page shows now', 'apex' ) . '</a></p></div>';
} );
function apex_fresh_page(): void {
	if ( ! current_user_can( 'edit_pages' ) ) return;
	if ( isset( $_POST['apex_fresh_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_fresh_nonce'] ), 'apex_fresh' ) ) {
		update_option( 'apex_fresh_days', max( 1, min( 365, (int) ( $_POST['days'] ?? 30 ) ) ), true );
		update_option( 'apex_fresh_keep', max( 1, min( 90, (int) ( $_POST['keep'] ?? 7 ) ) ), true );
		apex_audit( 'settings', 0, "What's new" );
		apex_data_bump();
		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
	}
	echo '<div class="wrap"><h1>' . esc_html__( "What's new settings", 'apex' ) . '</h1><form method="post"><table class="form-table">';
	echo '<tr><th><label for="apex-days">' . esc_html__( 'New for', 'apex' ) . '</label></th><td><input type="number" min="1" max="365" id="apex-days" name="days" class="small-text" value="' . esc_attr( (string) apex_fresh_days() ) . '"> ' . esc_html__( 'days from its "New from" date', 'apex' ) . '<p class="description">' . esc_html__( "How long an entry stays under What's new on the home page.", 'apex' ) . '</p></td></tr>';
	echo '<tr><th><label for="apex-keep">' . esc_html__( 'New tag stays for', 'apex' ) . '</label></th><td><input type="number" min="1" max="90" id="apex-keep" name="keep" class="small-text" value="' . esc_attr( (string) apex_fresh_keep() ) . '"> ' . esc_html__( 'days after a visitor first sees it', 'apex' ) . '<p class="description">' . esc_html__( 'The tag also goes as soon as the visitor opens the entry. Each visitor\'s browser keeps track of this for them.', 'apex' ) . '</p></td></tr>';
	echo '</table>';
	wp_nonce_field( 'apex_fresh', 'apex_fresh_nonce' );
	submit_button();
	echo '</form>';
	foreach ( APEX_LANGS as $l ) {
		$F = apex_with_lang( $l, fn() => apex_fresh_data( $l ) );
		echo '<h2>' . esc_html( $l === 'th' ? 'ไทย' : 'English' ) . '</h2>';
		if ( ! $F['items'] ) { echo '<p>' . esc_html__( "Nothing is new. The home page leaves out What's new until something is.", 'apex' ) . '</p>'; continue; }
		echo '<table class="widefat striped"><thead><tr><th>' . esc_html__( 'New from', 'apex' ) . '</th><th>' . esc_html__( 'Kind', 'apex' ) . '</th><th>' . esc_html__( 'Title', 'apex' ) . '</th></tr></thead><tbody>';
		foreach ( $F['items'] as $x ) echo '<tr><td>' . esc_html( $x['date'] ) . '</td><td>' . esc_html( ucfirst( $x['kind'] ) ) . '</td><td>' . esc_html( $x['title'] ) . '</td></tr>';
		echo '</tbody></table>';
	}
	echo '</div>';
}

/* ---------- the section, the same markup assets/js/core.js A.freshSection draws ---------- */
function apex_fresh_card( array $x, int $i ): string {
	$E = 'apex_e';
	$fit = $x['fit'] ?? '';
	return '<a class="fresh-c rv" data-d="' . ( ( $i % 4 ) * 60 ) . '" href="' . esc_url( apex_link( (string) ( $x['href'] ?? '#whats-new' ) ) ) . '"' . apex_new_attr( $x['id'] ) . ' data-date="' . $E( $x['date'] ) . '"' . ( preg_match( '#^https?://#', (string) ( $x['href'] ?? '' ) ) && wp_parse_url( (string) $x['href'], PHP_URL_HOST ) !== wp_parse_url( home_url(), PHP_URL_HOST ) ? ' target="_blank" rel="noopener"' : '' ) . '>
      <span class="fresh-ph ph-img' . ( $fit ? ' fit-' . $E( $fit ) : '' ) . '">' . ( ! empty( $x['img'] ) ? '<img src="' . esc_url( apex_img( $x['img'] ) ) . '" alt="" loading="lazy" decoding="async">' : '<span class="fresh-ic">' . apex_ic( 'sparkles' ) . '</span>' ) . '</span>
      <span class="fresh-b"><span class="fresh-k">' . $E( apex_t( 'fk_' . $x['kind'] ) ) . '</span><b class="fresh-t">' . $E( $x['title'] ) . '</b>' . ( ! empty( $x['text'] ) ? '<span class="fresh-x">' . $E( $x['text'] ) . '</span>' : '' ) . '<span class="fresh-d">' . $E( str_replace( '{d}', apex_short_date( $x['date'] ), apex_t( 'freshAdded' ) ) ) . '</span></span></a>';
}
function apex_fresh_section( $F ): string {
	$items = is_array( $F ) ? ( $F['items'] ?? [] ) : [];
	if ( ! $items ) return '';
	$E = 'apex_e';
	$cards = '';
	foreach ( $items as $i => $x ) $cards .= apex_fresh_card( $x, $i );
	$many = count( $items ) > 3;
	return '<section class="section fresh-s" id="whats-new"><div class="wrap"><div class="shead"><div><p class="eyebrow rv">' . $E( apex_t( 'freshEb' ) ) . '</p><h2 class="h-xl rv">' . $E( apex_t( 'freshH' ) ) . '</h2><p class="reels-sub rv">' . $E( apex_t( 'freshP' ) ) . '</p></div>
      ' . ( $many ? '<div class="rail-ctrl rv"><button type="button" class="fresh-prev" aria-label="' . $E( apex_t( 'prev' ) ) . '">' . apex_ic( 'chevron-left' ) . '</button><button type="button" class="fresh-next" aria-label="' . $E( apex_t( 'next' ) ) . '">' . apex_ic( 'chevron-right' ) . '</button></div>' : '' ) . '</div>
      <div class="fresh-rail' . ( $many ? '' : ' few' ) . '">' . $cards . '</div></div></section>';
}
