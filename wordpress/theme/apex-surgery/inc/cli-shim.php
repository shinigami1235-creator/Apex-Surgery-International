<?php
/**
 * Just enough of WP-CLI for the importer to run from an admin screen (Apex settings › Features › Add the
 * Chinese pages), on servers where IT has no command line. Messages are collected instead of printed.
 */
defined( 'ABSPATH' ) || exit;
if ( ! class_exists( 'WP_CLI' ) ) {
	class WP_CLI {
		public static array $out = [];
		public static function log( $m ) { self::$out[] = (string) $m; }
		public static function line( $m ) { self::$out[] = (string) $m; }
		public static function warning( $m ) { self::$out[] = 'Warning: ' . $m; }
		public static function success( $m ) { self::$out[] = (string) $m; }
		public static function error( $m, $exit = true ) { if ( $exit === false ) { self::$out[] = 'Error: ' . $m; return; } throw new RuntimeException( (string) $m ); }
		public static function add_command( ...$a ) {}
	}
}
