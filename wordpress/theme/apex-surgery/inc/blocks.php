<?php
/**
 * Article, episode and service text lives in the block editor as ordinary core blocks, so editors work in
 * the editor they know. The templates read it back as the design's block list:
 *   {t:'h2'|'h3'|'h4', x}  {t:'p', x}  {t:'list', items:[...], o}  {t:'img', src, alt}  {t:'yt', id}
 *   {t:'table', rows}  {t:'btn', x, h}  {t:'faqs', items:[{q, a:[...]}]}
 * Service sections are Group blocks with the class "apex-section": the first heading in a group is the
 * section's heading and the rest is its body.
 */
defined( 'ABSPATH' ) || exit;

function apex_bx( $s ): string { return esc_html( (string) $s ); }
/** image address for the editor: "~/..." and theme-relative paths become full URLs */
function apex_block_src( string $s ): string {
	if ( $s === '' ) return '';
	if ( str_starts_with( $s, '~/' ) || preg_match( '#^https?:#', $s ) ) return apex_img( $s );
	return apex_asset( $s );
}
function apex_block_src_back( string $s ): string {
	$a = APEX_URI . '/assets/';
	if ( str_starts_with( $s, $a ) ) return substr( $s, strlen( $a ) );
	return apex_img_store( $s );
}

/* ---------- design blocks to editor markup ---------- */
function apex_blocks_to_markup( array $blocks ): string {
	$out = [];
	foreach ( $blocks as $b ) {
		$t = $b['t'] ?? '';
		switch ( $t ) {
			case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
				$n = (int) substr( $t, 1 );
				$out[] = '<!-- wp:heading' . ( $n !== 2 ? ' {"level":' . $n . '}' : '' ) . " -->\n<h$n class=\"wp-block-heading\">" . apex_bx( $b['x'] ?? '' ) . "</h$n>\n<!-- /wp:heading -->";
				break;
			case 'p':
				$x = apex_bx( $b['x'] ?? '' );
				$out[] = "<!-- wp:paragraph -->\n<p>" . ( ! empty( $b['b'] ) ? "<strong>$x</strong>" : $x ) . "</p>\n<!-- /wp:paragraph -->";
				break;
			case 'list':
				$tag = ! empty( $b['o'] ) ? 'ol' : 'ul';
				$items = array_map( fn( $i ) => "<!-- wp:list-item -->\n<li>" . apex_bx( is_array( $i ) ? ( $i['x'] ?? '' ) : $i ) . "</li>\n<!-- /wp:list-item -->", $b['items'] ?? [] );
				$out[] = '<!-- wp:list' . ( $tag === 'ol' ? ' {"ordered":true}' : '' ) . " -->\n<$tag class=\"wp-block-list\">" . implode( "\n", $items ) . "</$tag>\n<!-- /wp:list -->";
				break;
			case 'img':
				if ( empty( $b['src'] ) ) break;
				$out[] = "<!-- wp:image {\"sizeSlug\":\"full\"} -->\n<figure class=\"wp-block-image size-full\"><img src=\"" . esc_attr( apex_block_src( $b['src'] ) ) . '" alt="' . esc_attr( $b['alt'] ?? '' ) . "\"/></figure>\n<!-- /wp:image -->";
				break;
			case 'yt':
				$u = 'https://www.youtube.com/watch?v=' . rawurlencode( $b['id'] ?? '' );
				$out[] = '<!-- wp:embed {"url":"' . $u . "\",\"type\":\"video\",\"providerNameSlug\":\"youtube\",\"responsive\":true} -->\n<figure class=\"wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube\"><div class=\"wp-block-embed__wrapper\">\n$u\n</div></figure>\n<!-- /wp:embed -->";
				break;
			case 'table':
				$rows = array_map( fn( $r ) => '<tr>' . implode( '', array_map( fn( $c ) => '<td>' . apex_bx( $c ) . '</td>', (array) $r ) ) . '</tr>', $b['rows'] ?? [] );
				$out[] = "<!-- wp:table -->\n<figure class=\"wp-block-table\"><table><tbody>" . implode( '', $rows ) . "</tbody></table></figure>\n<!-- /wp:table -->";
				break;
			case 'btn':
				$out[] = "<!-- wp:buttons -->\n<div class=\"wp-block-buttons\"><!-- wp:button -->\n<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"" . esc_attr( $b['h'] ?? '' ) . '">' . apex_bx( $b['x'] ?? '' ) . "</a></div>\n<!-- /wp:button --></div>\n<!-- /wp:buttons -->";
				break;
			case 'faqs':
				foreach ( $b['items'] ?? [] as $q ) {
					$as = array_map( fn( $a ) => "<!-- wp:paragraph -->\n<p>" . apex_bx( is_array( $a ) ? ( $a['x'] ?? '' ) : $a ) . "</p>\n<!-- /wp:paragraph -->", (array) ( $q['a'] ?? [] ) );
					$out[] = "<!-- wp:details {\"className\":\"apex-faq\"} -->\n<details class=\"wp-block-details apex-faq\"><summary>" . apex_bx( $q['q'] ?? '' ) . "</summary>" . implode( "\n", $as ) . "</details>\n<!-- /wp:details -->";
				}
				break;
		}
	}
	return implode( "\n\n", $out );
}
function apex_sections_to_markup( array $sections ): string {
	$out = [];
	foreach ( $sections as $s ) {
		$inner = apex_blocks_to_markup( array_merge( [ [ 't' => 'h2', 'x' => $s['h'] ?? '' ] ], $s['blocks'] ?? [] ) );
		$out[] = "<!-- wp:group {\"className\":\"apex-section\",\"layout\":{\"type\":\"constrained\"}} -->\n<div class=\"wp-block-group apex-section\">$inner</div>\n<!-- /wp:group -->";
	}
	return implode( "\n\n", $out );
}

