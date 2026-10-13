/**
 * PARRON relay v3 – emails inspection reports, keeps the shared project log (Google Sheet) behind the
 * in-app Insights and Actions screens, emails people when an action is assigned to them (and reminds
 * them when it is overdue), sends an urgent alert for UA / Critical findings, logs quick hazard reports and
 * positive observations, archives report PDFs and photos to Google Drive, sends the 6 pm daily summary
 * and the Monday weekly summary to the SHE Manager, emails people their own repeating reminders (5 am),
 * supplies the official Fire Danger Rating (Bureau of Meteorology) for the home screen, keeps the SHE Manager's SHEQ
 * obligations register (My SHEQ Planner – 5 am reminder emails, ticked off when the linked form is sent) and serves
 * the inspection forms the SHE Manager adds in the app, and lists every submitted report (with its Drive PDF) for the SHE Manager.
 *
 * FIRST TIME: paste this whole file in, Save, choose "setup" in the toolbar and click Run.
 *   Then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * UPDATING FROM v2: paste over the old code, Save, choose "setup" and click Run once (it adds the new
 *   sheet columns and asks for Drive permission), then Deploy > Manage deployments > Edit (pencil)
 *   > Version: New version > Deploy. The web app link stays the same – no app change needed.
 * SITE ACCESS CODE (recommended): Script properties > Add property SITE_CODE = a word or code of 6+ characters.
 *   Phones then need the code once (Settings > Site access code) before they can send or read the project log.
 *   Leave it unset to allow any phone with the app link.
 * MANAGER PIN: Project Settings (cog, left bar) > Script properties > Add property
 *   MANAGER_PIN = a 4–8 digit PIN. It unlocks verify / re-open / reassign in the app. It is never
 *   stored in this file or in GitHub.
 *
 * v2 phones keep working: anything they send is accepted and logged exactly as before.
 */
const TO = 'darren.frizzell@genus.com.au';   // reports and the daily summary go here
const KEY = 'prn-ymt-7Qk2vX9m';               // must match "key" in config.json
const ALLOWED = /@genus\.com\.au$/i;
const TZ = 'Australia/Perth';
const DIGEST_HOUR = 18;                       // daily summary between 6 and 7 pm Perth time
const WEEKLY_HOUR = 7;                        // weekly summary every Monday between 7 and 8 am Perth time
const REMINDER_HOUR = 5;                      // personal reminder emails between 5 and 6 am Perth time
// Fire Danger Rating: Bureau of Meteorology forecast products tried in order (fire-district areas are read from
// whichever responds). Choose the district once in the app (Settings > Fire Danger Rating, Manager mode).
const FDR_PRODUCTS = ['IDW15100'];             // WA fire weather district forecast (Hill River site: Lesueur)
const FDR_DEFAULT_AREA = /^Lesueur$/i;
const ARCHIVE_PDFS = true;                    // save a copy of every report PDF to Google Drive
const MAX_PER_MINUTE = 90;                    // simple flood protection for the public web app link
const APP_URL = 'https://genus-ymt-she.github.io/ymt-inspections/';   // link used in action emails
// Action emails are only sent to these domains (stops the public link being used to email anyone).
// Add a subcontractor's domain here if their people are assigned actions, e.g. /@(genus\.com\.au|acme\.com\.au)$/i
const ASSIGN_ALLOWED = /@genus\.com\.au$/i;
// Daily Fuel Usage / Hours / Pre-Start Register: the weekly fuel summary (Monday, with the weekly summary) goes here
const FUEL_TO = 'amie.smith@genus.com.au';

const SENT_HEAD = ['Sent at', 'Date', 'Month', 'Report ID', 'UID', 'Name', 'No', 'Inspection', 'Location', 'UA', 'NI', 'SNN', 'Sent via',
  'C', 'NA', 'Compliance %', 'Inspection date', 'Crew', 'Supervisor', 'PDF link'];
const STAT_HEAD = ['UID', 'Name', 'No', 'Inspection', 'Location', 'Started', 'Last update', 'State', 'Sent at'];
const FIND_HEAD = ['FID', 'Report ID', 'UID', 'Raised', 'Inspection date', 'Raised by', 'No', 'Inspection', 'Location', 'Crew',
  'Item', 'Item text', 'Rating', 'SNN', 'Consequence', 'Likelihood', 'Risk score', 'Risk level', 'Finding', 'Corrective action',
  'Status', 'Owner', 'Due', 'Closed at', 'Closed by', 'Close-out note', 'Evidence link', 'Verified at', 'Verified by', 'Updated', 'History', 'Owner email', 'Notified'];
const OBS_HEAD = ['Logged', 'Date', 'Month', 'Report ID', 'Type', 'Name', 'Location', 'Description', 'Category', 'Person / crew recognised',
  'Consequence', 'Likelihood', 'Risk score', 'Risk level', 'Immediate action', 'Status', 'Owner', 'Owner email', 'Due', 'Photo links'];
const FUEL_HEAD = ['Logged', 'Date', 'Report ID', 'Recorded by', 'Asset ID', 'Description', 'Pre-start', 'Hours basis', 'Hour meter start',
  'Hour meter end', 'Hours', 'Flow meter', 'Fuel (L)', 'Comments', 'Verified by'];
const SITESTAT_HEAD = ['Set at', 'Date', 'FDR', 'Total Fire Ban', 'HVMB', 'Set by', 'Check type', 'Note'];
const HIST_HEAD = ['Date', 'Prepared at', 'Fact 1 year', 'Fact 1', 'Fact 1 link', 'Fact 2 year', 'Fact 2', 'Fact 2 link', 'Fact 3 year', 'Fact 3', 'Fact 3 link', 'Facts (JSON)'];
const FDR_LEVELS = ['No Rating', 'Moderate', 'High', 'Extreme', 'Catastrophic'];
const HISTORY_HOUR = 4;                       // "This day in history" prepared between 4 and 5 am Perth time
// Words that keep an event off the pre-start list – edit here
const HISTORY_EXCLUDE = ['murder', 'massacre', 'killed', 'killing', 'kills', 'terrorist', 'terrorism', 'bombing', 'bomb', 'shooting', 'shot dead', 'assassinat', 'executed', 'execution',
  'genocide', 'rape', 'suicide', 'war crime', 'hostage', 'behead', 'lynch', 'stabbing', 'torture', 'slaughter', 'atrocit', 'holocaust', 'abduct', 'kidnap', 'died', 'deaths', 'dead', 'crash', 'disaster'];
/* SHEQ Alerts – read and acknowledge. Published by the SHE Manager (Manager PIN) to the people ticked in the app;
   each person taps "I have read and understood" on their phone and their name and time are recorded. */
const ALERT_HEAD = ['Alert ID', 'Published', 'Type', 'Priority', 'Title', 'What happened', 'What you must do', 'Attachment', 'Attachment type', 'Published by', 'Active', 'Closed', 'Must acknowledge', 'Emailed'];
const ACK_HEAD = ['Acknowledged', 'Alert ID', 'Name'];
const ALERT_TYPES = ['SHEQ Alert', 'Lesson learned', 'Plan or procedure change', 'Site notice'];
const ALERT_PRIORITY = ['Critical', 'Important', 'Info'];
const OB_HEAD = ['ID', 'Obligation', 'Source', 'Every', 'Owner', 'Owner email', 'Remind days before', 'Completed by form', 'Next due', 'Last done', 'Last evidence', 'Status', 'Approved by', 'Approved', 'Notes', 'Updated'];
const OBLOG_HEAD = ['Recorded', 'ID', 'Obligation', 'Done date', 'By', 'Evidence', 'How'];
const FORM_HEAD = ['Form no', 'Title', 'Rev', 'Status', 'Published', 'Published by', 'Form text', 'Template (JSON)'];
const REM_HEAD = ['ID', 'Name', 'Email', 'Reminder', 'Repeat', 'Time', 'Created', 'Last sent', 'Active'];
const ST = { spot: 'Closed on spot', open: 'Open', closed: 'Closed', verified: 'Verified' };

/* ---------- one-off setup (safe to run again after every update) ---------- */
function setup() {
  const ss = book_();
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(DIGEST_HOUR).everyDays(1).inTimezone(TZ).create();
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'weeklyDigest') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('weeklyDigest').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(WEEKLY_HOUR).inTimezone(TZ).create();
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'remindersRun') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('remindersRun').timeBased().atHour(REMINDER_HOUR).everyDays(1).inTimezone(TZ).create();
  installHistoryTrigger();
  if (ARCHIVE_PDFS) folder_('PARRON – Reports');
  const pin = PropertiesService.getScriptProperties().getProperty('MANAGER_PIN');
  MailApp.sendEmail(TO, 'PARRON relay v3 is connected',
    'The PARRON relay is set up.\n\nProject log (Google Sheet): ' + ss.getUrl() +
    '\nDaily summary: every day between 6 and 7 pm (Perth time).' +
    '\nWeekly summary: every Monday between 7 and 8 am (Perth time).' +
    '\nPersonal reminders: emailed between 5 and 6 am (Perth time).' +
    '\nWeekly fuel, hours & pre-start register: Mondays to ' + FUEL_TO + '.' +
    '\nThis day in history: prepared every day between 4 and 5 am (Perth time)' + (PropertiesService.getScriptProperties().getProperty('HISTORY_EMAIL') ? ' and emailed to ' + PropertiesService.getScriptProperties().getProperty('HISTORY_EMAIL') : '') + '.' +
    '\nMy SHEQ Planner: your obligations register (SHEQ Register sheet). Reminder emails are ' + ({ off: 'OFF – nobody is emailed', me: 'on – to you only', all: 'on – to you and each owner' })[plannerEmails_()] + ' (change it on the planner screen).' +
    '\nInspection forms you add in the app are kept in the Custom Forms sheet.' +
    '\nSHEQ Alerts: published from the app in Manager mode – tick who must acknowledge; the register is in the Alert Acks sheet.' +
    '\nToday on site status PIN: ' + (PropertiesService.getScriptProperties().getProperty('STATUS_PIN') ? 'set' : 'NOT SET – add STATUS_PIN under Script properties so the site status can be updated.') +
    '\nFire Danger Rating: ' + (fdrFetch_(true).today ? 'reading from the Bureau of Meteorology' : 'could not be read automatically – set it in the app (Manager mode) or choose the district') +
    '\nManager PIN: ' + (pin ? 'set' : 'NOT SET – add MANAGER_PIN under Project Settings > Script properties.') +
    '\nSite access code: ' + (PropertiesService.getScriptProperties().getProperty('SITE_CODE') ? 'set' : 'not set – add SITE_CODE under Script properties so only your team can read the project log.'));
}

function book_() {
  const p = PropertiesService.getScriptProperties();
  let ss, id = p.getProperty('SHEET_ID');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create('PARRON – Inspection Log (YMT)'); p.setProperty('SHEET_ID', ss.getId()); }
  sheet_(ss, 'Sent', SENT_HEAD); sheet_(ss, 'Status', STAT_HEAD); sheet_(ss, 'Findings', FIND_HEAD); sheet_(ss, 'Observations', OBS_HEAD); sheet_(ss, 'Reminders', REM_HEAD); sheet_(ss, 'Fuel', FUEL_HEAD); sheet_(ss, 'Site Status', SITESTAT_HEAD); sheet_(ss, 'This Day', HIST_HEAD);
  sheet_(ss, 'SHEQ Alerts', ALERT_HEAD); sheet_(ss, 'Alert Acks', ACK_HEAD);
  sheet_(ss, 'SHEQ Register', OB_HEAD); sheet_(ss, 'Register Log', OBLOG_HEAD); sheet_(ss, 'Custom Forms', FORM_HEAD);
  const s1 = ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 8) ss.deleteSheet(s1);
  return ss;
}
function sheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < head.length) sh.getRange(1, 1, 1, head.length).setValues([head]);   // v2 → v3 column upgrade
  if (sh.getRange(1, 1).getBackground() !== '#112b4e') sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#112B4E').setFontColor('#FFFFFF');
  return sh;
}
function folder_(name, sub) {
  const p = PropertiesService.getScriptProperties(); const k = 'FOLDER_' + name;
  let f = null; const id = p.getProperty(k);
  if (id) { try { f = DriveApp.getFolderById(id); } catch (e) { f = null; } }
  if (!f) { f = DriveApp.createFolder(name); p.setProperty(k, f.getId()); }
  if (!sub) return f;
  const it = f.getFoldersByName(sub); return it.hasNext() ? it.next() : f.createFolder(sub);
}

