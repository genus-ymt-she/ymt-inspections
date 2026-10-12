# Deploying PARRON v2.0

PARRON has two parts. Both are owned at project level – no Genus IT involvement is needed.

| Part | Where it lives | How it updates |
|---|---|---|
| **App** (screens, PDFs, forms) | This GitHub repository, published by GitHub Pages | Merge to `main` – phones update automatically next time they open the app with signal |
| **Relay** (email, project log, PDF archive) | Google Apps Script, in the Google account that set it up | Paste the new code and redeploy (steps below) |

The v2.0 app works with the **old v2 relay**: inspections still send and email exactly as before.
The shared Action register, action emails, Insights charts and Manager mode switch on once the relay is updated to v3.

---

## 1. Update the relay to v3 (about 5 minutes)

1. Open the existing Apps Script project (script.google.com → *PARRON relay*).
2. Select all the code in `Code.gs` and replace it with the contents of **`PARRON_Relay_Code.gs`** from this repository. **Save**.
3. In the toolbar choose the function **`setup`** and click **Run**.
   - Google asks for permission again because v3 adds **Google Drive** (PDF archive and close-out photos). Approve it.
   - `setup` adds the new *Findings* and *Observations* sheets and columns to the existing log – **no data is lost** –
     schedules the 6 pm daily summary, the Monday 7 am weekly summary and the 5 am personal reminder emails,
     and emails a confirmation (which also says whether the Fire Danger Rating could be read from the Bureau of Meteorology).
4. **Set the Manager PIN:** ⚙ **Project Settings** (left bar) → **Script properties** → **Add script property**
   - Property: `MANAGER_PIN`  Value: a 4–8 digit PIN known only to the SHE Manager → **Save**.
   - The PIN is never stored in the code or on GitHub.
5. **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy.**
   The web app link stays the same, so `config.json` does not change.
6. In the app: **Settings → Connection → Test connection** should show *relay v3*.
7. On the SHE Manager's phone: **Settings → Manager mode** → enter the PIN → **Turn on**.

## 2. Publish the app

1. Merge the pull request into `main`.
2. GitHub Pages republishes within a minute or two (repository **Settings → Pages** shows the live link).
3. Phones pick up the new version the next time PARRON is opened with signal (the offline cache version is `parron-v2.0.0` in `sw.js`).

Drafts, the Outbox and sent history already on phones are kept – the storage format is unchanged.

## 3. Check it works

- Start any inspection, record one NI with a risk rating, sign and send.
- The report email arrives with the PDF and the finding appears under **Actions**.
- If you picked a responsible person from the team list (or entered an @genus.com.au email), they receive an *Action assigned to you* email with a button that opens the action.
- **Insights → Monthly report** builds the monthly PDF.

---

## Security notes

- The repository is public (required for free GitHub Pages), so anything in it – including the app key in
  `config.json` – is visible. The key only allows sending reports and status updates; it cannot read
  email or change settings.
- Verifying, re-opening and reassigning actions need the **Manager PIN**, checked by the relay.
  Ten wrong attempts lock the PIN for 15 minutes.
- The relay rejects oversized payloads, rate-limits requests and only emails `@genus.com.au` addresses.
  To let action emails reach a subcontractor, add their domain to `ASSIGN_ALLOWED` near the top of the relay code,
  e.g. `/@(genus\.com\.au|acme\.com\.au)$/i`, then redeploy.
- The Google Sheet, PDF archive and evidence photos are private to the Google account that runs the relay.
- To change the app key: edit `KEY` in the relay *and* `key` in `config.json`, then redeploy both.

## Adding or removing team members

Edit the `TEAM` list in `js/app/config.js` (name, role, email), then bump the cache version in `sw.js`.
Each person picks their own name the first time they open PARRON (*Settings → Profile → Change* to switch).

## Fire Danger Rating on the home screen

The rating comes from the Bureau of Meteorology's public fire weather district forecast (product IDW15100).
A GitHub Action (`.github/workflows/fdr.yml`) downloads it every 30 minutes and publishes `fdr.json` on the
`fdr-data` branch; phones read it from there. No Google script change is needed for this.
- The district is set in `js/app/config.js` (`SITE.fdrDistrict`, currently **Lesueur** – Hill River, coastal part of the Shire of Dandaragan; Badgingarra town itself is just inside Watheroo).
- To override for a day (Manager mode): tap the **Fire Danger** box → **Set today's rating** → **Save for everyone**.
  Choose **– use the Bureau of Meteorology –** to go back to the official rating.
