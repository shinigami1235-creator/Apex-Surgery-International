<?php
/**
 * Online consultation and game vouchers.
 *
 * POST /wp-json/apex/v1/consult   an enquiry with up to three photos. Saved as a private Enquiry, photos kept
 *                                 outside the media library where only logged-in staff can open them, and the
 *                                 team is emailed a link (never the photos).
 * POST /wp-json/apex/v1/voucher   records a voucher a player claimed in the games, so reception can check it.
 * Apex settings › Forms           who gets the emails, spam protection, how long enquiries are kept.
 * Vouchers › Check a code         reception types or scans the code, sees whether it is real, marks it used.
 */
defined( 'ABSPATH' ) || exit;

const APEX_PROCS = [ 'facelift', 'browlift', 'rhinoplasty', 'eyelid', 'breast', 'lipo' ];
const APEX_PHOTO_VIEWS = [ 'front', 'angle', 'profile' ];   // the views the consultation form asks for

function apex_forms_opt( string $k, $def = '' ) {
	$o = get_option( 'apex_forms' );
	return is_array( $o ) && isset( $o[ $k ] ) && $o[ $k ] !== '' ? $o[ $k ] : $def;
}
/** The visitor's address. Behind Cloudflare or a load balancer every request comes from the proxy, so
 *  wp-config.php can name the header that carries the real one: define( 'APEX_IP_HEADER', 'HTTP_CF_CONNECTING_IP' ).
 *  Only set it when the server cannot be reached except through that proxy, or anyone could send the header. */
function apex_client_ip(): string {
	if ( defined( 'APEX_IP_HEADER' ) && ! empty( $_SERVER[ APEX_IP_HEADER ] ) ) {
		$ip = trim( explode( ',', (string) $_SERVER[ APEX_IP_HEADER ] )[0] );
		if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) return $ip;
	}
	return (string) ( $_SERVER['REMOTE_ADDR'] ?? '' );
}
/** A one-way fingerprint of the visitor's address for rate limits and the consent record. */
function apex_ip_hash(): string {
	return substr( hash_hmac( 'sha256', apex_client_ip(), wp_salt( 'nonce' ) ), 0, 16 );
}
/** A text field from a JSON body: arrays and objects count as empty. */
function apex_str( $v ): string { return is_scalar( $v ) ? (string) $v : ''; }
function apex_rate_ok( string $what, int $max, int $window ): bool {
	$k = 'apex_rl_' . $what . '_' . apex_ip_hash();
	$n = (int) get_transient( $k );
	if ( $n >= $max ) return false;
	set_transient( $k, $n + 1, $window );
	return true;
}
function apex_turnstile_ok( string $token ): bool {
	$secret = apex_forms_opt( 'turnstile_secret' );
	if ( ! $secret ) return true;                       // not set up: the honeypot and rate limit still apply
	if ( $token === '' ) return false;
	$r = wp_remote_post( 'https://challenges.cloudflare.com/turnstile/v0/siteverify', [ 'timeout' => 8, 'body' => [ 'secret' => $secret, 'response' => $token, 'remoteip' => apex_client_ip() ] ] );
	if ( is_wp_error( $r ) ) return true;               // Cloudflare unreachable: do not lose the enquiry
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	return ! empty( $j['success'] );
}

/* ---------- private photo storage ---------- */
function apex_private_dir(): string {
	// wp-config.php can put the photos outside the public web folder: define( 'APEX_PRIVATE_DIR', '/home/apex/private-photos' );
	if ( defined( 'APEX_PRIVATE_DIR' ) && APEX_PRIVATE_DIR ) {
		$dir = untrailingslashit( (string) APEX_PRIVATE_DIR );
		if ( ! is_dir( $dir ) ) wp_mkdir_p( $dir );
		return $dir;
	}
	$u = wp_upload_dir( null, false );
	$dir = trailingslashit( $u['basedir'] ) . 'apex-private';
	if ( ! is_dir( $dir ) ) {
		wp_mkdir_p( $dir );
	}
	// Apache honours this; nginx needs the rule in HANDOVER.md. The file names are random either way.
	if ( ! file_exists( "$dir/.htaccess" ) ) @file_put_contents( "$dir/.htaccess", "Require all denied\nDeny from all\n" );
	if ( ! file_exists( "$dir/index.php" ) ) @file_put_contents( "$dir/index.php", "<?php\n// Silence.\n" );
	return $dir;
}
/** Re-save a photo as a JPEG no larger than 2400 px: this also drops the camera's location and other metadata. */
function apex_store_photo( array $file ): ?string {
	if ( ( $file['error'] ?? 1 ) !== UPLOAD_ERR_OK || ! is_uploaded_file( $file['tmp_name'] ) ) return null;
	if ( $file['size'] > 12 * MB_IN_BYTES ) return null;
	$info = @getimagesize( $file['tmp_name'] );
	if ( ! $info || ! in_array( $info[2], [ IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF ], true ) ) return null;
	// GD writes a fresh JPEG with no metadata at all, so the camera's GPS location never reaches the server's disk
	require_once ABSPATH . WPINC . '/class-wp-image-editor.php';
	require_once ABSPATH . WPINC . '/class-wp-image-editor-gd.php';
	$gd = fn() => [ 'WP_Image_Editor_GD' ];
	// without GD the photo is not kept, since the other editor can leave the location in the file
	if ( ! WP_Image_Editor_GD::test() ) return null;
	add_filter( 'wp_image_editors', $gd, 99 );
	$ed = wp_get_image_editor( $file['tmp_name'] );
	remove_filter( 'wp_image_editors', $gd, 99 );
	if ( is_wp_error( $ed ) || ! $ed instanceof WP_Image_Editor_GD ) return null;
	$ed->maybe_exif_rotate();   // phones store many portraits on their side with a tag that GD would drop
	$ed->resize( 2400, 2400, false );
	$ed->set_quality( 85 );
	$rel = gmdate( 'Y/m/' ) . bin2hex( random_bytes( 16 ) ) . '.jpg';
	$dest = apex_private_dir() . '/' . $rel;
	wp_mkdir_p( dirname( $dest ) );
	$saved = $ed->save( $dest, 'image/jpeg' );
	return is_wp_error( $saved ) ? null : $rel;
}
function apex_photo_path( string $rel ): string {
	$rel = ltrim( str_replace( [ '..', '\\' ], '', $rel ), '/' );
	return apex_private_dir() . '/' . $rel;
}

