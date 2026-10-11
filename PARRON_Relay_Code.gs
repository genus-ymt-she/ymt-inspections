/**
 * PARRON relay v2 – emails inspection reports, keeps the shared inspection log
 * (Google Sheet) behind the in-app Dashboard, and sends the 6 pm daily summary.
 *
 * FIRST TIME: paste this whole file in, Save, choose "setup" in the toolbar and click Run.
 * Then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * UPDATING: paste over the old code, Save, Deploy > Manage deployments > Edit (pencil)
 * > Version: New version > Deploy. The web app link stays the same.
 */
const TO = 'darren.frizzell@genus.com.au';   // reports and the daily summary go here
const KEY = 'prn-ymt-7Qk2vX9m';               // must match "key" in config.json
const ALLOWED = /@genus\.com\.au$/i;
const TZ = 'Australia/Perth';
const DIGEST_HOUR = 18;                       // daily summary between 6 and 7 pm Perth time

const SENT_HEAD = ['Sent at', 'Date', 'Month', 'Report ID', 'UID', 'Name', 'No', 'Inspection', 'Location', 'UA', 'NI', 'SNN', 'Sent via'];
const STAT_HEAD = ['UID', 'Name', 'No', 'Inspection', 'Location', 'Started', 'Last update', 'State', 'Sent at'];

/* ---------- one-off setup ---------- */
function setup() {
  const ss = book_();
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(DIGEST_HOUR).everyDays(1).inTimezone(TZ).create();
  MailApp.sendEmail(TO, 'PARRON is connected',
    'The PARRON relay is set up.\n\nInspection log (Google Sheet): ' + ss.getUrl() +
    '\nDaily summary: every day between 6 and 7 pm (Perth time).');
}

function book_() {
  const p = PropertiesService.getScriptProperties();
  let ss, id = p.getProperty('SHEET_ID');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create('PARRON – Inspection Log (YMT)'); p.setProperty('SHEET_ID', ss.getId()); }
  sheet_(ss, 'Sent', SENT_HEAD); sheet_(ss, 'Status', STAT_HEAD);
  const s1 = ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 2) ss.deleteSheet(s1);
  return ss;
}
function sheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#112B4E').setFontColor('#FFFFFF'); }
  return sh;
}

