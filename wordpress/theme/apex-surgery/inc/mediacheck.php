<?php
/**
 * Media › Images on the site: every image and video the content uses, whether it is in this site's Media
 * Library yet, and a button that puts it there.
 *
 * The list is read from where editors keep content (each page, service, offer, case, doctor, branch, article
 * and episode, and Apex settings), so it always matches the site. A row is ticked once its file is in this
 * site's uploads folder and in the Media Library:
 *   ~/wp-content/uploads/...   files the old site holds: copied from it into the same path here, so the
 *                              content keeps its address
 *   img/..., other websites    theme files and outside images: copied into uploads/apex-media/ and every
 *                              place that uses them changed to the new address
 *   YouTube video ids          the video's thumbnail, saved here so the play box shows it from this site
 */
defined( 'ABSPATH' ) || exit;

const APEX_MC_TYPES = [ 'page', 'post', 'apex_service', 'apex_offer', 'apex_case', 'apex_branch', 'apex_doctor', 'apex_episode', 'apex_fresh' ];
const APEX_MC_EXT = 'webp|jpe?g|png|gif|svg|avif|mp4|webm|mov';
const APEX_MC_DIR = 'apex-media';

/** Where the old site's uploads are read from when a file is not here yet. */
function apex_mc_source(): string {
	$home = trailingslashit( home_url() );
	$b = apex_media_base();
	return $b !== $home ? $b : 'https://www.apexsurgeryhospital.com/';
}
/** The image and video references in one stored value (a string, or an array of them, or HTML). */
function apex_mc_refs( $v, array &$out ): void {
	if ( is_array( $v ) ) { foreach ( $v as $x ) apex_mc_refs( $x, $out ); return; }
	if ( ! is_string( $v ) || $v === '' ) return;
	$e = APEX_MC_EXT;
	if ( preg_match( "#^(~/wp-content/uploads/[^\s\"'<>]+\.($e)|(img|video)/[^\s\"'<>]+\.($e)|https?://[^\s\"'<>]+\.($e)(\?[^\s\"'<>]*)?|https://images\.unsplash\.com/[^\s\"'<>]+)$#i", $v ) ) { $out[] = $v; return; }
	// inside text and block markup
	if ( preg_match_all( "#(~/wp-content/uploads/[^\s\"'<>()]+\.($e)|https?://[^\s\"'<>()]+\.($e)(\?[^\s\"'<>()]*)?|https://images\.unsplash\.com/[^\s\"'<>()]+)#i", $v, $m ) ) foreach ( $m[1] as $x ) $out[] = $x;
}
/** Video ids: a video field holds bare ids, and text holds YouTube addresses. */
function apex_mc_yt( $v, array &$out, bool $bare = false ): void {
	if ( is_array( $v ) ) { foreach ( $v as $x ) apex_mc_yt( $x, $out, $bare ); return; }
	if ( ! is_string( $v ) ) return;
	if ( $bare && preg_match( '/^[\w-]{6,20}$/', trim( $v ) ) ) $out[] = trim( $v );
	if ( preg_match_all( '#(?:youtu\.be/|[?&]v=|embed/|shorts/)([\w-]{6,20})#', $v, $m ) ) foreach ( $m[1] as $x ) $out[] = $x;
}
/** Every place that stores content: [ label, edit link, kind, id-or-option, values ] */
function apex_mc_places(): array {
	$places = [];
	$types = get_post_types( [], 'objects' );
	foreach ( APEX_MC_TYPES as $t ) {
		foreach ( get_posts( [ 'post_type' => $t, 'post_status' => [ 'publish', 'draft', 'pending', 'private', 'future' ], 'posts_per_page' => -1, 'lang' => '', 'suppress_filters' => true ] ) as $p ) {
			$meta = [];
			foreach ( get_post_meta( $p->ID ) as $k => $vals ) if ( str_starts_with( $k, 'apex_' ) ) $meta[ $k ] = maybe_unserialize( $vals[0] );
			$lang = function_exists( 'pll_get_post_language' ) ? strtoupper( (string) pll_get_post_language( $p->ID, 'slug' ) ) : '';
			$places[] = [ ( $types[ $t ]->labels->singular_name ?? $t ) . ' · ' . ( $p->post_title ?: '#' . $p->ID ) . ( $lang ? " ($lang)" : '' ), get_edit_post_link( $p->ID, 'raw' ), 'post', $p->ID, [ 'content' => $p->post_content ] + $meta ];
		}
	}
	foreach ( APEX_LANGS as $l ) {
		$o = get_option( 'apex_shared_' . $l );
		if ( is_array( $o ) ) $places[] = [ 'Apex settings › Site settings (' . strtoupper( $l ) . ')', admin_url( 'admin.php?page=apex-settings&lang=' . $l ), 'option', 'apex_shared_' . $l, $o ];
	}
	return $places;
}
/** Hosts whose wp-content/uploads is the same library as this site's: this site, APEX_MEDIA_BASE and the old site. */
function apex_mc_hosts(): array {
	return array_values( array_unique( [ trailingslashit( home_url() ), apex_media_base(), 'https://www.apexsurgeryhospital.com/', 'http://www.apexsurgeryhospital.com/', 'https://apexsurgeryhospital.com/' ] ) );
}
/** One reference as [ key, kind ]: up:<path in uploads>, theme:<path in the theme's assets>, yt:<id>, or the outside address. */
function apex_mc_key( string $r ): array {
	if ( str_starts_with( $r, '~/wp-content/uploads/' ) ) return [ 'up:' . rawurldecode( substr( $r, 21 ) ), 'old' ];
	foreach ( apex_mc_hosts() as $h ) if ( str_starts_with( $r, $h . 'wp-content/uploads/' ) ) return [ 'up:' . rawurldecode( substr( $r, strlen( $h ) + 19 ) ), 'old' ];
	$a = APEX_URI . '/assets/';
	if ( str_starts_with( $r, $a ) ) return [ 'theme:' . substr( $r, strlen( $a ) ), 'theme' ];
	if ( preg_match( '#^(img|video)/#', $r ) ) return [ 'theme:' . $r, 'theme' ];
	return [ $r, 'web' ];
}
/** The checklist: key => [ kind, done, where[label => edit link], raw[] (every spelling of it in the content) ] */
function apex_mc_scan(): array {
	$up = wp_upload_dir();
	$home = trailingslashit( home_url() );
	$items = [];
	foreach ( apex_mc_places() as [ $label, $edit, , , $vals ] ) {
		$refs = []; apex_mc_refs( $vals, $refs );
		$yt = []; if ( isset( $vals['apex_yt'] ) ) apex_mc_yt( $vals['apex_yt'], $yt, true ); if ( isset( $vals['content'] ) ) apex_mc_yt( $vals['content'], $yt );
		foreach ( array_unique( $refs ) as $r ) {
			[ $key, $kind ] = apex_mc_key( $r );
			$items[ $key ]['kind'] = $kind;
			$items[ $key ]['where'][ $label ] = $edit;
			$items[ $key ]['raw'][ $r ] = true;
		}
		foreach ( array_unique( $yt ) as $id ) { $items[ 'yt:' . $id ]['kind'] = 'yt'; $items[ 'yt:' . $id ]['where'][ $label ] = $edit; $items[ 'yt:' . $id ]['raw'] = []; }
	}
	$local = (array) get_option( 'apex_yt_local', [] );
	foreach ( $items as $key => &$it ) {
		$it['raw'] = array_keys( $it['raw'] );
		if ( $it['kind'] === 'yt' ) {
			$id = substr( $key, 3 );
			$it['done'] = ! empty( $local[ $id ] ) && apex_mc_real( $up['basedir'] . '/' . substr( $local[ $id ], 21 ) );
		} elseif ( $it['kind'] === 'old' ) {
			$rel = substr( $key, 3 );
			// done once the file is here, in the Media Library, and no page asks another website for it
			$elsewhere = array_filter( $it['raw'], fn( $r ) => ! str_starts_with( $r, '~/' ) && ! str_starts_with( $r, $home ) );
			$it['done'] = ! $elsewhere && apex_mc_real( $up['basedir'] . '/' . $rel ) && apex_mc_attachment( $rel );
		} else {
			$it['done'] = false;
		}
	}
	unset( $it );
	uasort( $items, fn( $a, $b ) => [ $a['done'], array_key_first( $a['where'] ) ] <=> [ $b['done'], array_key_first( $b['where'] ) ] );
	return $items;
}
function apex_mc_attachment( string $rel ): int {
	global $wpdb;
	return (int) $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM $wpdb->postmeta WHERE meta_key = '_wp_attached_file' AND meta_value = %s LIMIT 1", $rel ) );
}
/** Register a file already in the uploads folder as a Media Library item. */
function apex_mc_register( string $rel ): int {
	if ( $id = apex_mc_attachment( $rel ) ) return $id;
	$up = wp_upload_dir();
	$file = $up['basedir'] . '/' . $rel;
	$type = wp_check_filetype( $file );
	$id = wp_insert_attachment( [ 'post_mime_type' => $type['type'] ?: 'application/octet-stream', 'post_title' => preg_replace( '/\.[^.]+$/', '', wp_basename( $file ) ), 'post_status' => 'inherit', 'guid' => $up['baseurl'] . '/' . $rel ], $file, 0, true );
	if ( is_wp_error( $id ) ) return 0;
	require_once ABSPATH . 'wp-admin/includes/image.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );
	return (int) $id;
}
/** Fetch a file from the web into the uploads folder. */
/** True when the file starts the way an image or video file does, so a web page saved under an image name fails. */
function apex_mc_real( string $file ): bool {
	if ( ! is_file( $file ) || filesize( $file ) < 12 ) return false;
	$h = (string) file_get_contents( $file, false, null, 0, 512 );
	return str_starts_with( $h, "\xFF\xD8\xFF" ) || str_starts_with( $h, "\x89PNG" ) || str_starts_with( $h, 'GIF8' )
		|| ( str_starts_with( $h, 'RIFF' ) && substr( $h, 8, 4 ) === 'WEBP' ) || substr( $h, 4, 4 ) === 'ftyp'
		|| str_starts_with( $h, "\x1A\x45\xDF\xA3" ) || ( preg_match( '/^\s*(<\?xml[^>]*>\s*)?(<!--.*?-->\s*)*<svg/s', $h ) === 1 );
}
/** Fetch a file from the web into the uploads folder. */
function apex_mc_fetch( string $url, string $file ): string {
	$r = wp_remote_get( $url, [ 'timeout' => 90, 'redirection' => 3, 'stream' => true, 'filename' => $file, 'user-agent' => 'Mozilla/5.0 (WordPress; Apex Surgery media copy)' ] );
	if ( is_wp_error( $r ) ) { @unlink( $file ); return $r->get_error_message(); }
	$code = (int) wp_remote_retrieve_response_code( $r );
	if ( $code !== 200 || ! filesize( $file ) ) { @unlink( $file ); return sprintf( __( 'The address answered %d', 'apex' ), $code ); }
	if ( ! apex_mc_real( $file ) ) { @unlink( $file ); return __( 'The other site sent a web page instead of the file (usually its "One moment, please" bot check). Upload the file with Upload files above.', 'apex' ); }
	return '';
}
/** Where each copy in uploads/apex-media/ came from, so a copy that went wrong can be fetched again. */
function apex_mc_source_of( string $rel, ?string $url = null ): string {
	$map = (array) get_option( 'apex_mc_sources', [] );
	if ( $url !== null ) { $map[ $rel ] = $url; update_option( 'apex_mc_sources', $map, false ); }
	return (string) ( $map[ $rel ] ?? '' );
}
/**
 * Point every use of $raw at the file in this site's uploads ($rel). Fields keep the short ~/wp-content/uploads/
 * form; article text keeps a full address on this site. A theme path is only swapped where it is the whole value,
 * since the same letters sit inside longer addresses.
 */
