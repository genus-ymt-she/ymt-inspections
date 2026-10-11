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

test("setup creates the daily and Monday weekly triggers", () => {
  const r = createRelay(); r.ctx.setup();
  assert.deepEqual(r.triggers.sort(), ["dailyDigest", "weeklyDigest"]);
});

test("weekly summary goes only to the SHE Manager with activity per person", () => {
  const r = createRelay();
  r.post(report());
  const before = r.mail.length; r.ctx.weeklyDigest();
  const w = r.mail.slice(before); assert.equal(w.length, 1);
  assert.equal(w[0].to, "darren.frizzell@genus.com.au"); assert.match(w[0].subject, /weekly summary/);
  assert.match(w[0].htmlBody, /Activity by person/); assert.match(w[0].htmlBody, /Test Inspector/); assert.doesNotMatch(w[0].htmlBody, /target/i);
});
