<?php
/**
 * The page around the content: which design page a request is, the document head, header, mobile menu,
 * footer and contact button, and the data the scripts read. A PHP copy of header(), footer() and fab() in
 * assets/js/core.js; the scripts find this markup in place and only attach behaviour to it.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', [ 'script', 'style' ] );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'editor-styles' );
	register_nav_menus( [] );
} );

/* Every front-end request goes through index.php, which calls apex_render(). */
add_filter( 'template_include', fn( $t ) => is_admin() || is_feed() || is_embed() ? $t : APEX_DIR . '/index.php', 99 );

/* ---------- routing: which design page this request is ---------- */
function apex_route(): array {
	static $r = null;
	if ( $r !== null ) return $r;
	$r = [ 'page' => 'notfound', 'params' => [], 'status' => 404, 'id' => 0 ];
	$o = get_queried_object();
	if ( is_front_page() || ( is_home() && ! get_option( 'page_for_posts' ) ) ) {
		$r = [ 'page' => 'home', 'params' => [], 'status' => 200, 'id' => (int) get_queried_object_id() ];
	} elseif ( is_page() && $o ) {
		$k = (string) get_post_meta( $o->ID, '_apex_page', true );
		$r = [ 'page' => $k !== '' && $k !== 'notfound' ? $k : 'page', 'params' => [], 'status' => 200, 'id' => $o->ID ];
	} elseif ( is_singular( 'apex_service' ) && $o ) {
		$r = [ 'page' => 'service', 'params' => [ 'p' => (string) get_post_meta( $o->ID, '_apex_key', true ) ], 'status' => 200, 'id' => $o->ID ];
	} elseif ( is_singular( 'post' ) && $o ) {
		$k = (string) get_post_meta( $o->ID, '_apex_key', true );
		if ( $k === '' ) $k = apex_ensure_key( $o->ID );
		$r = [ 'page' => 'article', 'params' => [ 'p' => $k ], 'status' => 200, 'id' => $o->ID ];
	} elseif ( is_singular( 'apex_episode' ) && $o ) {
		$r = [ 'page' => 'war', 'params' => [ 'ep' => (string) (int) get_post_meta( $o->ID, 'apex_n', true ) ], 'status' => 200, 'id' => $o->ID ];
	} elseif ( is_category() && $o ) {
		$c = get_term_meta( $o->term_id, '_apex_cat', true );
		$r = [ 'page' => 'blog', 'params' => $c ? [ 'c' => $c ] : [], 'status' => 200, 'id' => apex_page_id( 'blog' ) ];
	} elseif ( is_home() ) {
		$r = [ 'page' => 'blog', 'params' => [], 'status' => 200, 'id' => apex_page_id( 'blog' ) ];
	}
	// query parameters the design pages read (?c= on promotions and articles, ?p= on the trip planner and consultation)
	foreach ( [ 'c', 'p' ] as $k ) if ( ! isset( $r['params'][ $k ] ) && ( $v = apex_param( $k ) ) !== null ) $r['params'][ $k ] = $v;
	return $r;
}

/** The content objects a page reads, as pages.js asks for them. */
function apex_page_data_ids( array $r ): array {
	$ids = [ 'shared' ];
	$p = $r['params'];
	switch ( $r['page'] ) {
		case 'home': array_push( $ids, 'home', 'about', 'founder', 'war' ); break;
		case 'about': array_push( $ids, 'about', 'founder' ); break;
		case 'services': $ids[] = 'services'; break;
		case 'service': array_push( $ids, 'posts', 'svc:' . ( $p['p'] ?? '' ) ); break;
		case 'doctor': $ids[] = 'founder'; break;
		case 'promotions': $ids[] = 'promotions'; break;
		case 'reviews':
			array_push( $ids, 'reviews', 'posts', 'home' );
			foreach ( apex_data( 'posts' ) as $x ) if ( $x['cat'] === 'review' ) $ids[] = 'post:' . $x['key'];
			break;
		case 'blog': array_push( $ids, 'blogs', 'posts' ); break;
		case 'article': array_push( $ids, 'posts', 'post:' . ( $p['p'] ?? '' ) ); break;
		case 'war': $ids[] = 'war'; if ( ! empty( $p['ep'] ) ) $ids[] = 'war:' . $p['ep']; break;
		case 'contact': $ids[] = 'contact'; break;
		case 'privacy': $ids[] = 'privacy'; break;
	}
	return $ids;
}

