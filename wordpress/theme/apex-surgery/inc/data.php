<?php
/**
 * Content as the design's data structure. apex_data( 'svc:facelift', 'th' ) returns the same object the design kept in
 * assets/data/th/svc/facelift.js, built from what editors entered in WordPress. The PHP templates draw from it, and the
 * page prints the parts it uses so the scripts read the same values.
 *
 * Storage: a field with 'src' => 'title' | 'excerpt' lives in the post itself, 'content' fields in the post body,
 * 'key' in _apex_key, everything else in post meta "apex_<key>". Shared settings are the option apex_shared_<lang>.
 */
defined( 'ABSPATH' ) || exit;

/** Content anyone may see: no password, or the request that unlocked it. */
function apex_open( $p ): bool { return $p && ( $p->post_password === '' || ! empty( $GLOBALS['apex_allow_protected'] ) ); }
/* ---------- preview ----------
   An editor who presses Preview sees the draft, or the unsaved changes of a published item, drawn by the same
   templates. WordPress hands over the previewed post (with its autosave already merged in); the content layer
   uses it in place of the stored post and skips the cache for that request. */
function apex_preview_post( int $id ) { $p = $GLOBALS['apex_preview'] ?? null; return $p && (int) $p->ID === $id ? $p : null; }
function apex_post( $p ) { $id = is_object( $p ) ? (int) $p->ID : (int) $p; return apex_preview_post( $id ) ?: get_post( $p ); }
add_action( 'wp', function () {
	if ( is_admin() || ! is_preview() || ! is_singular() ) return;
	$o = get_queried_object();
	if ( $o instanceof WP_Post && current_user_can( 'edit_post', $o->ID ) ) { $GLOBALS['apex_preview'] = $o; nocache_headers(); }
} );
function apex_meta_key( string $k ): string { return $k === 'key' ? '_apex_key' : 'apex_' . $k; }

/** A stored value cleaned to its field type: numbers as numbers, lists without blanks, empty groups as null. */
function apex_norm( array $f, $v ) {
	switch ( $f['t'] ) {
		case 'number':
			return ( is_numeric( $v ) ) ? $v + 0 : null;
		case 'bool':
			return ! empty( $v ) && $v !== '0';
		case 'lines': case 'scalars': case 'posts':
			if ( is_string( $v ) ) $v = preg_split( '/\r\n|\r|\n/', $v );
			if ( ! is_array( $v ) ) return [];
			$out = [];
			foreach ( $v as $x ) { if ( is_array( $x ) ) $x = $x['x'] ?? ''; $x = trim( (string) $x ); if ( $x !== '' ) $out[] = $f['t'] === 'scalars' && ( $f['item'] ?? '' ) === 'image' ? apex_img_store( $x ) : $x; }
			return $out;
		case 'group':
			$o = [];
			$any = false;
			foreach ( $f['f'] as $sf ) {
				$x = apex_norm( $sf, is_array( $v ) ? ( $v[ $sf['k'] ] ?? null ) : null );
				$o[ $sf['k'] ] = $x;
				if ( $x !== null && $x !== '' && $x !== [] && $x !== false ) $any = true;
			}
			return $any ? $o : null;
		case 'repeater':
			if ( ! is_array( $v ) ) return [];
			$rows = [];
			foreach ( $v as $row ) {
				if ( ! is_array( $row ) ) continue;
				$r = apex_norm( [ 't' => 'group', 'f' => $f['f'] ], $row );
				if ( $r !== null ) $rows[] = apex_drop_nulls( $r );
			}
			return $rows;
		case 'image':
			return apex_img_store( is_scalar( $v ) ? (string) $v : '' );
		default:
			return is_scalar( $v ) ? trim( (string) $v ) : '';
	}
}
function apex_drop_nulls( array $a ): array { return array_filter( $a, fn( $x ) => $x !== null ); }

