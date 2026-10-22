<?php
/**
 * Google Tag Manager with Google Consent Mode v2, and the cookie banner Thai PDPA asks for.
 * Nothing that stores analytics or advertising cookies runs until the visitor accepts; Tag Manager loads
 * straight away with everything denied, so tags that respect consent (GA4, Google Ads) wait for the choice.
 * The site's own events (apex_* in dataLayer, see assets/js/core.js A.emit) go to the same dataLayer.
 * Apex settings › Tracking sets the container ID; empty turns tracking off.
 */
defined( 'ABSPATH' ) || exit;

function apex_gtm_id(): string {
	$v = get_option( 'apex_gtm', 'GTM-WJQF6Z62' );
	return preg_match( '/^GTM-[A-Z0-9]{4,12}$/', (string) $v ) ? $v : '';
}

/* consent defaults and the container, first thing in the head */
add_action( 'wp_head', function () {
	if ( is_admin() ) return;
	$id = apex_gtm_id();
	?>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
(function(){var c=null;try{c=JSON.parse(localStorage.getItem('apex_consent')||'null');}catch(e){}
var g=c&&c.v===1?c:null,a=g&&g.analytics?'granted':'denied',m=g&&g.ads?'granted':'denied';
gtag('consent','default',{ad_storage:m,ad_user_data:m,ad_personalization:m,analytics_storage:a,functionality_storage:'granted',security_storage:'granted',wait_for_update:500});
gtag('set','ads_data_redaction',m==='denied');gtag('set','url_passthrough',true);})();
</script>
<?php if ( $id ) : ?>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','<?php echo esc_js( $id ); ?>');</script>
<?php endif;
}, 1 );
add_action( 'wp_body_open', function () {
	$id = apex_gtm_id();
	if ( $id ) echo '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' . esc_attr( $id ) . '" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>';
} );

