<?php
/**
 * The fields of every content type. The keys are the design's own data keys (assets/data/<lang>/*.js),
 * so the admin forms, the importer and the data layer all read one list.
 *
 * Field: [ 'k' => key, 't' => type, 'l' => label, 'h' => help, 'f' => sub-fields, 'o' => choices, 'src' => storage ]
 * Types: text, textarea, url, image, number, bool, select, lines (one item per line), group, repeater,
 *        scalars (a repeater of one image or URL each), posts (articles picked by key), content (the editor).
 * src: 'title' keeps the value in the post title, 'excerpt' in the excerpt, 'date' in the post date.
 */
defined( 'ABSPATH' ) || exit;

function apex_f( string $k, string $t, string $l, array $more = [] ): array { return [ 'k' => $k, 't' => $t, 'l' => $l ] + $more; }
function apex_img_alt( string $k, string $l ): array { return apex_f( $k, 'group', $l, [ 'f' => [ apex_f( 'src', 'image', 'Image' ), apex_f( 'alt', 'text', 'Alt text', [ 'h' => 'What the picture shows, for screen readers and search engines' ] ) ] ] ); }
function apex_link_f( string $k, string $l, string $x = 'Text', string $h = 'Link' ): array { return apex_f( $k, 'group', $l, [ 'f' => [ apex_f( 'x', 'text', $x ), apex_f( 'h', 'url', $h ) ] ] ); }
function apex_seo_f(): array {
	return [
		apex_f( 'title', 'text', 'SEO title', [ 'h' => 'Shown in Google and the browser tab. Rank Math\'s own title wins when it is filled in.' ] ),
		apex_f( 'desc', 'textarea', 'SEO description', [ 'h' => 'One or two sentences for Google. Rank Math\'s own description wins when it is filled in.' ] ),
	];
}
function apex_service_keys(): array {
	return [ 'facelift' => 'Facelift', 'browlift' => 'Brow lift', 'rhinoplasty' => 'Rhinoplasty', 'eyelid' => 'Double eyelid surgery', 'breast' => 'Breast augmentation', 'lipo' => 'Liposuction' ];
}