/* ---------- addresses of this page in each language ---------- */
function apex_alternates(): array {
	$r = apex_route();
	$out = [];
	foreach ( APEX_LANGS as $l ) {
		$url = '';
		if ( $r['page'] === 'home' ) $url = apex_home_url( $l );
		elseif ( $r['id'] && function_exists( 'pll_get_post' ) && ! is_category() ) { $t = pll_get_post( $r['id'], $l ); $url = $t && get_post_status( $t ) === 'publish' ? get_permalink( $t ) : ''; }
		elseif ( is_category() && function_exists( 'pll_get_term' ) ) { $t = pll_get_term( get_queried_object_id(), $l ); $url = $t ? get_term_link( $t ) : ''; }
		elseif ( $r['id'] ) $url = get_permalink( $r['id'] );
		if ( is_wp_error( $url ) ) $url = '';
		$out[ $l ] = $url;
	}
	return $out;
}
/** The language switch link: the same page in the other language, or that language's home page. */
function apex_lang_href( string $code ): string {
	$alt = apex_alternates();
	$q = array_intersect_key( $GLOBALS['apex_route_q'] ?? [], array_flip( [ 'c' ] ) );
	return ( $alt[ $code ] ?: apex_home_url( $code ) ) . ( $q ? '?' . http_build_query( $q ) : '' );
}