/* ---------- editor markup back to design blocks ---------- */
function apex_text( string $html ): string {
	$html = preg_replace( '#<br\s*/?>#i', "\n", $html );
	return trim( html_entity_decode( wp_strip_all_tags( $html ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
}
function apex_markup_to_blocks( string $content ): array {
	return apex_parse_blocks( parse_blocks( $content ) );
}
function apex_parse_blocks( array $parsed ): array {
	$out = [];
	foreach ( $parsed as $pb ) {
		$name = $pb['blockName'] ?? null;
		$html = $pb['innerHTML'] ?? '';
		switch ( $name ) {
			case 'core/heading':
				$lvl = (int) ( $pb['attrs']['level'] ?? 2 );
				if ( preg_match( '#<h([1-6])#i', $html, $m ) ) $lvl = (int) $m[1];
				$out[] = [ 't' => 'h' . max( 2, min( 6, $lvl ) ), 'x' => apex_text( $html ) ];
				break;
			case 'core/paragraph':
				$x = apex_text( $html );
				if ( $x === '' ) break;
				$p = [ 't' => 'p', 'x' => $x ];
				if ( preg_match( '#^\s*<p[^>]*>\s*<strong>(.*)</strong>\s*</p>\s*$#is', $html ) ) $p['b'] = true;
				$out[] = $p;
				break;
			case 'core/list':
				$items = [];
				foreach ( $pb['innerBlocks'] ?? [] as $li ) $items[] = apex_text( $li['innerHTML'] ?? '' );
				if ( ! $items && preg_match_all( '#<li[^>]*>(.*?)</li>#is', $html, $m ) ) $items = array_map( 'apex_text', $m[1] );
				$l = [ 't' => 'list', 'items' => $items ];
				if ( ! empty( $pb['attrs']['ordered'] ) || preg_match( '#<ol#i', $html ) ) $l['o'] = true;
				$out[] = $l;
				break;
			case 'core/image':
				if ( preg_match( '#<img[^>]+src="([^"]*)"#i', $html, $m ) ) {
					$alt = preg_match( '#alt="([^"]*)"#i', $html, $a ) ? html_entity_decode( $a[1], ENT_QUOTES | ENT_HTML5, 'UTF-8' ) : '';
					$out[] = [ 't' => 'img', 'src' => apex_block_src_back( html_entity_decode( $m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ), 'alt' => $alt ];
				}
				break;
			case 'core/gallery':
				foreach ( apex_parse_blocks( $pb['innerBlocks'] ?? [] ) as $b ) $out[] = $b;
				break;
			case 'core/embed':
				$u = $pb['attrs']['url'] ?? '';
				if ( preg_match( '#(?:youtu\.be/|v=|embed/|shorts/)([\w-]{6,})#', $u, $m ) ) $out[] = [ 't' => 'yt', 'id' => $m[1] ];
				break;
			case 'core/table':
				$rows = [];
				if ( preg_match_all( '#<tr[^>]*>(.*?)</tr>#is', $html, $m ) ) foreach ( $m[1] as $tr ) {
					preg_match_all( '#<t[hd][^>]*>(.*?)</t[hd]>#is', $tr, $c );
					$rows[] = array_map( 'apex_text', $c[1] );
				}
				$out[] = [ 't' => 'table', 'rows' => $rows ];
				break;
			case 'core/buttons':
				foreach ( $pb['innerBlocks'] ?? [] as $btn ) {
					$h = preg_match( '#href="([^"]*)"#i', $btn['innerHTML'] ?? '', $m ) ? html_entity_decode( $m[1] ) : '';
					$out[] = [ 't' => 'btn', 'x' => apex_text( $btn['innerHTML'] ?? '' ), 'h' => $h ];
				}
				break;
			case 'core/details':
				$q = preg_match( '#<summary[^>]*>(.*?)</summary>#is', $html, $m ) ? apex_text( $m[1] ) : '';
				$a = [];
				foreach ( $pb['innerBlocks'] ?? [] as $ib ) { $t = apex_text( $ib['innerHTML'] ?? '' ); if ( $t !== '' ) $a[] = $t; }
				$last = count( $out ) - 1;
				if ( $last >= 0 && $out[ $last ]['t'] === 'faqs' ) $out[ $last ]['items'][] = [ 'q' => $q, 'a' => $a ];
				else $out[] = [ 't' => 'faqs', 'items' => [ [ 'q' => $q, 'a' => $a ] ] ];
				break;
			case 'core/group': case 'core/column': case 'core/columns': case 'core/quote':
				foreach ( apex_parse_blocks( $pb['innerBlocks'] ?? [] ) as $b ) $out[] = $b;
				break;
			case 'core/html': case 'core/freeform': case null:
				// classic content or stray HTML: keep its paragraphs and headings as text
				$t = trim( $html );
				if ( $t === '' ) break;
				if ( preg_match_all( '#<(h[2-6]|p|li)[^>]*>(.*?)</\1>#is', $t, $m, PREG_SET_ORDER ) ) {
					foreach ( $m as $x ) { $tx = apex_text( $x[2] ); if ( $tx === '' ) continue; $out[] = $x[1] === 'p' || $x[1] === 'li' ? [ 't' => 'p', 'x' => $tx ] : [ 't' => strtolower( $x[1] ), 'x' => $tx ]; }
				} elseif ( ( $tx = apex_text( $t ) ) !== '' ) {
					foreach ( preg_split( "/\n{2,}/", $tx ) as $para ) if ( trim( $para ) !== '' ) $out[] = [ 't' => 'p', 'x' => trim( $para ) ];
				}
				break;
		}
	}
	return $out;
}
function apex_markup_to_sections( string $content ): array {
	$sections = [];
	foreach ( parse_blocks( $content ) as $pb ) {
		if ( ( $pb['blockName'] ?? '' ) === 'core/group' ) {
			$bl = apex_parse_blocks( $pb['innerBlocks'] ?? [] );
			$h = '';
			foreach ( $bl as $i => $b ) if ( in_array( $b['t'], [ 'h2', 'h3' ], true ) ) { $h = $b['x']; array_splice( $bl, $i, 1 ); break; }
			$sections[] = [ 'h' => $h, 'blocks' => $bl ];
		} elseif ( $pb['blockName'] ) {
			// blocks outside a section join the one before, or start one with no heading
			$bl = apex_parse_blocks( [ $pb ] );
			if ( ! $bl ) continue;
			if ( ! $sections || ( $bl[0]['t'] === 'h2' ) ) { $sections[] = [ 'h' => $bl[0]['t'] === 'h2' ? array_shift( $bl )['x'] : '', 'blocks' => [] ]; }
			$sections[ count( $sections ) - 1 ]['blocks'] = array_merge( $sections[ count( $sections ) - 1 ]['blocks'], $bl );
		}
	}
	return $sections;
}

/* The block editor: a Section pattern for service pages and an outline that matches the page */
add_action( 'init', function () {
	if ( ! function_exists( 'register_block_pattern' ) ) return;
	register_block_pattern( 'apex/service-section', [
		'title' => 'Service section', 'categories' => [ 'text' ], 'postTypes' => [ 'apex_service' ],
		'description' => 'A heading and its text. Bulleted lists become cards; three or more small headings become numbered steps.',
		'content' => apex_sections_to_markup( [ [ 'h' => 'Section heading', 'blocks' => [ [ 't' => 'p', 'x' => 'Opening paragraph.' ], [ 't' => 'list', 'items' => [ 'Label: text', 'Label: text', 'Label: text' ] ] ] ] ] ),
	] );
} );
