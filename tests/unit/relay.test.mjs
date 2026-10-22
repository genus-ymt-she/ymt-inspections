// Runs the real relay (PARRON_Relay_Code.gs) against in-memory Google services.
import test from "node:test";
import assert from "node:assert/strict";
import { createRelay } from "../gas-mock.mjs";

const report = (over = {}) => ({
  key: "prn-ymt-7Qk2vX9m", uid: "d1", reportId: "YMT-01-20261011-0930-TI", to: "darren.frizzell@genus.com.au",
  subject: "YMT Inspection | 01", text: "body", html: "<p>body</p>", filename: "r.pdf", pdf: Buffer.from("%PDF-1.4 test").toString("base64"),
  meta: { name: "Test Inspector", no: "01", title: "Site Office, Amenities & First Aid", location: "Laydown 2", ua: 1, ni: 1, snn: 1, started: new Date().toISOString() },
  report: { c: 20, na: 2, pct: 91, inspDate: "2026-10-11T09:30", crew: "Civil crew", supervisor: "S. Boss" },
  findings: [
    { fid: "YMT-01-20261011-0930-TI|1.1", item: "1.1", text: "Notice board current", rating: "NI", snn: "", cons: 2, like: 3, score: 6, level: "Medium", finding: "ERP out of date", action: "Replace ERP", status: "open", owner: "Site Supervisor", ownerEmail: "Sam.Super@genus.com.au", due: "2026-10-20" },
    { fid: "YMT-01-20261011-0930-TI|1.2", item: "1.2", text: "First aid kit", rating: "UA", snn: "Foundations", cons: 4, like: 4, score: 16, level: "Critical", finding: "Kit empty", action: "Restock", status: "spot", taken: "Restocked from store" }
  ], ...over
});

test("rejects requests without the app key", () => {
  const r = createRelay();
  assert.equal(r.post({ ...report(), key: "wrong" }).ok, false);
  assert.equal(r.get({ action: "dashboard", key: "nope" }).ok, false);
});

test("v2-style report is emailed and logged (backward compatible)", () => {
  const r = createRelay();
  const old = report(); delete old.report; delete old.findings;
  const res = r.post(old);
  assert.equal(res.ok, true);
  assert.equal(r.mail.length, 1);
  assert.equal(r.sheet("Sent").getLastRow(), 2);
  assert.equal(r.sheet("Findings").getLastRow(), 1); // header only
  assert.equal(r.post(old).duplicate, true, "same uid is not emailed twice");
  assert.equal(r.mail.length, 1);
});

test("v3 report logs findings, archives the PDF and feeds the dashboard", () => {
  const r = createRelay();
  const res = r.post(report());
  assert.equal(res.ok, true);
  assert.match(res.pdf, /drive\.google\.com/);
  const j = r.get({ action: "dashboard", key: r.key });
  assert.equal(j.v, 3);
  assert.equal(j.findings.length, 2);
  const open = j.findings.find(f => f.item === "1.1");
  assert.equal(open.status, "Open"); assert.equal(open.due, "2026-10-20"); assert.equal(open.level, "Medium"); assert.equal(open.no, "01");
  assert.equal(j.findings.find(f => f.item === "1.2").status, "Closed on spot");
  assert.equal(j.sent[0].pct, 91);
  assert.equal(j.sent[0].supervisor, "S. Boss");
  assert.equal(j.trend.length, 6);
});