function apex_mc_point( array $raws, string $rel ): void {
	$short = '~/wp-content/uploads/' . $rel;
	$full = trailingslashit( home_url() ) . 'wp-content/uploads/' . implode( '/', array_map( 'rawurlencode', explode( '/', $rel ) ) );
	$whole = fn( $r ) => preg_match( '#^(img|video)/#', $r ) === 1;
	$swap = function ( $v, bool $text ) use ( &$swap, $raws, $short, $full, $whole ) {
		if ( is_array( $v ) ) return array_map( fn( $x ) => $swap( $x, $text ), $v );
		if ( ! is_string( $v ) ) return $v;
		foreach ( $raws as $r ) {
			if ( $whole( $r ) ) { if ( $v === $r ) $v = $short; continue; }
			if ( $v === $r ) { $v = $text ? $full : $short; continue; }
			if ( str_contains( $v, $r ) ) $v = str_replace( $r, $text || ! str_starts_with( $v, '~/' ) ? $full : $short, $v );
		}
		return $v;
	};
	foreach ( apex_mc_places() as [ , , $kind, $ref, $vals ] ) {
		foreach ( $vals as $k => $v ) {
			$nv = $swap( $v, $k === 'content' );
			if ( $nv === $v ) continue;
			if ( $kind === 'option' ) { $o = get_option( $ref ); $o[ $k ] = $nv; update_option( $ref, $o ); }
			elseif ( $k === 'content' ) wp_update_post( [ 'ID' => $ref, 'post_content' => $nv ] );
			else update_post_meta( $ref, $k, $nv );
		}
	}
	apex_data_bump();
}
/** Put one item in the Media Library. Returns '' when done, or what went wrong. */
function apex_mc_copy( string $key, string $given = '' ): string {
	$up = wp_upload_dir();
	$items = apex_mc_scan();
	if ( ! isset( $items[ $key ] ) ) return __( 'No page uses this file any more', 'apex' );
	$it = $items[ $key ];
	if ( $it['kind'] === 'yt' ) {
		$id = substr( $key, 3 );
		if ( ! preg_match( '/^[\w-]{6,20}$/', $id ) ) return __( 'Not a YouTube video id', 'apex' );
		$rel = APEX_MC_DIR . "/yt-$id.jpg";
		wp_mkdir_p( dirname( $up['basedir'] . '/' . $rel ) );
		$file = $up['basedir'] . '/' . $rel;
		if ( $given ) { if ( ! apex_mc_real( $given ) ) return __( 'That file is not an image or video', 'apex' ); if ( ! @copy( $given, $file ) ) return __( 'The file could not be saved', 'apex' ); }
		elseif ( ! apex_mc_real( $file ) ) { @unlink( $file ); if ( $err = apex_mc_fetch( "https://i.ytimg.com/vi/$id/hqdefault.jpg", $file ) ) return $err; }
		if ( ! apex_mc_register( $rel ) ) return __( 'The file could not be added to the Media Library', 'apex' );
		$map = (array) get_option( 'apex_yt_local', [] );
		$map[ $id ] = '~/wp-content/uploads/' . $rel;
		update_option( 'apex_yt_local', $map, true );
		apex_data_bump();
		return '';
	}
	if ( $it['kind'] === 'old' ) {
		$rel = substr( $key, 3 );
		$file = $up['basedir'] . '/' . $rel;
		wp_mkdir_p( dirname( $file ) );
		if ( $given ) { if ( ! apex_mc_real( $given ) ) return __( 'That file is not an image or video', 'apex' ); if ( ! @copy( $given, $file ) ) return __( 'The file could not be saved', 'apex' ); }
		elseif ( ! apex_mc_real( $file ) ) {
			@unlink( $file );   // a web page saved under the file's name by an earlier copy
			$from = apex_mc_source_of( $rel ) ?: apex_mc_source() . 'wp-content/uploads/' . implode( '/', array_map( 'rawurlencode', explode( '/', $rel ) ) );
			if ( str_starts_with( $rel, APEX_MC_DIR . '/img/' ) || str_starts_with( $rel, APEX_MC_DIR . '/video/' ) ) {
				if ( ! @copy( APEX_DIR . '/assets/' . substr( $rel, strlen( APEX_MC_DIR ) + 1 ), $file ) ) return __( 'The theme file could not be copied', 'apex' );
			} elseif ( $err = apex_mc_fetch( $from, $file ) ) return $err;
		}
		if ( ! apex_mc_register( $rel ) ) return __( 'The file could not be added to the Media Library', 'apex' );
		$home = trailingslashit( home_url() );
		$elsewhere = array_values( array_filter( $it['raw'], fn( $r ) => ! str_starts_with( $r, '~/' ) && ! str_starts_with( $r, $home ) ) );
		if ( $elsewhere ) apex_mc_point( $elsewhere, $rel );
		return '';
	}
	// a theme file or an image on another website: a copy in uploads/apex-media/, then every use points at it
	$src = $it['kind'] === 'theme' ? substr( $key, 6 ) : $key;
	$name = sanitize_file_name( preg_replace( '/\?.*$/', '', wp_basename( $src ) ) );
	if ( ! preg_match( '/\.(' . APEX_MC_EXT . ')$/i', $name ) ) $name .= '.jpg';   // Unsplash addresses have no extension
	$dir = $up['basedir'] . '/' . APEX_MC_DIR . ( $it['kind'] === 'theme' ? '/' . dirname( $src ) : '' );
	wp_mkdir_p( $dir );
	if ( $it['kind'] === 'theme' ) {
		if ( ! file_exists( "$dir/$name" ) && ! @copy( APEX_DIR . '/assets/' . $src, "$dir/$name" ) ) return __( 'The theme file could not be copied', 'apex' );
	} else {
		$name = wp_unique_filename( $dir, $name );
		if ( $given ) { if ( ! @copy( $given, "$dir/$name" ) ) return __( 'The file could not be saved', 'apex' ); }
		elseif ( $err = apex_mc_fetch( $key, "$dir/$name" ) ) return $err;
		apex_mc_source_of( APEX_MC_DIR . '/' . $name, $key );
	}
	$rel = APEX_MC_DIR . '/' . ( $it['kind'] === 'theme' ? dirname( $src ) . '/' : '' ) . $name;
	if ( ! apex_mc_real( $up['basedir'] . '/' . $rel ) ) { @unlink( $up['basedir'] . '/' . $rel ); return __( 'That file is not an image or video', 'apex' ); }
	if ( ! apex_mc_register( $rel ) ) return __( 'The file could not be added to the Media Library', 'apex' );
	apex_mc_point( $it['raw'], $rel );
	return '';
}

