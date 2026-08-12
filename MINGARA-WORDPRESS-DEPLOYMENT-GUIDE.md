# One by Mingara Leaderboard — WordPress handover and deployment guide

Version 1.0.0 · 12 August 2026

## 1. What Mingara is receiving

The deliverable is a self-contained WordPress plugin named `one-by-mingara-leaderboard.zip`. It reproduces the current mobile-first One by Mingara app inside a dedicated WordPress page and includes:

- the home page and five workout cards;
- 1KM Row, 1KM Run, 1KM Ski, 100 Wall Balls and 80m Burpee Broad Jumps leaderboards;
- public result submission, validation, success confirmation and fastest-first rankings;
- War Ball weight recording without using weight in the rank calculation;
- automatic refresh across phones and computers;
- the protected Team login and eight-hour Team sessions;
- per-workout Team tabs, name search, fastest/average statistics and entry deletion;
- Team password changes;
- the protected Usage & Adoption dashboard, graphs, tables, weekly/monthly comparisons, repeat participation, cross-workout participation and individual-month selection;
- an installable web-app manifest and service worker when the WordPress host permits them;
- the approved One by Mingara logo and current app styling.

The currently hosted Mission Control version remains live and independent. Installing this package on Mingara’s WordPress website does not connect to, alter or remove that version.

## 2. How the WordPress edition works

The plugin uses the existing WordPress installation for hosting and persistence:

- **Frontend:** a compiled React application served by the plugin.
- **App URL:** one published WordPress page selected in the plugin settings.
- **In-app pages:** hash routes such as `#/workout/run-1km`, `#/admin` and `#/admin/stats`. These routes do not need extra WordPress pages or rewrite rules.
- **API:** namespaced WordPress REST endpoints under `/wp-json/one-leaderboard/v1/`.
- **Results:** a dedicated database table named `{WordPress table prefix}one_leaderboard_results`.
- **Team password:** a one-way WordPress password hash stored in the options table.
- **Team sessions:** random eight-hour tokens stored as expiring WordPress transients.
- **Live updates:** each open app checks for a data-version change every four seconds and reloads only when results have changed. This replaces the Node-only event stream and is compatible with normal WordPress/PHP hosting.

The plugin page bypasses the active theme’s header, footer and layout, which protects the current design from theme or page-builder CSS. It still lives at a normal Mingara-owned URL.

## 3. Prerequisites Mingara should confirm

Before installation, ask the WordPress/IT team to confirm:

1. They have a **full staging copy** of the Mingara WordPress site.
2. They can install a custom plugin ZIP or can upload a plugin through SFTP/SSH.
3. WordPress is up to date. This package requires WordPress 6.5 or newer and was prepared for current WordPress 7.0.x.
4. PHP 8.1 or newer is available; PHP 8.3+ is recommended by WordPress.
5. The database is MySQL/MariaDB and the WordPress database user can create a table during plugin activation.
6. HTTPS is enabled for the final app URL.
7. `/wp-json/` REST requests are not disabled.
8. The security/CDN/WAF layer permits `GET`, `POST` and `DELETE` requests to `/wp-json/one-leaderboard/v1/*`.
9. Their caching layer can exclude the app page and the plugin’s REST namespace from full-page/API caching.
10. They have a current filesystem and database backup and know how to restore it.

If Mingara uses WordPress Multisite, install and activate the plugin on the specific site that will own the app. Version 1.0.0 is not intended for network activation across every subsite.

WordPress currently recommends PHP 8.3+, MariaDB 10.11+ or MySQL 8.0+, and HTTPS. The package’s lower PHP floor is 8.1 for practical compatibility, but Mingara should prefer the current supported stack.

## 4. Files in the handover

- `one-by-mingara-leaderboard.zip` — the installable WordPress plugin. This is the file normally handed to the WordPress administrator.
- `MINGARA-WORDPRESS-DEPLOYMENT-GUIDE.md` — this guide.
- `SHA256SUMS.txt` — file integrity hashes.
- `one-by-mingara-leaderboard-source-v1.0.0.zip` — the editable React, PHP and test source for future developers. It deliberately excludes local development data and credentials.

Keep an untouched copy of the entire handover archive in Mingara’s controlled document or source repository.

## 5. Staging deployment — exact steps

### Step 1: Back up staging

Create a database backup and a `wp-content` backup before installation. Record the backup timestamp and restore procedure.

### Step 2: Create the orphaned page

In WordPress admin:

