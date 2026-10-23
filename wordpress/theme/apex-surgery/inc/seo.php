<?php
/**
 * Titles, descriptions, social cards and structured data.
 * With Rank Math or Yoast active, the plugin writes the title, description, canonical and social tags (its own
 * fields fall back to ours through the filters below), and the theme adds only the medical structured data the
 * plugins do not have: Hospital, MedicalProcedure, Physician, FAQPage and VideoObject.
 */
defined( 'ABSPATH' ) || exit;

function apex_seo_plugin(): bool { return defined( 'RANK_MATH_VERSION' ) || defined( 'WPSEO_VERSION' ); }

/** Title, description and share image of the current page, from the content itself. */
function apex_seo(): array {
	static $m = null;
	if ( $m !== null ) return $m;
	$r = apex_route();
	$brand = 'Apex Surgery Hospital';
	$title = ''; $desc = ''; $img = '';
	$page = $r['id'] ? apex_post( $r['id'] ) : null;
	if ( $page && $page->post_password !== '' ) {
		return $m = [ 'title' => get_the_title( $page ) . ' | ' . $brand, 'desc' => '', 'img' => apex_img( '~/wp-content/uploads/2025/11/Apex-Surgery.webp' ) ];
	}
	$pm = $page && $page->post_type === 'page' ? [ 'title' => (string) get_post_meta( $page->ID, 'apex_title', true ), 'desc' => (string) get_post_meta( $page->ID, 'apex_desc', true ) ] : [ 'title' => '', 'desc' => '' ];
	switch ( $r['page'] ) {
		case 'service':
			$D = apex_data( 'svc:' . ( $r['params']['p'] ?? '' ) ) ?: [];
			$title = ( $D['title'] ?? '' ) ?: ( ( $D['name'] ?? '' ) . ' | ' . $brand );
			$desc = $D['desc'] ?? '';
			$img = $D['hero'] ?? '';
			break;
		case 'article':
			$D = apex_data( 'post:' . ( $r['params']['p'] ?? '' ) ) ?: [];
			$title = ( $D['title'] ?? '' ) . ' | ' . $brand;
			$desc = $page ? $page->post_excerpt : '';
			$img = $D['img'] ?? '';
			break;
		case 'war':
			if ( ! empty( $r['params']['ep'] ) ) {
				$D = apex_data( 'war:' . $r['params']['ep'] ) ?: [];
				$e = null;
				foreach ( ( apex_data( 'war' )['episodes'] ?? [] ) as $x ) if ( (string) $x['n'] === (string) $r['params']['ep'] ) $e = $x;
				$title = ( ( $D['seo'] ?? '' ) ?: ( $D['title'] ?? '' ) ) . ' | ' . $brand;
				$desc = $D['desc'] ?? '';
				$img = $e ? apex_war_src( $e['img'] ) : '';
				break;
			}
			// the hub uses its page fields
		default:
			$title = $pm['title'];
			$desc = $pm['desc'];
			if ( $r['page'] === 'home' ) $img = apex_data( 'home' )['hero']['src'] ?? '';
			if ( $r['page'] === 'about' ) $img = apex_data( 'about' )['hero']['src'] ?? '';
	}
	if ( $r['page'] === 'page' && $page ) $title = get_the_title( $page ) . ' | ' . $brand;
	if ( $r['page'] === 'notfound' ) { $title = apex_t( 'notFoundH' ) . ' | ' . $brand; $desc = apex_t( 'notFoundP' ); }
	if ( $r['page'] === 'blog' && ! empty( $r['params']['c'] ) && is_category() ) $title = apex_cat_label( $r['params']['c'] ) . ' | ' . $brand;
	if ( $title === '' ) $title = ( $page ? get_the_title( $page ) . ' | ' : '' ) . $brand;
	return $m = [ 'title' => $title, 'desc' => $desc, 'img' => apex_img( $img ?: '~/wp-content/uploads/2025/11/Apex-Surgery.webp' ) ];
}

