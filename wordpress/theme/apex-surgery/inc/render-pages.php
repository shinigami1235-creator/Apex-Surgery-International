<?php
/**
 * The page templates: a line-by-line PHP copy of assets/js/pages.js and the builders in core.js.
 * Each function is named after its JavaScript original and returns the same markup, so the scripts
 * can attach to it without drawing the page again. When one side changes, change the other the same way;
 * tests/wordpress/ssr.mjs compares the two on every page.
 */
defined( 'ABSPATH' ) || exit;

/* ---------- small helpers matching core.js ---------- */
function apex_jsuri( string $s ): string { // encodeURIComponent
	return strtr( rawurlencode( $s ), [ '%21' => '!', '%2A' => '*', '%27' => "'", '%28' => '(', '%29' => ')' ] );
}
function apex_json_attr( $v ): string { return apex_e( wp_json_encode( $v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ); }
function apex_len( string $s ): int { return mb_strlen( $s, 'UTF-8' ); }
/** A.gallery: numbers each image group in the order the page builds them, as the script does. */
function apex_gallery(): int { return $GLOBALS['apex_gal']++; }
function apex_gattr( int $g, int $i ): string { return 'data-gal="' . $g . '" data-i="' . $i . '"'; }
function apex_L(): string { return apex_lang(); }

function apex_crumbs( array $items ): string {
	$n = count( $items );
	$o = '';
	foreach ( $items as $i => $it ) $o .= $i < $n - 1 ? '<a href="' . esc_url( apex_link( $it[1] ) ) . '">' . apex_e( $it[0] ) . '</a>' . apex_ic( 'chevron-right' ) : '<span aria-current="page">' . apex_e( $it[0] ) . '</span>';
	return '<nav class="crumbs" aria-label="Breadcrumb">' . $o . '</nav>';
}
function apex_fmt_li( string $x ): string {
	if ( preg_match( '/^([^:]{2,80}?)\s?:\s(.+)$/su', $x, $m ) && ! preg_match( '/https?$/', $m[1] ) && ! preg_match( '/[\[*]/', $m[1] ) ) return '<strong>' . apex_e( $m[1] ) . ':</strong> ' . apex_inl( $m[2] );
	return apex_inl( $x );
}
function apex_faq_html( array $items ): string {
	$o = '';
	foreach ( $items as $q ) {
		$a = '';
		foreach ( (array) ( $q['a'] ?? [] ) as $x ) $a .= '<p>' . apex_inl( is_array( $x ) ? ( $x['x'] ?? '' ) : $x ) . '</p>';
		$o .= '<details><summary>' . apex_e( $q['q'] ?? '' ) . '<span class="pm">' . apex_ic( 'plus' ) . '</span></summary><div class="ans">' . $a . '</div></details>';
	}
	return '<div class="faq">' . $o . '</div>';
}
function apex_doctor_card( array $S, bool $full = false ): string {
	$D = $S['doctor'] ?? [];
	$li = fn( $xs ) => implode( '', array_map( fn( $x ) => '<li>' . apex_e( $x ) . '</li>', $xs ?? [] ) );
	return '<div class="doc-card rv">
      <div class="doc-ph ph-img"><img src="' . esc_url( apex_img( $D['photo'] ?? '' ) ) . '" alt="' . apex_e( $D['name'] ?? '' ) . '" loading="lazy" decoding="async" decoding="async"></div>
      <div class="doc-body"><p class="eyebrow">' . apex_e( apex_t( 'doctorH' ) ) . '</p>
        <h3 class="h-l" data-field="doctor.name">' . apex_e( $D['name'] ?? '' ) . '</h3>
        <p class="doc-meta"><span>' . apex_e( $D['license'] ?? '' ) . '</span><span>' . apex_e( $D['title'] ?? '' ) . '</span></p>
        <p class="muted" data-field="doctor.specialty">' . apex_e( $D['specialty'] ?? '' ) . '</p>
        <div class="doc-cols"><div><h4>' . apex_e( ( $D['eduH'] ?? '' ) ?: apex_t( 'eduH' ) ) . '</h4><ul class="ticks">' . $li( $D['edu'] ?? [] ) . '</ul></div>
        <div><h4>' . apex_e( ( $D['moreH'] ?? '' ) ?: apex_t( 'moreH' ) ) . '</h4><ul class="ticks">' . $li( $D['more'] ?? [] ) . '</ul></div></div>
        <div class="doc-acts">' . ( $full ? '' : '<a class="btn btn-plum btn-sm" href="' . esc_url( apex_link( 'doctor.html' ) ) . '">' . apex_e( apex_t( 'doctorCta' ) ) . ' ' . apex_ic( 'arrow-right' ) . '</a>' ) . '<a class="btn btn-ghost on-light btn-sm" href="' . esc_url( ( ( $S['line']['h'] ?? '' ) ?: '#' ) ) . '" target="_blank" rel="noopener">' . apex_ic( 'line' ) . apex_e( apex_t( 'book' ) ) . '</a></div></div></div>';
}
function apex_consult_band( array $S ): string {
	$WA = apex_wa();
	$b0 = ( $S['branches'] ?? [] )[0] ?? [];
	return '<div class="consult-band rv">
    <div class="cb-copy"><p class="eyebrow">' . apex_e( apex_t( 'consultShort' ) ) . '</p><h2 class="h-xl">' . apex_e( apex_t( 'consultH' ) ) . '</h2><p class="lead">' . apex_e( apex_t( 'consultP' ) ) . '</p></div>
    <div class="cb-acts"><a class="cb-big" href="' . esc_url( apex_link( 'consult.html' ) ) . '">' . apex_ic( 'message-circle' ) . '<span><b>' . apex_e( apex_t( 'consultBtn' ) ) . '</b><small>' . apex_e( apex_t( 'consultPageH' ) ) . '</small></span>' . apex_ic( 'arrow-right' ) . '</a>
      <a class="cb-row" href="' . esc_url( ( ( $S['line']['h'] ?? '' ) ?: '#' ) ) . '" target="_blank" rel="noopener">' . apex_ic( 'line' ) . '<span><b>' . apex_e( ( $S['cta']['line'] ?? '' ) ?: 'LINE' ) . '</b><small>' . apex_e( ( $S['cta']['lineSub'] ?? '' ) ?: apex_t( 'lineChat' ) ) . '</small></span></a>
      <a class="cb-row" href="' . esc_url( $WA['h'] ) . '" target="_blank" rel="noopener">' . apex_ic( 'whatsapp' ) . '<span><b>WhatsApp</b><small>' . apex_e( apex_t( 'whatsappSub' ) ) . ' · ' . apex_e( $WA['x'] ) . '</small></span></a>
      <a class="cb-row" href="' . esc_url( ( ( $b0['tel'] ?? '' ) ?: 'tel:0888700039' ) ) . '">' . apex_ic( 'phone' ) . '<span><b>' . apex_e( ( $S['cta']['call'] ?? '' ) ?: apex_t( 'callUs' ) ) . '</b><small>' . apex_e( ( $b0['phone'] ?? '' ) ?: '088-870-0039' ) . '</small></span></a></div></div>';
}
function apex_svc_cards( array $S, ?array $keys = null ): string {
	$o = '';
	$i = 0;
	foreach ( $S['services'] ?? [] as $s ) {
		if ( $keys && ! in_array( $s['key'], $keys, true ) ) continue;
		$o .= '<a class="svc-tile rv" data-d="' . ( $i * 60 ) . '" href="' . esc_url( apex_svc_url( $s['key'] ) ) . '">
      <span class="st-glow" aria-hidden="true"></span><span class="st-ic"><img src="' . esc_url( apex_img( $s['icon'] ) ) . '" alt="" loading="lazy" decoding="async" decoding="async"></span>
      <span class="st-name">' . apex_e( $s['short'] ?: $s['name'] ) . '</span><span class="st-en">' . apex_e( apex_L() === 'en' ? ( $s['name'] !== $s['short'] ? $s['name'] : '' ) : $s['en'] ) . '</span>
      <span class="st-go">' . apex_ic( 'arrow-up-right' ) . '</span></a>';
		$i++;
	}
	return '<div class="svc-grid">' . $o . '</div>';
}
function apex_fb_handle( array $f ): string { $p = array_values( array_filter( explode( '/', $f['h'] ) ) ); return (string) end( $p ); }
function apex_fb_link( $f, string $cls = '' ): string {
	if ( ! $f ) return '';
	return '<a class="fb-link ' . $cls . '" href="' . esc_url( $f['h'] ) . '" target="_blank" rel="noopener"><span class="fb-ic">' . apex_ic( 'facebook' ) . '</span><span class="fb-name"><b>' . apex_e( $f['x'] ) . '</b><small>facebook.com/' . apex_e( apex_fb_handle( $f ) ) . '</small></span>' . apex_ic( 'arrow-up-right' ) . '</a>';
}
function apex_fb_frame( array $f, int $h = 640, string $tabs = 'timeline', $also = null ): string {
	return '<div class="fbframe rv"><div class="fbhead"><span class="fb-ic">' . apex_ic( 'facebook' ) . '</span><span class="fb-name"><b>' . apex_e( $f['x'] ) . '</b><small>facebook.com/' . apex_e( apex_fb_handle( $f ) ) . '</small></span><a class="fb-open" href="' . esc_url( $f['h'] ) . '" target="_blank" rel="noopener" aria-label="' . apex_e( apex_t( 'fbOpen' ) ) . ': ' . apex_e( $f['x'] ) . '" title="' . apex_e( apex_t( 'fbOpen' ) ) . '">' . apex_ic( 'arrow-up-right' ) . '</a></div>
    <div class="fb-box" style="height:' . $h . 'px"><div class="fb-skel" aria-hidden="true"><i></i><i></i><i></i><i></i></div><iframe data-fb="' . apex_jsuri( $f['h'] ) . '" data-h="' . $h . '" data-tabs="' . $tabs . '" height="' . $h . '" title="' . apex_e( $f['x'] ) . ' · Facebook" allow="encrypted-media"></iframe>
      <div class="fb-fallback" hidden><span class="fb-big">' . apex_ic( 'facebook' ) . '</span><b class="h-s">' . apex_e( apex_t( 'fbH' ) ) . '</b>' . apex_fb_link( $f ) . apex_fb_link( $also ) . '</div></div></div>';
}
function apex_map_src( array $b ): string { return 'https://www.google.com/maps?q=' . apex_jsuri( $b['name'] . ', ' . ( $b['addr'] ?? '' ) ) . '&output=embed'; }
function apex_branches( array $S, ?string $h = null, ?string $p = null ): string {
	$B = $S['branches'] ?? [];
	$id = 'br' . ( ++$GLOBALS['apex_brn'] );
	$line = ( $S['line']['h'] ?? '' ) ?: 'https://lin.ee/D2Ir4vJ';
	$E = 'apex_e';
	$cards = '';
	foreach ( $B as $i => $b ) {
		$cards .= '<div class="br-card' . ( $i ? '' : ' on' ) . '" data-i="' . $i . '"' . ( $i ? ' hidden' : '' ) . '>
        <h3 class="h-m">' . $E( $b['name'] ) . '</h3>
        <div class="br-addr"><span class="br-pin">' . apex_ic( 'map-pin' ) . '</span><p>' . $E( $b['addr'] ?? '' ) . '</p>
          <button type="button" class="br-copy" data-copy="' . $E( $b['name'] . ', ' . ( $b['addr'] ?? '' ) ) . '" aria-label="' . $E( apex_t( 'copyAddr' ) ) . ': ' . $E( ( $b['short'] ?? '' ) ?: $b['name'] ) . '">' . apex_ic( 'copy' ) . apex_ic( 'check' ) . '<span>' . $E( apex_t( 'copyAddr' ) ) . '</span></button></div>
        <div class="br-acts">
          <a class="br-act call" href="' . esc_url( ( $b['tel'] ?? '' ) ) . '">' . apex_ic( 'phone' ) . '<span><b>' . $E( apex_t( 'callUs' ) ) . '</b><small>' . $E( $b['phone'] ?? '' ) . '</small></span></a>
          <a class="br-act ln" href="' . esc_url( $line ) . '" target="_blank" rel="noopener">' . apex_ic( 'line' ) . '<span><b>LINE</b><small>' . $E( ( $S['line']['x'] ?? '' ) ?: '@apexsurgery' ) . '</small></span></a>
          <a class="br-act map" href="' . esc_url( ( $b['map'] ?? '' ) ) . '" target="_blank" rel="noopener">' . apex_ic( 'navigation' ) . '<span><b>' . $E( apex_t( 'directions' ) ) . '</b><small>Google Maps</small></span></a>
        </div></div>';
	}
	$n = count( $B );
	$hh = $h ?: ( ( $S['branchesH'] ?? '' ) ?: apex_t( 'branchesH' ) );
	$pp = $p ?: ( $S['branchesP'] ?? '' );
	$tabs = '';
	if ( $n > 1 ) {
		foreach ( $B as $i => $b ) $tabs .= '<button type="button" role="tab" id="' . $id . '-t' . $i . '" aria-controls="' . $id . '-p" aria-selected="' . ( $i ? 'false' : 'true' ) . '" tabindex="' . ( $i ? -1 : 0 ) . '" data-i="' . $i . '">' . $E( ( $b['short'] ?? '' ) ?: $b['name'] ) . '</button>';
		$tabs = '<div class="br-tabs rv" role="tablist" aria-label="' . $E( apex_t( 'branchPick' ) ) . '">' . $tabs . '<span class="br-ink" aria-hidden="true"></span></div>';
	}
	$imgs = '';
	$maps = '';
	foreach ( $B as $i => $b ) {
		$imgs .= '<img src="' . esc_url( apex_img( $b['img'] ?? '' ) ) . '" alt="' . $E( $b['name'] ) . '" loading="lazy" decoding="async" data-i="' . $i . '" class="' . ( $i ? '' : 'on' ) . '">';
		$maps .= '<iframe data-src="' . esc_url( apex_map_src( $b ) ) . '" data-i="' . $i . '" title="' . $E( apex_t( 'mapTitle' ) ) . ': ' . $E( $b['name'] ) . '" loading="lazy" decoding="async" referrerpolicy="no-referrer-when-downgrade"' . ( $i ? ' hidden' : '' ) . '></iframe>';
	}
	return '<div class="br" id="' . $id . '" data-branches>
      <div class="shead br-head"><div><h2 class="h-xl rv">' . $E( $hh ) . '</h2>' . ( $pp ? '<p class="lead rv" style="margin-top:18px;max-width:58ch">' . $E( $pp ) . '</p>' : '' ) . '</div>
        ' . $tabs . '</div>
      <div class="br-stage rv" id="' . $id . '-p" role="tabpanel" aria-labelledby="' . $id . '-t0">
        <div class="br-photo ph-img">' . $imgs . '<span class="br-count" aria-hidden="true"><b>' . ( $n > 1 ? '1' : '' ) . '</b>' . ( $n > 1 ? ' / ' . $n : '' ) . '</span></div>
        <div class="br-info">' . $cards . '</div>
        <div class="br-map"><div class="br-map-ph" aria-hidden="true">' . apex_ic( 'map' ) . '</div>' . $maps . '</div>
      </div></div>';
}

/* ---------- pages.js: shared tables ---------- */
const APEX_RECOVERY = [
	'en' => [
		'facelift' => [ [ '2 to 3 weeks', 'Back to light activity' ], [ '4 to 6 weeks', 'No strenuous exercise' ], [ '7 to 10 years', 'How long results last' ] ],
		'browlift' => [ [ '7 to 14 days', 'Initial recovery' ], [ '4 to 6 weeks', 'No strenuous exercise' ], [ '3 to 6 months', 'Final shape' ] ],
		'rhinoplasty' => [ [ '1 to 2 weeks', 'Soft food' ], [ '7 to 14 days', 'Rest at home' ], [ '1 to 3 months', 'Shape settles' ], [ '3 to 6 months', 'Final result' ] ],
		'eyelid' => [ [ '7 to 14 days', 'Swelling eases' ], [ '1 month', 'No alcohol' ], [ '3 to 6 months', 'Final shape' ] ],
		'breast' => [ [ '3 to 7 days', 'Soreness' ], [ '5 to 7 days', 'Off work' ], [ '1 to 2 months', 'Back to exercise' ] ],
		'lipo' => [ [ '3 to 7 days', 'Driving again' ], [ '1 month', 'Compression garment 24 hours a day' ], [ '3 to 6 months', 'Results settle' ] ],
	],
	'th' => [
		'facelift' => [ [ '2 ถึง 3 สัปดาห์', 'กลับมาทำกิจกรรมเบา ๆ' ], [ '4 ถึง 6 สัปดาห์', 'งดออกกำลังกายหนัก' ], [ '7 ถึง 10 ปี', 'ผลลัพธ์อยู่ได้นาน' ] ],
		'browlift' => [ [ '7 ถึง 14 วัน', 'พักฟื้นช่วงแรก' ], [ '4 ถึง 6 สัปดาห์', 'งดออกกำลังกายหนัก' ], [ '3 ถึง 6 เดือน', 'รูปทรงเข้าที่' ] ],
		'rhinoplasty' => [ [ '1 ถึง 2 สัปดาห์', 'ทานอาหารอ่อน' ], [ '7 ถึง 14 วัน', 'พักฟื้นที่บ้าน' ], [ '1 ถึง 3 เดือน', 'จมูกเริ่มรัดแกน' ], [ '3 ถึง 6 เดือน', 'ผลลัพธ์ดีที่สุด' ] ],
		'eyelid' => [ [ '7 ถึง 14 วัน', 'อาการบวมลดลง' ], [ '1 เดือน', 'งดแอลกอฮอล์' ], [ '3 ถึง 6 เดือน', 'รูปทรงเข้าที่' ] ],
		'breast' => [ [ '3 ถึง 7 วัน', 'อาการระบม' ], [ '5 ถึง 7 วัน', 'หยุดงาน' ], [ '1 ถึง 2 เดือน', 'กลับมาออกกำลังกาย' ] ],
		'lipo' => [ [ '3 ถึง 7 วัน', 'ขับรถได้' ], [ '1 เดือน', 'ใส่ชุดกระชับตลอด 24 ชั่วโมง' ], [ '3 ถึง 6 เดือน', 'ผลลัพธ์เข้าที่' ] ],
	],
];
const APEX_SVC_CATS = [ 'facelift', 'browlift', 'rhinoplasty', 'eyelid', 'breast', 'lipo' ];
function apex_svc_name( array $S, ?string $k ): string {
	foreach ( $S['services'] ?? [] as $s ) if ( $s['key'] === $k ) return $s['short'] ?: $s['name'];
	return (string) $k;
}
const APEX_PH = [
	'consult1' => [ '1758691461935-202e2ef6b69f', 'A doctor talks with a patient in a clinic office', 'แพทย์พูดคุยกับผู้รับบริการในห้องตรวจ' ],
	'consult2' => [ '1631217868264-e5b90bb7e133', 'A doctor in a white coat talks with a patient', 'แพทย์ในเสื้อกาวน์พูดคุยกับผู้รับบริการ' ],
	'consult3' => [ '1758691463198-dc663b8a64e4', 'A doctor writes notes during a consultation', 'แพทย์จดบันทึกระหว่างการปรึกษา' ],
	'or1' => [ '1579684453423-f84349ef60b0', 'A surgical team at work in an operating room', 'ทีมศัลยแพทย์ในห้องผ่าตัด' ],
	'or2' => [ '1775947933085-30050ddad6b3', 'Surgeons in a modern operating room', 'ศัลยแพทย์ในห้องผ่าตัดที่ทันสมัย' ],
	'face1' => [ '1600481176431-47ad2ab2745d', 'A smiling woman in a black shirt', 'ผู้หญิงยิ้มในเสื้อสีดำ' ],
	'face2' => [ '1534528741775-53994a69daeb', 'Portrait of a woman', 'ภาพบุคคลผู้หญิง' ],
	'face3' => [ '1628501023521-48cece9a6909', 'Close portrait of a woman', 'ภาพใบหน้าผู้หญิงระยะใกล้' ],
	'face4' => [ '1687298703924-0d11be697d8b', 'A woman in a white top', 'ผู้หญิงในเสื้อสีขาว' ],
	'face5' => [ '1526413232644-8a40f03cc03b', 'A woman resting her arms on a white table', 'ผู้หญิงวางแขนบนโต๊ะสีขาว' ],
	'mature' => [ '1583767582213-8fd4531cef22', 'A smiling woman', 'ผู้หญิงยิ้ม' ],
	'eye' => [ '1516220362602-dba5272034e7', 'Close-up of an eye', 'ภาพดวงตาระยะใกล้' ],
	'eye2' => [ '1551392505-f4056032826e', 'Eye makeup in pink and gold', 'การแต่งตาโทนชมพูทอง' ],
	'profile' => [ '1532074205216-d0e1f4b87368', 'A woman in profile', 'ผู้หญิงหันด้านข้าง' ],
	'profile2' => [ '1541715301255-12a4839b424a', 'Side view of a woman\'s face', 'ใบหน้าผู้หญิงด้านข้าง' ],
	'tape' => [ '1523901839036-a3030662f220', 'A tape measure', 'สายวัด' ],
	'dress' => [ '1562904403-a5106bef8319', 'A woman in a floral top by the water', 'ผู้หญิงในเสื้อลายดอกริมน้ำ' ],
	'dress2' => [ '1621390842036-f01b53d9cbfd', 'A woman in a brown shirt', 'ผู้หญิงในเสื้อสีน้ำตาล' ],
];
function apex_ph( ?string $k, int $w = 1400 ): ?array {
	$p = $k ? ( APEX_PH[ $k ] ?? null ) : null;
	return $p ? [ 'src' => "https://images.unsplash.com/photo-{$p[0]}?auto=format&fit=crop&w=$w&q=80", 'alt' => apex_L() === 'th' ? $p[2] : $p[1], 'un' => true ] : null;
}
const APEX_SVC_PHOTOS = [ 'facelift' => [ 'mature', 'or2' ], 'browlift' => [ 'face4', 'consult3' ], 'rhinoplasty' => [ 'profile', 'or1' ], 'eyelid' => [ 'eye', 'consult2' ], 'breast' => [ 'dress', 'or2' ], 'lipo' => [ 'tape', 'consult3' ] ];
const APEX_POST_PHOTOS = [
	'smas' => [ 'mature', 'or1', 'face1' ], 'deep-plane-face-lift' => [ 'mature', 'or2' ], 'rhinoplasty-faq-questions' => [ 'profile', 'consult1' ],
	'double-eyelid-surgery-facts' => [ 'eye', 'face3' ], 'facelift-faq' => [ 'mature', 'consult2', 'face2' ], 'endotine-browlift-fact' => [ 'face4', 'consult3' ],
	'mentor-vs-motiva-breast-augmentation' => [ 'dress', 'consult1' ], 'forehead-lift-endotine' => [ 'face2', 'or1', 'consult3' ], 'liposuction-facts' => [ 'tape', 'dress2' ],
	'nose-surgery-without-silicone' => [ 'profile2', 'consult2' ], 'breast-augmentation-guide' => [ 'dress', 'consult3', 'or2' ], 'endotine-browlift' => [ 'face4', 'consult1' ],
];
function apex_proc_of( $s ): ?string {
	$s = (string) $s;
	if ( preg_match( '/lipo|ดูดไขมัน/iu', $s ) ) return 'lipo';
	if ( preg_match( '/breast|หน้าอก|motiva|mentor/iu', $s ) ) return 'breast';
	if ( preg_match( '/brow|forehead|endotine|คิ้ว|หน้าผาก/iu', $s ) ) return 'browlift';
	if ( preg_match( '/rhino|nose|จมูก/iu', $s ) ) return 'rhinoplasty';
	if ( preg_match( '/eyelid|double eye|ตาสองชั้น|ทำตา/iu', $s ) ) return 'eyelid';
	if ( preg_match( '/face ?lift|smas|deep plane|ดึงหน้า|ยกกระชับ/iu', $s ) ) return 'facelift';
	return null;
}
/* sentences or clauses of the client's own text, used verbatim for pull quotes */
function apex_clauses( $t ): array {
	$t = (string) $t;
	if ( apex_L() === 'th' ) return array_values( array_filter( preg_split( '/\s+/u', $t ), 'strlen' ) );
	return preg_split( '/(?<!\bDr\.)(?<!\bdr\.)(?<!\bNo\.)(?<!\bno\.)(?<!\bMr\.)(?<!\bMs\.)(?<!\bMrs\.)(?<!\bSt\.)(?<!\bvs\.)(?<!\bapprox\.)(?<!\be\.g\.)(?<!\bi\.e\.)(?<=[.!?])\s+(?=[A-Z“"0-9])/u', $t );
}
function apex_pick_quote( array $paras, bool $skip_first = true ): string {
	$pool = [];
	foreach ( $paras as $pi => $p ) foreach ( apex_clauses( $p ) as $ci => $c ) {
		$c = trim( $c );
		if ( $skip_first && $pi === 0 && $ci === 0 ) continue;
		if ( apex_L() === 'th' && preg_match( '/^(ก็|และ|ซึ่ง|เพราะ|โดย|ที่|หรือ|แต่|จึง|ทำให้|เพื่อ|ด้วย|รวมถึง|ไม่ว่า|อีกทั้ง|นอกจาก|จะ|ได้|เป็น|คือ|ให้)/u', $c ) ) continue;
		$n = apex_len( $c );
		if ( $n >= 45 && $n <= 190 ) $pool[] = $c;
	}
	if ( ! $pool ) return '';
	usort( $pool, fn( $a, $b ) => abs( apex_len( $a ) - 120 ) <=> abs( apex_len( $b ) - 120 ) );
	return $pool[0];
}
function apex_spoken( array $paras ): array {
	$out = [];
	foreach ( $paras as $p ) if ( preg_match_all( '/[“"]([^”"“]{30,200})[”"]/u', (string) $p, $m ) ) foreach ( $m[0] as $q ) $out[] = trim( mb_substr( $q, 1, -1 ) );
	usort( $out, fn( $a, $b ) => abs( apex_len( $a ) - 110 ) <=> abs( apex_len( $b ) - 110 ) );
	return $out;
}
function apex_pull_quote( string $q, string $cls = '' ): string { return $q !== '' ? '<figure class="pq rv ' . $cls . '"><span class="pq-mark" aria-hidden="true">' . apex_ic( 'quote' ) . '</span><blockquote><p>' . apex_e( $q ) . '</p></blockquote></figure>' : ''; }
function apex_read_mins( string $text ): int {
	$n = apex_L() === 'th' ? apex_len( $text ) / 800 : count( preg_split( '/\s+/u', $text ) ) / 230;
	return max( 1, (int) round( $n ) );
}
const APEX_ICON_RULES = [
	[ '/smok|nicotine|บุหรี่/iu', 'ban' ], [ '/expect|คาดหวัง/iu', 'target' ], [ '/weight|น้ำหนัก/iu', 'weight' ], [ '/exercis|ออกกำลัง/iu', 'dumbbell' ],
	[ '/aged|\b40\b|อายุ/iu', 'hourglass' ], [ '/localized fat|fat |ไขมันสะสม|ไขมันเฉพาะ/iu', 'ruler' ], [ '/health|underlying|สุขภาพ|โรคประจำตัว/iu', 'heart-pulse' ], [ '/elastic|skin|ผิว/iu', 'sparkles' ],
	[ '/revision|previous|เคยทำ|แก้ไข/iu', 'repeat' ], [ '/nostril|ปีกจมูก/iu', 'scan-face' ], [ '/tip|ปลายจมูก/iu', 'pen' ], [ '/dimension|bridge|สันจมูก|มิติ/iu', 'scan-face' ],
	[ '/structur|crooked|hump|โครงสร้าง/iu', 'layers' ], [ '/eyelid|eye|ตา/iu', 'eye' ], [ '/surgeon|team|doctor|ศัลยแพทย์|ทีมแพทย์|แพทย์/iu', 'stethoscope' ],
	[ '/anesth|วิสัญญี|ดมยา/iu', 'syringe' ], [ '/technolog|technique|implant|เทคนิค|เทคโนโลยี|ซิลิโคน/iu', 'cpu' ], [ '/standard|operating room|safety|มาตรฐาน|ห้องผ่าตัด|ปลอดภัย/iu', 'shield-check' ],
	[ '/warrant|ประกัน|รับประกัน/iu', 'award' ], [ '/design|shape|ออกแบบ|รูปทรง/iu', 'pen' ], [ '/care|ดูแล/iu', 'heart' ], [ '/natural|ธรรมชาติ/iu', 'smile' ],
	[ '/experience|ประสบการณ์/iu', 'award' ], [ '/instructor|teach|อาจารย์/iu', 'book-open' ], [ '/found|ก่อตั้ง/iu', 'building-2' ], [ '/consult|ที่ปรึกษา/iu', 'users' ],
	[ '/speaker|chair|วิทยากร/iu', 'message-circle' ], [ '/protocol|โปรโตคอล/iu', 'clipboard-check' ], [ '/specialist|เชี่ยวชาญ/iu', 'badge-check' ],
];
const APEX_FALLBACK_IC = [ 'sparkles', 'badge-check', 'gem', 'heart', 'shield-check', 'smile' ];
function apex_pick_icon( $t, int $i ): string {
	foreach ( APEX_ICON_RULES as [ $r, $ic ] ) if ( preg_match( $r, (string) $t ) ) return $ic;
	return APEX_FALLBACK_IC[ $i % count( APEX_FALLBACK_IC ) ];
}
function apex_split_label( $x ): array {
	$x = (string) $x;
	if ( preg_match( '/^([^:]{2,90}?)\s?:\s(.+)$/su', $x, $m ) && ! preg_match( '/https?$/', $m[1] ) ) return [ trim( $m[1] ), trim( $m[2] ) ];
	return [ null, $x ];
}
const APEX_AREA_Y = [ [ '/abdomen|ท้อง/iu', 47, 0 ], [ '/upper arm|แขน/iu', 36, 13 ], [ '/thigh|ต้นขา/iu', 66, 6 ], [ '/waist|back|เอว|หลัง/iu', 42, 9 ], [ '/chin|jaw|คาง/iu', 14, 0 ], [ '/hip|buttock|สะโพก|ก้น/iu', 56, 9 ], [ '/calf|calves|น่อง/iu', 84, 5 ] ];
function apex_area_fig( $t ): ?string {
	foreach ( APEX_AREA_Y as [ $r, $y, $dx ] ) {
		if ( ! preg_match( $r, (string) $t ) ) continue;
		$dots = $dx ? '<circle cx="' . ( 30 - $dx ) . '" cy="' . $y . '" r="5.5"/><circle cx="' . ( 30 + $dx ) . '" cy="' . $y . '" r="5.5"/>' : '<circle cx="30" cy="' . $y . '" r="6"/>';
		return '<svg class="area-fig" viewBox="0 0 60 100" aria-hidden="true"><path class="af-body" d="M30 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm-9 18h18c4 0 7 3 8 7l5 24c.4 2-1 3.6-3 3.6-1.4 0-2.6-1-3-2.4L42 38v20l3 38c.1 2-1.4 3.6-3.4 3.6-1.8 0-3.2-1.3-3.4-3l-4-34h-4l-4 34c-.2 1.7-1.6 3-3.4 3-2 0-3.5-1.6-3.4-3.6l3-38V38l-4 16.2c-.4 1.4-1.6 2.4-3 2.4-2 0-3.4-1.6-3-3.6l5-24c1-4 4-7 8-7Z"/><g class="af-dot">' . $dots . '</g></svg>';
	}
	return null;
}
function apex_figure( ?array $img, string $cls = '', bool $par = true ): string {
	if ( ! $img || empty( $img['src'] ) ) return '';
	$un = ! empty( $img['un'] );
	$g = apex_gallery();
	$alt = $img['alt'] ?? '';
	return '<figure class="xfig ' . $cls . ' ' . ( $un ? 'un' : 'own' ) . ' rv-clip"><span class="xfig-in ph-img"><button type="button" class="xfig-btn" ' . apex_gattr( $g, 0 ) . ' aria-label="' . apex_e( $alt ?: apex_t( 'image' ) ) . '"><img src="' . esc_url( apex_img( $img['src'] ) ) . '"' . apex_srcset( $img['src'], '(max-width: 900px) 100vw, 760px' ) . ' alt="' . apex_e( $alt ) . '" loading="lazy"' . ( $par ? ' data-par="28"' : '' ) . '></button></span>' . ( $un ? '<figcaption>' . apex_e( apex_t( 'photoCredit' ) ) . '</figcaption>' : '' ) . '</figure>';
}

/* a service section: rich cards for lists, numbered steps for h3/p sequences, with a side photo */
function apex_svc_section( array $sec, int $i, string $key, bool $alt ): string {
	$bl = $sec['blocks'] ?? [];
	$first = -1;
	foreach ( $bl as $j => $b ) if ( $b['t'] === 'list' || $b['t'] === 'h3' ) { $first = $j; break; }
	$lead = [];
	foreach ( array_slice( $bl, 0, $first < 0 ? count( $bl ) : $first ) as $b ) if ( $b['t'] === 'p' ) $lead[] = $b['x'];
	$has_h3 = (bool) array_filter( $bl, fn( $b ) => $b['t'] === 'h3' );
	$tail = [];
	if ( ! ( $first < 0 || $has_h3 ) ) {
		$k = count( $bl );
		while ( $k > 0 && $bl[ $k - 1 ]['t'] === 'p' ) $k--;
		if ( $k > $first ) foreach ( array_slice( $bl, $k ) as $b ) $tail[] = $b['x'];
	}
	$h3n = count( array_filter( $bl, fn( $b ) => $b['t'] === 'h3' ) );
	if ( $h3n >= 3 ) {
		$steps = [];
		foreach ( $bl as $j => $b ) {
			if ( $b['t'] === 'h3' ) $steps[] = [ 'h' => $b['x'], 'p' => [] ];
			elseif ( $b['t'] === 'p' && $steps && $j > $first ) $steps[ count( $steps ) - 1 ]['p'][] = $b['x'];
		}
		$body = '<ol class="steps">' . implode( '', array_map( fn( $s, $j ) => '<li class="step rv" data-d="' . ( ( $j % 3 ) * 70 ) . '"><span class="step-n" aria-hidden="true">' . sprintf( '%02d', $j + 1 ) . '</span><div class="step-b"><h3>' . apex_e( $s['h'] ) . '</h3>' . implode( '', array_map( fn( $p ) => '<p>' . apex_inl( $p ) . '</p>', $s['p'] ) ) . '</div></li>', $steps, array_keys( $steps ) ) ) . '</ol>';
	} else {
		$items = [];
		foreach ( $bl as $b ) if ( $b['t'] === 'list' ) foreach ( $b['items'] ?? [] as $x ) $items[] = is_array( $x ) ? ( $x['x'] ?? '' ) : $x;
		$n = count( $items );
		$fig = 0;
		foreach ( $items as $x ) if ( apex_area_fig( apex_split_label( $x )[0] ?? $x ) ) $fig++;
		$is_areas = $n >= 4 && $fig >= $n - 1;
		$lis = '';
		foreach ( $items as $j => $x ) {
			[ $lab, $txt ] = apex_split_label( $x );
			$art = $is_areas ? ( apex_area_fig( $lab ?? $x ) ?? '<span class="wc-ic">' . apex_ic( apex_pick_icon( $x, $j ) ) . '</span>' ) : '<span class="wc-ic">' . apex_ic( apex_pick_icon( $lab ?? $x, $j ) ) . '</span>';
			$lis .= '<li class="who-card rv" data-d="' . ( ( $j % 3 ) * 60 ) . '">' . $art . ( $lab ? '<h3>' . apex_e( $lab ) . '</h3><p>' . apex_inl( $txt ) . '</p>' : '<p class="' . ( apex_len( $txt ) < 90 ? 'wc-solo' : 'wc-long' ) . '">' . apex_inl( $txt ) . '</p>' ) . '</li>';
		}
		$body = '<ul class="who-grid' . ( $n % 3 === 1 && $n > 3 ? ' odd' : '' ) . ( $is_areas ? ' areas' : '' ) . '">' . $lis . '</ul>';
	}
	$pk = APEX_SVC_PHOTOS[ $key ][ $i ] ?? null;
	$pic = $pk ? apex_ph( $pk, 1000 ) : null;
	return '<section class="section svc-sec' . ( $alt ? ' washed' : '' ) . '" id="sec-' . $i . '">
      <div class="wrap">
        <div class="ss-head' . ( $pic ? ' has-pic' : '' ) . '"><div class="ss-copy"><h2 class="h-l rv">' . apex_e( $sec['h'] ?? '' ) . '</h2>' . implode( '', array_map( fn( $p ) => '<p class="lead rv">' . apex_inl( $p ) . '</p>', $lead ) ) . '</div>' . ( $pic ? apex_figure( $pic, 'ss-pic' ) : '' ) . '</div>
        ' . $body . '
        ' . ( $tail ? '<div class="ss-tail rv">' . implode( '', array_map( fn( $p ) => '<p>' . apex_inl( $p ) . '</p>', $tail ) ) . '</div>' : '' ) . '
      </div></section>';
}

/* ---------- small builders ---------- */
function apex_phead( string $h, ?string $lead, ?array $crumbs, string $extra = '' ): string {
	return '<section class="phead"><div class="phead-lines" aria-hidden="true"></div><div class="wrap">' . ( $crumbs ? apex_crumbs( $crumbs ) : '' ) . '<h1 class="display-s rv">' . apex_e( $h ) . '</h1>' . ( $lead ? '<p class="lead rv" data-d="80" style="max-width:62ch;margin-top:20px">' . apex_e( $lead ) . '</p>' : '' ) . $extra . '</div></section>';
}
function apex_home_crumb(): array { return [ apex_t( 'home' ), 'index.html' ]; }
function apex_chips( array $items, string $on ): string {
	$o = '';
	foreach ( $items as [ $k, $x ] ) $o .= '<button type="button" class="chip" data-k="' . apex_e( $k ) . '" aria-pressed="' . ( $k === $on ? 'true' : 'false' ) . '">' . apex_e( $x ) . '</button>';
	return '<div class="chips" role="group" aria-label="' . apex_e( apex_t( 'filter' ) ) . '">' . $o . '</div>';
}
function apex_review_rail( array $items, string $id ): string {
	$g = apex_gallery();
	$o = '';
	foreach ( $items as $i => $r ) $o .= '<button type="button" class="ba-card ph-img" ' . apex_gattr( $g, $i ) . ' data-cat="' . apex_e( $r['cat'] ?? '' ) . '" aria-label="' . apex_e( apex_t( 'baOpen' ) ) . ' ' . ( $i + 1 ) . '"><img src="' . esc_url( apex_img( $r['src'] ) ) . '" alt="' . apex_e( $r['alt'] ?? '' ) . '" loading="lazy" decoding="async" decoding="async"></button>';
	return '<div class="rail rv-rail" id="' . $id . '">' . $o . '</div>';
}
function apex_video_rail( ?array $videos ): string {
	$o = '';
	foreach ( $videos ?? [] as $i => $v ) $o .= '<button type="button" class="vid-card" data-vid="' . apex_e( $v ) . '" aria-label="' . apex_e( apex_t( 'playVideo' ) ) . ' ' . ( $i + 1 ) . '"><span class="pl">' . apex_ic( 'play' ) . '</span></button>';
	return '<div class="rail vid-rail">' . $o . '</div>';
}
function apex_stories_host( ?array $videos, string $id = 'stories', ?string $title = null ): string {
	return '<div class="stories-host" id="' . $id . '" data-videos=\'' . apex_json_attr( $videos ?? [] ) . '\' data-title="' . apex_e( $title ?? '' ) . '">' . apex_video_rail( $videos ) . '</div>';
}
function apex_ba_grid( array $imgs, ?string $cap ): string {
	$g = apex_gallery();
	$o = '';
	foreach ( $imgs as $i => $s ) $o .= '<button type="button" class="ba-tile ph-img rv" data-d="' . ( ( $i % 6 ) * 50 ) . '" ' . apex_gattr( $g, $i ) . '><img src="' . esc_url( apex_img( $s ) ) . '" alt="' . apex_e( $cap ?: 'Before / After' ) . ' ' . ( $i + 1 ) . '" loading="lazy" decoding="async" decoding="async"></button>';
	return '<div class="ba-grid">' . $o . '</div>';
}
function apex_cat_label( ?string $c ): string { return apex_t( [ 'review' => 'catReview', 'blog' => 'catBlog', 'news' => 'catNews' ][ $c ?? '' ] ?? 'articles' ); }
function apex_post_card( array $p, int $i = 0, bool $big = false ): string {
	$ex = ( $p['excerpt'] ?? '' ) ?: ( $p['desc'] ?? '' );
	return '<a class="post-card rv' . ( $big ? ' big' : '' ) . '" data-d="' . ( ( $i % 3 ) * 70 ) . '" href="' . esc_url( apex_post_url( $p['key'] ) ) . '" data-cat="' . apex_e( $p['cat'] ?? '' ) . '">
    <span class="pc-ph ph-img"><img src="' . esc_url( apex_img( $p['img'] ?? '' ) ) . '"' . apex_srcset( $p['img'] ?? '', '(max-width: 900px) 100vw, 560px' ) . ' alt="" loading="lazy" decoding="async" decoding="async"></span>
    <span class="pc-meta"><span class="pc-cat">' . apex_e( apex_cat_label( $p['cat'] ?? null ) ) . '</span>' . ( ! empty( $p['date'] ) ? '<time datetime="' . apex_e( $p['date'] ) . '">' . apex_e( apex_fmt_date( $p['date'] ) ) . '</time>' : '' ) . '</span>
    <span class="pc-title">' . apex_e( $p['title'] ?? '' ) . '</span>' . ( $ex !== '' ? '<span class="pc-ex">' . apex_e( $ex ) . '</span>' : '' ) . '</a>';
}

/* ---------- offers ---------- */
const APEX_OFFER_WORDS = [ [ '/Mentor/i', 'Mentor' ], [ '/Motiva/i', 'Motiva' ], [ '/MemoryGel/i', 'MemoryGel' ], [ '/Endotine/i', 'Endotine' ], [ '/LipoSlim/i', 'LipoSlim' ], [ '/J-?Plasma/i', 'J-Plasma' ], [ '/V-?Line/i', 'V-Line' ], [ '/Facial/i', 'Facial' ] ];
const APEX_OFFER_AREA = [ [ '/หน้าท้อง|abdominal/iu', 'Abdomen', 'หน้าท้อง' ], [ '/เหนียง|double chin/iu', 'Double chin', 'เหนียง' ] ];
function apex_offer_of( array $p, array $S, ?string $cat0 = null ): array {
	$parts = explode( '/', (string) ( $p['src'] ?? '' ) );
	$file = rawurldecode( (string) end( $parts ) );
	$text = ( $p['alt'] ?? '' ) . ' ' . $file;
	$cat = ( $p['cat'] ?? '' ) ?: ( apex_proc_of( $text ) ?: $cat0 );
	$words = [];
	foreach ( APEX_OFFER_WORDS as [ $r, $w ] ) if ( preg_match( $r, $text ) && ! in_array( $w, $words, true ) ) $words[] = $w;
	foreach ( APEX_OFFER_AREA as [ $r, $en, $th ] ) if ( preg_match( $r, $text ) ) { $words[] = apex_L() === 'th' ? $th : $en; break; }
	$name = $cat ? apex_svc_name( $S, $cat ) : ( $words ? array_shift( $words ) : apex_t( 'promotions' ) );
	$price = (float) ( $p['price'] ?? 0 );
	if ( ! $price && preg_match( '/(?:^|[-_ ])(\d{5,6})(?=[-_ .])/', $file, $m ) ) $price = (float) $m[1];
	$all_in = (bool) preg_match( '/จ่ายจบ|เหมา|all-in/iu', $text );
	$review = (bool) preg_match( '/case-review/i', $text );
	$label = $name . ( $words ? ' · ' . implode( ' · ', $words ) : '' );
	$price_txt = $price ? apex_fmt_num( $price ) . ' ' . apex_t( 'baht' ) : '';
	$msg = ( apex_L() === 'th' ? "สวัสดี ขอสอบถามโปรโมชั่น $label" : "Hello, I would like to ask about this offer: $label" ) . ( $price_txt ? " ($price_txt)" : '' ) . ( apex_L() === 'th' ? '' : '.' );
	$WA = apex_wa();
	return [ 'src' => $p['src'] ?? '', 'alt' => ( $p['alt'] ?? '' ) ?: $label, 'cat' => $cat, 'name' => $name, 'words' => $words, 'price' => $price, 'allIn' => $all_in, 'review' => $review, 'label' => $label,
		'line' => 'https://line.me/R/oaMessage/@apexsurgery/?' . apex_jsuri( $msg ), 'wa' => $WA['h'] . '?text=' . apex_jsuri( $msg ) ];
}
function apex_fx_span( $thb ): string { return '<span class="apx-price op-fx" data-thb="' . apex_num_attr( $thb ) . '" data-lang="' . apex_L() . '"><span class="apx-fx" hidden></span><small>' . apex_e( apex_t( 'approx' ) ) . '</small></span>'; }
function apex_num_attr( $n ): string { $n = (float) $n; return floor( $n ) == $n ? (string) (int) $n : (string) $n; }
function apex_offer_tags( array $o ): string { return ( $o['allIn'] ? '<span class="o-tag hot">' . apex_e( apex_t( 'allIn' ) ) . '</span>' : '' ) . ( $o['review'] ? '<span class="o-tag">' . apex_e( apex_t( 'reviewCase' ) ) . '</span>' : '' ); }
function apex_offer_card( array $o, int $i, int $g ): string {
	return '<article class="offer rv" data-d="' . ( ( $i % 4 ) * 60 ) . '" data-cat="' . apex_e( $o['cat'] ?? '' ) . '">
      <button type="button" class="offer-img ph-img" ' . apex_gattr( $g, $i ) . ' aria-label="' . apex_e( apex_t( 'image' ) ) . ': ' . apex_e( $o['label'] ) . '"><img src="' . esc_url( apex_img( $o['src'] ) ) . '" alt="' . apex_e( $o['alt'] ) . '" loading="lazy" decoding="async" decoding="async"><span class="o-zoom" aria-hidden="true">' . apex_ic( 'arrow-up-right' ) . '</span></button>
      <div class="offer-body">
        <div class="o-tags">' . ( $o['cat'] && $o['words'] ? '<span class="o-proc">' . apex_e( $o['name'] ) . '</span>' : '' ) . apex_offer_tags( $o ) . '</div>
        <h3 class="o-title">' . apex_e( $o['cat'] ? ( implode( ' · ', $o['words'] ) ?: $o['name'] ) : $o['label'] ) . '</h3>
        <div class="o-price">' . ( $o['price'] ? '<span class="op-row"><b class="op-n">' . apex_e( apex_fmt_num( $o['price'] ) ) . '</b><span class="op-u">' . apex_e( apex_t( 'baht' ) ) . '</span></span>' . apex_fx_span( $o['price'] ) : '<span class="op-ask">' . apex_ic( 'message-circle' ) . apex_e( apex_t( 'askPrice' ) ) . '</span>' ) . '</div>
        <div class="o-acts"><span class="o-ask">' . apex_e( apex_t( 'askOffer' ) ) . '</span>
          <a class="o-btn ln" href="' . esc_url( $o['line'] ) . '" target="_blank" rel="noopener" aria-label="' . apex_e( apex_t( 'askOffer' ) ) . ': LINE">' . apex_ic( 'line' ) . '<span>LINE</span></a>
          <a class="o-btn wa" href="' . esc_url( $o['wa'] ) . '" target="_blank" rel="noopener" aria-label="' . apex_e( apex_t( 'askOffer' ) ) . ': WhatsApp">' . apex_ic( 'whatsapp' ) . '<span>WhatsApp</span></a>
          ' . ( $o['cat'] ? '<a class="o-more" href="' . esc_url( apex_svc_url( $o['cat'] ) ) . '">' . apex_e( apex_t( 'seeService' ) ) . ' ' . apex_ic( 'arrow-right' ) . '</a>' : '' ) . '</div>
      </div></article>';
}
function apex_game_card(): string {
	return '<a class="offer offer-game rv" href="' . esc_url( apex_link( 'play.html' ) ) . '"><span class="og-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="og-ic">' . apex_ic( 'sparkles' ) . '</span><b class="h-s">' . apex_e( apex_t( 'gameTie' ) ) . '</b><span class="og-p">' . apex_e( apex_t( 'gamesP' ) ) . '</span><span class="btn btn-light btn-sm">' . apex_e( apex_t( 'gamesCta' ) ) . ' ' . apex_ic( 'arrow-right' ) . '</span></a>';
}
function apex_promo_grid( array $items, array $S, array $opts = [] ): string {
	$offers = array_map( fn( $p ) => apex_offer_of( $p, $S, $opts['cat'] ?? null ), $items );
	$g = apex_gallery();
	$game = ! empty( $opts['game'] );
	$cards = '';
	foreach ( $offers as $i => $o ) $cards .= apex_offer_card( $o, $i, $g );
	return '<div class="offer-grid' . ( count( $offers ) + ( $game ? 1 : 0 ) <= 2 ? ' few' : '' ) . '">' . $cards . ( $game ? apex_game_card() : '' ) . '</div>';
}
function apex_offer_spot( array $p, array $S ): string {
	$o = apex_offer_of( $p, $S );
	$g = apex_gallery();
	return '<div class="offer-spot rv">
      <div class="os-media"><button type="button" class="os-card ph-img" ' . apex_gattr( $g, 0 ) . ' aria-label="' . apex_e( apex_t( 'image' ) ) . ': ' . apex_e( $o['label'] ) . '"><img src="' . esc_url( apex_img( $o['src'] ) ) . '" alt="' . apex_e( $o['alt'] ) . '" loading="lazy" decoding="async" decoding="async"><span class="os-glare" aria-hidden="true"></span></button></div>
      <div class="os-body">
        <p class="os-kick">' . apex_e( apex_t( 'featuredOffer' ) ) . '</p>
        <h3 class="os-title">' . apex_e( $o['name'] ) . '</h3>
        <div class="o-tags">' . implode( '', array_map( fn( $w ) => '<span class="o-tag">' . apex_e( $w ) . '</span>', $o['words'] ) ) . apex_offer_tags( $o ) . '</div>
        ' . ( $o['price'] ? '<div class="os-price"><span class="op-row"><b class="os-n" data-count="' . apex_num_attr( $o['price'] ) . '">' . apex_e( apex_fmt_num( $o['price'] ) ) . '</b><span class="op-u">' . apex_e( apex_t( 'baht' ) ) . '</span></span>' . apex_fx_span( $o['price'] ) . '</div>' : '<p class="os-ask">' . apex_ic( 'message-circle' ) . apex_e( apex_t( 'askPrice' ) ) . '</p>' ) . '
        <div class="os-pick" data-cur-picker></div>
        <p class="os-ask-l">' . apex_e( apex_t( 'askOffer' ) ) . '</p>
        <div class="os-acts"><a class="o-btn ln lg" href="' . esc_url( $o['line'] ) . '" target="_blank" rel="noopener">' . apex_ic( 'line' ) . '<span>LINE</span></a><a class="o-btn wa lg" href="' . esc_url( $o['wa'] ) . '" target="_blank" rel="noopener">' . apex_ic( 'whatsapp' ) . '<span>WhatsApp</span></a>' . ( $o['cat'] ? '<a class="btn btn-ghost btn-sm os-more" href="' . esc_url( apex_svc_url( $o['cat'] ) ) . '">' . apex_e( apex_t( 'seeService' ) ) . ' ' . apex_ic( 'arrow-right' ) . '</a>' : '' ) . '</div>
        <p class="note">' . apex_e( apex_t( 'promosSub' ) ) . '</p>
      </div></div>';
}
function apex_chips_count( array $pairs, array $items, string $on ): string {
	$o = '';
	foreach ( $pairs as [ $k, $x ] ) $o .= '<button type="button" class="chip" data-k="' . apex_e( $k ) . '" aria-pressed="' . ( $k === $on ? 'true' : 'false' ) . '">' . apex_e( $x ) . '<i>' . ( $k === 'all' ? count( $items ) : count( array_filter( $items, fn( $i ) => $i['cat'] === $k ) ) ) . '</i></button>';
	return '<div class="chips c-count" role="group" aria-label="' . apex_e( apex_t( 'filter' ) ) . '">' . $o . '</div>';
}
function apex_recovery_card( string $key ): string {
	$R = APEX_RECOVERY[ apex_L() ][ $key ] ?? null;
	if ( ! $R ) return '';
	return '<aside class="recov rv"><p class="eyebrow">' . apex_e( apex_t( 'recoveryH' ) ) . '</p><ol class="recov-line">' . implode( '', array_map( fn( $r ) => '<li><b>' . apex_e( $r[0] ) . '</b><span>' . apex_e( $r[1] ) . '</span></li>', $R ) ) . '</ol>
      <p class="note">' . apex_e( apex_t( 'resultsVary' ) ) . '</p><a class="link-arrow" href="' . esc_url( apex_link( 'trip.html?p=' . $key ) ) . '">' . apex_e( apex_t( 'tripTry' ) ) . ' ' . apex_ic( 'arrow-right' ) . '</a></aside>';
}
function apex_plan_btn( string $key ): string { return '<button type="button" class="btn btn-ghost btn-sm plan-add" data-plan="' . apex_e( $key ) . '">' . apex_ic( 'plus' ) . '<span>' . apex_e( apex_t( 'planAdd' ) ) . '</span></button>'; }

/* =================== pages =================== */
function apex_render_page( array $r ): string {
	// password-protected service, article or episode: the form, or once unlocked, the page for this visitor only
	if ( $r['id'] && in_array( $r['page'], [ 'service', 'article', 'war', 'page' ], true ) && get_post_field( 'post_password', $r['id'] ) !== '' ) {
		if ( post_password_required( $r['id'] ) ) return apex_password_page( $r['id'] );
		$GLOBALS['apex_unlocked'] = array_filter( [ $r['page'] === 'service' ? 'svc:' . ( $r['params']['p'] ?? '' ) : '', $r['page'] === 'article' ? 'post:' . ( $r['params']['p'] ?? '' ) : '', $r['page'] === 'war' && ! empty( $r['params']['ep'] ) ? 'war:' . $r['params']['ep'] : '' ] );
	}
	$fn = 'apex_page_' . strtolower( preg_replace( '/[^a-zA-Z]/', '', $r['page'] ) );
	if ( in_array( $r['page'], [ 'nose', 'analysis', 'proportions', 'implBreast', 'implChin', 'implForehead', 'implNose', 'play', 'plan', 'trip', 'consult' ], true ) ) return apex_page_feature( $r['page'] );
	return function_exists( $fn ) ? $fn( $r ) : apex_page_notfound( $r );
}

/* HOME */
function apex_page_home( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $H = apex_data( 'home' ) ?: []; $About = apex_data( 'about' ) ?: []; $Fd = apex_data( 'founder' );
	$reviews = $H['reviews']['items'] ?? [];
	$promos = $H['promos']['items'] ?? [];
	$news = $H['news']['items'] ?? [];
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$svcs = implode( '', array_map( fn( $s ) => '<li><a href="' . esc_url( apex_svc_url( $s['key'] ) ) . '">' . $E( $s['short'] ?: $s['name'] ) . '</a></li>', $S['services'] ?? [] ) );
	$fd = $Fd ? '<a class="intro-fd rv-clip" href="' . esc_url( apex_link( 'about.html#founder' ) ) . '">
            <span class="ifd-ph"><img src="' . esc_url( apex_img( ( $Fd['portrait'] ?? '' ) ?: ( $Fd['photo'] ?? '' ) ) ) . '" alt="' . $E( $Fd['name'] ) . '" loading="lazy" decoding="async" data-par="14"></span>
            ' . ( ! empty( $Fd['aaci'] ) ? '<span class="ifd-badge"><img src="' . esc_url( apex_img( $Fd['aaci']['src'] ) ) . '" alt="' . $E( ( $Fd['aaci']['alt'] ?? '' ) ?: 'AACI' ) . '" loading="lazy" decoding="async" decoding="async"></span>' : '' ) . '
            <span class="ifd-cap"><small>' . $E( $T( 'foundedBy' ) ) . '</small><b>' . $E( $Fd['name'] ) . '</b><span>' . $E( ( $Fd['specialty'] ?? '' ) ?: ( $Fd['role'] ?? '' ) ) . '</span></span>
          </a>' : '';
	$pillars = '';
	foreach ( $About['pillars'] ?? [] as $i => $p ) $pillars .= '<li class="rv" data-d="' . ( $i * 90 ) . '"><span class="pl-n">0' . ( $i + 1 ) . '</span><b>' . $E( $p['h'] ?? '' ) . '</b><span>' . $E( $p['x'] ?? '' ) . '</span></li>';
	$cats = [ [ 'all', $T( 'all' ) ] ];
	foreach ( APEX_SVC_CATS as $k ) foreach ( $reviews as $rv ) if ( ( $rv['cat'] ?? '' ) === $k ) { $cats[] = [ $k, apex_svc_name( $S, $k ) ]; break; }
	$tt = $H['tiktok'] ?? null;

	$o = '
    <section class="hero-body" id="hero">
      <div class="hb-glow" aria-hidden="true"></div><div class="hb-suture" aria-hidden="true"></div>
      <div class="wrap hb-grid">
        <div class="hb-copy">
          <p class="eyebrow on-night rv">' . $E( $T( 'heroKicker' ) ) . '</p>
          <h1 class="hb-h1 rv" data-d="60" data-field="home.h1">' . $E( ( $H['h1'] ?? '' ) ?: 'Apex Surgery Hospital' ) . '</h1>
          <p class="hb-h2 rv" data-d="120" data-field="home.h2">' . $E( apex_L() === 'en' ? ( ( $S['brandTh'] ?? '' ) ?: ( ( $H['h2'] ?? '' ) ?: '' ) ) : ( ( $H['h2'] ?? '' ) ?: ( ( $S['brandTh'] ?? '' ) ?: '' ) ) ) . '</p>
          <p class="hb-lead rv" data-d="180">' . $E( $T( 'heroLead' ) ) . '</p>
          <div class="hb-acts rv" data-d="240"><a class="btn btn-light" href="' . esc_url( apex_link( 'consult.html' ) ) . '">' . $I( 'message-circle' ) . $E( $T( 'consult' ) ) . '</a><a class="btn btn-ghost" href="' . esc_url( apex_link( 'nose.html' ) ) . '">' . $I( 'scan-face' ) . $E( $T( 'heroCta2' ) ) . '</a></div>
          <ul class="hb-svcs rv" data-d="300">' . $svcs . '</ul>
        </div>
        <div class="hb-stage"><div id="bodymap" class="bodymap-host" aria-label="' . $E( $T( 'bodyHint' ) ) . '"></div></div>
      </div>
    </section>

    <section class="section intro-s">
      <div class="wrap intro2">
        <div><p class="eyebrow rv">' . $E( $T( 'introH' ) ) . '</p>
          <p class="intro-big rv" data-d="60" data-field="home.intro">' . $E( $H['intro']['x'] ?? '' ) . '</p>
          <a class="link-arrow rv" href="' . esc_url( apex_link( 'about.html' ) ) . '">' . $E( $T( 'aboutMore' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div>
        <div class="intro-side">
          ' . $fd . '
          <ul class="pillars">' . $pillars . '</ul>
        </div>
      </div>
    </section>

    <section class="section washed">
      <div class="wrap"><div class="shead"><div><p class="eyebrow rv">' . $E( $T( 'servicesH' ) ) . '</p><h2 class="h-xl rv" data-field="home.servicesH">' . $E( ( $H['servicesH'] ?? '' ) ?: $T( 'services' ) ) . '</h2></div><a class="link-arrow rv" href="' . esc_url( apex_link( 'services.html' ) ) . '">' . $E( $T( 'allServices' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div>
      ' . apex_svc_cards( $S ) . '</div>
    </section>

    <section class="section night tools-s">
      <div class="wrap">
        <div class="tools-grid">
          <a class="tool-card tool-nose rv" href="' . esc_url( apex_link( 'nose.html' ) ) . '">
            <span class="tc-art st-art" aria-hidden="true"><img src="' . esc_url( apex_asset( 'img/stencil-side.svg' ) ) . '" alt="" loading="lazy" decoding="async"><svg viewBox="20 60 560 640"><path class="tc-prof2" d="M97.3 334C96.2 336.7 93.4 344.3 90.6 350C87.8 355.7 83.9 362 80.6 368C77.3 374 74 380 70.6 386C67.2 392 63.4 398.7 60.1 404C56.8 409.3 53.1 414.3 50.6 418C48.1 421.7 46.4 423.5 45.2 426C44 428.5 43.5 430.7 43.5 433C43.5 435.3 44.3 437.8 45.4 440C46.5 442.2 48.2 444.8 50 446.5C51.8 448.2 53.7 449 56 450C58.3 451 61.3 451.8 64 452.5C66.7 453.2 70.7 454.2 72 454.5"/></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">' . $E( $T( 'nose' ) ) . '</span><b class="h-l">' . $E( $T( 'noseH' ) ) . '</b><span class="tc-p">' . $E( $T( 'noseP' ) ) . '</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">' . $E( $T( 'noseCta' ) ) . ' ' . $I( 'arrow-right' ) . '</span><small>' . $I( 'shield-check' ) . $E( $T( 'noseNote' ) ) . '</small></span></span></a>
          <a class="tool-card tool-games rv" data-d="90" href="' . esc_url( apex_link( 'play.html' ) ) . '">
            <span class="tc-art dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            <span class="tc-body"><span class="eyebrow on-night">' . $E( $T( 'gamesEb' ) ) . '</span><b class="h-m">' . $E( $T( 'gamesH' ) ) . '</b><span class="tc-p">' . $E( $T( 'gamesP' ) ) . '</span><span class="tc-list">' . $E( $T( 'gamesList' ) ) . '</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">' . $E( $T( 'gamesCta' ) ) . ' ' . $I( 'arrow-right' ) . '</span></span></span></a>
          <a class="tool-card tool-trip rv" data-d="180" href="' . esc_url( apex_link( 'trip.html' ) ) . '">
            <span class="tc-art cal2" aria-hidden="true"><svg viewBox="0 0 150 144"><rect class="cl-card" x="1" y="8" width="148" height="134" rx="14"/><path class="cl-top" d="M1 22a14 14 0 0 1 14-14h120a14 14 0 0 1 14 14v18H1z"/><rect class="cl-ring" x="36" y="2" width="7" height="15" rx="3.5"/><rect class="cl-ring" x="107" y="2" width="7" height="15" rx="3.5"/><path class="cl-plane" transform="translate(64 13) scale(.92)" d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/><path class="cl-wd" d="M18 50h6M36 50h6M54 50h6M72 50h6M90 50h6M108 50h6M126 50h6"/><rect class="cl-stay" x="30" y="75" width="108" height="16" rx="8"/><rect class="cl-stay" x="12" y="92" width="90" height="16" rx="8"/><circle class="cl-op" cx="75" cy="83" r="8.5"/><text class="cl-n" x="21" y="69.2">1</text><text class="cl-n" x="39" y="69.2">2</text><text class="cl-n" x="57" y="69.2">3</text><text class="cl-n" x="75" y="69.2">4</text><text class="cl-n" x="93" y="69.2">5</text><text class="cl-n" x="111" y="69.2">6</text><text class="cl-n" x="129" y="69.2">7</text><text class="cl-n" x="21" y="86.2">8</text><text class="cl-n on" x="39" y="86.2">9</text><text class="cl-n on" x="57" y="86.2">10</text><text class="cl-n on" x="75" y="86.2">11</text><text class="cl-n on" x="93" y="86.2">12</text><text class="cl-n on" x="111" y="86.2">13</text><text class="cl-n on" x="129" y="86.2">14</text><text class="cl-n on" x="21" y="103.2">15</text><text class="cl-n on" x="39" y="103.2">16</text><text class="cl-n on" x="57" y="103.2">17</text><text class="cl-n on" x="75" y="103.2">18</text><text class="cl-n on" x="93" y="103.2">19</text><text class="cl-n" x="111" y="103.2">20</text><text class="cl-n" x="129" y="103.2">21</text><text class="cl-n" x="21" y="120.2">22</text><text class="cl-n" x="39" y="120.2">23</text><text class="cl-n" x="57" y="120.2">24</text><text class="cl-n" x="75" y="120.2">25</text><text class="cl-n" x="93" y="120.2">26</text><text class="cl-n" x="111" y="120.2">27</text><text class="cl-n" x="129" y="120.2">28</text></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">' . $E( $T( 'trip' ) ) . '</span><b class="h-m">' . $E( $T( 'tripH' ) ) . '</b><span class="tc-p">' . $E( $T( 'tripP' ) ) . '</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">' . $E( $T( 'tripCta' ) ) . ' ' . $I( 'arrow-right' ) . '</span></span></span></a>
          <a class="tool-card tool-gold rv" data-d="240" href="' . esc_url( apex_link( 'proportions.html' ) ) . '">
            <span class="tc-art gold st-art" aria-hidden="true"><img src="' . esc_url( apex_asset( 'img/stencil-front.svg' ) ) . '" alt="" loading="lazy" decoding="async"><svg viewBox="90 60 420 620"><path class="tg-l" d="M108 168h384M108 305h384M108 455h384M108 610h384M124 168v442"/><path class="tg-g" d="M262 305v150M338 305v150M236 505h128"/><circle class="tg-d" cx="300" cy="168" r="8"/><circle class="tg-d" cx="300" cy="305" r="8"/><circle class="tg-d" cx="300" cy="455" r="8"/><circle class="tg-d" cx="300" cy="610" r="8"/></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">' . $E( $T( 'prop' ) ) . '</span><b class="h-m">' . $E( $T( 'propH' ) ) . '</b><span class="tc-p">' . $E( $T( 'propPageP' ) ) . '</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">' . $E( $T( 'propCta' ) ) . ' ' . $I( 'arrow-right' ) . '</span></span></span></a>
          <a class="tool-card tool-ana rv" data-d="300" href="' . esc_url( apex_link( 'analysis.html' ) ) . '">
            <span class="tc-art ana st-art" aria-hidden="true"><img src="' . esc_url( apex_asset( 'img/stencil-front.svg' ) ) . '" alt="" loading="lazy" decoding="async"><svg viewBox="90 60 420 620"><path class="ta-b" d="M100 120V80h40M460 80h40v40M100 620v40h40M460 660h40v-40"/><circle class="ta-s" cx="218" cy="430" r="16"/><circle class="ta-s" cx="384" cy="392" r="11"/><circle class="ta-s" cx="252" cy="232" r="12"/><circle class="ta-s" cx="356" cy="560" r="10"/><path class="ta-scan" d="M104 370h392"/></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">' . $E( $T( 'ana' ) ) . '</span><b class="h-m">' . $E( $T( 'anaH' ) ) . '</b><span class="tc-p">' . $E( $T( 'anaPageP' ) ) . '</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">' . $E( $T( 'anaCta' ) ) . ' ' . $I( 'arrow-right' ) . '</span></span></span></a>
          <a class="tool-card tool-impl rv" data-d="360" href="' . esc_url( apex_link( 'breast-implants.html' ) ) . '">
            <span class="tc-art impl" aria-hidden="true"><svg viewBox="0 0 220 110"><path class="ti-lens" d="M20 92 C 40 30, 120 18, 150 92 Z"/><path class="ti-in" d="M34 92 C 54 46, 116 38, 138 92"/><path class="ti-dim" d="M20 102h130M20 98v8M150 98v8M164 92V40M160 92h8M160 40h8"/><text class="ti-t" x="174" y="70">cc</text></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">' . $E( $T( 'impl' ) ) . '</span><b class="h-m">' . $E( $T( 'implH' ) ) . '</b><span class="tc-p">' . $E( $T( 'implP' ) ) . '</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">' . $E( $T( 'implCta' ) ) . ' ' . $I( 'arrow-right' ) . '</span></span></span></a>
        </div>
      </div>
    </section>

    <section class="section"><div class="wrap">' . apex_doctor_card( $S ) . '</div></section>

    <section class="section washed reviews-s">
      <div class="wrap">
        <div class="shead"><div><p class="eyebrow rv">' . $E( $T( 'reviews' ) ) . '</p><h2 class="h-xl rv" data-field="home.reviews.h">' . $E( ( $H['reviews']['h'] ?? '' ) ?: $T( 'reviews' ) ) . '</h2></div>
          <div class="rail-ctrl rv"><button type="button" id="rv-prev" aria-label="' . $E( $T( 'prev' ) ) . '">' . $I( 'chevron-left' ) . '</button><button type="button" id="rv-next" aria-label="' . $E( $T( 'next' ) ) . '">' . $I( 'chevron-right' ) . '</button></div></div>
        ' . apex_chips( $cats, 'all' ) . '
        ' . apex_review_rail( $reviews, 'rv-rail' ) . '
        <p class="note">' . $E( $T( 'resultsVary' ) ) . '</p>
      </div>
    </section>

    <section class="section night reels-s">
      <div class="wrap">
        <div class="shead"><div><p class="eyebrow on-night rv">' . $E( $T( 'reelsEb' ) ) . '</p><h2 class="h-xl rv" data-field="home.reviewsRealH">' . $E( ( $H['reviewsRealH'] ?? '' ) ?: $T( 'storiesH' ) ) . '</h2><p class="reels-sub rv">' . $E( $T( 'reelsSub' ) ) . '</p></div></div>
        ' . apex_stories_host( array_key_exists( 'videos', $H ) ? $H['videos'] : ( $tt['videos'] ?? null ), 'stories', $H['reviewsRealH'] ?? null ) . '
        ' . ( $tt && ! empty( $tt['link'] ) ? '<a class="tiktok-link" href="' . esc_url( $tt['link']['h'] ?? '' ) . '" target="_blank" rel="noopener">' . $I( 'tiktok' ) . '<span><b>' . $E( $tt['h'] ?? '' ) . '</b><small>@' . $E( ( $tt['link']['handle'] ?? '' ) ?: 'apex_surgery' ) . '</small></span>' . $I( 'arrow-up-right' ) . '</a>' : '' ) . '
      </div>
    </section>

    ';
	$W = apex_data( 'war' );
	$eps = $W['episodes'] ?? [];
	$o .= $eps ? '<section class="section war-home">
      <div class="wrap"><div class="shead"><div><p class="eyebrow rv">Workpoint 23</p><h2 class="h-xl rv">' . $E( $T( 'warH' ) ) . '</h2><p class="reels-sub rv">' . $E( $T( 'warLead' ) ) . '</p></div>
        <div class="rail-ctrl rv"><button type="button" id="war-prev" aria-label="' . $E( $T( 'prev' ) ) . '">' . $I( 'chevron-left' ) . '</button><button type="button" id="war-next" aria-label="' . $E( $T( 'next' ) ) . '">' . $I( 'chevron-right' ) . '</button></div></div>
      <div class="rail war-rail" id="war-rail">' . implode( '', array_map( 'apex_war_card', $eps, array_keys( $eps ) ) ) . '</div>
      <a class="link-arrow rv" href="' . esc_url( apex_link( 'surgery-wars.html' ) ) . '">' . $E( $T( 'warAll' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div></section>' : '';
	$spot = '';
	if ( $promos ) {
		$si = 0;
		foreach ( $promos as $i => $p ) if ( ! empty( $p['price'] ) ) { $si = $i; break; }
		$spot = apex_offer_spot( $promos[ $si ], $S );
		$rest = array_values( array_filter( $promos, fn( $i ) => $i !== $si, ARRAY_FILTER_USE_KEY ) );
		$spot .= apex_promo_grid( array_slice( $rest, 0, 7 ), $S, [ 'game' => true ] );
	}
	$o .= '

    <section class="section promos-s">
      <div class="wrap"><div class="shead"><div><p class="eyebrow rv">' . $E( $T( 'promotions' ) ) . '</p><h2 class="h-xl rv" data-field="home.promos.h">' . $E( ( $H['promos']['h'] ?? '' ) ?: $T( 'promosH' ) ) . '</h2></div><a class="link-arrow rv" href="' . esc_url( apex_link( 'promotions.html' ) ) . '">' . $E( $T( 'viewAll' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div>
      ' . $spot . '</div>
    </section>

    <section class="section washed"><div class="wrap">' . apex_branches( $S, $H['branches']['h'] ?? null, $H['branches']['p'] ?? null ) . '</div></section>

    <section class="section updates-s">
      <div class="wrap"><div class="shead"><h2 class="h-xl rv" data-field="home.news.h">' . $E( ( $H['news']['h'] ?? '' ) ?: $T( 'newsH' ) ) . '</h2><a class="link-arrow rv" href="' . esc_url( apex_link( 'blog.html' ) ) . '">' . $E( $T( 'viewAll' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div>
      <div class="updates2">' . ( ! empty( $S['facebook'] ) ? '<div class="fb-col">' . apex_fb_link( $S['facebookSurgery'] ?? null, 'big' ) . apex_fb_frame( $S['facebook'], 600, 'timeline', $S['facebookSurgery'] ?? null ) . '</div>' : '' ) . '<div class="upd-list">' . implode( '', array_map( 'apex_post_card', array_slice( $news, 0, 4 ), array_keys( array_slice( $news, 0, 4 ) ) ) ) . '</div></div></div>
    </section>

    <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
	return $o;
}

/* SERVICES */
function apex_page_services( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $D = apex_data( 'services' ) ?: [];
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	return apex_phead( ( $D['h'] ?? '' ) ?: $T( 'services' ), $T( 'servicesSub' ), [ apex_home_crumb(), [ $T( 'services' ) ] ] ) . '
      <section class="section"><div class="wrap">' . apex_svc_cards( $S ) . '</div></section>
      <section class="section washed"><div class="wrap"><div class="shead"><h2 class="h-xl rv">' . $E( $T( 'tools' ) ) . '</h2></div>
        <div class="mini-tools">
          <a class="mini-tool rv" href="' . esc_url( apex_link( 'nose.html' ) ) . '">' . $I( 'scan-face' ) . '<b>' . $E( $T( 'nose' ) ) . '</b><span>' . $E( $T( 'nosePageP' ) ) . '</span></a>
          <a class="mini-tool rv" data-d="20" href="' . esc_url( apex_link( 'analysis.html' ) ) . '">' . $I( 'scan-line' ) . '<b>' . $E( $T( 'ana' ) ) . '</b><span>' . $E( $T( 'anaPageP' ) ) . '</span></a>
          <a class="mini-tool rv" data-d="35" href="' . esc_url( apex_link( 'proportions.html' ) ) . '">' . $I( 'gem' ) . '<b>' . $E( $T( 'prop' ) ) . '</b><span>' . $E( $T( 'propPageP' ) ) . '</span></a>
          <a class="mini-tool rv" data-d="50" href="' . esc_url( apex_link( 'breast-implants.html' ) ) . '">' . $I( 'ruler' ) . '<b>' . $E( $T( 'impl' ) ) . '</b><span>' . $E( $T( 'implP' ) ) . '</span></a>
          <a class="mini-tool rv" data-d="70" href="' . esc_url( apex_link( 'trip.html' ) ) . '">' . $I( 'calendar' ) . '<b>' . $E( $T( 'trip' ) ) . '</b><span>' . $E( $T( 'tripP' ) ) . '</span></a>
          <a class="mini-tool rv" data-d="140" href="' . esc_url( apex_link( 'play.html' ) ) . '">' . $I( 'sparkles' ) . '<b>' . $E( $T( 'games' ) ) . '</b><span>' . $E( $T( 'gamesP' ) ) . '</span></a>
          <a class="mini-tool rv" data-d="210" href="' . esc_url( apex_link( 'doctor.html' ) ) . '">' . $I( 'stethoscope' ) . '<b>' . $E( $T( 'doctor' ) ) . '</b><span>' . $E( $S['doctor']['name'] ?? '' ) . '</span></a>
        </div></div></section>
      <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
}

/* SERVICE */
function apex_page_service( array $r ): string {
	$S = apex_data( 'shared' ) ?: [];
	$key = $r['params']['p'] ?? 'facelift';
	$D = apex_data( 'svc:' . $key );
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	if ( ! $D ) return apex_phead( $T( 'notFoundH' ), $T( 'loadError' ), [ apex_home_crumb(), [ $T( 'services' ), 'services.html' ], [ $key ] ] );
	$nm = apex_svc_name( $S, $key );
	$promos = $D['promos'] ?? [];
	$crumbs = [ apex_home_crumb(), [ $T( 'services' ), 'services.html' ], [ $nm ] ];
	$intro = $D['intro'] ?? [];
	$introP = array_values( array_filter( $intro, fn( $x ) => ! preg_match( '/^✔/u', $x ) ) );
	$ticks = array_values( array_map( fn( $x ) => preg_replace( '/^✔\s*/u', '', $x ), array_filter( $intro, fn( $x ) => (bool) preg_match( '/^✔/u', $x ) ) ) );
	$q = apex_len( implode( ' ', $introP ) ) > 420 ? apex_pick_quote( $introP ) : '';
	$aa = $D['atApex'] ?? null;
	$aaImg = $aa && ! empty( $aa['img'] ) ? [ 'src' => $aa['img'], 'alt' => ( $aa['alt'] ?? '' ) ?: ( $aa['h'] ?? '' ) ] : apex_ph( APEX_SVC_PHOTOS[ $key ][0] ?? null );
	$secs = $D['sections'] ?? [];
	$o = '
    <section class="svc-head">
      <div class="phead-lines" aria-hidden="true"></div><div class="sh-glow" aria-hidden="true"></div>
      <div class="wrap">
        ' . apex_crumbs( $crumbs ) . '
        <div class="sh-grid">
          <div class="sh-copy">
            <p class="eyebrow on-night rv">' . $E( $D['en'] ?? '' ) . '</p>
            <h1 class="display-s rv" data-d="60" data-field="svc.name">' . $E( $D['name'] ?? '' ) . '</h1>
            ' . ( ! empty( $D['byline'] ) ? '<p class="sh-by rv" data-d="120" data-field="svc.byline">' . $I( 'badge-check' ) . $E( $D['byline'] ) . '</p>' : '' ) . '
            <div class="sh-acts rv" data-d="180"><a class="btn btn-light" href="' . esc_url( apex_link( 'consult.html?p=' . $key ) ) . '">' . $I( 'message-circle' ) . $E( $T( 'consult' ) ) . '</a>' . apex_plan_btn( $key ) . ( $key === 'rhinoplasty' ? '<a class="btn btn-ghost btn-sm" href="' . esc_url( apex_link( 'nose.html' ) ) . '">' . $I( 'scan-face' ) . $E( $T( 'noseTry' ) ) . '</a>' : '' ) . '</div>
          </div>
          ' . apex_recovery_card( $key ) . '
        </div>
      </div>
      ' . ( ! empty( $D['hero'] ) ? '<figure class="sh-banner rv-clip ph-img wrap-wide"><img src="' . esc_url( apex_img( $D['hero'] ) ) . '"' . apex_srcset( $D['hero'], '(max-width: 900px) 150vw, 1500px' ) . ' alt="' . $E( ( $D['heroAlt'] ?? '' ) ?: ( $D['name'] ?? '' ) ) . '" data-field="svc.hero" data-par="24" fetchpriority="high"></figure>' : '' ) . '
    </section>
';
	$ip = '';
	foreach ( $introP as $i => $p ) $ip .= '<p class="' . ( $i ? '' : 'si-lead ' ) . 'rv">' . $E( $p ) . '</p>' . ( $i === 0 && $q && count( $introP ) > 1 ? apex_pull_quote( $q ) : '' );
	$tk = '';
	foreach ( $ticks as $i => $x ) $tk .= '<li class="rv" data-d="' . ( $i * 60 ) . '">' . $I( 'check' ) . '<span>' . $E( $x ) . '</span></li>';
	$badges = '';
	foreach ( $D['badges'] ?? [] as $i => $b ) $badges .= '<figure class="badge ph-img rv" data-d="' . ( $i * 80 ) . '"><img src="' . esc_url( apex_img( $b['src'] ?? '' ) ) . '" alt="' . $E( $b['alt'] ?? '' ) . '" loading="lazy" decoding="async" decoding="async"></figure>';
	$o .= '
    <section class="section svc-intro">
      <div class="wrap si2">
        <div class="si-copy" data-field="svc.intro">
          ' . ( $aa ? '<h2 class="h-l rv" data-field="svc.atApex.h">' . $E( $aa['h'] ?? '' ) . '</h2>' : '' ) . '
          ' . $ip . '
          ' . ( $q && count( $introP ) === 1 ? apex_pull_quote( $q ) : '' ) . '
          ' . ( $ticks ? '<ul class="tick-chips">' . $tk . '</ul>' : '' ) . '
        </div>
        <aside class="si-media">' . apex_figure( $aaImg, 'si-fig', false ) . '
          <p class="si-tag rv" aria-hidden="true">' . implode( '', array_map( fn( $x ) => '<span>' . $E( $x ) . '</span>', $D['tagline'] ?? [] ) ) . '</p></aside>
      </div>
      ' . ( $badges ? '<div class="wrap"><div class="badges">' . $badges . '</div></div>' : '' ) . '
    </section>

    ';
	foreach ( $secs as $i => $sec ) $o .= apex_svc_section( $sec, $i, $key, $i % 2 === 0 );
	$o .= '

    ' . ( ! empty( $D['ba'] ) ? '<section class="section night ba-s"><div class="wrap"><div class="shead"><div><p class="eyebrow on-night rv">' . $E( $nm ) . '</p><h2 class="h-xl rv">' . $E( ( $D['baH'] ?? '' ) ?: $T( 'baH' ) ) . '</h2></div><p class="note on-night rv">' . $E( $T( 'resultsVary' ) ) . '</p></div>
      <div id="ba" class="ba-host">' . apex_ba_grid( $D['ba'], $D['baH'] ?? null ) . '</div></div></section>' : '' ) . '

    <section class="section reviews-s">
      <div class="wrap"><div class="shead"><h2 class="h-xl rv" data-field="svc.reviewsH">' . $E( preg_replace( '/\s*!+\s*$/u', '', ( $D['reviewsH'] ?? '' ) ?: $T( 'reviews' ) ) ) . '</h2>
        <div class="rail-ctrl rv"><button type="button" id="rv-prev" aria-label="' . $E( $T( 'prev' ) ) . '">' . $I( 'chevron-left' ) . '</button><button type="button" id="rv-next" aria-label="' . $E( $T( 'next' ) ) . '">' . $I( 'chevron-right' ) . '</button></div></div>
      ' . apex_review_rail( $D['reviewImgs'] ?? [], 'rv-rail' ) . '
      <div class="stories-wrap"><div class="sw-head"><h3 class="h-m rv">' . $E( $T( 'reelsEb' ) ) . '</h3><p class="reels-sub rv">' . $E( $T( 'reelsTap' ) ) . '</p></div>' . apex_stories_host( $D['videos'] ?? null, 'stories', $D['reviewsH'] ?? null ) . '</div>
      ';
	$yt = $D['yt'] ?? [];
	$tt = $D['tiktok'] ?? null;
	if ( $yt || $tt ) {
		$o .= '<div class="yt-row">' . implode( '', array_map( fn( $id ) => '<div class="ytbox rv"><button type="button" data-yt="' . $E( $id ) . '" aria-label="' . $E( $T( 'playVideo' ) ) . '"><img loading="lazy" decoding="async" src="' . esc_url( apex_yt( $id ) ) . '" alt=""><span class="pl">' . $I( 'play' ) . '</span></button></div>', $yt ) ) . '
        ' . ( $tt ? '<a class="tiktok-link rv" href="' . esc_url( $tt['h'] ?? '' ) . '" target="_blank" rel="noopener">' . $I( 'tiktok' ) . '<span><b>' . $E( $tt['x'] ?? '' ) . '</b><small>@apex_surgery</small></span>' . $I( 'arrow-up-right' ) . '</a>' : '' ) . '</div>';
	}
	$o .= '
      </div>
    </section>

    ' . ( $promos ? '<section class="section washed"><div class="wrap"><div class="shead"><div><p class="eyebrow rv">' . $E( implode( ' · ', $D['promoTag'] ?? [] ) ) . '</p><h2 class="h-xl rv">' . $E( ( $D['promoH'] ?? '' ) ?: $T( 'promosH' ) ) . '</h2></div><a class="link-arrow rv" href="' . esc_url( apex_link( 'promotions.html?c=' . $key ) ) . '">' . $E( $T( 'viewAll' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div>' . apex_promo_grid( $promos, $S, [ 'cat' => $key ] ) . '</div></section>' : '' ) . '

    ' . ( ! empty( $D['faqs'] ) ? '<section class="section faq-s"><div class="wrap">
      <h2 class="h-l faq-h rv" data-field="svc.faqH">' . $E( ( $D['faqH'] ?? '' ) ?: $T( 'faqH' ) ) . '</h2>
      <div class="faq-grid2"><div data-field="svc.faqs">' . apex_faq_html( $D['faqs'] ) . '</div>
        <aside class="faq-cta rv"><span class="fc-ic">' . $I( 'line' ) . '</span><b class="h-s">' . $E( ( $S['cta']['consult'] ?? '' ) ?: $T( 'consult' ) ) . '</b><p>' . $E( $T( 'consultP' ) ) . '</p>
          <a class="btn btn-plum" href="' . esc_url( ( ( $S['line']['h'] ?? '' ) ?: '#' ) ) . '" target="_blank" rel="noopener">' . $I( 'line' ) . $E( ( $S['cta']['free'] ?? '' ) ?: $T( 'consult' ) ) . '</a>
          <a class="link-arrow" href="' . esc_url( apex_link( 'consult.html?p=' . $key ) ) . '">' . $E( $T( 'consultBtn' ) ) . ' ' . $I( 'arrow-right' ) . '</a></aside></div></div></section>' : '' ) . '

    <section class="section washed"><div class="wrap">' . apex_doctor_card( $S ) . '</div></section>
    <section class="section"><div class="wrap">' . apex_branches( $S ) . '</div></section>
    <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
	return $o;
}

