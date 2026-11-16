<?php
/**
 * Where each part of a page is edited, shown to staff who are logged in:
 * on the live site, an "Edit" link on every section that opens the admin screen holding its words and pictures;
 * in the block editor, a note pointing to the Details box under the text.
 */
defined( 'ABSPATH' ) || exit;

/** [selector, label, admin link] in the order they are tried; the first that matches a section wins. */
function apex_edit_map(): array {
	$r = apex_route();
	$here = $r['id'] ? (string) get_edit_post_link( $r['id'], 'raw' ) : '';
	$founder = 0;
	foreach ( apex_posts( 'apex_doctor', apex_lang() ) as $id ) if ( get_post_meta( $id, apex_meta_key( 'kind' ), true ) === 'founder' ) { $founder = (int) $id; break; }
	$list = fn( $t ) => admin_url( 'edit.php?post_type=' . $t );
	$set = admin_url( 'admin.php?page=apex-settings' );
	$m = [
		// a service page keeps its own offers, before and after photos and review images in its Details box
		$r['page'] === 'service' ? [ '#ba,.ba-grid,.rv-rail,.offer-grid,.offer-spot,.vid-rail', __( 'this page', 'apex' ), $here . '#apex-fields' ] : [ '', '', '' ],
		[ '.dr-prof', __( 'this doctor', 'apex' ), $here ],
		[ '.founder2', __( 'the founder', 'apex' ), $founder ? (string) get_edit_post_link( $founder, 'raw' ) : $list( 'apex_doctor' ) ],
		[ '.team-strip,.team-grid,.doc-card', __( 'Doctors', 'apex' ), $list( 'apex_doctor' ) ],
		[ '.fresh-rail', __( "What's new", 'apex' ), $list( 'apex_fresh' ) ],
		[ '.offer-grid,.promo-grid,.offer-spot', __( 'Offers', 'apex' ), $list( 'apex_offer' ) ],
		[ '#rx,#ba,.ba-grid,.rv-rail', __( 'Before and after', 'apex' ), $list( 'apex_case' ) ],
		[ '.br-stage,.br-tabs', __( 'Branches', 'apex' ), $list( 'apex_branch' ) ],
		[ '.war-rail,.war-grid,.war-eps', __( 'Surgery Wars', 'apex' ), $list( 'apex_episode' ) ],
		[ '.feed,.social-s .wrap', __( 'Social feeds', 'apex' ), admin_url( 'admin.php?page=apex-social' ) ],
		[ '.upd-list,.post-grid,.story-grid', __( 'Articles', 'apex' ), admin_url( 'edit.php' ) ],
		[ '.svc-grid', __( 'Services', 'apex' ), $list( 'apex_service' ) ],
		[ '.consult-band', __( 'Apex settings', 'apex' ), $set ],
	];
	if ( $here && ! in_array( $r['page'], [ 'doctor' ], true ) ) $m[] = [ '*', __( 'this page', 'apex' ), $here . '#apex-fields' ];
	return array_values( array_filter( $m, fn( $x ) => $x[0] !== '' && $x[2] !== '' ) );
}

add_action( 'wp_footer', function () {
	if ( is_admin() || ! is_user_logged_in() || ! current_user_can( 'edit_posts' ) ) return;
	$cfg = [ 'map' => apex_edit_map(), 'footer' => [ __( 'Apex settings', 'apex' ), admin_url( 'admin.php?page=apex-settings' ) ], 'edit' => __( 'Edit', 'apex' ) ];
	echo '<style>.apx-ed{position:absolute;top:12px;right:12px;z-index:40;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;background:#6A388C;color:#fff!important;font:700 13px/1 system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 18px -6px rgba(31,10,48,.6);opacity:.92}.apx-ed:hover{opacity:1;background:#55286F}.apx-ed::before{content:"✎"}html.apx-ed-off .apx-ed{display:none}</style>';
	echo '<script>(function(){var C=' . wp_json_encode( $cfg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) . ';
try{if(localStorage.getItem("apex.editlinks")==="off")document.documentElement.classList.add("apx-ed-off")}catch(e){}
function chip(host,label,href){if(getComputedStyle(host).position==="static")host.style.position="relative";var a=document.createElement("a");a.className="apx-ed";a.href=href;a.textContent=C.edit+": "+label;host.appendChild(a)}
document.querySelectorAll("#main > section, #main > figure").forEach(function(s){for(var i=0;i<C.map.length;i++){var m=C.map[i];if(m[0]==="*"||s.matches(m[0])||s.querySelector(m[0])){chip(s,m[1],m[2]);return}}});
var f=document.querySelector("footer.ftr");if(f)chip(f,C.footer[0],C.footer[1]);
var t=document.getElementById("wp-admin-bar-apex-editlinks");if(t)t.addEventListener("click",function(e){e.preventDefault();var off=document.documentElement.classList.toggle("apx-ed-off");try{localStorage.setItem("apex.editlinks",off?"off":"on")}catch(x){}});
})();</script>';
}, 50 );
add_action( 'admin_bar_menu', function ( $bar ) {
	if ( is_admin() || ! current_user_can( 'edit_posts' ) ) return;
	$bar->add_node( [ 'id' => 'apex-editlinks', 'title' => __( 'Edit links on/off', 'apex' ), 'href' => '#', 'meta' => [ 'title' => __( 'Show or hide the Edit link on each section of the page', 'apex' ) ] ] );
}, 90 );

/* the block editor (services, articles, episodes): the page's other fields are in the Details box under the text */
add_action( 'enqueue_block_editor_assets', function () {
	$s = get_current_screen();
	if ( ! $s || ! in_array( $s->post_type, [ 'apex_service', 'apex_episode', 'post' ], true ) ) return;
	$msg = $s->post_type === 'apex_service'
		? __( 'The text here is the page\'s sections. The banner, introduction, recovery timeline, before and after photos, offers, videos, questions and SEO fields are in the Details box below the text: scroll down, or drag the bar at the bottom of the screen up.', 'apex' )
		: __( 'The cover image, summary and other fields are in the Details box below the text: scroll down, or drag the bar at the bottom of the screen up.', 'apex' );
	wp_add_inline_script( 'wp-edit-post', 'wp.domReady(function(){wp.data.dispatch("core/notices").createNotice("info",' . wp_json_encode( $msg ) . ',{id:"apex-details",isDismissible:true,actions:[{label:' . wp_json_encode( __( 'Go to Details', 'apex' ) ) . ',onClick:function(){var b=document.getElementById("apex-fields");if(!b)return;var p=document.querySelector(".edit-post-meta-boxes-main,.edit-post-layout__metaboxes");var t=p&&p.querySelector("button[aria-expanded=false]");if(t)t.click();setTimeout(function(){b.scrollIntoView({behavior:"smooth",block:"start"})},150)}}]})});' );
} );
