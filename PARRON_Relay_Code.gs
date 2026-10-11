/**
 * PARRON relay v3 – emails inspection reports, keeps the shared project log (Google Sheet) behind the
 * in-app Insights, Actions and MYOSH screens, archives report PDFs to Google Drive and sends the
 * 6 pm daily summary.
 *
 * FIRST TIME: paste this whole file in, Save, choose "setup" in the toolbar and click Run.
 *   Then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * UPDATING FROM v2: paste over the old code, Save, choose "setup" and click Run once (it adds the new
 *   sheet columns and asks for Drive permission), then Deploy > Manage deployments > Edit (pencil)
 *   > Version: New version > Deploy. The web app link stays the same – no app change needed.
 * MANAGER PIN: Project Settings (cog, left bar) > Script properties > Add property
 *   MANAGER_PIN = a 4–8 digit PIN. It unlocks verify / re-open / MYOSH entry in the app. It is never
 *   stored in this file or in GitHub.
 *
 * v2 phones keep working: anything they send is accepted and logged exactly as before.
 */
const TO = 'darren.frizzell@genus.com.au';   // reports and the daily summary go here
const KEY = 'prn-ymt-7Qk2vX9m';               // must match "key" in config.json
const ALLOWED = /@genus\.com\.au$/i;
const TZ = 'Australia/Perth';
const DIGEST_HOUR = 18;                       // daily summary between 6 and 7 pm Perth time
const ARCHIVE_PDFS = true;                    // save a copy of every report PDF to Google Drive
const MAX_PER_MINUTE = 90;                    // simple flood protection for the public web app link

const SENT_HEAD = ['Sent at', 'Date', 'Month', 'Report ID', 'UID', 'Name', 'No', 'Inspection', 'Location', 'UA', 'NI', 'SNN', 'Sent via',
  'C', 'NA', 'Compliance %', 'Inspection date', 'Crew', 'Supervisor', 'PDF link', 'MYOSH ref', 'MYOSH entered', 'MYOSH by'];
const STAT_HEAD = ['UID', 'Name', 'No', 'Inspection', 'Location', 'Started', 'Last update', 'State', 'Sent at'];
const FIND_HEAD = ['FID', 'Report ID', 'UID', 'Raised', 'Inspection date', 'Raised by', 'No', 'Inspection', 'Location', 'Crew',
  'Item', 'Item text', 'Rating', 'SNN', 'Consequence', 'Likelihood', 'Risk score', 'Risk level', 'Finding', 'Corrective action',
  'Status', 'Owner', 'Due', 'Closed at', 'Closed by', 'Close-out note', 'Evidence link', 'Verified at', 'Verified by', 'Updated', 'History'];
const ST = { spot: 'Closed on spot', open: 'Open', closed: 'Closed', verified: 'Verified' };

/* ---------- one-off setup (safe to run again after every update) ---------- */
function setup() {
  const ss = book_();
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(DIGEST_HOUR).everyDays(1).inTimezone(TZ).create();
  if (ARCHIVE_PDFS) folder_('PARRON – Reports');
  const pin = PropertiesService.getScriptProperties().getProperty('MANAGER_PIN');
  MailApp.sendEmail(TO, 'PARRON relay v3 is connected',
    'The PARRON relay is set up.\n\nProject log (Google Sheet): ' + ss.getUrl() +
    '\nDaily summary: every day between 6 and 7 pm (Perth time).' +
    '\nManager PIN: ' + (pin ? 'set' : 'NOT SET – add MANAGER_PIN under Project Settings > Script properties.'));
}

function book_() {
  const p = PropertiesService.getScriptProperties();
  let ss, id = p.getProperty('SHEET_ID');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create('PARRON – Inspection Log (YMT)'); p.setProperty('SHEET_ID', ss.getId()); }
  sheet_(ss, 'Sent', SENT_HEAD); sheet_(ss, 'Status', STAT_HEAD); sheet_(ss, 'Findings', FIND_HEAD);
  const s1 = ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 3) ss.deleteSheet(s1);
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
    if (!rate_()) return out_({ ok: false, error: 'Busy – try again in a minute' });
    lock.waitLock(25000);
    if (d.action === 'status') { status_(d); return out_({ ok: true }); }
    if (d.action === 'finding') return finding_(d);
    if (d.action === 'myosh') return myosh_(d);
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
    to: (d.to && ALLOWED.test(d.to)) ? d.to : TO,
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
  if (Array.isArray(d.findings)) logFindings_(d);
  return out_({ ok: true, pdf: link });
}

