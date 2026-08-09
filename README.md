# One by Mingara Leaderboard

Mobile-first proof of concept for shared member workout leaderboards. It includes two active challenges, three configurable Coming Soon slots, instant cross-device updates, result ranking, installable PWA metadata, and staff moderation.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Other devices on the same network can use the computer's LAN IP with port `5173` while the dev server is running.

The prototype admin is at `/admin`. Its default local password is `oneadmin`. Set `ADMIN_PASSWORD` before the first shared deployment; the login screen intentionally does not display it. Staff can subsequently change the password from inside the protected admin page. The salted password hash persists in `data/admin.json`.

## Production-style run

```powershell
npm run build
$env:ADMIN_PASSWORD='choose-a-strong-password'
npm start
```

The server listens on port `4173` by default and serves both the API and built web app.

## Mission Control deployment

The live team build is designed to run behind Mission Control at `/one-leaderboard/`:

```powershell
npm run build:mission-control
```

The included multi-stage `Dockerfile` builds that subpath-aware version and stores results and the staff password hash in `/app/data`. Mount that directory as a persistent volume and set `ADMIN_PASSWORD` before the first start.

## Configuration and storage

- Workout definitions live in `shared/workouts.js`. Add fields, weight options, inactive slots, display settings, or new workouts there.
- Prototype results persist in `data/results.json` on the host. The API is the only layer that reads or writes the file, so all phones viewing the same deployment share the same data.
- The front end consumes `/api/...` only. For WordPress, those routes can be replaced with a small WordPress REST plugin backed by custom database tables without rebuilding the member UI.
- Set `ADMIN_PASSWORD`; the server issues expiring in-memory staff sessions. Member submissions do not require authentication.

## Staff analytics

The protected `/admin/stats` page calculates adoption metrics from leaderboard submissions. Because members do not have accounts, a unique participant is inferred from a case-insensitive, whitespace-normalised submitted name. The dashboard measures entries and participants rather than page views, and includes current-period activity, week/month comparisons, rolling averages, trend charts, workout mix, repeat use, and cross-workout participation.

## Checks

```powershell
npm run check
```

The tests cover fastest-time sorting, immediate rank calculation, War Balls weight display data, validation, admin protection, and moderation deletion.