- GitHub pauses scheduled Actions after 60 days with no repository activity. If the rating stops updating, open
  **Actions → Fire Danger Rating feed → Enable workflow / Run workflow**.
- Always confirm Total Fire Bans (DFES) and Harvest & Vehicle Movement Bans (Shire of Dandaragan) at pre-start.

## Trade Assistants – Fuel, Hours & Pre-Start Register (form 28)

- Home → **Trade Assistants**. The TA completes the **Start of day** (pre-start Y/N/N/A, hours basis, hour meter, optional photo)
  and saves it; at the end of the day they open it again, add fuel issued / flow meter / comments, sign and send.
- The register (PDF in the paper GEN-PWF-1084-SHEQ-F021 layout, plus a table in the email) goes to **Amie Smith (Project Admin)**
  and the SHE Manager. Recipients are set in `js/data/templates.js` (form 28, `"to"`); assets are listed in the same place.
- **Weekly fuel summary (optional – needs the latest relay code):** after pasting the current `PARRON_Relay_Code.gs` and deploying a
  new version (no need to run `setup` again), every register is also logged to a *Fuel* sheet, and each Monday at 7 am Amie receives
  last week's totals by asset, the daily detail, any weekdays with no register, and a CSV copy. Change `FUEL_TO` in the relay to send it elsewhere.

## PARRON Radio

Home → **PARRON Radio** shuffles the project playlist (`RADIO_SONGS` in `js/app/config.js`). Songs play from the artists' official
YouTube uploads in YouTube's own player – no music is stored in PARRON. If a video is ever removed, the player tries the next listed
upload, then skips the song. Music needs signal and pauses when the phone is locked (a phone limit for web apps); *Open in YouTube* hands
the playlist to the YouTube app instead.

## Site access code (protects the project log)

The app key is visible in this public repository, so on its own it would let anyone who finds the link read the project log.
The site access code closes that gap without any IT involvement:
1. Paste the latest `PARRON_Relay_Code.gs`, Save, then **Deploy → Manage deployments → ✏ Edit → New version → Deploy**.
2. **Project Settings → Script properties → Add script property:** `SITE_CODE` = a word or code of 6+ characters (not case-sensitive).
3. The next time each phone opens PARRON it asks for the code once (it is also under **Settings → Connection → Site access code**).
   Reports waiting in the Outbox send as soon as the code is entered.
- Give the code to the team in person or by text – never put it in GitHub.
- To change it, edit `SITE_CODE`; every phone asks for the new code on its next request. Delete the property to switch the check off.

## Hazard & positive reports in the app

**Actions → Reports** lists every hazard report and positive observation sent from site (last 13 months), with search and filters
(All / Hazards / Open hazards / Positive). Tap one to see the full report, its photos and the linked corrective action.
Insights (Lead indicators) and the hazard form also link to it.
- Needs the latest relay code (paste, Save, Deploy → Manage deployments → Edit → New version). Before that, the list shows the
  last two months without photos.
- Photos are read from the relay's Drive folder; only photos that belong to a logged report can be opened.

## Emergency Management and Traffic Management tabs

- **Emergency** (red, bottom bar): Call 000, UHF 24 alarm call, site location for 000 (address, Plus Code, GPS, meet point),
  the 16 emergency situation cards (ERP Appendix B, verbatim), muster points, emergency contacts (ERP Appendix A – Genus
  personnel left out because the app is a public link) and the Adverse Weather & Site Access TARP (J1084-HSE-TRP-YMT-0001 Rev A).
- **Traffic**: the five site layout maps (tap for full screen, pinch to zoom).
- Everything in both tabs is in the offline cache – it opens with no signal once PARRON has been opened online.
- Content is in `js/data/emergency.js`; maps in `assets/traffic/`. When the ERP / TARP is revised, update that file
  (and bump the cache version in `sw.js`).