function logSent_(uid, reportId, m, via, r, link) {
  const ss = book_(); const now = new Date(); r = r || {};
  ss.getSheetByName('Sent').appendRow([now, "'" + Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), "'" + Utilities.formatDate(now, TZ, 'yyyy-MM'),
    reportId || '', uid, clean_(m.name), "'" + (m.no || ''), m.title || '', m.location || '', m.ua || 0, m.ni || 0, m.snn || 0, via,
    num_(r.c), num_(r.na), r.pct == null || r.pct === '' ? '' : num_(r.pct), r.inspDate ? "'" + str_(r.inspDate, 20) : '', str_(r.crew, 120), str_(r.supervisor, 120),
    link || '', '', '', '']);
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
      st === ST.spot ? now : '', st === ST.spot ? clean_(m.name) : '', st === ST.spot ? str_(f.taken, 2000) : '', '', '', '', now, JSON.stringify(hist)];
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, FIND_HEAD.length).setValues(rows);
}

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
  } else if (op === 'verify') {
    if (v[H.Status] !== ST.closed && v[H.Status] !== ST.spot) return out_({ ok: false, error: 'Close the action before verifying it' });
    set('Status', ST.verified); set('Verified at', now); set('Verified by', by);
  } else if (op === 'reopen') {
    set('Status', ST.open); set('Verified at', ''); set('Verified by', ''); set('Closed at', ''); set('Closed by', '');
  } else if (op === 'edit') {
    if (d.owner != null) set('Owner', str_(d.owner, 120));
    if (d.due != null) set('Due', d.due ? "'" + str_(d.due, 10) : '');
  } else return out_({ ok: false, error: 'Unknown change' });
  set('Updated', now);
  hist.push({ at: now.toISOString(), by, op, note: str_(d.note || (op === 'edit' ? [d.owner != null ? 'Owner: ' + d.owner : '', d.due != null ? 'Due: ' + d.due : ''].filter(Boolean).join(', ') : ''), 500) });
  set('History', JSON.stringify(hist).slice(0, 45000));
  ['No', 'Item', 'Inspection date', 'Due'].forEach(k => { const x = v[H[k]]; if (x !== '' && x != null) v[H[k]] = "'" + dstr_(x).replace(/^'/, ''); });   // keep "01", "1.1" and dates as text
  sh.getRange(row, 1, 1, FIND_HEAD.length).setValues([v]);
  return out_({ ok: true, finding: findingOut_(v) });
}

function myosh_(d) {
  if (!pinOK_(d.pin)) return out_({ ok: false, error: 'Manager PIN needed' });
  const sh = book_().getSheetByName('Sent'); const H = idx_(SENT_HEAD); const all = rows_(sh);
  let hit = 0;
  all.forEach((r, i) => { if (String(r[H['Report ID']]) === String(d.reportId)) { sh.getRange(i + 2, H['MYOSH ref'] + 1, 1, 3).setValues([[str_(d.ref, 60) || '(no ref)', new Date(), clean_(d.by)]]); hit++; } });
  return out_(hit ? { ok: true } : { ok: false, error: 'Report not found in the log' });
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
  if (p.action !== 'dashboard') return out_({ ok: true, service: 'PARRON relay', v: 3, emailsLeftToday: MailApp.getRemainingDailyQuota() });
  if (p.key !== KEY) return out_({ ok: false, error: 'Not authorised' });
  const ss = book_(); const month = /^\d{4}-\d\d$/.test(p.month || '') ? p.month : Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  const S = idx_(SENT_HEAD); const mk = v => Utilities.formatDate(new Date(v), TZ, 'yyyy-MM');
  const allSent = rows_(ss.getSheetByName('Sent')).filter(r => r[0]);
  const sentOut = r => ({ sentAt: iso_(r[0]), reportId: r[3], uid: r[4], name: r[5], no: no_(r[6]), title: r[7], location: r[8], ua: r[9], ni: r[10], snn: r[11], via: r[12],
    c: r[S.C], na: r[S.NA], pct: r[S['Compliance %']], inspDate: dstr_(r[S['Inspection date']]), crew: r[S.Crew], supervisor: r[S.Supervisor], pdf: r[S['PDF link']],
    myoshRef: r[S['MYOSH ref']], myoshAt: iso_(r[S['MYOSH entered']]), myoshBy: r[S['MYOSH by']] });
  const sent = allSent.filter(r => mk(r[0]) === month).map(sentOut);
  const open = rows_(ss.getSheetByName('Status')).filter(r => r[7] === 'draft' || r[7] === 'outbox').map(r => ({
    name: r[1], no: no_(r[2]), title: r[3], location: r[4], started: iso_(r[5]), updated: iso_(r[6]), state: r[7] }));
  // 6-month trend, built from the log so every phone sees the same numbers
  const months = []; const base = new Date(+month.slice(0, 4), +month.slice(5, 7) - 1, 1);
  for (let i = 5; i >= 0; i--) months.push(Utilities.formatDate(new Date(base.getFullYear(), base.getMonth() - i, 1), TZ, 'yyyy-MM'));
  const trend = months.map(k => { const L = allSent.filter(r => mk(r[0]) === k); const pc = L.map(r => r[S['Compliance %']]).filter(x => x !== '' && x != null);
    return { month: k, inspections: L.length, ua: sum_(L, 9), ni: sum_(L, 10), snn: sum_(L, 11), avgPct: pc.length ? Math.round(pc.reduce((a, b) => a + Number(b), 0) / pc.length) : null }; });
  const findings = rows_(ss.getSheetByName('Findings')).filter(r => r[0]).slice(-2500).map(findingOut_);
  const myoshPending = allSent.filter(r => !r[S['MYOSH ref']] && r[3]).slice(-300).map(sentOut);
  return out_({ ok: true, v: 3, month, sent, open, trend, findings, myoshPending, generated: new Date().toISOString() });
}

function findingOut_(r) {
  const H = idx_(FIND_HEAD); const g = k => r[H[k]];
  return { fid: g('FID'), reportId: g('Report ID'), uid: g('UID'), raised: iso_(g('Raised')), inspDate: dstr_(g('Inspection date')), by: g('Raised by'), no: no_(g('No')),
    title: g('Inspection'), location: g('Location'), crew: g('Crew'), item: String(g('Item') || ''), text: g('Item text'), rating: g('Rating'), snn: g('SNN'),
    cons: g('Consequence'), like: g('Likelihood'), score: g('Risk score'), level: g('Risk level'), finding: g('Finding'), action: g('Corrective action'),
    status: g('Status'), owner: g('Owner'), due: dstr_(g('Due')), closedAt: iso_(g('Closed at')), closedBy: g('Closed by'), note: g('Close-out note'),
    evidence: g('Evidence link'), verifiedAt: iso_(g('Verified at')), verifiedBy: g('Verified by'), updated: iso_(g('Updated')),
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
  const S = idx_(SENT_HEAD); const myosh = allSent.filter(r => r[3] && !r[S['MYOSH ref']]).length;
  const td = 'style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px"', th = 'style="background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const t = (rows, cols) => rows.length ? `<table style="border-collapse:collapse;width:100%"><tr>${cols.map(c => `<th ${th}>${c}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(v => `<td ${td}>${esc_(v)}</td>`).join('')}</tr>`).join('')}</table>` : '<p style="font-size:13px">None.</p>';
  const fmt = v => Utilities.formatDate(new Date(v), TZ, 'dd/MM HH:mm');
  const st = s => s === 'outbox' ? 'Finished – waiting for signal' : 'Started – not sent';
  const dmy = s => s ? s.split('-').reverse().join('/') : '';
  const byName = {}; sentToday.forEach(r => { byName[r[5]] = (byName[r[5]] || []).concat(`${no_(r[6])} ${r[7]}`); });
  const tile = (n, l, c) => `<td style="padding:10px;text-align:center;border:1px solid #D0D5DD"><div style="font-size:22px;font-weight:700;color:${c}">${n}</div><div style="font-size:11px;color:#5B6675">${l}</div></td>`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1B2430;max-width:820px">
    <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700">PARRON | DAILY SUMMARY</div><div style="font-size:18px;font-weight:700">${Utilities.formatDate(now, TZ, 'EEEE d MMMM yyyy')}</div></div>
    <table style="border-collapse:collapse;width:100%;margin:12px 0"><tr>${tile(sentToday.length, 'Sent today', '#2E7D32')}${tile(open.length, 'Not sent', '#C62828')}${tile(overdue.length, 'Actions overdue', '#C62828')}${tile(toVerify.length, 'Awaiting verification', '#E39A00')}${tile(myosh, 'Not yet in MYOSH', '#112B4E')}</tr></table>
    <h3 style="color:#C62828">Not sent – started today (${openToday.length})</h3>${t(openToday.map(r => [r[1], `${no_(r[2])} ${r[3]}`, r[4], fmt(r[5]), st(r[7])]), ['Name', 'Inspection', 'Location', 'Started', 'Status'])}
    <h3 style="color:#C62828">Still not sent – from earlier days (${openOlder.length})</h3>${t(openOlder.map(r => [r[1], `${no_(r[2])} ${r[3]}`, r[4], fmt(r[5]), st(r[7])]), ['Name', 'Inspection', 'Location', 'Started', 'Status'])}
    <h3 style="color:#C62828">Corrective actions overdue (${overdue.length})</h3>${t(overdue.map(f => [f.reportId + ' / ' + f.item, f.level || f.rating, f.action, f.owner || 'TBC', dmy(f.due)]), ['Finding', 'Risk', 'Corrective action', 'Owner', 'Due'])}
    <h3 style="color:#2E7D32">Sent today (${sentToday.length})</h3>${t(Object.keys(byName).sort().map(k => [k, byName[k].length, byName[k].join(', ')]), ['Name', 'Count', 'Inspections'])}
    <p style="font-size:12px;color:#5B6675">Full log: <a href="${ss.getUrl()}">PARRON – Inspection Log</a></p></div>`;
  MailApp.sendEmail({ to: TO, subject: `PARRON daily summary ${Utilities.formatDate(now, TZ, 'dd/MM/yyyy')} – ${open.length} not sent, ${sentToday.length} sent, ${overdue.length} actions overdue`, htmlBody: html, body: 'Open in an HTML email client.', name: 'PARRON Site Inspections' });
}

/* ---------- helpers ---------- */
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
