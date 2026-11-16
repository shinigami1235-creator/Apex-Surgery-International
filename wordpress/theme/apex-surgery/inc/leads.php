<?php
/**
 * Enquiries beyond the inbox: the consultation form set up without code, an export to a spreadsheet, and a
 * webhook that copies each new enquiry to Google Sheets or another system.
 *
 * Apex settings › Forms   fields to show or hide, extra questions, the form's wording, the webhook
 * Enquiries › Export      a CSV file of the enquiries between two dates (Excel and Google Sheets open it)
 */
defined( 'ABSPATH' ) || exit;

/* ---------- the form's set-up ---------- */
/** Wording on the form Apex can change: key => [English, Thai] as the form ships. */
const APEX_FORM_WORDING = [
	'title' => [ "Online consultation", "ปรึกษาแพทย์ออนไลน์" ],
	'intro' => [ "Send your questions and photos to the Apex surgeons before you travel.", "ส่งคำถามและรูปถ่ายถึงศัลยแพทย์ Apex ก่อนเดินทาง" ],
	'proc' => [ "Procedure", "หัตถการ" ],
	'procHint' => [ "Which procedures are you asking about?", "ต้องการปรึกษาหัตถการอะไร" ],
	'branch' => [ "Branch", "สาขา" ],
	'dates' => [ "Travel dates", "ช่วงเดินทาง" ],
	'datesHint' => [ "When will you be in Thailand? Leave blank if you are not sure yet.", "จะอยู่ในประเทศไทยช่วงไหน เว้นว่างได้ถ้ายังไม่แน่ใจ" ],
	'name' => [ "Name", "ชื่อ" ],
	'country' => [ "Country", "ประเทศ" ],
	'method' => [ "Contact method", "ช่องทางติดต่อกลับ" ],
	'methodHint' => [ "How should the clinic reply to you?", "ให้คลินิกตอบกลับทางไหน" ],
	'q' => [ "Questions", "คำถาม" ],
	'qHint' => [ "What would you like the surgeon to know or answer?", "อยากให้ศัลยแพทย์ทราบหรือตอบเรื่องอะไร" ],
	'qPh' => [ "Example: I had rhinoplasty 5 years ago. Can the tip be revised?", "ตัวอย่าง: เคยเสริมจมูกเมื่อ 5 ปีก่อน แก้ปลายจมูกได้ไหม" ],
	'photos' => [ "Photos", "รูปถ่าย" ],
	'photosHint' => [ "Take each photo in daylight with your hair pulled back.", "ถ่ายในที่แสงธรรมชาติและรวบผมให้เห็นใบหน้า" ],
	'photoNoteLive' => [ "Your photos go to the surgery team with your enquiry and only staff can open them.", "รูปถ่ายจะส่งถึงทีมศัลยแพทย์พร้อมคำถาม และมีแค่เจ้าหน้าที่ที่เปิดดูได้" ],
	'consent' => [ "I agree to Apex Surgery Hospital using these details, including my health questions and photos, to answer my enquiry.", "ข้าพเจ้ายินยอมให้โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์ใช้ข้อมูลนี้ รวมถึงคำถามเรื่องสุขภาพและรูปถ่าย เพื่อตอบคำถามของข้าพเจ้า" ],
	'submit' => [ "Send enquiry", "ส่งคำถาม" ],
	'sentH' => [ "Enquiry sent", "ส่งคำถามแล้ว" ],
	'sentP' => [ "Reference {ref}. The surgery team will contact you by {m}.", "เลขอ้างอิง {ref} ทีมศัลยแพทย์จะติดต่อกลับทาง {m}" ],
	'sentMore' => [ "Want an answer sooner? Message us now.", "อยากได้คำตอบเร็วขึ้น ทักหาเราได้เลย" ],
];
const APEX_FORM_HIDEABLE = [ 'dates' => 'Travel dates', 'country' => 'Country', 'questions' => 'Questions', 'photos' => 'Photos' ];
const APEX_FORM_TYPES = [ 'text' => 'Short answer', 'long' => 'Long answer', 'choice' => 'Pick one' ];