test("assignee is emailed their action with a link to close it out", () => {
  const r = createRelay();
  r.post(report());
  const m = r.mail.find(x => x.to === "sam.super@genus.com.au");
  assert.ok(m, "assignment email sent");
  assert.match(m.subject, /Action assigned to you/);
  assert.match(m.htmlBody, /#actions\/YMT-01-20261011-0930-TI%7C1\.1/);
  const f = r.get({ action: "dashboard", key: r.key }).findings.find(x => x.item === "1.1");
  assert.equal(f.ownerEmail, "sam.super@genus.com.au"); assert.ok(f.notified);
});

test("action emails only go to allowed domains", () => {
  const r = createRelay();
  r.post(report({ findings: [{ ...report().findings[0], ownerEmail: "someone@gmail.com" }] }));
  assert.equal(r.mail.filter(x => x.to === "someone@gmail.com").length, 0);
  assert.equal(r.get({ action: "dashboard", key: r.key }).findings[0].ownerEmail, "");
});

test("reassigning emails the new person; close-out emails the SHE Manager", () => {
  const r = createRelay({ pin: "2468" });
  r.post(report());
  const fid = "YMT-01-20261011-0930-TI|1.1";
  assert.equal(r.post({ key: r.key, action: "finding", fid, op: "edit", by: "Darren", owner: "Pat New", ownerEmail: "pat.new@genus.com.au", pin: "2468" }).ok, true);
  assert.ok(r.mail.find(x => x.to === "pat.new@genus.com.au"), "new owner emailed");
  r.post({ key: r.key, action: "finding", fid, op: "close", by: "Pat New", note: "Done" });
  const m = r.mail.at(-1); assert.equal(m.to, "darren.frizzell@genus.com.au"); assert.match(m.subject, /please verify/);
});

test("close-out needs a name; verify / re-open need the Manager PIN", () => {
  const r = createRelay({ pin: "2468" });
  r.post(report());
  const fid = "YMT-01-20261011-0930-TI|1.1";
  assert.equal(r.post({ key: r.key, action: "finding", fid, op: "close", by: "" }).ok, false);
  const c = r.post({ key: r.key, action: "finding", fid, op: "close", by: "Alex Smith", note: "ERP replaced", photo: Buffer.from("jpg").toString("base64") });
  assert.equal(c.ok, true); assert.equal(c.finding.status, "Closed"); assert.match(c.finding.evidence, /drive/);
  assert.equal(r.post({ key: r.key, action: "finding", fid, op: "verify", by: "Darren", pin: "0000" }).ok, false);
  const v = r.post({ key: r.key, action: "finding", fid, op: "verify", by: "Darren", pin: "2468" });
  assert.equal(v.ok, true); assert.equal(v.finding.status, "Verified");
  assert.deepEqual(v.finding.history.map(h => h.op), ["raised", "close", "verify"]);
  // text columns survive the write-back (no "01" -> 1 or "1.1" -> 1.1 conversion)
  const j = r.get({ action: "dashboard", key: r.key });
  const f = j.findings.find(x => x.fid === fid);
  assert.equal(f.item, "1.1"); assert.equal(f.no, "01"); assert.equal(f.due, "2026-10-20");
});

test("PIN check rejects when no PIN is configured and locks after 10 failures", () => {
  assert.equal(createRelay({ pin: "" }).post({ key: "prn-ymt-7Qk2vX9m", action: "pin", pin: "" }).ok, false);
  const r = createRelay({ pin: "2468" });
  for (let i = 0; i < 10; i++) r.post({ key: r.key, action: "pin", pin: "x" });
  assert.equal(r.post({ key: r.key, action: "pin", pin: "2468" }).ok, false, "locked out");
});

test("daily digest lists overdue actions and reminds the owner", () => {
  const r = createRelay();
  r.post(report({ findings: [{ ...report().findings[0], due: "2020-01-01" }] }));
  const before = r.mail.length;
  r.ctx.dailyDigest();
  const sent = r.mail.slice(before);
  const rem = sent.find(x => x.to === "sam.super@genus.com.au");
  assert.ok(rem, "owner reminder"); assert.match(rem.subject, /overdue/);
  const m = sent.find(x => x.to === "darren.frizzell@genus.com.au");
  assert.match(m.subject, /1 actions overdue/);
  assert.match(m.htmlBody, /Replace ERP/);
});

test("setup sends a confirmation and reports missing PIN", () => {
  const r = createRelay({ pin: "" });
  r.ctx.setup();
  assert.match(r.mail.at(-1).body, /NOT SET/);
});

test("UA or Critical finding sends an urgent alert to the SHE Manager and the supervisor", () => {
  const r = createRelay();
  r.post(report({ alert: { supervisorEmail: "matt.smith@genus.com.au" } }));
  const a = r.mail.find(m => /^URGENT/.test(m.subject || ""));
  assert.ok(a, "urgent alert sent");
  assert.match(a.to, /darren\.frizzell@genus\.com\.au/); assert.match(a.to, /matt\.smith@genus\.com\.au/);
  assert.match(a.htmlBody, /Kit empty/);
});

test("no urgent alert when findings are only NI below Critical", () => {
  const r = createRelay();
  r.post(report({ findings: [report().findings[0]] }));
  assert.equal(r.mail.filter(m => /^URGENT/.test(m.subject || "")).length, 0);
});

test("hazard report is logged, emailed with photos, added to the action register and alerts if Critical", () => {
  const r = createRelay();
  const res = r.post({ key: r.key, action: "observation", uid: "o1", reportId: "YMT-HZ-20261011-1000-MS", subject: "Hazard report", html: "<p>h</p>", text: "h",
    meta: { name: "Matt Smith", no: "HZ", title: "Hazard report", location: "Cowalla Rd" },
    obs: { type: "hazard", description: "Unbunded fuel drum near drain", immediate: "Area barricaded" },
    photos: [Buffer.from("jpg").toString("base64")],
    findings: [{ fid: "YMT-HZ-20261011-1000-MS|HZ", item: "HZ", text: "Unbunded fuel drum near drain", rating: "UA", cons: 4, like: 4, score: 20, level: "Critical", finding: "Unbunded fuel drum near drain", action: "Bund the drum", status: "open", owner: "Paul Delaney", ownerEmail: "paul.delaney@genus.com.au", due: "2026-10-12" }] });
  assert.equal(res.ok, true);
  assert.equal(r.sheet("Observations").getLastRow(), 2);
  const rep = r.mail.find(m => m.subject === "Hazard report"); assert.equal(rep.attachments.length, 1);
  assert.ok(r.files.find(f => f.folder.includes("Observations")), "photo archived");
  const j = r.get({ action: "dashboard", key: r.key });
  assert.equal(j.obs.length, 1); assert.equal(j.obs[0].type, "hazard");
  assert.equal(j.findings[0].status, "Open"); assert.equal(j.findings[0].no, "HZ");
  assert.ok(r.mail.find(m => m.to === "paul.delaney@genus.com.au"), "owner emailed");
  assert.ok(r.mail.find(m => /^URGENT/.test(m.subject || "")), "critical alert");
});

test("positive observation is logged but creates no action", () => {
  const r = createRelay();
  r.post({ key: r.key, action: "observation", uid: "o2", reportId: "YMT-PO-1", subject: "Positive observation", html: "<p>p</p>", text: "p",
    meta: { name: "Anphin Thomas", location: "Laydown" }, obs: { type: "positive", description: "Crew stopped work for wind", category: "Speaking up / stop work", recognised: "Civil crew A" } });
  const j = r.get({ action: "dashboard", key: r.key });
  assert.equal(j.obs[0].type, "positive"); assert.equal(j.findings.length, 0);
});


test("weekly summary goes only to the SHE Manager with activity per person", () => {
  const r = createRelay();
  r.post(report());
  const before = r.mail.length; r.ctx.weeklyDigest();
  const w = r.mail.slice(before).filter(m => /weekly summary/.test(m.subject)); assert.equal(w.length, 1);
  assert.equal(w[0].to, "darren.frizzell@genus.com.au");
  assert.match(w[0].htmlBody, /Activity by person/); assert.match(w[0].htmlBody, /Test Inspector/); assert.doesNotMatch(w[0].htmlBody, /target/i);
});

const BOM_XML = `<?xml version="1.0"?><product><amoc><issue-time-local tz="WST">2026-10-11T16:20:00+08:00</issue-time-local></amoc><forecast>
<area aac="WA_PW009" description="Central West" type="public-district"><forecast-period index="0"><text type="forecast">Sunny.</text></forecast-period></area>
<area aac="WA_FW010" description="Lower West Inland" type="fire-district"><forecast-period index="0"><text type="fire_danger">Moderate</text></forecast-period><forecast-period index="1"><text type="fire_danger">High</text></forecast-period></area>
<area aac="WA_FW007" description="Lesueur" type="fire-district"><forecast-period index="0" start-time-local="2026-10-11T00:00:00+08:00"><text type="fire_danger">High</text></forecast-period><forecast-period index="1"><text type="fire_danger">Extreme</text></forecast-period></area>
</forecast></product>`;

test("Fire Danger Rating is read from the BoM fire-district areas (Lesueur by default – Hill River site)", () => {
  const seen = [];
  const r = createRelay({ fetch: (url) => { seen.push(url); return /IDW15100/.test(url) && url.startsWith("https") ? { body: BOM_XML } : null; } });
  const j = r.get({ action: "weather", key: r.key });
  assert.equal(j.ok, true);
  assert.equal(j.fdr.area, "Lesueur"); assert.equal(j.fdr.today, "High"); assert.equal(j.fdr.tomorrow, "Extreme");
  assert.deepEqual(j.fdr.areas, ["Lower West Inland", "Lesueur"]); assert.equal(j.fdr.want, "");
  assert.equal(j.fdr.source, "Bureau of Meteorology");
  assert.ok(seen.some(u => /reg\.bom\.gov\.au\/fwo\/IDW15100/.test(u)), "reads the fire-district product");
  assert.equal(r.get({ action: "weather", key: "bad" }).ok, false);
});

test("SHE Manager can choose the district or set today's FDR by hand (PIN)", () => {
  const r = createRelay({ fetch: () => ({ body: BOM_XML }) });
  assert.equal(r.post({ key: r.key, action: "fdr", area: "Lower West Inland", pin: "nope" }).ok, false);
  let j = r.post({ key: r.key, action: "fdr", area: "Lower West Inland", pin: "2468" });
  assert.equal(j.ok, true); assert.equal(j.fdr.area, "Lower West Inland"); assert.equal(j.fdr.today, "Moderate"); assert.equal(j.fdr.want, "Lower West Inland");
  j = r.post({ key: r.key, action: "fdr", rating: "Extreme", by: "Darren Frizzell", pin: "2468" });
  assert.equal(j.fdr.today, "Extreme"); assert.equal(j.fdr.manual, true); assert.match(j.fdr.source, /Darren/);
  assert.equal(r.get({ action: "weather", key: r.key }).fdr.today, "Extreme");
});

test("FDR unavailable is reported cleanly when the BoM cannot be reached", () => {
  const r = createRelay();
  const j = r.get({ action: "weather", key: r.key });
  assert.equal(j.ok, true); assert.equal(j.fdr.today, ""); assert.deepEqual(j.fdr.areas, []);
});

test("repeating reminders are saved and emailed only on the day they fall due", () => {
  const r = createRelay();
  const now = new Date(); const perth = new Date(now.getTime() + 8 * 3600e3);
  const dom = perth.getUTCDate(); const dow = perth.getUTCDay();
  assert.equal(r.post({ key: r.key, action: "reminder", id: "rem-abc123", name: "Darren Frizzell", email: "x@gmail.com", text: "Re-print SWMS", rule: { type: "monthly", dom } }).ok, false, "only genus emails");
  assert.equal(r.post({ key: r.key, action: "reminder", id: "rem-abc123", name: "Darren Frizzell", email: "darren.frizzell@genus.com.au", text: "Re-print the SWMS", rule: { type: "monthly", dom }, time: "06:30" }).ok, true);
  r.post({ key: r.key, action: "reminder", id: "rem-other1", name: "Darren Frizzell", email: "darren.frizzell@genus.com.au", text: "Not today", rule: { type: "weekly", dow: (dow + 3) % 7 } });
  const before = r.mail.length; r.ctx.remindersRun();
  const sent = r.mail.slice(before);
  assert.equal(sent.length, 1); assert.match(sent[0].subject, /Re-print the SWMS/); assert.equal(sent[0].to, "darren.frizzell@genus.com.au");
  r.ctx.remindersRun(); assert.equal(r.mail.length, before + 1, "not sent twice in one day");
  r.post({ key: r.key, action: "reminder", id: "rem-abc123", op: "delete" });
  assert.equal(r.sheet("Reminders").getRange(2, 9).getValue(), "No");
});

test("monthly reminder on the 31st falls on the last day of shorter months", () => {
  const r = createRelay();
  const d = new Date("2026-02-28T02:00:00Z"); // 28 Feb 2026, 10 am Perth
  assert.equal(r.ctx.occurs_({ type: "monthly", dom: 31 }, d), true);
  assert.equal(r.ctx.occurs_({ type: "monthly", dom: 27 }, d), false);
  assert.equal(r.ctx.occurs_({ type: "weekdays" }, d), false, "Saturday");
});

const fuelReport = (date, uid, rows) => ({ key: "prn-ymt-7Qk2vX9m", uid, reportId: `YMT-28-${date.replace(/-/g, "")}-1600-JM-${uid}`, to: "amie.smith@genus.com.au,darren.frizzell@genus.com.au",
  subject: "YMT Fuel, Hours & Pre-Start Register", text: "b", html: "<p>b</p>", filename: "f.pdf", pdf: Buffer.from("%PDF-1.4").toString("base64"),
  meta: { name: "Jayden Mullan", no: "28", title: "Fuel, Hours & Pre-Start Register", location: "PWF" }, report: {}, findings: [],
  fuel: { date, by: "Jayden Mullan", position: "TA", amAt: "06:10", pmAt: "16:00", total: 0, verifiedBy: "Matt Smith", rows } });
const perthISO = n => new Date(Date.now() + 8 * 3600e3 - n * 864e5).toISOString().slice(0, 10);

test("fuel register goes to the Project Admin and SHE Manager, and is logged per asset", () => {
  const r = createRelay();
  const res = r.post(fuelReport(perthISO(1), "f1", [{ id: "WL46", desc: "I.T Loader", pre: "Y", basis: "Daily", hs: "8567.3", he: "8575.1", hrs: 7.8, flow: "", fuel: 40, cmt: "Fuelled pod" },
    { id: "GEN01", desc: "Wheel Wash Genset", pre: "N/A", basis: "", hs: "", he: "", hrs: "", flow: "", fuel: "", cmt: "" }]));
  assert.equal(res.ok, true);
  assert.equal(r.mail[0].to, "amie.smith@genus.com.au,darren.frizzell@genus.com.au");
  assert.equal(r.sheet("Fuel").getLastRow(), 3);
  assert.equal(r.sheet("Fuel").getRange(2, 13).getValue(), 40);
});

test("only project addresses are accepted in a recipient list", () => {
  const r = createRelay();
  r.post({ ...report(), to: "someone@evil.com,amie.smith@genus.com.au" });
  assert.equal(r.mail[0].to, "amie.smith@genus.com.au");
  r.post({ ...report(), uid: "d2", to: "someone@evil.com" });
  assert.equal(r.mail.at(-1).to, "darren.frizzell@genus.com.au");
});

test("Monday fuel summary totals last week by asset, keeps the latest register per day and attaches a CSV", () => {
  const r = createRelay();
  const row = (fuel, hrs, pre = "Y") => ({ id: "WL46", desc: "I.T Loader", pre, basis: "Daily", hs: "1", he: "2", hrs, flow: "", fuel, cmt: "" });
  r.post(fuelReport(perthISO(2), "a", [row(40, 8)]));
  r.post(fuelReport(perthISO(3), "b", [row(10, 2)]));
  r.post(fuelReport(perthISO(3), "c", [row(30, 6, "N")]));  // re-sent later the same day – replaces "b"
  r.post(fuelReport(perthISO(20), "old", [row(999, 99)])); // outside the week
  const before = r.mail.length; r.ctx.weeklyDigest();
  const m = r.mail.slice(before).find(x => /fuel/i.test(x.subject));
  assert.ok(m, "fuel summary sent"); assert.equal(m.to, "amie.smith@genus.com.au"); assert.equal(m.cc, "darren.frizzell@genus.com.au");
  assert.match(m.subject, /70 L/); assert.match(m.htmlBody, /Totals by asset/); assert.match(m.htmlBody, /WL46 I.T Loader/);
  assert.doesNotMatch(m.htmlBody, /999/); assert.equal(m.attachments[0].type, "text/csv");
});

test("site access code: when SITE_CODE is set, sends and reads need it (not case-sensitive)", () => {
  const r = createRelay();
  assert.equal(r.post(report()).ok, true);                       // no code set – open as before
  r.props.set("SITE_CODE", "Parron26");
  const no = r.post({ ...report(), uid: "x2" }); assert.equal(no.ok, false); assert.equal(no.needCode, true);
  assert.equal(r.get({ action: "dashboard", key: r.key }).needCode, true);
  assert.equal(r.get({ action: "weather", key: r.key }).needCode, true);
  assert.equal(r.post({ ...report(), uid: "x3", code: " parron26 " }).ok, true);
  assert.equal(r.get({ action: "dashboard", key: r.key, code: "PARRON26" }).ok, true);
  assert.equal(r.get({}).ok, true);                               // connection check still answers
});

test("hazard and positive reports can be listed and their photos opened (only report photos)", () => {
  const r = createRelay();
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64");
  r.post({ key: r.key, action: "observation", uid: "o1", reportId: "YMT-HZ-1", subject: "s", text: "t", html: "h", meta: { name: "Matt Smith", location: "Laydown 2" },
    obs: { type: "hazard", description: "Open trench, no barricade", immediate: "Barricaded" }, photos: [jpg, jpg],
    findings: [{ fid: "YMT-HZ-1|HZ", item: "HZ", text: "Open trench", rating: "NI", cons: 3, like: 3, score: 14, level: "High", finding: "Open trench", action: "Install barricade", status: "open", owner: "Paul Delaney", due: "2026-10-20" }] });
  r.post({ key: r.key, action: "observation", uid: "o2", reportId: "YMT-PO-1", subject: "s", text: "t", html: "h", meta: { name: "Lee Allen", location: "Office" }, obs: { type: "positive", description: "Great housekeeping", recognised: "Civil crew" } });
  const j = r.get({ action: "reports", key: r.key }); assert.equal(j.ok, true); assert.equal(j.reports.length, 2);
  assert.equal(j.reports[0].reportId, "YMT-PO-1"); const hz = j.reports[1];
  assert.equal(hz.type, "hazard"); assert.equal(hz.level, "High"); assert.equal(hz.immediate, "Barricaded"); assert.equal(hz.owner, "Paul Delaney"); assert.equal(hz.photos.length, 2);
  const ph = r.get({ action: "photo", key: r.key, id: hz.photos[0] }); assert.equal(ph.ok, true); assert.equal(ph.data, jpg);
  assert.equal(r.get({ action: "photo", key: r.key, id: "999" }).ok, false);        // not a report photo
  assert.equal(r.get({ action: "reports", key: "bad" }).ok, false);
});

import { EVENTS, BIRTHS } from "../fixtures/onthisday.mjs";
const BAD = ["murder", "massacre", "killed", "killing", "terrorist", "bombing", "shooting", "assassinat", "executed", "genocide", "rape", "suicide", "war crime", "hostage", "behead"];

test("site status: PIN required, every change kept as a row, today's history returned", () => {
  const r = createRelay();
  assert.match(r.post({ key: r.key, action: "setStatus", pin: "1234", fdr: "High", tfb: "No", hvmb: "Yes", type: "Morning", by: "Gary A" }).error, /STATUS_PIN/);
  r.props.set("STATUS_PIN", "4321");
  const bad = r.post({ key: r.key, action: "setStatus", pin: "1111", fdr: "High", tfb: "No", hvmb: "Yes", type: "Morning", by: "Gary A" });
  assert.equal(bad.ok, false); assert.equal(bad.badPin, true);
  assert.equal(r.post({ key: r.key, action: "setStatus", pin: "4321", fdr: "Hot", tfb: "No", hvmb: "Yes", type: "Morning", by: "Gary A" }).ok, false);   // invalid FDR
  const a = r.post({ key: r.key, action: "setStatus", pin: "4321", fdr: "high", tfb: "No", hvmb: "Yes", type: "Morning", by: "Gary A", note: "Pre-start" });
  assert.equal(a.ok, true); assert.equal(a.status.fdr, "High"); assert.equal(a.status.hvmb, "Yes"); assert.equal(a.status.type, "Morning");
  r.post({ key: r.key, action: "setStatus", pin: "4321", fdr: "Extreme", tfb: "Yes", hvmb: "Yes", type: "Change", by: "Matt S" });
  const g = r.get({ action: "getStatus", key: r.key });
  assert.equal(g.ok, true); assert.equal(g.status.fdr, "Extreme"); assert.equal(g.today.length, 2); assert.equal(r.sheet("Site Status").getLastRow(), 3);
  // 6 pm summary: status history at the top, flagged when there is no midday re-check
  const before = r.mail.length; r.ctx.dailyDigest();
  const m = r.mail.slice(before).find(x => /daily summary/.test(x.subject));
  assert.match(m.htmlBody, /Morning: High · TFB No · HVMB Yes – Gary A/); assert.match(m.htmlBody, /No midday re-check recorded/);
});

test("this day in history: three suitable facts (AU, science, general), saved for today, emailed when HISTORY_EMAIL is set", () => {
  const r = createRelay({ fetch: url => /onthisday\/events/.test(url) ? { body: JSON.stringify(EVENTS) } : /births/.test(url) ? { body: JSON.stringify(BIRTHS) } : null });
  r.props.set("HISTORY_EMAIL", "gary.armitage@genus.com.au");
  const h = r.ctx.prepareHistory();
  assert.equal(h.ok, true); assert.equal(h.facts.length, 3);
  for (const f of h.facts) { assert.ok(!BAD.some(w => f.text.toLowerCase().includes(w)), f.text); assert.ok(f.link.startsWith("https://en.wikipedia.org/")); }
  assert.ok(h.facts.some(f => /Australia|Sydney|Perth/.test(f.text)), "one Australian fact");
  assert.ok(h.facts.some(f => /Space|rocket|telescope|balloon|flight/i.test(f.text)), "one science / exploration fact");
  assert.equal(new Set(h.facts.map(f => Math.floor(f.year / 100))).size, 3, "spread across centuries");
  assert.ok(h.pool.length >= 2); assert.ok(!h.pool.some(f => BAD.some(w => f.text.toLowerCase().includes(w))));
  assert.equal(r.sheet("This Day").getLastRow(), 2);
  const m = r.mail.find(x => /Pre-start – This day in history/.test(x.subject)); assert.ok(m); assert.equal(m.to, "gary.armitage@genus.com.au");
  const g = r.get({ action: "getHistory", key: r.key }); assert.equal(g.ok, true); assert.deepEqual(JSON.parse(JSON.stringify(g.facts.map(f => f.text))), JSON.parse(JSON.stringify(h.facts.map(f => f.text))));
  assert.equal(r.sheet("This Day").getLastRow(), 2, "read back, not fetched again");
});

test("getHistory fetches on demand when the trigger has not run; tops up from births when few events", () => {
  const few = { events: [EVENTS.events[3]] };
  const r = createRelay({ fetch: url => /events/.test(url) ? { body: JSON.stringify(few) } : /births/.test(url) ? { body: JSON.stringify(BIRTHS) } : null });
  const g = r.get({ action: "getHistory", key: r.key });
  assert.equal(g.ok, true); assert.equal(g.facts.length, 2); assert.match(g.facts[1].text, /^Born: Jane Example/);
  assert.equal(createRelay().get({ action: "getHistory", key: "x" }).ok, false);
});

test("setup creates the 4–5 am history trigger alongside the others", () => {
  const r = createRelay(); r.ctx.setup();
  assert.deepEqual(r.triggers.sort(), ["dailyDigest", "lightningRun", "prepareHistory", "remindersRun", "weeklyDigest"]);
});

const perthYmd = (n = 0) => new Date(Date.now() + 8 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const alertPayload = (o = {}) => ({ key: "prn-ymt-7Qk2vX9m", action: "publishAlert", pin: "2468", type: "SHEQ Alert", priority: "Critical", title: "Underground service strike",
  what: "An excavator contacted a live LV cable.", must: "Pothole before digging.", by: "Darren Frizzell", required: ["Lee Allen", "Darren Frizzell"], notify: ["lee.allen@genus.com.au", "someone@evil.com", "darren.frizzell@genus.com.au"], ...o });

test("SHEQ alerts: Manager PIN required, numbered, emailed to the team (project addresses only)", () => {
  const r = createRelay();
  const bad = r.post(alertPayload({ pin: "0000" })); assert.equal(bad.ok, false); assert.equal(bad.badPin, true);
  assert.equal(r.post(alertPayload({ title: "" })).ok, false);
  const b0 = r.mail.length; const a = r.post(alertPayload());
  assert.equal(a.ok, true); assert.match(a.id, /^SA-\d{4}-001$/); assert.equal(a.alerts[0].title, "Underground service strike"); assert.equal(a.alerts[0].active, true);
  const sent = r.mail.slice(b0); const m = sent[0];
  assert.deepEqual(sent.map(x => x.to), ["darren.frizzell@genus.com.au", "lee.allen@genus.com.au"], "one email each, project addresses only, no BCC");
  assert.ok(sent.every(x => !x.bcc)); assert.match(m.subject, /^CRITICAL – SHEQ Alert: Underground service strike/); assert.match(m.htmlBody, /#alerts\/SA-/);
  assert.match(a.emailed, /emailed 2 of 2$/); assert.match(a.alerts[0].emailed, /emailed 2 of 2$/);
  const b = r.post(alertPayload({ priority: "Info", title: "Site notice", type: "Site notice", email: false }));
  assert.match(b.id, /-002$/); assert.equal(r.mail.length, b0 + 2, "no email when switched off");
  assert.equal(r.get({ action: "alerts", key: r.key }).alerts.length, 2);
});

test("SHEQ alerts: acknowledged once per person; daily summary lists who of the people ticked is outstanding", () => {
  const r = createRelay();
  const id = r.post(alertPayload({ required: ["Darren Frizzell", "Lee Allen", "Jayden Mullan"] })).id;
  const ack = r.post({ key: r.key, action: "ackAlert", id, name: "Darren Frizzell" });
  assert.equal(ack.ok, true); assert.equal(ack.alerts[0].acks.length, 1);
  r.post({ key: r.key, action: "ackAlert", id, name: " darren  frizzell " });                     // same person again
  assert.equal(r.sheet("Alert Acks").getLastRow(), 2);
  assert.equal(r.post({ key: r.key, action: "ackAlert", id, name: "" }).ok, false);
  assert.equal(r.post({ key: r.key, action: "ackAlert", id: "SA-0000-999", name: "Lee Allen" }).ok, false);
  const before = r.mail.length; r.ctx.dailyDigest();
  const d = r.mail.slice(before).find(x => /daily summary/.test(x.subject)).htmlBody;
  assert.match(d, /SHEQ Alerts – not yet acknowledged/); assert.match(d, /1 of 3/); assert.match(d, /Lee Allen, Jayden Mullan/);
  // closing the alert takes it off the daily summary
  assert.equal(r.post({ key: r.key, action: "closeAlert", id, pin: "1" }).ok, false);
  const c = r.post({ key: r.key, action: "closeAlert", id, pin: "2468" }); assert.equal(c.alerts[0].active, false);
  const b2 = r.mail.length; r.ctx.dailyDigest(); assert.doesNotMatch(r.mail.slice(b2).find(x => /daily summary/.test(x.subject)).htmlBody, /not yet acknowledged/);
  // weekly summary shows the acknowledgement rate
  const b3 = r.mail.length; r.ctx.weeklyDigest(); assert.match(r.mail.slice(b3).find(x => /weekly summary/.test(x.subject)).htmlBody, /SHEQ Alerts – acknowledgement[\s\S]*1 of 3 \(33%\)/);
});

test("SHEQ alerts: a photo or PDF attachment is stored and only alert files can be read back", () => {
  const r = createRelay(); const pdf = Buffer.from("%PDF-1.4 alert").toString("base64");
  assert.equal(r.post(alertPayload({ file: { name: "x.exe", type: "application/x-msdownload", data: pdf } })).ok, false);
  const a = r.post(alertPayload({ file: { name: "SHEQ Alert 14.pdf", type: "application/pdf", data: pdf } }));
  assert.equal(a.ok, true); const f = a.alerts[0].file; assert.ok(f); assert.equal(a.alerts[0].fileType, "application/pdf");
  const got = r.get({ action: "alertFile", key: r.key, id: f }); assert.equal(got.ok, true); assert.equal(got.data, pdf); assert.equal(got.type, "application/pdf");
  assert.equal(r.get({ action: "alertFile", key: r.key, id: "999" }).ok, false);
  r.props.set("SITE_CODE", "Parron26"); assert.equal(r.get({ action: "alerts", key: r.key }).needCode, true);
});

test("SHEQ alerts: someone must be ticked; only the people ticked are emailed and counted", () => {
  const r = createRelay();
  assert.match(r.post(alertPayload({ required: [] })).error, /Tick who must acknowledge/);
  const a = r.post(alertPayload({ required: ["Lee Allen", "Matthew Smith", "Jayden Mullan"], notify: ["lee.allen@genus.com.au", "matt.smith@genus.com.au"] }));
  assert.deepEqual(JSON.parse(JSON.stringify(a.alerts[0].required)), ["Lee Allen", "Matthew Smith", "Jayden Mullan"]);
  assert.deepEqual(r.mail.slice(-3).map(x => x.to), ["darren.frizzell@genus.com.au", "lee.allen@genus.com.au", "matt.smith@genus.com.au"]);
  const before = r.mail.length; r.ctx.dailyDigest();
  const d = r.mail.slice(before).find(x => /daily summary/.test(x.subject)).htmlBody;
  assert.match(d, /0 of 3/); assert.match(d, /Lee Allen, Matthew Smith, Jayden Mullan/); assert.doesNotMatch(d, /Nicola Rucci/);
});

/* ---------- My SHEQ Planner (obligations register) ---------- */
const ob = (o = {}) => ({ title: "Weekly DG store inspection", source: "HSDG §21", every: "1 week", owner: "Anphin Thomas", ownerEmail: "anphin.thomas@genus.com.au", lead: 2, form: "18", due: perthYmd(1), notes: "", ...o });
const plan = (r, action, o = {}) => r.post({ key: r.key, action, pin: "2468", by: "Darren Frizzell", ...o });

test("planner: frequencies roll forward correctly (month ends, years, weeks)", () => {
  const r = createRelay(); const a = r.ctx.addEvery_;
  assert.equal(a("2026-01-31", "1 month"), "2026-02-28"); assert.equal(a("2026-10-13", "1 week"), "2026-10-20"); assert.equal(a("2026-10-13", "2 weeks"), "2026-10-27");
  assert.equal(a("2026-11-30", "3 months"), "2027-02-28"); assert.equal(a("2026-10-13", "5 years"), "2031-10-13"); assert.equal(a("2026-12-31", "1 day"), "2027-01-01");
  assert.equal(a("2026-10-13", "As required"), "");
});

test("planner: Manager PIN required; import approves items; bad frequencies are skipped and reported", () => {
  const r = createRelay();
  assert.equal(plan(r, "planner", { pin: "0000" }).badPin, true);
  assert.equal(plan(r, "importOb", { pin: "1", items: [ob()] }).ok, false);
  const res = plan(r, "importOb", { items: [ob(), ob({ title: "Spill kits", every: "whenever", form: "" }), ob({ title: "Evacuation drill", every: "6 months", form: "", ownerEmail: "someone@gmail.com", due: perthYmd(20), lead: 30 })] });
  assert.equal(res.ok, true); assert.equal(res.added, 2); assert.match(res.skipped[0], /Spill kits.*frequency/);
  assert.deepEqual(res.items.map(i => i.id), ["OB-001", "OB-002"]);
  assert.equal(res.items[1].ownerEmail, "", "only Genus addresses are kept");
  assert.equal(res.items[0].approvedBy, "Darren Frizzell"); assert.equal(res.items[0].form, "18"); assert.equal(res.items[0].due, perthYmd(1));
  // not readable without the PIN, and not through the public GET
  assert.equal(r.get({ action: "planner", key: r.key }).items, undefined);
});

test("planner: mark done moves the next due date on; sending the linked form ticks it off with the report as evidence", () => {
  const r = createRelay(); plan(r, "importOb", { items: [ob(), ob({ title: "Monthly road check", every: "1 month", form: "26", owner: "Darren Frizzell", ownerEmail: "" })] });
  const d = plan(r, "doneOb", { id: "OB-002", date: perthYmd(-1), evidence: "Photos in Drive" });
  const it = d.items.find(i => i.id === "OB-002"); assert.equal(it.last, perthYmd(-1)); assert.equal(it.due, r.ctx.addEvery_(perthYmd(-1), "1 month"));
  assert.equal(d.log[0].how, "Marked done"); assert.equal(d.log[0].evidence, "Photos in Drive");
  r.post(report({ uid: "dg1", reportId: "YMT-18-20261013-0700-AT", meta: { name: "Anphin Thomas", no: "18", title: "Hazardous Chemicals", location: "DG store" } }));
  const p = plan(r, "planner"); const dg = p.items.find(i => i.id === "OB-001");
  assert.equal(dg.last, perthYmd(0)); assert.equal(dg.due, r.ctx.addEvery_(perthYmd(0), "1 week")); assert.match(dg.evidence, /^YMT-18-20261013-0700-AT https:\/\/drive/);
  assert.equal(p.log[0].how, "Form 18 sent"); assert.equal(p.log[0].by, "Anphin Thomas");
  // a different form does not tick it
  r.post(report({ uid: "x2", reportId: "YMT-01-X", meta: { name: "A", no: "01", title: "Site", location: "x" } }));
  assert.equal(plan(r, "planner").log.length, 2);
});

test("planner: edit and retire; retired items are not reminded", () => {
  const r = createRelay(); plan(r, "importOb", { items: [ob()] });
  const e = plan(r, "saveOb", { item: { ...ob({ title: "DG store inspection (weekly)", lead: 3 }), id: "OB-001" } });
  assert.equal(e.items.length, 1); assert.equal(e.items[0].title, "DG store inspection (weekly)"); assert.equal(e.items[0].lead, 3);
  assert.equal(plan(r, "saveOb", { item: { ...ob(), id: "OB-999" } }).ok, false);
  assert.equal(plan(r, "saveOb", { item: ob({ every: "Once", due: "" }) }).ok, false);
  const n = plan(r, "saveOb", { item: ob({ title: "Client audit", every: "Once", due: perthYmd(3), form: "" }) }); assert.equal(n.id, "OB-002");
  plan(r, "saveOb", { item: { ...e.items[0], id: "OB-001", status: "Retired" } });
  r.props.set("PLANNER_EMAILS", "me"); const before = r.mail.length; r.ctx.plannerDigest_(new Date());
  const m = r.mail.slice(before).find(x => /Your SHEQ day/.test(x.subject)); assert.ok(m); assert.doesNotMatch(m.htmlBody, /DG store/); assert.match(m.htmlBody, /Client audit/);
});

test("planner: 5 am email to the SHE Manager (overdue, today, week, plan ahead) and each owner gets their own items once a day", () => {
  const r = createRelay();
  plan(r, "importOb", { items: [
    ob({ title: "Spill kit inspection", every: "1 month", form: "27", due: perthYmd(-3), lead: 7 }),
    ob({ title: "DG store", due: perthYmd(0) }),
    ob({ title: "Evacuation drill", every: "6 months", form: "", owner: "Darren Frizzell", ownerEmail: "darren.frizzell@genus.com.au", due: perthYmd(16), lead: 30 }),
    ob({ title: "Far away", every: "1 year", form: "", due: perthYmd(200), lead: 30 }),
    ob({ title: "After rain", every: "As required", form: "", due: "" }) ] });
  r.props.set("PLANNER_EMAILS", "all"); const before = r.mail.length; r.ctx.remindersRun(); const M = r.mail.slice(before);
  const me = M.find(x => /^Your SHEQ day/.test(x.subject)); assert.ok(me, "manager email");
  assert.equal(me.to, "darren.frizzell@genus.com.au"); assert.match(me.subject, /1 overdue, 1 due today, 0 this week/);
  assert.match(me.htmlBody, /Overdue \(1\)[\s\S]*3 days overdue[\s\S]*Due today \(1\)[\s\S]*Plan ahead \(1\)[\s\S]*Evacuation drill/);
  assert.doesNotMatch(me.htmlBody, /Far away|After rain/); assert.match(me.htmlBody, /form 27 ticks this off/);
  const own = M.find(x => x.to === "anphin.thomas@genus.com.au"); assert.ok(own, "owner email"); assert.match(own.subject, /1 SHEQ item overdue/);
  assert.match(own.htmlBody, /Spill kit[\s\S]*DG store/); assert.doesNotMatch(own.htmlBody, /Evacuation/);
  assert.ok(!M.some(x => x.to === "darren.frizzell@genus.com.au" && /SHEQ item/.test(x.subject)), "the SHE Manager is not sent an owner email as well");
  const b2 = r.mail.length; r.ctx.remindersRun(); assert.ok(!r.mail.slice(b2).some(x => /SHEQ/.test(x.subject)), "only once a day");
});

/* ---------- inspection forms added in the app ---------- */
const tpl = (o = {}) => ({ title: "29 – Daily Haul Road Inspection", short: "Daily Haul Road Inspection", scope: "Daily haul road check.", extra: ["Road section:"], cat: "plant",
  sections: [{ name: "SURFACE", q: [{ id: "29.1", text: "Is the surface free of potholes?", ref: "TMP §6", snn: ["VD"] }] }], ...o });
test("custom forms: Manager PIN, numbered 29+, revisions, retire, served to every phone (site code applies)", () => {
  const r = createRelay(); const f = o => r.post({ key: r.key, action: "saveForm", pin: "2468", num: 29, tpl: tpl(), text: "Title: Daily Haul Road Inspection", by: "Darren Frizzell", ...o });
  assert.equal(f({ pin: "0" }).badPin, true);
  assert.equal(f({ num: 12 }).ok, false, "built-in numbers are protected");
  assert.equal(f({ tpl: tpl({ sections: [] }) }).ok, false);
  assert.match(f({ tpl: tpl({ scope: "<script>x</script>" }) }).error, /< and >/);
  const a = f(); assert.equal(a.ok, true); assert.equal(a.forms[0].rev, 0); assert.equal(a.forms[0].status, "Active"); assert.equal(a.forms[0].tpl.sections[0].q[0].id, "29.1");
  assert.equal(f().forms[0].rev, 1, "publishing again makes a new revision");
  const g = r.get({ action: "forms", key: r.key }); assert.equal(g.forms.length, 1); assert.equal(g.forms[0].text, "Title: Daily Haul Road Inspection");
  assert.equal(r.post({ key: r.key, action: "saveForm", pin: "2468", num: 29, status: "Retired" }).forms[0].status, "Retired");
  assert.equal(r.post({ key: r.key, action: "saveForm", pin: "2468", num: 30, status: "Retired" }).ok, false);
  r.props.set("SITE_CODE", "Parron26"); assert.equal(r.get({ action: "forms", key: r.key }).needCode, true);
});

test("submitted forms: Manager PIN, date range, archived PDF readable only for logged reports", () => {
  const r = createRelay();
  r.post(report());
  r.post(report({ uid: "d2", reportId: "YMT-18-20261013-0700-AT", meta: { name: "Anphin Thomas", no: "18", title: "Hazardous Chemicals", location: "DG store" } }));
  r.post({ key: r.key, action: "status", uid: "d9", state: "draft", meta: { name: "Matthew Smith", no: "26", title: "Monthly Road Condition Check", location: "Cowalla Rd", started: new Date().toISOString() } });
  assert.equal(r.post({ key: r.key, action: "submitted", pin: "0" }).badPin, true);
  const s = r.post({ key: r.key, action: "submitted", pin: "2468" });
  assert.equal(s.ok, true); assert.equal(s.items.length, 2); assert.equal(s.items[0].reportId, "YMT-18-20261013-0700-AT", "newest first");
  assert.equal(s.items[0].no, "18"); assert.equal(s.items[0].name, "Anphin Thomas"); assert.ok(s.items[0].pdf);
  assert.equal(s.open.length, 1); assert.equal(s.open[0].name, "Matthew Smith");
  assert.equal(r.post({ key: r.key, action: "submitted", pin: "2468", from: perthYmd(1) }).items.length, 0);
  const pdf = r.post({ key: r.key, action: "reportPdf", pin: "2468", id: s.items[0].pdf });
  assert.equal(pdf.ok, true); assert.match(Buffer.from(pdf.data, "base64").toString(), /^%PDF/);
  assert.equal(r.post({ key: r.key, action: "reportPdf", pin: "1", id: s.items[0].pdf }).ok, false);
  assert.equal(r.post({ key: r.key, action: "reportPdf", pin: "2468", id: "999" }).ok, false);
});

test("planner reminder emails are OFF until the SHE Manager turns them on; 'me' emails only the SHE Manager", () => {
  const r = createRelay();
  plan(r, "importOb", { items: [ob({ due: perthYmd(-2) }), ob({ title: "Drill", owner: "Darren Frizzell", ownerEmail: "darren.frizzell@genus.com.au", due: perthYmd(0), form: "" })] });
  assert.equal(plan(r, "planner").emails, "off");
  let b = r.mail.length; r.ctx.remindersRun(); assert.ok(!r.mail.slice(b).some(x => /SHEQ/.test(x.subject)), "nobody emailed by default");
  assert.equal(plan(r, "plannerEmails", { mode: "me", pin: "0" }).badPin, true);
  assert.equal(plan(r, "plannerEmails", { mode: "everyone" }).ok, false);
  assert.equal(plan(r, "plannerEmails", { mode: "me" }).emails, "me");
  r.cache.clear(); b = r.mail.length; r.ctx.remindersRun(); const M = r.mail.slice(b);
  assert.ok(M.some(x => /^Your SHEQ day/.test(x.subject) && x.to === "darren.frizzell@genus.com.au"), "SHE Manager emailed");
  assert.ok(!M.some(x => x.to === "anphin.thomas@genus.com.au"), "owner not emailed in 'me' mode");
  assert.equal(plan(r, "plannerEmails", { mode: "off" }).emails, "off");
});

test("SHEQ alerts: a failed or over-limit email is recorded, and the SHE Manager can email it again to people not yet acknowledged", () => {
  const r = createRelay(); let left = 2; r.ctx.MailApp.getRemainingDailyQuota = () => left; r.props.set("EMAIL_RESERVE", "0");
  const send = r.ctx.MailApp.sendEmail; r.ctx.MailApp.sendEmail = o => { left--; return send(o); };
  const a = r.post(alertPayload({ required: ["Lee Allen", "Matthew Smith", "Paul Delaney"], notify: ["lee.allen@genus.com.au", "matt.smith@genus.com.au", "paul.delaney@genus.com.au"] }));
  assert.equal(a.ok, true, "the alert is still published");
  assert.match(a.emailed, /emailed 2 of 4\. Not sent: matt\.smith@genus\.com\.au \(daily email limit reached\); paul\.delaney@genus\.com\.au \(daily email limit reached\)/);
  left = 100; r.post({ key: r.key, action: "ackAlert", id: a.id, name: "Lee Allen" });
  assert.equal(r.post({ key: r.key, action: "emailAlert", id: a.id, pin: "1", notify: [] }).badPin, true);
  const b = r.mail.length; const e = r.post({ key: r.key, action: "emailAlert", id: a.id, pin: "2468", notify: ["matt.smith@genus.com.au", "paul.delaney@genus.com.au"] });
  assert.equal(e.ok, true); assert.deepEqual(r.mail.slice(b).map(x => x.to), ["matt.smith@genus.com.au", "paul.delaney@genus.com.au"]);
  assert.match(e.alerts[0].emailed, /Not sent[\s\S]*\n.*emailed 2 of 2$/);
  assert.equal(r.post({ key: r.key, action: "emailAlert", id: a.id, pin: "2468", notify: [] }).ok, false);
});

test("email budget: team emails stop at the reserve so inspection reports and the SHE Manager's copy still send; reports wait on the phone at the limit", () => {
  const plain = u => { const o = report({ uid: u, reportId: "YMT-" + u }); delete o.findings; delete o.report; return o; };
  const r = createRelay(); let left = 27; r.ctx.MailApp.getRemainingDailyQuota = () => left;
  const send = r.ctx.MailApp.sendEmail; r.ctx.MailApp.sendEmail = o => { left--; return send(o); };
  const a = r.post(alertPayload({ required: ["Lee Allen", "Matthew Smith", "Paul Delaney"], notify: ["lee.allen@genus.com.au", "matt.smith@genus.com.au", "paul.delaney@genus.com.au"] }));
  assert.equal(a.ok, true);
  assert.match(a.emailed, /emailed 2 of 4\. Not sent: matt\.smith@genus\.com\.au \(held back – the last 25 emails today are kept for reports\)/);
  assert.equal(r.mail[r.mail.length - 2].to, "darren.frizzell@genus.com.au", "the SHE Manager's copy goes first");
  const rep = r.post(plain("u-budget-1"));
  assert.equal(rep.ok, true, "an inspection report still sends inside the reserve");
  left = 0; const b = r.mail.length;
  const no = r.post(plain("u-budget-2"));
  assert.equal(no.ok, false); assert.match(no.error, /daily email limit reached – the report stays on the phone/);
  assert.equal(r.mail.length, b, "nothing sent at the limit");
  r.props.set("EMAIL_RESERVE", "5"); left = 50; assert.equal(r.get({}).emailReserve, 5); assert.equal(r.get({}).emailsLeftToday, 50);
});

/* ---------- High-or-above fire danger day emails ---------- */
const fireRelay = (today, tomorrow) => createRelay({ fetch: url => /fdr\.json/.test(url) ? { body: JSON.stringify({ districts: { Lesueur: [{ date: perthYmd(0), rating: today }, { date: perthYmd(1), rating: tomorrow }] } }) } : null });
test("fire danger: High today → 5 am email to the SHE team, supervisors and Construction Manager, one each, once a day", () => {
  const r = fireRelay("High", "Extreme"); const b = r.mail.length; r.ctx.remindersRun();
  const M = r.mail.slice(b).filter(x => /FIRE DANGER HIGH TODAY – Inspection 25 before work/.test(x.subject));
  assert.deepEqual(M.map(x => x.to).sort(), ["anphin.thomas@genus.com.au", "corey.shotter@genus.com.au", "darren.frizzell@genus.com.au", "gary.armitage@genus.com.au",
    "matt.smith@genus.com.au", "nicola.rucci@genus.com.au", "paul.delaney@genus.com.au", "steven.pugh@genus.com.au", "zane.patten@genus.com.au"]);
  assert.ok(M.every(x => !x.bcc)); assert.match(M[0].htmlBody, /Inspection 25 – Fire Danger Day[\s\S]*Midday re-check[\s\S]*Nominate a lookout[\s\S]*Tomorrow: <b>Extreme/);
  assert.doesNotMatch(M[0].htmlBody, /No hot work in the open air/, "Extreme controls only on Extreme days");
  const b2 = r.mail.length; r.ctx.remindersRun(); assert.ok(!r.mail.slice(b2).some(x => /FIRE DANGER/.test(x.subject)), "once a day");
});
test("fire danger: nothing on Moderate days; manual Extreme rating wins; recipients can be changed in Script properties", () => {
  const r = fireRelay("Moderate", "Moderate"); let b = r.mail.length; r.ctx.remindersRun(); assert.ok(!r.mail.slice(b).some(x => /FIRE DANGER/.test(x.subject)));
  const r2 = fireRelay("Moderate", "High");
  r2.props.set("FDR_MANUAL", JSON.stringify({ date: perthYmd(0), rating: "Extreme", by: "Darren Frizzell" })); r2.props.set("FIRE_DAY_TO", "darren.frizzell@genus.com.au, gary.armitage@genus.com.au, x@gmail.com");
  b = r2.mail.length; r2.ctx.remindersRun(); const M = r2.mail.slice(b).filter(x => /FIRE DANGER EXTREME TODAY/.test(x.subject));
  assert.deepEqual(M.map(x => x.to).sort(), ["darren.frizzell@genus.com.au", "gary.armitage@genus.com.au"]);
  assert.match(M[0].htmlBody, /No hot work in the open air[\s\S]*Set by Darren Frizzell/);
});
test("fire danger: evening before an Extreme or Catastrophic day → plan-ahead email (Project Director decision on Catastrophic); not for High", () => {
  const r = fireRelay("High", "Catastrophic"); const b = r.mail.length; r.ctx.dailyDigest();
  const M = r.mail.slice(b).filter(x => /^Tomorrow: FIRE DANGER CATASTROPHIC – plan today \(Project Director decision\)/.test(x.subject));
  assert.equal(M.length, 9); assert.match(M[0].htmlBody, /Project Director decides today/);
  const r2 = fireRelay("Moderate", "High"); const b2 = r2.mail.length; r2.ctx.dailyDigest(); assert.ok(!r2.mail.slice(b2).some(x => /FIRE DANGER/.test(x.subject)));
});

/* ---------- Lightning tracker (ERP §10.2.1 – 30/30 rule) ---------- */
const SITE = { lat: -30.3456, lon: 115.3370 };
// a point d km from site on bearing b degrees
const at = (km, b) => { const R = 6371, r = x => x * Math.PI / 180, dg = x => x * 180 / Math.PI; const la1 = r(SITE.lat), lo1 = r(SITE.lon), dd = km / R, br = r(b);
  const la2 = Math.asin(Math.sin(la1) * Math.cos(dd) + Math.cos(la1) * Math.sin(dd) * Math.cos(br)); const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(dd) * Math.cos(la1), Math.cos(dd) - Math.sin(la1) * Math.sin(la2)); return { lat: dg(la2), long: dg(lo2) }; };
function ltnRelay() {
  const st = { strikes: [], fail: false, push: [], urls: [] };
  const r = createRelay({ fetch: (url, o) => {
    if (/ntfy\.sh/.test(url)) { st.push.push({ url, title: o.headers.Title, prio: o.headers.Priority, body: o.payload }); return { body: "{}" }; }
    if (/data\.api\.xweather\.com\/lightning/.test(url)) { st.urls.push(url); if (st.fail) return { code: 500, body: "" };
      return { body: JSON.stringify({ success: true, response: st.strikes.map(([km, b, minAgo]) => ({ loc: at(km, b), ob: { timestamp: Math.round((Date.now() - minAgo * 60000) / 1000), pulse: { type: "cg" } } })) }) }; }
    return null; } });
  r.props.set("LIGHTNING_HOURS", "00-24"); return { r, st };
}
test("lightning: off until the Xweather keys are set; setup makes a private push topic", () => {
  const { r, st } = ltnRelay(); assert.equal(r.ctx.lightningRun(true), null); assert.equal(st.urls.length, 0);
  const g = r.get({ action: "lightning", key: r.key }); assert.equal(g.ok, true); assert.equal(g.configured, false); assert.match(g.topic, /^parron-ymt-ltn-[a-z2-9]{18}$/);
  r.ctx.setup(); assert.ok(r.triggers.includes("lightningRun")); assert.equal(r.get({ action: "lightning", key: r.key }).topic, g.topic, "topic is kept");
  assert.match(r.mail.at(-1).body, /Lightning tracker: NOT SET/);
});
test("lightning: 10–30 km → WATCH, within 10 km → STOP (urgent push, all clear 30 min after the last close strike), then ALL CLEAR – one push per change, logged", () => {
  const { r, st } = ltnRelay(); r.props.set("XWEATHER_ID", "id1"); r.props.set("XWEATHER_SECRET", "sec1");
  st.strikes = [[42, 270, 3], [24, 300, 2]]; r.ctx.lightningRun(true);
  assert.match(st.urls[0], /lightning\/-30\.3456,115\.337\?format=json&radius=50km&limit=1000&from=-1hour&client_id=id1&client_secret=sec1/);
  assert.equal(st.push.length, 1); assert.match(st.push[0].title, /WATCH – lightning 24 km from YMT/); assert.match(st.push[0].body, /24 km NW of YMT/);
  r.ctx.lightningRun(true); assert.equal(st.push.length, 1, "no repeat while the level holds");
  st.strikes = [[24, 300, 6], [6.8, 270, 1], [8, 280, 4]]; r.ctx.lightningRun(true);
  assert.equal(st.push.length, 2); const p = st.push[1]; assert.equal(p.prio, "5"); assert.match(p.title, /STOP – lightning within 10 km of YMT/);
  assert.match(p.body, /6.8 km W of YMT/); assert.match(p.body, /All clear not before/); assert.match(p.url, /^https:\/\/ntfy\.sh\/parron-ymt-ltn-/);
  let g = r.get({ action: "lightning", key: r.key }); assert.equal(g.level, "stop"); assert.equal(g.closest.km, 6.8); assert.equal(g.closest.dir, "W");
  assert.ok(Math.abs(new Date(g.allClearAt) - (Date.now() + 29 * 60000)) < 90000, "30 min after the last strike within 10 km"); assert.equal(g.strikes.length, 3);
  // shelter, restart refused while stopped
  assert.equal(r.post({ key: r.key, action: "ltnShelter", name: "Jayden Mullan" }).sheltered[0], "Jayden Mullan");
  assert.match(r.post({ key: r.key, action: "ltnRestart", name: "Paul Delaney" }).error, /cannot restart/);
  // 31 minutes on, the close strikes are older than 30 min, lightning still 10–30 km → ALL CLEAR (stay alert)
  st.strikes = [[6.8, 270, 31], [22, 60, 5]]; r.ctx.lightningRun(true);
  assert.equal(st.push.length, 3); assert.match(st.push[2].title, /ALL CLEAR – YMT/); assert.match(st.push[2].body, /Supervisors may restart work\. Lightning is still 22 km NE of YMT – stay alert\./);
  g = r.post({ key: r.key, action: "ltnRestart", name: "Paul Delaney" }); assert.equal(g.ok, true); assert.match(g.restartBy, /^Paul Delaney · /); assert.equal(g.level, "watch");
  st.strikes = []; r.ctx.lightningRun(true); assert.equal(st.push.length, 4); assert.match(st.push[3].title, /moved away/); assert.equal(st.push[3].prio, "2");
  const ev = r.sheet("Lightning").data.slice(1).map(x => x[1]); assert.deepEqual(ev, ["WATCH", "STOP", "SHELTERED", "ALL CLEAR", "RESTART CONFIRMED", "CLEAR"]);
  g = r.get({ action: "lightning", key: r.key }); const m = Object.values(g.months)[0]; assert.equal(m.stops, 1);
});
test("lightning: 'I heard thunder' starts a STOP with no detected strike; alerts stay quiet outside the set hours; test alert needs the Manager PIN", () => {
  const { r, st } = ltnRelay(); r.props.set("XWEATHER_KEY", "AbC123xyz_s3cretPart_with_underscore");
  r.ctx.lightningRun(true); assert.match(st.urls[0], /client_id=AbC123xyz&client_secret=s3cretPart_with_underscore$/, "portal API key = client ID _ secret");
  const g = r.post({ key: r.key, action: "ltnThunder", name: "Matthew Smith" }); assert.equal(g.level, "stop");
  assert.match(st.push[0].body, /Thunder reported at YMT by Matthew Smith/);
  assert.equal(r.post({ key: r.key, action: "ltnTest", pin: "1" }).badPin, true);
  r.post({ key: r.key, action: "ltnTest", pin: "2468", name: "Darren Frizzell" }); assert.match(st.push.at(-1).title, /^TEST/);
  const n = st.push.length; r.props.set("LIGHTNING_HOURS", "00-00"); st.strikes = []; r.props.set("LTN_STATE", JSON.stringify({ level: "stop", stopStart: Date.now() - 40 * 60000, thunderAt: Date.now() - 31 * 60000 }));
  r.ctx.lightningRun(true); assert.equal(r.get({ action: "lightning", key: r.key }).level, "clear"); assert.equal(st.push.length, n, "outside hours: logged, not pushed");
});
test("lightning: feed down for 10 min → one 'use the 30/30 rule' alert, and DATA BACK when it returns", () => {
  const { r, st } = ltnRelay(); r.props.set("XWEATHER_ID", "a"); r.props.set("XWEATHER_SECRET", "b");
  r.props.set("LTN_STATE", JSON.stringify({ level: "clear", lastOK: Date.now() - 11 * 60000 })); st.fail = true;
  r.ctx.lightningRun(true); r.ctx.lightningRun(true); assert.equal(st.push.length, 1); assert.match(st.push[0].body, /30\/30 rule/);
  assert.equal(r.get({ action: "lightning", key: r.key }).down, true);
  st.fail = false; r.ctx.lightningRun(true); assert.equal(r.get({ action: "lightning", key: r.key }).down, false);
  assert.deepEqual(r.sheet("Lightning").data.slice(1).map(x => x[1]), ["DATA DOWN", "DATA BACK"]);
});
