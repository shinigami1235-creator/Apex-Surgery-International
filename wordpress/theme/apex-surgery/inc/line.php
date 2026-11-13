<?php
/**
 * LINE reminders for game vouchers. Off until Apex turns them on under Apex settings › Games and prizes.
 *
 * What Apex needs from the LINE Developers console (Messaging API channel of the Apex Surgery LINE account):
 *   the Channel secret and a long-lived Channel access token, pasted into the settings, and this site's
 *   webhook URL (shown on the settings page) set as the channel's Webhook URL with "Use webhook" on.
 *
 * How a player turns reminders on: they tick "Remind me on LINE" when they claim a voucher, then tap the
 * button that opens LINE with "REMIND APX-XXXXXX" typed to Apex's account and send it. The webhook below
 * matches the code, keeps the player's LINE user ID on that voucher and replies. "STOP" turns reminders off.
 * A daily run at 10:00 Bangkok time sends what each player chose, until the voucher is used or ends.
 * The LINE user ID is deleted with the voucher, when the player sends STOP, or when they block the account.
 */
defined( 'ABSPATH' ) || exit;

const APEX_LINE_MODES = [ 'reset', 'weekly', 'expiry' ];

function apex_line_opt( string $k, $def = '' ) {
	$o = get_option( 'apex_line' );
	return is_array( $o ) && isset( $o[ $k ] ) && $o[ $k ] !== '' ? $o[ $k ] : $def;
}
/** On, and both codes saved. */
function apex_line_ready(): bool {
	return (bool) apex_line_opt( 'on' ) && apex_line_opt( 'secret' ) !== '' && apex_line_opt( 'token' ) !== '';
}
/** The LINE account players message, from Site settings › LINE. */
function apex_line_oa(): string {
	$S = apex_data( 'shared' ) ?: [];
	$x = trim( (string) ( $S['line']['x'] ?? '' ) ) ?: '@apexsurgery';
	return $x[0] === '@' ? $x : '@' . $x;
}

/* ---------- sending ---------- */
function apex_line_call( string $path, array $body ): bool {
	$r = wp_remote_post( 'https://api.line.me/v2/bot/message/' . $path, [
		'timeout' => 15,
		'headers' => [ 'Authorization' => 'Bearer ' . apex_line_opt( 'token' ), 'Content-Type' => 'application/json' ],
		'body' => wp_json_encode( $body, JSON_UNESCAPED_UNICODE ),
	] );
	$code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
	if ( $code !== 200 ) update_option( 'apex_line_error', [ 'at' => time(), 'code' => $code, 'what' => $path ], false );
	return $code === 200;
}
function apex_line_text( string $text ): array { return [ [ 'type' => 'text', 'text' => mb_substr( $text, 0, 4900 ) ] ]; }

/** The wording of each message, in the voucher's language. */
function apex_line_msg( string $kind, array $v ): string {
	$th = ( $v['lang'] ?? 'en' ) === 'th';
	$date = wp_date( $th ? 'j/n/Y' : 'j M Y', (int) ( $v['expires'] ?? time() ), new DateTimeZone( 'Asia/Bangkok' ) );
	$play = apex_link( 'play.html', $th ? 'th' : 'en' );
	$code = $v['code'] ?? ''; $prize = $v['prize'] ?? '';
	$stop = $th ? 'พิมพ์ STOP เพื่อหยุดการแจ้งเตือน' : 'Send STOP to turn these reminders off.';
	switch ( $kind ) {
		case 'linked': return $th ? "เปิดการแจ้งเตือนสำหรับบัตรกำนัล $code แล้ว\n$stop" : "Reminders are on for voucher $code.\n$stop";
		case 'stopped': return $th ? 'หยุดการแจ้งเตือนแล้ว' : 'Reminders are off.';
		case 'unknown': return $th ? 'ไม่พบรหัสบัตรกำนัลนี้ หรือรหัสนี้ไม่ได้ขอการแจ้งเตือนไว้' : 'We could not find that voucher code, or it did not ask for reminders.';
		case 'reset': return $th ? "Apex: สิทธิ์เล่นเกมวันนี้รีเซ็ตแล้ว $play\nบัตรกำนัล $code ($prize) ใช้ได้ถึง $date\n$stop" : "Apex: your game tries have reset for today. $play\nVoucher $code ($prize) is valid until $date.\n$stop";
		case 'weekly': return $th ? "Apex: บัตรกำนัล $code ($prize) ใช้ได้ถึง $date แสดงรหัสที่เคาน์เตอร์ได้เลย\n$stop" : "Apex: voucher $code ($prize) is valid until $date. Show the code at reception.\n$stop";
		default: return $th ? "Apex: บัตรกำนัล $code ($prize) จะหมดอายุวันที่ $date แสดงรหัสที่เคาน์เตอร์ก่อนวันนั้น\n$stop" : "Apex: voucher $code ($prize) ends on $date. Show the code at reception before then.\n$stop";
	}
}

