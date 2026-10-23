<?php
/**
 * wp apex import   load the design's content (import/content-<lang>.json) into WordPress, both languages
 * wp apex check    compare what WordPress now returns with the design's content, field by field
 * wp apex export   print one content object as WordPress returns it, e.g. wp apex export svc:facelift --lang=th
 * wp apex webp     save a WebP copy of every JPEG and PNG the content shows, and point the content at it
 *
 * The import can run again at any time: it finds each item by its key and language and updates it in place.
 * Polylang must be active (the free version is enough).
 */
defined( 'ABSPATH' ) || exit;

class Apex_CLI {
	private array $D = [];
	private array $meta = [];
	private array $made = [];   // type => key => lang => id, for linking translations
	private string $dir = '';

	/**
	 * Import the design's content.
	 *
	 * [--dir=<dir>]
	 * : Folder with content-en.json, content-th.json and meta.json. Default: the theme's import folder.
	 *
	 * [--only=<types>]
	 * : Comma list of: settings, pages, services, posts, episodes, offers, cases, branches, doctors.
	 *
	 * [--no-webp]
	 * : Leave JPEG and PNG photos as they are. Without it the import ends with `wp apex webp`.
	 */
	public function import( $args, $assoc ) {
		if ( ! function_exists( 'pll_set_post_language' ) ) WP_CLI::error( 'Polylang is not active. Run: wp plugin activate polylang' );
		$this->dir = rtrim( $assoc['dir'] ?? ( is_dir( APEX_DIR . '/import' ) ? APEX_DIR . '/import' : dirname( APEX_DIR, 2 ) . '/import' ), '/' );
		foreach ( APEX_LANGS as $l ) {
			$f = "{$this->dir}/content-$l.json";
			if ( ! is_readable( $f ) ) WP_CLI::error( "Missing $f" );
			$this->D[ $l ] = json_decode( file_get_contents( $f ), true );
		}
		$this->meta = is_readable( "{$this->dir}/meta.json" ) ? json_decode( file_get_contents( "{$this->dir}/meta.json" ), true ) : [];
		$only = isset( $assoc['only'] ) ? array_map( 'trim', explode( ',', $assoc['only'] ) ) : null;
		$run = fn( $k ) => ! $only || in_array( $k, $only, true );

		kses_remove_filters();
		wp_defer_term_counting( true );
		$this->languages();
		$this->site();
		if ( $run( 'settings' ) ) $this->settings();
		if ( $run( 'branches' ) ) $this->branches();
		if ( $run( 'doctors' ) ) $this->doctors();
		if ( $run( 'services' ) ) $this->services();
		if ( $run( 'posts' ) ) $this->posts();
		if ( $run( 'episodes' ) ) $this->episodes();
		if ( $run( 'offers' ) ) $this->offers();
		if ( $run( 'cases' ) ) $this->cases();
		if ( $run( 'pages' ) ) $this->pages();
		$this->link();
		wp_defer_term_counting( false );
		if ( empty( $assoc['no-webp'] ) ) { $w = apex_photo_pass( false, 40 ); if ( $w['kb'] ) WP_CLI::log( "Photos: {$w['done']} saved as WebP, {$w['kb']} KB lighter" ); }
		apex_data_bump();
		PLL()->model->clean_languages_cache();   // Polylang keeps each language's front page in its cache
		flush_rewrite_rules( false );
		WP_CLI::success( 'Imported. ' . implode( ', ', array_map( fn( $t ) => count( $this->made[ $t ] ?? [] ) . ' ' . $t, array_keys( $this->made ) ) ) );
	}

