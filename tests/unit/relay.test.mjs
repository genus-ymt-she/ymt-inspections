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
    { fid: "YMT-01-20261011-0930-TI|1.1", item: "1.1", text: "Notice board current", rating: "NI", snn: "", cons: 2, like: 3, score: 6, level: "Medium", finding: "ERP out of date", action: "Replace ERP", status: "open", owner: "Site Supervisor", due: "2026-10-20" },
    { fid: "YMT-01-20261011-0930-TI|1.2", item: "1.2", text: "First aid kit", rating: "UA", snn: "Foundations", cons: 4, like: 4, score: 16, level: "Extreme", finding: "Kit empty", action: "Restock", status: "spot", taken: "Restocked from store" }
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
  assert.equal(j.myoshPending.length, 1);
  assert.equal(j.myoshPending[0].pct, 91);
  assert.equal(j.myoshPending[0].supervisor, "S. Boss");
  assert.equal(j.trend.length, 6);
});

test("close-out needs a name; verify / re-open / MYOSH need the Manager PIN", () => {
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
  assert.equal(r.post({ key: r.key, action: "myosh", reportId: "YMT-01-20261011-0930-TI", ref: "INS-1", by: "Darren", pin: "bad" }).ok, false);
  assert.equal(r.post({ key: r.key, action: "myosh", reportId: "YMT-01-20261011-0930-TI", ref: "INS-1", by: "Darren", pin: "2468" }).ok, true);
  assert.equal(r.get({ action: "dashboard", key: r.key }).myoshPending.length, 0);
});

test("PIN check rejects when no PIN is configured and locks after 10 failures", () => {
  assert.equal(createRelay({ pin: "" }).post({ key: "prn-ymt-7Qk2vX9m", action: "pin", pin: "" }).ok, false);
  const r = createRelay({ pin: "2468" });
  for (let i = 0; i < 10; i++) r.post({ key: r.key, action: "pin", pin: "x" });
  assert.equal(r.post({ key: r.key, action: "pin", pin: "2468" }).ok, false, "locked out");
});

test("daily digest includes overdue actions", () => {
  const r = createRelay();
  r.post(report({ findings: [{ ...report().findings[0], due: "2020-01-01" }] }));
  r.ctx.dailyDigest();
  const m = r.mail.at(-1);
  assert.match(m.subject, /1 actions overdue/);
  assert.match(m.htmlBody, /Replace ERP/);
});

test("setup sends a confirmation and reports missing PIN", () => {
  const r = createRelay({ pin: "" });
  r.ctx.setup();
  assert.match(r.mail.at(-1).body, /NOT SET/);
});