/* FOUNDER (about + doctor) */
function apex_founder_block( $F, bool $full ): string {
	if ( ! $F || empty( $F['name'] ) ) return '';
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$bio = $F['bio'] ?? [];
	$rest = array_slice( $bio, 1 );
	$years = implode( '', array_map( fn( $y ) => '<li><b>' . $E( $y['y'] ?? '' ) . '</b><span>' . $E( $y['x'] ?? '' ) . '</span></li>', $F['years'] ?? [] ) );
	$roles = '';
	foreach ( $F['roles'] ?? [] as $j => $x ) { [ $l, $t ] = apex_split_label( $x ); $roles .= '<li class="who-card role-card rv" data-d="' . ( ( $j % 2 ) * 60 ) . '"><span class="wc-ic">' . $I( apex_pick_icon( $l ?? $x, $j ) ) . '</span>' . ( $l ? '<h3>' . $E( $l ) . '</h3><p>' . $E( $t ) . '</p>' : '<p class="wc-solo">' . $E( $t ) . '</p>' ) . '</li>'; }
	$alt = apex_L() === 'en' ? ( $F['nameTh'] ?? '' ) : ( $F['nameEn'] ?? '' );
	return '<div class="founder2" id="founder">
      <div class="f2-media rv">
        <figure class="f2-ph ph-img"><img src="' . esc_url( apex_img( $full ? ( ( $F['portrait'] ?? '' ) ?: ( $F['photo'] ?? '' ) ) : ( $F['photo'] ?? '' ) ) ) . '" alt="' . $E( $F['name'] ) . '" loading="lazy" decoding="async" decoding="async"></figure>
        <div class="f2-card"><span class="f2-ic">' . $I( 'award' ) . '</span><span><b>' . $E( $F['license'] ?? '' ) . '</b><small>' . $E( $F['role'] ?? '' ) . '</small></span></div>
      </div>
      <div class="f2-body">
        <h2 class="h-l rv" data-field="founder.name">' . $E( $F['name'] ) . '</h2>
        <p class="f2-alt rv">' . $E( $alt ) . ( ! empty( $F['nick'] ) ? ' · ' . $E( $F['nick'] ) : '' ) . '</p>
        <p class="doc-meta rv"><span>' . $E( $F['role'] ?? '' ) . '</span><span>' . $E( $F['license'] ?? '' ) . '</span></p>
        <p class="f2-lead rv" data-field="founder.bio">' . $E( $bio[0] ?? '' ) . '</p>
        <ol class="f2-years rv" aria-label="' . $E( $T( 'yearsH' ) ) . '">' . $years . '</ol>
        ' . apex_pull_quote( (string) ( $F['quote'] ?? '' ) ) . '
        ' . ( $full ? '<ul class="who-grid role-grid">' . $roles . '</ul>
          <div class="f2-edu rv"><h3 class="h-s">' . $E( $F['eduH'] ?? '' ) . '</h3><ul class="ticks">' . implode( '', array_map( fn( $x ) => '<li>' . $E( $x ) . '</li>', $F['edu'] ?? [] ) ) . '</ul></div>' : '' ) . '
        <details class="f2-more rv"><summary><span>' . $E( $T( 'readMore' ) ) . '</span>' . $I( 'chevron-down' ) . '</summary><div class="f2-rest">' . implode( '', array_map( fn( $x ) => '<p>' . $E( $x ) . '</p>', $rest ) ) . '</div></details>
        <div class="doc-acts rv">' . ( $full ? '<a class="btn btn-ghost on-light btn-sm" href="' . esc_url( ( $F['check']['h'] ?? '' ) ) . '" target="_blank" rel="noopener">' . $I( 'shield-check' ) . $E( $F['checkX'] ?? '' ) . '</a>' : '<a class="btn btn-plum btn-sm" href="' . esc_url( apex_link( 'doctor.html#founder' ) ) . '">' . $E( $T( 'founderCta' ) ) . ' ' . $I( 'arrow-right' ) . '</a>' ) . '</div>
      </div></div>';
}
function apex_aaci_card( array $S ): string {
	return ! empty( $S['aaci'] ) ? '<a class="aaci-card rv" href="' . esc_url( $S['aaci']['h'] ) . '" target="_blank" rel="noopener"><img src="' . esc_url( apex_img( $S['aaci']['src'] ) ) . '" alt="' . apex_e( $S['aaci']['alt'] ) . '" loading="lazy" decoding="async" width="96" height="96"><span><b>' . apex_e( apex_t( 'aaciH' ) ) . '</b><small>' . apex_e( apex_t( 'aaciP' ) ) . '</small></span>' . apex_ic( 'arrow-up-right' ) . '</a>' : '';
}