	/* ---------- setup ---------- */
	private function languages(): void {
		$have = pll_languages_list( [ 'fields' => 'slug' ] );
		$want = [ 'en' => [ 'locale' => 'en_US', 'name' => 'English', 'slug' => 'en', 'term_group' => 0 ], 'th' => [ 'locale' => 'th', 'name' => 'ไทย', 'slug' => 'th', 'term_group' => 1 ] ];
		foreach ( $want as $slug => $a ) {
			if ( in_array( $slug, $have, true ) ) continue;
			$r = PLL()->model->languages->add( $a + [ 'no_default_cat' => true ] );
			if ( is_wp_error( $r ) ) WP_CLI::error( "Language $slug: " . $r->get_error_message() );
			WP_CLI::log( "Added language $slug" );
		}
		// English at the root, Thai under /th/, the language set by the address alone, and the Thai front page at /th/
		$types = array_values( array_unique( array_merge( (array) PLL()->options->get( 'post_types' ), [ 'apex_service', 'apex_episode', 'apex_offer', 'apex_case', 'apex_branch', 'apex_doctor' ] ) ) );
		// browser: a first visit to the bare home page goes to /th/ when the browser asks for Thai (the old site was Thai only)
		$err = PLL()->options->merge( [ 'default_lang' => 'en', 'force_lang' => 1, 'hide_default' => true, 'rewrite' => true, 'redirect_lang' => true, 'browser' => true, 'media_support' => false, 'post_types' => $types ] );
		if ( $err->has_errors() ) WP_CLI::warning( 'Polylang settings: ' . implode( '; ', $err->get_error_messages() ) );
		PLL()->options->save();
		PLL()->model->clean_languages_cache();
	}
	private function site(): void {
		// WordPress's sample post and page, if nobody has touched them
		foreach ( [ [ 'hello-world', 'post' ], [ 'sample-page', 'page' ] ] as [ $slug, $type ] ) {
			$p = get_page_by_path( $slug, OBJECT, $type );
			if ( $p && $p->post_modified === $p->post_date ) wp_delete_post( $p->ID, true );
		}
		update_option( 'blogname', 'Apex Surgery Hospital' );
		update_option( 'blogdescription', 'Specialist plastic surgery hospital in Bangkok and Phuket' );
		update_option( 'permalink_structure', '/%category%/%postname%/' );
		update_option( 'category_base', 'category' );
		update_option( 'timezone_string', 'Asia/Bangkok' );
		update_option( 'default_comment_status', 'closed' );
		update_option( 'default_ping_status', 'closed' );
		update_option( 'uploads_use_yearmonth_folders', 1 );
	}

	/* ---------- helpers ---------- */
	/** Copy the schema's fields out of a design object. */
	private function pick( string $schema, array $obj ): array {
		$o = [];
		foreach ( apex_schema( $schema ) as $f ) if ( array_key_exists( $f['k'], $obj ) ) $o[ $f['k'] ] = $obj[ $f['k'] ];
		return $o;
	}
	private function find( string $type, string $key, string $lang ): int {
		$ids = get_posts( [ 'post_type' => $type, 'post_status' => 'any', 'posts_per_page' => -1, 'meta_key' => $type === 'page' ? '_apex_page' : '_apex_key', 'meta_value' => $key, 'lang' => '', 'suppress_filters' => true, 'fields' => 'ids' ] );
		foreach ( $ids as $id ) if ( apex_post_lang( $id ) === $lang ) return (int) $id;
		return 0;
	}
	/** Create or update one item, then set its language and slug (the slug needs the language to be shared). */
	private function upsert( string $type, string $key, string $lang, array $post, string $schema, array $vals, string $slug = '' ): int {
		$id = $this->find( $type, $key, $lang );
		$post += [ 'post_type' => $type, 'post_status' => 'publish', 'comment_status' => 'closed', 'ping_status' => 'closed' ];
		if ( $id ) { $post['ID'] = $id; wp_update_post( wp_slash( $post ) ); }
		else {
			$post['post_title'] = $post['post_title'] ?? $key;
			$id = wp_insert_post( wp_slash( $post ), true );
			if ( is_wp_error( $id ) ) WP_CLI::error( "$type $key ($lang): " . $id->get_error_message() );
		}
		pll_set_post_language( $id, $lang );
		update_post_meta( $id, $type === 'page' ? '_apex_page' : '_apex_key', $key );
		if ( $schema ) apex_write_post( $id, $schema, $vals );
		if ( $slug !== '' ) wp_update_post( [ 'ID' => $id, 'post_name' => $slug ] );
		$this->made[ $type ][ $key ][ $lang ] = $id;
		return $id;
	}
	private function link(): void {
		foreach ( $this->made as $type => $keys ) foreach ( $keys as $key => $ids ) if ( count( $ids ) > 1 ) pll_save_post_translations( $ids );
	}
	private function slug_of( string $path ): string {
		$parts = array_values( array_filter( explode( '/', $path ) ) );
		return strtolower( (string) end( $parts ) );
	}

