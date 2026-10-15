# Workout Tracker (Phase 1)

A separate app from PARRON. It runs offline on Android, has no login and no backend, and keeps its own service worker, manifest and IndexedDB database (`workout-tracker`). It shares nothing with PARRON except the web address it is hosted at.

## Install on Android
1. Open `https://<github-user>.github.io/ymt-inspections/workout/` in Chrome while you have signal.
2. Open the ⋮ menu and choose **Add to Home screen** (or **Install app**).
3. Open it once from the home-screen icon. After that it works with no connection.

Installing also lets Chrome mark the app's storage as *persistent*, so Android won't clear it when space runs low. The Home screen shows whether storage is protected. **Export regularly.** The Home screen shows when you last exported.

## Editing the programme
All exercises come from `programme.json`, and none are written into the code. Edit it, commit it, and the app picks up the change the next time it opens with signal. If the file has an error, the app keeps using the last good copy and shows a warning on Home.

| Field | Meaning |
|---|---|
| `id` | Permanent key that history links to. **Don't change it** once you've logged against it. If an exercise appears on more than one day with the same `id` (e.g. `face-pull-er`), its "Last" numbers carry across those days. |
| `label` | A, B, C1… (display only) |
| `sets`, `repMin`, `repMax`, `rir` | Off-block target |
| `type` | `standard` · `superset` · `dropset` (rounds of `drops` weight/rep pairs, default 3, no RIR) · `timed` (seconds instead of reps; the weight box is for added load) |
| `supersetWith` | `id` of the partner exercise. The two must sit next to each other in the list. |
| `onBlockSets` / `onBlockSkip` | Sets to use when on-block, or hide the exercise entirely when on-block |
| `perSide` | Shows "per side" on the target |
| session `offBlockOnly` | The session card is greyed out and can't be started while on-block |

## Data
- **sessionLogs**: `id, sessionId, date, onBlock, completed, notes, finishedAt, durationSec`
- **setLogs**: `id, sessionLogId, exerciseId, setNumber, drop, weight, reps, rir, done`. For timed holds, `reps` holds the seconds.
- Every keystroke is saved straight away. Closing the app mid-session loses nothing; reopen it and tap **Resume**.
- **Export** downloads `workout-backup-YYYY-MM-DD.json`. **Import** checks the file first, then replaces all logged data on the phone in a single transaction.

## Updates
The app shell is served from the cache first and refreshed in the background. A code change therefore shows up on the second open after it's published. `programme.json` is checked against the network first on every open.

## Tests
- `node --test tests/unit/workout-logic.test.mjs`: programme, on-block, superset, last-time and backup logic
- `node tests/workout-e2e.mjs [--shots]`: Phase 1 acceptance criteria in a real Chromium browser (offline, save, resume, last-time, same-as-last, on-block, export/import)
