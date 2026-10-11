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
- The district is set in `js/app/config.js` (`SITE.fdrDistrict`, currently **Watheroo** – Badgingarra / Shire of Dandaragan).
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
