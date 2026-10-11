// End-to-end smoke test. Runs the app in Chromium against the REAL relay code (PARRON_Relay_Code.gs)
// on in-memory Google services, and walks the full workflow:
// inspection -> risk-rated finding -> send -> assignee emailed -> assignee opens the email link and closes out -> manager verifies -> Insights -> monthly PDF.
// Usage: node tests/smoke.mjs [--shots]      (screenshots go to tests/out/)
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRelay } from "./gas-mock.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = process.argv.includes("--shots");
const out = path.join(root, "tests/out"); fs.mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = srv.address().port;
const relay = createRelay({ pin: "2468" });
const errors = [];
const browser = await chromium.launch();

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block", colorScheme: opts.dark ? "dark" : "light", acceptDownloads: true });
  await ctx.route(/script\.google(usercontent)?\.com/, async route => {
    const r = route.request(); const url = new URL(r.url());
    const body = r.method() === "POST" ? relay.post(JSON.parse(r.postData() || "{}")) : relay.get(Object.fromEntries(url.searchParams));
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errors.push("console: " + m.text()); });
  await page.addInitScript(n => { try { if (n) localStorage.setItem("inspector", n); } catch (e) {} }, opts.name ?? "Test Inspector");
  await page.goto(`http://localhost:${port}/${opts.hash || ""}`);
  await page.waitForFunction(() => document.querySelector("#app") && !document.querySelector("#app .skel"));
  return page;
}
const step = async (name, fn) => { try { await fn(); console.log("ok   ", name); } catch (e) { console.log("FAIL ", name, "-", e.message.split("\n")[0]); errors.push(name + ": " + e.message.split("\n")[0]); } };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(out, name + ".png"), fullPage: false }); };
const settle = page => page.waitForTimeout(450);

