ONE BY MINGARA LEADERBOARD — WORDPRESS HANDOVER
Version 1.0.0 | 12 August 2026

START HERE

1. Read MINGARA-WORDPRESS-DEPLOYMENT-GUIDE.md in full.
2. Test the deployment on a staging copy of the Mingara WordPress site.
3. Give one-by-mingara-leaderboard.zip to the WordPress administrator.
4. Create a published but orphaned WordPress page.
5. Upload and activate the plugin.
6. Open Settings > One Leaderboard, select the orphaned page, and set the initial Team password.
7. Configure the cache/WAF exclusions listed in the guide.
8. Complete the staging acceptance test before production.

FILES

- one-by-mingara-leaderboard.zip: install this through WordPress Plugins > Add New Plugin > Upload Plugin.
- MINGARA-WORDPRESS-DEPLOYMENT-GUIDE.md: detailed deployment, testing, operations, backup, privacy and rollback instructions.
- one-by-mingara-leaderboard-source-v1.0.0.zip: editable source and automated tests for the development team.
- SHA256SUMS.txt: SHA-256 integrity hashes for the delivered archives.

IMPORTANT

- The current Mission Control app remains live and separate.
- The WordPress install starts with no member entries.
- The two deployments do not synchronise data.
- Do not install directly on production before staging approval and backups.
- Store the initial Team password in Mingara's approved password manager.