/* ---------- webhook ---------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'apex/v1', '/line', [ 'methods' => 'POST', 'callback' => 'apex_line_webhook', 'permission_callback' => '__return_true' ] );
} );
function apex_line_webhook( WP_REST_Request $req ) {
	$secret = (string) apex_line_opt( 'secret' );
	$body = $req->get_body();
	$sig = (string) $req->get_header( 'x_line_signature' );
	if ( $secret === '' || $sig === '' || ! hash_equals( base64_encode( hash_hmac( 'sha256', $body, $secret, true ) ), $sig ) ) {
		return new WP_Error( 'apex_sig', 'Bad signature', [ 'status' => 401 ] );
	}
	$data = json_decode( $body, true );
	foreach ( (array) ( $data['events'] ?? [] ) as $e ) {
		$uid = (string) ( $e['source']['userId'] ?? '' );
		if ( $uid === '' ) continue;
		if ( ( $e['type'] ?? '' ) === 'unfollow' ) { apex_line_forget( $uid ); continue; }
		if ( ( $e['type'] ?? '' ) !== 'message' || ( $e['message']['type'] ?? '' ) !== 'text' ) continue;
		$text = strtoupper( trim( (string) ( $e['message']['text'] ?? '' ) ) );
		$reply = fn( $kind, $v = [] ) => ! empty( $e['replyToken'] ) && apex_line_call( 'reply', [ 'replyToken' => $e['replyToken'], 'messages' => apex_line_text( apex_line_msg( $kind, $v ) ) ] );
		if ( preg_match( '/^(STOP|หยุด)\b/u', $text ) ) {
			$v = apex_line_forget( $uid );
			if ( $v ) $reply( 'stopped', $v );
			continue;
		}
		if ( ! preg_match( '/\bAPX-[A-Z2-9]{6}\b/', $text, $m ) ) continue;   // other chat is for the staff, not this
		$id = apex_voucher_find( $m[0] );
		$v = $id ? (array) get_post_meta( $id, 'apex_voucher', true ) : [];
		if ( ! $id || ! in_array( $v['remind'] ?? '', APEX_LINE_MODES, true ) || ! apex_line_ready() ) { $reply( 'unknown', [ 'lang' => preg_match( '/\p{Thai}/u', $text ) ? 'th' : 'en' ] ); continue; }
		update_post_meta( $id, 'apex_line_uid', $uid );
		update_post_meta( $id, 'apex_line_last', time() );
		$reply( 'linked', $v );
	}
	return [ 'ok' => true ];
}
/** Remove a LINE user from every voucher. Returns one of their vouchers, for the reply's language. */
function apex_line_forget( string $uid ): array {
	$ids = get_posts( [ 'post_type' => 'apex_voucher', 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => 'apex_line_uid', 'meta_value' => $uid, 'suppress_filters' => true ] );
	$v = $ids ? (array) get_post_meta( $ids[0], 'apex_voucher', true ) : [];
	foreach ( $ids as $id ) { delete_post_meta( $id, 'apex_line_uid' ); delete_post_meta( $id, 'apex_line_last' ); }
	return $v;
}

/* ---------- the daily run ---------- */
add_action( 'init', function () {
	if ( wp_next_scheduled( 'apex_line_daily' ) ) return;
	$next = new DateTime( 'today 10:00', new DateTimeZone( 'Asia/Bangkok' ) );
	if ( $next->getTimestamp() <= time() ) $next->modify( '+1 day' );
	wp_schedule_event( $next->getTimestamp(), 'daily', 'apex_line_daily' );
} );
add_action( 'apex_line_daily', 'apex_line_send_due' );
function apex_line_send_due(): int {
	if ( ! apex_line_ready() ) return 0;
	$now = time(); $sent = 0;
	$ids = get_posts( [ 'post_type' => 'apex_voucher', 'post_status' => 'any', 'posts_per_page' => 500, 'fields' => 'ids', 'meta_key' => 'apex_line_uid', 'suppress_filters' => true ] );
	foreach ( $ids as $id ) {
		$v = (array) get_post_meta( $id, 'apex_voucher', true );
		$uid = (string) get_post_meta( $id, 'apex_line_uid', true );
		$exp = (int) ( $v['expires'] ?? 0 );
		// used or ended: stop and drop the LINE ID
		if ( get_post_meta( $id, 'apex_used', true ) || $exp <= $now ) { delete_post_meta( $id, 'apex_line_uid' ); delete_post_meta( $id, 'apex_line_last' ); continue; }
		$last = (int) get_post_meta( $id, 'apex_line_last', true );
		$kind = '';
		if ( $exp - $now <= 3 * DAY_IN_SECONDS && ! get_post_meta( $id, 'apex_line_end', true ) ) $kind = 'expiry';
		elseif ( ( $v['remind'] ?? '' ) === 'reset' && $now - $last >= 20 * HOUR_IN_SECONDS ) $kind = 'reset';
		elseif ( ( $v['remind'] ?? '' ) === 'weekly' && $now - $last >= 7 * DAY_IN_SECONDS - HOUR_IN_SECONDS ) $kind = 'weekly';
		if ( ! $kind || ! apex_line_call( 'push', [ 'to' => $uid, 'messages' => apex_line_text( apex_line_msg( $kind, $v ) ) ] ) ) continue;
		update_post_meta( $id, 'apex_line_last', $now );
		if ( $kind === 'expiry' ) update_post_meta( $id, 'apex_line_end', 1 );
		$sent++;
	}
	update_option( 'apex_line_run', [ 'at' => $now, 'sent' => $sent ], false );
	return $sent;
}