/* ---------- web app ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || e.postData.contents.length > 30 * 1024 * 1024) return out_({ ok: false, error: 'Too large' });
    const d = JSON.parse(e.postData.contents);
    if (d.key !== KEY) return out_({ ok: false, error: 'Not authorised' });
    if (!codeOK_(d.code)) return out_({ ok: false, error: 'Site code required', needCode: true });
    if (!rate_()) return out_({ ok: false, error: 'Busy – try again in a minute' });
    lock.waitLock(25000);
    if (d.action === 'status') { status_(d); return out_({ ok: true }); }
    if (d.action === 'finding') return finding_(d);
    if (d.action === 'observation') return observation_(d);
    if (d.action === 'reminder') return reminder_(d);
    if (d.action === 'fdr') return fdrSet_(d);
    if (d.action === 'setStatus') return setStatus_(d);
    if (d.action === 'publishAlert') return publishAlert_(d);
    if (d.action === 'ackAlert') return ackAlert_(d);
    if (d.action === 'closeAlert') return closeAlert_(d);
    if (d.action === 'emailAlert') return emailAlert_(d);
    if (d.action === 'planner') return planner_(d);
    if (d.action === 'saveOb') return saveOb_(d);
    if (d.action === 'importOb') return importOb_(d);
    if (d.action === 'doneOb') return doneOb_(d);
    if (d.action === 'plannerEmails') return plannerMode_(d);
    if (d.action === 'saveForm') return saveForm_(d);
    if (d.action === 'submitted') return submitted_(d);
    if (d.action === 'reportPdf') return reportPdf_(d);
    if (d.action === 'pin') return out_({ ok: pinOK_(d.pin), error: pinOK_(d.pin) ? '' : 'Incorrect PIN' });
    return send_(d);
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function send_(d) {
  const cache = CacheService.getScriptCache();
  const uid = String(d.uid || d.reportId || '');
  if (uid && cache.get('sent_' + uid)) return out_({ ok: true, duplicate: true });
  const opts = {
    to: to_(d.to),
    subject: str_(d.subject || 'PARRON site inspection', 250),
    body: String(d.text || ''),
    name: 'PARRON Site Inspections'
  };
  let blob = null;
  if (d.html) opts.htmlBody = String(d.html);
  if (d.pdf) { blob = Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', str_(d.filename || 'inspection.pdf', 180)); opts.attachments = [blob]; }
  MailApp.sendEmail(opts);
  if (uid) cache.put('sent_' + uid, '1', 21600);
  let link = '';
  if (blob && ARCHIVE_PDFS) { try { link = folder_('PARRON – Reports', Utilities.formatDate(new Date(), TZ, 'yyyy-MM')).createFile(blob).getUrl(); } catch (e) { link = ''; } }
  logSent_(uid, d.reportId, d.meta || {}, 'Direct', d.report || {}, link);
  if (Array.isArray(d.findings)) { logFindings_(d); alert_(d, d.findings); }
  if (d.fuel && Array.isArray(d.fuel.rows)) logFuel_(d);
  try { obAutoTick_(d.meta || {}, d.reportId, link); } catch (e) { console.error(e); }
  return out_({ ok: true, pdf: link });
}

/* ---------- urgent alert: any UA or Critical finding goes to the SHE Manager (and the supervisor) straight away ---------- */
function alert_(d, list) {
  const hot = (list || []).filter(f => f && (f.rating === 'UA' || f.level === 'Critical'));
  if (!hot.length) return false;
  const m = d.meta || {}; const sup = email_((d.alert || {}).supervisorEmail);
  const rows = hot.map(f => `<tr><td style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px"><b>${esc_(f.item || '')}</b> ${esc_(f.text || '')}<br><b>Finding:</b> ${esc_(f.finding || '')}</td>
    <td style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px">${esc_(f.rating === 'UA' ? 'UA – stop work' : 'NI')}<br><b>${esc_((f.level || '') + (f.score ? ' ' + f.score : ''))}</b></td>
    <td style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px">${f.status === 'spot' ? '<b style="color:#1E8E3E">Closed on the spot</b><br>' + esc_(f.taken || '') : '<b style="color:#C5221F">OPEN</b><br>' + esc_(f.action || '') + (f.owner ? '<br>Owner: ' + esc_(f.owner) : '')}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:720px">
    <div style="background:#C5221F;color:#fff;padding:12px 14px"><div style="font-size:12px;font-weight:700;letter-spacing:.06em">PARRON | URGENT – ${hot.length} UA / CRITICAL FINDING${hot.length > 1 ? 'S' : ''}</div><div style="font-size:18px;font-weight:700">${esc_(m.title || 'Site report')} – ${esc_(m.location || '')}</div></div>
    <p style="font-size:14px">Raised by <b>${esc_(clean_(m.name) || 'unknown')}</b> · ${esc_(d.reportId || '')}. Confirm the task has been stopped and made safe.</p>
    <table style="border-collapse:collapse;width:100%"><tr><th style="background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px">Item / finding</th><th style="background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px">Rating / risk</th><th style="background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px">Status</th></tr>${rows}</table>
    <p style="font-size:12px;color:#5B6675">The full report follows in its own email. <a href="${APP_URL}#actions">Open the action register</a></p></div>`;
  const to = [TO].concat(sup && sup !== TO.toLowerCase() ? [sup] : []).join(',');
  try { MailApp.sendEmail({ to, name: 'PARRON Site Inspections', subject: `URGENT: ${hot.length} UA / Critical finding${hot.length > 1 ? 's' : ''} – ${str_(m.location || m.title || '', 60)}`, htmlBody: html,
    body: hot.map(f => `${f.item} ${f.text} – ${f.finding}`).join('\n') }); return true; } catch (e) { return false; }
}

/* ---------- quick hazard report / positive observation ---------- */
function observation_(d) {
  const cache = CacheService.getScriptCache(); const uid = String(d.uid || d.reportId || '');
  if (uid && cache.get('sent_' + uid)) return out_({ ok: true, duplicate: true });
  const o = d.obs || {}; const m = d.meta || {}; const now = new Date(); const hazard = o.type === 'hazard';
  const imgs = (d.photos || []).slice(0, 6).map((b, i) => Utilities.newBlob(Utilities.base64Decode(b), 'image/jpeg', `${d.reportId}_${i + 1}.jpg`.replace(/[^\w.-]+/g, '_')));
  let links = [];
  try { const f = folder_('PARRON – Evidence', 'Observations'); links = imgs.map(b => f.createFile(b).getUrl()); } catch (e) { links = []; }
  MailApp.sendEmail({ to: TO, name: 'PARRON Site Inspections', subject: str_(d.subject || (hazard ? 'PARRON hazard report' : 'PARRON positive observation'), 250),
    htmlBody: String(d.html || ''), body: String(d.text || ''), attachments: imgs });
  if (uid) cache.put('sent_' + uid, '1', 21600);
  const f = (d.findings || [])[0] || {};
  book_().getSheetByName('Observations').appendRow([now, "'" + Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), "'" + Utilities.formatDate(now, TZ, 'yyyy-MM'), d.reportId || '', hazard ? 'Hazard' : 'Positive observation',
    clean_(m.name), str_(m.location, 200), str_(o.description, 2000), str_(o.category, 120), str_(o.recognised, 200), num_(f.cons) || '', num_(f.like) || '', num_(f.score) || '', str_(f.level, 20),
    str_(o.immediate, 2000), hazard ? (f.status === 'spot' ? ST.spot : ST.open) : '', str_(f.owner, 120), email_(f.ownerEmail), f.due ? "'" + str_(f.due, 10) : '', links.join('\n')]);
  if (hazard && Array.isArray(d.findings)) { logFindings_(d); alert_(d, d.findings); }
  return out_({ ok: true });
}

