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
  assert.deepEqual(r.triggers.sort(), ["dailyDigest", "prepareHistory", "remindersRun", "weeklyDigest"]);
});