/* ---------- header, menu, footer, contact button (core.js header(), footer(), fab()) ---------- */
const APEX_NAV = [ [ 'index.html', 'home' ], [ 'about.html', 'about' ], [ 'services.html', 'services' ], [ 'promotions.html', 'promotions' ], [ 'reviews.html', 'reviews' ], [ 'surgery-wars.html', 'war' ], [ 'blog.html', 'articles' ], [ 'contact.html', 'contact' ] ];
function apex_wa(): array {
	$S = apex_data( 'shared' );
	$w = $S['whatsapp'] ?? null;
	return $w && ! empty( $w['h'] ) ? [ 'x' => $w['x'] ?: $w['h'], 'h' => $w['h'] ] : [ 'x' => '+66 85 000 2001', 'h' => 'https://wa.me/66850002001' ];
}
function apex_langs_html(): string {
	$L = apex_lang();
	$o = '';
	foreach ( [ [ 'en', 'EN' ], [ 'th', 'TH' ] ] as [ $c, $t ] ) $o .= '<a href="' . esc_url( apex_lang_href( $c ) ) . '" hreflang="' . $c . '" lang="' . $c . '" class="' . ( $c === $L ? 'on' : '' ) . '"' . ( $c === $L ? ' aria-current="true"' : '' ) . '>' . $t . '</a>';
	return $o;
}
function apex_header_html( string $page ): string {
	$S = apex_data( 'shared' );
	$svcs = $S['services'] ?? [];
	$L = apex_lang();
	$nav = '';
	foreach ( APEX_NAV as [ $h, $k ] ) {
		$cur = $k === $page || ( $k === 'services' && $page === 'service' ) || ( $k === 'articles' && $page === 'article' ) ? ' aria-current="page"' : '';
		if ( $k === 'services' ) {
			$items = '';
			foreach ( $svcs as $s ) $items .= '<a class="mega-svc" href="' . esc_url( apex_svc_url( $s['key'] ) ) . '"><span class="ms-ic"><img src="' . esc_url( apex_img( $s['icon'] ) ) . '" alt="" loading="lazy" decoding="async" decoding="async"></span><span><b>' . apex_e( $s['short'] ?: $s['name'] ) . '</b><small>' . apex_e( $L === 'en' ? ( $s['name'] !== $s['en'] ? $s['en'] : '' ) : $s['en'] ) . '</small></span></a>';
			$nav .= '<div class="has-mega"><button type="button" aria-expanded="false"' . $cur . '>' . apex_e( apex_t( 'services' ) ) . apex_ic( 'chevron-down' ) . '</button>
          <div class="mega surg" role="menu"><div class="mega-svcs">' . $items . '</div>
          <div class="mega-tools"><h4>' . apex_e( apex_t( 'tools' ) ) . '</h4>
            <a href="' . esc_url( apex_link( 'nose.html' ) ) . '">' . apex_ic( 'scan-face' ) . apex_e( apex_t( 'nose' ) ) . '</a>
            <a href="' . esc_url( apex_link( 'analysis.html' ) ) . '">' . apex_ic( 'scan-line' ) . apex_e( apex_t( 'ana' ) ) . '</a>
            <a href="' . esc_url( apex_link( 'proportions.html' ) ) . '">' . apex_ic( 'gem' ) . apex_e( apex_t( 'prop' ) ) . '</a>
            <a href="' . esc_url( apex_link( 'breast-implants.html' ) ) . '">' . apex_ic( 'ruler' ) . apex_e( apex_t( 'impl' ) ) . '</a>
            <a href="' . esc_url( apex_link( 'play.html' ) ) . '">' . apex_ic( 'sparkles' ) . apex_e( apex_t( 'games' ) ) . '</a>
            <a href="' . esc_url( apex_link( 'trip.html' ) ) . '">' . apex_ic( 'calendar' ) . apex_e( apex_t( 'trip' ) ) . '</a>
            <a href="' . esc_url( apex_link( 'doctor.html' ) ) . '">' . apex_ic( 'stethoscope' ) . apex_e( apex_t( 'doctor' ) ) . '</a></div>
          <div class="mega-foot"><a class="link-arrow" href="' . esc_url( apex_link( 'services.html' ) ) . '">' . apex_e( apex_t( 'allServices' ) ) . ' ' . apex_ic( 'arrow-right' ) . '</a></div></div></div>';
		} else {
			$nav .= '<a href="' . esc_url( apex_link( $h ) ) . '"' . $cur . '>' . apex_e( apex_t( $k ) ) . '</a>';
		}
	}
	$langs = apex_langs_html();
	return '<header class="hdr' . ( empty( $S['logo'] ) ? ' no-logo' : '' ) . '"><a class="skip" href="#main">' . apex_e( apex_t( 'skip' ) ) . '</a><div class="hdr-in">
      <a class="hdr-logo" href="' . esc_url( apex_link( 'index.html' ) ) . '" aria-label="Apex Surgery Hospital"><img src="' . esc_url( apex_img( $S['logo'] ?? '' ) ) . '" alt="Apex Surgery Hospital" width="150" height="38"><span class="logo-txt" aria-hidden="true">APEX<small>Surgery Hospital</small></span></a>
      <nav class="hdr-nav" aria-label="Main">' . $nav . '</nav>
      <div class="hdr-right"><div class="lang">' . $langs . '</div>
        <a class="plan-link" href="' . esc_url( apex_link( 'plan.html' ) ) . '" aria-label="' . apex_e( apex_t( 'plan' ) ) . '" title="' . apex_e( apex_t( 'plan' ) ) . '">' . apex_ic( 'list' ) . '<span class="plan-n" hidden>0</span></a>
        <a class="btn btn-plum btn-sm hdr-cta" href="' . esc_url( apex_link( 'consult.html' ) ) . '">' . apex_ic( 'message-circle' ) . apex_e( apex_t( 'consult' ) ) . '</a>
        <button class="burger" type="button" aria-label="' . apex_e( apex_t( 'menu' ) ) . '">' . apex_ic( 'menu' ) . '</button></div></div></header>';
}
function apex_sheet_html(): string {
	$S = apex_data( 'shared' );
	$subs = '';
	foreach ( $S['services'] ?? [] as $s ) $subs .= '<a href="' . esc_url( apex_svc_url( $s['key'] ) ) . '">' . apex_e( $s['short'] ?: $s['name'] ) . '</a>';
	$nav = '';
	foreach ( APEX_NAV as [ $h, $k ] ) {
		$nav .= $k === 'services'
			? '<details><summary>' . apex_e( apex_t( 'services' ) ) . apex_ic( 'chevron-down' ) . '</summary><div class="sub"><a href="' . esc_url( apex_link( 'services.html' ) ) . '">' . apex_e( apex_t( 'allServices' ) ) . '</a>' . $subs . '</div></details>'
			: '<a href="' . esc_url( apex_link( $h ) ) . '">' . apex_e( apex_t( $k ) ) . apex_ic( 'arrow-up-right' ) . '</a>';
	}
	$tools = '';
	foreach ( [ [ 'nose.html', 'nose' ], [ 'analysis.html', 'ana' ], [ 'proportions.html', 'prop' ], [ 'breast-implants.html', 'impl' ], [ 'play.html', 'games' ], [ 'trip.html', 'trip' ], [ 'plan.html', 'plan' ], [ 'doctor.html', 'doctor' ] ] as [ $h, $k ] ) $tools .= '<a href="' . esc_url( apex_link( $h ) ) . '">' . apex_e( apex_t( $k ) ) . '</a>';
	return '<div class="sheet" role="dialog" aria-modal="true" aria-label="' . apex_e( apex_t( 'menu' ) ) . '"><div class="sheet-top"><span class="logo-txt light">APEX<small>Surgery Hospital</small></span><button class="close" aria-label="' . apex_e( apex_t( 'close' ) ) . '">' . apex_ic( 'close' ) . '</button></div>
      <nav>' . $nav . '
      <details><summary>' . apex_e( apex_t( 'tools' ) ) . apex_ic( 'chevron-down' ) . '</summary><div class="sub">' . $tools . '</div></details></nav>
      <div class="sheet-cta"><a class="btn btn-light" href="' . esc_url( apex_link( 'consult.html' ) ) . '">' . apex_ic( 'message-circle' ) . apex_e( apex_t( 'consult' ) ) . '</a>
      <div class="lang" style="display:flex;justify-content:center;border-color:rgba(201,179,221,.3)">' . apex_langs_html() . '</div></div></div>';
}
function apex_footer_html(): string {
	$S = apex_data( 'shared' );
	$WA = apex_wa();
	$ext = ' target="_blank" rel="noopener"';
	$br = '';
	foreach ( $S['branches'] ?? [] as $b ) {
		$br .= '<div class="ftr-br"><h2 class="ftr-h">' . apex_e( ( $b['short'] ?? '' ) ?: $b['name'] ) . '</h2><p>' . apex_e( $b['addr'] ?? '' ) . '</p>
      <button type="button" class="ftr-copy" data-copy="' . apex_e( $b['name'] . ', ' . ( $b['addr'] ?? '' ) ) . '">' . apex_ic( 'copy' ) . apex_ic( 'check' ) . '<span>' . apex_e( apex_t( 'copyAddr' ) ) . '</span></button>
      <a href="' . esc_url( ( $b['tel'] ?? '' ) ) . '">' . apex_ic( 'phone' ) . apex_e( $b['phone'] ?? '' ) . '</a><a href="' . esc_url( ( $b['map'] ?? '' ) ) . '"' . $ext . '>' . apex_ic( 'navigation' ) . apex_e( apex_t( 'directions' ) ) . '</a></div>';
	}
	$aaci = ! empty( $S['aaci'] ) ? '<a class="ftr-aaci" href="' . esc_url( $S['aaci']['h'] ) . '"' . $ext . ' aria-label="' . apex_e( apex_t( 'aaciH' ) ) . '"><img src="' . esc_url( apex_img( $S['aaci']['src'] ) ) . '" alt="' . apex_e( $S['aaci']['alt'] ) . '" loading="lazy" decoding="async" width="84" height="84"><span><b>' . apex_e( apex_t( 'aaciH' ) ) . '</b><small>APEX Surgery Hospital Ploenchit</small></span></a>' : '';
	$svcs = '';
	foreach ( $S['services'] ?? [] as $s ) $svcs .= '<a href="' . esc_url( apex_svc_url( $s['key'] ) ) . '">' . apex_e( $s['short'] ?: $s['name'] ) . '</a>';
	$soc = '';
	foreach ( $S['socials'] ?? [] as $s ) $soc .= '<a href="' . esc_url( $s['h'] ) . '"' . $ext . ' aria-label="' . apex_e( ( $s['x'] ?? '' ) ?: $s['k'] ) . '">' . apex_soc_icon( $s['k'] ) . '</a>';
	$line = $S['line'] ?? [];
	$brand = apex_lang() === 'th' ? ( $S['brandTh'] ?? '' ) : ( $S['brand'] ?? '' );
	$foot_langs = implode( '·', array_map( fn( $x ) => '<a href="' . esc_url( apex_lang_href( $x[0] ) ) . '" hreflang="' . $x[0] . '" style="display:inline;padding:0 6px">' . $x[1] . '</a>', [ [ 'en', 'EN' ], [ 'th', 'TH' ] ] ) );
	return '<footer class="ftr"><div class="wrap"><div class="ftr-top surg">
      <div class="brand"><span class="logo-txt light">APEX<small>Surgery Hospital</small></span>
        <p>' . apex_e( $brand ) . '</p>
        <p class="ftr-lic">' . apex_e( $S['license'] ?? '' ) . '</p>' . $aaci . '
        <div class="ftr-socials">' . $soc . '<a href="' . esc_url( $WA['h'] ) . '"' . $ext . ' aria-label="WhatsApp">' . apex_ic( 'whatsapp' ) . '</a></div></div>
      <div><h2 class="ftr-h">' . apex_e( apex_t( 'ourServices' ) ) . '</h2>' . $svcs . '<a href="' . esc_url( apex_link( 'nose.html' ) ) . '">' . apex_e( apex_t( 'nose' ) ) . '</a><a href="' . esc_url( apex_link( 'analysis.html' ) ) . '">' . apex_e( apex_t( 'ana' ) ) . '</a><a href="' . esc_url( apex_link( 'proportions.html' ) ) . '">' . apex_e( apex_t( 'prop' ) ) . '</a><a href="' . esc_url( apex_link( 'breast-implants.html' ) ) . '">' . apex_e( apex_t( 'impl' ) ) . '</a><a href="' . esc_url( apex_link( 'play.html' ) ) . '">' . apex_e( apex_t( 'games' ) ) . '</a></div>
      ' . $br . '
      <div><h2 class="ftr-h">' . apex_e( apex_t( 'contactLine' ) ) . '</h2><a href="' . esc_url( ( $line['h'] ?? '' ) ) . '"' . $ext . ' style="padding:0"><img class="qr" src="' . esc_url( apex_img( $line['qr'] ?? '' ) ) . '" alt="LINE ' . apex_e( $line['x'] ?? '' ) . '" loading="lazy" decoding="async" decoding="async"></a><p style="margin-top:10px">' . apex_e( $line['x'] ?? '' ) . '</p>
        <a href="' . esc_url( $WA['h'] ) . '"' . $ext . '>' . apex_ic( 'whatsapp' ) . apex_e( $WA['x'] ) . '</a></div>
    </div>
    <div class="ftr-word" data-w="APEX" aria-hidden="true"></div>
    ' . ( ! empty( $S['footerNote'] ) ? '<p class="ftr-note">' . apex_e( $S['footerNote'] ) . '</p>' : '' ) . '
    <div class="ftr-bot"><span>' . apex_e( $S['copyright'] ?? '' ) . ' · <a class="ftr-pp" href="' . esc_url( apex_link( 'privacy.html' ) ) . '">' . apex_e( apex_t( 'privacy' ) ) . '</a></span><span>' . $foot_langs . '</span></div></div></footer>';
}
function apex_fab_html(): string {
	$S = apex_data( 'shared' );
	$WA = apex_wa();
	$ph = ( $S['branches'] ?? [] )[0] ?? [ 'phone' => '088-870-0039', 'tel' => 'tel:0888700039' ];
	$line = $S['line'] ?? [];
	return '<div class="fab"><div class="fab-list">
      <a class="wa" href="' . esc_url( $WA['h'] ) . '" target="_blank" rel="noopener">' . apex_ic( 'whatsapp' ) . '<span>WhatsApp<small>' . apex_e( apex_t( 'whatsappSub' ) ) . '</small></span></a>
      <a class="ln" href="' . esc_url( ( ( $line['h'] ?? '' ) ?: 'https://lin.ee/D2Ir4vJ' ) ) . '" target="_blank" rel="noopener">' . apex_ic( 'line' ) . '<span>LINE<small>' . apex_e( ( $line['x'] ?? '' ) ?: '@apexsurgery' ) . '</small></span></a>
      <a class="ph" href="' . esc_url( $ph['tel'] ) . '">' . apex_ic( 'phone' ) . '<span>' . apex_e( $ph['phone'] ) . '<small>' . apex_e( $ph['short'] ?? '' ) . '</small></span></a></div>
      <button class="fab-btn" type="button" aria-label="' . apex_e( apex_t( 'consult' ) ) . '" aria-expanded="false">' . apex_ic( 'message-circle' ) . '</button></div>';
}

