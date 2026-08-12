<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class One_Leaderboard_REST {
	const NAMESPACE = 'one-leaderboard/v1';
	const SESSION_TTL = 28800;

	public function register_hooks() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/health',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'health' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/updates',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'updates' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/workouts',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'workouts' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/workouts/(?P<workout_id>[a-z0-9-]+)/results',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'workout_results' ),
					'permission_callback' => '__return_true',
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'submit_result' ),
					'permission_callback' => '__return_true',
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/admin/login',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_login' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/admin/password',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'change_password' ),
				'permission_callback' => array( $this, 'require_team_session' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/admin/results',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'admin_results' ),
				'permission_callback' => array( $this, 'require_team_session' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/admin/results/(?P<result_id>[a-f0-9-]{36})',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => array( $this, 'delete_result' ),
				'permission_callback' => array( $this, 'require_team_session' ),
			)
		);
	}

	public function health() {
		return $this->no_store_response(
			array(
				'ok'        => true,
				'storage'   => 'wordpress-database',
				'timestamp' => gmdate( 'c' ),
			)
		);
	}

	public function updates() {
		return $this->no_store_response( array( 'version' => One_Leaderboard_DB::data_version() ) );
	}

	public function workouts() {
		return $this->no_store_response( array( 'workouts' => One_Leaderboard_Workouts::all() ) );
	}

	public function workout_results( WP_REST_Request $request ) {
		$workout = One_Leaderboard_Workouts::find( $request['workout_id'] );
		if ( ! $workout || empty( $workout['active'] ) ) {
			return new WP_Error( 'one_leaderboard_workout_not_found', 'Workout not found.', array( 'status' => 404 ) );
		}
		$results = One_Leaderboard_DB::list_for_workout( $workout['id'] );
		return $this->no_store_response(
			array(
				'workout' => $workout,
				'results' => $results,
				'total'   => count( $results ),
			)
		);
	}

	public function submit_result( WP_REST_Request $request ) {
		$workout = One_Leaderboard_Workouts::find( $request['workout_id'] );
		if ( ! $workout || empty( $workout['active'] ) ) {
			return new WP_Error( 'one_leaderboard_workout_not_found', 'Workout not found.', array( 'status' => 404 ) );
		}

		$payload = $request->get_json_params();
		$name    = preg_replace( '/\s+/u', ' ', sanitize_text_field( isset( $payload['name'] ) ? $payload['name'] : '' ) );
		$name    = trim( $name );
		$length  = function_exists( 'mb_strlen' ) ? mb_strlen( $name ) : strlen( $name );
		if ( $length < 2 || $length > 40 ) {
			return new WP_Error( 'one_leaderboard_invalid_name', 'Enter a name between 2 and 40 characters.', array( 'status' => 400 ) );
		}

		$time = isset( $payload['timeCentiseconds'] ) ? filter_var( $payload['timeCentiseconds'], FILTER_VALIDATE_INT ) : false;
		if ( false === $time || $time < $workout['validation']['minTimeCentiseconds'] || $time > $workout['validation']['maxTimeCentiseconds'] ) {
			return new WP_Error( 'one_leaderboard_invalid_time', 'Enter a valid completion time between 0:30.00 and 59:59.99.', array( 'status' => 400 ) );
		}

		$weight       = null;
		$weight_field = $this->weight_field( $workout );
		if ( $weight_field ) {
			$weight = isset( $payload['ballWeightKg'] ) ? (int) $payload['ballWeightKg'] : 0;
			if ( ! in_array( $weight, $weight_field['options'], true ) ) {
				return new WP_Error( 'one_leaderboard_invalid_weight', 'Choose a valid ball weight.', array( 'status' => 400 ) );
			}
		}

		$result = One_Leaderboard_DB::insert( $workout['id'], $name, (int) $time, $weight );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$sorted = One_Leaderboard_DB::list_for_workout( $workout['id'] );
		$rank   = 0;
		foreach ( $sorted as $index => $entry ) {
			if ( $entry['id'] === $result['id'] ) {
				$rank = $index + 1;
				break;
			}
		}
		$response = new WP_REST_Response(
			array(
				'result' => $result,
				'rank'   => $rank,
				'total'  => count( $sorted ),
			),
			201
		);
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate' );
		return $response;
	}

	public function admin_login( WP_REST_Request $request ) {
		$password_hash = get_option( 'one_leaderboard_team_password_hash', '' );
		if ( ! $password_hash ) {
			return new WP_Error( 'one_leaderboard_password_not_configured', 'The Team password has not been configured. Ask the website administrator to finish setup.', array( 'status' => 503 ) );
		}

		$attempt_key = $this->login_attempt_key();
		$attempts    = (int) get_transient( $attempt_key );
		if ( $attempts >= 10 ) {
			return new WP_Error( 'one_leaderboard_too_many_attempts', 'Too many sign-in attempts. Wait 15 minutes and try again.', array( 'status' => 429 ) );
		}

		$payload  = $request->get_json_params();
		$password = isset( $payload['password'] ) ? (string) $payload['password'] : '';
		if ( ! wp_check_password( $password, $password_hash ) ) {
			set_transient( $attempt_key, $attempts + 1, 15 * MINUTE_IN_SECONDS );
			return new WP_Error( 'one_leaderboard_incorrect_password', 'That password is not correct.', array( 'status' => 401 ) );
		}

		delete_transient( $attempt_key );
		return $this->issue_session();
	}

	public function change_password( WP_REST_Request $request ) {
		$payload          = $request->get_json_params();
		$current_password = isset( $payload['currentPassword'] ) ? (string) $payload['currentPassword'] : '';
		$new_password     = isset( $payload['newPassword'] ) ? (string) $payload['newPassword'] : '';
		$password_hash    = get_option( 'one_leaderboard_team_password_hash', '' );

		if ( ! $password_hash || ! wp_check_password( $current_password, $password_hash ) ) {
			return new WP_Error( 'one_leaderboard_incorrect_current_password', 'Your current password is not correct.', array( 'status' => 400 ) );
		}
		$length = strlen( $new_password );
		if ( $length < 10 || $length > 72 ) {
			return new WP_Error( 'one_leaderboard_invalid_new_password', 'Use a new password between 10 and 72 characters.', array( 'status' => 400 ) );
		}
		if ( wp_check_password( $new_password, $password_hash ) ) {
			return new WP_Error( 'one_leaderboard_unchanged_password', 'Choose a password that is different from the current password.', array( 'status' => 400 ) );
		}

		update_option( 'one_leaderboard_team_password_hash', wp_hash_password( $new_password ), false );
		update_option( 'one_leaderboard_session_version', $this->session_version() + 1, false );
		$session            = $this->issue_session();
		$session['changed'] = true;
		return $session;
	}

	public function admin_results() {
		$results = One_Leaderboard_DB::list_all();
		foreach ( $results as &$result ) {
			$workout               = One_Leaderboard_Workouts::find( $result['workoutId'] );
			$result['workoutName'] = $workout ? $workout['name'] : $result['workoutId'];
		}
		unset( $result );
		return $this->no_store_response( array( 'results' => $results, 'total' => count( $results ) ) );
	}

	public function delete_result( WP_REST_Request $request ) {
		$removed = One_Leaderboard_DB::delete( $request['result_id'] );
		if ( ! $removed ) {
			return new WP_Error( 'one_leaderboard_result_not_found', 'Result not found.', array( 'status' => 404 ) );
		}
		return $this->no_store_response( array( 'deleted' => true, 'result' => $removed ) );
	}

	public function require_team_session( WP_REST_Request $request ) {
		$authorization = $request->get_header( 'authorization' );
		$token         = preg_replace( '/^Bearer\s+/i', '', (string) $authorization );
		if ( ! $token ) {
			$token = (string) $request->get_header( 'x-one-leaderboard-token' );
		}
		if ( ! preg_match( '/^[a-f0-9]{48}$/', $token ) ) {
			return new WP_Error( 'one_leaderboard_session_expired', 'Admin session expired. Please sign in again.', array( 'status' => 401 ) );
		}
		$session = get_transient( $this->session_key( $token ) );
		if ( ! is_array( $session ) || empty( $session['version'] ) || (int) $session['version'] !== $this->session_version() ) {
			return new WP_Error( 'one_leaderboard_session_expired', 'Admin session expired. Please sign in again.', array( 'status' => 401 ) );
		}
		return true;
	}

	private function issue_session() {
		$token = bin2hex( random_bytes( 24 ) );
		set_transient(
			$this->session_key( $token ),
			array( 'version' => $this->session_version() ),
			self::SESSION_TTL
		);
		return array( 'token' => $token, 'expiresIn' => self::SESSION_TTL );
	}

	private function session_key( $token ) {
		return 'one_lb_session_' . hash_hmac( 'sha256', $token, wp_salt( 'auth' ) );
	}

	private function session_version() {
		return (int) get_option( 'one_leaderboard_session_version', 1 );
	}

	private function login_attempt_key() {
		$address = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
		$agent   = isset( $_SERVER['HTTP_USER_AGENT'] ) ? substr( sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ), 0, 180 ) : 'unknown';
		return 'one_lb_login_' . substr( hash_hmac( 'sha256', $address . '|' . $agent, wp_salt( 'nonce' ) ), 0, 32 );
	}

	private function weight_field( $workout ) {
		foreach ( $workout['resultFields'] as $field ) {
			if ( 'ballWeightKg' === $field['id'] ) {
				return $field;
			}
		}
		return null;
	}

	private function no_store_response( $data ) {
		$response = rest_ensure_response( $data );
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate' );
		return $response;
	}
}