/* ABOUT */
function apex_page_about( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $D = apex_data( 'about' ) ?: []; $F = apex_data( 'founder' );
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$intro = $D['intro'] ?? [];
	$ip = '';
	foreach ( $intro as $i => $p ) $ip .= '<p class="rv' . ( $i ? '' : ' si-lead' ) . '">' . $E( $p ) . '</p>' . ( $i === 0 && count( $intro ) > 1 ? apex_pull_quote( apex_pick_quote( array_slice( $intro, 1 ), false ) ) : '' );
	$pillars = '';
	foreach ( $D['pillars'] ?? [] as $i => $p ) $pillars .= '<li class="rv" data-d="' . ( $i * 90 ) . '"><span class="pl-ic">' . $I( [ 'stethoscope', 'cpu', 'shield-check' ][ $i % 3 ] ) . '</span><b>' . $E( $p['h'] ?? '' ) . '</b><span>' . $E( $p['x'] ?? '' ) . '</span></li>';
	return apex_phead( ( $D['h1'] ?? '' ) ?: $T( 'about' ), null, [ apex_home_crumb(), [ $T( 'about' ) ] ] ) . '
      ' . ( ! empty( $D['hero']['src'] ) ? '<figure class="about-banner ph-img rv-clip wrap-wide"><img src="' . esc_url( apex_img( $D['hero']['src'] ) ) . '"' . apex_srcset( $D['hero']['src'], '(max-width: 900px) 160vw, 100vw' ) . ' alt="' . $E( ( $D['hero']['alt'] ?? '' ) ?: ( $D['h1'] ?? '' ) ) . '" data-par="22" fetchpriority="high"></figure>' : '' ) . '
      <section class="section"><div class="wrap about-grid">
        <div class="prose big" data-field="about.intro">' . $ip . '</div>
        <aside class="about-aside">
          ' . ( $F ? '<a class="f-mini rv" href="#founder"><span class="f-mini-ph ph-img"><img src="' . esc_url( apex_img( $F['photo'] ?? '' ) ) . '" alt="" loading="lazy" decoding="async" decoding="async"></span><span><small>' . $E( $T( 'foundedBy' ) ) . '</small><b>' . $E( $F['name'] ) . '</b><span>' . $E( $F['role'] ?? '' ) . '</span></span>' . $I( 'arrow-right' ) . '</a>' : '<div class="about-side rv"><p class="eyebrow">' . $E( $T( 'foundedBy' ) ) . '</p><p>' . $E( $S['founder'] ?? '' ) . '</p></div>' ) . '
          ' . apex_aaci_card( $S ) . '
        </aside></div></section>
      <section class="section night vision-s"><div class="wrap"><p class="eyebrow on-night rv">' . $E( ( $D['visionH'] ?? '' ) ?: $T( 'visionH' ) ) . '</p><p class="vision rv" data-field="about.vision">' . $E( $D['vision'] ?? '' ) . '</p>
        <ul class="pillars on-night">' . $pillars . '</ul></div></section>
      ' . ( $F ? '<section class="section founder-s"><div class="wrap">' . apex_founder_block( $F, false ) . '</div></section>' : '' ) . '
      <section class="section washed"><div class="wrap">' . apex_doctor_card( $S ) . '</div></section>
      <section class="section"><div class="wrap">' . apex_branches( $S, $D['branches']['h'] ?? null, $D['branches']['p'] ?? null ) . '</div></section>
      <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
}