/* ---------- scripts and styles ---------- */
function apex_ver(): string {
	static $v = null;
	if ( $v === null ) {   // changes when any of the files below does, so browsers fetch the new copy
		$m = APEX_VERSION;
		foreach ( [ 'css/base.css', 'css/site.css', 'js/icons.js', 'js/i18n.js', 'js/core.js', 'js/pages.js' ] as $f ) $m .= '|' . @filemtime( APEX_DIR . '/assets/' . $f );
		$v = substr( md5( $m ), 0, 8 );
	}
	return $v;
}
add_action( 'wp_enqueue_scripts', function () {
	if ( is_admin() ) return;
	$v = apex_ver();
	wp_enqueue_style( 'apex-base', apex_asset( 'css/base.css' ), [], $v );
	wp_enqueue_style( 'apex-site', apex_asset( 'css/site.css' ), [ 'apex-base' ], $v );
	$d = [ 'strategy' => 'defer', 'in_footer' => true ];
	wp_enqueue_script( 'apex-icons', apex_asset( 'js/icons.js' ), [], $v, $d );
	wp_enqueue_script( 'apex-i18n', apex_asset( 'js/i18n.js' ), [], $v, $d );
	wp_enqueue_script( 'apex-core', apex_asset( 'js/core.js' ), [ 'apex-icons', 'apex-i18n' ], $v, $d );
	wp_enqueue_script( 'apex-pages', apex_asset( 'js/pages.js' ), [ 'apex-core' ], $v, $d );
	// WordPress's own block styles: the site draws its own markup and does not use them on the front end
	foreach ( [ 'wp-block-library', 'wp-block-library-theme', 'classic-theme-styles', 'global-styles' ] as $h ) wp_dequeue_style( $h );
	// Polylang's switcher styles: the theme draws its own language switch, and each file would hold up the first paint
	foreach ( [ 'pll-language-switcher', 'pll-navigation-language-switcher' ] as $h ) { wp_dequeue_style( $h ); wp_deregister_style( $h ); }
}, 20 );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
remove_action( 'wp_body_open', 'wp_global_styles_render_svg_filters' );

