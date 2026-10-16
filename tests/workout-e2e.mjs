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
/** Finish the open session; answers the Complete / Partial prompt when exercises are unlogged. */
async function finish(p, choice = "Complete") {
  await p.click("#finish");
  await Promise.race([p.waitForSelector("dialog.modal"), p.waitForSelector(".session-card")]);
  if (await p.locator("dialog.modal").count()) await p.click(`dialog.modal button:text-is("${choice}")`);
  await p.waitForSelector(".session-card");
}

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

  await finish(p2);
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
  await finish(p2);
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


  // ================================================================ Phase 2
  console.log("Phase 2");
  const card = (p, id) => p.locator(`.ex[data-ex="${id}"]`);
  const fillRows = async (p, id, rows) => { for (let i = 0; i < rows.length; i++) { const r = card(p, id).locator(".sr:not(.head)").nth(i); await r.locator('[data-f="weight"]').fill(String(rows[i][0])); await r.locator('[data-f="reps"]').fill(String(rows[i][1])); } };

  await p2.evaluate(() => (location.hash = "#/home")); await p2.waitForSelector(".session-card");
  // A: off-block chest – incline 60x10 on all 4 sets, pec deck 40x20 x2 → both at top of range
  await p2.click('[data-start="chest"]'); await p2.waitForSelector(".session");
  assert.equal(await card(p2, "incline-smith").locator(".ready-badge").count(), 0);
  assert.match(await card(p2, "incline-smith").locator(".sugg").innerText(), /Same weight 60kg/);
  await fillRows(p2, "incline-smith", [[60, 10], [60, 10], [60, 10], [60, 10]]);
  await fillRows(p2, "pec-deck", [[40, 20], [40, 20]]);
  ok("progression: not all sets at top → 'same weight, beat reps' and no badge");

  // rest timer: compound slot = 120 s, +30, skip
  await card(p2, "incline-smith").locator(".tick").first().click();
  await p2.waitForSelector(".rest.show");
  assert.match(await p2.locator(".rest-t").innerText(), /^0[12]:[0-5]\d$/);
  assert.ok(/^02:00|^01:59/.test(await p2.locator(".rest-t").innerText()));
  await p2.click('[data-rest="add"]');
  assert.match(await p2.locator(".rest-t").innerText(), /^02:[23]\d$/);
  await p2.click('[data-rest="skip"]'); await p2.waitForSelector(".rest:not(.show)", { state: "attached" });
  await card(p2, "incline-db-fly").locator(".tick").first().click();
  assert.match(await p2.locator(".rest-t").innerText(), /^00:4[45]$/);
  await card(p2, "cable-crossover-lth").locator(".tick").first().click();
  assert.match(await p2.locator(".rest-t").innerText(), /^01:[23]\d$/);
  await p2.click('[data-rest="skip"]');
  ok("rest timer: starts on tick, 120 s compound / 45 s within superset / 90 s standard, +30 s and Skip");
  await finish(p2, "Complete");

  // B: next chest – READY badges and +2.5 suggestion, swap, tags, partial
  await p2.click('[data-start="chest"]'); await p2.waitForSelector(".session");
  assert.equal(await card(p2, "incline-smith").locator(".ready-badge").innerText(), "READY TO PROGRESS");
  assert.equal(await card(p2, "pec-deck").locator(".ready-badge").count(), 1);
  assert.equal(await card(p2, "incline-smith").locator('[data-f="weight"]').first().getAttribute("placeholder"), "62.5");
  assert.equal(await card(p2, "incline-smith").locator('[data-f="weight"]').first().inputValue(), "", "never auto-applied");
  await card(p2, "incline-smith").locator("[data-sugg]").click();
  assert.equal(await card(p2, "incline-smith").locator('[data-f="weight"]').nth(3).inputValue(), "62.5");
  await shot(p2, "5-ready");
  ok("READY TO PROGRESS + 62.5kg greyed suggestion, filled only on tap");

  // per-exercise increment
  await card(p2, "pec-deck").locator("[data-gear]").click();
  await p2.fill('dialog.modal input[name="inc"]', "5"); await p2.click('dialog.modal button:text-is("Save")');
  assert.equal(await card(p2, "pec-deck").locator('[data-f="weight"]').first().getAttribute("placeholder"), "45");
  ok("per-exercise increment setting (pec deck +5kg)");

  // swap incline smith → incline DB press
  await card(p2, "incline-smith").locator('[data-f="weight"]').first().fill("");
  await p2.locator('[data-swap="incline-smith"]').click();
  await p2.click('dialog.modal button:has-text("Incline DB Press")');
  await p2.waitForSelector('.ex[data-ex="incline-db-press"]');
  assert.match(await card(p2, "incline-db-press").locator(".swapped").innerText(), /Swapped in for Incline Smith Press/);
  assert.match(await card(p2, "incline-db-press").locator(".last").innerText(), /No history/);
  await fillRows(p2, "incline-db-press", [[30, 10], [30, 9]]);
  await p2.click('[data-tag="Lower back"]');
  await p2.fill("#sess-notes", "Tight hips today");
  await shot(p2, "6-swap");
  await finish(p2, "Partial");
  ok("swap logs against Incline DB Press in slot A; finished as Partial");

  await p2.click('[data-go="#/history"]'); await p2.waitForSelector(".hist");
  const top = p2.locator(".hist").first();
  assert.match(await top.innerText(), /PARTIAL/i); assert.match(await top.innerText(), /Lower back/);
  await p2.fill("#hsearch", "lower back"); assert.equal(await p2.locator(".hist").count(), 1);
  await p2.fill("#hsearch", "hips"); assert.equal(await p2.locator(".hist").count(), 1);
  await p2.fill("#hsearch", "");
  await p2.click('[data-htag="Lower back"]'); assert.equal(await p2.locator(".hist").count(), 1);
  await p2.click('[data-htag="Lower back"]');
  await p2.locator(".hist").first().click(); await p2.waitForSelector(".detail-v");
  assert.match(await p2.locator(".detail-v").innerText(), /Substituted for Incline Smith Press/);
  assert.match(await p2.locator(".detail-v").innerText(), /skipped: .*Pec Deck/);
  await shot(p2, "7-history-detail");
  ok("history: Partial flag, tags searchable, substitution and skipped list shown");

  // C: deload – 2 sets, 60% of last NON-deload weights, drop sets hidden; skipped pec deck still uses session A
  await p2.click('[data-go="#/history"]'); await p2.click('[data-go="#/home"]');
  await p2.click(".toggle.deload-t"); await p2.waitForSelector(".deload-banner");
  assert.ok(await p2.evaluate(() => document.body.classList.contains("deload")));
  await p2.click('[data-start="chest"]'); await p2.waitForSelector(".session");
  assert.equal(await p2.locator('.ex[data-ex="machine-chest-press-drop"]').count(), 0);
  assert.equal(await card(p2, "incline-smith").locator(".sr:not(.head)").count(), 2);
  assert.equal(await card(p2, "incline-smith").locator('[data-f="weight"]').first().getAttribute("placeholder"), "36");
  assert.equal(await card(p2, "pec-deck").locator('[data-f="weight"]').first().getAttribute("placeholder"), "24");
  assert.equal(await p2.locator(".ready-badge").count(), 0);
  await shot(p2, "8-deload");
  await fillRows(p2, "incline-smith", [[36, 10]]);
  await finish(p2, "Complete");
  await p2.click('[data-go="#/history"]'); await p2.waitForSelector(".hist");
  assert.match(await p2.locator(".hist").first().innerText(), /DELOAD/i);
  await p2.click('[data-go="#/home"]'); await p2.click(".toggle.deload-t");
  ok("deload: 2 sets, 60% of last non-deload weight, drop sets hidden, tagged in history; partial skip excluded from progression");

  // after deload: progression ignores the deload session (still based on session A for pec deck)
  await p2.click('[data-start="chest"]'); await p2.waitForSelector(".session");
  assert.equal(await card(p2, "pec-deck").locator(".ready-badge").count(), 1);
  assert.match(await card(p2, "incline-smith").locator(".last").innerText(), /deload/);
  await p2.click("#discard");
  await p2.waitForSelector(".session-card");
  ok("after deload: suggestions come from the last normal session");

  // 6. export / import
  await ctx.setOffline(false);
  await p2.goto(URL0); await p2.waitForSelector("#export");
  const [dl] = await Promise.all([p2.waitForEvent("download"), p2.click("#export")]);
  const file = await dl.path(); const backup = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(backup.app, "workout-tracker"); assert.equal(backup.sessionLogs.length, 5);
  await p2.evaluate(() => new Promise(res => { const r = indexedDB.open("workout-tracker"); r.onsuccess = () => { const t = r.result.transaction(["sessionLogs", "setLogs"], "readwrite"); t.objectStore("sessionLogs").clear(); t.objectStore("setLogs").clear(); t.oncomplete = res; }; }));
  await p2.reload(); await p2.waitForSelector("#import");
  assert.match(await p2.locator('[data-start="chest"] .sc-since').innerText(), /Not done/);
  await p2.setInputFiles("#importfile", file); await p2.waitForSelector('[data-start="chest"] .sc-since:has-text("Today")');
  ok(`6. export → wipe → import restores ${backup.sessionLogs.length} sessions / ${backup.setLogs.length} sets`);

  assert.deepEqual(errors, []);
  console.log("All workout acceptance checks passed");
} finally { await browser.close(); server.close(); }