/* DOCTOR */
function apex_page_doctor( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $Dr = $S['doctor'] ?? []; $F = apex_data( 'founder' );
	$E = 'apex_e'; $T = 'apex_t';
	return apex_phead( $T( 'doctorsH' ), ( $Dr['name'] ?? '' ) . ' · ' . ( $Dr['title'] ?? '' ) . ( $F ? ' · ' . $F['name'] : '' ), [ apex_home_crumb(), [ $T( 'doctorsH' ) ] ] ) . '
      <section class="section"><div class="wrap">' . apex_doctor_card( $S, true ) . '</div></section>
      ' . ( $F ? '<section class="section washed founder-s"><div class="wrap">' . apex_founder_block( $F, true ) . '</div></section>' : '' ) . '
      <section class="section"><div class="wrap"><div class="shead"><h2 class="h-xl rv">' . $E( $T( 'servicesH' ) ) . '</h2></div>' . apex_svc_cards( $S ) . '</div></section>
      <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
}

/* PROMOTIONS */
function apex_page_promotions( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $D = apex_data( 'promotions' ) ?: [];
	$E = 'apex_e'; $T = 'apex_t';
	$items = $D['items'] ?? [];
	$c = $r['params']['c'] ?? null;
	$start = $c && in_array( $c, APEX_SVC_CATS, true ) ? $c : 'all';
	$filters = [];
	foreach ( ( $D['filters'] ?? [] ) ?: [ [ 'k' => 'all', 'x' => $T( 'all' ) ] ] as $f ) {
		$k = $f['k'] ?? '';
		if ( $k !== 'all' && ! array_filter( $items, fn( $i ) => ( $i['cat'] ?? '' ) === $k ) ) continue;
		$filters[] = [ $k, $k === 'all' ? $T( 'all' ) : ( $f['x'] ?? '' ) ];
	}
	$si = -1;
	foreach ( $items as $i => $p ) if ( ! empty( $p['price'] ) ) { $si = $i; break; }
	$offers = array_map( fn( $p ) => apex_offer_of( $p, $S ), $items );
	$o = apex_phead( ( $D['h1'] ?? '' ) ?: $T( 'promotions' ), $T( 'promosSub' ), [ apex_home_crumb(), [ $T( 'promotions' ) ] ] ) . '
      ' . ( $si >= 0 ? '<section class="section night offer-spot-s"><div class="wrap">' . apex_offer_spot( $items[ $si ], $S ) . '</div></section>' : '' ) . '
      <section class="section offers-s"><div class="wrap">
        <div class="offers-bar">' . apex_chips_count( $filters, $offers, $start ) . '<div class="offers-cur" data-cur-picker></div></div>
        <div id="pgrid">' . apex_promo_grid( $items, $S, [ 'game' => true ] ) . '</div>
        <p class="note" style="margin-top:30px">' . $E( $S['footerNote'] ?? '' ) . '</p></div></section>
      <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
	// the script hides the cards outside the chosen procedure; do the same so the page arrives filtered
	if ( $start !== 'all' ) $o = preg_replace_callback( '/<article class="offer rv"([^>]*) data-cat="([^"]*)">/', fn( $m ) => $m[2] === $start ? $m[0] : '<article class="offer rv"' . $m[1] . ' data-cat="' . $m[2] . '" hidden>', $o );
	return $o;
}