const page = await newPage();
await step("home renders hero, library and categories", async () => {
  await page.waitForSelector(".hero"); await page.waitForSelector("#lib .card");
  const n = await page.$$eval("#lib .card", e => e.length); if (n < 20) throw new Error("library cards: " + n);
  await settle(page); await shot(page, "01-home");
});
await step("library search filters templates", async () => {
  await page.fill("#libq", "crane"); await settle(page);
  const n = await page.$$eval("#lib .card", e => e.length); if (n < 1 || n > 6) throw new Error("search results: " + n);
  await page.fill("#libq", ""); await settle(page);
});
await step("start inspection 01 and rate items", async () => {
  await page.evaluate(() => startInsp(1));
  await page.waitForFunction(() => location.hash.startsWith("#insp/") && document.querySelector(".q"));
  await page.fill('[data-d="location"]', "Laydown area 2");
  await page.fill('[data-d="crew"]', "Civil crew A");
  const ids = await page.evaluate(() => allQ(tabByNum(CUR.tab)).map(q => q.id));
  // first item through the real UI: NI -> finding, action, risk, open, owner
  const q0 = "#q-" + ids[0].replace(".", "_");
  await page.click(`${q0} .rates button[data-r=NI]`);
  await page.fill(`${q0} .nc textarea >> nth=0`, "Emergency response plan on notice board is out of date");
  await page.fill(`${q0} .nc textarea >> nth=1`, "Replace with current ERP revision and brief the crew");
  await page.click(`${q0} .riskbox .rscale >> nth=0 >> button >> nth=2`); // consequence 3
  await page.click(`${q0} .riskbox .rscale >> nth=1 >> button >> nth=3`); // likelihood 4 -> 12 High
  await page.click(`${q0} .seg button >> nth=1`); // open
  await page.fill(`${q0} .nc input >> nth=0`, "Sam Super");
  await page.fill(`${q0} .nc .own-em`, "sam.super@genus.com.au");
  const due = await page.inputValue(`${q0} .nc input[type=date]`); if (!due) throw new Error("due date was not suggested from risk");
  await settle(page); await page.locator(q0).scrollIntoViewIfNeeded(); await shot(page, "02-finding-risk");
  // second item UA closed on the spot, the rest compliant (fast path)
  await page.evaluate(ids => { rate(ids[1], "UA"); const a = CUR.answers[ids[1]]; Object.assign(a, { finding: "First aid kit missing burns dressings", action: "Restock kit", cons: 2, like: 2, closed: true, taken: "Restocked from site store" }); ids.slice(2).forEach(id => rate(id, "C")); save(CUR, true); refreshQ(ids[1]); }, ids);
  const p = await page.evaluate(() => problems(CUR)); if (p.length) throw new Error(p.join("; "));
  const k = await page.evaluate(id => riskOf(CUR.answers[id].cons, CUR.answers[id].like).level, ids[0]); if (k !== "High") throw new Error("risk level " + k);
});
await step("risk is required before review", async () => {
  const ok = await page.evaluate(() => { const a = { finding: "x", action: "y", closed: true, taken: "z" }; return ncComplete(a) === false; });
  if (!ok) throw new Error("NC without risk counted as complete");
});
await step("review screen, signature and PDF", async () => {
  await page.evaluate(() => toReview());
  await page.waitForFunction(() => location.hash.startsWith("#review/"));
  const box = await page.locator("#sig").boundingBox();
  await page.mouse.move(box.x + 30, box.y + 100); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 40, { steps: 8 }); await page.mouse.move(box.x + 220, box.y + 110, { steps: 8 }); await page.mouse.up();
  await page.waitForFunction(() => typeof PDFFILE !== "undefined" && PDFFILE && PDFFILE.size > 20000, null, { timeout: 30000 });
  const size = await page.evaluate(() => PDFFILE.size); console.log("      pdf bytes", size);
  await settle(page); await shot(page, "03-review");
});
await step("send directly through the relay (findings reach the log)", async () => {
  await page.click("#bShare");
  await page.waitForFunction(() => (location.hash === "#home" || location.hash === ""), null, { timeout: 30000 });
  const j = relay.get({ action: "dashboard", key: relay.key });
  if (j.findings.length !== 2) throw new Error("findings logged: " + j.findings.length);
  if (!relay.mail.length || !relay.mail[0].attachments) throw new Error("no email with PDF");
  const rep = relay.mail.find(m => m.attachments); if (!/Risk/.test(rep.htmlBody)) throw new Error("email lacks risk column");
  if (!/High 15/.test(rep.htmlBody)) throw new Error("Genus matrix rank not in email");
  const asg = relay.mail.find(m => m.to === "sam.super@genus.com.au"); if (!asg) throw new Error("assignee not emailed");
  globalThis.ACTION_LINK = asg.htmlBody.match(/href="[^"]*(#actions\/[^"]+)"/)[1];
});
await step("action register shows the open action", async () => {
  await page.evaluate(() => go("#actions")); await page.waitForSelector(".act");
  const t = await page.textContent("#app"); if (!/Replace with current ERP/.test(t)) throw new Error("action missing: " + t.replace(/\s+/g, " ").slice(0, 300) + " REG=" + await page.evaluate(() => JSON.stringify(regAll().map(f => [f.status, f.due]))));
  await settle(page); await shot(page, "04-actions");
});
await step("assignee opens the email link on their own phone and closes out", async () => {
  const p2 = await newPage({ name: "", hash: ACTION_LINK }); await p2.waitForSelector(".sheet h3", { timeout: 15000 });
  await settle(p2); await shot(p2, "05-action-detail");
  await p2.click("text=Close out action"); await p2.fill("#coBy", "Sam Super"); await p2.fill("#coNote", "New ERP revision posted and crew briefed at prestart");
  await p2.click("#coGo"); await p2.waitForTimeout(900);
  const f = relay.get({ action: "dashboard", key: relay.key }).findings.find(x => x.status === "Closed");
  if (!f) throw new Error("close-out did not reach the log");
  if (!relay.mail.find(m => /please verify/.test(m.subject || ""))) throw new Error("SHE Manager not told to verify");
  await p2.context().close();
});
await step("manager mode with PIN, then verify", async () => {
  await page.evaluate(() => go("#settings")); await page.waitForSelector("#mPin");
  await page.fill("#mPin", "2468"); await page.click("text=Turn on"); await page.waitForFunction(() => !!localStorage.getItem("mgrPin"));
  await settle(page); await shot(page, "06-settings");
  await page.evaluate(async () => { REG.at = 0; await regRefresh(true); ACTF.f = "verify"; go("#actions"); }); await page.waitForSelector(".act");
  await page.click(".act >> nth=0"); await page.click("text=Verify close-out"); await page.click("#aYes"); await page.waitForTimeout(800);
  const f = relay.get({ action: "dashboard", key: relay.key }).findings.find(x => x.status === "Verified");
  if (!f) throw new Error("verify did not reach the log");
});
await step("Insights renders KPIs and charts", async () => {
  await page.evaluate(() => go("#insights")); await page.waitForSelector(".kpis .kpi"); await page.waitForSelector(".chart svg");
  await settle(page); await shot(page, "07-insights");
  const kp = await page.textContent(".kpis"); if (!/1 of 2 findings/.test(kp)) throw new Error("closed-on-spot KPI wrong");
  await page.evaluate(() => document.querySelectorAll(".chart")[2].scrollIntoView()); await settle(page); await shot(page, "08-insights-charts");
  const txt = await page.evaluate(() => safetySummaryText(DASH.j)); if (!/1 site inspection was completed/.test(txt)) throw new Error("summary text: " + txt.slice(0, 120));
});
await step("monthly HSE summary PDF builds", async () => {
  const n = await page.evaluate(() => buildMonthlyPDF(DASH.j).size); if (n < 15000) throw new Error("monthly pdf bytes " + n); console.log("      monthly pdf bytes", n);
});
await step("CSV exports", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => exportActions())]);
  const p = await dl.path(); const csv = fs.readFileSync(p, "utf8"); if (!/Corrective action/.test(csv) || csv.split("\n").length < 3) throw new Error("csv content");
});
if (SHOTS) {
  await step("dark mode + desktop screenshots", async () => {
    const d = await newPage({ dark: true, hash: "#home" }); await d.waitForSelector(".hero"); await settle(d); await shot(d, "10-home-dark");
    await d.evaluate(() => go("#insights")); await d.waitForSelector(".chart svg"); await settle(d); await shot(d, "11-insights-dark");
    const w = await newPage({ viewport: { width: 1280, height: 860 }, hash: "#insights" }); await w.waitForSelector(".chart svg"); await settle(w); await shot(w, "12-insights-desktop");
    await w.evaluate(() => go("#home")); await w.waitForSelector("#lib .card"); await settle(w); await shot(w, "13-home-desktop");
    fs.writeFileSync(path.join(out, "monthly.pdf"), Buffer.from(await page.evaluate(async () => { const b = buildMonthlyPDF(DASH.j); return Array.from(new Uint8Array(await b.arrayBuffer())); })));
  });
}
await browser.close(); srv.close();
if (errors.length) { console.log("\nERRORS:\n" + [...new Set(errors)].join("\n")); process.exit(1); }
console.log("\nAll smoke steps passed.");