/* the banner: shown until the visitor chooses; "Cookie settings" in the footer brings it back */
add_action( 'wp_footer', function () {
	if ( is_admin() ) return;
	$th = apex_lang() === 'th';
	$t = $th ? [
		'h' => 'คุกกี้บนเว็บไซต์นี้',
		'p' => 'เราใช้คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงาน และขออนุญาตใช้คุกกี้วิเคราะห์การใช้งานและคุกกี้โฆษณาเพื่อปรับปรุงเว็บไซต์และวัดผลโฆษณา คุณเปลี่ยนใจได้ทุกเมื่อที่ "ตั้งค่าคุกกี้" ท้ายหน้า',
		'all' => 'ยอมรับทั้งหมด', 'none' => 'ใช้เฉพาะที่จำเป็น', 'set' => 'เลือกเอง', 'save' => 'บันทึก',
		'an' => 'คุกกี้วิเคราะห์การใช้งาน', 'anP' => 'นับจำนวนผู้เข้าชมและหน้าที่ถูกเปิด',
		'ad' => 'คุกกี้โฆษณา', 'adP' => 'วัดผลโฆษณาบน Google และ Facebook',
		'link' => 'ตั้งค่าคุกกี้',
	] : [
		'h' => 'Cookies on this site',
		'p' => 'We use the cookies the site needs to work. With your permission we also use analytics cookies to improve the site and advertising cookies to measure our ads. You can change your mind any time under "Cookie settings" at the foot of the page.',
		'all' => 'Accept all', 'none' => 'Only necessary', 'set' => 'Choose', 'save' => 'Save',
		'an' => 'Analytics cookies', 'anP' => 'Count visits and the pages people open',
		'ad' => 'Advertising cookies', 'adP' => 'Measure our ads on Google and Facebook',
		'link' => 'Cookie settings',
	];
	?>
<div class="ck" id="apex-ck" role="dialog" aria-modal="false" aria-labelledby="apex-ck-h" hidden>
  <div class="ck-in"><p class="ck-h" id="apex-ck-h"><?php echo esc_html( $t['h'] ); ?></p><p class="ck-p"><?php echo esc_html( $t['p'] ); ?></p>
  <div class="ck-opts" hidden><label><input type="checkbox" name="analytics"> <b><?php echo esc_html( $t['an'] ); ?></b><small><?php echo esc_html( $t['anP'] ); ?></small></label><label><input type="checkbox" name="ads"> <b><?php echo esc_html( $t['ad'] ); ?></b><small><?php echo esc_html( $t['adP'] ); ?></small></label></div>
  <div class="ck-acts"><button type="button" class="btn btn-plum btn-sm" data-ck="all"><?php echo esc_html( $t['all'] ); ?></button><button type="button" class="btn btn-ghost on-light btn-sm" data-ck="none"><?php echo esc_html( $t['none'] ); ?></button><button type="button" class="ck-set" data-ck="set"><?php echo esc_html( $t['set'] ); ?></button><button type="button" class="btn btn-plum btn-sm" data-ck="save" hidden><?php echo esc_html( $t['save'] ); ?></button></div></div>
</div>
<style>
.ck{position:fixed;z-index:120;left:16px;right:16px;bottom:16px;max-width:560px;background:#fff;color:var(--ink,#2A1F33);border-radius:22px;box-shadow:0 18px 60px rgba(31,10,48,.28);border:1px solid var(--lilac-200,#E4D8EE)}
.ck-in{padding:20px 22px}.ck-h{font-weight:800;font-size:17px;margin:0 0 6px}.ck-p{font-size:14px;line-height:1.55;margin:0 0 14px;color:var(--ink-2,#5A4A66)}
.ck-acts{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.ck-set{background:none;border:0;padding:8px 4px;font:inherit;font-size:14px;font-weight:700;color:var(--plum,#6A388C);text-decoration:underline;cursor:pointer}
.ck-opts{display:grid;gap:10px;margin:0 0 14px}.ck-opts label{display:grid;grid-template-columns:22px 1fr;column-gap:8px;font-size:14px;cursor:pointer}.ck-opts small{grid-column:2;color:var(--ink-2,#5A4A66)}
.ck-opts input{width:18px;height:18px;margin:2px 0 0;accent-color:var(--plum,#6A388C)}
.ck-link{background:none;border:0;padding:0 6px;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;opacity:.8}
@media (max-width:520px){.ck{left:10px;right:10px;bottom:10px}.ck-acts .btn{flex:1 1 auto;justify-content:center}}
</style>
<script>
(function(){
  var box=document.getElementById('apex-ck'); if(!box) return;
  var K='apex_consent', opts=box.querySelector('.ck-opts'), save=box.querySelector('[data-ck=save]'), set=box.querySelector('[data-ck=set]');
  function read(){try{var c=JSON.parse(localStorage.getItem(K)||'null');return c&&c.v===1?c:null;}catch(e){return null;}}
  function write(a,m){var c={v:1,analytics:!!a,ads:!!m,at:Date.now()};try{localStorage.setItem(K,JSON.stringify(c));}catch(e){}
    document.cookie='apex_consent='+(a?'a':'')+(m?'m':'')+'-;path=/;max-age=15552000;SameSite=Lax';
    gtag('consent','update',{analytics_storage:a?'granted':'denied',ad_storage:m?'granted':'denied',ad_user_data:m?'granted':'denied',ad_personalization:m?'granted':'denied'});
    gtag('set','ads_data_redaction',!m);
    window.dataLayer.push({event:'apex_consent',apex:{analytics:!!a,ads:!!m}});
    box.hidden=true;}
  function open(){var c=read();box.hidden=false;opts.hidden=true;save.hidden=true;set.hidden=false;
    box.querySelector('[name=analytics]').checked=!!(c&&c.analytics);box.querySelector('[name=ads]').checked=!!(c&&c.ads);}
  box.addEventListener('click',function(e){var b=e.target.closest('[data-ck]');if(!b)return;var k=b.getAttribute('data-ck');
    if(k==='all')write(1,1);else if(k==='none')write(0,0);
    else if(k==='set'){opts.hidden=false;save.hidden=false;set.hidden=true;box.querySelector('[name=analytics]').focus();}
    else if(k==='save')write(box.querySelector('[name=analytics]').checked,box.querySelector('[name=ads]').checked);});
  if(!read()) open();
  function link(){var f=document.querySelector('.ftr-bot span');if(!f||document.querySelector('.ck-link'))return;
    var w=document.createElement('span'),a=document.createElement('button');w.className='ck-wrap';a.type='button';a.className='ck-link';a.textContent=<?php echo wp_json_encode( $t['link'], JSON_UNESCAPED_UNICODE ); ?>;a.addEventListener('click',open);w.append(' · ',a);f.append(w);}
  document.addEventListener('apex:ready',link);if(document.readyState!=='loading')link();else document.addEventListener('DOMContentLoaded',link);
})();
</script>
<?php
}, 50 );

/* Apex settings › Tracking */
add_action( 'admin_menu', function () {
	add_submenu_page( 'apex-settings', __( 'Tracking', 'apex' ), __( 'Tracking', 'apex' ), 'manage_options', 'apex-tracking', function () {
		if ( ! current_user_can( 'manage_options' ) ) return;
		if ( isset( $_POST['apex_gtm_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['apex_gtm_nonce'] ), 'apex_gtm' ) ) {
			$v = strtoupper( sanitize_text_field( wp_unslash( $_POST['apex_gtm'] ?? '' ) ) );
			update_option( 'apex_gtm', preg_match( '/^GTM-[A-Z0-9]{4,12}$/', $v ) ? $v : '', true );
			echo '<div class="notice notice-success"><p>' . esc_html__( 'Saved.', 'apex' ) . '</p></div>';
		}
		echo '<div class="wrap"><h1>' . esc_html__( 'Tracking', 'apex' ) . '</h1><form method="post"><table class="form-table"><tr><th><label for="apex-gtm">' . esc_html__( 'Google Tag Manager container', 'apex' ) . '</label></th><td><input id="apex-gtm" name="apex_gtm" class="regular-text" value="' . esc_attr( apex_gtm_id() ) . '" placeholder="GTM-XXXXXXX"><p class="description">' . esc_html__( 'Empty turns Tag Manager off. Analytics and ads tags in the container must use Consent Mode: they only store cookies after the visitor accepts in the cookie banner.', 'apex' ) . '</p></td></tr></table>';
		wp_nonce_field( 'apex_gtm', 'apex_gtm_nonce' );
		submit_button();
		echo '<h2>' . esc_html__( 'Events the site sends', 'apex' ) . '</h2><p>' . esc_html__( 'Every tool on the site pushes an event named apex_… to the dataLayer, for example apex_consult_submit, apex_contact_click, apex_plan_add, apex_games_voucher, apex_promo_ask. Use them as triggers in Tag Manager.', 'apex' ) . '</p></form></div>';
	} );
} );