/* ---------- settings, shown under Games and prizes ---------- */
function apex_line_save( array $in ): void {
	update_option( 'apex_line', [
		'on' => ! empty( $in['on'] ) ? 1 : 0,
		// an empty box keeps the saved code; the tick box clears it
		'secret' => ! empty( $in['secret_clear'] ) ? '' : ( sanitize_text_field( $in['secret'] ?? '' ) ?: (string) apex_line_opt( 'secret' ) ),
		'token' => ! empty( $in['token_clear'] ) ? '' : ( sanitize_text_field( $in['token'] ?? '' ) ?: (string) apex_line_opt( 'token' ) ),
	], false );
}
function apex_line_settings_html(): string {
	$sec = function ( $k, $label, $help ) {
		$saved = (string) apex_line_opt( $k );
		return '<tr><th><label for="l-' . $k . '">' . esc_html( $label ) . '</label></th><td><input id="l-' . $k . '" type="password" autocomplete="off" class="regular-text" name="l[' . $k . ']" value=""> '
			. ( $saved !== '' ? '<span style="color:#2271b1">' . esc_html__( 'Saved', 'apex' ) . ' (…' . esc_html( substr( $saved, -4 ) ) . ')</span> <label><input type="checkbox" name="l[' . $k . '_clear]" value="1"> ' . esc_html__( 'Remove', 'apex' ) . '</label>' : '<span style="color:#b32d2e">' . esc_html__( 'Not set', 'apex' ) . '</span>' )
			. '<p class="description">' . esc_html( $help ) . '</p></td></tr>';
	};
	$run = (array) get_option( 'apex_line_run' ); $err = (array) get_option( 'apex_line_error' );
	$status = apex_line_ready() ? __( 'On. Players see "Remind me on LINE" when they claim a voucher.', 'apex' )
		: ( apex_line_opt( 'on' ) ? __( 'Switched on, but a code is missing, so players do not see the option yet.', 'apex' ) : __( 'Off. Players do not see the option.', 'apex' ) );
	$h = '<h2>' . esc_html__( 'LINE reminders', 'apex' ) . '</h2><p>' . esc_html( $status ) . '</p>';
	if ( ! empty( $run['at'] ) ) $h .= '<p class="description">' . esc_html( sprintf( __( 'Last daily run: %1$s, %2$d sent.', 'apex' ), wp_date( 'j M Y H:i', (int) $run['at'] ), (int) ( $run['sent'] ?? 0 ) ) ) . '</p>';
	if ( ! empty( $err['at'] ) ) $h .= '<p class="description" style="color:#b32d2e">' . esc_html( sprintf( __( 'Last LINE error: %1$s, HTTP %2$d. A 401 means the access token is wrong or expired.', 'apex' ), wp_date( 'j M Y H:i', (int) $err['at'] ), (int) ( $err['code'] ?? 0 ) ) ) . '</p>';
	$h .= '<table class="form-table">'
		. '<tr><th>' . esc_html__( 'Offer reminders', 'apex' ) . '</th><td><label><input type="checkbox" name="l[on]" value="1"' . checked( (bool) apex_line_opt( 'on' ), true, false ) . '> ' . esc_html__( 'Show "Remind me on LINE" when a player claims a voucher', 'apex' ) . '</label></td></tr>'
		. $sec( 'secret', __( 'Channel secret', 'apex' ), __( 'LINE Developers › your Messaging API channel › Basic settings › Channel secret. Leave empty to keep the saved one.', 'apex' ) )
		. $sec( 'token', __( 'Channel access token', 'apex' ), __( 'LINE Developers › Messaging API › Channel access token (long-lived) › Issue. Leave empty to keep the saved one.', 'apex' ) )
		. '<tr><th>' . esc_html__( 'Webhook URL', 'apex' ) . '</th><td><input type="text" readonly class="large-text code" value="' . esc_attr( rest_url( 'apex/v1/line' ) ) . '" onclick="this.select()"><p class="description">' . esc_html( sprintf( __( 'Paste this under Messaging API › Webhook settings, then turn on "Use webhook" and press Verify. Players message %s, the account set under Site settings.', 'apex' ), apex_line_oa() ) ) . '</p></td></tr>'
		. '</table>';
	return $h;
}
