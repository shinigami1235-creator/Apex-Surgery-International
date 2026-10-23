<?php
/**
 * Photos turn into WebP as they are uploaded. A JPEG or PNG is saved again as WebP at quality 82 and the
 * WebP copy replaces it, when the copy is smaller; the sizes WordPress cuts from it are WebP too.
 * Settings › Media › "Save uploaded photos as WebP" turns this off. GIFs, PDFs and video are left alone.
 */
defined( 'ABSPATH' ) || exit;

function apex_webp_on(): bool { return (bool) get_option( 'apex_webp', 1 ); }

add_filter( 'wp_handle_upload', function ( array $u, string $ctx ) {
	if ( ! apex_webp_on() || ! empty( $u['error'] ) || ! in_array( $u['type'] ?? '', [ 'image/jpeg', 'image/png' ], true ) ) return $u;
	if ( ! wp_image_editor_supports( [ 'mime_type' => 'image/webp' ] ) ) return $u;
	$ed = wp_get_image_editor( $u['file'] );
	if ( is_wp_error( $ed ) ) return $u;
	if ( method_exists( $ed, 'maybe_exif_rotate' ) ) $ed->maybe_exif_rotate();   // phone photos keep the right way up
	$ed->set_quality( 82 );
	$info = pathinfo( $u['file'] );
	$name = $info['filename'] . '.webp';   // photo.jpg becomes photo.webp unless that name is taken
	if ( file_exists( $info['dirname'] . '/' . $name ) ) $name = wp_unique_filename( $info['dirname'], $name );
	$saved = $ed->save( $info['dirname'] . '/' . $name, 'image/webp' );
	if ( is_wp_error( $saved ) || empty( $saved['path'] ) || ! file_exists( $saved['path'] ) ) return $u;
	if ( filesize( $saved['path'] ) >= filesize( $u['file'] ) ) { wp_delete_file( $saved['path'] ); return $u; }
	wp_delete_file( $u['file'] );
	return [ 'file' => $saved['path'], 'url' => dirname( $u['url'] ) . '/' . basename( $saved['path'] ), 'type' => 'image/webp' ] + $u;
}, 10, 2 );

/* Settings › Media */
add_action( 'admin_init', function () {
	register_setting( 'media', 'apex_webp', [ 'type' => 'integer', 'default' => 1, 'sanitize_callback' => fn( $v ) => $v ? 1 : 0 ] );
	add_settings_field( 'apex_webp', __( 'Save uploaded photos as WebP', 'apex' ), function () {
		echo '<label><input type="checkbox" name="apex_webp" value="1"' . checked( apex_webp_on(), true, false ) . '> ' . esc_html__( 'JPEG and PNG uploads are saved as WebP, which loads faster. The original is not kept.', 'apex' ) . '</label>';
	}, 'media', 'default' );
} );