/* REVIEWS */
function apex_story_card( array $x, int $i, array $S ): string {
	$p = $x['p']; $d = $x['d'];
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$inner = [];
	foreach ( $d['blocks'] ?? [] as $b ) if ( $b['t'] === 'img' && ! empty( $b['src'] ) ) $inner[] = $b['src'];
	$first = ( $p['img'] ?? '' ) ?: ( $inner[0] ?? '' );
	$imgs = array_slice( array_values( array_filter( array_merge( [ $first ], array_filter( $inner, fn( $s ) => $s !== ( $p['img'] ?? null ) ) ) ) ), 0, 4 );
	$paras = [];
	foreach ( $d['blocks'] ?? [] as $b ) if ( $b['t'] === 'p' ) $paras[] = $b['x'];
	$q = apex_spoken( $paras )[0] ?? '';
	$proc = apex_proc_of( ( $d['tag'] ?? '' ) . ' ' . $p['title'] . ' ' . $p['key'] );
	$stack = '';
	foreach ( array_slice( $imgs, 1, 3 ) as $j => $src ) $stack .= '<span class="st-th ph-img" style="--k:' . $j . '"><img src="' . esc_url( apex_img( $src ) ) . '" alt="" loading="lazy" decoding="async" decoding="async"></span>';
	$url = apex_post_url( $p['key'] );
	return '<article class="story' . ( $i === 0 ? ' big' : '' ) . ' rv" data-d="' . ( ( $i % 2 ) * 80 ) . '" data-cat="' . $E( $proc ?? '' ) . '">
      <a class="st-media" href="' . esc_url( $url ) . '" aria-label="' . $E( $p['title'] ) . '" tabindex="-1">
        <span class="st-main ph-img"><img src="' . esc_url( apex_img( $imgs[0] ?? '' ) ) . '"' . apex_srcset( $imgs[0] ?? '', '(max-width: 900px) 100vw, 640px' ) . ' alt="" ' . ( $i === 0 ? 'fetchpriority="high"' : 'loading="lazy"' ) . ' decoding="async" decoding="async"></span>
        ' . ( count( $imgs ) > 1 ? '<span class="st-stack" aria-hidden="true">' . $stack . '</span>' : '' ) . '
      </a>
      <div class="st-body">
        <p class="st-meta">' . ( $proc ? '<span class="pc-cat">' . $E( apex_svc_name( $S, $proc ) ) . '</span>' : '' ) . ( ! empty( $p['date'] ) ? '<time datetime="' . $E( $p['date'] ) . '">' . $E( apex_fmt_date( $p['date'] ) ) . '</time>' : '' ) . '</p>
        <h3><a href="' . esc_url( $url ) . '">' . $E( $p['title'] ) . '</a></h3>
        ' . ( $q !== '' ? '<blockquote class="st-q">' . $I( 'quote' ) . '<p>' . $E( $q ) . '</p></blockquote>' : ( ! empty( $p['desc'] ) ? '<p class="st-ex">' . $E( $p['desc'] ) . '</p>' : '' ) ) . '
        <a class="link-arrow" href="' . esc_url( $url ) . '">' . $E( $T( 'readStory' ) ) . ' ' . $I( 'arrow-right' ) . '</a>
      </div></article>';
}
function apex_page_reviews( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $D = apex_data( 'reviews' ) ?: []; $P = apex_data( 'posts' ) ?: []; $H = apex_data( 'home' ) ?: [];
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$items = $D['items'] ?? [];
	apex_gallery(); // pages.js builds a gallery of the cases here before drawing; keep the numbering in step
	$rp = array_values( array_filter( $P, fn( $p ) => $p['cat'] === 'review' ) );
	$stories = [];
	$others = [];
	foreach ( $rp as $p ) {
		$d = apex_data( 'post:' . $p['key'] );
		$has = $d && array_filter( $d['blocks'] ?? [], fn( $b ) => $b['t'] === 'img' );
		if ( $has ) $stories[] = [ 'p' => $p, 'd' => $d ]; else $others[] = $p;
	}
	$sCats = [];
	foreach ( APEX_SVC_CATS as $k ) foreach ( $stories as $x ) if ( apex_proc_of( ( $x['d']['tag'] ?? '' ) . ' ' . $x['p']['title'] . ' ' . $x['p']['key'] ) === $k ) { $sCats[] = $k; break; }
	$chips = '';
	if ( count( $sCats ) > 1 ) $chips = preg_replace( '/class="chips"/', 'class="chips st-chips"', apex_chips( array_merge( [ [ 'all', $T( 'all' ) ] ], array_map( fn( $k ) => [ $k, apex_svc_name( $S, $k ) ], $sCats ) ), 'all' ), 1 );
	$cards = '';
	foreach ( $stories as $i => $x ) $cards .= apex_story_card( $x, $i, $S );
	$others4 = array_slice( $others, 0, 4 );
	return apex_phead( ( $D['h1'] ?? '' ) ?: $T( 'reviews' ), $T( 'reviewsSub' ), [ apex_home_crumb(), [ $T( 'reviews' ) ] ] ) . '
      ' . ( $stories ? '<section class="section stories-s"><div class="wrap">
        <div class="shead"><h2 class="h-xl rv">' . $E( $T( 'storiesH' ) ) . '</h2>' . $chips . '</div>
        <div class="story-grid" id="sgrid">' . $cards . '</div></div></section>' : '' ) . '
      <section class="section night ba-wall"><div class="wrap">
        <div class="shead"><h2 class="h-xl rv">' . $E( $T( 'baH' ) ) . '</h2><p class="note on-night rv">' . $E( $T( 'resultsVary' ) ) . '</p></div>
        <div id="ba" class="ba-host">' . apex_ba_grid( array_column( $items, 'src' ), $T( 'baH' ) ) . '</div></div></section>
      <section class="section night"><div class="wrap"><div class="shead"><h2 class="h-xl rv">' . $E( ( $H['reviewsRealH'] ?? '' ) ?: $T( 'storiesH' ) ) . '</h2></div>' . apex_stories_host( $H['videos'] ?? null, 'stories', $H['reviewsRealH'] ?? null ) . '</div></section>
      <section class="section"><div class="wrap"><div class="shead"><h2 class="h-xl rv">' . $E( $T( 'updatesH' ) ) . '</h2><a class="link-arrow rv" href="' . esc_url( apex_link( 'blog.html?c=review' ) ) . '">' . $E( $T( 'viewAll' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div>
        <div class="updates2">' . ( ! empty( $S['facebook'] ) ? '<div class="fb-col">' . apex_fb_link( $S['facebookSurgery'] ?? null, 'big' ) . apex_fb_frame( $S['facebook'], 600, 'timeline', $S['facebookSurgery'] ?? null ) . '</div>' : '' ) . '<div class="upd-list">' . implode( '', array_map( 'apex_post_card', $others4, array_keys( $others4 ) ) ) . '</div></div></div></section>
      <section class="section washed"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
}