/**
 * Upload files: a zip or loose files from someone who has them (the old site's server, a laptop). Each file is
 * matched to a row by its path or its name: wp-content/uploads/2025/05/x.webp or x.webp for an old-site file,
 * the file name for an image on another website, yt-<video id>.jpg for a YouTube thumbnail.
 * Returns [ placed, [ file => why it was not used ] ].
 */
function apex_mc_take( array $files ): array {
	$items = array_filter( apex_mc_scan(), fn( $x ) => ! $x['done'] && $x['kind'] !== 'theme' );
	$by_path = []; $by_name = [];
	foreach ( $items as $key => $it ) {
		if ( $it['kind'] === 'old' ) { $rel = substr( $key, 3 ); $by_path[ strtolower( $rel ) ] = $key; $n = strtolower( wp_basename( $rel ) ); }
		elseif ( $it['kind'] === 'yt' ) $n = strtolower( 'yt-' . substr( $key, 3 ) );
		else $n = strtolower( wp_basename( (string) wp_parse_url( $key, PHP_URL_PATH ) ) );
		$by_name[ preg_replace( '/\.[a-z0-9]+$/', '', $n ) ][] = $key;
		$by_name[ $n ][] = $key;
	}
	$placed = 0; $skipped = [];
	foreach ( $files as $shown => $tmp ) {
		$path = strtolower( str_replace( '\\', '/', (string) $shown ) );
		$key = '';
		foreach ( $by_path as $rel => $k ) if ( $path === $rel || str_ends_with( $path, '/' . $rel ) ) { $key = $k; break; }
		if ( ! $key ) {
			$n = wp_basename( $path );
			$hits = array_values( array_unique( $by_name[ $n ] ?? $by_name[ preg_replace( '/\.[a-z0-9]+$/', '', $n ) ] ?? [] ) );
			if ( count( $hits ) === 1 ) $key = $hits[0];
			elseif ( count( $hits ) > 1 ) { $skipped[ $shown ] = __( 'several rows have this name, so put it in its folder (wp-content/uploads/…)', 'apex' ); continue; }
		}
		if ( ! $key ) { $skipped[ $shown ] = __( 'no row is waiting for this file', 'apex' ); continue; }
		$err = apex_mc_copy( $key, $tmp );
		if ( $err ) $skipped[ $shown ] = $err; else { $placed++; unset( $by_path[ array_search( $key, $by_path, true ) ?: '' ] ); }
	}
	return [ $placed, $skipped ];
}
/** The files in an upload: loose files as they are, a zip opened into a temporary folder. */
function apex_mc_upload_files(): array {
	$out = [];
	$f = $_FILES['apex_mc_files'] ?? null;
	if ( ! $f || ! is_array( $f['name'] ) ) return $out;
	foreach ( $f['name'] as $i => $name ) {
		if ( (int) $f['error'][ $i ] !== UPLOAD_ERR_OK || ! is_uploaded_file( $f['tmp_name'][ $i ] ) ) continue;
		if ( preg_match( '/\.zip$/i', $name ) && class_exists( 'ZipArchive' ) ) {
			$zip = new ZipArchive();
			if ( $zip->open( $f['tmp_name'][ $i ] ) !== true ) continue;
			$dir = get_temp_dir() . 'apex-mc-' . wp_generate_password( 8, false );
			wp_mkdir_p( $dir );
			for ( $j = 0; $j < $zip->numFiles; $j++ ) {
				$entry = (string) $zip->getNameIndex( $j );
				if ( str_ends_with( $entry, '/' ) || str_contains( $entry, '..' ) || str_starts_with( wp_basename( $entry ), '.' ) ) continue;
				$tmp = $dir . '/' . $j . '-' . sanitize_file_name( wp_basename( $entry ) );
				if ( file_put_contents( $tmp, $zip->getFromIndex( $j ) ) !== false ) $out[ $entry ] = $tmp;
			}
			$zip->close();
		} else {
			$out[ $name ] = $f['tmp_name'][ $i ];
		}
	}
	return $out;
}

