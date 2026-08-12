<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class One_Leaderboard_Template {
	const TEMPLATE_KEY = 'one-leaderboard-standalone.php';

	public function register_hooks() {
		add_filter( 'theme_page_templates', array( $this, 'register_page_template' ) );
		add_filter( 'template_include', array( $this, 'use_standalone_template' ), 99 );
		add_action( 'template_redirect', array( $this, 'serve_runtime_asset' ), 0 );
		add_action( 'save_post_page', array( $this, 'refresh_page_routes' ), 10, 3 );
	}

	public function register_page_template( $templates ) {
		$templates[ self::TEMPLATE_KEY ] = 'One Leaderboard — Standalone app';
		return $templates;
	}

	public function use_standalone_template( $template ) {
		$page_id          = (int) get_option( 'one_leaderboard_page_id', 0 );
		$selected_template = is_page() ? get_page_template_slug( get_queried_object_id() ) : '';
		if ( ( $page_id && is_page( $page_id ) ) || self::TEMPLATE_KEY === $selected_template ) {
			return ONE_LEADERBOARD_DIR . 'templates/standalone.php';
		}
		return $template;
	}

	public function serve_runtime_asset() {
		if ( empty( $_GET['one_leaderboard_runtime'] ) ) {
			return;
		}
		$runtime = sanitize_key( wp_unslash( $_GET['one_leaderboard_runtime'] ) );
		$page_id = (int) get_option( 'one_leaderboard_page_id', 0 );
		if ( ! $page_id ) {
			status_header( 404 );
			exit;
		}
		$app_url = trailingslashit( get_permalink( $page_id ) );

		if ( 'manifest' === $runtime ) {
			nocache_headers();
			header( 'Content-Type: application/manifest+json; charset=utf-8' );
			echo wp_json_encode(
				array(
					'name'             => 'One by Mingara Leaderboard',
					'short_name'       => 'One Leaderboard',
					'description'      => 'Take on One by Mingara challenges and see where you rank.',
					'start_url'        => $app_url,
					'scope'            => $app_url,
					'display'          => 'standalone',
					'background_color' => '#f7faf9',
					'theme_color'      => '#073f61',
					'orientation'      => 'portrait-primary',
					'icons'            => array(
						array(
							'src'     => ONE_LEADERBOARD_URL . 'assets/one-by-mingara-logo.png',
							'sizes'   => '3231x3464',
							'type'    => 'image/png',
							'purpose' => 'any',
						),
					),
				),
				JSON_UNESCAPED_SLASHES
			);
			exit;
		}

		if ( 'service-worker' === $runtime ) {
			$allowed_path = wp_parse_url( $app_url, PHP_URL_PATH );
			nocache_headers();
			header( 'Content-Type: application/javascript; charset=utf-8' );
			header( 'Service-Worker-Allowed: ' . $allowed_path );
			$settings = array(
				'cacheName' => 'one-leaderboard-wordpress-' . ONE_LEADERBOARD_VERSION,
				'appUrl'    => $app_url,
				'apiUrl'    => rest_url( One_Leaderboard_REST::NAMESPACE . '/' ),
				'assets'    => array(
					$app_url,
					ONE_LEADERBOARD_URL . 'assets/one-leaderboard-app.css',
					ONE_LEADERBOARD_URL . 'assets/one-leaderboard-app.js',
					ONE_LEADERBOARD_URL . 'assets/one-by-mingara-logo.png',
				),
			);
			?>
const SETTINGS = <?php echo wp_json_encode( $settings, JSON_UNESCAPED_SLASHES ); ?>;
const API_PATH = new URL(SETTINGS.apiUrl).pathname;
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SETTINGS.cacheName).then((cache) => cache.addAll(SETTINGS.assets)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('one-leaderboard-wordpress-') && key !== SETTINGS.cacheName).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.pathname.startsWith(API_PATH)) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && url.origin === self.location.origin) {
      const copy = response.clone();
      caches.open(SETTINGS.cacheName).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === 'navigate' ? caches.match(SETTINGS.appUrl) : undefined))));
});
			<?php
			exit;
		}

		status_header( 404 );
		exit;
	}

	public function refresh_page_routes( $post_id, $post, $update ) {
		unset( $post, $update );
		if ( (int) get_option( 'one_leaderboard_page_id', 0 ) === (int) $post_id ) {
			flush_rewrite_rules( false );
		}
	}

	public static function runtime_url( $asset ) {
		return add_query_arg( 'one_leaderboard_runtime', $asset, home_url( '/' ) );
	}
}

