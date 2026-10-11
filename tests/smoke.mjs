// End-to-end smoke test: runs a full inspection in a real browser and builds the PDF.
// Usage: node tests/smoke.mjs [dir]   (dir defaults to the repo root)
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = srv.address().port;
const errors = [], posts = [];
const browser = await chromium.launch({ executablePath: fs.existsSync("/opt/pw-browsers/chromium") ? undefined : undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await ctx.route(/script\.google(usercontent)?\.com/, async route => {
  const r = route.request();
  if (r.method() === "POST") posts.push(JSON.parse(r.postData() || "{}"));
  const url = new URL(r.url());
  const body = url.searchParams.get("action") === "dashboard"
    ? { ok: true, month: url.searchParams.get("month"), sent: [], open: [], findings: [], generated: new Date().toISOString() }
    : { ok: true };
  await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
});
const page = await ctx.newPage();
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("dialog", d => d.accept());
await page.addInitScript(() => { try { localStorage.setItem("inspector", "Test Inspector"); } catch (e) {} });
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => document.querySelector("#app") && document.querySelector("#app").children.length > 0);
const step = async (name, fn) => { try { await fn(); console.log("ok  -", name); } catch (e) { console.log("FAIL-", name, e.message); errors.push(name + ": " + e.message); } };

await step("home renders inspections", async () => {
  const n = await page.evaluate(() => TABS.length); if (n < 20) throw new Error("templates missing: " + n);
});
await step("start inspection 01", async () => {
  await page.evaluate(() => startInsp(1));
  await page.waitForFunction(() => location.hash.startsWith("#insp/") && document.querySelector(".q"));
});
await step("rate all items, one NI with corrective action", async () => {
  await page.evaluate(() => {
    const t = tabByNum(CUR.tab); const qs = allQ(t);
    CUR.details.location = "Laydown area 2";
    qs.forEach((q, i) => rate(q.id, i === 0 ? "NI" : "C"));
    const a = CUR.answers[qs[0].id]; a.finding = "Notice board out of date"; a.action = "Replace ERP poster"; a.closed = false; a.owner = "Site Supervisor"; a.due = "2026-10-20";
    save(CUR, true);
  });
  const p = await page.evaluate(() => problems(CUR)); if (p.length) throw new Error(p.join("; "));
});
await step("review screen builds the PDF", async () => {
  await page.evaluate(() => toReview());
  await page.waitForFunction(() => location.hash.startsWith("#review/"));
  await page.waitForFunction(() => typeof PDFFILE !== "undefined" && PDFFILE && PDFFILE.size > 20000, null, { timeout: 30000 });
  const size = await page.evaluate(() => PDFFILE.size); console.log("    pdf bytes", size);
});
await step("screenshot review", async () => { fs.mkdirSync(path.join(root, "tests/out"), { recursive: true }); await page.screenshot({ path: path.join(root, "tests/out/review.png"), fullPage: true }); });
await step("send directly through the relay", async () => {
  await page.evaluate(() => { const b = document.querySelector("#bShare"); b.click(); });
  await page.waitForFunction(() => location.hash === "#home" || location.hash === "", null, { timeout: 30000 });
  const sent = posts.find(p => p.pdf); if (!sent) throw new Error("no report POST captured");
  console.log("    subject:", sent.subject);
});
await step("dashboard loads", async () => {
  await page.evaluate(() => go("#dash"));
  await page.waitForTimeout(800);
});
await browser.close(); srv.close();
if (errors.length) { console.log("\nERRORS:\n" + errors.join("\n")); process.exit(1); }
console.log("\nAll smoke steps passed.");