/* BLOG */
function apex_page_blog( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $B = apex_data( 'blogs' ) ?: []; $P = apex_data( 'posts' ) ?: [];
	$T = 'apex_t';
	$c = $r['params']['c'] ?? null;
	$start = in_array( $c, [ 'review', 'blog', 'news' ], true ) ? $c : 'all';
	$cats = array_values( array_filter( [ [ 'all', $T( 'all' ) ], [ 'review', $T( 'catReview' ) ], [ 'blog', $T( 'catBlog' ) ], [ 'news', $T( 'catNews' ) ] ], fn( $x ) => $x[0] === 'all' || array_filter( $P, fn( $p ) => $p['cat'] === $x[0] ) ) );
	$cards = '';
	foreach ( $P as $i => $p ) {
		$card = apex_post_card( $p, $i, $i === 0 );
		// arrive filtered, as the script leaves it
		if ( $start !== 'all' && $p['cat'] !== $start ) $card = preg_replace( '/^<a class="post-card/', '<a hidden class="post-card', $card );
		$cards .= $card;
	}
	return apex_phead( ( $B['h1'] ?? '' ) ?: $T( 'articles' ), null, [ apex_home_crumb(), [ $T( 'articles' ) ] ] ) . '
      <section class="section" style="padding-top:50px"><div class="wrap">
        ' . apex_chips( $cats, $start ) . '
        <div class="post-grid lg" id="bgrid">' . $cards . '</div></div></section>
      <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
}

