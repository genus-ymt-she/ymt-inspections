# Workout Tracker (Phase 1 + 2)

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
| `region` | `"lower"` gives a +5 kg progression jump (default for the Legs session); anything else gives +2.5 kg |
| `increment` | Optional fixed progression jump in kg (an in-app ⚙ setting overrides it) |
| `rest` | Optional rest in seconds for this exercise (overrides the type default) |
| `alternatives` | Swap options for this slot: `[{ "id": "incline-db-press", "name": "Incline DB Press" }]` or plain names. An alternative copies the slot's sets, reps and type, and logs under its own `id` |
| top-level `noteTags` | Quick-tap tags under session notes (default: Right shoulder, Lower back, Low energy) |

## Phase 2 training features
- **Progression (double progression).** The app looks at the last *normal* session for each exercise, ignoring deload sessions. It only counts that session when every programmed working set was logged with reps.
  - Every set at the top of the rep range → **READY TO PROGRESS**. The suggestion is the last weight plus the increment, aiming for the bottom of the range.
  - Otherwise → same weight, beat last time's reps.
  - Suggestions only appear as grey hints. **Use suggested kg** fills empty weight boxes when you tap it; nothing is applied automatically. Drop sets and timed holds get no suggestion.
- **Per-exercise ⚙:** set the weight jump and the rest time for one exercise.
- **Rest timer.** Starts when you tick a set. It counts down at the bottom of the screen, vibrates when finished (if the phone supports it), and has **+30s** and **Skip**. Defaults can be changed in Home → ⚙:
  - Compound (first two exercises of the day): 120 s
  - Standard: 90 s
  - Superset, after the first exercise of the pair: 45 s. After the second exercise, the normal rest applies.
  - Drop set: 15 s
  - Android may pause the countdown while the screen is off or the app is in the background. It catches up as soon as you return.
- **Session notes and tags.** Free text plus quick-tap tags. History has a search box (notes, tags, "deload", "partial") and tag filters.
- **Deload (Home toggle, remembered).** Every exercise drops to 2 sets, hints show 60% of the last normal weight (rounded to 0.5 kg), and drop sets are hidden. The app turns orange while it's on, and the session is tagged *Deload* in History.
- **Swap ⇄.** Pick an alternative for that slot in today's session. It logs under its own exercise and keeps its own "Last"/progression history. History shows "Substituted for …". Weights pre-filled but never performed on the exercise you swap out are cleared.
- **Partial sessions.** If you finish with exercises not logged, choose **Complete** or **Partial**. A partial session is flagged in History with the skipped exercises listed. Skipped exercises have no sets in that session, so their progression keeps using the session before.


## Data
- **sessionLogs**: `id, sessionId, date, onBlock, completed, notes, finishedAt, durationSec`
- **setLogs**: `id, sessionLogId, exerciseId, setNumber, drop, weight, reps, rir, done`. For timed holds, `reps` holds the seconds.
- Every keystroke is saved straight away. Closing the app mid-session loses nothing; reopen it and tap **Resume**.
- **Export** downloads `workout-backup-YYYY-MM-DD.json`. **Import** checks the file first, then replaces all logged data on the phone in a single transaction.

## Updates
The app shell is served from the cache first and refreshed in the background. A code change therefore shows up on the second open after it's published. `programme.json` is checked against the network first on every open.

## Tests
- `node --test tests/unit/workout-logic.test.mjs`: programme, on-block, superset, last-time and backup logic
- `node tests/workout-e2e.mjs [--shots]`: Phase 1 and Phase 2 checks in a real Chromium browser