function apex_schema( string $type ): array {
	static $S = null;
	if ( $S !== null ) return $S[ $type ] ?? [];
	$cats = [ '' => '(none)' ] + apex_service_keys();
	$S = [];

	/* ---------- settings shared by every page, one copy per language ---------- */
	$S['shared'] = [
		apex_f( 'brand', 'text', 'Hospital name' ),
		apex_f( 'brandTh', 'text', 'Hospital name in Thai' ),
		apex_f( 'logo', 'image', 'Logo' ),
		apex_f( 'logoAll', 'image', 'Group logo' ),
		apex_f( 'license', 'text', 'Advertising permit number', [ 'h' => 'Shown in the footer, for example ฆสพ.สบส.866/2569' ] ),
		apex_f( 'line', 'group', 'LINE', [ 'f' => [ apex_f( 'x', 'text', 'LINE ID' ), apex_f( 'h', 'url', 'LINE link' ), apex_f( 'qr', 'image', 'LINE QR code' ) ] ] ),
		apex_f( 'whatsapp', 'group', 'WhatsApp', [ 'f' => [ apex_f( 'x', 'text', 'Number as shown', [ 'h' => 'For example +66 85 000 2001' ] ), apex_f( 'h', 'url', 'wa.me link', [ 'h' => 'For example https://wa.me/66850002001' ] ) ] ] ),
		apex_f( 'socials', 'repeater', 'Social accounts', [ 'f' => [ apex_f( 'k', 'select', 'Network', [ 'o' => [ 'facebook' => 'Facebook', 'line' => 'LINE', 'instagram' => 'Instagram', 'tiktok' => 'TikTok', 'youtube' => 'YouTube', 'x' => 'X' ] ] ), apex_f( 'x', 'text', 'Account name' ), apex_f( 'h', 'url', 'Link' ) ] ] ),
		apex_f( 'facebook', 'group', 'Facebook page shown on the site', [ 'h' => 'The page whose feed appears on the home and reviews pages', 'f' => [ apex_f( 'x', 'text', 'Page name' ), apex_f( 'h', 'url', 'Page link' ) ] ] ),
		apex_f( 'facebookSurgery', 'group', 'Second Facebook page', [ 'h' => 'Shown as a link card beside the feed', 'f' => [ apex_f( 'x', 'text', 'Page name' ), apex_f( 'h', 'url', 'Page link' ) ] ] ),
		apex_f( 'branchesH', 'text', 'Branches heading' ),
		apex_f( 'branchesP', 'textarea', 'Branches text' ),
		apex_f( 'founder', 'textarea', 'Founder sentence', [ 'h' => 'Shown on the about page when the founder profile is not published' ] ),
		apex_f( 'servicesFooterH', 'text', 'Footer services heading' ),
		apex_f( 'footerH', 'group', 'Footer headings', [ 'f' => [ apex_f( 'ploenchit', 'text', 'Phloen Chit' ), apex_f( 'phuket', 'text', 'Phuket' ), apex_f( 'line', 'text', 'LINE' ) ] ] ),
		apex_f( 'consultH', 'text', 'Consultation heading' ),
		apex_f( 'cta', 'group', 'Button wording', [ 'f' => [ apex_f( 'line', 'text', 'LINE button' ), apex_f( 'lineSub', 'text', 'LINE button note' ), apex_f( 'call', 'text', 'Call button' ), apex_f( 'callSub', 'text', 'Call button note' ), apex_f( 'book', 'text', 'Book button' ), apex_f( 'free', 'text', 'Free consultation button' ), apex_f( 'consult', 'text', 'Consultation box heading' ) ] ] ),
		apex_f( 'formH', 'text', 'Form heading' ),
		apex_f( 'formImg', 'image', 'Form image' ),
		apex_f( 'footerNote', 'textarea', 'Footer note', [ 'h' => 'The advertising note under the footer and the promotions' ] ),
		apex_f( 'copyright', 'text', 'Copyright line' ),
		apex_f( 'aaci', 'group', 'AACI accreditation', [ 'f' => [ apex_f( 'src', 'image', 'Badge' ), apex_f( 'h', 'url', 'Certificate link' ), apex_f( 'alt', 'text', 'Alt text' ) ] ] ),
	];

	/* ---------- services ---------- */
	$S['apex_service'] = [
		apex_f( 'name', 'text', 'Page heading', [ 'src' => 'title' ] ),
		apex_f( 'key', 'select', 'Procedure', [ 'o' => apex_service_keys(), 'h' => 'Links the page to its recovery facts, before and after cases, offers and My Plan' ] ),
		apex_f( 'en', 'text', 'Small heading above the name' ),
		apex_f( 'menu', 'group', 'In menus and service cards', [ 'f' => [ apex_f( 'name', 'text', 'Name' ), apex_f( 'short', 'text', 'Short name' ), apex_f( 'en', 'text', 'Second line' ), apex_f( 'icon', 'image', 'Icon' ), apex_f( 'nav', 'text', 'Menu label' ) ] ] ),
		...apex_seo_f(),
		apex_f( 'hero', 'image', 'Banner image' ),
		apex_f( 'heroAlt', 'text', 'Banner alt text' ),
		apex_f( 'byline', 'text', 'Surgeon line', [ 'h' => 'For example: Dr. Somboon Waiphrip, License no. 22713, Apex Surgery Hospital' ] ),
		apex_f( 'atApex', 'group', 'Introduction', [ 'f' => [ apex_f( 'h', 'text', 'Heading' ), apex_f( 'img', 'image', 'Photo' ), apex_f( 'alt', 'text', 'Photo alt text' ) ] ] ),
		apex_f( 'intro', 'lines', 'Introduction paragraphs', [ 'h' => 'One paragraph per line. Lines starting with ✔ become ticked points.' ] ),
		apex_f( 'tagline', 'lines', 'Tagline beside the photo', [ 'h' => 'One short line each' ] ),
		apex_f( 'badges', 'repeater', 'Badges', [ 'f' => [ apex_f( 'src', 'image', 'Image' ), apex_f( 'alt', 'text', 'Alt text' ) ] ] ),
		apex_f( 'sections', 'content', 'Sections', [ 'h' => 'Each Section block in the editor becomes one section of the page, with its heading on top.' ] ),
		apex_f( 'baH', 'text', 'Before and after heading' ),
		apex_f( 'ba', 'scalars', 'Before and after images', [ 'item' => 'image' ] ),
		apex_f( 'reviewsH', 'text', 'Reviews heading' ),
		apex_f( 'reviewImgs', 'repeater', 'Review images', [ 'f' => [ apex_f( 'src', 'image', 'Image' ), apex_f( 'alt', 'text', 'Alt text' ) ] ] ),
		apex_f( 'videos', 'scalars', 'Review videos (MP4)', [ 'item' => 'url', 'h' => 'Upload the MP4 to the media library and paste its link' ] ),
		apex_f( 'yt', 'lines', 'YouTube videos', [ 'h' => 'One video id per line, the part after watch?v=' ] ),
		apex_link_f( 'tiktok', 'TikTok link' ),
		apex_f( 'promoTag', 'lines', 'Offers small heading', [ 'h' => 'One word per line' ] ),
		apex_f( 'promoH', 'text', 'Offers heading' ),
		apex_f( 'promos', 'repeater', 'Offer posters', [ 'f' => [ apex_f( 'src', 'image', 'Poster' ), apex_f( 'alt', 'text', 'Alt text', [ 'h' => 'Name the offer, since its title is taken from this text' ] ), apex_f( 'price', 'number', 'Price in baht', [ 'h' => 'Leave empty to show "Ask for the price"' ] ) ] ] ),
		apex_f( 'faqH', 'text', 'Questions heading' ),
		apex_f( 'faqs', 'repeater', 'Questions and answers', [ 'f' => [ apex_f( 'q', 'text', 'Question' ), apex_f( 'a', 'lines', 'Answer', [ 'h' => 'One paragraph per line' ] ) ] ] ),
	];

	/* ---------- articles ---------- */
	$S['post'] = [
		apex_f( 'title', 'text', 'Title', [ 'src' => 'title' ] ),
		apex_f( 'key', 'text', 'Article key', [ 'h' => 'Links the English and Thai versions and keeps old links working. Lowercase letters, numbers and dashes.' ] ),
		apex_f( 'img', 'image', 'Cover image' ),
		apex_f( 'author', 'text', 'Author line' ),
		apex_f( 'desc', 'textarea', 'Summary', [ 'src' => 'excerpt', 'h' => 'Shown on article cards and as the description in Google' ] ),
		apex_f( 'excerpt', 'textarea', 'Card text on the home page', [ 'h' => 'Leave empty to use the summary' ] ),
		apex_f( 'tag', 'text', 'Procedure tag', [ 'h' => 'Optional. Words that name the procedure, used to pick the key facts box' ] ),
		apex_f( 'blocks', 'content', 'Article' ),
	];

	/* ---------- Surgery Wars episodes ---------- */
	$S['apex_episode'] = [
		apex_f( 'full', 'text', 'Full title', [ 'src' => 'title' ] ),
		apex_f( 'n', 'number', 'Episode number' ),
		apex_f( 'title', 'text', 'Short title', [ 'h' => 'Shown on the episode cards' ] ),
		apex_f( 'seo', 'text', 'SEO title' ),
		apex_f( 'desc', 'textarea', 'Description', [ 'src' => 'excerpt' ] ),
		apex_f( 'yt', 'text', 'YouTube video id' ),
		apex_f( 'cover', 'image', 'Card image (640 × 336)' ),
		apex_f( 'img', 'image', 'Video poster (1200 × 630)' ),
		apex_f( 'photos', 'number', 'Number of photos' ),
		apex_f( 'blocks', 'content', 'Article' ),
	];

	/* ---------- offers, before and after cases, branches, doctors ---------- */
	$S['apex_offer'] = [
		apex_f( 'alt', 'text', 'Offer name', [ 'src' => 'title', 'h' => 'Also the poster\'s alt text. The card title and tags are taken from it.' ] ),
		apex_f( 'src', 'image', 'Poster' ),
		apex_f( 'cat', 'select', 'Procedure', [ 'o' => $cats ] ),
		apex_f( 'price', 'number', 'Price in baht', [ 'h' => 'Leave empty to show "Ask for the price". The offer with a price shows large at the top.' ] ),
		apex_f( 'onPromotions', 'bool', 'Show on the promotions page' ),
		apex_f( 'order', 'number', 'Order on the promotions page' ),
		apex_f( 'onHome', 'bool', 'Show on the home page' ),
		apex_f( 'homeOrder', 'number', 'Order on the home page' ),
	];
	$S['apex_case'] = [
		apex_f( 'name', 'text', 'Case name', [ 'src' => 'title', 'h' => 'For the admin list only' ] ),
		apex_f( 'src', 'image', 'Before and after image', [ 'h' => 'The file name can carry the facts: BA_Area_Name_6M.webp shows the area and a 6-month follow-up.' ] ),
		apex_f( 'cat', 'select', 'Procedure', [ 'o' => $cats ] ),
		apex_f( 'alt', 'text', 'Alt text', [ 'h' => 'Optional. What the image shows.' ] ),
	];
	$S['apex_branch'] = [
		apex_f( 'name', 'text', 'Branch name', [ 'src' => 'title' ] ),
		apex_f( 'key', 'text', 'Branch key', [ 'h' => 'ploenchit or phuket. Used by the consultation form and the trip planner.' ] ),
		apex_f( 'short', 'text', 'Short name' ),
		apex_f( 'addr', 'textarea', 'Address' ),
		apex_f( 'phone', 'text', 'Phone as shown' ),
		apex_f( 'tel', 'url', 'Phone link', [ 'h' => 'For example tel:0888700039' ] ),
		apex_f( 'map', 'url', 'Google Maps link' ),
		apex_f( 'img', 'image', 'Photo' ),
	];
	$S['apex_doctor'] = [
		apex_f( 'name', 'text', 'Name', [ 'src' => 'title' ] ),
		apex_f( 'kind', 'select', 'Shown as', [ 'o' => [ 'doctor' => 'Surgeon (doctor card)', 'founder' => 'Founder (profile with biography)' ] ] ),
		apex_f( 'nameAlt', 'text', 'Name in the other language', [ 'h' => 'The Thai name on the English page, the English name on the Thai page' ] ),
		apex_f( 'nick', 'text', 'Short name' ),
		apex_f( 'license', 'text', 'License line' ),
		apex_f( 'title', 'text', 'Job title' ),
		apex_f( 'role', 'text', 'Role' ),
		apex_f( 'specialty', 'textarea', 'Specialty' ),
		apex_f( 'photo', 'image', 'Photo' ),
		apex_f( 'portrait', 'image', 'Portrait (founder)' ),
		apex_f( 'eduH', 'text', 'Education heading' ),
		apex_f( 'edu', 'lines', 'Education', [ 'h' => 'One per line' ] ),
		apex_f( 'moreH', 'text', 'Further education heading' ),
		apex_f( 'more', 'lines', 'Further education and memberships', [ 'h' => 'One per line' ] ),
		apex_f( 'rolesH', 'text', 'Roles heading (founder)' ),
		apex_f( 'roles', 'lines', 'Roles (founder)', [ 'h' => 'One per line. "Label: text" shows the label in bold.' ] ),
		apex_f( 'years', 'repeater', 'Milestones (founder)', [ 'f' => [ apex_f( 'y', 'text', 'Year' ), apex_f( 'x', 'text', 'What happened' ) ] ] ),
		apex_f( 'bio', 'lines', 'Biography (founder)', [ 'h' => 'One paragraph per line. The first shows in full, the rest under Read more.' ] ),
		apex_f( 'quote', 'textarea', 'Quote (founder)' ),
		apex_f( 'check', 'group', 'License check (founder)', [ 'f' => [ apex_f( 'h', 'url', 'Medical Council check link' ) ] ] ),
		apex_f( 'checkX', 'text', 'License check button' ),
		apex_f( 'aaci', 'group', 'Accreditation (founder)', [ 'f' => [ apex_f( 'src', 'image', 'Badge' ), apex_f( 'h', 'url', 'Link' ), apex_f( 'alt', 'text', 'Alt text' ) ] ] ),
	];

	/* ---------- pages, by their page type ---------- */
	$branches = apex_f( 'branches', 'group', 'Branches section', [ 'f' => [ apex_f( 'h', 'text', 'Heading' ), apex_f( 'p', 'textarea', 'Text' ) ] ] );
	$S['page:home'] = [
		...apex_seo_f(),
		apex_img_alt( 'hero', 'Share image' ),
		apex_f( 'h1', 'text', 'Main heading' ),
		apex_f( 'h2', 'text', 'Second heading', [ 'h' => 'On the English page the Thai hospital name shows here instead' ] ),
		apex_f( 'intro', 'group', 'Introduction', [ 'f' => [ apex_f( 'x', 'textarea', 'Text' ) ] ] ),
		apex_f( 'servicesH', 'text', 'Services heading' ),
		apex_f( 'reviews', 'group', 'Before and after section', [ 'h' => 'The cases come from Before and after cases', 'f' => [ apex_f( 'h', 'text', 'Heading' ) ] ] ),
		apex_f( 'reviewsRealH', 'text', 'Review videos heading' ),
		apex_f( 'videos', 'scalars', 'Review videos (MP4)', [ 'item' => 'url' ] ),
		apex_f( 'tiktok', 'group', 'TikTok', [ 'f' => [ apex_f( 'h', 'text', 'Link heading' ), apex_f( 'link', 'group', 'Link', [ 'f' => [ apex_f( 'x', 'text', 'Link text' ), apex_f( 'h', 'url', 'TikTok link' ), apex_f( 'handle', 'text', 'Handle' ) ] ] ) ] ] ),
		apex_f( 'promos', 'group', 'Offers section', [ 'h' => 'Pick the offers under Offers > Show on the home page', 'f' => [ apex_f( 'h', 'text', 'Heading' ) ] ] ),
		$branches,
		apex_f( 'news', 'group', 'News section', [ 'f' => [ apex_f( 'h', 'text', 'Heading' ), apex_f( 'posts', 'posts', 'Articles shown', [ 'h' => 'Up to four. Leave empty for the newest articles.' ] ) ] ] ),
	];
	$S['page:about'] = [
		...apex_seo_f(),
		apex_f( 'h1', 'text', 'Heading' ),
		apex_img_alt( 'hero', 'Banner' ),
		apex_f( 'intro', 'lines', 'Introduction', [ 'h' => 'One paragraph per line' ] ),
		apex_f( 'visionH', 'text', 'Vision heading' ),
		apex_f( 'vision', 'textarea', 'Vision' ),
		apex_f( 'pillars', 'repeater', 'Three pillars', [ 'f' => [ apex_f( 'h', 'text', 'Heading' ), apex_f( 'x', 'textarea', 'Text' ) ] ] ),
		$branches,
	];
	$S['page:services'] = [ ...apex_seo_f(), apex_f( 'h', 'text', 'Heading' ) ];
	$S['page:promotions'] = [ ...apex_seo_f(), apex_f( 'h1', 'text', 'Heading' ), apex_f( 'filters', 'repeater', 'Filter labels', [ 'f' => [ apex_f( 'k', 'select', 'Procedure', [ 'o' => [ 'all' => 'All' ] + apex_service_keys() ] ), apex_f( 'x', 'text', 'Label' ) ] ] ) ];
	$S['page:reviews'] = [ ...apex_seo_f(), apex_f( 'h1', 'text', 'Heading' ) ];
	$S['page:blog'] = [ ...apex_seo_f(), apex_f( 'h1', 'text', 'Heading' ) ];
	$S['page:contact'] = [ ...apex_seo_f(), apex_f( 'h1', 'text', 'Heading' ), apex_f( 'formH', 'text', 'Form heading' ), $branches ];
	foreach ( [ 'doctor', 'war', 'nose', 'analysis', 'proportions', 'implBreast', 'implChin', 'implForehead', 'implNose', 'play', 'plan', 'trip', 'consult', 'notfound' ] as $k ) $S[ 'page:' . $k ] = apex_seo_f();
	return $S[ $type ] ?? [];
}

