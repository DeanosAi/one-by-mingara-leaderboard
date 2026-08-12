<?php
/**
 * Plugin Name: One by Mingara Leaderboard
 * Description: Mobile-first HYROX workout leaderboards, Team moderation, and usage analytics for One by Mingara.
 * Version: 1.0.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: One by Mingara
 * License: Proprietary
 * Text Domain: one-by-mingara-leaderboard
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ONE_LEADERBOARD_VERSION', '1.0.0' );
define( 'ONE_LEADERBOARD_DB_VERSION', '1.0' );
define( 'ONE_LEADERBOARD_FILE', __FILE__ );
define( 'ONE_LEADERBOARD_DIR', plugin_dir_path( __FILE__ ) );
define( 'ONE_LEADERBOARD_URL', plugin_dir_url( __FILE__ ) );

require_once ONE_LEADERBOARD_DIR . 'includes/class-one-leaderboard-workouts.php';
require_once ONE_LEADERBOARD_DIR . 'includes/class-one-leaderboard-db.php';
require_once ONE_LEADERBOARD_DIR . 'includes/class-one-leaderboard-rest.php';
require_once ONE_LEADERBOARD_DIR . 'includes/class-one-leaderboard-admin.php';
require_once ONE_LEADERBOARD_DIR . 'includes/class-one-leaderboard-template.php';

function one_leaderboard_activate() {
	One_Leaderboard_DB::install();
	add_option( 'one_leaderboard_session_version', 1, '', false );
	add_option( 'one_leaderboard_data_version', 1, '', false );
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'one_leaderboard_activate' );

function one_leaderboard_deactivate() {
	// Results and settings deliberately remain available if the plugin is reactivated.
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'one_leaderboard_deactivate' );

function one_leaderboard_bootstrap() {
	if ( get_option( 'one_leaderboard_db_version' ) !== ONE_LEADERBOARD_DB_VERSION ) {
		One_Leaderboard_DB::install();
	}

	( new One_Leaderboard_REST() )->register_hooks();
	( new One_Leaderboard_Admin() )->register_hooks();
	( new One_Leaderboard_Template() )->register_hooks();
}
add_action( 'plugins_loaded', 'one_leaderboard_bootstrap' );