/** What the scripts read before they run: the content objects, links, this page's addresses and settings. */
function apex_boot_script( array $r ): string {
	$d = [];
	foreach ( apex_page_data_ids( $r ) as $id ) {
		if ( in_array( $id, $GLOBALS['apex_unlocked'] ?? [], true ) ) continue;
		$x = apex_data( $id );
		if ( $x !== null ) $d[ $id ] = $x;
	}
	$over = [];
	foreach ( APEX_LANGS as $l ) { $o = get_option( 'apex_wording_' . $l ); if ( is_array( $o ) && ( $o = array_filter( $o, fn( $x ) => $x !== '' ) ) ) $over[ $l ] = $o; }
	$cfg = [
		'ssr' => 1,
		'params' => (object) $r['params'],
		'links' => apex_link_map(),
		'alt' => array_map( fn( $l ) => apex_lang_href( $l ), array_combine( APEX_LANGS, APEX_LANGS ) ),
		'assets' => trailingslashit( APEX_URI ) . 'assets/',
		'dataUrl' => add_query_arg( 'apex_data', '', home_url( '/' ) ),
		'media' => apex_media_base(),
		'rest' => esc_url_raw( rest_url( 'apex/v1/' ) ),
		'turnstile' => (string) get_option( 'apex_turnstile_site', '' ),
		'pricing' => apex_pricing_multi() ? 1 : 0,
	];
	if ( $r['page'] === 'play' ) {
		$cfg['games'] = apex_game_config();
		$cfg['voucherCheck'] = admin_url( 'edit.php?post_type=apex_voucher&page=apex-voucher-check&code=' );
	}
	$j = fn( $x ) => wp_json_encode( $x, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP );
	return 'window.APEX=window.APEX||{};APEX._d=Object.assign(APEX._d||{},' . $j( (object) $d ) . ');Object.assign(APEX,' . $j( $cfg ) . ');'
		. ( $over ? 'APEX.I18N_OVER=' . $j( $over ) . ';' : '' ) . 'window.APEX_V=' . $j( apex_ver() ) . ';';
}

