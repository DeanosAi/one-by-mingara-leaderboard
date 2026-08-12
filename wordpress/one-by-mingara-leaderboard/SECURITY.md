# Security and privacy notes

- The public leaderboard intentionally displays each submitted name, time and applicable War Ball weight.
- Public submissions do not require a WordPress account, matching the current app. Mingara should publish an appropriate privacy collection notice before launch.
- The Team area uses a separate shared password stored only as a WordPress password hash. The plaintext password is never stored by the plugin.
- Team sessions expire after eight hours. Changing the Team password invalidates previously issued sessions.
- Repeated failed Team logins from one IP address are rate-limited for 15 minutes.
- REST inputs are validated and sanitised, and database writes use WordPress database helpers.
- The selected app page is emitted with `noindex, nofollow` by default. This makes it orphaned from search engines as well as navigation, but does not make a public URL secret.
- Keep WordPress core, this plugin, PHP and all other installed plugins patched. Run the app over HTTPS only.
- Include the custom leaderboard table and WordPress options in normal database backups.