/* ---------- REST routes ---------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'apex/v1', '/consult', [ 'methods' => 'POST', 'callback' => 'apex_consult_submit', 'permission_callback' => '__return_true' ] );
	register_rest_route( 'apex/v1', '/voucher', [ 'methods' => 'POST', 'callback' => 'apex_voucher_register', 'permission_callback' => '__return_true' ] );
} );

function apex_consult_submit( WP_REST_Request $req ) {
	$f = json_decode( (string) $req->get_param( 'enquiry' ), true );
	if ( ! is_array( $f ) ) return new WP_Error( 'apex_bad', 'Bad request', [ 'status' => 400 ] );
	// a field people cannot see: anything typed into it came from a bot
	if ( trim( (string) $req->get_param( 'website' ) ) !== '' ) return [ 'ok' => true, 'ref' => 'A' . wp_rand( 100000, 999999 ) ];
	if ( ! apex_rate_ok( 'consult', 6, HOUR_IN_SECONDS ) ) return new WP_Error( 'apex_rate', 'Too many enquiries from this connection. Please try again later or use LINE or WhatsApp.', [ 'status' => 429 ] );
	if ( ! apex_turnstile_ok( (string) $req->get_param( 'cf-turnstile-response' ) ) ) return new WP_Error( 'apex_bot', 'The spam check did not pass. Please try again.', [ 'status' => 403 ] );

	$s = fn( $k, $n = 200 ) => mb_substr( sanitize_text_field( apex_str( $f[ $k ] ?? '' ) ), 0, $n );
	$v = [
		'procedures' => array_values( array_intersect( array_filter( (array) ( $f['procedures'] ?? [] ), 'is_string' ), APEX_PROCS ) ),
		'branch' => in_array( $f['branch'] ?? '', [ 'ploenchit', 'phuket' ], true ) ? $f['branch'] : '',
		'from' => preg_match( '/^\d{4}-\d{2}-\d{2}$/', apex_str( $f['from'] ?? '' ) ) ? $f['from'] : '',
		'to' => preg_match( '/^\d{4}-\d{2}-\d{2}$/', apex_str( $f['to'] ?? '' ) ) ? $f['to'] : '',
		'name' => $s( 'name', 100 ),
		'country' => $s( 'country', 80 ),
		'method' => in_array( $f['method'] ?? '', [ 'whatsapp', 'line', 'email' ], true ) ? $f['method'] : '',
		'contact' => $s( 'contact', 120 ),
		'questions' => mb_substr( sanitize_textarea_field( apex_str( $f['questions'] ?? '' ) ), 0, 3000 ),
		'lang' => ( $f['lang'] ?? '' ) === 'th' ? 'th' : 'en',
	];
	$missing = [];
	if ( ! $v['procedures'] ) $missing[] = 'procedures';
	if ( ! $v['branch'] ) $missing[] = 'branch';
	if ( mb_strlen( $v['name'] ) < 2 ) $missing[] = 'name';
	if ( ! $v['method'] || mb_strlen( $v['contact'] ) < 2 ) $missing[] = 'contact';
	if ( $v['method'] === 'email' && ! is_email( $v['contact'] ) ) $missing[] = 'contact';
	if ( empty( $f['consent'] ) ) $missing[] = 'consent';
	if ( $missing ) return new WP_Error( 'apex_fields', 'Missing or invalid: ' . implode( ', ', array_unique( $missing ) ), [ 'status' => 422, 'fields' => array_values( array_unique( $missing ) ) ] );

	$photos = [];
	foreach ( APEX_PHOTO_VIEWS as $view ) {
		$file = $_FILES[ 'photo_' . $view ] ?? null;
		if ( ! $file ) continue;
		$rel = apex_store_photo( $file );
		if ( $rel ) $photos[ $view ] = $rel;
	}

	$id = wp_insert_post( [
		'post_type' => 'apex_lead', 'post_status' => 'private',
		'post_title' => 'Enquiry',
	], true );
	if ( is_wp_error( $id ) ) return new WP_Error( 'apex_save', 'Could not save the enquiry', [ 'status' => 500 ] );
	wp_update_post( [ 'ID' => $id, 'post_title' => 'Enquiry A' . $id ] );
	update_post_meta( $id, 'apex_fields', wp_slash( $v ) );
	update_post_meta( $id, 'apex_photos', $photos );
	update_post_meta( $id, 'apex_status', 'new' );
	update_post_meta( $id, 'apex_consent', [ 'at' => gmdate( 'c' ), 'text' => mb_substr( sanitize_text_field( apex_str( $f['consentText'] ?? '' ) ), 0, 400 ) ?: 'consent box ticked', 'ip' => apex_ip_hash(), 'page' => esc_url_raw( (string) $req->get_header( 'referer' ) ) ] );

	$to = array_filter( array_map( 'trim', explode( ',', (string) apex_forms_opt( 'recipients', get_option( 'admin_email' ) ) ) ), 'is_email' );
	if ( $to ) {
		// no names, contact details, questions or photos in the email: they stay behind the staff login
		$lines = [ 'A new online consultation arrived on the website.', '', 'Reference: A' . $id, 'Procedures: ' . implode( ', ', $v['procedures'] ), 'Branch: ' . $v['branch'], 'Reply by: ' . $v['method'], 'Photos: ' . count( $photos ), '', 'Open it (staff login needed): ' . admin_url( 'post.php?post=' . $id . '&action=edit' ) ];
		wp_mail( $to, '[Apex] New online consultation A' . $id, implode( "\n", $lines ) );
	}
	do_action( 'apex_consult_received', $id, $v );
	return [ 'ok' => true, 'ref' => 'A' . $id ];
}

/* ---------- vouchers ---------- */
/** Prize tiers, editable under Apex settings › Games. Falls back to the scores the games shipped with. */
function apex_game_config(): array {
	$def = [
		'days' => 60,
		'games' => [
			'steady' => [ 600, 1200, 2000 ], 'proportion' => [ 600, 1200, 2000 ], 'factrush' => [ 400, 1200, 3000 ],
			'recoverysort' => [ 400, 1200, 2500 ], 'memorymatch' => [ 2400, 3800, 5000 ],
		],
		'prizes' => [
			[ 'en' => 'Apex tote bag', 'th' => 'กระเป๋าผ้า Apex' ],
			[ 'en' => 'Skincare kit', 'th' => 'ชุดผลิตภัณฑ์ดูแลผิว' ],
			[ 'en' => 'Airport pickup (international clients)', 'th' => 'บริการรับจากสนามบิน (ลูกค้าต่างประเทศ)' ],
		],
		'perDay' => 4,   // 3 scored runs a day plus 1 for finishing a Learn set, as the games allow
	];
	$o = get_option( 'apex_games' );
	if ( ! is_array( $o ) ) return $def;
	foreach ( $def['games'] as $g => $t ) foreach ( $t as $i => $x ) if ( isset( $o['games'][ $g ][ $i ] ) && is_numeric( $o['games'][ $g ][ $i ] ) ) $def['games'][ $g ][ $i ] = (int) $o['games'][ $g ][ $i ];
	foreach ( $def['prizes'] as $i => $p ) foreach ( APEX_LANGS as $l ) if ( ! empty( $o['prizes'][ $i ][ $l ] ) ) $def['prizes'][ $i ][ $l ] = (string) $o['prizes'][ $i ][ $l ];
	foreach ( [ 'days', 'perDay' ] as $k ) if ( isset( $o[ $k ] ) && (int) $o[ $k ] > 0 ) $def[ $k ] = (int) $o[ $k ];
	return $def;
}
function apex_voucher_find( string $code ): int {
	$ids = get_posts( [ 'post_type' => 'apex_voucher', 'post_status' => 'any', 'title' => $code, 'posts_per_page' => 1, 'fields' => 'ids', 'suppress_filters' => true ] );
	return (int) ( $ids[0] ?? 0 );
}
function apex_voucher_register( WP_REST_Request $req ) {
	$code = strtoupper( preg_replace( '/[^A-Za-z0-9-]/', '', (string) $req->get_param( 'code' ) ) );
	if ( ! preg_match( '/^APX-[A-Z2-9]{6}$/', $code ) ) return new WP_Error( 'apex_bad', 'Bad code', [ 'status' => 400 ] );
	$game = sanitize_key( (string) $req->get_param( 'game' ) );
	$tier = (int) $req->get_param( 'tier' );
	$score = (int) $req->get_param( 'score' );
	$cfg = apex_game_config();
	if ( ! isset( $cfg['games'][ $game ][ $tier ] ) ) return new WP_Error( 'apex_bad', 'Unknown game or prize', [ 'status' => 400 ] );
	// the score has to reach the prize it claims, under the thresholds set in the admin today
	if ( $score < $cfg['games'][ $game ][ $tier ] ) return new WP_Error( 'apex_score', 'Score below the prize', [ 'status' => 422 ] );
	$run = (array) $req->get_param( 'run' );
	// a real scored run lasts at least 10 seconds and has input; the phone reports both, so this stops casual
	// requests rather than a determined cheat (reception checks the person against a booking)
	if ( (int) ( $run['durationMs'] ?? 0 ) < 10000 || (int) ( $run['inputs'] ?? 0 ) < 1 ) return new WP_Error( 'apex_run', 'No game run', [ 'status' => 422 ] );
	if ( apex_voucher_find( $code ) ) return [ 'ok' => true, 'code' => $code, 'known' => true ];
	if ( ! apex_rate_ok( 'voucher', (int) $cfg['perDay'], DAY_IN_SECONDS ) ) return new WP_Error( 'apex_rate', 'Daily voucher limit reached', [ 'status' => 429 ] );
	$name = mb_substr( sanitize_text_field( apex_str( $req->get_param( 'name' ) ) ), 0, 60 );
	$lang = $req->get_param( 'lang' ) === 'th' ? 'th' : 'en';
	$id = wp_insert_post( [ 'post_type' => 'apex_voucher', 'post_status' => 'private', 'post_title' => $code ], true );
	if ( is_wp_error( $id ) ) return new WP_Error( 'apex_save', 'Could not save', [ 'status' => 500 ] );
	$now = time();
	update_post_meta( $id, 'apex_voucher', wp_slash( [
		'code' => $code, 'game' => $game, 'tier' => $tier, 'score' => $score, 'name' => $name, 'lang' => $lang,
		'prize' => $cfg['prizes'][ $tier ][ $lang ] ?? '', 'issued' => $now, 'expires' => $now + $cfg['days'] * DAY_IN_SECONDS,
		'run' => [ 'durationMs' => (int) ( $run['durationMs'] ?? 0 ), 'inputs' => (int) ( $run['inputs'] ?? 0 ), 'logLength' => (int) ( $run['logLength'] ?? 0 ) ],
		'ip' => apex_ip_hash(),
	] ) );
	update_post_meta( $id, 'apex_used', '' );
	return [ 'ok' => true, 'code' => $code ];
}