/** Read every schema field of a post as the design object. 'content' fields come back as raw markup. */
function apex_read_post( $post, string $schema ): array {
	$post = apex_post( $post );
	if ( ! $post ) return [];
	$o = [];
	foreach ( apex_schema( $schema ) as $f ) {
		$src = $f['src'] ?? '';
		if ( $src === 'title' ) $o[ $f['k'] ] = $post->post_title;
		elseif ( $src === 'excerpt' ) $o[ $f['k'] ] = $post->post_excerpt;
		elseif ( $f['t'] === 'content' ) $o[ $f['k'] ] = $post->post_content;
		else $o[ $f['k'] ] = apex_norm( $f, get_post_meta( $post->ID, apex_meta_key( $f['k'] ), true ) );
	}
	return $o;
}
/** Write schema fields to a post. Only keys present in $vals are touched. */
function apex_write_post( int $id, string $schema, array $vals ): void {
	$post = [];
	foreach ( apex_schema( $schema ) as $f ) {
		if ( ! array_key_exists( $f['k'], $vals ) ) continue;
		$v = $vals[ $f['k'] ];
		$src = $f['src'] ?? '';
		if ( $src === 'title' ) { $post['post_title'] = (string) $v; continue; }
		if ( $src === 'excerpt' ) { $post['post_excerpt'] = (string) $v; continue; }
		if ( $f['t'] === 'content' ) { $post['post_content'] = (string) $v; continue; }
		$v = apex_norm( $f, $v );
		if ( $v === null || $v === '' || $v === [] || $v === false ) delete_post_meta( $id, apex_meta_key( $f['k'] ) );
		else update_post_meta( $id, apex_meta_key( $f['k'] ), wp_slash( $v ) );
	}
	if ( $post ) { $post['ID'] = $id; wp_update_post( wp_slash( $post ) ); }
}
function apex_read_option( string $lang ): array {
	$v = get_option( 'apex_shared_' . $lang );
	$v = is_array( $v ) ? $v : [];
	$o = [];
	foreach ( apex_schema( 'shared' ) as $f ) $o[ $f['k'] ] = apex_norm( $f, $v[ $f['k'] ] ?? null );
	return $o;
}
function apex_write_option( string $lang, array $vals ): void {
	$o = [];
	foreach ( apex_schema( 'shared' ) as $f ) if ( array_key_exists( $f['k'], $vals ) ) $o[ $f['k'] ] = apex_norm( $f, $vals[ $f['k'] ] );
	update_option( 'apex_shared_' . $lang, array_merge( apex_read_option( $lang ), $o ), true );
}

/** Published posts of a type in a language, in editor order. */
function apex_posts( string $type, string $lang, array $q = [] ): array {
	$ids = get_posts( $q + [ 'post_type' => $type, 'post_status' => 'publish', 'posts_per_page' => -1, 'orderby' => [ 'menu_order' => 'ASC', 'ID' => 'ASC' ], 'lang' => '', 'suppress_filters' => true, 'fields' => 'ids', 'no_found_rows' => true ] );
	return array_values( array_filter( $ids, fn( $id ) => apex_post_lang( $id ) === $lang ) );
}

/* ---------- the content objects ---------- */
function apex_data( string $id, ?string $lang = null ) {
	$lang = $lang ?: apex_lang();
	// a password-protected item the visitor has unlocked: built for this request only
	if ( ! empty( $GLOBALS['apex_preview'] ) ) return apex_with_lang( $lang, fn() => apex_build( $id, $lang ) );   // never cached
	if ( in_array( $id, $GLOBALS['apex_unlocked'] ?? [], true ) ) {
		$GLOBALS['apex_allow_protected'] = true;
		try { return apex_with_lang( $lang, fn() => apex_build( $id, $lang ) ); } finally { $GLOBALS['apex_allow_protected'] = false; }
	}
	$v = (int) get_option( 'apex_data_v', 1 );
	$ck = "apex_d_{$v}_{$lang}_" . md5( $id );
	$hit = wp_cache_get( $ck, 'apex' );
	if ( $hit !== false ) return $hit;
	$t = get_transient( $ck );
	if ( $t !== false && ! ( defined( 'APEX_NO_CACHE' ) && APEX_NO_CACHE ) ) { wp_cache_set( $ck, $t, 'apex' ); return $t; }
	$d = apex_with_lang( $lang, fn() => apex_build( $id, $lang ) );
	if ( $d !== null ) {   // a key that finds nothing is not stored anywhere
		wp_cache_set( $ck, $d, 'apex' );
		set_transient( $ck, $d, DAY_IN_SECONDS );
	}
	return $d;
}
/** Any save makes every cached object stale at once. */
function apex_data_bump(): void { update_option( 'apex_data_v', (int) get_option( 'apex_data_v', 1 ) + 1, true ); }
add_action( 'save_post', function ( $id, $p ) { if ( $p->post_type !== 'revision' && ! in_array( $p->post_type, [ 'apex_lead', 'apex_voucher' ], true ) ) apex_data_bump(); }, 10, 2 );
foreach ( [ 'deleted_post', 'trashed_post', 'untrashed_post', 'edited_term', 'set_object_terms' ] as $h ) add_action( $h, 'apex_data_bump' );
add_action( 'updated_option', function ( $name ) { if ( str_starts_with( $name, 'apex_shared_' ) || str_starts_with( $name, 'apex_wording_' ) ) apex_data_bump(); } );