function apex_form_opt(): array {
	$o = get_option( 'apex_form' );
	return is_array( $o ) ? $o + [ 'hide' => [], 'optional' => [], 'extra' => [], 'text' => [] ] : [ 'hide' => [], 'optional' => [], 'extra' => [], 'text' => [] ];
}
/** The set-up the form script reads (consult/index.js opts.form), in one language. */
function apex_form_cfg( ?string $lang = null ): array {
	$lang = $lang ?: apex_lang();
	$o = apex_form_opt();
	$extra = [];
	foreach ( $o['extra'] as $i => $x ) {
		$q = (string) ( $x['q'][ $lang ] ?? '' ) ?: (string) ( $x['q']['en'] ?? '' );
		if ( $q === '' ) continue;
		$ch = $x['choices'][ $lang ] ?? [] ?: ( $x['choices']['en'] ?? [] );
		$extra[] = [ 'k' => 'x' . $i, 'q' => $q, 'type' => $x['type'] ?? 'text', 'choices' => array_values( $ch ), 'req' => ! empty( $x['req'] ) ];
	}
	return [ 'text' => (object) array_filter( (array) ( $o['text'][ $lang ] ?? [] ), 'strlen' ), 'hide' => array_values( $o['hide'] ), 'optional' => array_values( $o['optional'] ), 'extra' => $extra ];
}
/** Branch keys the form may send: every branch under Branches. */
function apex_branch_keys(): array {
	$out = [];
	foreach ( APEX_LANGS as $l ) foreach ( ( apex_data( 'shared', $l ) ?: [] )['branches'] ?? [] as $b ) if ( ! empty( $b['key'] ) ) $out[ $b['key'] ] = true;
	return array_keys( $out ) ?: [ 'ploenchit', 'phuket' ];
}
/** An enquiry's answers to the extra questions, kept only when they answer a question the form asks. */
function apex_form_extra_in( $in, string $lang ): array {
	$asked = array_column( apex_form_cfg( $lang )['extra'], 'q' );
	$out = [];
	foreach ( is_array( $in ) ? $in : [] as $x ) {
		if ( ! is_array( $x ) || count( $out ) >= 10 ) continue;
		$q = sanitize_text_field( apex_str( $x['q'] ?? '' ) );
		$a = mb_substr( sanitize_textarea_field( apex_str( $x['a'] ?? '' ) ), 0, 1000 );
		if ( $q !== '' && $a !== '' && in_array( $q, $asked, true ) ) $out[] = [ 'q' => $q, 'a' => $a ];
	}
	return $out;
}

/* ---------- one enquiry as a row: the export and the webhook send the same fields ---------- */
function apex_lead_row( int $id ): array {
	$v = (array) get_post_meta( $id, 'apex_fields', true );
	return [
		'reference' => 'A' . $id,
		'received' => get_post_time( 'Y-m-d H:i', false, $id ),
		'status' => (string) ( get_post_meta( $id, 'apex_status', true ) ?: 'new' ),
		'name' => (string) ( $v['name'] ?? '' ),
		'country' => (string) ( $v['country'] ?? '' ),
		'reply_by' => (string) ( $v['method'] ?? '' ),
		'contact' => (string) ( $v['contact'] ?? '' ),
		'procedures' => implode( ', ', (array) ( $v['procedures'] ?? [] ) ),
		'branch' => (string) ( $v['branch'] ?? '' ),
		'arrival' => (string) ( $v['from'] ?? '' ),
		'departure' => (string) ( $v['to'] ?? '' ),
		'questions' => (string) ( $v['questions'] ?? '' ),
		'more_answers' => implode( "\n", array_map( fn( $x ) => ( $x['q'] ?? '' ) . ': ' . ( $x['a'] ?? '' ), (array) ( $v['extra'] ?? [] ) ) ),
		'photos' => count( (array) get_post_meta( $id, 'apex_photos', true ) ),
		'page_language' => (string) ( $v['lang'] ?? '' ),
		'link' => admin_url( 'post.php?post=' . $id . '&action=edit' ),
	];
}