// one or more comma-separated project addresses; anything else falls back to the SHE Manager
function to_(v) { const ok = String(v || '').split(/[,;]/).map(e => e.trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && ALLOWED.test(e)); return ok.length ? ok.slice(0, 5).join(',') : TO; }
function logFuel_(d) {
  const f = d.fuel; const sh = book_().getSheetByName('Fuel'); const now = new Date();
  const rows = f.rows.slice(0, 40).map(r => [now, str_(f.date, 10), str_(d.reportId, 60), clean_(f.by), str_(r.id, 20), str_(r.desc, 80), str_(r.pre, 4), str_(r.basis, 10),
    r.hs === '' ? '' : str_(r.hs, 20), r.he === '' ? '' : str_(r.he, 20), r.hrs === '' ? '' : num_(r.hrs), str_(r.flow, 20), r.fuel === '' ? '' : num_(r.fuel), str_(r.cmt, 300), clean_(f.verifiedBy)]);
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, FUEL_HEAD.length).setValues(rows);
}
/* Monday: last week's fuel, hours and pre-starts for the Project Admin (weekly client report) */
function fuelWeekly_(ss, now) {
  const F = idx_(FUEL_HEAD); const d1 = new Date(now.getTime() - 864e5), d0 = new Date(now.getTime() - 7 * 864e5);
  const from = Utilities.formatDate(d0, TZ, 'yyyy-MM-dd'), to = Utilities.formatDate(d1, TZ, 'yyyy-MM-dd');
  const all = rows_(ss.getSheetByName('Fuel')).map(r => r.map((v, i) => i === F.Date ? dstr_(v) : v)).filter(r => r[F.Date] >= from && r[F.Date] <= to);
  // if a day's register was sent twice, keep the latest one
  const latest = {}; all.forEach(r => { const k = r[F.Date]; if (!latest[k] || String(r[F['Report ID']]) > latest[k]) latest[k] = String(r[F['Report ID']]); });
  const rows = all.filter(r => latest[r[F.Date]] === String(r[F['Report ID']])).sort((a, b) => String(a[F.Date]).localeCompare(String(b[F.Date])));
  const assets = {}; rows.forEach(r => { const k = (r[F['Asset ID']] ? r[F['Asset ID']] + ' ' : '') + r[F.Description];
    const a = assets[k] = assets[k] || { fuel: 0, hrs: 0, y: 0, n: 0 }; a.fuel += num_(r[F['Fuel (L)']]); a.hrs += num_(r[F.Hours]); if (r[F['Pre-start']] === 'Y') a.y++; if (r[F['Pre-start']] === 'N') a.n++; });
  const days = Object.keys(latest).sort(); const total = rows.reduce((s, r) => s + num_(r[F['Fuel (L)']]), 0);
  const missing = []; for (let t = d0.getTime(); t <= d1.getTime(); t += 864e5) { const dt = new Date(t); const k = Utilities.formatDate(dt, TZ, 'yyyy-MM-dd'); const wd = Utilities.formatDate(dt, TZ, 'u'); if (wd !== '6' && wd !== '7' && !latest[k]) missing.push(Utilities.formatDate(dt, TZ, 'EEE d MMM')); }
  const td = 'style="border:1px solid #D0D5DD;padding:5px 7px;font-size:13px"', th = 'style="background:#112B4E;color:#fff;padding:5px 7px;text-align:left;font-size:12px"';
  const tbl = (cols, list) => list.length ? `<table style="border-collapse:collapse;width:100%"><tr>${cols.map(c => `<th ${th}>${c}</th>`).join('')}</tr>${list.map(r => `<tr>${r.map(v => `<td ${td}>${esc_(String(v))}</td>`).join('')}</tr>`).join('')}</table>` : '<p style="font-size:13px">No registers received.</p>';
  const dmy = s => String(s).slice(0, 10).split('-').reverse().join('/'); const r1 = n => Math.round(n * 10) / 10;
  const range = `${Utilities.formatDate(d0, TZ, 'd MMM')} – ${Utilities.formatDate(d1, TZ, 'd MMM yyyy')}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:900px">
    <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | WEEKLY FUEL, HOURS &amp; PRE-START REGISTER</div><div style="font-size:18px;font-weight:700">${range}</div></div>
    <p style="font-size:14px"><b>Total fuel used: ${r1(total)} L</b> · ${days.length} daily register(s) received${missing.length ? ` · <span style="color:#C5221F">No register for ${esc_(missing.join(', '))}</span>` : ''}</p>
    <h3 style="color:#112B4E">Totals by asset</h3>${tbl(['Asset', 'Fuel issued (L)', 'Hours', 'Pre-starts done', 'Pre-starts NOT done'], Object.keys(assets).map(k => [k, r1(assets[k].fuel), r1(assets[k].hrs), assets[k].y, assets[k].n]))}
    <h3 style="color:#112B4E">Daily detail</h3>${tbl(['Date', 'Asset ID', 'Description', 'Pre-start', 'Hours basis', 'Hour meter start', 'Hour meter end', 'Hours', 'Flow meter', 'Fuel (L)', 'Comments', 'Recorded by'],
      rows.map(r => [dmy(r[F.Date]), r[F['Asset ID']], r[F.Description], r[F['Pre-start']], r[F['Hours basis']], r[F['Hour meter start']], r[F['Hour meter end']], r[F.Hours], r[F['Flow meter']], r[F['Fuel (L)']], r[F.Comments], r[F['Recorded by']]]))}
    <p style="font-size:12px;color:#5B6675">The signed daily registers (PDF) were emailed each day. A spreadsheet copy is attached.</p></div>`;
  const csv = [FUEL_HEAD.slice(1).join(',')].concat(rows.map(r => r.slice(1).map(v => '"' + String(v instanceof Date ? dstr_(v) : v).replace(/"/g, '""') + '"').join(','))).join('\n');
  MailApp.sendEmail({ to: FUEL_TO, cc: TO, name: 'PARRON Site Inspections', subject: `Weekly fuel, hours & pre-start register ${range} – ${r1(total)} L`, htmlBody: html, body: 'Open in an HTML email client.',
    attachments: [Utilities.newBlob(csv, 'text/csv', `Fuel_Hours_PreStart_${from}_to_${to}.csv`)] });
}
function logSent_(uid, reportId, m, via, r, link) {
  const ss = book_(); const now = new Date(); r = r || {};
  ss.getSheetByName('Sent').appendRow([now, "'" + Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), "'" + Utilities.formatDate(now, TZ, 'yyyy-MM'),
    reportId || '', uid, clean_(m.name), "'" + (m.no || ''), m.title || '', m.location || '', m.ua || 0, m.ni || 0, m.snn || 0, via,
    num_(r.c), num_(r.na), r.pct == null || r.pct === '' ? '' : num_(r.pct), r.inspDate ? "'" + str_(r.inspDate, 20) : '', str_(r.crew, 120), str_(r.supervisor, 120),
    link || '']);
  upsert_(ss, uid, m, 'sent', now);
}

function logFindings_(d) {
  const sh = book_().getSheetByName('Findings'); const m = d.meta || {}; const r = d.report || {}; const now = new Date();
  const have = new Set(rows_(sh).map(x => String(x[0])));
  const rows = d.findings.slice(0, 200).filter(f => f && f.fid && !have.has(String(f.fid))).map(f => {
    const st = f.status === 'spot' ? ST.spot : ST.open;
    const hist = [{ at: now.toISOString(), by: clean_(m.name), op: 'raised', note: st === ST.spot ? 'Closed at time of inspection: ' + str_(f.taken, 500) : '' }];
    return [str_(f.fid, 80), d.reportId || '', d.uid || '', now, r.inspDate ? "'" + str_(r.inspDate, 20) : '', clean_(m.name), "'" + (m.no || ''), m.title || '', m.location || '', str_(r.crew, 120),
      "'" + str_(f.item, 20), str_(f.text, 600), f.rating === 'UA' ? 'UA' : 'NI', str_(f.snn, 200), num_(f.cons) || '', num_(f.like) || '', num_(f.score) || '', str_(f.level, 20),
      str_(f.finding, 2000), str_(f.action, 2000), st, str_(f.owner, 120), f.due ? "'" + str_(f.due, 10) : '',
      st === ST.spot ? now : '', st === ST.spot ? clean_(m.name) : '', st === ST.spot ? str_(f.taken, 2000) : '', '', '', '', now, JSON.stringify(hist),
      st === ST.open ? email_(f.ownerEmail) : '', ''];
  });
  if (!rows.length) return;
  const H = idx_(FIND_HEAD); const first = sh.getLastRow() + 1;
  // one email per person, listing every action assigned to them from this report
  const by = {}; rows.forEach((r, i) => { const e = r[H['Owner email']]; if (e) (by[e] = by[e] || []).push(i); });
  Object.keys(by).forEach(e => { if (notifyAssigned_(e, by[e].map(i => findingOut_(rows[i])), m.name)) by[e].forEach(i => { rows[i][H.Notified] = now; }); });
  sh.getRange(first, 1, rows.length, FIND_HEAD.length).setValues(rows);
}

/* ---------- action emails ---------- */
function email_(e) { e = String(e || '').trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && ASSIGN_ALLOWED.test(e) ? e : ''; }
function actionCard_(f) {
  const lv = { Low: ['#00A651', '#fff'], Medium: ['#FFD200', '#3A2E00'], High: ['#F07D00', '#fff'], Critical: ['#E00000', '#fff'] }[f.level] || ['#7A8594', '#fff'];
  const dmy = s => s ? String(s).slice(0, 10).split('-').reverse().join('/') : 'TBC';
  return `<div style="border:1px solid #D0D5DD;border-left:6px solid ${lv[0]};border-radius:8px;padding:12px 14px;margin:12px 0">
    <div style="font-size:12px;color:#5B6675">${esc_(f.reportId)} · item ${esc_(f.item)} · ${esc_(f.location || '')}</div>
    <div style="font-size:16px;font-weight:700;margin:4px 0">${esc_(f.action || '')}</div>
    <div style="font-size:13px;margin-bottom:6px"><b>Finding:</b> ${esc_(f.finding || '')}</div>
    <span style="background:${lv[0]};color:${lv[1]};font-weight:700;border-radius:4px;padding:2px 8px;font-size:12px">${esc_((f.level || f.rating) + (f.score ? ' ' + f.score : ''))}</span>
    <span style="font-size:13px;margin-left:8px"><b>Due:</b> ${dmy(f.due)}</span>
    <div style="margin-top:12px"><a href="${APP_URL}#actions/${encodeURIComponent(f.fid)}" style="background:#EC7723;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:8px;display:inline-block">Open in PARRON to close out</a></div></div>`;
}
function mailWrap_(title, sub, inner) {
  return `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:640px">
    <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | ${esc_(sub)}</div><div style="font-size:18px;font-weight:700">${esc_(title)}</div></div>
    ${inner}<p style="font-size:12px;color:#5B6675">When the work is done, open the action in PARRON, tap <b>Close out action</b>, describe what was done and add a photo. The SHE Manager then verifies it.<br>Questions? Reply to this email.</p></div>`;
}
function notifyAssigned_(to, list, raisedBy) {
  if (!to || !list.length) return false;
  try {
    MailApp.sendEmail({ to, replyTo: TO, name: 'PARRON Site Inspections',
      subject: `Action assigned to you – ${list.length > 1 ? list.length + ' actions' : (list[0].level || list[0].rating) + ' – ' + str_(list[0].action, 60)}`,
      htmlBody: mailWrap_(`${list.length} corrective action${list.length > 1 ? 's' : ''} assigned to you`, 'ACTION ASSIGNED',
        `<p style="font-size:14px">${esc_(clean_(raisedBy) || 'An inspector')} has assigned you the following from a site inspection on ${esc_(CONFIG_PROJECT)}.</p>${list.map(actionCard_).join('')}`),
      body: list.map(f => `${f.action} – due ${f.due || 'TBC'} – ${APP_URL}#actions/${encodeURIComponent(f.fid)}`).join('\n') });
    return true;
  } catch (e) { return false; }
}
const CONFIG_PROJECT = 'the YMT project';

/* Close-out (anyone on the project, with their name) / verify, re-open, edit (Manager PIN). */
function finding_(d) {
  const op = String(d.op || ''); const by = clean_(d.by);
  if (!by) return out_({ ok: false, error: 'Your name is needed' });
  if (op !== 'close' && !pinOK_(d.pin)) return out_({ ok: false, error: 'Manager PIN needed' });
  const sh = book_().getSheetByName('Findings'); const H = idx_(FIND_HEAD);
  const ids = rows_(sh).map(x => String(x[0])); const i = ids.indexOf(String(d.fid));
  if (i < 0) return out_({ ok: false, error: 'Finding not found – it may not have reached the log yet' });
  const row = i + 2; const v = sh.getRange(row, 1, 1, FIND_HEAD.length).getValues()[0]; const now = new Date();
  const hist = (() => { try { return JSON.parse(v[H.History] || '[]'); } catch (e) { return []; } })();
  const set = (k, val) => { v[H[k]] = val; };
  if (op === 'close') {
    if (v[H.Status] === ST.verified) return out_({ ok: false, error: 'Already verified' });
    let link = '';
    if (d.photo) { try { link = folder_('PARRON – Evidence').createFile(Utilities.newBlob(Utilities.base64Decode(d.photo), 'image/jpeg', `${v[0]}_closeout.jpg`.replace(/[^\w.-]+/g, '_'))).getUrl(); } catch (e) { link = ''; } }
    set('Status', ST.closed); set('Closed at', now); set('Closed by', by); set('Close-out note', str_(d.note, 2000)); if (link) set('Evidence link', link);
    try { MailApp.sendEmail({ to: TO, name: 'PARRON Site Inspections', subject: `Action closed out – please verify – ${str_(v[H['Corrective action']], 70)}`,
      htmlBody: mailWrap_('Action closed out – ready to verify', 'CLOSE-OUT', `<p style="font-size:14px"><b>${esc_(by)}</b> closed out this action:</p><p style="font-size:14px;background:#F2F4F7;padding:10px">${esc_(d.note || '')}</p>${link ? `<p><a href="${link}">View evidence photo</a></p>` : ''}${actionCard_(findingOut_(v)).replace('Open in PARRON to close out', 'Open in PARRON to verify')}`),
      body: `${by} closed out: ${v[H['Corrective action']]}\n${d.note || ''}` }); } catch (e) {}
  } else if (op === 'verify') {
    if (v[H.Status] !== ST.closed && v[H.Status] !== ST.spot) return out_({ ok: false, error: 'Close the action before verifying it' });
    set('Status', ST.verified); set('Verified at', now); set('Verified by', by);
  } else if (op === 'reopen') {
    set('Status', ST.open); set('Verified at', ''); set('Verified by', ''); set('Closed at', ''); set('Closed by', '');
  } else if (op === 'edit') {
    if (d.owner != null) set('Owner', str_(d.owner, 120));
    if (d.due != null) set('Due', d.due ? "'" + str_(d.due, 10) : '');
    if (d.ownerEmail != null) { const e = email_(d.ownerEmail); set('Owner email', e); if (e && notifyAssigned_(e, [findingOut_(v)], by)) set('Notified', now); }
  } else return out_({ ok: false, error: 'Unknown change' });
  set('Updated', now);
  hist.push({ at: now.toISOString(), by, op, note: str_(d.note || (op === 'edit' ? [d.owner != null ? 'Owner: ' + d.owner : '', d.due != null ? 'Due: ' + d.due : ''].filter(Boolean).join(', ') : ''), 500) });
  set('History', JSON.stringify(hist).slice(0, 45000));
  ['No', 'Item', 'Inspection date', 'Due'].forEach(k => { const x = v[H[k]]; if (x !== '' && x != null) v[H[k]] = "'" + dstr_(x).replace(/^'/, ''); });   // keep "01", "1.1" and dates as text
  sh.getRange(row, 1, 1, FIND_HEAD.length).setValues([v]);
  return out_({ ok: true, finding: findingOut_(v) });
}

function status_(d) {
  const m = d.meta || {};
  if (d.state === 'sent') { logSent_(d.uid, d.reportId, m, 'Other (manual)', d.report || {}, ''); if (Array.isArray(d.findings)) logFindings_(d); return; }
  upsert_(book_(), d.uid, m, d.state || 'draft', null);
}

function upsert_(ss, uid, m, state, sentAt) {
  if (!uid) return;
  const sh = ss.getSheetByName('Status'); const n = sh.getLastRow();
  const ids = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(r => String(r[0])) : [];
  const i = ids.indexOf(String(uid)); const now = new Date();
  if (i >= 0) {
    const row = i + 2; const cur = sh.getRange(row, 8).getValue();
    if (cur === 'sent' && state !== 'sent') return;          // never re-open a sent inspection
    if (m.name) sh.getRange(row, 2).setValue(clean_(m.name));
    if (m.location) sh.getRange(row, 5).setValue(m.location);
    sh.getRange(row, 7, 1, 3).setValues([[now, state, sentAt || '']]);
  } else {
    sh.appendRow([uid, clean_(m.name), "'" + (m.no || ''), m.title || '', m.location || '', m.started ? new Date(m.started) : now, now, state, sentAt || '']);
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (['weather', 'dashboard', 'reports', 'photo', 'getStatus', 'getHistory', 'alerts', 'alertFile', 'forms'].includes(p.action) && p.key === KEY && !codeOK_(p.code)) return out_({ ok: false, error: 'Site code required', needCode: true });
  if (p.action === 'weather') { if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' }); return out_({ ok: true, fdr: fdrFetch_(false) }); }
  if (p.action === 'getStatus') { if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' }); return out_(Object.assign({ ok: true }, statusOut_())); }
  if (p.action === 'getHistory') { if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' }); return out_(history_(false)); }
  if (p.action === 'alerts') { if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' }); return out_(Object.assign({ ok: true }, alertsOut_())); }
  if (p.action === 'forms') { if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' }); return out_({ ok: true, forms: formsOut_() }); }
  if (p.action === 'alertFile') { if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' }); return alertFile_(p.id); }
  if (p.action === 'reports') { if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' }); return out_({ ok: true, reports: reports_() }); }
  if (p.action === 'photo') { if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' }); return photo_(p.id); }
  if (p.action !== 'dashboard') return out_({ ok: true, service: 'PARRON relay', v: 3, emailsLeftToday: MailApp.getRemainingDailyQuota() });
  if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' });
  const ss = book_(); const month = /^\d{4}-\d\d$/.test(p.month || '') ? p.month : Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  const S = idx_(SENT_HEAD); const mk = v => Utilities.formatDate(new Date(v), TZ, 'yyyy-MM');
  const allSent = rows_(ss.getSheetByName('Sent')).filter(r => r[0]);
  const sentOut = r => ({ sentAt: iso_(r[0]), reportId: r[3], uid: r[4], name: r[5], no: no_(r[6]), title: r[7], location: r[8], ua: r[9], ni: r[10], snn: r[11], via: r[12],
    c: r[S.C], na: r[S.NA], pct: r[S['Compliance %']], inspDate: dstr_(r[S['Inspection date']]), crew: r[S.Crew], supervisor: r[S.Supervisor], pdf: r[S['PDF link']] });
  const sent = allSent.filter(r => mk(r[0]) === month).map(sentOut);
  const open = rows_(ss.getSheetByName('Status')).filter(r => r[7] === 'draft' || r[7] === 'outbox').map(r => ({
    name: r[1], no: no_(r[2]), title: r[3], location: r[4], started: iso_(r[5]), updated: iso_(r[6]), state: r[7] }));
  // 6-month trend, built from the log so every phone sees the same numbers
  const months = []; const base = new Date(+month.slice(0, 4), +month.slice(5, 7) - 1, 1);
  for (let i = 5; i >= 0; i--) months.push(Utilities.formatDate(new Date(base.getFullYear(), base.getMonth() - i, 1), TZ, 'yyyy-MM'));
  const trend = months.map(k => { const L = allSent.filter(r => mk(r[0]) === k); const pc = L.map(r => r[S['Compliance %']]).filter(x => x !== '' && x != null);
    return { month: k, inspections: L.length, ua: sum_(L, 9), ni: sum_(L, 10), snn: sum_(L, 11), avgPct: pc.length ? Math.round(pc.reduce((a, b) => a + Number(b), 0) / pc.length) : null }; });
  const findings = rows_(ss.getSheetByName('Findings')).filter(r => r[0]).slice(-2500).map(findingOut_);
  const O = idx_(OBS_HEAD); const since = Date.now() - 40 * 864e5;
  const obs = rows_(ss.getSheetByName('Observations')).filter(r => r[0] && (mk(r[0]) === month || new Date(r[0]).getTime() >= since)).map(r => ({ at: iso_(r[0]), reportId: r[O['Report ID']],
    type: r[O.Type] === 'Hazard' ? 'hazard' : 'positive', name: r[O.Name], location: r[O.Location], description: r[O.Description], category: r[O.Category], level: r[O['Risk level']] }));
  const recent = allSent.filter(r => new Date(r[0]).getTime() >= since).map(r => ({ sentAt: iso_(r[0]), name: r[5], no: no_(r[6]) }));
  return out_({ ok: true, v: 3, month, sent, open, trend, findings, obs, recent, generated: new Date().toISOString() });
}

function findingOut_(r) {
  const H = idx_(FIND_HEAD); const g = k => r[H[k]];
  return { fid: g('FID'), reportId: g('Report ID'), uid: g('UID'), raised: iso_(g('Raised')), inspDate: dstr_(g('Inspection date')), by: g('Raised by'), no: no_(g('No')),
    title: g('Inspection'), location: g('Location'), crew: g('Crew'), item: String(g('Item') || ''), text: g('Item text'), rating: g('Rating'), snn: g('SNN'),
    cons: g('Consequence'), like: g('Likelihood'), score: g('Risk score'), level: g('Risk level'), finding: g('Finding'), action: g('Corrective action'),
    status: g('Status'), owner: g('Owner'), due: dstr_(g('Due')), closedAt: iso_(g('Closed at')), closedBy: g('Closed by'), note: g('Close-out note'),
    evidence: g('Evidence link'), verifiedAt: iso_(g('Verified at')), verifiedBy: g('Verified by'), updated: iso_(g('Updated')),
    ownerEmail: g('Owner email') || '', notified: iso_(g('Notified')),
    history: (() => { try { return JSON.parse(g('History') || '[]'); } catch (e) { return []; } })() };
}

/* ---------- 6 pm daily summary ---------- */
function dailyDigest() {
  const ss = book_(); const now = new Date(); const today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const day = r => Utilities.formatDate(new Date(r), TZ, 'yyyy-MM-dd');
  const open = rows_(ss.getSheetByName('Status')).filter(r => r[7] === 'draft' || r[7] === 'outbox');
  const openToday = open.filter(r => day(r[5]) === today), openOlder = open.filter(r => day(r[5]) !== today);
  const allSent = rows_(ss.getSheetByName('Sent')).filter(r => r[0]);
  const sentToday = allSent.filter(r => day(r[0]) === today);
  const F = rows_(ss.getSheetByName('Findings')).filter(r => r[0]).map(findingOut_);
  const overdue = F.filter(f => f.status === ST.open && f.due && f.due < today).sort((a, b) => a.due.localeCompare(b.due));
  const toVerify = F.filter(f => f.status === ST.closed);
  const td = 'style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px"', th = 'style="background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const t = (rows, cols) => rows.length ? `<table style="border-collapse:collapse;width:100%"><tr>${cols.map(c => `<th ${th}>${c}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(v => `<td ${td}>${esc_(v)}</td>`).join('')}</tr>`).join('')}</table>` : '<p style="font-size:13px">None.</p>';
  const fmt = v => Utilities.formatDate(new Date(v), TZ, 'dd/MM HH:mm');
  const st = s => s === 'outbox' ? 'Finished – waiting for signal' : 'Started – not sent';
  const dmy = s => s ? s.split('-').reverse().join('/') : '';
  const SS = statusDigest_(today); const AD = alertsDigest_(today);
  const byName = {}; sentToday.forEach(r => { byName[r[5]] = (byName[r[5]] || []).concat(`${no_(r[6])} ${r[7]}`); });
  const tile = (n, l, c) => `<td style="padding:10px;text-align:center;border:1px solid #D0D5DD"><div style="font-size:22px;font-weight:700;color:${c}">${n}</div><div style="font-size:11px;color:#5B6675">${l}</div></td>`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:820px">
    <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | DAILY SUMMARY</div><div style="font-size:18px;font-weight:700">${Utilities.formatDate(now, TZ, 'EEEE d MMMM yyyy')}</div></div>
    <div style="border:1px solid #D0D5DD;border-left:4px solid #EC7723;padding:8px 12px;margin:12px 0;font-size:13px"><b>Today on site – fire status:</b> ${SS.L.length ? SS.line.map(esc_).join(' &nbsp;|&nbsp; ') : '<b style="color:#C62828">No status set today</b>'}${SS.L.length && SS.noMidday ? '<br><b style="color:#C62828">⚠ No midday re-check recorded</b>' : ''}</div>
    <table style="border-collapse:collapse;width:100%;margin:12px 0"><tr>${tile(sentToday.length, 'Sent today', '#2E7D32')}${tile(open.length, 'Not sent', '#C62828')}${tile(overdue.length, 'Actions overdue', '#C62828')}${tile(toVerify.length, 'Awaiting verification', '#E39A00')}</tr></table>
    ${AD.rows.length ? `<h3 style="color:#C62828">SHEQ Alerts – not yet acknowledged</h3>${t(AD.rows.map(a => [a.id + ' – ' + a.title, a.priority, a.acked + ' of ' + a.expected, a.waiting.join(', ') || '–']), ['Alert', 'Priority', 'Acknowledged', 'Waiting on'])}` : ''}
    <h3 style="color:#C62828">Not sent – started today (${openToday.length})</h3>${t(openToday.map(r => [r[1], `${no_(r[2])} ${r[3]}`, r[4], fmt(r[5]), st(r[7])]), ['Name', 'Inspection', 'Location', 'Started', 'Status'])}
    <h3 style="color:#C62828">Still not sent – from earlier days (${openOlder.length})</h3>${t(openOlder.map(r => [r[1], `${no_(r[2])} ${r[3]}`, r[4], fmt(r[5]), st(r[7])]), ['Name', 'Inspection', 'Location', 'Started', 'Status'])}
    <h3 style="color:#C62828">Corrective actions overdue (${overdue.length})</h3>${t(overdue.map(f => [f.reportId + ' / ' + f.item, f.level || f.rating, f.action, f.owner || 'TBC', dmy(f.due)]), ['Finding', 'Risk', 'Corrective action', 'Owner', 'Due'])}
    <h3 style="color:#2E7D32">Sent today (${sentToday.length})</h3>${t(Object.keys(byName).sort().map(k => [k, byName[k].length, byName[k].join(', ')]), ['Name', 'Count', 'Inspections'])}
    <p style="font-size:12px;color:#5B6675">Full log: <a href="${ss.getUrl()}">PARRON – Inspection Log</a></p></div>`;
  // reminders to each person with overdue actions (or actions due tomorrow)
  const tomorrow = Utilities.formatDate(new Date(now.getTime() + 864e5), TZ, 'yyyy-MM-dd'); const rem = {};
  F.filter(f => f.status === ST.open && f.ownerEmail && f.due && f.due <= tomorrow).forEach(f => { (rem[f.ownerEmail] = rem[f.ownerEmail] || []).push(f); });
  Object.keys(rem).forEach(e => { const L = rem[e].sort((a, b) => a.due.localeCompare(b.due)); const late = L.filter(f => f.due < today).length;
    try { MailApp.sendEmail({ to: e, replyTo: TO, name: 'PARRON Site Inspections', subject: late ? `Reminder: ${late} PARRON action${late > 1 ? 's' : ''} overdue` : `Reminder: PARRON action due tomorrow`,
      htmlBody: mailWrap_(late ? `${late} action${late > 1 ? 's are' : ' is'} overdue` : 'Action due tomorrow', 'REMINDER', L.map(actionCard_).join('')),
      body: L.map(f => `${f.action} – due ${f.due} – ${APP_URL}#actions/${encodeURIComponent(f.fid)}`).join('\n') }); } catch (err) {} });
  MailApp.sendEmail({ to: TO, subject: `PARRON daily summary ${Utilities.formatDate(now, TZ, 'dd/MM/yyyy')} – ${open.length} not sent, ${sentToday.length} sent, ${overdue.length} actions overdue`, htmlBody: html, body: 'Open in an HTML email client.', name: 'PARRON Site Inspections' });
}

/* ---------- personal repeating reminders (only the person's own email; created from My Day) ---------- */
function reminder_(d) {
  const sh = book_().getSheetByName('Reminders'); const H = idx_(REM_HEAD); const id = str_(d.id, 60);
  if (!/^[\w-]{6,60}$/.test(id)) return out_({ ok: false, error: 'Bad reminder' });
  const rows = rows_(sh); const i = rows.findIndex(r => String(r[0]) === id);
  if (d.op === 'delete') { if (i >= 0) sh.getRange(i + 2, H.Active + 1).setValue('No'); return out_({ ok: true }); }
  const email = email_(d.email); if (!email) return out_({ ok: false, error: 'Reminder emails need a @genus.com.au address – set your name in Settings' });
  const rule = d.rule || {}; const repeat = JSON.stringify({ type: str_(rule.type, 12), dow: num_(rule.dow), dom: num_(rule.dom) });
  const row = [id, clean_(d.name), email, str_(d.text, 300), repeat, str_(d.time, 5), i >= 0 ? rows[i][H.Created] : new Date(), i >= 0 ? rows[i][H['Last sent']] : '', 'Yes'];
  if (i >= 0) sh.getRange(i + 2, 1, 1, REM_HEAD.length).setValues([row]); else sh.appendRow(row);
  return out_({ ok: true });
}
function occurs_(rule, d) {
  const dow = Number(Utilities.formatDate(d, TZ, 'u')) % 7, dom = Number(Utilities.formatDate(d, TZ, 'd'));
  const last = new Date(Date.UTC(Number(Utilities.formatDate(d, TZ, 'yyyy')), Number(Utilities.formatDate(d, TZ, 'MM')), 0)).getUTCDate();
  if (rule.type === 'daily') return true;
  if (rule.type === 'weekdays') return dow >= 1 && dow <= 5;
  if (rule.type === 'weekly') return dow === Number(rule.dow);
  if (rule.type === 'monthly') return dom === Math.min(Number(rule.dom) || 1, last);
  return false;
}
function remindersRun() {
  const sh = book_().getSheetByName('Reminders'); const H = idx_(REM_HEAD); const now = new Date(); const today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  rows_(sh).forEach((r, i) => {
    if (r[H.Active] !== 'Yes' || !r[H.Email]) return;
    let rule = {}; try { rule = JSON.parse(r[H.Repeat] || '{}'); } catch (e) { return; }
    if (!occurs_(rule, now) || dstr_(r[H['Last sent']]).slice(0, 10) === today) return;
    try {
      MailApp.sendEmail({ to: r[H.Email], name: 'PARRON Site Inspections', subject: `Reminder: ${str_(r[H.Reminder], 120)}`,
        htmlBody: `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:560px"><div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | REMINDER${r[H.Time] ? ' – ' + esc_(r[H.Time]) : ''}</div><div style="font-size:18px;font-weight:700">${esc_(r[H.Reminder])}</div></div>
          <p style="font-size:13px;color:#5B6675">Your repeating reminder from My Day. <a href="${APP_URL}#myday">Open My Day</a> to tick it off or change it.</p></div>`,
        body: `Reminder: ${r[H.Reminder]}\n${APP_URL}#myday` });
      sh.getRange(i + 2, H['Last sent'] + 1).setValue("'" + today);
    } catch (e) {}
  });
  try { plannerDigest_(now); } catch (e) { console.error(e); }
}

/* ---------- Fire Danger Rating (Bureau of Meteorology, fire-district areas) ---------- */
function fdrFetch_(fresh) {
  const c = CacheService.getScriptCache(); const P = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  let manual = null; try { manual = JSON.parse(P.getProperty('FDR_MANUAL') || 'null'); } catch (e) {}
  let res = null; if (!fresh) { try { res = JSON.parse(c.get('fdr') || 'null'); } catch (e) {} }
  if (!res) {
    res = { areas: [], today: '', tomorrow: '', area: '', issued: '', source: '' };
    const want = P.getProperty('FDR_AREA'); const urls = (P.getProperty('FDR_URL') ? [P.getProperty('FDR_URL')] : []).concat(...FDR_PRODUCTS.map(id => [`https://reg.bom.gov.au/fwo/${id}.xml`, `http://www.bom.gov.au/fwo/${id}.xml`]));
    for (const u of urls) {
      let xml = ''; try { const r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'Mozilla/5.0 (PARRON site safety app)' } }); if (r.getResponseCode() !== 200) continue; xml = r.getContentText(); } catch (e) { continue; }
      const areas = []; const re = /<area\b([^>]*)>([\s\S]*?)<\/area>/g; let m;
      while ((m = re.exec(xml))) {
        if (!/type="fire-district"/.test(m[1])) continue;
        const name = (m[1].match(/description="([^"]+)"/) || [])[1] || ''; const per = {};
        (m[2].match(/<forecast-period\b[^>]*index="(\d+)"[^>]*>[\s\S]*?<\/forecast-period>/g) || []).forEach(fp => {
          const ix = (fp.match(/index="(\d+)"/) || [])[1]; const r2 = (fp.match(/<text type="fire_danger">([^<]+)<\/text>/) || [])[1]; if (r2) per[ix] = r2.trim(); });
        areas.push({ name, today: per['0'] || '', tomorrow: per['1'] || '' });
      }
      if (!areas.length) continue;
      const pick = areas.find(a => want && a.name === want) || areas.find(a => FDR_DEFAULT_AREA.test(a.name)) || areas[0];
      res = { areas: areas.map(a => a.name), today: pick.today, tomorrow: pick.tomorrow, area: pick.name, issued: (xml.match(/<issue-time-local[^>]*>([^<]+)</) || [])[1] || '', source: 'Bureau of Meteorology' };
      break;
    }
    try { c.put('fdr', JSON.stringify(res), 1800); } catch (e) {}
  }
  res = Object.assign({}, res, { want: P.getProperty('FDR_AREA') || '' });
  if (manual && manual.date === today && manual.rating) return Object.assign({}, res, { today: manual.rating, source: 'Set by ' + (manual.by || 'SHE Manager'), manual: true });
  return res;
}
/* Manager PIN: set today's FDR by hand, or choose the BoM district */
function fdrSet_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Manager PIN needed' });
  const P = PropertiesService.getScriptProperties();
  if (d.area != null) { P.setProperty('FDR_AREA', str_(d.area, 120)); CacheService.getScriptCache().put('fdr', '', 1); }
  if (d.rating != null) P.setProperty('FDR_MANUAL', JSON.stringify({ date: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), rating: str_(d.rating, 20), by: clean_(d.by) }));
  return out_({ ok: true, fdr: fdrFetch_(true) });
}

/* ---------- Monday weekly summary (SHE Manager only – forward as needed) ---------- */
function weeklyDigest() {
  const ss = book_(); const now = new Date(); const d0 = new Date(now.getTime() - 7 * 864e5);
  const inWeek = v => { const t = new Date(v).getTime(); return t >= d0.getTime() && t <= now.getTime(); };
  const S = idx_(SENT_HEAD); const O = idx_(OBS_HEAD);
  const sent = rows_(ss.getSheetByName('Sent')).filter(r => r[0] && inWeek(r[0]));
  const obs = rows_(ss.getSheetByName('Observations')).filter(r => r[0] && inWeek(r[0]));
  const F = rows_(ss.getSheetByName('Findings')).filter(r => r[0]).map(findingOut_);
  const today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const raised = F.filter(f => inWeek(f.raised)); const open = F.filter(f => f.status === ST.open);
  const overdue = open.filter(f => f.due && f.due < today); const crit = open.filter(f => f.level === 'Critical' || f.level === 'High');
  const pcs = sent.map(r => r[S['Compliance %']]).filter(x => x !== '' && x != null).map(Number); const avg = pcs.length ? Math.round(pcs.reduce((a, b) => a + b, 0) / pcs.length) : null;
  const people = {};
  sent.forEach(r => { const k = clean_(r[5]) || '(no name)'; (people[k] = people[k] || { n: 0, obs: 0 }).n++; });
  obs.forEach(r => { const k = clean_(r[O.Name]) || '(no name)'; (people[k] = people[k] || { n: 0, obs: 0 }).obs++; });
  const closedWk = F.filter(f => f.closedAt && inWeek(f.closedAt)).length;
  const rep = {}; F.filter(f => new Date(f.raised).getTime() >= now.getTime() - 90 * 864e5).forEach(f => { rep[f.item] = rep[f.item] || { n: 0, text: f.text }; rep[f.item].n++; });
  const repeat = Object.entries(rep).filter(([, o]) => o.n > 1).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
  const td = 'style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px"', th = 'style="background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const t = (rows, cols) => rows.length ? `<table style="border-collapse:collapse;width:100%"><tr>${cols.map(c => `<th ${th}>${c}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(v => `<td ${td}>${v}</td>`).join('')}</tr>`).join('')}</table>` : '<p style="font-size:13px">None.</p>';
  const tile = (n, l, c) => `<td style="padding:10px;text-align:center;border:1px solid #D0D5DD"><div style="font-size:22px;font-weight:700;color:${c}">${n}</div><div style="font-size:11px;color:#5B6675">${l}</div></td>`;
  const dmy = s => s ? String(s).slice(0, 10).split('-').reverse().join('/') : '';
  const range = `${Utilities.formatDate(d0, TZ, 'd MMM')} – ${Utilities.formatDate(new Date(now.getTime() - 864e5), TZ, 'd MMM yyyy')}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:820px">
    <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | WEEKLY SUMMARY</div><div style="font-size:18px;font-weight:700">${range}</div></div>
    <table style="border-collapse:collapse;width:100%;margin:12px 0"><tr>${tile(sent.length, 'Inspections', '#112B4E')}${tile(avg == null ? '–' : avg + '%', 'Avg compliance', '#1E8E3E')}${tile(raised.length, 'Findings raised', '#C5221F')}${tile(obs.filter(r => r[O.Type] === 'Hazard').length, 'Hazard reports', '#E8660D')}${tile(obs.filter(r => r[O.Type] !== 'Hazard').length, 'Positive obs', '#1E8E3E')}</tr>
    <tr>${tile(open.length, 'Open actions', '#C98A00')}${tile(overdue.length, 'Overdue', '#C5221F')}${tile(crit.length, 'Open High / Critical', '#C5221F')}${tile(F.filter(f => f.status === ST.closed).length, 'To verify', '#E39A00')}${tile(closedWk, 'Closed this week', '#1E8E3E')}</tr></table>
    <h3 style="color:#112B4E">Activity by person</h3>${t(Object.keys(people).sort((a, b) => people[b].n - people[a].n || a.localeCompare(b)).map(k => [esc_(k), people[k].n, people[k].obs]), ['Name', 'Inspections', 'Hazard / positive reports'])}
    <h3 style="color:#C5221F">Open High / Critical actions (${crit.length})</h3>${t(crit.slice(0, 20).map(f => [esc_(f.reportId + ' / ' + f.item), esc_(f.level + ' ' + f.score), esc_(f.action), esc_(f.owner || 'TBC'), dmy(f.due)]), ['Finding', 'Risk', 'Corrective action', 'Owner', 'Due'])}
    <h3 style="color:#C5221F">Overdue actions (${overdue.length})</h3>${t(overdue.slice(0, 20).map(f => [esc_(f.reportId + ' / ' + f.item), esc_(f.level || f.rating), esc_(f.action), esc_(f.owner || 'TBC'), dmy(f.due)]), ['Finding', 'Risk', 'Corrective action', 'Owner', 'Due'])}
    ${(() => { const W = alertsDigest_(today, true); return W.rows.length ? `<h3 style="color:#112B4E">SHEQ Alerts – acknowledgement</h3>${t(W.rows.map(a => [esc_(a.id + ' – ' + a.title), esc_(a.priority), a.acked + ' of ' + a.expected + (a.expected ? ' (' + Math.round(100 * a.acked / a.expected) + '%)' : ''), esc_(a.waiting.join(', ') || '–')]), ['Alert', 'Priority', 'Acknowledged', 'Waiting on'])}` : ''; })()}
    <h3 style="color:#112B4E">Repeat findings – last 90 days</h3>${t(repeat.map(([k, o]) => [esc_(k), esc_(o.text), o.n]), ['Item', 'Requirement', 'Times'])}
    <p style="font-size:12px;color:#5B6675">Open PARRON Insights for charts and the Monthly HSE summary: <a href="${APP_URL}#insights">${APP_URL}</a></p></div>`;
  MailApp.sendEmail({ to: TO, name: 'PARRON Site Inspections', subject: `PARRON weekly summary ${range} – ${sent.length} inspections, ${overdue.length} actions overdue`, htmlBody: html, body: 'Open in an HTML email client.' });
  try { fuelWeekly_(ss, now); } catch (e) { console.error(e); }
}

/* ---------- helpers ---------- */
/* ---------- Today on site: FDR / Total Fire Ban / Harvest & Vehicle Movement Ban (BFMP §10.1–10.4) ---------- */
function statusPinOK_(pin) {
  const P = PropertiesService.getScriptProperties(); const real = P.getProperty('STATUS_PIN'); if (!real) return false;
  const c = CacheService.getScriptCache(); const fails = Number(c.get('spin_fail') || 0); if (fails >= 10) return false;
  if (String(pin || '') === String(real)) { c.remove('spin_fail'); return true; }
  c.put('spin_fail', String(fails + 1), 900); return false;
}
function statusRow_(r) { return { at: iso_(r[0]), date: dstr_(r[1]), fdr: r[2], tfb: r[3], hvmb: r[4], by: r[5], type: r[6], note: r[7] }; }
function statusOut_() {
  const rows = rows_(book_().getSheetByName('Site Status')).filter(r => r[0]); const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const all = rows.map(statusRow_);
  return { status: all.length ? all[all.length - 1] : null, today: all.filter(x => x.date === today) };
}
function setStatus_(d) {
  if (!PropertiesService.getScriptProperties().getProperty('STATUS_PIN')) return out_({ ok: false, error: 'Status PIN not set up – add STATUS_PIN in the relay Script properties' });
  if (!statusPinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect status PIN', badPin: true });
  const fdr = FDR_LEVELS.find(x => x.toLowerCase() === String(d.fdr || '').toLowerCase());
  const yn = v => /^y/i.test(String(v || '')) ? 'Yes' : /^n/i.test(String(v || '')) ? 'No' : '';
  const type = ['Morning', 'Midday', 'Change'].find(x => x.toLowerCase() === String(d.type || '').toLowerCase());
  if (!fdr || !yn(d.tfb) || !yn(d.hvmb) || !type || !clean_(d.by)) return out_({ ok: false, error: 'Status incomplete' });
  const now = new Date();
  book_().getSheetByName('Site Status').appendRow([now, "'" + Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), fdr, yn(d.tfb), yn(d.hvmb), clean_(d.by), type, str_(d.note, 300)]);
  return out_(Object.assign({ ok: true }, statusOut_()));
}
/* status history for the 6 pm summary */
function statusDigest_(today) {
  const L = rows_(book_().getSheetByName('Site Status')).filter(r => r[0]).map(statusRow_).filter(x => x.date === today);
  const line = L.map(x => `${Utilities.formatDate(new Date(x.at), TZ, 'HH:mm')} ${x.type}: ${x.fdr} · TFB ${x.tfb} · HVMB ${x.hvmb} – ${x.by}`);
  return { L, line, noMidday: !L.some(x => x.type === 'Midday') };
}

/* ---------- This day in history (pre-start) – Wikipedia "On this day", prepared 4–5 am Perth ---------- */
const HIST_AU = /\b(Australia|Australian|Australians|Western Australia|Perth|Fremantle|Sydney|Melbourne|Brisbane|Adelaide|Hobart|Darwin|Canberra|Queensland|Tasmania|New South Wales|Kalgoorlie|Geraldton|Broome|Pilbara|Kimberley)\b/i;
const HIST_SCI = /(scien|engineer|technolog|space|NASA|satellite|rocket|spacecraft|astronaut|computer|internet|telescope|invent|patent|discover|expedition|explor|aviat|aircraft|airline|flight|railway|bridge|tunnel|electric|power station|radio|television|telephone|Olympic|World Cup|cricket|football|rugby|championship|Grand Prix|tennis|record|mountain|summit|Antarctic)/i;
function histOK_(t) { const s = String(t || '').toLowerCase(); return s.length > 20 && !HISTORY_EXCLUDE.some(w => s.includes(w)); }
function histFact_(e, born) {
  const p = (e.pages || [])[0] || {}; const link = (p.content_urls && p.content_urls.desktop && p.content_urls.desktop.page) || ('https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(String(e.text || '').slice(0, 80)));
  let text = String(e.text || '').replace(/\s+/g, ' ').trim(); if (born) text = 'Born: ' + text.replace(/\.$/, '') + '.';
  if (text.length > 300) { const cut = text.slice(0, 300); const i = cut.lastIndexOf('. '); text = (i > 80 ? cut.slice(0, i + 1) : cut.replace(/\s+\S*$/, '') + '…'); }
  return { year: Number(e.year) || '', text, link, au: HIST_AU.test(text), sci: HIST_SCI.test(text) };
}
/* three pre-start friendly facts: one Australian/WA, one science/engineering/exploration/sport, one general – spread across centuries */
function pickHistory_(events, births) {
  const ev = (events || []).filter(e => histOK_(e.text)).map(e => histFact_(e, false));
  const bo = (births || []).filter(e => histOK_(e.text)).map(e => histFact_(e, true));
  const out = []; const used = new Set(); const cent = f => Math.floor((Number(f.year) || 0) / 100);
  const take = f => { if (f && !used.has(f.text)) { out.push(f); used.add(f.text); return true; } return false; };
  const pick = (list, test) => { const L = list.filter(f => !used.has(f.text) && test(f)); return L.find(f => !out.some(o => cent(o) === cent(f))) || L[0]; };
  take(pick(ev, f => f.au)); take(pick(ev, f => f.sci && !f.au)); take(pick(ev, f => !f.au && !f.sci));
  while (out.length < 3) { const f = pick(ev, () => true) || pick(bo, () => true); if (!f || !take(f)) break; }
  const pool = ev.concat(bo).filter(f => !used.has(f.text)).slice(0, 25);
  return { facts: out.slice(0, 3), pool };
}
function histFetch_(kind, mm, dd) {
  const r = UrlFetchApp.fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/${kind}/${mm}/${dd}`, { muteHttpExceptions: true, headers: { 'Api-User-Agent': 'PARRON-YMT site safety app' } });
  if (r.getResponseCode() !== 200) return [];
  try { return JSON.parse(r.getContentText())[kind] || []; } catch (e) { return []; }
}
function history_(fresh) {
  const now = new Date(); const date = Utilities.formatDate(now, TZ, 'yyyy-MM-dd'); const sh = book_().getSheetByName('This Day');
  const rows = rows_(sh); const i = rows.findIndex(r => dstr_(r[0]) === date);
  if (i >= 0 && !fresh) { try { const j = JSON.parse(rows[i][11]); return { ok: true, date, facts: j.facts, pool: j.pool || [], prepared: iso_(rows[i][1]) }; } catch (e) {} }
  const mm = Utilities.formatDate(now, TZ, 'MM'), dd = Utilities.formatDate(now, TZ, 'dd');
  const ev = histFetch_('events', mm, dd); const bo = ev.filter(e => histOK_(e.text)).length >= 3 ? [] : histFetch_('births', mm, dd);
  const pk = pickHistory_(ev, bo); if (!pk.facts.length) return { ok: false, error: 'Wikipedia feed unavailable' };
  const F = k => pk.facts[k] || {}; const row = ["'" + date, now];
  for (let k = 0; k < 3; k++) row.push(F(k).year || '', F(k).text || '', F(k).link || '');
  row.push(JSON.stringify({ facts: pk.facts, pool: pk.pool }));
  if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
  return { ok: true, date, facts: pk.facts, pool: pk.pool, prepared: now.toISOString() };
}
/* time-driven, 4–5 am Perth: get today's facts ready for the 6 am pre-start (and email them if HISTORY_EMAIL is set) */
function prepareHistory() {
  const h = history_(true); const to = PropertiesService.getScriptProperties().getProperty('HISTORY_EMAIL');
  if (!h.ok || !to) return h;
  const date = Utilities.formatDate(new Date(), TZ, 'EEEE d MMMM yyyy');
  MailApp.sendEmail({ to, name: 'PARRON Site Inspections', subject: `Pre-start – This day in history ${Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy')}`,
    htmlBody: mailWrap_('This day in history', date.toUpperCase(), h.facts.map((f, i) => `<p style="font-size:16px;line-height:1.5"><b>${i + 1}. ${esc_(String(f.year))}</b> – ${esc_(f.text)}<br><a href="${f.link}">Read more</a></p>`).join('') + '<p style="font-size:12px;color:#5B6675">Source: Wikipedia – On this day (CC BY-SA). Check facts before reading if unsure.</p>'),
    body: h.facts.map((f, i) => `${i + 1}. ${f.year} – ${f.text}\n${f.link}`).join('\n\n') });
  return h;
}
/* one-off: create (or re-create) the 4–5 am trigger without running the full setup */
function installHistoryTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'prepareHistory') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('prepareHistory').timeBased().atHour(HISTORY_HOUR).everyDays(1).inTimezone(TZ).create();
}

/* ---------- SHEQ Alerts – read and acknowledge ---------- */
function alertRow_(r) { return { id: r[0], at: iso_(r[1]), type: r[2], priority: r[3], title: r[4], what: r[5], must: r[6], file: driveId_(r[7]), fileType: r[8], by: r[9], active: r[10] !== 'No', closed: iso_(r[11]), required: String(r[12] || '').split('\n').map(clean_).filter(Boolean), emailed: String(r[13] || '') }; }
function alertsOut_() {
  const ss = book_(); const acks = rows_(ss.getSheetByName('Alert Acks')).filter(r => r[0]);
  const all = rows_(ss.getSheetByName('SHEQ Alerts')).filter(r => r[0]).map(alertRow_);
  const since = Date.now() - 120 * 864e5;
  const list = all.filter(a => a.active || new Date(a.at).getTime() >= since).slice(-60).reverse();
  list.forEach(a => { a.acks = acks.filter(r => r[1] === a.id).map(r => ({ name: r[2], at: iso_(r[0]) })); });
  return { alerts: list };
}
const sameName_ = (a, b) => clean_(a).toLowerCase() === clean_(b).toLowerCase();
function publishAlert_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const type = ALERT_TYPES.find(x => x === d.type) || ALERT_TYPES[0], pri = ALERT_PRIORITY.find(x => x === d.priority);
  const title = clean_(d.title);
  if (!pri || !title || !str_(d.what, 4000).trim()) return out_({ ok: false, error: 'Add a priority, a title and what happened' });
  const ss = book_(); const sh = ss.getSheetByName('SHEQ Alerts'); const now = new Date(); const yr = Utilities.formatDate(now, TZ, 'yyyy');
  const n = rows_(sh).filter(r => String(r[0]).indexOf('SA-' + yr + '-') === 0).length + 1;
  const id = `SA-${yr}-${('00' + n).slice(-3)}`;
  let link = '', ftype = '';
  const f = d.file || {};
  if (f.data) {
    ftype = /^image\/(jpeg|png|webp)$/.test(f.type) || f.type === 'application/pdf' ? f.type : '';
    if (!ftype) return out_({ ok: false, error: 'Attach a photo or a PDF' });
    const bytes = Utilities.base64Decode(f.data); if (bytes.length > 8 * 1024 * 1024) return out_({ ok: false, error: 'Attachment over 8 MB' });
    try { link = folder_('PARRON – Alerts').createFile(Utilities.newBlob(bytes, ftype, `${id}_${str_(f.name || 'attachment', 80)}`.replace(/[^\w.-]+/g, '_'))).getUrl(); } catch (e) { link = ''; ftype = ''; }
  }
  const required = (Array.isArray(d.required) ? d.required : []).map(clean_).filter(Boolean).slice(0, 80);
  if (!required.length) return out_({ ok: false, error: 'Tick who must acknowledge the alert' });
  sh.appendRow([id, now, type, pri, title, str_(d.what, 4000), str_(d.must, 4000), link, ftype, clean_(d.by) || 'SHE Manager', 'Yes', '', required.join('\n')]);
  const list = alertTo_(d.notify);
  let result = 'Not emailed (switched off)';
  if (d.email !== false) result = alertSend_({ id, type, pri, title, what: str_(d.what, 4000), must: str_(d.must, 4000) }, [TO.toLowerCase()].concat(list));
  sh.getRange(sh.getLastRow(), 14).setValue(result);
  return out_(Object.assign({ ok: true, id, emailed: result }, alertsOut_()));
}
/* Genus addresses of the people ticked (the SHE Manager always gets a copy separately) */
function alertTo_(v) {
  return String(Array.isArray(v) ? v.join(',') : v || '').split(/[,;]/).map(e => e.trim().toLowerCase())
    .filter((e, i, a) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && ALLOWED.test(e) && e !== TO.toLowerCase() && a.indexOf(e) === i).slice(0, 80);
}
/* one email per person (not BCC – bulk BCC mail from outside Genus is often held by the mail filter); returns what happened */
function alertSend_(a, to) {
  const col = a.pri === 'Critical' ? '#C62828' : a.pri === 'Important' ? '#EC7723' : '#112B4E';
  const para = s => esc_(s).replace(/\n/g, '<br>');
  const subject = `${a.pri === 'Info' ? '' : a.pri.toUpperCase() + ' – '}${a.type}: ${a.title}`;
  const htmlBody = `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:640px"><div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid ${col}"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | ${esc_(a.type.toUpperCase())} · ${esc_(a.pri.toUpperCase())} · ${a.id}</div><div style="font-size:18px;font-weight:700">${esc_(a.title)}</div></div>
    <h3 style="color:#112B4E;margin-bottom:4px">What happened</h3><p style="font-size:14px">${para(a.what)}</p>${String(a.must || '').trim() ? `<h3 style="color:#112B4E;margin-bottom:4px">What you must do</h3><p style="font-size:14px">${para(a.must)}</p>` : ''}
    <p style="font-size:14px"><a href="${APP_URL}#alerts/${a.id}" style="background:#EC7723;color:#1B1206;padding:10px 16px;border-radius:8px;font-weight:700;text-decoration:none">Open PARRON to read and acknowledge</a></p>
    <p style="font-size:12px;color:#5B6675">Please acknowledge in PARRON so the project record shows you have read it.</p></div>`;
  const body = `${a.type} (${a.pri}) ${a.id}: ${a.title}\n\nWhat happened:\n${a.what}\n\nWhat you must do:\n${a.must || '-'}\n\nRead and acknowledge in PARRON: ${APP_URL}#alerts/${a.id}`;
  const sent = [], failed = [];
  to.forEach(e => {
    if (MailApp.getRemainingDailyQuota() < 1) { failed.push(e + ' (daily email limit reached)'); return; }
    try { MailApp.sendEmail({ to: e, replyTo: TO, name: 'PARRON Site Inspections', subject, htmlBody, body }); sent.push(e); }
    catch (err) { failed.push(e + ' (' + String((err && err.message) || err).slice(0, 80) + ')'); }
  });
  return `${Utilities.formatDate(new Date(), TZ, 'dd/MM HH:mm')} – emailed ${sent.length} of ${to.length}${failed.length ? '. Not sent: ' + failed.join('; ') : ''}`;
}
/* SHE Manager: email the alert again to the people ticked who have not acknowledged it yet */
function emailAlert_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const ss = book_(); const sh = ss.getSheetByName('SHEQ Alerts'); const rows = rows_(sh); const i = rows.findIndex(r => r[0] === d.id);
  if (i < 0) return out_({ ok: false, error: 'Alert not found' });
  const a = alertRow_(rows[i]); const acks = rows_(ss.getSheetByName('Alert Acks')).filter(r => r[1] === a.id).map(r => r[2]);
  const want = alertTo_(d.notify);
  if (!want.length) return out_({ ok: false, error: 'Everyone with a Genus email has acknowledged it' });
  const result = alertSend_({ id: a.id, type: a.type, pri: a.priority, title: a.title, what: a.what, must: a.must }, want);
  sh.getRange(i + 2, 14).setValue((a.emailed ? a.emailed + '\n' : '') + result);
  return out_(Object.assign({ ok: true, emailed: result, acked: acks.length }, alertsOut_()));
}
function ackAlert_(d) {
  const name = clean_(d.name); if (!name) return out_({ ok: false, error: 'Pick your name first' });
  const ss = book_(); const a = rows_(ss.getSheetByName('SHEQ Alerts')).find(r => r[0] === d.id);
  if (!a) return out_({ ok: false, error: 'Alert not found' });
  const sh = ss.getSheetByName('Alert Acks');
  if (!rows_(sh).some(r => r[1] === d.id && sameName_(r[2], name))) sh.appendRow([new Date(), d.id, name]);
  return out_(Object.assign({ ok: true }, alertsOut_()));
}
function closeAlert_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const sh = book_().getSheetByName('SHEQ Alerts'); const rows = rows_(sh); const i = rows.findIndex(r => r[0] === d.id);
  if (i < 0) return out_({ ok: false, error: 'Alert not found' });
  const open = d.reopen === true;
  sh.getRange(i + 2, 11, 1, 2).setValues([[open ? 'Yes' : 'No', open ? '' : new Date()]]);
  return out_(Object.assign({ ok: true }, alertsOut_()));
}
/* the attachment of an alert (only files that belong to an alert can be read) */
function alertFile_(id) {
  id = String(id || ''); if (!/^[\w-]{1,80}$/.test(id)) return out_({ ok: false, error: 'Bad file id' });
  const r = rows_(book_().getSheetByName('SHEQ Alerts')).find(x => driveId_(x[7]) === id); if (!r) return out_({ ok: false, error: 'Not found' });
  const b = DriveApp.getFileById(id).getBlob(); const bytes = b.getBytes(); if (bytes.length > 8 * 1024 * 1024) return out_({ ok: false, error: 'Too large' });
  return out_({ ok: true, type: r[8] || b.getContentType(), data: Utilities.base64Encode(bytes) });
}
/* active alerts and who of the people ticked has not yet acknowledged – for the daily and weekly emails */
function alertsDigest_(today, includeAll) {
  const ss = book_(); const acks = rows_(ss.getSheetByName('Alert Acks')).filter(r => r[0]);
  const since = Date.now() - (includeAll ? 7 : 30) * 864e5;
  const rows = rows_(ss.getSheetByName('SHEQ Alerts')).filter(r => r[0]).map(alertRow_)
    .filter(a => includeAll ? (a.active || new Date(a.at).getTime() >= since) && new Date(a.at).getTime() >= Date.now() - 30 * 864e5 : a.active && new Date(a.at).getTime() >= since)
    .map(a => { const done = acks.filter(r => r[1] === a.id).map(r => r[2]); const expected = a.required;
      const waiting = expected.filter(n => !done.some(x => sameName_(x, n)));
      return { id: a.id, title: a.title, priority: a.priority, expected: expected.length, acked: expected.length - waiting.length, waiting }; });
  return { rows: includeAll ? rows : rows.filter(a => a.waiting.length) };
}

/* ---------- My SHEQ Planner – the SHE Manager's register of SHEQ obligations (Manager PIN only) ----------
   Obligations are drafted from the project plans (e.g. in the SHE Manager's own Claude Project), pasted into PARRON and
   approved there – nothing reminds anyone until it is approved. Reminders are fixed rules (no AI): the SHE Manager gets
   one email between 5 and 6 am, each owner is emailed their own items, and sending the linked PARRON form ticks an item off. */
function every_(s) { const m = String(s || '').trim().toLowerCase().match(/^(\d{1,3})\s*(day|week|month|year)s?$/); return m && Number(m[1]) > 0 ? { n: Number(m[1]), u: m[2] } : null; }
const obEveryOK_ = s => !!every_(s) || s === 'As required' || s === 'Once';
const isoOK_ = s => /^\d{4}-\d\d-\d\d$/.test(String(s || ''));
function addEvery_(iso, every) {
  const e = every_(every); if (!e || !isoOK_(iso)) return '';
  const [y, mo, d] = iso.split('-').map(Number); let dt;
  if (e.u === 'day' || e.u === 'week') dt = new Date(Date.UTC(y, mo - 1, d + e.n * (e.u === 'week' ? 7 : 1)));
  else { const k = e.n * (e.u === 'year' ? 12 : 1); const last = new Date(Date.UTC(y, mo + k, 0)).getUTCDate(); dt = new Date(Date.UTC(y, mo - 1 + k, Math.min(d, last))); }
  return dt.toISOString().slice(0, 10);
}
const daysBetween_ = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
function obRow_(r) {
  const H = idx_(OB_HEAD); const g = k => r[H[k]];
  return { id: String(g('ID')), title: String(g('Obligation')), source: String(g('Source') || ''), every: String(g('Every') || ''), owner: String(g('Owner') || ''), ownerEmail: String(g('Owner email') || ''),
    lead: num_(g('Remind days before')), form: String(g('Completed by form') || ''), due: dstr_(g('Next due')).slice(0, 10), last: dstr_(g('Last done')).slice(0, 10), evidence: String(g('Last evidence') || ''),
    status: String(g('Status') || 'Active'), approvedBy: String(g('Approved by') || ''), approved: iso_(g('Approved')), notes: String(g('Notes') || ''), updated: iso_(g('Updated')) };
}
function plannerOut_() {
  const ss = book_(); const items = rows_(ss.getSheetByName('SHEQ Register')).filter(r => r[0]).map(obRow_);
  const log = rows_(ss.getSheetByName('Register Log')).filter(r => r[0]).slice(-400).reverse().map(r => ({ at: iso_(r[0]), id: String(r[1]), title: String(r[2]), date: dstr_(r[3]).slice(0, 10), by: String(r[4]), evidence: String(r[5]), how: String(r[6]) }));
  return { items, log, emails: plannerEmails_() };
}
/* who the planner emails: 'off' (nobody – the default until the SHE Manager turns it on), 'me' (SHE Manager only), 'all' (SHE Manager and owners) */
const PLANNER_MODES = ['off', 'me', 'all'];
function plannerEmails_() { const v = PropertiesService.getScriptProperties().getProperty('PLANNER_EMAILS'); return PLANNER_MODES.indexOf(v) >= 0 ? v : 'off'; }
function plannerMode_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  if (PLANNER_MODES.indexOf(d.mode) < 0) return out_({ ok: false, error: 'Unknown setting' });
  PropertiesService.getScriptProperties().setProperty('PLANNER_EMAILS', d.mode);
  return out_(Object.assign({ ok: true }, plannerOut_()));
}
function planner_(d) { if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true }); return out_(Object.assign({ ok: true }, plannerOut_())); }
/* one checked obligation as a sheet row (or an error message) */
function obClean_(o, by, keep) {
  o = o || {}; const title = clean_(o.title); const every = String(o.every || '').trim();
  if (!title) return 'Every obligation needs a name';
  if (!obEveryOK_(every)) return `"${title}": frequency not understood`;
  const due = isoOK_(o.due) ? o.due : '';
  if (every === 'Once' && !due) return `"${title}": a one-off item needs a due date`;
  const form = /^\d{1,3}$/.test(String(o.form || '').trim()) ? String(Number(o.form)) : '';
  const status = ['Active', 'Retired', 'Done'].includes(o.status) ? o.status : 'Active';
  return ['', title, clean_(o.source), every, clean_(o.owner), email_(o.ownerEmail), Math.max(0, Math.min(365, Math.round(num_(o.lead)))), form ? "'" + form : '', due ? "'" + due : '',
    keep && dstr_(keep[9]) ? "'" + dstr_(keep[9]).slice(0, 10) : '', keep ? keep[10] : '', status, keep ? keep[12] : (clean_(by) || 'SHE Manager'), keep ? keep[13] : new Date(), str_(o.notes, 1000), new Date()];
}
function obNextId_(rows) { return 'OB-' + ('00' + (rows.reduce((m, r) => Math.max(m, Number(String(r[0]).replace(/^OB-/, '')) || 0), 0) + 1)).slice(-3); }
function saveOb_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const sh = book_().getSheetByName('SHEQ Register'); const rows = rows_(sh); const o = d.item || {};
  const i = o.id ? rows.findIndex(r => String(r[0]) === String(o.id)) : -1;
  if (o.id && i < 0) return out_({ ok: false, error: 'Item not found' });
  const row = obClean_(o, d.by, i >= 0 ? rows[i] : null); if (typeof row === 'string') return out_({ ok: false, error: row });
  if (i >= 0) { row[0] = rows[i][0]; sh.getRange(i + 2, 1, 1, OB_HEAD.length).setValues([row]); }
  else { row[0] = obNextId_(rows); sh.appendRow(row); }
  return out_(Object.assign({ ok: true, id: row[0] }, plannerOut_()));
}
function importOb_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const list = Array.isArray(d.items) ? d.items.slice(0, 200) : []; if (!list.length) return out_({ ok: false, error: 'Nothing to add' });
  const sh = book_().getSheetByName('SHEQ Register'); const rows = rows_(sh); const bad = []; let added = 0;
  list.forEach(o => { const row = obClean_(o, d.by, null); if (typeof row === 'string') { bad.push(row); return; } row[0] = obNextId_(rows); rows.push(row); sh.appendRow(row); added++; });
  return out_(Object.assign({ ok: true, added, skipped: bad }, plannerOut_()));
}
/* record an item as done: the next due date moves on by its frequency */
function obDone_(sh, i, r, date, evidence, by, how) {
  const o = obRow_(r); const next = every_(o.every) ? addEvery_(date, o.every) : o.due;
  sh.getRange(i + 2, 9, 1, 3).setValues([[next ? "'" + next : '', "'" + date, str_(evidence, 500)]]);
  if (o.every === 'Once') sh.getRange(i + 2, 12).setValue('Done');
  sh.getRange(i + 2, 16).setValue(new Date());
  book_().getSheetByName('Register Log').appendRow([new Date(), o.id, o.title, "'" + date, clean_(by), str_(evidence, 500), how]);
}
function doneOb_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const sh = book_().getSheetByName('SHEQ Register'); const rows = rows_(sh); const i = rows.findIndex(r => String(r[0]) === String(d.id));
  if (i < 0) return out_({ ok: false, error: 'Item not found' });
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); const date = isoOK_(d.date) && d.date <= today ? d.date : today;
  obDone_(sh, i, rows[i], date, d.evidence, d.by || 'SHE Manager', 'Marked done');
  return out_(Object.assign({ ok: true }, plannerOut_()));
}
/* sending a PARRON form ticks off every active item linked to that form number, with the report as evidence */
function obAutoTick_(m, reportId, link) {
  const no = String(m.no || '').replace(/^0+/, ''); if (!/^\d{1,3}$/.test(no)) return;
  const sh = book_().getSheetByName('SHEQ Register'); const rows = rows_(sh); const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  rows.forEach((r, i) => { const o = obRow_(r); if (o.status !== 'Active' || o.form !== no) return;
    obDone_(sh, i, r, today, [reportId, link].filter(Boolean).join(' '), m.name || '', 'Form ' + no + ' sent'); });
}
function plannerMail_(title, sub, inner) {
  return `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:720px"><div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | ${esc_(sub)}</div><div style="font-size:18px;font-weight:700">${esc_(title)}</div></div>${inner}</div>`;
}
/* between 5 and 6 am (with the personal reminders): the SHE Manager's planner email, and each owner's own items */
function plannerDigest_(now) {
  const mode = plannerEmails_(); if (mode === 'off') return;   // nobody is emailed until the SHE Manager turns reminders on
  const ss = book_(); const sh = ss.getSheetByName('SHEQ Register'); if (!sh) return;
  const today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd'); const cache = CacheService.getScriptCache();
  if (cache.get('planner_' + today)) return; cache.put('planner_' + today, '1', 21600);
  const L = rows_(sh).filter(r => r[0]).map(obRow_).filter(o => o.status === 'Active' && o.due && o.every !== 'As required')
    .map(o => Object.assign(o, { n: daysBetween_(today, o.due) })).sort((a, b) => a.n - b.n);
  const dmy = s => s.split('-').reverse().join('/');
  const when = o => o.n < 0 ? `<b style="color:#C62828">${-o.n} day${o.n === -1 ? '' : 's'} overdue</b>` : o.n === 0 ? '<b style="color:#E8660D">Due today</b>' : o.n === 1 ? 'Due tomorrow' : `${dmy(o.due)} (in ${o.n} days)`;
  const td = 'style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px;vertical-align:top"', th = 'style="background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const tbl = (rows, own) => `<table style="border-collapse:collapse;width:100%"><tr><th ${th}>Obligation</th>${own ? `<th ${th}>Owner</th>` : ''}<th ${th}>Due</th></tr>${rows.map(o => `<tr><td ${td}><b>${esc_(o.title)}</b>${o.source ? `<br><span style="color:#5B6675">${esc_(o.source)}</span>` : ''}${o.form ? `<br><span style="color:#2E7D32">Sending PARRON form ${esc_(o.form)} ticks this off</span>` : ''}</td>${own ? `<td ${td}>${esc_(o.owner || 'SHE Manager')}</td>` : ''}<td ${td}>${when(o)}</td></tr>`).join('')}</table>`;
  const sec = (h, c, rows, own) => rows.length ? `<h3 style="color:${c};margin:16px 0 6px">${h} (${rows.length})</h3>${tbl(rows, own)}` : '';
  const over = L.filter(o => o.n < 0), tod = L.filter(o => o.n === 0), wk = L.filter(o => o.n > 0 && o.n <= 7), ahead = L.filter(o => o.n > 7 && o.n <= o.lead);
  if (over.length + tod.length + wk.length + ahead.length) {
    MailApp.sendEmail({ to: TO, name: 'PARRON Site Inspections', subject: `Your SHEQ day – ${Utilities.formatDate(now, TZ, 'EEE d MMM')}: ${over.length} overdue, ${tod.length} due today, ${wk.length} this week`,
      htmlBody: plannerMail_(Utilities.formatDate(now, TZ, 'EEEE d MMMM yyyy'), 'MY SHEQ PLANNER',
        sec('Overdue', '#C62828', over, true) + sec('Due today', '#E8660D', tod, true) + sec('Due in the next 7 days', '#112B4E', wk, true) + sec('Plan ahead', '#1A5FB4', ahead, true) +
        `<p style="font-size:12px;color:#5B6675">Open <a href="${APP_URL}#planner">My SHEQ Planner</a> (Manager mode) to mark items done or change them. Owners with a Genus email are reminded of their own items.</p>`),
      body: L.filter(o => o.n <= Math.max(7, o.lead)).map(o => `${o.title} – ${o.owner || 'SHE Manager'} – ${o.due}`).join('\n') + `\n${APP_URL}#planner` });
  }
  if (mode !== 'all') return;
  // owners: on the day the reminder period starts, the day before, on the day, and every day while overdue
  const mine = {}; L.filter(o => o.ownerEmail && o.ownerEmail.toLowerCase() !== TO.toLowerCase() && (o.n < 0 || o.n <= 1 || o.n === o.lead)).forEach(o => { (mine[o.ownerEmail] = mine[o.ownerEmail] || []).push(o); });
  Object.keys(mine).forEach(e => { const M = mine[e]; const late = M.filter(o => o.n < 0).length;
    try { MailApp.sendEmail({ to: e, replyTo: TO, name: 'PARRON Site Inspections', subject: late ? `PARRON: ${late} SHEQ item${late > 1 ? 's' : ''} overdue` : `PARRON: ${M.length} SHEQ item${M.length > 1 ? 's' : ''} coming up`,
      htmlBody: plannerMail_(`Your SHEQ items – ${Utilities.formatDate(now, TZ, 'EEE d MMM')}`, 'SHEQ REMINDER', sec('Overdue', '#C62828', M.filter(o => o.n < 0), false) + sec('Coming up', '#112B4E', M.filter(o => o.n >= 0), false) +
        '<p style="font-size:12px;color:#5B6675">From the SHE Manager\'s SHEQ register. Where a PARRON form is named, sending it in PARRON ticks the item off – otherwise reply to this email when it is done.</p>'),
      body: M.map(o => `${o.title} – due ${o.due}`).join('\n') }); } catch (err) {} });
}

