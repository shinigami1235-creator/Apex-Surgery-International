<?php
// wp eval-file tests/wordpress/urls.php : every public address of the site, both languages, as JSON
$out = [];
foreach ( [ 'page', 'apex_service', 'post', 'apex_episode', 'apex_doctor' ] as $t ) {
	foreach ( get_posts( [ 'post_type' => $t, 'post_status' => 'publish', 'posts_per_page' => -1, 'lang' => '', 'fields' => 'ids', 'orderby' => 'ID', 'order' => 'ASC' ] ) as $id ) {
		if ( $t === 'apex_doctor' && ! in_array( get_post_meta( $id, 'apex_kind', true ), [ 'team', 'founder' ], true ) ) continue;   // the lead surgeon card has no page
		$out[] = get_permalink( $id );
	}
}
echo wp_json_encode( array_values( array_unique( $out ) ), JSON_UNESCAPED_SLASHES );