/* Data files for the feature modules (they ask for data/<lang>/<id>.js): ?apex_data=th/svc/facelift */
add_action( 'template_redirect', function () {
	if ( ! isset( $_GET['apex_data'] ) ) return;
	$q = sanitize_text_field( wp_unslash( $_GET['apex_data'] ) );
	if ( ! preg_match( '#^(en|th)/([a-z]+)(?:/([a-z0-9-]+))?$#', $q, $m ) ) { status_header( 404 ); exit; }
	$id = $m[2] . ( isset( $m[3] ) && $m[3] !== '' ? ':' . $m[3] : '' );
	if ( ! in_array( $m[2], [ 'shared', 'home', 'about', 'services', 'promotions', 'reviews', 'blogs', 'contact', 'founder', 'posts', 'post', 'svc', 'war' ], true ) ) { status_header( 404 ); exit; }
	$d = apex_data( $id, $m[1] );
	header( 'Content-Type: application/javascript; charset=utf-8' );
	header( 'Cache-Control: public, max-age=300' );
	header( 'X-Robots-Tag: noindex' );
	if ( $d === null ) { status_header( 404 ); echo '/* not found */'; exit; }
	echo 'window.APEX=window.APEX||{};APEX._d=APEX._d||{};APEX._d[' . wp_json_encode( $id ) . ']=' . wp_json_encode( $d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) . ';';
	exit;
}, 1 );