/* ---------- Inspection forms added by the SHE Manager in the app (no code change needed) ----------
   The template is built and checked by the app; the relay keeps every revision's latest copy and serves them to every phone. */
function formsOut_() {
  const sh = book_().getSheetByName('Custom Forms');
  return rows_(sh).filter(r => r[0]).map(r => { let tpl = null; try { tpl = JSON.parse(r[7] || 'null'); } catch (e) { tpl = null; }
    return { num: Number(r[0]), title: String(r[1]), rev: Number(r[2]) || 0, status: String(r[3] || 'Active'), at: iso_(r[4]), by: String(r[5] || ''), text: String(r[6] || ''), tpl }; }).filter(f => f.tpl);
}
function saveForm_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const num = Number(d.num); if (!(num >= 29 && num <= 999 && Math.floor(num) === num)) return out_({ ok: false, error: 'Form number must be 29 or above' });
  const sh = book_().getSheetByName('Custom Forms'); const rows = rows_(sh); const i = rows.findIndex(r => Number(r[0]) === num);
  if (d.status && !d.tpl) {   // retire or restore only
    if (i < 0) return out_({ ok: false, error: 'Form not found' });
    sh.getRange(i + 2, 4).setValue(d.status === 'Retired' ? 'Retired' : 'Active'); return out_({ ok: true, forms: formsOut_() });
  }
  const t = d.tpl || {}; const json = JSON.stringify(t);
  if (json.length > 100000) return out_({ ok: false, error: 'Form too large' });
  if (/[<>]/.test(json) || /[<>]/.test(String(d.text || ''))) return out_({ ok: false, error: 'Remove < and > characters from the form' });
  if (!clean_(t.short) || !Array.isArray(t.sections) || !t.sections.length || !t.sections.every(s => Array.isArray(s.q) && s.q.length)) return out_({ ok: false, error: 'The form needs a title and at least one section with items' });
  const row = [num, clean_(t.short), i >= 0 ? (Number(rows[i][2]) || 0) + 1 : 0, 'Active', new Date(), clean_(d.by) || 'SHE Manager', str_(d.text, 50000), json];
  if (i >= 0) sh.getRange(i + 2, 1, 1, FORM_HEAD.length).setValues([row]); else sh.appendRow(row);
  return out_({ ok: true, forms: formsOut_() });
}

