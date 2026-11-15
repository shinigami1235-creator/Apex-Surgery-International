<?php
// Router for PHP's built-in server: real files are served as they are, everything else goes to WordPress.
$path = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH );
$file = __DIR__ . '/site' . $path;
if ( $path !== '/' && is_file( $file ) ) {
	if ( preg_match( '#/\.ht#', $path ) ) { http_response_code( 403 ); exit; }
	return false;
}
if ( is_dir( $file ) && $path !== '/' ) {
	foreach ( [ 'index.php', 'index.html' ] as $i ) if ( is_file( rtrim( $file, '/' ) . '/' . $i ) ) {
		if ( substr( $path, -1 ) !== '/' ) { header( 'Location: ' . $path . '/', true, 301 ); exit; }
		return false;
	}
}
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/site/index.php';
chdir( __DIR__ . '/site' );
require __DIR__ . '/site/index.php';
