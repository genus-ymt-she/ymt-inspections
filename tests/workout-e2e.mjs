// End-to-end check of the Workout Tracker (workout/) against its Phase 1 acceptance criteria.
// Usage: node tests/workout-e2e.mjs [--shots]   (screenshots go to tests/out/workout-*.png)
import { chromium, devices } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import assert from "node:assert/strict";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((q, r) => {
  let p = path.join(root, decodeURIComponent(new URL(q.url, "http://x").pathname));
  if (p.endsWith("/")) p += "index.html";
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(r);
}).listen(0);
const URL0 = `http://localhost:${server.address().port}/workout/`;
const shots = process.argv.includes("--shots"); if (shots) fs.mkdirSync(path.join(root, "tests/out"), { recursive: true });
const shot = async (p, n) => shots && p.screenshot({ path: path.join(root, `tests/out/workout-${n}.png`), fullPage: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"], acceptDownloads: true });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", e => errors.push(e.message));
page.on("dialog", d => d.accept());
const ok = m => console.log("  ✓ " + m);

try {
  await page.goto(URL0);
  await page.waitForSelector(".session-card");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForSelector(".session-card");
  assert.equal(await page.locator(".session-card").count(), 5);
  await shot(page, "1-home");
  ok("home shows five session cards");

  // 1. offline
  await ctx.setOffline(true);
  await page.reload(); await page.waitForSelector(".session-card");
  ok("1. opens with no connection (service worker)");
  const manifest = await page.evaluate(() => fetch("manifest.webmanifest").then(r => r.json()));
  assert.ok(manifest.icons.some(i => i.sizes === "512x512") && manifest.display === "standalone");

  // 2. complete a full session (offline)
  await page.click('[data-start="chest"]'); await page.waitForSelector(".session");
  const rows = page.locator('.ex[data-ex="incline-smith"] .sr:not(.head)');
  assert.equal(await rows.count(), 4);
  const vals = [[60, 10, 2], [60, 10, 1], [60, 9, 1], [57.5, 8, 1]];
  for (let i = 0; i < 4; i++) {
    const r = rows.nth(i);
    await r.locator('[data-f="weight"]').fill(String(vals[i][0]));
    await r.locator('[data-f="reps"]').fill(String(vals[i][1]));
    await r.locator('[data-f="rir"]').fill(String(vals[i][2]));
    await r.locator(".tick").click();
  }
  // drop set row: three weight/rep pairs, no RIR
  const drop = page.locator('.ex[data-ex="machine-chest-press-drop"] .sr.dropset').first();
  assert.equal(await drop.locator('[data-f="weight"]').count(), 3);
  assert.equal(await drop.locator('[data-f="rir"]').count(), 0);
  await drop.locator('[data-f="weight"]').nth(0).fill("50"); await drop.locator('[data-f="reps"]').nth(0).fill("12");
  await drop.locator('[data-f="weight"]').nth(1).fill("40"); await drop.locator('[data-f="reps"]').nth(1).fill("10");
  assert.equal(await page.locator(".superset").count(), 1);
  await page.waitForTimeout(150);
  await shot(page, "2-session");

  // 7. close mid-session and reopen
  await page.close();
  const p2 = await ctx.newPage(); p2.on("dialog", d => d.accept()); p2.on("pageerror", e => errors.push(e.message));
  await p2.goto(URL0); await p2.waitForSelector(".resume");
  await p2.click(".resume"); await p2.waitForSelector(".session");
  assert.equal(await p2.locator('.ex[data-ex="incline-smith"] .sr:not(.head)').nth(3).locator('[data-f="weight"]').inputValue(), "57.5");
  assert.equal(await p2.locator('.ex[data-ex="incline-smith"] .tick.done').count(), 4);
  ok("7. closing mid-session and reopening keeps every entry");

  await p2.click("#finish"); await p2.waitForSelector(".session-card");
  const n = await p2.evaluate(() => new Promise(res => { const r = indexedDB.open("workout-tracker"); r.onsuccess = () => { const q = r.result.transaction("setLogs").objectStore("setLogs").count(); q.onsuccess = () => res(q.result); }; }));
  assert.ok(n >= 6, `sets saved: ${n}`);
  assert.match(await p2.locator('[data-start="chest"] .sc-since').innerText(), /Today/);
  ok(`2. full session completed and saved (${n} set records)`);

  // 3. last time's numbers
  await p2.click('[data-start="chest"]'); await p2.waitForSelector(".session");
  const last = await p2.locator('.ex[data-ex="incline-smith"] .last').innerText();
  assert.match(last, /60kg x10 @2, 60kg x10 @1, 60kg x9 @1, 57.5kg x8 @1 \(today\)/);
  assert.match(await p2.locator('.ex[data-ex="machine-chest-press-drop"] .last').innerText(), /50kg x12 → 40kg x10/);
  ok("3. next session shows last time's numbers: " + last.replace(/\s+/g, " "));

  // 4. same as last time
  await p2.click('[data-same="incline-smith"]');
  const r2 = p2.locator('.ex[data-ex="incline-smith"] .sr:not(.head)');
  assert.deepEqual(await Promise.all([0, 1, 2, 3].map(i => r2.nth(i).locator('[data-f="weight"]').inputValue())), ["60", "60", "60", "57.5"]);
  assert.equal(await r2.nth(2).locator('[data-f="reps"]').inputValue(), "9");
  ok("4. 'Same as last time' fills every set in one tap");

  // 5. on-block toggle – instant, in-session and on home
  await p2.click("#sess-onblock");
  assert.equal(await p2.locator('.ex[data-ex="incline-smith"] .sr:not(.head)').count(), 3);
  assert.equal(await p2.locator('.ex[data-ex="machine-chest-press-drop"]').count(), 0);
  assert.equal(await p2.locator('.ex[data-ex="incline-smith"] [data-f="weight"]').first().inputValue(), "60");
  await shot(p2, "3-onblock");
  await p2.click("#finish"); await p2.waitForSelector(".session-card");
  assert.ok(await p2.locator('[data-start="legs"].disabled').count());
  await p2.click(".toggle"); assert.equal(await p2.locator('[data-start="legs"].disabled').count(), 0);
  ok("5. on-block toggle changes set counts, hides drop sets, greys out Legs – no reload");

  // history
  await p2.click('[data-go="#/history"]'); await p2.waitForSelector(".hist");
  assert.equal(await p2.locator(".hist").count(), 2);
  await p2.click('[data-filter="back"]'); assert.equal(await p2.locator(".hist").count(), 0);
  await p2.click('[data-filter="chest"]'); await p2.locator(".hist").first().click(); await p2.waitForSelector(".detail-v table");
  await shot(p2, "4-detail");
  ok("history lists, filters and shows detail");

  // 6. export / import
  await ctx.setOffline(false);
  await p2.goto(URL0); await p2.waitForSelector("#export");
  const [dl] = await Promise.all([p2.waitForEvent("download"), p2.click("#export")]);
  const file = await dl.path(); const backup = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(backup.app, "workout-tracker"); assert.equal(backup.sessionLogs.length, 2);
  await p2.evaluate(() => new Promise(res => { const r = indexedDB.open("workout-tracker"); r.onsuccess = () => { const t = r.result.transaction(["sessionLogs", "setLogs"], "readwrite"); t.objectStore("sessionLogs").clear(); t.objectStore("setLogs").clear(); t.oncomplete = res; }; }));
  await p2.reload(); await p2.waitForSelector("#import");
  assert.match(await p2.locator('[data-start="chest"] .sc-since').innerText(), /Not done/);
  await p2.setInputFiles("#importfile", file); await p2.waitForSelector('[data-start="chest"] .sc-since:has-text("Today")');
  ok(`6. export → wipe → import restores ${backup.sessionLogs.length} sessions / ${backup.setLogs.length} sets`);

  assert.deepEqual(errors, []);
  console.log("All workout acceptance checks passed");
} finally { await browser.close(); server.close(); }