1. Go to **Pages → Add New Page**.
2. Title it `One Leaderboard` or `HYROX Leaderboard`.
3. Set the URL slug to something deliberate, for example `one-leaderboard`.
4. Leave the page content empty. The plugin replaces the page output.
5. In the page’s template selector, choose **One Leaderboard — Standalone app** if it is already available. If the plugin has not yet been installed, skip this and select it later.
6. In Yoast, Rank Math or the site’s SEO controls, set the page to **noindex** and exclude it from the XML sitemap. The plugin also emits a `noindex, nofollow` meta tag, but configuring the SEO plugin avoids conflicting directives.
7. Publish the page.
8. Do **not** add it to the header, footer, sitemap navigation, page listings or search widgets. This is what makes it an orphaned page.

Important: “Orphaned” means there are no normal site links to the page. It does not mean the URL is password-protected. The public leaderboard is intended to be reachable by anyone who has the URL or QR code.

### Step 3: Install the plugin ZIP

In WordPress admin:

1. Go to **Plugins → Add New Plugin**.
2. Select **Upload Plugin**.
3. Choose `one-by-mingara-leaderboard.zip`.
4. Select **Install Now**.
5. After WordPress reports a successful installation, select **Activate Plugin**.

If WordPress rejects the upload because of a server upload limit, use SFTP/SSH:

1. Extract the ZIP locally.
2. Upload the complete `one-by-mingara-leaderboard` folder to `wp-content/plugins/`.
3. Confirm the main file is exactly `wp-content/plugins/one-by-mingara-leaderboard/one-by-mingara-leaderboard.php`—not nested one level deeper.
4. Go to **Plugins** in WordPress and activate **One by Mingara Leaderboard**.

Activation creates one empty results table. It does not create sample people or times.

### Step 4: Connect the page and set the Team password

1. Go to **Settings → One Leaderboard**.
2. Under **Leaderboard page**, select the published orphaned page from Step 2.
3. Enter a strong initial Team password of 10–72 characters.
4. Enter it again in **Confirm Team password**.
5. Store the password in Mingara’s approved password manager and share it only with authorised Team members.
6. Select **Save leaderboard settings**.
7. Use **Open the leaderboard** on the settings page to open the final app URL.

The password is stored as a one-way hash. The plugin cannot display or email the current plaintext password. A WordPress administrator can replace it on the settings screen if it is forgotten.

### Step 5: Configure caching and security exclusions

In the site’s cache/CDN/security tools, exclude these paths from caching:

- the selected app page, for example `/one-leaderboard/`;
- `/wp-json/one-leaderboard/v1/*`;
- `/?one_leaderboard_runtime=manifest`;
- `/?one_leaderboard_runtime=service-worker`.

Allow the following methods to the REST namespace:

- `GET` for workouts, leaderboards, update checks and Team reads;
- `POST` for member submissions, Team login and Team password changes;
- `DELETE` for Team result deletion.

Do not expose the Team token in logs, analytics query strings or support screenshots. It is sent in request headers and expires after eight hours.

If the site has a strict Content Security Policy, allow:

- scripts and styles from the site’s own origin;
- images from the site’s own origin;
- connections to the site’s own `/wp-json/one-leaderboard/v1/` endpoints;
- fonts, images, scripts, styles and REST connections from the site’s own origin. Barlow Condensed and Manrope are bundled locally; the production app does not require Google Fonts or another third-party asset host.

### Step 6: Flush permalinks only if necessary

The plugin does not require custom pretty routes, but if the app page or REST endpoints return a WordPress 404:

1. Go to **Settings → Permalinks**.
2. Make no changes.
3. Select **Save Changes** once.

Do not repeatedly flush permalinks in production.

## 6. Staging acceptance test

Use a private/incognito browser window and at least one real phone. Complete every item below before production.

### Public home page

1. Open the orphaned page URL over HTTPS.
2. Confirm the current One by Mingara logo appears with no coloured box behind it.
3. Confirm `YOUR TRAINING STARTS HERE!` and `HYROX LEADERBOARD` appear.
4. Confirm all five workout cards appear and there are no “coming soon” cards.
5. Confirm there is no WordPress theme header, admin bar, theme footer or page-builder padding covering the app. The standalone template deliberately bypasses normal theme hooks. If Mingara requires a consent banner or analytics on this page, its web/privacy team must explicitly integrate and test it rather than assuming the normal theme injection will run.
6. Confirm the page has no horizontal scrolling at 320px, 390px and tablet widths.

### Each workout

Test 1KM Row, 1KM Run, 1KM Ski, 100 Wall Balls and 80m Burpee Broad Jumps:

1. Open the workout.
2. Confirm the workout name, description and empty state.
3. Select **Click here to Submit your results**.
4. Submit a recognisable staging name and valid time.
5. For 100 Wall Balls, select a ball weight and confirm the weight appears on the board.
6. Confirm the success panel shows rank and time.
7. Confirm the entry appears in fastest-to-slowest order.
8. Enter a second, faster time and confirm it moves to first position.
9. Try a time below 0:30.00 and confirm it is rejected.