/* ---------- Submitted forms register (SHE Manager only) – every report sent through PARRON, with its archived PDF ---------- */
function submitted_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const ss = book_(); const S = idx_(SENT_HEAD); const day = v => Utilities.formatDate(new Date(v), TZ, 'yyyy-MM-dd');
  const from = isoOK_(d.from) ? d.from : '0000-00-00', to = isoOK_(d.to) ? d.to : '9999-99-99';
  const items = rows_(ss.getSheetByName('Sent')).filter(r => r[0] && day(r[0]) >= from && day(r[0]) <= to).slice(-3000).reverse().map(r => ({
    sentAt: iso_(r[0]), reportId: String(r[3] || ''), uid: String(r[4] || ''), name: String(r[5] || ''), no: no_(r[6]), title: String(r[7] || ''), location: String(r[8] || ''),
    ua: num_(r[9]), ni: num_(r[10]), snn: num_(r[11]), via: String(r[12] || ''), c: r[S.C], na: r[S.NA], pct: r[S['Compliance %']], inspDate: dstr_(r[S['Inspection date']]),
    crew: String(r[S.Crew] || ''), supervisor: String(r[S.Supervisor] || ''), pdf: driveId_(r[S['PDF link']] || '') }));
  const open = rows_(ss.getSheetByName('Status')).filter(r => r[7] === 'draft' || r[7] === 'outbox').map(r => ({
    name: String(r[1] || ''), no: no_(r[2]), title: String(r[3] || ''), location: String(r[4] || ''), started: iso_(r[5]), updated: iso_(r[6]), state: r[7] }));
  return out_({ ok: true, items, open });
}
/* one archived report PDF – only files recorded in the Sent log can be read */
function reportPdf_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Incorrect Manager PIN', badPin: true });
  const id = String(d.id || ''); if (!/^[\w-]{1,80}$/.test(id)) return out_({ ok: false, error: 'Bad file id' });
  const S = idx_(SENT_HEAD); const known = rows_(book_().getSheetByName('Sent')).some(r => driveId_(r[S['PDF link']] || '') === id);
  if (!known) return out_({ ok: false, error: 'Not found' });
  const bytes = DriveApp.getFileById(id).getBlob().getBytes(); if (bytes.length > 25 * 1024 * 1024) return out_({ ok: false, error: 'Too large' });
  return out_({ ok: true, type: 'application/pdf', data: Utilities.base64Encode(bytes) });
}

