# PARRON – Site Inspections, Actions & MYOSH Reporting

**P**roactive **A**ssessment, **R**eporting, **R**isk & **O**bservation **N**etwork — the YMT project's field inspection app
(J1084 Parron Wind Farm Connection Assets – Yerramullah Terminal).

PARRON is an installable web app (PWA). It runs on any phone or laptop browser, works offline, and needs no
corporate IT systems: it is hosted on GitHub Pages and uses a project-owned Google Apps Script "relay" for
email, the shared project log (Google Sheet) and the PDF archive (Google Drive).

## What it does

| Area | Capability |
|---|---|
| **Inspect** | 22 checklist inspections + discussion record, C / UA / NI / N/A ratings, SNN-linked items, EXIF-verified time-stamped photos, voice mode, signature sign-off, branded PDF |
| **Risk** | 5 × 5 consequence × likelihood rating on every finding, response time and suggested due date by risk level |
| **Actions** | Project-wide corrective action register: overdue escalation, close-out with photo evidence, SHE Manager verification (Manager PIN), re-open, full history, CSV export |
| **MYOSH** | Queue of reports not yet entered in MYOSH; copy-ready fields in MYOSH order, hazard register entries, MYOSH reference recorded against each report |
| **Insights** | KPIs with month-on-month change, 6-month trend, findings by type, risk profile, repeat findings, team activity |
| **Monthly report** | One-tap Monthly HSE Summary PDF and auto-written *2.1 Safety Summary* text for the project monthly report |
| **Daily summary** | 6 pm email: unsent forms, overdue actions, items awaiting verification, MYOSH backlog |

## Project structure

```
index.html                 app shell
css/app.css                design system (light / dark / high contrast)
js/app/config.js           ← project settings: recipient, risk matrix, MYOSH fields, categories
js/app/*.js                app modules (views, form, register, actions, myosh, dashboard, monthly, pdf, voice …)
js/data/templates.js       inspection checklists
js/data/assets.js          embedded logo and SNN icons (used in PDFs offline)
js/vendor/                 jsPDF + AutoTable
PARRON_Relay_Code.gs       Google Apps Script relay (v3)
config.json                relay link used by the app
sw.js                      offline cache
tests/                     relay unit tests + end-to-end browser test
docs/DEPLOY.md             deployment and relay update guide
```

## Changing project settings

Everything a SHE Manager normally changes is in **`js/app/config.js`**:

- `CONFIG` – project name, job number, document prefix, report recipient
- `RISK` – consequence / likelihood descriptors, risk bands, colours and close-out times
  (align these with the project HSE Management Plan risk matrix)
- `MYOSH_FIELDS` – order and labels of the MYOSH entry sheet
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
(inspection → send → register → close-out → verify → MYOSH → Insights → monthly PDF) is checked on every change.

See **[docs/DEPLOY.md](docs/DEPLOY.md)** to publish an update or upgrade the relay.