/* ---------- without an SEO plugin: title, description, canonical, social tags ---------- */
add_filter( 'pre_get_document_title', function ( $t ) { return apex_seo_plugin() || is_admin() ? $t : apex_seo()['title']; }, 20 );
add_filter( 'wp_robots', function ( $robots ) {
	$r = apex_route();
	if ( in_array( $r['page'], [ 'notfound', 'plan' ], true ) || is_preview() ) $robots['noindex'] = true;
	if ( ! empty( $r['params']['c'] ) && in_array( $r['page'], [ 'promotions', 'blog' ], true ) && ! is_category() ) { $robots['noindex'] = true; $robots['follow'] = true; }
	return $robots;
} );
add_action( 'wp_head', function () {
	if ( apex_seo_plugin() ) return;
	$m = apex_seo();
	$r = apex_route();
	$canon = $r['status'] === 200 ? apex_canonical() : '';
	$out = '';
	if ( $m['desc'] !== '' ) $out .= '<meta name="description" content="' . esc_attr( $m['desc'] ) . '">' . "\n";
	if ( $canon && ! is_singular() ) $out .= '<link rel="canonical" href="' . esc_url( $canon ) . '">' . "\n";   // WordPress prints it on single pages itself
	$out .= '<meta property="og:type" content="' . ( $r['page'] === 'article' ? 'article' : 'website' ) . '">' . "\n";
	$out .= '<meta property="og:site_name" content="Apex Surgery Hospital">' . "\n";
	$out .= '<meta property="og:title" content="' . esc_attr( $m['title'] ) . '">' . "\n";
	if ( $m['desc'] !== '' ) $out .= '<meta property="og:description" content="' . esc_attr( $m['desc'] ) . '">' . "\n";
	if ( $canon ) $out .= '<meta property="og:url" content="' . esc_url( $canon ) . '">' . "\n";
	$out .= '<meta property="og:image" content="' . esc_url( $m['img'] ) . '">' . "\n";
	$out .= '<meta property="og:locale" content="' . ( apex_lang() === 'th' ? 'th_TH' : 'en_US' ) . '">' . "\n";
	$out .= '<meta property="og:locale:alternate" content="' . ( apex_lang() === 'th' ? 'en_US' : 'th_TH' ) . '">' . "\n";
	$out .= '<meta name="twitter:card" content="summary_large_image">' . "\n";
	echo $out;
}, 2 );
function apex_canonical(): string {
	$r = apex_route();
	if ( $r['page'] === 'home' ) return apex_home_url();
	if ( is_category() ) { $l = get_term_link( get_queried_object() ); return is_wp_error( $l ) ? '' : $l; }
	return $r['id'] ? (string) get_permalink( $r['id'] ) : '';
}
/* the front page gets a canonical too (WordPress only prints one on single posts and pages) */
add_action( 'wp_head', function () { if ( ! apex_seo_plugin() && is_front_page() ) echo '<link rel="canonical" href="' . esc_url( apex_home_url() ) . '">' . "\n"; }, 3 );

/* ---------- with Rank Math or Yoast: their empty fields fall back to ours ---------- */
add_filter( 'rank_math/frontend/title', fn( $t ) => $t ?: apex_seo()['title'] );
add_filter( 'rank_math/frontend/description', fn( $d ) => $d ?: apex_seo()['desc'] );
add_filter( 'rank_math/opengraph/facebook/image', fn( $i ) => $i ?: apex_seo()['img'] );
add_filter( 'wpseo_title', fn( $t ) => $t ?: apex_seo()['title'] );
add_filter( 'wpseo_metadesc', fn( $d ) => $d ?: apex_seo()['desc'] );

/* hreflang: Polylang writes en and th; x-default points at English */
add_filter( 'pll_rel_hreflang_attributes', function ( $hreflangs ) {
	if ( isset( $hreflangs['en'] ) && ! isset( $hreflangs['x-default'] ) ) $hreflangs['x-default'] = $hreflangs['en'];
	return $hreflangs;
} );
/* without Polylang, the theme writes them */
add_action( 'wp_head', function () {
	if ( function_exists( 'pll_current_language' ) ) return;
	$alt = apex_alternates();
	foreach ( $alt as $l => $u ) if ( $u ) echo '<link rel="alternate" hreflang="' . esc_attr( $l ) . '" href="' . esc_url( $u ) . '">' . "\n";
	if ( ! empty( $alt['en'] ) ) echo '<link rel="alternate" hreflang="x-default" href="' . esc_url( $alt['en'] ) . '">' . "\n";
}, 4 );

