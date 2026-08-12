<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class One_Leaderboard_DB {
	public static function table_name() {
		global $wpdb;
		return $wpdb->prefix . 'one_leaderboard_results';
	}

	public static function install() {
		global $wpdb;
		$table_name      = self::table_name();
		$charset_collate = $wpdb->get_charset_collate();
		$sql             = "CREATE TABLE $table_name (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			public_id char(36) NOT NULL,
			workout_id varchar(64) NOT NULL,
			participant_name varchar(80) NOT NULL,
			time_centiseconds int(10) unsigned NOT NULL,
			ball_weight_kg smallint(5) unsigned NULL,
			created_at_gmt datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY public_id (public_id),
			KEY workout_ranking (workout_id,time_centiseconds,created_at_gmt),
			KEY created_at_gmt (created_at_gmt)
		) $charset_collate;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
		update_option( 'one_leaderboard_db_version', ONE_LEADERBOARD_DB_VERSION, false );
	}

	public static function list_for_workout( $workout_id ) {
		global $wpdb;
		$table = self::table_name();
		$rows  = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM $table WHERE workout_id = %s ORDER BY time_centiseconds ASC, created_at_gmt ASC, id ASC",
				$workout_id
			),
			ARRAY_A
		);
		return array_map( array( __CLASS__, 'format_result' ), $rows ?: array() );
	}

	public static function list_all() {
		global $wpdb;
		$table = self::table_name();
		$rows  = $wpdb->get_results( "SELECT * FROM $table ORDER BY created_at_gmt DESC, id DESC", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		return array_map( array( __CLASS__, 'format_result' ), $rows ?: array() );
	}

	public static function insert( $workout_id, $name, $time_centiseconds, $ball_weight_kg = null ) {
		global $wpdb;
		$table     = self::table_name();
		$public_id = wp_generate_uuid4();
		$inserted  = $wpdb->insert(
			$table,
			array(
				'public_id'           => $public_id,
				'workout_id'          => $workout_id,
				'participant_name'    => $name,
				'time_centiseconds'   => $time_centiseconds,
				'ball_weight_kg'      => $ball_weight_kg,
				'created_at_gmt'      => current_time( 'mysql', true ),
			),
			array( '%s', '%s', '%s', '%d', '%d', '%s' )
		);

		if ( false === $inserted ) {
			return new WP_Error( 'one_leaderboard_database_error', 'The result could not be saved. Please try again.', array( 'status' => 500 ) );
		}

		self::bump_version();
		return self::get_by_public_id( $public_id );
	}

	public static function get_by_public_id( $public_id ) {
		global $wpdb;
		$table = self::table_name();
		$row   = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM $table WHERE public_id = %s", $public_id ),
			ARRAY_A
		);
		return $row ? self::format_result( $row ) : null;
	}

	public static function delete( $public_id ) {
		global $wpdb;
		$result = self::get_by_public_id( $public_id );
		if ( ! $result ) {
			return null;
		}
		$deleted = $wpdb->delete( self::table_name(), array( 'public_id' => $public_id ), array( '%s' ) );
		if ( $deleted ) {
			self::bump_version();
			return $result;
		}
		return null;
	}

	public static function count() {
		global $wpdb;
		$table = self::table_name();
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM $table" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	public static function data_version() {
		return (int) get_option( 'one_leaderboard_data_version', 1 );
	}

	private static function bump_version() {
		update_option( 'one_leaderboard_data_version', self::data_version() + 1, false );
	}

	private static function format_result( $row ) {
		$result = array(
			'id'                 => $row['public_id'],
			'workoutId'          => $row['workout_id'],
			'name'               => $row['participant_name'],
			'timeCentiseconds'    => (int) $row['time_centiseconds'],
			'createdAt'           => gmdate( 'c', strtotime( $row['created_at_gmt'] . ' UTC' ) ),
		);
		if ( null !== $row['ball_weight_kg'] ) {
			$result['ballWeightKg'] = (int) $row['ball_weight_kg'];
		}
		return $result;
	}
}

