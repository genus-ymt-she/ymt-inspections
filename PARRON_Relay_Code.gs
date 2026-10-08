/**
 * PARRON relay – emails inspection reports sent from the PARRON app.
 * Paste this whole file into a Google Apps Script project (script.google.com),
 * run testSend once to authorise, then Deploy > New deployment > Web app.
 */
const TO = 'darren.frizzell@genus.com.au';          // where every report goes
const KEY = 'prn-ymt-7Qk2vX9m';                      // must match "key" in config.json
const ALLOWED = /@genus\.com\.au$/i;                 // the app may only redirect to Genus addresses

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.key !== KEY) return out_({ ok: false, error: 'Not authorised' });

    // The app may retry after a weak-signal send; never email the same inspection twice.
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
    if (uid) cache.put('sent_' + uid, '1', 21600);   // remember for 6 hours
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  }
}

function doGet() {
  return out_({ ok: true, service: 'PARRON relay', emailsLeftToday: MailApp.getRemainingDailyQuota() });
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to authorise the script and confirm email arrives. */
function testSend() {
  MailApp.sendEmail(TO, 'PARRON relay test', 'If you can read this, the PARRON relay is working.');
}