### Cross-device refresh

1. Open the same workout on Phone A and Phone B.
2. Submit on Phone A.
3. Without refreshing Phone B manually, confirm the entry appears within approximately four to eight seconds.

### Team area

1. From the home page, select **Team admin login**.
2. Confirm an incorrect password fails.
3. Sign in with the configured Team password.
4. Confirm five workout tabs appear.
5. Select each workout and confirm only that workout’s results appear.
6. Search by part of a participant’s name and confirm it searches only the selected workout.
7. Delete one staging entry and confirm it disappears from the Team and public views.
8. Select **Stats** and confirm the Usage & Adoption page opens.
9. Select a specific month and confirm the dashboard updates to that month.
10. Confirm daily, weekly, monthly, workout mix, repeat participation and participant tables render without errors.
11. Use **Reset password** to change the Team password, sign out, and sign back in with the new password.

### PWA check

On a supported mobile browser, confirm **Add to Home Screen** is available. If it is not, inspect the browser console and hosting headers. The normal website app remains fully functional even when a host blocks service-worker installation.

### Clean staging data

After approval, remove every staging entry through the Team area so production starts empty. Recheck that all five public cards show zero competitors and the stats dashboard shows no activity.

## 7. Production deployment

1. Schedule a deployment window and identify the WordPress administrator and rollback owner.
2. Take a fresh production database and `wp-content` backup.
3. Repeat Sections 5.2–5.6 on production.
4. Use the final production slug agreed with Mingara, for example `one-leaderboard`.
5. Reconfirm the page is absent from all menus and XML sitemaps and remains `noindex`.
6. Configure production cache/WAF exclusions.
7. Complete the acceptance test with test entries.
8. Delete all production test entries through Team admin.
9. Provide the clean production URL to the project owner.
10. Generate the QR code only after the final URL is confirmed and redirects are stable.

Keep the current Mission Control app live until Mingara has formally accepted the WordPress version. The two systems have separate databases; new entries do not synchronise between them.

## 8. Day-to-day Team use

- Public users open the app URL, choose a workout and submit their name/time.
- Team members use `APP-URL/#/admin` or the home-page Team button.
- Select a workout before searching or deleting; searches are intentionally scoped to the open workout.
- Use **Stats** for adoption reporting and the month selector for historical monthly views.
- Use **Reset password** inside Team admin when the shared password should be rotated.
- WordPress administrators may replace a forgotten Team password at **Settings → One Leaderboard**.

## 9. Data, privacy and retention

The app stores:

- participant display name;
- workout identifier;
- completion time;
- War Ball weight where applicable;
- submission timestamp;
- a random public result identifier.

No member account, email address, phone number, date of birth or location is collected by the plugin. Usage analytics are derived from leaderboard submissions, not page views. Names are treated case-insensitively when estimating unique participants.

Mingara should have its privacy/legal team approve:

1. the public display of names and results;
2. the collection notice shown or linked near the app;
3. the retention period for leaderboard results;
4. the process for a member to request correction or deletion;
5. whether analytics or consent plugins should run on the orphaned page.

## 10. Backup and restore

### Normal backup

Use Mingara’s existing WordPress database backup. Confirm it includes:

- `{prefix}one_leaderboard_results`;
- the `options` rows beginning with `one_leaderboard_`.

The plugin files should also be retained, but the database is the authoritative result store.

### Restore

1. Put the site in maintenance mode or temporarily remove access to the app page.
2. Restore the WordPress database backup containing the results table and options.
3. Confirm the plugin version matches the restored database era.
4. Reactivate the plugin if necessary.
5. Go to **Settings → One Leaderboard** and confirm the selected page and password status.
6. Open all five leaderboards and compare expected counts.
7. Remove maintenance mode.

Do not restore only the result table without understanding whether the WordPress options and plugin version also changed.

## 11. Plugin updates

For a future release:

1. Back up staging.
2. Install the new ZIP on staging using WordPress’s replace-current-plugin option, or replace the plugin folder through the deployment pipeline.
3. Activate or refresh the plugin.
4. Complete the full acceptance test.
5. Back up production.
6. deploy the same tested ZIP to production.

Deactivation and plugin replacement retain results. Do not delete the custom table manually.

## 12. Rollback

If the new WordPress app causes a problem:

1. Keep or restore the current Mission Control link as the temporary user-facing URL.
2. Remove links/QR codes pointing to the WordPress page.
3. Deactivate **One by Mingara Leaderboard** in WordPress. Deactivation does not delete its data.
4. Restore the previous plugin ZIP or restore the pre-deployment database/files backup.
5. Clear WordPress, CDN and browser caches.
6. Re-enable the WordPress app only after staging verification.