/* hazard reports and positive observations for the in-app list (last 13 months, newest first) */
const driveId_ = u => (String(u).match(/\/d\/([\w-]{1,80})/) || [])[1] || '';
function reports_() {
  const O = idx_(OBS_HEAD); const since = Date.now() - 400 * 864e5;
  return rows_(book_().getSheetByName('Observations')).filter(r => r[0] && new Date(r[0]).getTime() >= since).slice(-500).reverse().map(r => ({
    at: iso_(r[0]), reportId: r[O['Report ID']], type: r[O.Type] === 'Hazard' ? 'hazard' : 'positive', name: r[O.Name], location: r[O.Location],
    description: r[O.Description], category: r[O.Category], recognised: r[O['Person / crew recognised']], cons: r[O.Consequence], like: r[O.Likelihood],
    score: r[O['Risk score']], level: r[O['Risk level']], immediate: r[O['Immediate action']], status: r[O.Status], owner: r[O.Owner], due: dstr_(r[O.Due]),
    photos: String(r[O['Photo links']] || '').split('\n').map(driveId_).filter(Boolean) }));
}
/* one report photo – only files that belong to a logged report can be read */
function photo_(id) {
  id = String(id || ''); if (!/^[\w-]{1,80}$/.test(id)) return out_({ ok: false, error: 'Bad photo id' });
  const O = idx_(OBS_HEAD); const known = rows_(book_().getSheetByName('Observations')).some(r => String(r[O['Photo links']] || '').split('\n').some(u => driveId_(u) === id));
  if (!known) return out_({ ok: false, error: 'Not found' });
  const b = DriveApp.getFileById(id).getBlob(); const bytes = b.getBytes(); if (bytes.length > 5 * 1024 * 1024) return out_({ ok: false, error: 'Too large' });
  return out_({ ok: true, type: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(bytes) });
}
/* site access code: kept in Script properties (SITE_CODE), never in the code or on GitHub; not case-sensitive */
function codeOK_(c) { const s = PropertiesService.getScriptProperties().getProperty('SITE_CODE'); if (!s) return true; return String(c || '').trim().toUpperCase() === String(s).trim().toUpperCase(); }
function pinOK_(pin) {
  const want = PropertiesService.getScriptProperties().getProperty('MANAGER_PIN'); if (!want) return false;
  const c = CacheService.getScriptCache(); const fails = Number(c.get('pinfail') || 0);
  if (fails >= 10) return false;                                    // 10 wrong tries locks it for 15 minutes
  const ok = String(pin || '') === String(want);
  if (!ok) c.put('pinfail', String(fails + 1), 900);
  return ok;
}
function rate_() {
  const c = CacheService.getScriptCache(); const k = 'rl_' + Math.floor(Date.now() / 60000);
  const n = Number(c.get(k) || 0) + 1; c.put(k, String(n), 120); return n <= MAX_PER_MINUTE;
}
function idx_(head) { const o = {}; head.forEach((h, i) => o[h] = i); return o; }
function sum_(rows, i) { return rows.reduce((a, r) => a + (Number(r[i]) || 0), 0); }
function num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function str_(v, n) { return String(v == null ? '' : v).slice(0, n || 500); }
function no_(v) { const s = String(v == null ? '' : v); return /^\d$/.test(s) ? '0' + s : s; }
function rows_(sh) { const n = sh.getLastRow(); return n > 1 ? sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues() : []; }
function dstr_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v == null ? '' : v); }
function iso_(v) { return v instanceof Date ? v.toISOString() : (v ? String(v) : ''); }
function clean_(s) { return String(s || '').trim().replace(/\s+/g, ' ').slice(0, 120); }
function esc_(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
