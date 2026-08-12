<?php

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// The plugin intentionally retains all leaderboard results and settings on uninstall.
// This prevents an accidental WordPress admin click from permanently deleting member data.
// A database administrator may remove the one_leaderboard_results table and one_leaderboard_*
// options only after taking a verified backup and receiving explicit Mingara approval.