/* ---------- web app ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.key !== KEY) return out_({ ok: false, error: 'Not authorised' });
    lock.waitLock(20000);
    if (d.action === 'status') { status_(d); return out_({ ok: true }); }
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
    to: (d.to && ALLOWED.test(d.to)) ? d.to : TO,
    subject: String(d.subject || 'PARRON site inspection').slice(0, 250),
    body: String(d.text || ''),
    name: 'PARRON Site Inspections'
  };
  if (d.html) opts.htmlBody = String(d.html);
  if (d.pdf) opts.attachments = [Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', d.filename || 'inspection.pdf')];
  MailApp.sendEmail(opts);
  if (uid) cache.put('sent_' + uid, '1', 21600);
  logSent_(uid, d.reportId, d.meta || {}, 'Direct');
  return out_({ ok: true });
}

function logSent_(uid, reportId, m, via) {
  const ss = book_(); const now = new Date();
  ss.getSheetByName('Sent').appendRow([now, "'" + Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), "'" + Utilities.formatDate(now, TZ, 'yyyy-MM'),
    reportId || '', uid, clean_(m.name), "'" + (m.no || ''), m.title || '', m.location || '', m.ua || 0, m.ni || 0, m.snn || 0, via]);
  upsert_(ss, uid, m, 'sent', now);
}

function status_(d) {
  const m = d.meta || {};
  if (d.state === 'sent') { logSent_(d.uid, d.reportId, m, 'Other (manual)'); return; }
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
  if (p.action !== 'dashboard') return out_({ ok: true, service: 'PARRON relay', emailsLeftToday: MailApp.getRemainingDailyQuota() });
  if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' });
  const ss = book_(); const month = p.month || Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  const sent = rows_(ss.getSheetByName('Sent')).filter(r => r[0] && Utilities.formatDate(new Date(r[0]), TZ, 'yyyy-MM') === month).map(r => ({
    sentAt: iso_(r[0]), reportId: r[3], name: r[5], no: no_(r[6]), title: r[7], location: r[8], ua: r[9], ni: r[10], snn: r[11], via: r[12] }));
  const open = rows_(ss.getSheetByName('Status')).filter(r => r[7] === 'draft' || r[7] === 'outbox').map(r => ({
    name: r[1], no: no_(r[2]), title: r[3], location: r[4], started: iso_(r[5]), updated: iso_(r[6]), state: r[7] }));
  return out_({ ok: true, month, sent, open, generated: new Date().toISOString() });
}

/* ---------- 6 pm daily summary ---------- */
function dailyDigest() {
  const ss = book_(); const now = new Date(); const today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const day = r => Utilities.formatDate(new Date(r), TZ, 'yyyy-MM-dd');
  const open = rows_(ss.getSheetByName('Status')).filter(r => r[7] === 'draft' || r[7] === 'outbox');
  const openToday = open.filter(r => day(r[5]) === today), openOlder = open.filter(r => day(r[5]) !== today);
  const sentToday = rows_(ss.getSheetByName('Sent')).filter(r => r[0] && day(r[0]) === today);
  const td = 'style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px"', th = 'style="background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const t = (rows, cols) => rows.length ? `<table style="border-collapse:collapse;width:100%"><tr>${cols.map(c => `<th ${th}>${c}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(v => `<td ${td}>${esc_(v)}</td>`).join('')}</tr>`).join('')}</table>` : '<p style="font-size:13px">None.</p>';
  const fmt = v => Utilities.formatDate(new Date(v), TZ, 'dd/MM HH:mm');
  const st = s => s === 'outbox' ? 'Finished – waiting for signal' : 'Started – not sent';
  const byName = {}; sentToday.forEach(r => { byName[r[5]] = (byName[r[5]] || []).concat(`${no_(r[6])} ${r[7]}`); });
  const html = `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:820px">
    <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | DAILY SUMMARY</div><div style="font-size:18px;font-weight:700">${Utilities.formatDate(now, TZ, 'EEEE d MMMM yyyy')}</div></div>
    <h3 style="color:#C62828">Not sent – started today (${openToday.length})</h3>${t(openToday.map(r => [r[1], `${no_(r[2])} ${r[3]}`, r[4], fmt(r[5]), st(r[7])]), ['Name', 'Inspection', 'Location', 'Started', 'Status'])}
    <h3 style="color:#C62828">Still not sent – from earlier days (${openOlder.length})</h3>${t(openOlder.map(r => [r[1], `${no_(r[2])} ${r[3]}`, r[4], fmt(r[5]), st(r[7])]), ['Name', 'Inspection', 'Location', 'Started', 'Status'])}
    <h3 style="color:#2E7D32">Sent today (${sentToday.length})</h3>${t(Object.keys(byName).sort().map(k => [k, byName[k].length, byName[k].join(', ')]), ['Name', 'Count', 'Inspections'])}
    <p style="font-size:12px;color:#5B6675">Full log: <a href="${ss.getUrl()}">PARRON – Inspection Log</a></p></div>`;
  MailApp.sendEmail({ to: TO, subject: `PARRON daily summary ${Utilities.formatDate(now, TZ, 'dd/MM/yyyy')} – ${openToday.length + openOlder.length} not sent, ${sentToday.length} sent`, htmlBody: html, body: 'Open in an HTML email client.', name: 'PARRON Site Inspections' });
}

/* ---------- helpers ---------- */
function no_(v) { const s = String(v == null ? '' : v); return /^\d$/.test(s) ? '0' + s : s; }
function rows_(sh) { const n = sh.getLastRow(); return n > 1 ? sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues() : []; }
function iso_(v) { return v instanceof Date ? v.toISOString() : (v ? String(v) : ''); }
function clean_(s) { return String(s || '').trim().replace(/\s+/g, ' '); }
function esc_(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
