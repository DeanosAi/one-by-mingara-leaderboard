# Source and maintenance

The editable React source, WordPress PHP source, tests and build configuration are included in the outer handover archive.

To rebuild the compiled WordPress frontend from source:

1. Install Node.js 24 LTS.
2. Open the source folder in a terminal.
3. Run `npm ci`.
4. Run `npm run build:wordpress`.
5. Copy `public/one-by-mingara-logo.png` into `wordpress/one-by-mingara-leaderboard/assets/`.
6. Run `npm run test:wordpress` and `npm run check`.
7. Recreate the installable plugin ZIP with the `one-by-mingara-leaderboard` folder at the ZIP root.

The existing Mission Control deployment is separate. Building this package does not alter it.