/* ---------- Enquiries › Export: a CSV file ---------- */
add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=apex_lead', __( 'Export enquiries', 'apex' ), __( 'Export', 'apex' ), 'edit_apex_leads', 'apex-leads-export', function () {
		if ( ! current_user_can( 'edit_apex_leads' ) ) return;
		echo '<div class="wrap"><h1>' . esc_html__( 'Export enquiries', 'apex' ) . '</h1><p>' . esc_html__( 'A CSV file of the enquiries received between two dates, for Excel or Google Sheets. It holds names and contact details: keep it on a work computer and delete it when you are done. Photos are not included. Each export is written in the access log.', 'apex' ) . '</p>';
		echo '<form method="get" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="apex_leads_csv">' . wp_nonce_field( 'apex_leads_csv', '_wpnonce', false, false );
		echo '<table class="form-table"><tr><th><label for="ex-from">' . esc_html__( 'From', 'apex' ) . '</label></th><td><input id="ex-from" type="date" name="from" value="' . esc_attr( wp_date( 'Y-m-01' ) ) . '"></td></tr><tr><th><label for="ex-to">' . esc_html__( 'To', 'apex' ) . '</label></th><td><input id="ex-to" type="date" name="to" value="' . esc_attr( wp_date( 'Y-m-d' ) ) . '"><p class="description">' . esc_html__( 'Empty both dates for every enquiry on file.', 'apex' ) . '</p></td></tr></table>';
		submit_button( __( 'Download CSV', 'apex' ) );
		echo '</form><p>' . sprintf( esc_html__( 'To copy each new enquiry to Google Sheets as it arrives, set up the webhook under %s.', 'apex' ), '<a href="' . esc_url( admin_url( 'admin.php?page=apex-forms#apex-webhook' ) ) . '">' . esc_html__( 'Apex settings › Forms', 'apex' ) . '</a>' ) . '</p></div>';
	} );
} );
add_filter( 'views_edit-apex_lead', function ( $v ) {
	if ( current_user_can( 'edit_apex_leads' ) ) $v['apex_export'] = '<a href="' . esc_url( admin_url( 'edit.php?post_type=apex_lead&page=apex-leads-export' ) ) . '">' . esc_html__( 'Export to CSV', 'apex' ) . '</a>';
	return $v;
} );
add_action( 'admin_post_apex_leads_csv', function () {
	if ( ! current_user_can( 'edit_apex_leads' ) || ! wp_verify_nonce( sanitize_key( $_GET['_wpnonce'] ?? '' ), 'apex_leads_csv' ) ) wp_die( 'Not allowed', 403 );
	$d = fn( $k ) => preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $_GET[ $k ] ?? '' ) ) ? (string) $_GET[ $k ] : '';
	$from = $d( 'from' ); $to = $d( 'to' );
	$q = [ 'post_type' => 'apex_lead', 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'orderby' => 'date', 'order' => 'ASC' ];
	if ( $from || $to ) $q['date_query'] = [ array_filter( [ 'after' => $from ?: null, 'before' => $to ?: null, 'inclusive' => true ] ) ];
	$ids = get_posts( $q );
	apex_audit( 'export', 0, sprintf( '%d enquiries to CSV (%s to %s)', count( $ids ), $from ?: 'start', $to ?: 'today' ) );
	nocache_headers();
	header( 'Content-Type: text/csv; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename="apex-enquiries-' . ( $from ?: 'all' ) . '-to-' . ( $to ?: wp_date( 'Y-m-d' ) ) . '.csv"' );
	$out = fopen( 'php://output', 'w' );
	fwrite( $out, "\xEF\xBB\xBF" );   // Excel reads Thai correctly with this mark at the start
	// a cell starting with = + - @ would run as a formula in Excel: it gets a leading apostrophe
	$safe = fn( $x ) => is_string( $x ) && $x !== '' && in_array( $x[0], [ '=', '+', '-', '@', "\t", "\r" ], true ) ? "'" . $x : $x;
	$head = false;
	foreach ( $ids as $id ) {
		$row = apex_lead_row( (int) $id ) + [ 'staff_notes' => (string) get_post_meta( $id, 'apex_notes', true ) ];
		if ( ! $head ) { fputcsv( $out, array_map( fn( $k ) => ucfirst( str_replace( '_', ' ', $k ) ), array_keys( $row ) ) ); $head = true; }
		fputcsv( $out, array_map( $safe, array_values( $row ) ) );
	}
	if ( ! $head ) fputcsv( $out, [ 'No enquiries in these dates' ] );
	fclose( $out );
	exit;
} );

