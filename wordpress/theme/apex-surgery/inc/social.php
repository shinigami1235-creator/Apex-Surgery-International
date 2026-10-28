<?php
/**
 * Latest from Apex: Instagram and TikTok posts on the site.
 *
 * Every hour WordPress asks the Instagram API and the TikTok API for Apex's newest posts, saves a square copy
 * of each cover in wp-content/uploads/apex-social/ and keeps the list in the option apex_social. The pages
 * draw the posts from that list as their own tiles, so a visitor's browser loads nothing from Instagram or
 * TikTok and nothing breaks when either is slow or rate-limited.
 *
 * Apex settings › Social feeds takes the keys, shows when the last fetch ran and what it found, and has a
 * button to fetch now. HANDOVER.md has the steps for getting the keys from Meta and TikTok.
 */
defined( 'ABSPATH' ) || exit;

const APEX_SOCIAL_MAX = 12;

/* ---------- the stored list, as the pages read it ---------- */
function apex_social_data(): array {
	$o = get_option( 'apex_social' );
	$posts = is_array( $o ) && is_array( $o['posts'] ?? null ) ? $o['posts'] : [];
	return [ 'posts' => array_values( $posts ) ];
}

/* ---------- keys ---------- */
function apex_social_keys(): array {
	$k = get_option( 'apex_social_keys' );
	return ( is_array( $k ) ? $k : [] ) + [ 'ig_token' => '', 'ig_refreshed' => 0, 'tt_key' => '', 'tt_secret' => '', 'tt_refresh' => '', 'tt_access' => '', 'tt_expires' => 0 ];
}
function apex_social_save_keys( array $k ): void { update_option( 'apex_social_keys', $k, false ); }

/* ---------- fetching ---------- */
function apex_social_http( string $method, string $url, array $args = [] ) {
	$args += [ 'timeout' => 20, 'redirection' => 3 ];
	$r = $method === 'POST' ? wp_remote_post( $url, $args ) : wp_remote_get( $url, $args );
	if ( is_wp_error( $r ) ) return $r;
	$code = wp_remote_retrieve_response_code( $r );
	$body = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( $code >= 400 || ! is_array( $body ) ) {
		$msg = is_array( $body ) ? ( $body['error']['message'] ?? $body['error_description'] ?? $body['message'] ?? '' ) : '';
		return new WP_Error( 'apex_social', trim( "HTTP $code $msg" ) );
	}
	return $body;
}

