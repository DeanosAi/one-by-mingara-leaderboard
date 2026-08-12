<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class One_Leaderboard_Admin {
	const SETTINGS_SLUG = 'one-by-mingara-leaderboard';

	public function register_hooks() {
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
		add_action( 'admin_post_one_leaderboard_save_settings', array( $this, 'save_settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( ONE_LEADERBOARD_FILE ), array( $this, 'settings_link' ) );
	}

	public function add_settings_page() {
		add_options_page(
			'One by Mingara Leaderboard',
			'One Leaderboard',
			'manage_options',
			self::SETTINGS_SLUG,
			array( $this, 'render_settings_page' )
		);
	}

	public function settings_link( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=' . self::SETTINGS_SLUG ) ) . '">Settings</a>' );
		return $links;
	}

	public function save_settings() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to change these settings.', 'one-by-mingara-leaderboard' ) );
		}
		check_admin_referer( 'one_leaderboard_save_settings' );

		$page_id = isset( $_POST['one_leaderboard_page_id'] ) ? absint( $_POST['one_leaderboard_page_id'] ) : 0;
		if ( $page_id ) {
			$page = get_post( $page_id );
			if ( ! $page || 'page' !== $page->post_type || 'publish' !== $page->post_status ) {
				$this->redirect_with_message( 'Select a published WordPress page.', 'error' );
			}
		}
		update_option( 'one_leaderboard_page_id', $page_id, false );

		$new_password     = isset( $_POST['one_leaderboard_new_password'] ) ? (string) wp_unslash( $_POST['one_leaderboard_new_password'] ) : '';
		$confirm_password = isset( $_POST['one_leaderboard_confirm_password'] ) ? (string) wp_unslash( $_POST['one_leaderboard_confirm_password'] ) : '';
		if ( $new_password || $confirm_password ) {
			$length = strlen( $new_password );
			if ( $length < 10 || $length > 72 ) {
				$this->redirect_with_message( 'Use a Team password between 10 and 72 characters.', 'error' );
			}
			if ( $new_password !== $confirm_password ) {
				$this->redirect_with_message( 'The Team passwords do not match.', 'error' );
			}
			update_option( 'one_leaderboard_team_password_hash', wp_hash_password( $new_password ), false );
			update_option( 'one_leaderboard_session_version', (int) get_option( 'one_leaderboard_session_version', 1 ) + 1, false );
		}

		flush_rewrite_rules();
		$this->redirect_with_message( 'Leaderboard settings saved.', 'success' );
	}

	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$page_id       = (int) get_option( 'one_leaderboard_page_id', 0 );
		$password_set  = (bool) get_option( 'one_leaderboard_team_password_hash', '' );
		$result_count  = One_Leaderboard_DB::count();
		$app_url       = $page_id ? get_permalink( $page_id ) : '';
		$message       = isset( $_GET['one_leaderboard_message'] ) ? sanitize_text_field( wp_unslash( $_GET['one_leaderboard_message'] ) ) : '';
		$message_type  = isset( $_GET['one_leaderboard_type'] ) && 'error' === $_GET['one_leaderboard_type'] ? 'notice-error' : 'notice-success';
		?>
		<div class="wrap">
			<h1>One by Mingara Leaderboard</h1>
			<p>Connect the standalone leaderboard app to a published, orphaned WordPress page and manage its initial Team password.</p>

			<?php if ( $message ) : ?>
				<div class="notice <?php echo esc_attr( $message_type ); ?> is-dismissible"><p><?php echo esc_html( $message ); ?></p></div>
			<?php endif; ?>

			<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;max-width:900px;margin:22px 0;">
				<div style="background:#fff;border:1px solid #dcdcde;padding:16px 18px;border-radius:6px;"><strong>App page</strong><p style="margin-bottom:0;color:<?php echo $page_id ? '#008a20' : '#b32d2e'; ?>;"><?php echo $page_id ? 'Configured' : 'Not configured'; ?></p></div>
				<div style="background:#fff;border:1px solid #dcdcde;padding:16px 18px;border-radius:6px;"><strong>Team password</strong><p style="margin-bottom:0;color:<?php echo $password_set ? '#008a20' : '#b32d2e'; ?>;"><?php echo $password_set ? 'Configured' : 'Must be set'; ?></p></div>
				<div style="background:#fff;border:1px solid #dcdcde;padding:16px 18px;border-radius:6px;"><strong>Saved results</strong><p style="margin-bottom:0;"><?php echo esc_html( number_format_i18n( $result_count ) ); ?></p></div>
				<div style="background:#fff;border:1px solid #dcdcde;padding:16px 18px;border-radius:6px;"><strong>Plugin version</strong><p style="margin-bottom:0;"><?php echo esc_html( ONE_LEADERBOARD_VERSION ); ?></p></div>
			</div>

			<?php if ( $app_url ) : ?>
				<p><a class="button button-primary" href="<?php echo esc_url( $app_url ); ?>" target="_blank" rel="noopener">Open the leaderboard</a></p>
			<?php endif; ?>

			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post" style="max-width:900px;">
				<input type="hidden" name="action" value="one_leaderboard_save_settings" />
				<?php wp_nonce_field( 'one_leaderboard_save_settings' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="one_leaderboard_page_id">Leaderboard page</label></th>
						<td>
							<?php
							wp_dropdown_pages(
								array(
									'name'              => 'one_leaderboard_page_id',
									'id'                => 'one_leaderboard_page_id',
									'selected'          => $page_id,
									'show_option_none'  => '— Select the orphaned app page —',
									'option_none_value' => '0',
									'post_status'       => 'publish',
								)
							);
							?>
							<p class="description">This page’s normal theme template and content will be replaced by the full-screen leaderboard app. Do not add it to the site navigation.</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="one_leaderboard_new_password"><?php echo $password_set ? 'Replace Team password' : 'Set Team password'; ?></label></th>
						<td>
							<input class="regular-text" type="password" id="one_leaderboard_new_password" name="one_leaderboard_new_password" minlength="10" maxlength="72" autocomplete="new-password" />
							<p class="description">10–72 characters. Leave both password fields blank to keep the current password.</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="one_leaderboard_confirm_password">Confirm Team password</label></th>
						<td><input class="regular-text" type="password" id="one_leaderboard_confirm_password" name="one_leaderboard_confirm_password" minlength="10" maxlength="72" autocomplete="new-password" /></td>
					</tr>
				</table>
				<?php submit_button( 'Save leaderboard settings' ); ?>
			</form>

			<hr style="margin:32px 0;max-width:900px;" />
			<h2>What this plugin controls</h2>
			<ul style="list-style:disc;padding-left:22px;line-height:1.7;">
				<li>The five workout leaderboards, result submission, validation, and fastest-first ranking.</li>
				<li>The protected Team moderation page, per-workout name search, entry deletion, and Team password changes.</li>
				<li>The protected usage and adoption analytics page.</li>
				<li>Automatic refresh across devices and WordPress database persistence.</li>
			</ul>
		</div>
		<?php
	}

	private function redirect_with_message( $message, $type ) {
		wp_safe_redirect(
			add_query_arg(
				array(
					'page'                    => self::SETTINGS_SLUG,
					'one_leaderboard_message' => $message,
					'one_leaderboard_type'    => $type,
				),
				admin_url( 'options-general.php' )
			)
		);
		exit;
	}
}