/* ---------- webhook: each new enquiry copied to Google Sheets or another system ---------- */
function apex_webhook_payload( int $id ): array {
	return apex_lead_row( $id ) + [ 'token' => (string) apex_forms_opt( 'webhook_token' ) ];
}
/** Posts one enquiry. Returns [ ok, message ]. */
function apex_webhook_post( array $payload ): array {
	$url = (string) apex_forms_opt( 'webhook_url' );
	if ( ! $url ) return [ false, 'No webhook address' ];
	$body = wp_json_encode( $payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	$h = [ 'Content-Type' => 'application/json' ];
	if ( $payload['token'] ?? '' ) $h['X-Apex-Signature'] = 'sha256=' . hash_hmac( 'sha256', $body, (string) $payload['token'] );
	$r = wp_safe_remote_post( $url, [ 'timeout' => 15, 'redirection' => 5, 'headers' => $h, 'body' => $body ] );
	if ( is_wp_error( $r ) ) return [ false, $r->get_error_message() ];
	$code = (int) wp_remote_retrieve_response_code( $r );
	$text = trim( wp_strip_all_tags( (string) wp_remote_retrieve_body( $r ) ) );
	if ( $code >= 400 ) return [ false, 'HTTP ' . $code . ( $text !== '' ? ': ' . mb_substr( $text, 0, 120 ) : '' ) ];
	if ( stripos( $text, 'error' ) === 0 ) return [ false, mb_substr( $text, 0, 140 ) ];   // the Google Sheets script below answers "error: ..." on a wrong token
	return [ true, 'HTTP ' . $code ];
}
add_action( 'apex_consult_received', function ( $id ) {
	if ( ! apex_forms_opt( 'webhook_url' ) ) return;
	wp_schedule_single_event( time(), 'apex_webhook_send', [ (int) $id, 1 ] );   // in the background, so the visitor never waits on it
	if ( function_exists( 'spawn_cron' ) ) spawn_cron();
} );
add_action( 'apex_webhook_send', function ( $id, $try = 1 ) {
	if ( get_post_type( $id ) !== 'apex_lead' ) return;
	[ $ok, $msg ] = apex_webhook_post( apex_webhook_payload( (int) $id ) );
	update_post_meta( $id, 'apex_webhook', [ 'at' => time(), 'ok' => $ok, 'msg' => $msg, 'try' => (int) $try ] );
	if ( ! $ok && $try < 3 ) wp_schedule_single_event( time() + $try * HOUR_IN_SECONDS, 'apex_webhook_send', [ (int) $id, $try + 1 ] );
}, 10, 2 );

/** The Google Apps Script that receives the webhook into a sheet, shown on the settings screen. */
function apex_sheets_script(): string {
	return <<<'JS'
// Apex enquiries into this sheet. Extensions › Apps Script, paste this, set TOKEN to the token on the
// Apex settings › Forms screen, then Deploy › New deployment › Web app, "Execute as: Me", "Who has access: Anyone".
// Paste the web app address into "Webhook address" on that screen and press "Send a test".
const TOKEN = 'paste the token here';
const COLS = ['reference','received','status','name','country','reply_by','contact','procedures','branch','arrival','departure','questions','more_answers','photos','page_language','link'];
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.token !== TOKEN) return ContentService.createTextOutput('error: wrong token');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(COLS);
  sh.appendRow(COLS.map(k => d[k] == null ? '' : String(d[k]).replace(/^([=+\-@])/, "'$1")));
  return ContentService.createTextOutput('ok');
}
JS;
}