/** The design page types, with the WordPress page slug each language uses. English slugs differ from
 *  the live Thai site's where the old Thai address must forward to the Thai page. */
function apex_page_types(): array {
	return [
		'home' => [ 'Home', '', '' ],
		'about' => [ 'About', 'about', 'about-us' ],
		'services' => [ 'Services', 'services', 'surgery' ],
		'doctor' => [ 'Doctors', 'doctors', 'doctors' ],
		'promotions' => [ 'Promotions', 'offers', 'promotions' ],
		'reviews' => [ 'Reviews', 'patient-reviews', 'reviews' ],
		'blog' => [ 'Articles', 'articles', 'blogs' ],
		'war' => [ 'Surgery Wars', 'surgery-wars', 'surgery-wars' ],
		'contact' => [ 'Contact', 'contact', 'contact-us' ],
		'nose' => [ 'Nose preview', 'nose-preview', 'nose-preview' ],
		'analysis' => [ 'Face analysis', 'face-analysis', 'face-analysis' ],
		'proportions' => [ 'Golden proportions', 'golden-proportions', 'golden-proportions' ],
		'implBreast' => [ 'Breast implant viewer', 'breast-implant-viewer', 'breast-implant-viewer' ],
		'implChin' => [ 'Chin implant viewer', 'chin-implant-viewer', 'chin-implant-viewer' ],
		'implForehead' => [ 'Forehead implant viewer', 'forehead-implant-viewer', 'forehead-implant-viewer' ],
		'implNose' => [ 'Nose implant viewer', 'nose-implant-viewer', 'nose-implant-viewer' ],
		'play' => [ 'Games', 'play', 'play' ],
		'plan' => [ 'My Plan', 'my-plan', 'my-plan' ],
		'trip' => [ 'Trip planner', 'trip-planner', 'trip-planner' ],
		'consult' => [ 'Online consultation', 'consultation', 'consultation' ],
	];
}