	/* ---------- content ---------- */
	private function settings(): void {
		foreach ( APEX_LANGS as $l ) {
			$S = $this->D[ $l ]['shared'];
			$S['whatsapp'] = $S['whatsapp'] ?? [ 'x' => '+66 85 000 2001', 'h' => 'https://wa.me/66850002001' ];
			update_option( 'apex_shared_' . $l, [], true );
			apex_write_option( $l, $this->pick( 'shared', $S ) );
		}
		WP_CLI::log( 'Settings: done' );
	}
	private function branches(): void {
		foreach ( APEX_LANGS as $l ) foreach ( $this->D[ $l ]['shared']['branches'] ?? [] as $i => $b ) {
			$this->upsert( 'apex_branch', $b['key'], $l, [ 'menu_order' => $i ], 'apex_branch', $this->pick( 'apex_branch', $b ) );
		}
		WP_CLI::log( 'Branches: ' . count( $this->made['apex_branch'] ?? [] ) );
	}
	private function doctors(): void {
		foreach ( APEX_LANGS as $l ) {
			$d = $this->D[ $l ]['shared']['doctor'] ?? null;
			if ( $d ) $this->upsert( 'apex_doctor', 'surgeon-1', $l, [ 'menu_order' => 1 ], 'apex_doctor', [ 'kind' => 'doctor' ] + $this->pick( 'apex_doctor', $d ) );
			$f = $this->D[ $l ]['founder'] ?? null;
			if ( $f ) $this->upsert( 'apex_doctor', 'founder', $l, [ 'menu_order' => 0 ], 'apex_doctor', [ 'kind' => 'founder', 'nameAlt' => $f['nameTh'] ?? $f['nameEn'] ?? '' ] + $this->pick( 'apex_doctor', $f ) );
		}
		WP_CLI::log( 'Doctors: ' . count( $this->made['apex_doctor'] ?? [] ) );
	}
	private function services(): void {
		foreach ( APEX_LANGS as $l ) foreach ( $this->D[ $l ]['shared']['services'] ?? [] as $i => $m ) {
			$s = $this->D[ $l ][ 'svc:' . $m['key'] ] ?? null;
			if ( ! $s ) continue;
			$vals = $this->pick( 'apex_service', $s );
			$vals['menu'] = [ 'name' => $m['name'], 'short' => $m['short'], 'en' => $m['en'], 'icon' => $m['icon'], 'nav' => $m['nav'] ];
			$vals['sections'] = apex_sections_to_markup( $s['sections'] ?? [] );
			$slug = $l === 'th' ? $this->slug_of( $m['path'] ?? $m['key'] ) : $m['key'];
			$id = $this->upsert( 'apex_service', $m['key'], $l, [ 'menu_order' => $i ], 'apex_service', $vals, $slug );
			if ( $l === 'th' && ! empty( $m['path'] ) ) update_post_meta( $id, '_apex_old', apex_norm_path( $m['path'] ) );   // the live site's address
		}
		WP_CLI::log( 'Services: ' . count( $this->made['apex_service'] ?? [] ) );
	}
	private function category( string $cat, string $lang ): int {
		$names = [ 'en' => [ 'review' => 'Reviews', 'blog' => 'Articles', 'news' => 'News' ], 'th' => [ 'review' => 'รีวิว', 'blog' => 'บทความ', 'news' => 'ข่าวสาร' ] ];
		static $made = [];
		if ( isset( $made[ "$cat|$lang" ] ) ) return $made[ "$cat|$lang" ];
		$found = 0;
		foreach ( get_terms( [ 'taxonomy' => 'category', 'hide_empty' => false, 'lang' => '', 'meta_key' => '_apex_cat', 'meta_value' => $cat ] ) as $t ) {
			if ( pll_get_term_language( $t->term_id ) === $lang ) { $found = $t->term_id; break; }
		}
		// Thai keeps the live site's category addresses (/th/review/...); English has its own words, since
		// Polylang free keeps category slugs unique across languages
		$slug = $lang === 'th' ? $cat : [ 'review' => 'reviews', 'blog' => 'articles', 'news' => 'hospital-news' ][ $cat ];
		if ( ! $found ) {
			$r = wp_insert_term( $names[ $lang ][ $cat ], 'category', [ 'slug' => $slug ] );
			if ( is_wp_error( $r ) ) WP_CLI::error( "Category $cat ($lang): " . $r->get_error_message() );
			$found = (int) $r['term_id'];
			pll_set_term_language( $found, $lang );
			update_term_meta( $found, '_apex_cat', $cat );
		} elseif ( get_term( $found )->slug !== $slug ) {
			wp_update_term( $found, 'category', [ 'slug' => $slug ] );
		}
		return $made[ "$cat|$lang" ] = $found;
	}
	private function posts(): void {
		foreach ( APEX_LANGS as $l ) {
			$D = $this->D[ $l ];
			$excerpts = [];
			foreach ( $D['home']['news']['items'] ?? [] as $n ) $excerpts[ $n['key'] ] = $n['excerpt'] ?? '';
			foreach ( $D['posts'] as $i => $p ) {
				$o = $D[ 'post:' . $p['key'] ] ?? null;
				if ( ! $o ) continue;
				// the list is newest first; equal dates keep their order through the time of day
				$date = ( $p['date'] ?: '2025-01-01' ) . ' ' . gmdate( 'H:i:s', 86399 - $i * 60 );
				$cat = $this->category( $p['cat'], $l );
				$vals = [ 'img' => $o['img'] ?? $p['img'], 'author' => $o['author'] ?? '', 'tag' => $o['tag'] ?? '', 'excerpt' => $excerpts[ $p['key'] ] ?? '', 'blocks' => apex_blocks_to_markup( $o['blocks'] ?? [] ), 'desc' => $p['desc'] ?? '', 'title' => $o['title'] ];
				$slug = $l === 'th' ? $this->slug_of( $p['path'] ) : $p['key'];
				$id = $this->upsert( 'post', $p['key'], $l, [ 'post_date' => $date, 'post_date_gmt' => get_gmt_from_date( $date ), 'post_category' => [ $cat ] ], 'post', $vals, $slug );
				wp_set_post_categories( $id, [ $cat ] );
				if ( $l === 'th' && ! empty( $p['path'] ) ) update_post_meta( $id, '_apex_old', apex_norm_path( $p['path'] ) );
			}
		}
		$this->link_terms();
		WP_CLI::log( 'Articles: ' . count( $this->made['post'] ?? [] ) );
	}
	private function link_terms(): void {
		foreach ( [ 'review', 'blog', 'news' ] as $c ) {
			$ids = [];
			foreach ( APEX_LANGS as $l ) $ids[ $l ] = $this->category( $c, $l );
			pll_save_term_translations( $ids );
		}
	}
	private function episodes(): void {
		foreach ( APEX_LANGS as $l ) foreach ( $this->D[ $l ]['war']['episodes'] ?? [] as $e ) {
			$o = $this->D[ $l ][ 'war:' . $e['n'] ] ?? [];
			$vals = [ 'full' => $o['title'] ?? $e['full'], 'n' => $e['n'], 'title' => $e['title'], 'seo' => $o['seo'] ?? '', 'desc' => $o['desc'] ?? $e['desc'], 'yt' => $o['yt'] ?? $e['yt'], 'cover' => $e['cover'], 'img' => $e['img'], 'photos' => $e['photos'], 'blocks' => apex_blocks_to_markup( $o['blocks'] ?? [] ) ];
			$this->upsert( 'apex_episode', (string) $e['n'], $l, [ 'menu_order' => $e['n'] ], 'apex_episode', $vals, 'ep-' . $e['n'] );
		}
		WP_CLI::log( 'Episodes: ' . count( $this->made['apex_episode'] ?? [] ) );
	}
	private function offers(): void {
		foreach ( APEX_LANGS as $l ) {
			$D = $this->D[ $l ];
			$all = [];
			foreach ( $D['promotions']['items'] ?? [] as $i => $p ) $all[ $p['src'] ] = [ 'p' => $p, 'onPromotions' => true, 'order' => $i + 1 ];
			foreach ( $D['home']['promos']['items'] ?? [] as $i => $p ) {
				$all[ $p['src'] ] = ( $all[ $p['src'] ] ?? [ 'p' => $p ] ) + [ 'onHome' => true, 'homeOrder' => $i + 1 ];
				if ( ! empty( $p['price'] ) ) $all[ $p['src'] ]['p']['price'] = $p['price'];
			}
			foreach ( $all as $src => $x ) {
				$key = 'offer-' . substr( md5( basename( $src ) ), 0, 10 );
				$vals = [ 'alt' => $x['p']['alt'] ?? '', 'src' => $src, 'cat' => $x['p']['cat'] ?? '', 'price' => $x['p']['price'] ?? '', 'onPromotions' => ! empty( $x['onPromotions'] ), 'order' => $x['order'] ?? '', 'onHome' => ! empty( $x['onHome'] ), 'homeOrder' => $x['homeOrder'] ?? '' ];
				$this->upsert( 'apex_offer', $key, $l, [], 'apex_offer', $vals );
			}
		}
		WP_CLI::log( 'Offers: ' . count( $this->made['apex_offer'] ?? [] ) );
	}
	private function cases(): void {
		foreach ( APEX_LANGS as $l ) {
			$names = [];
			foreach ( $this->D[ $l ]['shared']['services'] ?? [] as $s ) $names[ $s['key'] ] = $s['short'] ?? $s['name'];
			foreach ( $this->D[ $l ]['reviews']['items'] ?? [] as $i => $c ) {
				$key = 'case-' . substr( md5( basename( $c['src'] ) ), 0, 10 );
				$vals = [ 'name' => ( $names[ $c['cat'] ?? '' ] ?? 'Case' ) . ' ' . ( $i + 1 ), 'src' => $c['src'], 'cat' => $c['cat'] ?? '', 'alt' => $c['alt'] ?? '' ];
				$this->upsert( 'apex_case', $key, $l, [ 'menu_order' => $i ], 'apex_case', $vals );
			}
		}
		WP_CLI::log( 'Cases: ' . count( $this->made['apex_case'] ?? [] ) );
	}
	private function pages(): void {
		$src = [ 'home' => 'home', 'about' => 'about', 'services' => 'services', 'promotions' => 'promotions', 'reviews' => 'reviews', 'blog' => 'blogs', 'contact' => 'contact', 'privacy' => 'privacy' ];
		$i18n_title = [ 'about' => 'about', 'services' => 'services', 'doctor' => 'doctorsH', 'promotions' => 'promotions', 'reviews' => 'reviews', 'blog' => 'articles', 'war' => 'war', 'contact' => 'contact', 'nose' => 'nose', 'analysis' => 'ana', 'proportions' => 'prop', 'implBreast' => 'implBreastH', 'implChin' => 'implChinH', 'implForehead' => 'implForeheadH', 'implNose' => 'implNoseH', 'play' => 'games', 'plan' => 'plan', 'trip' => 'trip', 'consult' => 'consultPageH' ];
		$order = 0;
		foreach ( apex_page_types() as $key => [ $label, $en_slug, $th_slug ] ) {
			$order++;
			foreach ( APEX_LANGS as $l ) {
				$D = $this->D[ $l ];
				$obj = isset( $src[ $key ] ) ? ( $D[ $src[ $key ] ] ?? [] ) : [];
				$vals = $this->pick( 'page:' . $key, $obj );
				if ( $key === 'home' ) {
					$vals['news'] = [ 'h' => $obj['news']['h'] ?? '', 'posts' => array_column( $obj['news']['items'] ?? [], 'key' ) ];
					$vals['reviews'] = [ 'h' => $obj['reviews']['h'] ?? '' ];
					$vals['promos'] = [ 'h' => $obj['promos']['h'] ?? '' ];
				}
				if ( $key === 'privacy' && isset( $vals['blocks'] ) ) $vals['blocks'] = apex_blocks_to_markup( (array) $vals['blocks'] );
				$m = $this->meta[ $l ][ $key ] ?? null;
				if ( $m ) { $vals['title'] = $vals['title'] ?? $m[0]; $vals['desc'] = $vals['desc'] ?? $m[1]; }
				$title = $key === 'home' ? 'Apex Surgery Hospital' : apex_with_lang( $l, fn() => apex_t( $i18n_title[ $key ] ?? $key ) );
				$slug = $key === 'home' ? 'home' : ( $l === 'th' ? $th_slug : $en_slug );
				$id = $this->upsert( 'page', $key, $l, [ 'post_title' => $title, 'menu_order' => $order ], 'page:' . $key, $vals, $slug );
				// the live Thai site had these pages at the root
				if ( $l === 'th' && in_array( $th_slug, [ 'about-us', 'surgery', 'reviews', 'blogs', 'promotions', 'contact-us' ], true ) ) update_post_meta( $id, '_apex_old', $th_slug );
			}
		}
		$home = $this->made['page']['home']['en'] ?? 0;
		if ( $home ) { update_option( 'show_on_front', 'page' ); update_option( 'page_on_front', $home ); }
		if ( $p = $this->made['page']['privacy']['en'] ?? 0 ) update_option( 'wp_page_for_privacy_policy', $p );   // Settings › Privacy
		WP_CLI::log( 'Pages: ' . count( $this->made['page'] ?? [] ) );
	}