function apex_page_obj( string $key, string $lang ): array {
	$id = apex_page_id( $key, $lang );
	return $id ? apex_read_post( $id, 'page:' . $key ) : [];
}
function apex_seo_pick( array $o ): array {
	// pages keep their SEO title and description under the design's names
	return $o;
}

function apex_build( string $id, string $lang ) {
	[ $kind, $key ] = array_pad( explode( ':', $id, 2 ), 2, '' );
	switch ( $kind ) {
		case 'shared': return apex_build_shared( $lang );
		case 'home': return apex_build_home( $lang );
		case 'about': return apex_page_obj( 'about', $lang );
		case 'services': return apex_page_obj( 'services', $lang );
		case 'contact': return apex_page_obj( 'contact', $lang );
		case 'privacy':
			$o = apex_page_obj( 'privacy', $lang );
			if ( ! $o ) return null;
			$o['blocks'] = apex_markup_to_blocks( (string) ( $o['blocks'] ?? '' ) );
			return $o;
		case 'blogs': return apex_page_obj( 'blog', $lang );
		case 'reviews': return apex_page_obj( 'reviews', $lang ) + [ 'items' => apex_cases( $lang ) ];
		case 'promotions':
			$o = apex_page_obj( 'promotions', $lang );
			$o['items'] = apex_offers( $lang, 'onPromotions', 'order' );
			return $o;
		case 'founder': return apex_founder( $lang );
		case 'posts': return apex_post_list( $lang );
		case 'post': return apex_post_obj( $key, $lang );
		case 'svc': return apex_svc_obj( $key, $lang );
		case 'war':
			if ( $key !== '' ) return apex_episode_obj( (int) $key, $lang );
			return [ 'episodes' => apex_episodes( $lang ) ];
	}
	return null;
}

function apex_build_shared( string $lang ): array {
	$S = apex_read_option( $lang );
	$S['branches'] = array_map( function ( $id ) {
		$b = apex_read_post( $id, 'apex_branch' );
		return apex_drop_nulls( [ 'key' => $b['key'], 'name' => $b['name'], 'short' => $b['short'], 'addr' => $b['addr'], 'phone' => $b['phone'], 'tel' => $b['tel'], 'map' => $b['map'], 'img' => $b['img'] ] );
	}, apex_posts( 'apex_branch', $lang ) );
	$S['doctor'] = null;
	foreach ( apex_posts( 'apex_doctor', $lang ) as $id ) {
		$d = apex_read_post( $id, 'apex_doctor' );
		if ( ( $d['kind'] ?: 'doctor' ) !== 'doctor' ) continue;
		$S['doctor'] = [ 'name' => $d['name'], 'nick' => $d['nick'], 'license' => $d['license'], 'title' => $d['title'], 'specialty' => $d['specialty'], 'photo' => $d['photo'], 'eduH' => $d['eduH'], 'edu' => $d['edu'], 'moreH' => $d['moreH'], 'more' => $d['more'] ];
		break;
	}
	$S['services'] = [];
	foreach ( apex_posts( 'apex_service', $lang ) as $id ) {
		$k = (string) get_post_meta( $id, '_apex_key', true );
		$m = apex_norm( apex_schema_field( 'apex_service', 'menu' ), get_post_meta( $id, 'apex_menu', true ) ) ?: [];
		$t = get_the_title( $id );
		$S['services'][] = [ 'key' => $k, 'name' => ( $m['name'] ?? '' ) ?: $t, 'short' => ( $m['short'] ?? '' ) ?: $t, 'en' => $m['en'] ?? '', 'icon' => $m['icon'] ?? '', 'nav' => ( $m['nav'] ?? '' ) ?: $t ];
	}
	return apex_drop_nulls( $S );
}
function apex_schema_field( string $schema, string $k ): array {
	foreach ( apex_schema( $schema ) as $f ) if ( $f['k'] === $k ) return $f;
	return [ 'k' => $k, 't' => 'text' ];
}