/* ARTICLE */
function apex_facts_box( string $proc, array $S ): string {
	$R = APEX_RECOVERY[ apex_L() ][ $proc ] ?? null;
	if ( ! $R ) return '';
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	return '<aside class="facts rv"><p class="facts-h">' . $I( 'clipboard-check' ) . '<span>' . $E( $T( 'keyFacts' ) ) . '</span></p>
      <dl><div class="f-proc"><dt>' . $E( $T( 'procedure' ) ) . '</dt><dd><a href="' . esc_url( apex_svc_url( $proc ) ) . '">' . $E( apex_svc_name( $S, $proc ) ) . '</a></dd></div>
      ' . implode( '', array_map( fn( $r ) => '<div><dt>' . $E( $r[1] ) . '</dt><dd>' . $E( $r[0] ) . '</dd></div>', $R ) ) . '</dl>
      <p class="note">' . $E( $T( 'resultsVary' ) ) . '</p><a class="link-arrow" href="' . esc_url( apex_svc_url( $proc ) ) . '">' . $E( $T( 'seeService' ) ) . ' ' . $I( 'arrow-right' ) . '</a></aside>';
}
function apex_block_text( array $b ): string {
	return ( $b['x'] ?? '' ) . ' ' . implode( ' ', array_map( fn( $i ) => is_array( $i ) ? ( $i['x'] ?? '' ) : $i, $b['items'] ?? [] ) );
}
function apex_article_body( array $D, string $key, array $S ): array {
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$bl = array_values( array_filter( $D['blocks'] ?? [], fn( $b ) => ! ( $b['t'] === 'p' && trim( (string) ( $b['x'] ?? '' ) ) === '' ) ) );
	$paras = array_values( array_map( fn( $b ) => $b['x'], array_filter( $bl, fn( $b ) => $b['t'] === 'p' ) ) );
	$total = implode( ' ', array_map( 'apex_block_text', $bl ) );
	$tl = apex_len( $total );
	$long = $tl > ( apex_L() === 'th' ? 2600 : 3200 );
	$proc = ( $D['cat'] ?? '' ) === 'news' || ! empty( $D['noFacts'] ) ? null : apex_proc_of( ( $D['tag'] ?? '' ) . ' ' . $D['title'] . ' ' . $key );
	$imgN = count( array_filter( $bl, fn( $b ) => $b['t'] === 'img' ) );
	$pp = APEX_POST_PHOTOS[ $key ] ?? [];
	$extra_keys = $imgN === 0 && $long ? $pp : ( $imgN <= 1 && $tl > 9000 ? array_slice( $pp, 0, 2 ) : [] );
	$extra = array_values( array_filter( array_map( fn( $k ) => apex_ph( $k ), $extra_keys ) ) );
	$quotes = ( $D['cat'] ?? '' ) === 'review' ? apex_spoken( array_slice( $paras, 1 ) ) : [];
	if ( ! $quotes && $long ) { $q = apex_pick_quote( array_slice( $paras, 1 ), false ); if ( $q !== '' ) $quotes[] = $q; }
	$quotes = array_slice( $quotes, 0, $tl > 6000 ? 2 : 1 );
	$heads = [];
	foreach ( $bl as $i => $b ) if ( ( $b['t'] === 'h2' || $b['t'] === 'h3' ) && $i > 2 ) $heads[] = $i;
	$ins = [];
	$used = [];
	$slot = function ( $frac ) use ( $heads, &$used ) {
		if ( ! $heads ) return null;
		$k = min( count( $heads ) - 1, (int) floor( $frac * count( $heads ) ) );
		while ( isset( $used[ $heads[ $k ] ] ) && $k < count( $heads ) - 1 ) $k++;
		$used[ $heads[ $k ] ] = true;
		return $heads[ $k ];
	};
	foreach ( $extra as $j => $img ) { $at = $slot( ( $j + 1 ) / ( count( $extra ) + 1 ) ); if ( $at !== null ) $ins[ $at ][] = apex_figure( $img, $j % 2 ? 'side' : 'wide' ); }
	foreach ( $quotes as $j => $q ) { $at = $slot( $j ? .78 : .42 ); if ( $at !== null ) $ins[ $at ][] = apex_pull_quote( $q, $j % 2 ? 'alt' : '' ); }
	if ( $proc ) {
		$p2 = -1; $seen = 0;
		foreach ( $bl as $i => $b ) { if ( $b['t'] === 'p' && $seen === 1 ) { $p2 = $i; break; } if ( $b['t'] === 'p' ) $seen++; }
		$at = $p2 > 0 ? $p2 + 1 : ( ( $heads[0] ?? 0 ) ?: 1 );
		$ins[ $at ][] = apex_facts_box( $proc, $S );
	}
	$nh2 = count( array_filter( $bl, fn( $b ) => $b['t'] === 'h2' ) );
	$nh3 = count( array_filter( $bl, fn( $b ) => $b['t'] === 'h3' ) );
	$useH3 = $nh2 < 3 && $nh3 >= 3;
	$toc = [];
	$html = '';
	$firstP = true;
	$n = count( $bl );
	for ( $i = 0; $i < $n; $i++ ) {
		foreach ( $ins[ $i ] ?? [] as $x ) $html .= $x;
		$b = $bl[ $i ];
		switch ( $b['t'] ) {
			case 'h2': case 'h3':
				$isToc = $b['t'] === 'h2' || $useH3;
				$id = $isToc ? 's-' . count( $toc ) : '';
				if ( $isToc ) $toc[] = [ 'id' => $id, 'x' => $b['x'] ];
				if ( preg_match( '/^(\d{1,2})[.)]\s*(.+)$/su', (string) $b['x'], $m ) ) $html .= '<' . $b['t'] . ' ' . ( $id ? 'id="' . $id . '" ' : '' ) . 'class="qnum"><span class="qn" aria-hidden="true">' . $m[1] . '</span><span class="qt"><span class="sr">' . $m[1] . '. </span>' . $E( $m[2] ) . '</span></' . $b['t'] . '>';
				else $html .= '<' . $b['t'] . ( $id ? ' id="' . $id . '"' : '' ) . '>' . $E( $b['x'] ) . '</' . $b['t'] . '>';
				break;
			case 'h4': case 'h5': case 'h6': $html .= '<' . $b['t'] . '>' . $E( $b['x'] ) . '</' . $b['t'] . '>'; break;
			case 'p': $html .= '<p class="' . ( $firstP ? 'lede' : '' ) . ( ! empty( $b['b'] ) ? ' b' : '' ) . '">' . apex_inl( $b['x'] ) . '</p>'; $firstP = false; break;
			case 'list':
				$items = array_map( fn( $li ) => is_array( $li ) ? ( $li['x'] ?? '' ) : $li, $b['items'] ?? [] );
				$lab = count( array_filter( $items, fn( $x ) => apex_split_label( $x )[0] ) );
				$cnt = count( $items );
				if ( $cnt >= 3 && $lab >= $cnt - 1 && apex_len( implode( '', $items ) ) / $cnt > 70 ) {
					$html .= '<ul class="li-cards">' . implode( '', array_map( function ( $x, $j ) { [ $l, $t ] = apex_split_label( $x ); return '<li><span class="lc-ic">' . apex_ic( apex_pick_icon( $l ?? $x, $j ) ) . '</span><div>' . ( $l ? '<b>' . apex_e( $l ) . '</b><p>' . apex_inl( $t ) . '</p>' : '<p>' . apex_inl( $t ) . '</p>' ) . '</div></li>'; }, $items, array_keys( $items ) ) ) . '</ul>';
				} else {
					$tag = ! empty( $b['o'] ) ? 'ol' : 'ul';
					$html .= "<$tag>" . implode( '', array_map( fn( $x ) => '<li>' . apex_fmt_li( $x ) . '</li>', $items ) ) . "</$tag>";
				}
				break;
			case 'img':
				$run = [];
				while ( $i < $n && $bl[ $i ]['t'] === 'img' ) { if ( ! empty( $bl[ $i ]['src'] ) ) $run[] = $bl[ $i ]; $i++; }
				$i--;
				if ( count( $run ) === 1 ) $html .= apex_figure( [ 'src' => $run[0]['src'], 'alt' => ( $run[0]['alt'] ?? '' ) ?: $D['title'] ], 'wide', false );
				elseif ( count( $run ) > 1 ) {
					$g = apex_gallery();
					$html .= '<div class="art-gal n' . min( count( $run ), 3 ) . ' rv">' . implode( '', array_map( fn( $rr, $j ) => '<button type="button" class="ag-i ph-img" ' . apex_gattr( $g, $j ) . ' aria-label="' . apex_e( apex_t( 'image' ) ) . ' ' . ( $j + 1 ) . '"><img src="' . esc_url( apex_img( $rr['src'] ) ) . '" alt="' . apex_e( ( $rr['alt'] ?? '' ) ?: $D['title'] ) . '" loading="lazy" decoding="async" decoding="async"></button>', $run, array_keys( $run ) ) ) . '</div>';
				}
				break;
			case 'yt': $html .= '<div class="ytbox"><button type="button" data-yt="' . apex_e( $b['id'] ) . '" aria-label="' . $E( $T( 'playVideo' ) ) . '"><img loading="lazy" decoding="async" src="' . esc_url( apex_yt( $b['id'] ) ) . '" alt=""><span class="pl">' . $I( 'play' ) . '</span></button></div>'; break;
			case 'faqs': $html .= apex_faq_html( $b['items'] ?? [] ); break;
			case 'table': $html .= '<div class="tbl"><table>' . implode( '', array_map( fn( $row, $j ) => '<tr>' . implode( '', array_map( fn( $c ) => $j === 0 ? '<th>' . apex_inl( $c ) . '</th>' : '<td>' . apex_inl( $c ) . '</td>', $row ) ) . '</tr>', $b['rows'] ?? [], array_keys( $b['rows'] ?? [] ) ) ) . '</table></div>'; break;
			case 'btn': if ( ! empty( $b['h'] ) ) $html .= '<p><a class="btn btn-plum btn-sm" href="' . esc_url( $b['h'] ) . '" target="_blank" rel="noopener">' . $E( $b['x'] ?? '' ) . '</a></p>'; break;
		}
	}
	foreach ( $ins[ $n ] ?? [] as $x ) $html .= $x;
	return [ 'html' => $html, 'toc' => $toc, 'mins' => apex_read_mins( $total ), 'proc' => $proc ];
}
function apex_page_article( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $P = apex_data( 'posts' ) ?: [];
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$key = ( $r['params']['p'] ?? '' ) ?: ( $P[0]['key'] ?? '' );
	$D = apex_data( 'post:' . $key );
	if ( ! $D ) return apex_phead( $T( 'notFoundH' ), $T( 'loadError' ), [ apex_home_crumb(), [ $T( 'articles' ), 'blog.html' ] ] );
	$catName = apex_cat_label( $D['cat'] ?? null );
	$crumbs = [ apex_home_crumb(), [ $T( 'articles' ), 'blog.html' ], [ $catName, 'blog.html?c=' . ( $D['cat'] ?? '' ) ] ];
	$related = array_slice( array_values( array_filter( $P, fn( $p ) => $p['key'] !== $key && $p['cat'] === ( $D['cat'] ?? '' ) ) ), 0, 3 );
	$body = apex_article_body( $D, $key, $S );
	$hasToc = count( $body['toc'] ) > 2;
	$tocH = $hasToc ? '<nav class="toc art-toc" id="toc" aria-label="' . $E( $T( 'inArticle' ) ) . '"><p class="toc-h">' . $E( $T( 'inArticle' ) ) . '</p>' . implode( '', array_map( fn( $x ) => '<a href="#' . $x['id'] . '">' . $E( $x['x'] ) . '</a>', $body['toc'] ) ) . '</nav>' : '';
	return '
      <section class="art-head"><div class="phead-lines" aria-hidden="true"></div><div class="sh-glow" aria-hidden="true"></div><div class="wrap">' . apex_crumbs( $crumbs ) . '
        <p class="art-meta rv"><span class="pc-cat">' . $E( $catName ) . '</span>' . ( ! empty( $D['date'] ) ? '<time datetime="' . $E( $D['date'] ) . '">' . $E( apex_fmt_date( $D['date'] ) ) . '</time>' : '' ) . '<span class="art-read">' . $I( 'clock' ) . $E( str_replace( '{n}', (string) $body['mins'], $T( 'readMin' ) ) ) . '</span></p>
        <h1 class="h-xl rv" data-d="60" data-field="post.title">' . $E( $D['title'] ) . '</h1>
</div></section>
      ' . ( ! empty( $D['img'] ) ? '<figure class="art-banner ph-img rv-clip wrap-mid"><img src="' . esc_url( apex_img( $D['img'] ) ) . '"' . apex_srcset( $D['img'], '(max-width: 900px) 135vw, 1100px' ) . ' alt="' . $E( $D['title'] ) . '" data-par="22" fetchpriority="high"></figure>' : '' ) . '
      <section class="section art-s"><div class="wrap art-grid' . ( $hasToc ? '' : ' notoc' ) . '">' . $tocH . '<article class="prose art-prose" id="body" data-field="post.blocks">' . $body['html'] . ( ! empty( $D['tags'] ) ? '<div class="art-tags">' . implode( '', array_map( fn( $t ) => '<span class="o-tag">' . $E( $t ) . '</span>', $D['tags'] ) ) . '</div>' : '' ) . '</article></div></section>
      ' . ( $related ? '<section class="section washed"><div class="wrap"><div class="shead"><h2 class="h-l rv">' . $E( $catName ) . '</h2><a class="link-arrow rv" href="' . esc_url( apex_link( 'blog.html' ) ) . '">' . $E( $T( 'backToArticles' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div><div class="post-grid">' . implode( '', array_map( 'apex_post_card', $related, array_keys( $related ) ) ) . '</div></div></section>' : '' ) . '
      <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
}

/* SURGERY WARS */
function apex_war_url( $n ): string { return apex_link( 'surgery-wars.html?ep=' . $n ); }
function apex_nb( $t ): string {
	if ( apex_L() !== 'th' ) return apex_e( $t );
	return implode( ' ', array_map( fn( $w ) => '<span class="nw">' . apex_e( $w ) . '</span>', array_values( array_filter( preg_split( '/\s+/u', (string) $t ), 'strlen' ) ) ) );
}
function apex_war_src( $s ): string { $s = (string) $s; return $s !== '' && ! preg_match( '#^(https?:|~/)#', $s ) ? apex_asset( $s ) : $s; }
function apex_war_card( array $e, int $i = 0 ): string {
	return '<a class="war-card rv" data-d="' . ( ( $i % 4 ) * 60 ) . '" href="' . esc_url( apex_war_url( $e['n'] ) ) . '">
      <span class="wc-ph ph-img"><img src="' . esc_url( apex_img( apex_war_src( $e['cover'] ?? '' ) ) ) . '" alt="" loading="lazy" decoding="async" width="640" height="336"><span class="wc-ep">EP.' . $e['n'] . '</span><span class="wc-pl" aria-hidden="true">' . apex_ic( 'play' ) . '</span></span>
      <span class="wc-t">' . apex_nb( $e['title'] ?? '' ) . '</span></a>';
}
const APEX_WAR_PROC = [ [ 'facelift', '/ดึงหน้า|ดึงคอ|face ?lift|neck lift/iu' ], [ 'browlift', '/ยกคิ้ว|ยกหน้าผาก|brow lift|forehead lift/iu' ], [ 'rhinoplasty', '/เสริมจมูก|แก้จมูก|rhinoplasty/iu' ],
	[ 'eyelid', '/ตาสองชั้น|ทำตา|ตาบน|หนังตา|eyelid/iu' ], [ 'breast', '/เสริมหน้าอก|ยกกระชับหน้าอก|breast (augmentation|lift)/iu' ], [ 'lipo', '/ดูดไขมัน|liposuction/iu' ] ];