	/**
	 * Compare WordPress's content with the design's, field by field.
	 *
	 * [--dir=<dir>]
	 * : Folder with content-<lang>.json.
	 */
	public function check( $args, $assoc ) {
		$dir = rtrim( $assoc['dir'] ?? ( is_dir( APEX_DIR . '/import' ) ? APEX_DIR . '/import' : dirname( APEX_DIR, 2 ) . '/import' ), '/' );
		if ( ! defined( 'APEX_NO_CACHE' ) ) define( 'APEX_NO_CACHE', true );
		$bad = 0; $n = 0;
		foreach ( APEX_LANGS as $l ) {
			$D = json_decode( file_get_contents( "$dir/content-$l.json" ), true );
			foreach ( $D as $id => $want ) {
				$n++;
				$got = apex_data( $id, $l );
				$diff = [];
				self::cmp( self::clean( $want, $id ), self::clean( $got, $id ), $id, $diff );
				if ( $diff ) { $bad++; WP_CLI::log( "[$l] $id" ); foreach ( array_slice( $diff, 0, 8 ) as $d ) WP_CLI::log( '   ' . $d ); }
			}
		}
		$bad ? WP_CLI::error( "$bad of $n content objects differ", false ) : WP_CLI::success( "All $n content objects match the design" );
	}
	/** Drops what the design files carry from the old site that no page reads, and empty values. */
	private static function clean( $v, string $id, string $path = '' ) {
		if ( is_array( $v ) ) {
			$list = array_is_list( $v );
			$o = [];
			foreach ( $v as $k => $x ) {
				$p = $path === '' ? (string) $k : "$path.$k";
				if ( ! $list ) {
					$top = explode( ':', $id )[0];
					if ( in_array( $k, [ 'path', 'more', 'btn', 'banner', 'cards', 'pages', 'baTabs', 'keys', 'book', 'consult', 'form' ], true ) ) continue;
					if ( $path === '' && $k === 'nav' && $top === 'shared' ) continue;
					if ( $path === '' && in_array( $k, [ 'doctor', 'services', 'yt' ], true ) && in_array( $top, [ 'home', 'about' ], true ) ) continue;
					if ( $path === '' && $k === 'items' && $top === 'blogs' ) continue;
					if ( $p === 'tiktok.videos' && $top === 'home' ) continue;
					if ( $path === '' && $k === 'whatsapp' ) continue;
					if ( $path === '' && $k === 'img' && $top === 'contact' ) continue;
					// cards show the article's own title (the old site's list sometimes worded it differently),
					// and an offer shown on both pages carries the procedure set on the promotions page
					if ( $k === 'title' && ( $top === 'posts' || str_starts_with( $path, 'news.items.' ) ) ) continue;
					if ( $k === 'cat' && str_starts_with( $path, 'promos.items.' ) && $top === 'home' ) continue;
				}
				// a list item may be {x: text} or the text itself
				if ( $list && is_array( $x ) && array_keys( $x ) === [ 'x' ] ) $x = $x['x'];
				$c = self::clean( $x, $id, $p );
				if ( $c === null || $c === '' || $c === [] || $c === false ) continue;
				if ( ! $list && in_array( $k, [ 'o', 'b' ], true ) && ! $c ) continue;   // flags: 0 is the same as absent
				$o[ $k ] = $c;
			}
			return $list ? array_values( $o ) : $o;
		}
		// a photo saved again as WebP by `wp apex webp` is the same photo
		if ( is_string( $v ) ) return trim( preg_replace( [ '/[ \t]+\n/', '#(/wp-content/uploads/[^"\'\s()<>?]+?)\.(?:jpe?g|png|webp)(?=["\'\s()<>?]|$)#i' ], [ "\n", '$1.photo' ], $v ) );
		return $v;
	}
	private static function cmp( $a, $b, string $p, array &$diff ): void {
		if ( is_array( $a ) && is_array( $b ) ) {
			foreach ( array_unique( array_merge( array_keys( $a ), array_keys( $b ) ) ) as $k ) {
				if ( ! array_key_exists( $k, $a ) ) { $diff[] = "$p.$k: extra " . self::short( $b[ $k ] ); continue; }
				if ( ! array_key_exists( $k, $b ) ) { $diff[] = "$p.$k: missing " . self::short( $a[ $k ] ); continue; }
				self::cmp( $a[ $k ], $b[ $k ], "$p.$k", $diff );
			}
			return;
		}
		if ( is_numeric( $a ) && is_numeric( $b ) && $a == $b ) return;
		if ( $a !== $b ) $diff[] = "$p: want " . self::short( $a ) . ' got ' . self::short( $b );
	}
	private static function short( $v ): string { $s = is_scalar( $v ) ? var_export( $v, true ) : wp_json_encode( $v, JSON_UNESCAPED_UNICODE ); return mb_strlen( $s ) > 90 ? mb_substr( $s, 0, 90 ) . '…' : $s; }