Do not choose WordPress **Delete** as a routine rollback step. The supplied uninstaller intentionally preserves data, but a future changed package or manual cleanup might not.

## 13. Troubleshooting

### The page shows the normal WordPress theme

- Confirm the page selected under **Settings → One Leaderboard** is the page being opened.
- Edit the page and select **One Leaderboard — Standalone app**.
- Clear page/CDN caches.
- Check whether another plugin overrides `template_include` after this plugin.

### The app is blank

- Open browser developer tools and inspect Console and Network.
- Confirm `one-leaderboard-app.js`, `one-leaderboard-app.css` and the logo return HTTP 200.
- Confirm the plugin folder is not double nested.
- Check Content Security Policy and JavaScript optimisation/minification plugins; exclude this plugin’s assets from combine/defer transformations if required.

### “Something went wrong” when submitting

- Open `/wp-json/one-leaderboard/v1/health`; it should return JSON with `"ok": true`.
- Confirm the REST API is enabled.
- Confirm the WAF allows POST requests to the plugin namespace.
- Check PHP/WordPress error logs and database permissions.
- Confirm the custom results table exists.

### Public results do not update automatically

- Exclude `/wp-json/one-leaderboard/v1/updates` from caching.
- Confirm that endpoint’s `version` number changes after a submission.
- Check for aggressive browser battery/data-saving settings. Manual **Live** refresh remains available on workout pages.

### Team login always fails

- Confirm **Settings → One Leaderboard** shows Team password as configured.
- Wait 15 minutes if repeated failed attempts triggered the IP rate limit.
- Have a WordPress administrator set a new Team password.
- Exclude Team REST endpoints from cache.

### DELETE is blocked

- Ask the WAF/security team to allow authenticated `DELETE` requests to `/wp-json/one-leaderboard/v1/admin/results/*`.
- Confirm the Team session has not expired.

### Add to Home Screen is unavailable

- Confirm HTTPS.
- Check the manifest and service-worker runtime URLs return the correct content types.
- Check `Service-Worker-Allowed` and scope restrictions.
- Treat PWA installation as an enhancement; it is not required for normal use.

## 14. Final handover checklist

- [ ] Mingara stores the handover archive and checksum file.
- [ ] Staging backup and restore are confirmed.
- [ ] Custom plugin installation is approved.
- [ ] Orphaned page URL and slug are approved.
- [ ] Page is excluded from navigation, site search and XML sitemap.
- [ ] Page is noindex.
- [ ] Initial Team password is stored in the approved password manager.
- [ ] Cache/CDN/WAF exclusions are configured.
- [ ] All public functions pass on staging.
- [ ] All Team functions pass on staging.
- [ ] Cross-device update passes.
- [ ] Privacy/legal review is complete.
- [ ] Production backup is complete.
- [ ] Production acceptance test passes.
- [ ] All production test entries are deleted.
- [ ] Final production QR code points to the stable Mingara-owned URL.
- [ ] Rollback owner and procedure are recorded.

## 15. Technical reference

Public REST routes:

- `GET /wp-json/one-leaderboard/v1/health`
- `GET /wp-json/one-leaderboard/v1/updates`
- `GET /wp-json/one-leaderboard/v1/workouts`
- `GET /wp-json/one-leaderboard/v1/workouts/{workout-id}/results`
- `POST /wp-json/one-leaderboard/v1/workouts/{workout-id}/results`

Protected Team REST routes:

- `POST /wp-json/one-leaderboard/v1/admin/login`
- `GET /wp-json/one-leaderboard/v1/admin/results`
- `DELETE /wp-json/one-leaderboard/v1/admin/results/{result-id}`
- `POST /wp-json/one-leaderboard/v1/admin/password`

Current workout IDs:

- `run-1km`
- `war-balls-100`
- `row-1km`
- `ski-1km`
- `burpee-broad-jumps-80m`

Current ranking rule: ascending completion time; ties use earliest submission first. War Ball weight is displayed but does not affect rank.

## 16. Official WordPress references

- WordPress hosting requirements: https://wordpress.org/about/requirements/
- Installing plugins: https://wordpress.org/documentation/article/manage-plugins/
- Plugin activation/deactivation hooks: https://developer.wordpress.org/plugins/plugin-basics/activation-deactivation-hooks/
- Creating plugin database tables with `dbDelta`: https://developer.wordpress.org/plugins/creating-tables-with-plugins/
- Adding custom REST API endpoints: https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/
- WordPress password verification: https://developer.wordpress.org/reference/functions/wp_check_password/