function apex_war_stage( array $e, array $D ): string {
	$w = str_replace( '{n}', (string) $e['n'], apex_t( 'warWatch' ) );
	return '<div class="war-stage rv-clip"><button type="button" class="ws-poster" data-ytw="' . apex_e( ( $D['yt'] ?? '' ) ?: ( $e['yt'] ?? '' ) ) . '" aria-label="' . apex_e( $w ) . '">
      <img src="' . esc_url( apex_img( apex_war_src( $e['img'] ?? '' ) ) ) . '" alt="' . apex_e( $D['title'] ) . '" width="1200" height="630" fetchpriority="high"><span class="ws-play">' . apex_ic( 'play' ) . '<span>' . apex_e( $w ) . '</span></span></button></div>';
}
function apex_page_war( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $W = apex_data( 'war' ) ?: []; $eps = $W['episodes'] ?? [];
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$n = (int) ( $r['params']['ep'] ?? 0 );
	$e = null; $i0 = -1;
	foreach ( $eps as $i => $x ) if ( $x['n'] === $n ) { $e = $x; $i0 = $i; break; }
	if ( ! $e ) {
		$stack = '';
		foreach ( array_values( array_filter( [ $eps[7] ?? null, $eps[3] ?? null, $eps[0] ?? null ] ) ) as $i => $x ) $stack .= '<img class="whs-' . $i . '" src="' . esc_url( apex_img( apex_war_src( $x['cover'] ?? '' ) ) ) . '" alt="" width="640" height="336">';
		return '
      <section class="war-head night"><div class="hb-glow" aria-hidden="true"></div><div class="wrap wh-grid"><div class="wh-copy">
        ' . apex_crumbs( [ apex_home_crumb(), [ $T( 'war' ) ] ] ) . '
        <p class="eyebrow on-night rv">Workpoint 23</p>
        <h1 class="display-s rv" data-d="60">' . apex_nb( $T( 'warH' ) ) . '</h1>
        <p class="lead rv" data-d="120">' . $E( $T( 'warLead' ) ) . '</p>
        ' . ( $eps ? '<a class="btn btn-light rv" data-d="180" href="' . esc_url( apex_war_url( $eps[0]['n'] ) ) . '">' . $I( 'play' ) . $E( $T( 'warStart' ) ) . '</a>' : '' ) . '</div>
        <div class="wh-stack" aria-hidden="true">' . $stack . '</div>
      </div></section>
      <section class="section war-list"><div class="wrap"><div class="war-grid">' . implode( '', array_map( 'apex_war_card', $eps, array_keys( $eps ) ) ) . '</div></div></section>
      <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
	}
	$D = apex_data( 'war:' . $n );
	if ( ! $D ) return apex_phead( $T( 'notFoundH' ), $T( 'loadError' ), [ apex_home_crumb(), [ $T( 'war' ), 'surgery-wars.html' ] ] );
	$blocks = array_map( fn( $b ) => $b['t'] === 'img' ? array_merge( $b, [ 'src' => apex_war_src( $b['src'] ?? '' ) ] ) : $b, $D['blocks'] ?? [] );
	$photos = array_values( array_filter( $blocks, fn( $b ) => $b['t'] === 'img' ) );
	$bodyBlocks = ( $blocks[0]['t'] ?? '' ) === 'img' ? array_slice( $blocks, 1 ) : $blocks;
	$body = apex_article_body( [ 'title' => $D['title'], 'cat' => 'review', 'noFacts' => true, 'blocks' => $bodyBlocks ], 'war-' . $n, $S );
	$text = wp_json_encode( $D['blocks'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	$procs = [];
	foreach ( APEX_WAR_PROC as [ $k, $re ] ) if ( preg_match( $re, $text ) ) $procs[] = $k;
	$g = apex_gallery();
	$prev = $eps[ $i0 - 1 ] ?? null; $next = $eps[ $i0 + 1 ] ?? null;
	$crumbs = [ apex_home_crumb(), [ $T( 'war' ), 'surgery-wars.html' ], [ 'EP.' . $n ] ];
	$hasToc = count( $body['toc'] ) > 2;
	$epsNav = implode( '', array_map( fn( $x ) => '<a href="' . esc_url( apex_war_url( $x['n'] ) ) . '"' . ( $x['n'] === $n ? ' aria-current="page"' : '' ) . '>EP.' . $x['n'] . '</a>', $eps ) );
	$ph = implode( '', array_map( fn( $p, $j ) => '<button type="button" class="wp-th ph-img" ' . apex_gattr( $g, $j ) . ' aria-label="' . apex_e( apex_t( 'image' ) ) . ' ' . ( $j + 1 ) . '"><img src="' . esc_url( apex_img( $p['src'] ) ) . '" alt="' . apex_e( $p['alt'] ?? '' ) . '" loading="lazy" decoding="async" width="1200" height="630"></button>', $photos, array_keys( $photos ) ) );
	$others = array_values( array_filter( $eps, fn( $x ) => $x['n'] !== $n ) );
	return '
      <section class="art-head war-ep-head"><div class="phead-lines" aria-hidden="true"></div><div class="sh-glow" aria-hidden="true"></div><div class="wrap">' . apex_crumbs( $crumbs ) . '
        <p class="art-meta rv"><span class="pc-cat">Surgery Wars · EP.' . $n . '</span><span>Workpoint 23</span><span class="art-read">' . $I( 'clock' ) . $E( str_replace( '{n}', (string) $body['mins'], $T( 'readMin' ) ) ) . '</span></p>
        <h1 class="h-l rv" data-d="60">' . apex_nb( $D['title'] ) . '</h1></div></section>
      <div class="wrap-mid war-top">
        ' . apex_war_stage( $e, $D ) . '
        <nav class="war-eps" aria-label="' . $E( $T( 'warAll' ) ) . '">' . $epsNav . '</nav>
        ' . ( $photos ? '<div class="war-photos"><p class="wp-h">' . $I( 'image' ) . '<span>' . $E( $T( 'warPhotos' ) ) . '</span><i>' . count( $photos ) . '</i></p><div class="wp-rail">' . $ph . '</div></div>' : '' ) . '
      </div>
      <section class="section art-s war-art"><div class="wrap art-grid' . ( $hasToc ? '' : ' notoc' ) . '">' . ( $hasToc ? '<nav class="toc art-toc" id="toc" aria-label="' . $E( $T( 'inArticle' ) ) . '"><p class="toc-h">' . $E( $T( 'inArticle' ) ) . '</p>' . implode( '', array_map( fn( $x ) => '<a href="#' . $x['id'] . '">' . $E( $x['x'] ) . '</a>', $body['toc'] ) ) . '</nav>' : '' ) . '<article class="prose art-prose" id="body">' . $body['html'] . '
        ' . ( $procs ? '<aside class="war-procs rv"><p class="facts-h">' . $I( 'stethoscope' ) . '<span>' . $E( $T( 'warProcs' ) ) . '</span></p><div class="wpr-l">' . implode( '', array_map( fn( $k ) => '<a class="chip" href="' . esc_url( apex_svc_url( $k ) ) . '">' . apex_e( apex_svc_name( $S, $k ) ) . apex_ic( 'arrow-right' ) . '</a>', $procs ) ) . '</div><p class="note">' . $E( $T( 'resultsVary' ) ) . '</p></aside>' : '' ) . '</article></div></section>
      <section class="section washed war-more"><div class="wrap">
        <div class="war-pn">' . ( $prev ? '<a class="wpn prev" href="' . esc_url( apex_war_url( $prev['n'] ) ) . '"><small>' . $I( 'arrow-left' ) . $E( $T( 'warPrev' ) ) . '</small><b>EP.' . $prev['n'] . ' ' . $E( $prev['title'] ) . '</b></a>' : '<span></span>' ) . ( $next ? '<a class="wpn next" href="' . esc_url( apex_war_url( $next['n'] ) ) . '"><small>' . $E( $T( 'warNext' ) ) . $I( 'arrow-right' ) . '</small><b>EP.' . $next['n'] . ' ' . $E( $next['title'] ) . '</b></a>' : '' ) . '</div>
        <div class="shead"><h2 class="h-l rv">' . $E( $T( 'warAll' ) ) . '</h2><a class="link-arrow rv" href="' . esc_url( apex_link( 'surgery-wars.html' ) ) . '">' . $E( $T( 'warH' ) ) . ' ' . $I( 'arrow-right' ) . '</a></div>
        <div class="war-grid sm">' . implode( '', array_map( 'apex_war_card', $others, array_keys( $others ) ) ) . '</div></div></section>
      <section class="section night"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>';
}

/* CONTACT */
function apex_page_contact( array $r ): string {
	$S = apex_data( 'shared' ) ?: []; $D = apex_data( 'contact' ) ?: [];
	$E = 'apex_e'; $T = 'apex_t'; $I = 'apex_ic';
	$WA = apex_wa();
	$ch = '';
	foreach ( $S['branches'] ?? [] as $i => $b ) $ch .= '<a class="chan rv" data-d="' . ( 120 + $i * 60 ) . '" href="' . esc_url( ( $b['tel'] ?? '' ) ) . '"><span class="chan-ic">' . $I( 'phone' ) . '</span><span><b>' . $E( $b['phone'] ?? '' ) . '</b><small>' . $E( ( $b['short'] ?? '' ) ?: $b['name'] ) . '</small></span>' . $I( 'arrow-up-right' ) . '</a>';
	$soc = '';
	foreach ( array_filter( $S['socials'] ?? [], fn( $s ) => $s['k'] !== 'line' ) as $s ) $soc .= '<a class="chan sm rv" href="' . esc_url( $s['h'] ) . '" target="_blank" rel="noopener"><span class="chan-ic">' . apex_soc_icon( $s['k'] ) . '</span><span><b>' . $E( $s['x'] ?? '' ) . '</b></span>' . $I( 'arrow-up-right' ) . '</a>';
	return apex_phead( ( $D['h1'] ?? '' ) ?: $T( 'contact' ), null, [ apex_home_crumb(), [ $T( 'contact' ) ] ] ) . '
      <section class="section" style="padding-top:50px"><div class="wrap contact2">
        <div class="channels">
          <a class="chan rv" href="' . esc_url( ( ( $S['line']['h'] ?? '' ) ?: '#' ) ) . '" target="_blank" rel="noopener"><span class="chan-ic ln">' . $I( 'line' ) . '</span><span><b>LINE</b><small>' . $E( $S['line']['x'] ?? '' ) . '</small></span><img class="chan-qr" src="' . esc_url( apex_img( $S['line']['qr'] ?? '' ) ) . '" alt="LINE QR" loading="lazy" decoding="async" decoding="async"></a>
          <a class="chan rv" data-d="60" href="' . esc_url( $WA['h'] ) . '" target="_blank" rel="noopener"><span class="chan-ic wa">' . $I( 'whatsapp' ) . '</span><span><b>WhatsApp</b><small>' . $E( $T( 'whatsappSub' ) ) . ' · ' . $E( $WA['x'] ) . '</small></span>' . $I( 'arrow-up-right' ) . '</a>
          ' . $ch . '
          ' . $soc . '
        </div>
        <div class="consult-col"><div id="consult" class="consult-host"><h2 class="h-l">' . $E( ( $D['formH'] ?? '' ) ?: $T( 'consultPageH' ) ) . '</h2><p class="muted">' . $E( $T( 'consultPageP' ) ) . '</p><a class="btn btn-plum" href="' . esc_url( apex_link( 'consult.html' ) ) . '">' . $I( 'message-circle' ) . $E( $T( 'consultBtn' ) ) . '</a></div></div>
      </div></section>
      <section class="section washed"><div class="wrap">' . apex_branches( $S, $D['branches']['h'] ?? null, $D['branches']['p'] ?? null ) . '</div></section>';
}

/* FEATURE PAGES: a heading and an empty host the module fills in the browser */
const APEX_FEATURES = [
	'nose' => [ 'nose', 'nosePageH', 'nosePageP', 'nose', 'night-s' ],
	'proportions' => [ 'proportions', 'propPageH', 'propPageP', 'proportions', 'prop-s' ],
	'analysis' => [ 'analysis', 'anaPageH', 'anaPageP', 'analysis', 'prop-s' ],
	'play' => [ 'games', 'playPageH', 'playPageP', 'games', 'play-s' ],
	'implBreast' => [ 'implants', 'implBreastH', 'implBreastP', 'implants', 'prop-s' ],
	'implChin' => [ 'implants', 'implChinH', 'implChinP', 'implants', 'prop-s' ],
	'implForehead' => [ 'implants', 'implForeheadH', 'implForeheadP', 'implants', 'prop-s' ],
	'implNose' => [ 'implants', 'implNoseH', 'implNoseP', 'implants', 'prop-s' ],
	'plan' => [ 'plan', 'planPageH', 'planPageP', 'plan', '' ],
	'trip' => [ 'trip', 'tripPageH', 'tripP', 'trip', '' ],
	'consult' => [ 'consult', 'consultPageH', 'consultPageP', 'consult', '' ],
];
function apex_page_feature( string $page ): string {
	[ $name, $h, $p, $host, $cls ] = APEX_FEATURES[ $page ];
	$S = apex_data( 'shared' ) ?: [];
	return apex_phead( apex_t( $h ), $p ? apex_t( $p ) : null, [ apex_home_crumb(), [ apex_t( $h ) ] ] ) . '<section class="section feat-s ' . $cls . '"><div class="wrap"><div id="' . $host . '" class="feat-page-host"></div></div></section>
      ' . ( $name === 'plan' || $name === 'consult' ? '' : '<section class="section washed"><div class="wrap">' . apex_consult_band( $S ) . '</div></section>' );
}

/* any other WordPress page (privacy policy and the like): a heading and its text */
function apex_password_page( int $id ): string {
	return apex_phead( get_the_title( $id ), null, [ apex_home_crumb(), [ get_the_title( $id ) ] ] ) . '<section class="section"><div class="wrap prose">' . get_the_password_form( $id ) . '</div></section>';
}
function apex_page_page( array $r ): string {
	$p = apex_post( $r['id'] );
	if ( ! $p ) return apex_page_notfound( $r );
	if ( post_password_required( $p ) ) return apex_password_page( $p->ID );
	$blocks = apex_markup_to_blocks( $p->post_content );
	$html = '';
	foreach ( $blocks as $b ) {
		switch ( $b['t'] ) {
			case 'h2': case 'h3': $html .= '<' . $b['t'] . '>' . apex_e( $b['x'] ) . '</' . $b['t'] . '>'; break;
			case 'h4': case 'h5': case 'h6': $html .= '<' . $b['t'] . '>' . apex_e( $b['x'] ) . '</' . $b['t'] . '>'; break;
			case 'p': $html .= '<p' . ( ! empty( $b['b'] ) ? ' class="b"' : '' ) . '>' . apex_inl( $b['x'] ) . '</p>'; break;
			case 'list': $tag = ! empty( $b['o'] ) ? 'ol' : 'ul'; $html .= "<$tag>" . implode( '', array_map( fn( $x ) => '<li>' . apex_fmt_li( $x ) . '</li>', $b['items'] ?? [] ) ) . "</$tag>"; break;
			case 'img': if ( ! empty( $b['src'] ) ) $html .= '<figure class="ph-img"><img loading="lazy" decoding="async" src="' . esc_url( apex_img( $b['src'] ) ) . '" alt="' . apex_e( $b['alt'] ?? '' ) . '"></figure>'; break;
			case 'faqs': $html .= apex_faq_html( $b['items'] ?? [] ); break;
			case 'table': $html .= '<div class="tbl"><table>' . implode( '', array_map( fn( $row, $j ) => '<tr>' . implode( '', array_map( fn( $c ) => $j === 0 ? '<th>' . apex_inl( $c ) . '</th>' : '<td>' . apex_inl( $c ) . '</td>', $row ) ) . '</tr>', $b['rows'] ?? [], array_keys( $b['rows'] ?? [] ) ) ) . '</table></div>'; break;
		}
	}
	$tpl = get_page_template_slug( $p->ID );
	return apex_phead( get_the_title( $p ), null, [ apex_home_crumb(), [ get_the_title( $p ) ] ] ) . '<section class="section"><div class="wrap"><div class="prose art-prose' . ( $tpl === 'apex-wide' ? ' wide' : '' ) . '">' . $html . '</div></div></section>'
		. ( $tpl === 'apex-consult' ? '<section class="section washed"><div class="wrap">' . apex_consult_band( apex_data( 'shared' ) ?: [] ) . '</div></section>' : '' );
}
/* Page attributes › Template, for pages without a design of their own (privacy policy, a landing page) */
add_filter( 'theme_page_templates', fn( $t ) => $t + [ 'apex-wide' => __( 'Wide text', 'apex' ), 'apex-consult' => __( 'Text, then the consultation band', 'apex' ) ] );

/* 404 */
function apex_page_notfound( array $r ): string {
	$E = 'apex_e'; $T = 'apex_t';
	return '<section class="phead nf"><div class="phead-lines" aria-hidden="true"></div><div class="wrap"><p class="nf-code rv">404</p><h1 class="display-s rv">' . $E( $T( 'notFoundH' ) ) . '</h1><p class="lead rv" style="margin-top:18px">' . $E( $T( 'notFoundP' ) ) . '</p>
      <div class="nf-links rv"><a class="btn btn-light" href="' . esc_url( apex_link( 'index.html' ) ) . '">' . $E( $T( 'goHome' ) ) . '</a><a class="btn btn-ghost" href="' . esc_url( apex_link( 'services.html' ) ) . '">' . $E( $T( 'services' ) ) . '</a><a class="btn btn-ghost" href="' . esc_url( apex_link( 'blog.html' ) ) . '">' . $E( $T( 'articles' ) ) . '</a><a class="btn btn-ghost" href="' . esc_url( apex_link( 'contact.html' ) ) . '">' . $E( $T( 'contact' ) ) . '</a></div></div></section>';
}