	/**
	 * Save a WebP copy of every JPEG and PNG photo the content shows, and point the content at the copy.
	 * The original files stay in the uploads folder, so nothing breaks if a copy is deleted later.
	 *
	 * [--dry-run]
	 * : List what would change and how much lighter it would be, and change nothing.
	 *
	 * [--min-kb=<kb>]
	 * : Leave photos smaller than this alone. Default 40.
	 */
	public function webp( $args, $assoc ) {
		$dry = ! empty( $assoc['dry-run'] );
		$r = apex_photo_pass( $dry, (int) ( $assoc['min-kb'] ?? 40 ), fn( $m ) => WP_CLI::log( $m ) );
		if ( ! $dry ) apex_data_bump();
		WP_CLI::success( ( $dry ? 'Would save ' : 'Saved ' ) . "{$r['done']} photos as WebP, {$r['kb']} KB lighter in all. {$r['missing']} photos the content shows are not in the uploads folder." );
	}
	/**
	 * Print one content object as JSON.
	 *
	 * <id>
	 * : For example shared, home, svc:facelift, post:smas, war:3
	 *
	 * [--lang=<lang>]
	 * : en or th. Default en.
	 */
	public function export( $args, $assoc ) {
		if ( ! defined( 'APEX_NO_CACHE' ) ) define( 'APEX_NO_CACHE', true );
		WP_CLI::line( wp_json_encode( apex_data( $args[0], $assoc['lang'] ?? 'en' ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
	}
}
WP_CLI::add_command( 'apex', 'Apex_CLI' );