/* ---------- structured data (as pages.js and build.py wrote it in the design) ---------- */
function apex_ld_clinics( array $S ): array {
	return array_map( fn( $b ) => [ '@type' => 'MedicalClinic', 'name' => $b['name'], 'telephone' => $b['phone'] ?? '', 'image' => apex_img( $b['img'] ?? '' ), 'hasMap' => $b['map'] ?? '', 'address' => [ '@type' => 'PostalAddress', 'streetAddress' => $b['addr'] ?? '', 'addressCountry' => 'TH' ], 'medicalSpecialty' => 'PlasticSurgery', 'parentOrganization' => [ '@type' => 'Organization', 'name' => 'Apex Medical Center' ] ], $S['branches'] ?? [] );
}
function apex_ld_crumbs( array $items ): array {
	$out = [];
	foreach ( $items as $i => $it ) $out[] = [ '@type' => 'ListItem', 'position' => $i + 1, 'name' => $it[0], 'item' => $it[1] ];
	return [ '@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $out ];
}
function apex_jsonld(): array {
	$r = apex_route();
	$S = apex_data( 'shared' ) ?: [];
	$here = apex_canonical();
	$home = [ apex_t( 'home' ), apex_home_url() ];
	$ld = [];
	$plugin = apex_seo_plugin();
	if ( in_array( $r['page'], [ 'home', 'contact' ], true ) ) {
		$ld[] = [ '@context' => 'https://schema.org', '@type' => 'Hospital', 'name' => 'Apex Surgery Hospital', 'alternateName' => $S['brandTh'] ?? '', 'url' => apex_home_url( 'en' ), 'medicalSpecialty' => 'PlasticSurgery', 'sameAs' => array_values( array_column( $S['socials'] ?? [], 'h' ) ), 'department' => apex_ld_clinics( $S ) ];
	}
	switch ( $r['page'] ) {
		case 'service':
			$k = $r['params']['p'] ?? '';
			$D = apex_data( 'svc:' . $k );
			if ( ! $D ) break;
			$ld[] = [ '@context' => 'https://schema.org', '@type' => 'MedicalProcedure', 'name' => $D['name'], 'alternateName' => $D['en'] ?? '', 'description' => $D['desc'] ?? '', 'procedureType' => 'https://schema.org/SurgicalProcedure', 'howPerformed' => $D['intro'][0] ?? '', 'followup' => implode( '; ', array_map( fn( $x ) => $x[0] . ': ' . $x[1], APEX_RECOVERY[ apex_lang() ][ $k ] ?? [] ) ), 'performer' => [ '@type' => 'Physician', 'name' => $S['doctor']['name'] ?? '' ] ];
			if ( ! empty( $D['faqs'] ) ) $ld[] = apex_ld_faq( $D['faqs'] );
			if ( ! $plugin ) $ld[] = apex_ld_crumbs( [ $home, [ apex_t( 'services' ), apex_link( 'services.html' ) ], [ apex_svc_name( $S, $k ), $here ] ] );
			break;
		case 'article':
			$D = apex_data( 'post:' . ( $r['params']['p'] ?? '' ) );
			if ( ! $D ) break;
			if ( ! $plugin ) $ld[] = [ '@context' => 'https://schema.org', '@type' => 'Article', 'headline' => $D['title'], 'datePublished' => $D['date'] ?? '', 'dateModified' => get_post_modified_time( 'Y-m-d', false, $r['id'] ) ?: ( $D['date'] ?? '' ), 'image' => apex_img( $D['img'] ?? '' ), 'inLanguage' => apex_lang(), 'author' => [ '@type' => 'Organization', 'name' => 'Apex Surgery Hospital' ], 'publisher' => [ '@type' => 'Organization', 'name' => 'Apex Surgery Hospital' ], 'mainEntityOfPage' => $here ];
			$faq = [];
			foreach ( $D['blocks'] ?? [] as $b ) if ( $b['t'] === 'faqs' ) $faq = array_merge( $faq, $b['items'] ?? [] );
			if ( $faq ) $ld[] = apex_ld_faq( $faq );
			if ( ! $plugin ) { $cat = apex_cat_label( $D['cat'] ?? '' ); $ld[] = apex_ld_crumbs( [ $home, [ apex_t( 'articles' ), apex_link( 'blog.html' ) ], [ $cat, apex_link( 'blog.html?c=' . ( $D['cat'] ?? '' ) ) ], [ $D['title'], $here ] ] ); }
			break;
		case 'doctor':
			$d = $S['doctor'] ?? null;
			if ( $d ) $ld[] = [ '@context' => 'https://schema.org', '@type' => 'Physician', 'name' => $d['name'], 'image' => apex_img( $d['photo'] ?? '' ), 'medicalSpecialty' => 'PlasticSurgery', 'description' => $d['specialty'] ?? '', 'identifier' => $d['license'] ?? '', 'memberOf' => array_values( array_filter( $d['more'] ?? [], fn( $x ) => preg_match( '/สมาคม|Society|ISAPS/u', $x ) ) ), 'worksFor' => [ '@type' => 'Hospital', 'name' => 'Apex Surgery Hospital' ] ];
			$F = apex_data( 'founder' );
			if ( $F ) $ld[] = [ '@context' => 'https://schema.org', '@type' => 'Physician', 'name' => $F['name'], 'image' => apex_img( $F['portrait'] ?? '' ), 'identifier' => $F['license'] ?? '', 'description' => $F['specialty'] ?? '', 'worksFor' => [ '@type' => 'Organization', 'name' => 'Apex Medical Center' ] ];
			break;
		case 'war':
			$eps = apex_data( 'war' )['episodes'] ?? [];
			if ( empty( $r['params']['ep'] ) ) {
				$ld[] = [ '@context' => 'https://schema.org', '@type' => 'ItemList', 'itemListElement' => array_map( fn( $x, $i ) => [ '@type' => 'ListItem', 'position' => $i + 1, 'url' => apex_war_url( $x['n'] ), 'name' => $x['full'] ?: $x['title'] ], $eps, array_keys( $eps ) ) ];
				break;
			}
			$D = apex_data( 'war:' . $r['params']['ep'] );
			$e = null;
			foreach ( $eps as $x ) if ( (string) $x['n'] === (string) $r['params']['ep'] ) $e = $x;
			if ( $D && $e ) {
				$yt = ( $D['yt'] ?? '' ) ?: $e['yt'];
				$ld[] = array_filter( [ '@context' => 'https://schema.org', '@type' => 'VideoObject', 'name' => $D['title'], 'description' => $D['desc'] ?? '', 'thumbnailUrl' => [ apex_img( apex_war_src( $e['img'] ) ), apex_yt( $yt ) ], 'embedUrl' => 'https://www.youtube.com/embed/' . $yt, 'contentUrl' => 'https://www.youtube.com/watch?v=' . $yt, 'uploadDate' => get_post_time( 'c', true, $r['id'] ), 'inLanguage' => 'th' ] );
				if ( ! $plugin ) $ld[] = apex_ld_crumbs( [ $home, [ apex_t( 'war' ), apex_link( 'surgery-wars.html' ) ], [ 'EP.' . $e['n'], $here ] ] );
			}
			break;
	}
	if ( ! $plugin && ! in_array( $r['page'], [ 'home', 'service', 'article', 'war', 'notfound' ], true ) && $here ) {
		$ld[] = apex_ld_crumbs( [ $home, [ trim( explode( '|', apex_seo()['title'] )[0] ), $here ] ] );
	}
	return $ld;
}
function apex_ld_faq( array $items ): array {
	return [ '@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map( fn( $q ) => [ '@type' => 'Question', 'name' => $q['q'] ?? '', 'acceptedAnswer' => [ '@type' => 'Answer', 'text' => implode( ' ', array_map( fn( $a ) => is_array( $a ) ? ( $a['x'] ?? '' ) : $a, (array) ( $q['a'] ?? [] ) ) ) ] ], $items ) ];
}
add_action( 'wp_head', function () {
	if ( is_admin() || is_feed() ) return;
	foreach ( apex_jsonld() as $x ) echo '<script type="application/ld+json">' . wp_json_encode( $x, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) . "</script>\n";
}, 30 );

/* sitemaps: the feature pages and the private types stay out; WordPress's own sitemap lists the rest */
add_filter( 'wp_sitemaps_posts_query_args', function ( $args, $type ) {
	if ( $type === 'page' ) $args['meta_query'] = [ 'relation' => 'OR', [ 'key' => '_apex_page', 'compare' => 'NOT EXISTS' ], [ 'key' => '_apex_page', 'value' => [ 'plan' ], 'compare' => 'NOT IN' ] ];
	return $args;
}, 10, 2 );
add_filter( 'wp_sitemaps_add_provider', fn( $p, $name ) => $name === 'users' ? false : $p, 10, 2 );
add_filter( 'wp_sitemaps_taxonomies', function ( $t ) { unset( $t['post_tag'], $t['post_format'] ); return $t; } );