/* the play boxes show a YouTube thumbnail saved here once it has been copied */
function apex_yt_local( string $id ): string {
	$map = (array) get_option( 'apex_yt_local', [] );
	return ! empty( $map[ $id ] ) ? apex_img( $map[ $id ] ) : '';
}

/* ---------- Media › Images on the site ---------- */
add_action( 'admin_menu', function () {
	add_media_page( __( 'Images on the site', 'apex' ), __( 'Images on the site', 'apex' ), 'upload_files', 'apex-media-check', 'apex_mc_page' );
} );
add_action( 'wp_ajax_apex_mc_copy', function () {
	check_ajax_referer( 'apex_mc' );
	if ( ! current_user_can( 'upload_files' ) ) wp_send_json_error( __( 'Not allowed', 'apex' ), 403 );
	@set_time_limit( 180 );
	$ref = wp_unslash( (string) ( $_POST['ref'] ?? '' ) );
	$err = apex_mc_copy( $ref );
	$err ? wp_send_json_error( $err ) : wp_send_json_success();
} );
function apex_mc_page(): void {
	$result = null;
	if ( isset( $_POST['apex_mc_up'] ) && check_admin_referer( 'apex_mc_up', 'apex_mc_up' ) && current_user_can( 'upload_files' ) ) {
		@set_time_limit( 600 );
		$result = apex_mc_take( apex_mc_upload_files() );
	}
	$items = apex_mc_scan();
	$done = count( array_filter( $items, fn( $x ) => $x['done'] ) );
	$total = count( $items );
	$kinds = [ 'old' => __( 'On the old site', 'apex' ), 'theme' => __( 'Theme file', 'apex' ), 'web' => __( 'On another website', 'apex' ), 'yt' => __( 'YouTube thumbnail', 'apex' ) ];
	echo '<div class="wrap apex-mc"><h1>' . esc_html__( 'Images on the site', 'apex' ) . '</h1>';
	echo '<p style="max-width:820px">' . esc_html__( 'Every image and video the site shows, and whether its file is in this site\'s Media Library. Press Copy all to go down the whole list, or Copy on one row. Files from the old site are copied into the same folder here. Theme files and images from other websites are copied into the Media Library, and every page that uses them is changed to the copy. A row gets a tick once its file is in the Media Library.', 'apex' ) . '</p>';
	if ( apex_media_base() !== trailingslashit( home_url() ) ) {
		echo '<div class="notice notice-warning inline"><p>' . sprintf( esc_html__( 'wp-config.php sets APEX_MEDIA_BASE to %s, so pages still load uploads from there. Remove that line once every row is ticked.', 'apex' ), '<code>' . esc_html( apex_media_base() ) . '</code>' ) . '</p></div>';
	}
	if ( $result ) {
		[ $placed, $skipped ] = $result;
		echo '<div class="notice ' . ( $skipped ? 'notice-warning' : 'notice-success' ) . ' inline"><p>' . esc_html( sprintf( _n( '%d file added to the Media Library.', '%d files added to the Media Library.', $placed, 'apex' ), $placed ) ) . '</p>';
		if ( $skipped ) { echo '<p>' . esc_html__( 'Not used:', 'apex' ) . '</p><ul style="list-style:disc;margin-left:20px">'; foreach ( $skipped as $f => $why ) echo '<li><code>' . esc_html( $f ) . '</code>: ' . esc_html( $why ) . '</li>'; echo '</ul>'; }
		echo '</div>';
	}
	echo '<form method="post" enctype="multipart/form-data" style="margin:14px 0;padding:12px 14px;background:#fff;border:1px solid #dcdcde;max-width:820px">';
	wp_nonce_field( 'apex_mc_up', 'apex_mc_up' );
	echo '<p style="margin-top:0"><b>' . esc_html__( 'Upload files', 'apex' ) . '</b><br>' . esc_html__( 'For files this server cannot download, such as the media pack from Gid or a copy of the old site\'s wp-content/uploads. Choose a zip or the files themselves. Each file goes to the row with the same path or name, and that row gets its tick.', 'apex' ) . '</p>';
	echo '<input type="file" name="apex_mc_files[]" multiple accept=".zip,image/*,video/*"> ';
	submit_button( __( 'Upload', 'apex' ), 'secondary', 'submit', false );
	echo ' <small>' . esc_html( sprintf( __( 'Largest upload this server takes: %s', 'apex' ), size_format( wp_max_upload_size() ) ) ) . '</small></form>';
	echo '<p style="font-size:15px"><b id="mc-n">' . (int) $done . '</b> ' . esc_html( sprintf( __( 'of %d in the Media Library', 'apex' ), $total ) ) . ' &nbsp; ';
	echo '<button type="button" class="button button-primary" id="mc-all"' . disabled( $done === $total, true, false ) . '>' . esc_html__( 'Copy all', 'apex' ) . '</button> ';
	echo '<label style="margin-left:12px"><input type="checkbox" id="mc-todo" checked> ' . esc_html__( 'Show only what is still to do', 'apex' ) . '</label></p>';
	echo '<table class="widefat striped"><thead><tr><th style="width:34px"></th><th style="width:70px">' . esc_html__( 'Preview', 'apex' ) . '</th><th>' . esc_html__( 'File', 'apex' ) . '</th><th>' . esc_html__( 'Used on', 'apex' ) . '</th><th style="width:150px"></th></tr></thead><tbody>';
	foreach ( $items as $ref => $it ) {
		$is_video = preg_match( '/\.(mp4|webm|mov)(\?.*)?$/i', $ref );
		$shown = $it['kind'] === 'yt' ? 'youtube.com/watch?v=' . substr( $ref, 3 ) : ( $it['kind'] === 'old' ? 'wp-content/uploads/' . substr( $ref, 3 ) : ( $it['kind'] === 'theme' ? substr( $ref, 6 ) : $ref ) );
		$src = $it['kind'] === 'yt' ? ( apex_yt_local( substr( $ref, 3 ) ) ?: 'https://i.ytimg.com/vi/' . substr( $ref, 3 ) . '/default.jpg' ) : ( $it['kind'] === 'old' ? ( $it['done'] ? trailingslashit( home_url() ) : apex_mc_source() ) . 'wp-content/uploads/' . substr( $ref, 3 ) : ( $it['kind'] === 'theme' ? apex_asset( substr( $ref, 6 ) ) : $ref ) );
		echo '<tr data-ref="' . esc_attr( $ref ) . '"' . ( $it['done'] ? ' data-done="1" hidden' : '' ) . '>';
		echo '<td class="mc-tick" style="font-size:18px;color:#1a7f37">' . ( $it['done'] ? '✓' : '' ) . '</td>';
		echo '<td>' . ( $is_video ? '<span class="dashicons dashicons-video-alt3" style="font-size:32px;width:32px;height:32px"></span>' : '<img src="' . esc_url( $src ) . '" alt="" loading="lazy" style="width:60px;height:60px;object-fit:contain;background:#f0f0f1;border-radius:4px">' ) . '</td>';
		echo '<td><code style="word-break:break-all">' . esc_html( $shown ) . '</code><br><small>' . esc_html( $it['kind'] === 'old' && str_starts_with( $ref, 'up:' . APEX_MC_DIR . '/' ) ? __( 'Copy on this site', 'apex' ) : $kinds[ $it['kind'] ] ) . '</small></td><td>';
		$w = [];
		foreach ( $it['where'] as $label => $edit ) $w[] = $edit ? '<a href="' . esc_url( $edit ) . '">' . esc_html( $label ) . '</a>' : esc_html( $label );
		echo implode( '<br>', $w ) . '</td>';
		echo '<td class="mc-act">' . ( $it['done'] ? esc_html__( 'In the Media Library', 'apex' ) : '<button type="button" class="button mc-one">' . esc_html__( 'Copy', 'apex' ) . '</button>' ) . '</td></tr>';
	}
	echo '</tbody></table></div>';
	$nonce = wp_create_nonce( 'apex_mc' );
	?>
<script>
(() => {
  const rows = [...document.querySelectorAll('.apex-mc tr[data-ref]')], n = document.getElementById('mc-n'), all = document.getElementById('mc-all'), todo = document.getElementById('mc-todo');
  const show = () => rows.forEach(r => r.hidden = todo.checked && r.dataset.done === '1');
  todo.addEventListener('change', show);
  const copy = async r => {
    const act = r.querySelector('.mc-act');
    act.textContent = <?php echo wp_json_encode( __( 'Copying…', 'apex' ) ); ?>;
    const body = new URLSearchParams({action:'apex_mc_copy', _ajax_nonce:<?php echo wp_json_encode( $nonce ); ?>, ref:r.dataset.ref});
    try {
      const j = await (await fetch(ajaxurl, {method:'POST', body})).json();
      if (j.success) { r.dataset.done = '1'; r.querySelector('.mc-tick').textContent = '✓'; act.textContent = <?php echo wp_json_encode( __( 'In the Media Library', 'apex' ) ); ?>; n.textContent = +n.textContent + 1; return true; }
      act.textContent = j.data || <?php echo wp_json_encode( __( 'Failed', 'apex' ) ); ?>;
    } catch (e) { act.textContent = <?php echo wp_json_encode( __( 'Failed', 'apex' ) ); ?>; }
    return false;
  };
  document.querySelectorAll('.mc-one').forEach(b => b.addEventListener('click', () => copy(b.closest('tr'))));
  all.addEventListener('click', async () => {
    all.disabled = true;
    for (const r of rows) if (r.dataset.done !== '1') await copy(r);
    all.disabled = false;
  });
})();
</script>
	<?php
}