/* ---------- the document ---------- */
function apex_render(): void {
	$r = apex_route();
	$GLOBALS['apex_params'] = $r['params'];
	$GLOBALS['apex_route_q'] = array_filter( [ 'c' => apex_param( 'c' ) ] );
	if ( $r['status'] === 404 ) { status_header( 404 ); nocache_headers(); }
	$GLOBALS['apex_gal'] = 0;
	$GLOBALS['apex_brn'] = 0;
	$main = apex_render_page( $r );
	$L = apex_lang();
	?><!doctype html>
<html lang="<?php echo $L === 'th' ? 'th' : 'en'; ?>" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1F0A30">
<link rel="icon" href="<?php echo esc_url( apex_asset( 'img/favicon.svg' ) ); ?>" type="image/svg+xml">
<link rel="preload" href="<?php echo esc_url( apex_asset( 'fonts/LINESeed-Rg-latin.woff2' ) ); ?>" as="font" type="font/woff2" crossorigin>
<?php if ( $L === 'th' ) : ?><link rel="preload" href="<?php echo esc_url( apex_asset( 'fonts/LINESeed-Rg-thai.woff2' ) ); ?>" as="font" type="font/woff2" crossorigin>
<?php endif; ?>
<?php if ( apex_media_base() !== trailingslashit( home_url() ) ) : ?><link rel="preconnect" href="<?php echo esc_url( untrailingslashit( apex_media_base() ) ); ?>">
<?php endif; ?>
<?php if ( defined( 'APEX_THREE_URL' ) ) : ?><script type="importmap"><?php echo wp_json_encode( [ 'imports' => [ 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js' => APEX_THREE_URL ] ], JSON_UNESCAPED_SLASHES ); ?></script>
<?php endif; ?>
<?php wp_head(); ?>
<?php if ( is_admin_bar_showing() ) : ?><style>/* the WordPress toolbar for logged-in editors sits above the floating header */
.hdr{top:46px}.sheet{top:32px}@media (max-width:782px){.hdr{top:56px}.sheet{top:46px}}@media (max-width:600px){#wpadminbar{position:fixed}}</style>
<?php endif; ?>
</head>
<body data-page="<?php echo esc_attr( $r['page'] ); ?>" data-ssr>
<?php wp_body_open(); ?>
<?php echo apex_header_html( $r['page'] ); ?>
<main id="main" tabindex="-1"><?php echo $main; ?></main>
<script>/* what is on the first screen shows at once, without waiting for the scripts at the end */
(function(){var h=innerHeight,big=null,a=0;document.querySelectorAll('#main .rv,#main .rv-clip').forEach(function(e){var r=e.getBoundingClientRect();if(r.top<h&&r.bottom>0&&r.height)e.classList.add('rv-now','in')});
document.querySelectorAll('#main img[loading=lazy]').forEach(function(i){var r=i.getBoundingClientRect(),s=r.width*r.height;if(r.top<h&&r.bottom>0&&s){i.loading='eager';if(s>a){a=s;big=i}}});if(big&&!document.querySelector('#main img[fetchpriority=high]'))big.fetchPriority='high'})();</script>
<?php echo apex_sheet_html(); ?>
<?php echo apex_footer_html(); ?>
<?php echo apex_fab_html(); ?>
<script><?php echo apex_boot_script( $r ); ?></script>
<?php wp_footer(); ?>
</body>
</html>
<?php
}