/* ---------- Apex settings › Forms: the parts below the email and spam settings ---------- */
function apex_form_settings_html(): string {
	$o = apex_form_opt();
	$e = 'esc_html'; $a = 'esc_attr';
	$labels = [ 'title' => 'Heading', 'intro' => 'Text under the heading', 'proc' => 'Procedure', 'procHint' => 'Procedure hint', 'branch' => 'Branch', 'dates' => 'Travel dates', 'datesHint' => 'Travel dates hint', 'name' => 'Name', 'country' => 'Country', 'method' => 'Contact method', 'methodHint' => 'Contact method hint', 'q' => 'Questions', 'qHint' => 'Questions hint', 'qPh' => 'Questions example', 'photos' => 'Photos', 'photosHint' => 'Photos hint', 'photoNoteLive' => 'Note under the photos', 'consent' => 'Consent sentence', 'submit' => 'Send button', 'sentH' => 'Heading after sending', 'sentP' => 'Text after sending ({ref} is the reference, {m} the contact method)', 'sentMore' => 'Line above the LINE and WhatsApp buttons' ];
	$h = '<h2 id="apex-form-fields">' . $e( __( 'Fields on the consultation form', 'apex' ) ) . '</h2>';
	$h .= '<p>' . $e( __( 'Procedures on the form are the services under Services, and branches are the ones under Branches: a service or branch added there shows on the form by itself. Name, contact method and consent are always asked.', 'apex' ) ) . '</p><table class="form-table"><tr><th>' . $e( __( 'Leave off the form', 'apex' ) ) . '</th><td>';
	foreach ( APEX_FORM_HIDEABLE as $k => $x ) $h .= '<label style="margin-right:18px"><input type="checkbox" name="form[hide][]" value="' . $a( $k ) . '"' . checked( in_array( $k, $o['hide'], true ), true, false ) . '> ' . $e( $x ) . '</label>';
	$h .= '</td></tr><tr><th>' . $e( __( 'May be left empty', 'apex' ) ) . '</th><td><label><input type="checkbox" name="form[optional][]" value="country"' . checked( in_array( 'country', $o['optional'], true ), true, false ) . '> ' . $e( __( 'Country', 'apex' ) ) . '</label></td></tr></table>';

	$h .= '<h2>' . $e( __( 'More questions', 'apex' ) ) . '</h2><p>' . $e( __( 'Questions added after "Questions" on the form, in both languages. Their answers show on the enquiry, in the CSV export and in the webhook. Empty the question boxes to remove one. Pick one: one choice per line.', 'apex' ) ) . '</p>';
	$h .= '<table class="widefat striped" style="max-width:1100px"><thead><tr><th>English</th><th>ไทย</th><th>' . $e( __( 'Answer', 'apex' ) ) . '</th><th>' . $e( __( 'Choices in English', 'apex' ) ) . '</th><th>' . $e( __( 'Choices in Thai', 'apex' ) ) . '</th><th>' . $e( __( 'Required', 'apex' ) ) . '</th></tr></thead><tbody>';
	$rows = $o['extra'];
	for ( $i = 0, $n = max( 3, count( $rows ) + 2 ); $i < min( $n, 10 ); $i++ ) {
		$x = $rows[ $i ] ?? [];
		$h .= '<tr>';
		foreach ( APEX_LANGS as $l ) $h .= '<td><input class="widefat" name="form[extra][' . $i . '][q][' . $l . ']" value="' . $a( $x['q'][ $l ] ?? '' ) . '"></td>';
		$h .= '<td><select name="form[extra][' . $i . '][type]">';
		foreach ( APEX_FORM_TYPES as $k => $t ) $h .= '<option value="' . $a( $k ) . '"' . selected( $x['type'] ?? 'text', $k, false ) . '>' . $e( $t ) . '</option>';
		$h .= '</select></td>';
		foreach ( APEX_LANGS as $l ) $h .= '<td><textarea class="widefat" rows="2" name="form[extra][' . $i . '][choices][' . $l . ']">' . esc_textarea( implode( "\n", $x['choices'][ $l ] ?? [] ) ) . '</textarea></td>';
		$h .= '<td><input type="checkbox" name="form[extra][' . $i . '][req]" value="1"' . checked( ! empty( $x['req'] ), true, false ) . '></td></tr>';
	}
	$h .= '</tbody></table>';

	$h .= '<h2>' . $e( __( 'Wording on the form', 'apex' ) ) . '</h2><p>' . $e( __( 'Leave a box empty to keep the wording shown in grey.', 'apex' ) ) . '</p><table class="widefat striped" style="max-width:1100px"><thead><tr><th style="width:220px"></th><th>English</th><th>ไทย</th></tr></thead><tbody>';
	foreach ( APEX_FORM_WORDING as $k => $def ) {
		$h .= '<tr><th>' . $e( $labels[ $k ] ?? $k ) . '</th>';
		foreach ( APEX_LANGS as $i => $l ) $h .= '<td><textarea class="widefat" rows="' . ( mb_strlen( $def[ $i ] ) > 60 ? 2 : 1 ) . '" name="form[text][' . $l . '][' . $a( $k ) . ']" placeholder="' . $a( $def[ $i ] ) . '">' . esc_textarea( (string) ( $o['text'][ $l ][ $k ] ?? '' ) ) . '</textarea></td>';
		$h .= '</tr>';
	}
	$h .= '</tbody></table>';

	$url = (string) apex_forms_opt( 'webhook_url' );
	$tok = (string) apex_forms_opt( 'webhook_token' );
	$h .= '<h2 id="apex-webhook">' . $e( __( 'Copy each enquiry to Google Sheets (webhook)', 'apex' ) ) . '</h2>';
	$h .= '<p>' . $e( __( 'Each new enquiry is also sent, a few seconds after it arrives, to the address below: a Google Sheets script (below) or another system such as a CRM, Zapier or Make. It carries the name, contact, procedures, dates, questions and answers. Photos never leave the website. Check this with the Data Protection Officer first, since it copies personal data to another service.', 'apex' ) ) . '</p>';
	$h .= '<table class="form-table"><tr><th><label for="f-webhook_url">' . $e( __( 'Webhook address', 'apex' ) ) . '</label></th><td><input id="f-webhook_url" type="url" class="large-text" name="f[webhook_url]" value="' . $a( $url ) . '" placeholder="https://script.google.com/macros/s/.../exec"><p class="description">' . $e( __( 'Must start with https://. Leave empty to turn the webhook off.', 'apex' ) ) . '</p></td></tr>';
	$h .= '<tr><th><label for="f-webhook_token">' . $e( __( 'Token', 'apex' ) ) . '</label></th><td><input id="f-webhook_token" class="regular-text" name="f[webhook_token]" value="' . $a( $tok ) . '" autocomplete="off" spellcheck="false"><p class="description">' . $e( __( 'Sent with each enquiry so the sheet accepts only this website. Also signs the request in the X-Apex-Signature header (HMAC SHA-256) for other systems. Made for you on the first save.', 'apex' ) ) . '</p></td></tr>';
	$h .= '<tr><th>' . $e( __( 'Google Sheets script', 'apex' ) ) . '</th><td><textarea class="large-text code" rows="14" readonly onclick="this.select()">' . esc_textarea( apex_sheets_script() ) . '</textarea></td></tr></table>';
	return $h;
}
