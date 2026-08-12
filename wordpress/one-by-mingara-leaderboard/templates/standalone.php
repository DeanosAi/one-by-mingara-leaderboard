<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$app_url = trailingslashit( get_permalink( get_queried_object_id() ) );
$config  = array(
	'platform'            => 'wordpress',
	'apiBase'             => rest_url( One_Leaderboard_REST::NAMESPACE ),
	'assetBase'           => ONE_LEADERBOARD_URL . 'assets',
	'liveRefreshInterval' => 4000,
	'adminLoginNote'      => 'Use the Team password supplied by your One by Mingara website administrator.',
	'serviceWorkerUrl'    => One_Leaderboard_Template::runtime_url( 'service-worker' ),
	'serviceWorkerScope'  => $app_url,
);

nocache_headers();
header( 'X-Robots-Tag: noindex, nofollow', true );
header( 'Referrer-Policy: strict-origin-when-cross-origin', true );
header( 'X-Content-Type-Options: nosniff', true );
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<meta name="theme-color" content="#073f61" />
	<meta name="description" content="One by Mingara member workout leaderboards." />
	<meta name="robots" content="noindex, nofollow" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="One Leaderboard" />
	<link rel="manifest" href="<?php echo esc_url( One_Leaderboard_Template::runtime_url( 'manifest' ) ); ?>" />
	<link rel="icon" href="<?php echo esc_url( ONE_LEADERBOARD_URL . 'assets/one-by-mingara-logo.png' ); ?>" type="image/png" />
	<link rel="apple-touch-icon" href="<?php echo esc_url( ONE_LEADERBOARD_URL . 'assets/one-by-mingara-logo.png' ); ?>" />
	<link rel="stylesheet" href="<?php echo esc_url( ONE_LEADERBOARD_URL . 'assets/one-leaderboard-app.css?ver=' . ONE_LEADERBOARD_VERSION ); ?>" />
	<title>One Leaderboard | One by Mingara</title>
	<script>window.ONE_LEADERBOARD_CONFIG = <?php echo wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES ); ?>;</script>
</head>
<body>
	<div id="one-leaderboard-root"></div>
	<noscript>This leaderboard requires JavaScript to run.</noscript>
	<script type="module" src="<?php echo esc_url( ONE_LEADERBOARD_URL . 'assets/one-leaderboard-app.js?ver=' . ONE_LEADERBOARD_VERSION ); ?>"></script>
</body>
</html>