/** Instagram API with Instagram Login: the account's newest posts. The long-lived token lasts 60 days and is refreshed every week. */
function apex_social_instagram( array &$k ) {
	if ( $k['ig_token'] === '' ) return [];
	if ( time() - (int) $k['ig_refreshed'] > WEEK_IN_SECONDS ) {
		$r = apex_social_http( 'GET', add_query_arg( [ 'grant_type' => 'ig_refresh_token', 'access_token' => $k['ig_token'] ], 'https://graph.instagram.com/refresh_access_token' ) );
		if ( ! is_wp_error( $r ) && ! empty( $r['access_token'] ) ) { $k['ig_token'] = $r['access_token']; $k['ig_refreshed'] = time(); }
	}
	$r = apex_social_http( 'GET', add_query_arg( [ 'fields' => 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp', 'limit' => APEX_SOCIAL_MAX, 'access_token' => $k['ig_token'] ], 'https://graph.instagram.com/me/media' ) );
	if ( is_wp_error( $r ) ) return $r;
	$out = [];
	foreach ( (array) ( $r['data'] ?? [] ) as $m ) {
		$img = $m['media_type'] === 'VIDEO' ? ( $m['thumbnail_url'] ?? '' ) : ( $m['media_url'] ?? '' );
		if ( $img === '' || empty( $m['permalink'] ) ) continue;
		$out[] = [ 'net' => 'instagram', 'id' => (string) $m['id'], 'img' => $img, 'href' => $m['permalink'], 'date' => substr( (string) ( $m['timestamp'] ?? '' ), 0, 10 ), 'video' => $m['media_type'] === 'VIDEO', 'cap' => apex_social_cap( $m['caption'] ?? '' ) ];
	}
	return $out;
}

/** TikTok Display API: the account's newest public videos. The access token lasts a day and is renewed from the refresh token. */
function apex_social_tiktok( array &$k ) {
	if ( $k['tt_refresh'] === '' || $k['tt_key'] === '' || $k['tt_secret'] === '' ) return [];
	if ( $k['tt_access'] === '' || time() > (int) $k['tt_expires'] - 600 ) {
		$r = apex_social_http( 'POST', 'https://open.tiktokapis.com/v2/oauth/token/', [ 'headers' => [ 'Content-Type' => 'application/x-www-form-urlencoded' ], 'body' => [ 'client_key' => $k['tt_key'], 'client_secret' => $k['tt_secret'], 'grant_type' => 'refresh_token', 'refresh_token' => $k['tt_refresh'] ] ] );
		if ( is_wp_error( $r ) ) return $r;
		if ( empty( $r['access_token'] ) ) return new WP_Error( 'apex_social', 'TikTok: ' . ( $r['error_description'] ?? $r['error'] ?? 'no access token' ) );
		$k['tt_access'] = $r['access_token'];
		$k['tt_expires'] = time() + (int) ( $r['expires_in'] ?? 86400 );
		if ( ! empty( $r['refresh_token'] ) ) $k['tt_refresh'] = $r['refresh_token'];
	}
	$r = apex_social_http( 'POST', 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,cover_image_url,share_url,create_time', [ 'headers' => [ 'Authorization' => 'Bearer ' . $k['tt_access'], 'Content-Type' => 'application/json' ], 'body' => wp_json_encode( [ 'max_count' => APEX_SOCIAL_MAX ] ) ] );
	if ( is_wp_error( $r ) ) return $r;
	$out = [];
	foreach ( (array) ( $r['data']['videos'] ?? [] ) as $v ) {
		if ( empty( $v['cover_image_url'] ) || empty( $v['share_url'] ) ) continue;
		$out[] = [ 'net' => 'tiktok', 'id' => (string) $v['id'], 'img' => $v['cover_image_url'], 'href' => $v['share_url'], 'date' => gmdate( 'Y-m-d', (int) ( $v['create_time'] ?? 0 ) ), 'video' => true, 'cap' => apex_social_cap( ( $v['title'] ?? '' ) ?: ( $v['video_description'] ?? '' ) ) ];
	}
	return $out;
}
function apex_social_cap( string $s ): string {
	$s = trim( preg_replace( '/\s+/u', ' ', wp_strip_all_tags( $s ) ) );
	return mb_strlen( $s ) > 120 ? rtrim( mb_substr( $s, 0, 118 ) ) . '…' : $s;
}

/** A square 480 px copy of the cover, kept under uploads/apex-social/. Returns its address, or '' on failure. */
function apex_social_cover( array $p ): string {
	$up = wp_upload_dir();
	$dir = trailingslashit( $up['basedir'] ) . 'apex-social';
	wp_mkdir_p( $dir );
	$base = $p['net'] . '-' . preg_replace( '/[^A-Za-z0-9_-]/', '', $p['id'] );
	foreach ( [ 'webp', 'jpg' ] as $ext ) if ( file_exists( "$dir/$base.$ext" ) ) return trailingslashit( $up['baseurl'] ) . "apex-social/$base.$ext";
	$name = "$base.webp";
	$file = "$dir/$name";
	{
		$r = wp_remote_get( $p['img'], [ 'timeout' => 20 ] );
		if ( is_wp_error( $r ) || wp_remote_retrieve_response_code( $r ) !== 200 ) return '';
		$tmp = wp_tempnam( $name );
		file_put_contents( $tmp, wp_remote_retrieve_body( $r ) );
		$ed = wp_get_image_editor( $tmp );
		if ( is_wp_error( $ed ) ) { @unlink( $tmp ); return ''; }
		$ed->resize( 480, 480, true );
		$ed->set_quality( 80 );
		$saved = $ed->save( $file, 'image/webp' );
		if ( is_wp_error( $saved ) ) { $name = "$base.jpg"; $file = "$dir/$name"; $saved = $ed->save( $file, 'image/jpeg' ); }   // GD without WebP
		@unlink( $tmp );
		if ( is_wp_error( $saved ) ) return '';
	}
	return trailingslashit( $up['baseurl'] ) . "apex-social/$name";
}

/** One fetch: both networks, newest first, covers saved, old covers removed. Returns a status line for the settings page. */
function apex_social_fetch(): string {
	$k = apex_social_keys();
	$got = [];
	$notes = [];
	foreach ( [ 'Instagram' => 'apex_social_instagram', 'TikTok' => 'apex_social_tiktok' ] as $net => $fn ) {
		$r = $fn( $k );
		if ( is_wp_error( $r ) ) { $notes[] = "$net: " . $r->get_error_message(); continue; }
		foreach ( $r as $p ) $got[] = $p;
		if ( $r ) $notes[] = "$net: " . count( $r );
	}
	apex_social_save_keys( $k );
	$old = get_option( 'apex_social' );
	$old = is_array( $old ) ? $old : [];
	usort( $got, fn( $a, $b ) => strcmp( $b['date'], $a['date'] ) );
	$posts = [];
	foreach ( $got as $p ) {
		$src = apex_social_cover( $p );
		if ( $src === '' ) continue;
		$posts[] = [ 'net' => $p['net'], 'src' => $src, 'href' => $p['href'], 'date' => $p['date'], 'video' => (bool) $p['video'], 'cap' => $p['cap'] ];
		if ( count( $posts ) >= APEX_SOCIAL_MAX * 2 ) break;
	}
	// a network that failed this hour keeps its posts from the last good fetch
	foreach ( [ 'instagram', 'tiktok' ] as $net ) {
		if ( array_filter( $posts, fn( $p ) => $p['net'] === $net ) ) continue;
		foreach ( (array) ( $old['posts'] ?? [] ) as $p ) if ( ( $p['net'] ?? '' ) === $net ) $posts[] = $p;
	}
	usort( $posts, fn( $a, $b ) => strcmp( $b['date'], $a['date'] ) );
	$status = $notes ? implode( '. ', $notes ) : __( 'No keys set.', 'apex' );
	$changed = wp_json_encode( $posts ) !== wp_json_encode( $old['posts'] ?? [] );
	update_option( 'apex_social', [ 'posts' => $posts, 'fetched' => time(), 'status' => $status ], false );
	if ( $changed ) {
		apex_data_bump();
		// covers no longer listed are deleted
		$keep = array_map( fn( $p ) => basename( $p['src'] ), $posts );
		foreach ( glob( trailingslashit( wp_upload_dir()['basedir'] ) . 'apex-social/*.{webp,jpg}', GLOB_BRACE ) ?: [] as $f ) if ( ! in_array( basename( $f ), $keep, true ) ) @unlink( $f );
	}
	return $status;
}

add_action( 'apex_social_fetch', 'apex_social_fetch' );
add_action( 'init', function () { if ( ! wp_next_scheduled( 'apex_social_fetch' ) ) wp_schedule_event( time() + 60, 'hourly', 'apex_social_fetch' ); } );
add_action( 'switch_theme', function () { wp_clear_scheduled_hook( 'apex_social_fetch' ); } );

/* ---------- Apex settings › Social feeds ---------- */
add_action( 'admin_menu', function () {
	add_submenu_page( 'apex-settings', __( 'Social feeds', 'apex' ), __( 'Social feeds', 'apex' ), 'manage_options', 'apex-social', 'apex_social_page' );
} );
function apex_social_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) return;
	$k = apex_social_keys();
	if ( isset( $_POST['apex_social_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_social_nonce'] ), 'apex_social' ) ) {
		$in = fn( $n ) => trim( sanitize_text_field( wp_unslash( $_POST[ $n ] ?? '' ) ) );
		// an empty box keeps the saved key; "Remove" clears it
		if ( $in( 'ig_token' ) !== '' ) { $k['ig_token'] = $in( 'ig_token' ); $k['ig_refreshed'] = time(); }
		if ( $in( 'tt_key' ) !== '' ) $k['tt_key'] = $in( 'tt_key' );
		if ( $in( 'tt_secret' ) !== '' ) $k['tt_secret'] = $in( 'tt_secret' );
		if ( $in( 'tt_refresh' ) !== '' ) { $k['tt_refresh'] = $in( 'tt_refresh' ); $k['tt_access'] = ''; }
		if ( ! empty( $_POST['ig_clear'] ) ) $k['ig_token'] = '';
		if ( ! empty( $_POST['tt_clear'] ) ) $k = array_merge( $k, [ 'tt_key' => '', 'tt_secret' => '', 'tt_refresh' => '', 'tt_access' => '' ] );
		apex_social_save_keys( $k );
		$msg = ! empty( $_POST['fetch'] ) ? apex_social_fetch() : __( 'Saved.', 'apex' );
		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( $msg ) . '</p></div>';
		$k = apex_social_keys();
	}
	$o = get_option( 'apex_social' );
	$o = is_array( $o ) ? $o : [];
	$set = fn( $v ) => $v !== '' ? '<span style="color:#2271b1">' . esc_html__( 'Saved', 'apex' ) . ' (…' . esc_html( substr( $v, -4 ) ) . ')</span>' : '<span style="color:#b32d2e">' . esc_html__( 'Not set', 'apex' ) . '</span>';
	$row = fn( $id, $label, $v, $help ) => '<tr><th><label for="' . $id . '">' . esc_html( $label ) . '</label></th><td><input type="password" autocomplete="off" id="' . $id . '" name="' . $id . '" class="regular-text" value=""> ' . $set( $v ) . '<p class="description">' . esc_html( $help ) . '</p></td></tr>';
	echo '<div class="wrap"><h1>' . esc_html__( 'Social feeds', 'apex' ) . '</h1>';
	echo '<p>' . esc_html__( 'The "Latest from Apex" section shows Apex\'s newest Instagram and TikTok posts. The site fetches them every hour with the keys below and keeps a copy of each cover, so the pages never wait on Instagram or TikTok. The handover notes explain how to get each key.', 'apex' ) . '</p>';
	echo '<p><b>' . esc_html__( 'Last fetch:', 'apex' ) . '</b> ' . ( ! empty( $o['fetched'] ) ? esc_html( wp_date( 'j M Y, H:i', (int) $o['fetched'] ) . ' · ' . ( $o['status'] ?? '' ) . ' · ' . sprintf( _n( '%d post on the site', '%d posts on the site', count( $o['posts'] ?? [] ), 'apex' ), count( $o['posts'] ?? [] ) ) ) : esc_html__( 'never', 'apex' ) ) . '</p>';
	echo '<form method="post">';
	wp_nonce_field( 'apex_social', 'apex_social_nonce' );
	echo '<h2>Instagram</h2><table class="form-table">' . $row( 'ig_token', __( 'Access token', 'apex' ), $k['ig_token'], __( 'A long-lived token from the Instagram API with Instagram Login, for the apex_surgery account. The site renews it every week.', 'apex' ) ) . '</table>';
	echo '<p><label><input type="checkbox" name="ig_clear" value="1"> ' . esc_html__( 'Remove the Instagram token', 'apex' ) . '</label></p>';
	echo '<h2>TikTok</h2><table class="form-table">'
		. $row( 'tt_key', __( 'Client key', 'apex' ), $k['tt_key'], __( 'From the app in TikTok for Developers.', 'apex' ) )
		. $row( 'tt_secret', __( 'Client secret', 'apex' ), $k['tt_secret'], __( 'From the same app.', 'apex' ) )
		. $row( 'tt_refresh', __( 'Refresh token', 'apex' ), $k['tt_refresh'], __( 'From signing in to the app once with the apex_surgery account. It lasts a year and the site renews it on every fetch.', 'apex' ) )
		. '</table>';
	echo '<p><label><input type="checkbox" name="tt_clear" value="1"> ' . esc_html__( 'Remove the TikTok keys', 'apex' ) . '</label></p>';
	submit_button( __( 'Save', 'apex' ), 'primary', 'save', false );
	echo ' ';
	submit_button( __( 'Save and fetch now', 'apex' ), 'secondary', 'fetch', false );
	echo '</form></div>';
}

/* ---------- the section, the same markup assets/js/core.js A.socialWall draws ---------- */
const APEX_NETS = [ 'instagram' => 'Instagram', 'tiktok' => 'TikTok', 'facebook' => 'Facebook' ];
function apex_short_date( string $d ): string {
	$t = strtotime( $d . ' 00:00:00 UTC' );
	if ( ! $t ) return $d;
	if ( apex_L() !== 'th' ) return gmdate( 'j M', $t );
	$m = [ 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.' ];
	return gmdate( 'j', $t ) . ' ' . $m[ (int) gmdate( 'n', $t ) - 1 ];
}
function apex_feed_tile( array $x, int $i ): string {
	$E = 'apex_e';
	$net = (string) ( $x['net'] ?? '' );
	$d = (string) ( $x['date'] ?? '' );
	return '<a class="feed-t ph-img rv' . ( ! empty( $x['story'] ) ? ' story' : '' ) . '" data-d="' . ( ( $i % 6 ) * 50 ) . '" href="' . $E( $x['href'] ) . '" target="_blank" rel="noopener" aria-label="' . $E( APEX_NETS[ $net ] ?? '' ) . ( $d !== '' ? ', ' . $E( apex_short_date( $d ) ) : '' ) . ( ! empty( $x['cap'] ) ? ': ' . $E( $x['cap'] ) : '' ) . '">
      <img src="' . $E( apex_img( $x['src'] ) ) . '" alt="" loading="lazy" decoding="async"><span class="feed-net n-' . $E( $net ) . '">' . apex_soc_icon( $net ) . '</span>' . ( ! empty( $x['video'] ) ? '<span class="feed-v">' . apex_ic( 'play' ) . '</span>' : '' ) . ( ! empty( $x['story'] ) ? '<span class="feed-st">' . $E( apex_t( 'igStory' ) ) . '</span>' : ( $d !== '' ? '<span class="feed-d">' . $E( apex_short_date( $d ) ) . '</span>' : '' ) ) . '</a>';
}
function apex_feed_follow( string $k, string $x, string $h ): string {
	return '<a class="feed-more rv n-' . $k . '" href="' . apex_e( $h ) . '" target="_blank" rel="noopener"><span class="fm-ic">' . apex_soc_icon( $k ) . '</span><b>' . apex_e( $x ) . '</b><small>' . apex_e( str_replace( '{n}', APEX_NETS[ $k ], apex_t( 'followOn' ) ) ) . '</small></a>';
}
function apex_social_wall( array $S, array $o = [] ): string {
	$E = 'apex_e';
	$so = function ( $k ) use ( $S ) { foreach ( $S['socials'] ?? [] as $x ) if ( ( $x['k'] ?? '' ) === $k ) return $x; return null; };
	$posts = array_values( array_filter( ( apex_data( 'social' ) ?: [] )['posts'] ?? [], fn( $x ) => ! empty( $x['src'] ) && ! empty( $x['href'] ) ) );
	usort( $posts, fn( $a, $b ) => ( $b['story'] ?? 0 ) <=> ( $a['story'] ?? 0 ) ?: strcmp( (string) ( $b['date'] ?? '' ), (string) ( $a['date'] ?? '' ) ) );
	$posts = array_slice( $posts, 0, ! empty( $o['fb'] ) ? 6 : 12 );
	$follow = '';
	$nf = 0;
	foreach ( [ 'instagram' => $so( 'instagram' ), 'tiktok' => $so( 'tiktok' ), 'facebook' => ( $S['facebook'] ?? null ) ?: $so( 'facebook' ) ] as $k => $x ) {
		if ( ! $x ) continue;
		$follow .= apex_feed_follow( $k, $k === 'facebook' ? (string) ( $x['x'] ?? '' ) : '@' . ( $x['x'] ?? '' ), (string) ( $x['h'] ?? '' ) );
		$nf++;
	}
	$fb = ! empty( $o['fb'] ) && ! empty( $S['facebook'] ) ? '<div class="feed-fb">' . apex_fb_frame( $S['facebook'], (int) ( $o['fbH'] ?? 560 ), 'timeline', $S['facebookSurgery'] ?? null ) . '</div>' : '';
	$nets = $posts ? array_values( array_unique( array_map( fn( $x ) => APEX_NETS[ $x['net'] ] ?? '', $posts ) ) ) : [ 'Instagram', 'TikTok' ];
	if ( $fb ) $nets[] = 'Facebook';
	$many = ! $fb && count( $posts ) + $nf > 6;
	$tiles = '';
	foreach ( $posts as $i => $x ) $tiles .= apex_feed_tile( $x, $i );
	return '<div class="shead"><div><p class="eyebrow rv">' . $E( implode( ' · ', array_filter( $nets ) ) ) . '</p><h2 class="h-xl rv">' . $E( apex_t( 'socialH' ) ) . '</h2><p class="reels-sub rv">' . $E( apex_t( 'socialP' ) ) . '</p></div>
      ' . ( $many ? '<div class="rail-ctrl rv"><button type="button" class="feed-prev" aria-label="' . $E( apex_t( 'prev' ) ) . '">' . apex_ic( 'chevron-left' ) . '</button><button type="button" class="feed-next" aria-label="' . $E( apex_t( 'next' ) ) . '">' . apex_ic( 'chevron-right' ) . '</button></div>' : '' ) . '</div>
      <div class="feed' . ( $fb ? ' has-fb' : '' ) . '">' . $fb . '<div class="feed-rail' . ( $posts ? '' : ' only-follow' ) . '">' . $tiles . $follow . '</div></div>';
}
