=== One by Mingara Leaderboard ===
Contributors: one-by-mingara
Tags: leaderboard, fitness, hyrox, workout
Requires at least: 6.5
Tested up to: 7.0.2
Requires PHP: 8.1
Stable tag: 1.0.0
License: Proprietary

A self-contained One by Mingara HYROX leaderboard app for a dedicated WordPress page.

== Features ==

* Five fastest-time leaderboards: 1KM Row, 1KM Run, 1KM Ski, 100 Wall Balls, and 80m Burpee Broad Jumps.
* Public result submission and fastest-first ranking.
* Protected Team moderation with per-workout search, entry deletion, and password changes.
* Protected usage and adoption analytics, including month selection.
* Shared WordPress database storage and automatic refresh across devices.
* Standalone, theme-independent, mobile-first app page.
* Installable web-app metadata and service worker, where permitted by the host.

== Installation ==

Read MINGARA-WORDPRESS-DEPLOYMENT-GUIDE.md in the handover package before installing.

== Data ==

Results are stored in the WordPress database table `{prefix}one_leaderboard_results`.
Settings and the one-way Team password hash are stored in WordPress options.
Deactivation does not delete data.

== Changelog ==

= 1.0.0 =
* Initial Mingara WordPress handover release.