function apex_cases( string $lang ): array {
	return array_map( function ( $id ) {
		$c = apex_read_post( $id, 'apex_case' );
		$o = [ 'src' => $c['src'], 'cat' => $c['cat'] ];
		if ( $c['alt'] !== '' ) $o['alt'] = $c['alt'];
		return $o;
	}, apex_posts( 'apex_case', $lang ) );
}
/** Offers flagged for a page, in that page's order. */
function apex_offers( string $lang, string $flag, string $order ): array {
	$rows = [];
	foreach ( apex_posts( 'apex_offer', $lang ) as $id ) {
		$o = apex_read_post( $id, 'apex_offer' );
		if ( ! $o[ $flag ] ) continue;
		$r = [ 'src' => $o['src'], 'alt' => $o['alt'] ];
		if ( $o['cat'] !== '' ) $r['cat'] = $o['cat'];
		if ( $o['price'] ) $r['price'] = $o['price'];
		$rows[] = [ $o[ $order ] ?? 0, count( $rows ), $r ];
	}
	usort( $rows, fn( $a, $b ) => [ $a[0] ?? 0, $a[1] ] <=> [ $b[0] ?? 0, $b[1] ] );
	return array_column( $rows, 2 );
}

function apex_build_home( string $lang ): array {
	$H = apex_page_obj( 'home', $lang );
	$H['reviews'] = [ 'h' => $H['reviews']['h'] ?? '', 'items' => apex_cases( $lang ) ];
	$H['promos'] = [ 'h' => $H['promos']['h'] ?? '', 'items' => apex_offers( $lang, 'onHome', 'homeOrder' ) ];
	$keys = $H['news']['posts'] ?? [];
	$list = apex_data( 'posts', $lang );
	$by = [];
	foreach ( $list as $p ) $by[ $p['key'] ] = $p;
	$picked = $keys ? array_values( array_filter( array_map( fn( $k ) => $by[ $k ] ?? null, $keys ) ) ) : array_slice( $list, 0, 4 );
	$H['news'] = [ 'h' => $H['news']['h'] ?? '', 'items' => array_map( function ( $p ) use ( $lang ) {
		$id = apex_key_id( 'post', $p['key'], $lang );
		$ex = $id ? (string) get_post_meta( $id, 'apex_excerpt', true ) : '';
		return [ 'key' => $p['key'], 'img' => $p['img'], 'title' => $p['title'], 'date' => $p['date'], 'excerpt' => $ex !== '' ? $ex : $p['desc'] ];
	}, $picked ) ];
	return apex_drop_nulls( $H );
}

function apex_founder( string $lang ) {
	foreach ( apex_posts( 'apex_doctor', $lang ) as $id ) {
		$d = apex_read_post( $id, 'apex_doctor' );
		if ( $d['kind'] !== 'founder' ) continue;
		$o = [];
		foreach ( [ 'photo', 'portrait', 'check', 'aaci', 'name', 'nick', 'license', 'role', 'specialty', 'eduH', 'edu', 'rolesH', 'roles', 'years', 'bio', 'quote', 'checkX' ] as $k ) $o[ $k ] = $d[ $k ];
		$o[ $lang === 'th' ? 'nameEn' : 'nameTh' ] = $d['nameAlt'];
		if ( ! $o['check'] ) $o['check'] = [ 'h' => '' ];
		return apex_drop_nulls( $o );
	}
	return null;
}