## HVMB & Fire Status – HVMB / TFB / FDR (v3.5, renamed v3.6)

- Panel at the top of Home. Set from the Shire of Dandaragan HVMB text message by the SHE Manager or anyone registered
  for Shire notifications (register: `hvmbUrl` in config.json). Set by anyone with the **status PIN** (Update → pick FDR, TFB, HVMB, Morning / Midday / Change, PIN).
- The PIN lives only in the relay: Apps Script → Project Settings → Script Properties → `STATUS_PIN`. It is never in GitHub
  or the app. The phone remembers it after the first correct entry ("Forget" removes it). 10 wrong PINs lock it for 15 minutes.
- Every change is a new row in the **Site Status** sheet. Next check: Morning → 12:00; Midday / Change → 05:30 next day.
  Overdue → orange banner. Nothing set today → grey "NOT SET TODAY" and restrictions are hidden.
- The 6 pm daily email opens with today's status history and flags "No midday re-check recorded".
- `config.json` → `hvmbUrl`: the Shire of Dandaragan HVMB text-notification sign-up page.

## This day in history (v3.5)

- The relay prepares three facts at 4–5 am Perth (`prepareHistory`, created by `setup` or `installHistoryTrigger`) from
  Wikipedia "On this day" and saves them to the **This Day** sheet. Violent / tragic events are filtered out
  (`HISTORY_EXCLUDE` in the relay and `HIST_EXCLUDE` in `js/app/history.js` – keep them the same).
- Optional Script Property `HISTORY_EMAIL` – the facts are emailed there each morning for the pre-start.
- If the relay hasn't prepared them, the app reads Wikipedia directly. Facts are cached on the phone for the day.

## Reference – SNN, 330 kV, ChemAlert (v3.5)

- Content is in `js/data/reference.js` (verbatim). The 330 kV MAD image goes in `img/mad.png` (add it to `sw.js` FILES
  and bump the cache). Until then the card shows "MAD values: refer to your Western Power permit / ESSR".
- `config.json` → `chemAlertUrl`: the ChemAlert login/search link. It opens in the browser – no credentials are stored.

## Home and Inspect tabs (v3.6)

- **Home** (opens first): HVMB & Fire Status, This day in history, welcome / weather / FDR, reminders, My Day,
  Inspect & report shortcut, PARRON Radio, Reference (SNN, 330 kV, ChemAlert).
- **Inspect**: Inspection library, Task Observation, Mentoring, Hazard, Positive, Trade Assistants, Outbox, drafts in
  progress and recently sent. Sending or saving an inspection returns here.

## SHEQ Alerts – read and acknowledge (v3.7)

- **Publish:** Settings → Manager mode on → *Publish a SHEQ Alert* (or the + on the SHEQ Alerts page). Type, priority
  (Critical / Important / Info), title, what happened, what you must do, optional photo or PDF (8 MB). Optionally emailed
  to the project team (Genus addresses in `TEAM`, js/app/config.js).
- **Everyone:** the newest unread alert sits at the top of Home (Critical also pops up when PARRON opens) until they tap
  *I have read and understood*. Acknowledgements with no signal wait on the phone and send later.
- **Register:** sheets *SHEQ Alerts* and *Alert Acks* in the project log; the SHE Manager sees who has / hasn't read it.
  The 6 pm daily email lists who on site is still outstanding; the Monday summary shows the acknowledgement rate.
- **Roster sheet:** created with the team and their patterns. Fill in **First day of a swing** (any past swing start date)
  for each person so people on R&R aren't chased. Flexible = Y (e.g. variable out days) counts the person as on site.
  Add rows for anyone else who should acknowledge alerts.
- **Who must acknowledge:** *Everyone on the roster* (default) or *Choose people* – tick boxes for the team, with quick
  picks for SHE team, Supervisors & managers and Trade Assistants. Only the people chosen get the Home banner and the email;
  the register and daily email count only them. Stored in the *Must acknowledge* column.
- Close an alert from its page (Manager mode) to take it off Home and the daily email; the register is kept.
- Relay update required: paste the new `PARRON_Relay_Code.gs`, run `setup` once (creates the sheets and the roster), and
  redeploy as a new version.