/* ---------- admin: enquiries ---------- */
add_filter( 'manage_apex_lead_posts_columns', fn() => [ 'cb' => '<input type="checkbox">', 'title' => __( 'Enquiry', 'apex' ), 'apex_name' => __( 'Name', 'apex' ), 'apex_contact' => __( 'Contact', 'apex' ), 'apex_branch' => __( 'Branch', 'apex' ), 'apex_status' => __( 'Status', 'apex' ), 'apex_photos' => __( 'Photos', 'apex' ), 'date' => __( 'Received', 'apex' ) ] );
add_action( 'manage_apex_lead_posts_custom_column', function ( $col, $id ) {
	$v = (array) get_post_meta( $id, 'apex_fields', true );
	if ( $col === 'apex_name' ) echo esc_html( ( $v['name'] ?? '' ) . ' · ' . implode( ', ', (array) ( $v['procedures'] ?? [] ) ) );
	if ( $col === 'apex_contact' ) echo esc_html( ( $v['method'] ?? '' ) . ' ' . ( $v['contact'] ?? '' ) );
	if ( $col === 'apex_branch' ) echo esc_html( $v['branch'] ?? '' );
	if ( $col === 'apex_status' ) echo esc_html( apex_lead_statuses()[ get_post_meta( $id, 'apex_status', true ) ?: 'new' ] ?? '' );
	if ( $col === 'apex_photos' ) echo (int) count( (array) get_post_meta( $id, 'apex_photos', true ) );
}, 10, 2 );
function apex_lead_statuses(): array { return [ 'new' => __( 'New', 'apex' ), 'replied' => __( 'Replied', 'apex' ), 'booked' => __( 'Booked', 'apex' ), 'closed' => __( 'Closed', 'apex' ) ]; }
add_action( 'add_meta_boxes_apex_lead', function () {
	remove_meta_box( 'submitdiv', 'apex_lead', 'side' );
	add_meta_box( 'apex-lead', __( 'Enquiry', 'apex' ), 'apex_lead_box', 'apex_lead', 'normal', 'high' );
	add_meta_box( 'apex-lead-status', __( 'Follow-up', 'apex' ), 'apex_lead_status_box', 'apex_lead', 'side', 'high' );
} );
add_action( 'load-post.php', function () {
	$id = absint( $_GET['post'] ?? 0 );
	if ( $id && get_post_type( $id ) === 'apex_lead' && current_user_can( 'edit_post', $id ) ) apex_audit( 'lead_open', $id );
} );
function apex_lead_box( WP_Post $p ): void {
	$v = (array) get_post_meta( $p->ID, 'apex_fields', true );
	$c = (array) get_post_meta( $p->ID, 'apex_consent', true );
	$rows = [ __( 'Name', 'apex' ) => $v['name'] ?? '', __( 'Country', 'apex' ) => $v['country'] ?? '', __( 'Contact', 'apex' ) => ( $v['method'] ?? '' ) . ' ' . ( $v['contact'] ?? '' ), __( 'Procedures', 'apex' ) => implode( ', ', (array) ( $v['procedures'] ?? [] ) ), __( 'Branch', 'apex' ) => $v['branch'] ?? '', __( 'Travel dates', 'apex' ) => trim( ( $v['from'] ?? '' ) . ' – ' . ( $v['to'] ?? '' ), ' –' ), __( 'Page language', 'apex' ) => $v['lang'] ?? '', __( 'Questions', 'apex' ) => $v['questions'] ?? '', __( 'Consent', 'apex' ) => ( $c['at'] ?? '' ) . ' · ' . ( $c['text'] ?? '' ) ];
	echo '<table class="widefat striped"><tbody>';
	foreach ( $rows as $k => $x ) echo '<tr><th style="width:160px">' . esc_html( $k ) . '</th><td>' . nl2br( esc_html( (string) $x ) ) . '</td></tr>';
	echo '</tbody></table>';
	$photos = (array) get_post_meta( $p->ID, 'apex_photos', true );
	if ( $photos ) {
		echo '<h3>' . esc_html__( 'Photos', 'apex' ) . '</h3><p class="description">' . esc_html__( 'Patient photos. Only staff who can edit enquiries can open them. Do not download them to personal devices.', 'apex' ) . '</p><div style="display:flex;gap:12px;flex-wrap:wrap">';
		foreach ( $photos as $view => $rel ) {
			$u = wp_nonce_url( admin_url( 'admin-post.php?action=apex_photo&lead=' . $p->ID . '&view=' . rawurlencode( $view ) ), 'apex_photo_' . $p->ID );
			echo '<a href="' . esc_url( $u ) . '" target="_blank" rel="noopener"><img src="' . esc_url( $u ) . '" alt="' . esc_attr( $view ) . '" style="width:220px;height:auto;border-radius:8px;border:1px solid #ddd"><br>' . esc_html( $view ) . '</a>';
		}
		echo '</div>';
	}
}
function apex_lead_status_box( WP_Post $p ): void {
	wp_nonce_field( 'apex_lead_' . $p->ID, 'apex_lead_nonce' );
	$cur = get_post_meta( $p->ID, 'apex_status', true ) ?: 'new';
	echo '<p><select name="apex_status" style="width:100%">';
	foreach ( apex_lead_statuses() as $k => $x ) echo '<option value="' . esc_attr( $k ) . '"' . selected( $cur, $k, false ) . '>' . esc_html( $x ) . '</option>';
	echo '</select></p><p><label for="apex-notes">' . esc_html__( 'Staff notes', 'apex' ) . '</label><textarea id="apex-notes" name="apex_notes" rows="5" style="width:100%">' . esc_textarea( (string) get_post_meta( $p->ID, 'apex_notes', true ) ) . '</textarea></p>';
	echo '<p><button type="submit" class="button button-primary">' . esc_html__( 'Save', 'apex' ) . '</button> <a class="submitdelete" style="color:#b32d2e;margin-left:8px" href="' . esc_url( get_delete_post_link( $p->ID, '', true ) ) . '" onclick="return confirm(\'' . esc_js( __( 'Delete this enquiry and its photos for good?', 'apex' ) ) . '\')">' . esc_html__( 'Delete', 'apex' ) . '</a></p>';
	echo '<input type="hidden" name="post_status" value="private"><input type="hidden" name="visibility" value="private">';
}
add_action( 'save_post_apex_lead', function ( $id ) {
	if ( ! isset( $_POST['apex_lead_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['apex_lead_nonce'] ), 'apex_lead_' . $id ) || ! current_user_can( 'edit_post', $id ) ) return;
	$s = sanitize_key( $_POST['apex_status'] ?? 'new' );
	update_post_meta( $id, 'apex_status', array_key_exists( $s, apex_lead_statuses() ) ? $s : 'new' );
	update_post_meta( $id, 'apex_notes', sanitize_textarea_field( wp_unslash( $_POST['apex_notes'] ?? '' ) ) );
	apex_audit( 'lead_save', (int) $id, 'status: ' . get_post_meta( $id, 'apex_status', true ) );
} );
/* searching enquiries looks in the name, contact and questions */
add_action( 'pre_get_posts', function ( $q ) {
	if ( ! is_admin() || ! $q->is_main_query() || $q->get( 'post_type' ) !== 'apex_lead' || ! $q->get( 's' ) ) return;
	$q->set( 'meta_query', [ [ 'key' => 'apex_fields', 'value' => $q->get( 's' ), 'compare' => 'LIKE' ] ] );
	$q->set( 's', '' );
} );
/* a lead's photo, for staff only */
add_action( 'admin_post_apex_photo', function () {
	$id = absint( $_GET['lead'] ?? 0 );
	if ( ! $id || ! current_user_can( 'edit_post', $id ) || ! wp_verify_nonce( sanitize_key( $_GET['_wpnonce'] ?? '' ), 'apex_photo_' . $id ) ) wp_die( 'Not allowed', 403 );
	$photos = (array) get_post_meta( $id, 'apex_photos', true );
	$rel = $photos[ sanitize_key( $_GET['view'] ?? '' ) ] ?? '';
	$path = $rel ? apex_photo_path( $rel ) : '';
	if ( ! $path || ! is_file( $path ) ) wp_die( 'Not found', 404 );
	apex_audit( 'photo_view', $id, sanitize_key( $_GET['view'] ?? '' ) );
	nocache_headers();
	header( 'Content-Type: image/jpeg' );
	header( 'Content-Length: ' . filesize( $path ) );
	header( 'X-Robots-Tag: noindex' );
	readfile( $path );
	exit;
} );
/* deleting an enquiry deletes its photos */
add_action( 'before_delete_post', function ( $id ) {
	if ( get_post_type( $id ) !== 'apex_lead' ) return;
	apex_audit( get_current_user_id() ? 'lead_delete' : 'lead_expire', (int) $id );
	foreach ( (array) get_post_meta( $id, 'apex_photos', true ) as $rel ) { $p = apex_photo_path( (string) $rel ); if ( is_file( $p ) ) @unlink( $p ); }
} );
/* enquiries skip the bin: trashing one deletes it, photos included (one or many at a time) */
add_filter( 'pre_trash_post', function ( $skip, $post ) {
	if ( $post && $post->post_type === 'apex_lead' ) { wp_delete_post( $post->ID, true ); return true; }
	return $skip;
}, 10, 2 );
/* after a bulk delete the list says so, with no Undo link that could not work */
add_filter( 'bulk_post_updated_messages', function ( $m, $counts ) {
	$m['apex_lead']['trashed'] = _n( '%s enquiry deleted, photos included.', '%s enquiries deleted, photos included.', $counts['trashed'], 'apex' );
	return $m;
}, 10, 2 );
add_filter( 'wp_redirect', function ( $to ) {
	if ( is_admin() && str_contains( (string) $to, 'post_type=apex_lead' ) && str_contains( (string) $to, 'trashed=' ) ) $to = remove_query_arg( 'ids', $to );
	return $to;
} );
/* old enquiries are deleted after the number of days set under Apex settings › Forms (0 keeps them) */
add_action( 'apex_daily', function () {
	$days = (int) apex_forms_opt( 'keep_days', 365 );
	if ( $days <= 0 ) return;
	$old = get_posts( [ 'post_type' => 'apex_lead', 'post_status' => 'any', 'posts_per_page' => 200, 'fields' => 'ids', 'date_query' => [ [ 'before' => gmdate( 'Y-m-d', time() - $days * DAY_IN_SECONDS ) ] ] ] );
	foreach ( $old as $id ) wp_delete_post( $id, true );
	// vouchers carry a name: they go 90 days after they expire
	foreach ( get_posts( [ 'post_type' => 'apex_voucher', 'post_status' => 'any', 'posts_per_page' => 200, 'fields' => 'ids', 'date_query' => [ [ 'before' => gmdate( 'Y-m-d', time() - ( apex_game_config()['days'] + 90 ) * DAY_IN_SECONDS ) ] ] ] ) as $id ) wp_delete_post( $id, true );
} );
add_action( 'init', function () { if ( ! wp_next_scheduled( 'apex_daily' ) ) wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'apex_daily' ); } );

/* WordPress's privacy tools (Tools › Export / Erase Personal Data) find enquiries by email address */
add_filter( 'wp_privacy_personal_data_exporters', function ( $ex ) {
	$ex['apex-leads'] = [ 'exporter_friendly_name' => 'Apex enquiries', 'callback' => function ( $email ) {
		$items = [];
		apex_audit( 'export', 0, count( apex_leads_by_email( $email ) ) . ' enquiries for ' . apex_mask( $email ) );
		foreach ( apex_leads_by_email( $email ) as $id ) {
			$v = (array) get_post_meta( $id, 'apex_fields', true );
			$data = [];
			foreach ( $v as $k => $x ) $data[] = [ 'name' => $k, 'value' => is_array( $x ) ? implode( ', ', $x ) : (string) $x ];
			$c = (array) get_post_meta( $id, 'apex_consent', true );
			$data[] = [ 'name' => 'received', 'value' => get_the_date( 'c', $id ) ];
			$data[] = [ 'name' => 'consent', 'value' => trim( ( $c['at'] ?? '' ) . ' ' . ( $c['text'] ?? '' ) ) ];
			$data[] = [ 'name' => 'status', 'value' => (string) get_post_meta( $id, 'apex_status', true ) ];
			$n = count( (array) get_post_meta( $id, 'apex_photos', true ) );
			$data[] = [ 'name' => 'photos', 'value' => $n ? sprintf( '%d on file. Staff send copies on request from the enquiry screen.', $n ) : 'none' ];
			$items[] = [ 'group_id' => 'apex-leads', 'group_label' => 'Online consultations', 'item_id' => 'lead-' . $id, 'data' => $data ];
		}
		return [ 'data' => $items, 'done' => true ];
	} ];
	return $ex;
} );
add_filter( 'wp_privacy_personal_data_erasers', function ( $er ) {
	$er['apex-leads'] = [ 'eraser_friendly_name' => 'Apex enquiries', 'callback' => function ( $email ) {
		$n = 0;
		foreach ( apex_leads_by_email( $email ) as $id ) { wp_delete_post( $id, true ); $n++; }
		apex_audit( 'erase', 0, $n . ' enquiries for ' . apex_mask( $email ) );
		return [ 'items_removed' => $n, 'items_retained' => false, 'messages' => [], 'done' => true ];
	} ];
	return $er;
} );
/** a***@example.com or ******4321, for the access log */
function apex_mask( string $who ): string {
	if ( str_contains( $who, '@' ) ) { [ $a, $d ] = explode( '@', $who, 2 ); return mb_substr( $a, 0, 1 ) . '***@' . $d; }
	return str_repeat( '*', max( 0, mb_strlen( $who ) - 4 ) ) . mb_substr( $who, -4 );
}
/** Enquiries whose contact matches: an email address exactly, a phone number by its digits, a LINE ID exactly. */
function apex_leads_by_email( string $who ): array {
	$out = [];
	$digits = preg_replace( '/\D/', '', $who );
	foreach ( get_posts( [ 'post_type' => 'apex_lead', 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids' ] ) as $id ) {
		$v = (array) get_post_meta( $id, 'apex_fields', true );
		$c = (string) ( $v['contact'] ?? '' );
		if ( strcasecmp( $c, $who ) === 0 || ( strlen( $digits ) >= 8 && preg_replace( '/\D/', '', $c ) === $digits ) ) $out[] = $id;
	}
	return $out;
}

/* ---------- admin: vouchers and the reception check ---------- */
add_filter( 'manage_apex_voucher_posts_columns', fn() => [ 'cb' => '<input type="checkbox">', 'title' => __( 'Code', 'apex' ), 'apex_prize' => __( 'Prize', 'apex' ), 'apex_name' => __( 'Name', 'apex' ), 'apex_state' => __( 'State', 'apex' ), 'date' => __( 'Claimed', 'apex' ) ] );
add_action( 'manage_apex_voucher_posts_custom_column', function ( $col, $id ) {
	$v = (array) get_post_meta( $id, 'apex_voucher', true );
	if ( $col === 'apex_prize' ) echo esc_html( ( $v['prize'] ?? '' ) . ' · ' . ( $v['game'] ?? '' ) . ' ' . ( $v['score'] ?? '' ) );
	if ( $col === 'apex_name' ) echo esc_html( $v['name'] ?? '' );
	if ( $col === 'apex_state' ) echo esc_html( apex_voucher_state( $id ) );
}, 10, 2 );
function apex_voucher_state( int $id ): string {
	$v = (array) get_post_meta( $id, 'apex_voucher', true );
	$used = get_post_meta( $id, 'apex_used', true );
	if ( $used ) return sprintf( __( 'Used %s', 'apex' ), wp_date( 'j M Y H:i', (int) ( $used['at'] ?? 0 ) ) );
	if ( ( $v['expires'] ?? 0 ) < time() ) return __( 'Expired', 'apex' );
	return __( 'Valid', 'apex' );
}
add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=apex_voucher', __( 'Check a code', 'apex' ), __( 'Check a code', 'apex' ), 'edit_apex_vouchers', 'apex-voucher-check', 'apex_voucher_check_page', 0 );
	add_submenu_page( 'apex-settings', __( 'Forms', 'apex' ), __( 'Forms', 'apex' ), 'manage_options', 'apex-forms', 'apex_forms_page' );
	add_submenu_page( 'apex-settings', __( 'Games and prizes', 'apex' ), __( 'Games and prizes', 'apex' ), 'manage_options', 'apex-games', 'apex_games_page' );
} );
function apex_voucher_check_page(): void {
	if ( ! current_user_can( 'edit_apex_vouchers' ) ) return;
	$code = strtoupper( preg_replace( '/[^A-Za-z0-9-]/', '', (string) wp_unslash( $_REQUEST['code'] ?? '' ) ) );
	if ( $code !== '' && ! str_starts_with( $code, 'APX-' ) ) $code = 'APX-' . $code;
	$msg = '';
	if ( $code && isset( $_POST['apex_use'] ) && check_admin_referer( 'apex_use_' . $code ) ) {
		$id = apex_voucher_find( $code );
		if ( $id && ! get_post_meta( $id, 'apex_used', true ) ) { update_post_meta( $id, 'apex_used', [ 'at' => time(), 'by' => get_current_user_id() ] ); apex_audit( 'voucher_use', $id ); $msg = __( 'Marked as used.', 'apex' ); }
	}
	echo '<div class="wrap"><h1>' . esc_html__( 'Check a voucher', 'apex' ) . '</h1><p>' . esc_html__( 'Type the code on the client\'s phone, or scan its QR code with the reception phone.', 'apex' ) . '</p>';
	echo '<form method="get"><input type="hidden" name="post_type" value="apex_voucher"><input type="hidden" name="page" value="apex-voucher-check"><input name="code" class="regular-text" style="font-size:20px;letter-spacing:.06em;text-transform:uppercase" value="' . esc_attr( $code ) . '" placeholder="APX-XXXXXX" autocomplete="off" autofocus> ';
	submit_button( __( 'Check', 'apex' ), 'primary', '', false );
	echo '</form>';
	if ( $msg ) echo '<div class="notice notice-success"><p>' . esc_html( $msg ) . '</p></div>';
	if ( $code ) {
		$id = apex_voucher_find( $code );
		if ( ! $id ) {
			echo '<div class="notice notice-error" style="padding:12px"><p style="font-size:16px"><b>' . esc_html( $code ) . '</b> ' . esc_html__( 'is not on record. It was not claimed on this website, or the phone was offline when it was claimed. Check the client\'s screen: the code, name, prize and date must all be shown.', 'apex' ) . '</p></div>';
		} else {
			$v = (array) get_post_meta( $id, 'apex_voucher', true );
			$state = apex_voucher_state( $id );
			$ok = $state === __( 'Valid', 'apex' );
			echo '<div class="notice ' . ( $ok ? 'notice-success' : 'notice-warning' ) . '" style="padding:12px"><p style="font-size:18px"><b>' . esc_html( $code ) . '</b> · ' . esc_html( $state ) . '</p>';
			echo '<table class="widefat striped" style="max-width:640px"><tbody>';
			foreach ( [ __( 'Prize', 'apex' ) => $v['prize'] ?? '', __( 'Name', 'apex' ) => $v['name'] ?? '', __( 'Game and score (as the phone reported it)', 'apex' ) => ( $v['game'] ?? '' ) . ' · ' . ( $v['score'] ?? '' ), __( 'Claimed', 'apex' ) => wp_date( 'j M Y H:i', (int) ( $v['issued'] ?? 0 ) ), __( 'Valid until', 'apex' ) => wp_date( 'j M Y', (int) ( $v['expires'] ?? 0 ) ) ] as $k => $x ) echo '<tr><th style="width:160px">' . esc_html( $k ) . '</th><td>' . esc_html( (string) $x ) . '</td></tr>';
			echo '</tbody></table>';
			if ( $ok ) {
				echo '<form method="post" style="margin-top:12px">';
				wp_nonce_field( 'apex_use_' . $code );
				echo '<input type="hidden" name="code" value="' . esc_attr( $code ) . '"><button class="button button-primary button-hero" name="apex_use" value="1">' . esc_html__( 'Give the prize and mark as used', 'apex' ) . '</button></form>';
			}
			echo '</div>';
		}
	}
	echo '</div>';
}

/* ---------- settings: forms, games ---------- */
function apex_forms_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) return;
	if ( isset( $_POST['apex_forms_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_forms_nonce'] ), 'apex_forms' ) ) {
		$in = wp_unslash( $_POST['f'] ?? [] );
		$emails = implode( ', ', array_filter( array_map( 'sanitize_email', explode( ',', (string) ( $in['recipients'] ?? '' ) ) ), 'is_email' ) );
		update_option( 'apex_forms', [
			'recipients' => $emails,
			'turnstile_site' => sanitize_text_field( $in['turnstile_site'] ?? '' ),
			// an empty box keeps the saved secret; the tick box clears it
			'turnstile_secret' => ! empty( $in['turnstile_clear'] ) ? '' : ( sanitize_text_field( $in['turnstile_secret'] ?? '' ) ?: (string) apex_forms_opt( 'turnstile_secret' ) ),
			'keep_days' => max( 0, (int) ( $in['keep_days'] ?? 365 ) ),
		], false );
		update_option( 'apex_turnstile_site', sanitize_text_field( $in['turnstile_site'] ?? '' ), true );
		apex_audit( 'settings', 0, 'Forms' );
		echo '<div class="notice notice-success"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
	}
	$o = (array) get_option( 'apex_forms' );
	echo '<div class="wrap"><h1>' . esc_html__( 'Forms', 'apex' ) . '</h1>';
	// behind Cloudflare without APEX_IP_HEADER every visitor shares Cloudflare's address and one limit
	if ( ! empty( $_SERVER['HTTP_CF_CONNECTING_IP'] ) && ! defined( 'APEX_IP_HEADER' ) ) echo '<div class="notice notice-warning"><p>' . esc_html__( 'This site is behind Cloudflare and APEX_IP_HEADER is not set in wp-config.php, so the limit of 6 enquiries an hour applies to all visitors together. Add define( \'APEX_IP_HEADER\', \'HTTP_CF_CONNECTING_IP\' ); as the handover notes say.', 'apex' ) . '</p></div>';
	if ( apex_forms_opt( 'turnstile_secret' ) === '' ) echo '<div class="notice notice-info"><p>' . esc_html__( 'Turnstile is off. Add both keys below to turn on the spam check.', 'apex' ) . '</p></div>';
	echo '<form method="post"><table class="form-table">';
	wp_nonce_field( 'apex_forms', 'apex_forms_nonce' );
	$row = fn( $k, $l, $h, $type = 'text' ) => '<tr><th><label for="f-' . $k . '">' . esc_html( $l ) . '</label></th><td><input id="f-' . $k . '" type="' . $type . '" class="regular-text" name="f[' . $k . ']" value="' . esc_attr( (string) ( $o[ $k ] ?? ( $k === 'keep_days' ? 365 : '' ) ) ) . '"><p class="description">' . esc_html( $h ) . '</p></td></tr>';
	echo $row( 'recipients', __( 'Send enquiries to', 'apex' ), __( 'Email addresses, separated by commas. Leave empty for the site admin address.', 'apex' ) );
	echo $row( 'keep_days', __( 'Keep enquiries for (days)', 'apex' ), __( 'Older enquiries and their photos are deleted automatically. 0 keeps them until someone deletes them.', 'apex' ), 'number' );
	echo $row( 'turnstile_site', __( 'Cloudflare Turnstile site key', 'apex' ), __( 'Optional spam check. Without it the form still uses a hidden trap field and a limit per connection.', 'apex' ) );
	$saved = (string) ( $o['turnstile_secret'] ?? '' );
	echo '<tr><th><label for="f-turnstile_secret">' . esc_html__( 'Cloudflare Turnstile secret key', 'apex' ) . '</label></th><td><input id="f-turnstile_secret" type="password" autocomplete="off" class="regular-text" name="f[turnstile_secret]" value=""> ' . ( $saved !== '' ? '<span style="color:#2271b1">' . esc_html__( 'Saved', 'apex' ) . ' (…' . esc_html( substr( $saved, -4 ) ) . ')</span> <label><input type="checkbox" name="f[turnstile_clear]" value="1"> ' . esc_html__( 'Remove', 'apex' ) . '</label>' : '<span style="color:#b32d2e">' . esc_html__( 'Not set', 'apex' ) . '</span>' ) . '<p class="description">' . esc_html__( 'Leave empty to keep the saved key.', 'apex' ) . '</p></td></tr>';
	echo '</table>';
	submit_button();
	echo '</form></div>';
}
function apex_games_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) return;
	if ( isset( $_POST['apex_games_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_games_nonce'] ), 'apex_games' ) ) {
		$in = wp_unslash( $_POST['g'] ?? [] );
		$o = [ 'days' => max( 1, (int) ( $in['days'] ?? 60 ) ), 'perDay' => max( 1, (int) ( $in['perDay'] ?? 4 ) ), 'games' => [], 'prizes' => [] ];
		foreach ( apex_game_config()['games'] as $g => $t ) foreach ( $t as $i => $x ) $o['games'][ $g ][ $i ] = max( 1, (int) ( $in['games'][ $g ][ $i ] ?? $x ) );
		for ( $i = 0; $i < 3; $i++ ) foreach ( APEX_LANGS as $l ) $o['prizes'][ $i ][ $l ] = sanitize_text_field( $in['prizes'][ $i ][ $l ] ?? '' );
		update_option( 'apex_games', $o, true );
		apex_audit( 'settings', 0, 'Games and prizes' );
		echo '<div class="notice notice-success"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
	}
	$c = apex_game_config();
	$names = [ 'steady' => 'Steady Hand', 'proportion' => 'Proportion', 'factrush' => 'Fact Rush', 'recoverysort' => 'Recovery Sort', 'memorymatch' => 'Memory Match' ];
	echo '<div class="wrap"><h1>' . esc_html__( 'Games and prizes', 'apex' ) . '</h1><p>' . esc_html__( 'The three prizes, and the score each game needs for each prize.', 'apex' ) . '</p><form method="post">';
	wp_nonce_field( 'apex_games', 'apex_games_nonce' );
	echo '<h2>' . esc_html__( 'Prizes', 'apex' ) . '</h2><table class="widefat" style="max-width:820px"><thead><tr><th></th><th>English</th><th>ไทย</th></tr></thead><tbody>';
	foreach ( $c['prizes'] as $i => $p ) echo '<tr><th>' . sprintf( esc_html__( 'Prize %d', 'apex' ), $i + 1 ) . '</th>' . implode( '', array_map( fn( $l ) => '<td><input class="widefat" name="g[prizes][' . $i . '][' . $l . ']" value="' . esc_attr( $p[ $l ] ) . '"></td>', APEX_LANGS ) ) . '</tr>';
	echo '</tbody></table><h2>' . esc_html__( 'Scores', 'apex' ) . '</h2><table class="widefat" style="max-width:820px"><thead><tr><th></th><th>' . esc_html__( 'Prize 1', 'apex' ) . '</th><th>' . esc_html__( 'Prize 2', 'apex' ) . '</th><th>' . esc_html__( 'Prize 3', 'apex' ) . '</th></tr></thead><tbody>';
	foreach ( $c['games'] as $g => $t ) echo '<tr><th>' . esc_html( $names[ $g ] ?? $g ) . '</th>' . implode( '', array_map( fn( $x, $i ) => '<td><input type="number" min="1" class="small-text" name="g[games][' . $g . '][' . $i . ']" value="' . (int) $x . '"></td>', $t, array_keys( $t ) ) ) . '</tr>';
	echo '</tbody></table><table class="form-table"><tr><th>' . esc_html__( 'Voucher valid for (days)', 'apex' ) . '</th><td><input type="number" min="1" name="g[days]" value="' . (int) $c['days'] . '"></td></tr><tr><th>' . esc_html__( 'Vouchers per connection per day', 'apex' ) . '</th><td><input type="number" min="1" name="g[perDay]" value="' . (int) $c['perDay'] . '"></td></tr></table>';
	submit_button();
	echo '</form></div>';
}