/** The post's category key: review, blog or news (the category's _apex_cat, or its slug). */
function apex_post_cat( int $id ): string {
	foreach ( wp_get_post_categories( $id, [ 'fields' => 'all' ] ) as $t ) {
		$c = get_term_meta( $t->term_id, '_apex_cat', true ) ?: preg_replace( '/-(en|th)$/', '', $t->slug );
		if ( in_array( $c, [ 'review', 'blog', 'news' ], true ) ) return $c;
	}
	return 'blog';
}
function apex_post_list( string $lang ): array {
	$ids = get_posts( [ 'post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => -1, 'orderby' => [ 'date' => 'DESC', 'ID' => 'DESC' ], 'lang' => '', 'suppress_filters' => true, 'fields' => 'ids', 'no_found_rows' => true ] );
	$out = [];
	foreach ( $ids as $id ) {
		if ( apex_post_lang( $id ) !== $lang ) continue;
		$p = get_post( $id );
		if ( get_post_field( 'post_password', $id ) !== '' ) continue;
		$k = (string) get_post_meta( $id, '_apex_key', true );
		if ( $k === '' ) continue;   // every article has a key (the editor fills it in, or it is made on save)
		$out[] = [ 'key' => $k, 'cat' => apex_post_cat( $id ), 'date' => substr( $p->post_date, 0, 10 ), 'title' => $p->post_title, 'desc' => $p->post_excerpt, 'img' => apex_norm( [ 't' => 'image' ], get_post_meta( $id, 'apex_img', true ) ) ];
	}
	return $out;
}
function apex_post_obj( string $key, string $lang ) {
	$id = apex_key_id( 'post', $key, $lang );
	if ( ! $id ) return null;
	$p = apex_post( $id );
	if ( ! $p || $p->post_type !== 'post' || ( $p->post_status !== 'publish' && ! apex_preview_post( $id ) ) || ! apex_open( $p ) ) return null;
	$o = apex_read_post( $id, 'post' );
	$out = [ 'key' => $key, 'title' => $p->post_title, 'date' => substr( $p->post_date, 0, 10 ), 'cat' => apex_post_cat( $id ), 'img' => $o['img'], 'author' => $o['author'], 'tag' => $o['tag'] !== '' ? $o['tag'] : null, 'blocks' => apex_markup_to_blocks( $p->post_content ) ];
	$tags = wp_get_post_terms( $id, 'post_tag', [ 'fields' => 'names' ] );
	if ( is_array( $tags ) && $tags ) $out['tags'] = array_values( $tags );   // shown as chips under the article
	return $out;
}
function apex_svc_obj( string $key, string $lang ) {
	$id = apex_key_id( 'apex_service', $key, $lang );
	if ( ! $id || ! apex_open( get_post( $id ) ) ) return null;
	$o = apex_read_post( $id, 'apex_service' );
	unset( $o['menu'] );
	$o['key'] = $key;
	$o['sections'] = apex_markup_to_sections( (string) $o['sections'] );
	foreach ( [ 'atApex', 'tiktok' ] as $g ) if ( $o[ $g ] === null ) unset( $o[ $g ] );
	return $o;
}
function apex_episodes( string $lang ): array {
	$out = [];
	foreach ( apex_posts( 'apex_episode', $lang ) as $id ) {
		$e = apex_read_post( $id, 'apex_episode' );
		$out[] = [ 'n' => (int) $e['n'], 'title' => $e['title'] ?: $e['full'], 'full' => $e['full'], 'desc' => $e['desc'], 'yt' => $e['yt'], 'cover' => $e['cover'], 'img' => $e['img'], 'photos' => (int) $e['photos'] ];
	}
	usort( $out, fn( $a, $b ) => $a['n'] <=> $b['n'] );
	return $out;
}
function apex_episode_id( int $n, string $lang ): int {
	$pv = $GLOBALS['apex_preview'] ?? null;
	if ( $pv && $pv->post_type === 'apex_episode' && (int) get_post_meta( $pv->ID, 'apex_n', true ) === $n ) return (int) $pv->ID;
	foreach ( apex_posts( 'apex_episode', $lang ) as $id ) if ( (int) get_post_meta( $id, 'apex_n', true ) === $n ) return $id;
	return 0;
}
function apex_episode_obj( int $n, string $lang ) {
	$id = apex_episode_id( $n, $lang );
	if ( ! $id || ! apex_open( get_post( $id ) ) ) return null;
	$e = apex_read_post( $id, 'apex_episode' );
	$o = [ 'n' => $n, 'title' => $e['full'], 'seo' => $e['seo'], 'desc' => $e['desc'], 'yt' => $e['yt'], 'blocks' => apex_markup_to_blocks( (string) $e['blocks'] ) ];
	$d = get_post_field( 'post_date', $id );
	if ( $d && get_post_meta( $id, 'apex_dated', true ) ) $o['date'] = substr( $d, 0, 10 );
	return $o;
}
