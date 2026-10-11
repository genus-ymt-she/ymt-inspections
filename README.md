# PARRON – Site Inspections & Corrective Actions

**P**roactive **A**ssessment, **R**eporting, **R**isk & **O**bservation **N**etwork — the YMT project's field inspection app
(J1084 Parron Wind Farm Connection Assets – Yerramullah Terminal).

PARRON is an installable web app (PWA). It runs on any phone or laptop browser, works offline, and needs no
corporate IT systems: it is hosted on GitHub Pages and uses a project-owned Google Apps Script "relay" for
email, the shared project log (Google Sheet) and the PDF archive (Google Drive).

## What it does

| Area | Capability |
|---|---|
| **Inspect** | 22 checklist inspections + discussion record, C / UA / NI / N/A ratings, SNN-linked items, EXIF-verified time-stamped photos, voice mode, signature sign-off, branded PDF |
| **Risk** | Genus Risk Matrix on every finding (Minor → Catastrophic × Rare → Almost certain, ranked 1–25, Low / Medium / High / Critical) with the Genus risk action and a suggested due date |
| **Actions** | Project-wide corrective action register. The responsible person is **emailed the action** with a link to close it out, and reminded when it is due or overdue. Close-out with photo evidence, SHE Manager emailed to verify (Manager PIN), re-open / reassign, full history, CSV export |
| **Quick reports** | 30-second hazard report (Genus risk rating, photos, assign and email an action) and positive observation, for lead indicators |
| **Urgent alert** | Any UA or Critical finding emails the SHE Manager and the inspection supervisor immediately |
| **Insights** | KPIs with month-on-month change, 6-month trend, findings by type, risk profile, repeat findings, team activity |
| **Monthly report** | One-tap Monthly HSE Summary PDF and auto-written *2.1 Safety Summary* text for the project monthly report |
| **Targets** | Weekly inspection target per person (`TEAM` in config.js), shown this week / this month on Insights |
| **Summaries** | 6 pm daily email, plus a Monday weekly summary to the SHE Manager (inspections vs targets, findings, hazard / positive reports, open, overdue and Critical actions) |

## Project structure

```
index.html                 app shell
css/app.css                design system (light / dark / high contrast)
js/app/config.js           ← project settings: recipient, Genus risk matrix, categories
js/app/*.js                app modules (views, form, register, actions, dashboard, monthly, pdf, voice …)
js/data/templates.js       inspection checklists
js/data/assets.js          embedded logo and SNN icons (used in PDFs offline)
js/vendor/                 jsPDF + AutoTable
assets/                    vector Genus logo (colour + white) and app icon artwork
tools/render-svg.mjs       rebuilds the PNG icons from the SVG artwork
PARRON_Relay_Code.gs       Google Apps Script relay (v3)
config.json                relay link used by the app
sw.js                      offline cache
tests/                     relay unit tests + end-to-end browser test
docs/DEPLOY.md             deployment and relay update guide
```

## Changing project settings

Everything a SHE Manager normally changes is in **`js/app/config.js`**:

- `CONFIG` – project name, job number, document prefix, report recipient
- `TEAM` – the project team (name, role, email, weekly inspection target). People pick themselves on first use, and actions are
  assigned by picking a name, which emails that person automatically
- `RISK` – the Genus Risk Matrix (taken from the Genus JHA): descriptors, ranked cells, bands, colours,
  risk actions and the suggested close-out days used for due dates
- `OBS_CATEGORIES` – positive observation categories
- `CATEGORIES` – how inspections are grouped in the library

After editing, bump `const C = "parron-v…"` in `sw.js` so phones pick up the change.

## Running the tests

```bash
npm install
npx playwright install chromium   # first time only
npm test                          # relay unit tests + full end-to-end workflow
node tests/smoke.mjs --shots      # same, saving screenshots to tests/out/
```

The tests run the **real** relay code against simulated Google services, so the whole loop
(inspection → send → assignee emailed → close-out from the email link → verify → Insights → monthly PDF) is checked on every change.

See **[docs/DEPLOY.md](docs/DEPLOY.md)** to publish an update or upgrade the relay.
