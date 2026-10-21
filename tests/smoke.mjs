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
import { EVENTS, BIRTHS } from "./fixtures/onthisday.mjs";

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
// Google's servers are refused by the BoM, so the relay finds nothing; the app reads the GitHub feed instead
const relay = createRelay({ pin: "2468", fetch: url => /onthisday\/events/.test(url) ? { body: JSON.stringify(EVENTS) } : /onthisday\/births/.test(url) ? { body: JSON.stringify(BIRTHS) } : null });
relay.props.set("STATUS_PIN", "4321");
const perth = n => new Date(Date.now() + 8 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const FEED = { source: "Bureau of Meteorology", issued: perth(0) + "T04:35:00+08:00", districts: {
  Lesueur: [{ date: perth(-1), rating: "Moderate" }, { date: perth(0), rating: "High", fbi: 31 }, { date: perth(1), rating: "Extreme", fbi: 55 }],
  Watheroo: [{ date: perth(0), rating: "Moderate" }] } };
const WX = { current: { temperature_2m: 27.4, relative_humidity_2m: 22, wind_speed_10m: 24, wind_direction_10m: 112, wind_gusts_10m: 41, weather_code: 1 },
  daily: { temperature_2m_max: [33.1, 30], temperature_2m_min: [14.2, 13], precipitation_probability_max: [10, 0], wind_speed_10m_max: [31, 20], wind_gusts_10m_max: [52, 30], wind_direction_10m_dominant: [100, 200], weather_code: [1, 0] } };
const errors = [];
const browser = await chromium.launch();

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block", timezoneId: "Australia/Perth", locale: "en-AU", reducedMotion: opts.motion ? "no-preference" : "reduce", colorScheme: opts.dark ? "dark" : "light", acceptDownloads: true });
  await ctx.route(/api\.open-meteo\.com/, route => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(WX) }));
  await ctx.route(/raw\.githubusercontent\.com\/.*fdr\.json/, route => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(FEED) }));
  await ctx.route(/en\.wikipedia\.org\/api\/rest_v1\/feed\/onthisday/, route => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(/births/.test(route.request().url()) ? BIRTHS : EVENTS) }));
  await ctx.route(/youtube\.com\/iframe_api/, route => route.fulfill({ status: 200, contentType: "text/javascript", body: `window.YT={PlayerState:{UNSTARTED:-1,ENDED:0,PLAYING:1,PAUSED:2,BUFFERING:3,CUED:5},
    Player:function(el,o){const self=this;window._yt={ids:[o.videoId],calls:[]};const e=document.getElementById(el);if(e)e.innerHTML='<div class="fakeyt"></div>';
      const st=v=>setTimeout(()=>o.events.onStateChange({data:v}),10);
      this.playVideo=()=>{_yt.calls.push("play");st(1)};this.pauseVideo=()=>{_yt.calls.push("pause");st(2)};this.stopVideo=()=>{_yt.calls.push("stop");st(-1)};
      this.loadVideoById=id=>{_yt.ids.push(id);_yt.calls.push("load");st(1)};this.cueVideoById=id=>{_yt.ids.push(id);_yt.calls.push("cue")};
      window._ytEnd=()=>o.events.onStateChange({data:0});window._ytErr=()=>o.events.onError({data:150});setTimeout(()=>o.events.onReady({target:self}),10)}};
    setTimeout(()=>window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady(),0);` }));
  await ctx.route(/script\.google(usercontent)?\.com/, async route => {
    const r = route.request(); const url = new URL(r.url());
    const body = r.method() === "POST" ? relay.post(JSON.parse(r.postData() || "{}")) : relay.get(Object.fromEntries(url.searchParams));
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  if (opts.clock) await page.clock.install({ time: opts.clock });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/favicon|404|net::ERR_FAILED|ERR_INTERNET_DISCONNECTED/.test(m.text())) errors.push("console: " + m.text()); });
  await page.addInitScript(n => { try { if (n) localStorage.setItem("inspector", n); } catch (e) {} }, opts.name ?? "Test Inspector");
  // the once-a-day fire danger pop-up is tested on its own; other steps start with it already seen
  if (!opts.firePopup) await page.addInitScript(() => { try { const d = new Date(); localStorage.setItem(`fdPop_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, "1"); } catch (e) {} });
  await page.goto(`http://localhost:${port}/${opts.hash || ""}`);
  await page.waitForFunction(() => document.querySelector("#app") && !document.querySelector("#app .skel"));
  return page;
}
const step = async (name, fn) => { try { await fn(); console.log("ok   ", name); } catch (e) { console.log("FAIL ", name, "-", e.message.split("\n")[0], process.env.DBG ? (e.stack.match(/smoke.mjs:\d+/g) || []).join(" ") : ""); errors.push(name + ": " + e.message.split("\n")[0]); } };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(out, name + ".png"), fullPage: false }); };
const settle = page => page.waitForTimeout(450);

const page = await newPage();
await step("Home opens first: HVMB & Fire Status, history, welcome, My Day, Inspect & report, Radio, Reference", async () => {
  await page.waitForSelector(".hero"); await page.waitForSelector(".tiles .tile");
  if (await page.$("#lib")) throw new Error("inspection list should not be on home");
  await page.waitForSelector("nav.tabs a[data-t=home].on", { timeout: 5000 }).catch(() => { throw new Error("Home tab not active"); });
  const order = await page.evaluate(() => ["#stp", "#hcd", ".hero", ".tile.myday", "#refsec"].map(q => { const e = document.querySelector(q); return e ? e.getBoundingClientRect().top + scrollY : -1; }));
  if (order.some(x => x < 0) || order.some((x, i) => i && x <= order[i - 1])) throw new Error("home order: " + order);
  if (!/HVMB & Fire Status/.test(await page.textContent("#stp"))) throw new Error("status panel title");
  if (!/Shire of Dandaragan HVMB text message/.test(await page.textContent("#stp"))) throw new Error("Shire SMS note missing");
  const labels = await page.$$eval(".tiles .tile b", e => e.map(x => x.textContent.trim()).join("|")); if (labels !== "My Day|Inspect & report|PARRON Radio") throw new Error("home tiles: " + labels);
  await settle(page); await shot(page, "01-home");
});
await step("computer screen: side menu and two-column Home; phone keeps one column", async () => {
  if (await page.$(".home-desk")) throw new Error("phone should not get the desktop layout");
  const d = await newPage({ viewport: { width: 1440, height: 900 }, hash: "#home" }); await d.waitForSelector(".home-desk .hd-a #stp");
  const nav = await d.$eval("nav.tabs", e => { const r = e.getBoundingClientRect(); return [r.left, r.width, r.height]; });
  if (nav[0] !== 0 || nav[1] > 300 || nav[2] < 500) throw new Error("side menu: " + nav);
  const cols = await d.evaluate(() => [document.querySelector(".hd-a").getBoundingClientRect().left, document.querySelector(".hd-b").getBoundingClientRect().left]);
  if (!(cols[1] > cols[0] + 300)) throw new Error("two columns: " + cols);
  await settle(d); await shot(d, "54-home-computer");
  await d.click("nav.tabs >> text=Inspect"); await d.waitForSelector(".tiles .tile"); await settle(d); await shot(d, "55-inspect-computer");
  await d.click("nav.tabs >> text=Emergency"); await d.waitForSelector(".em-tile"); await settle(d); await shot(d, "56-emergency-computer");
  await d.setViewportSize({ width: 800, height: 900 }); await d.evaluate(() => go("#home")); await d.waitForSelector("#stp");
  if (await d.$(".home-desk")) throw new Error("narrow window should switch back to one column");
});
await step("Inspect tab holds the six inspection and report tiles", async () => {
  await page.click("nav.tabs >> text=Inspect"); await page.waitForFunction(() => location.hash === "#inspect"); await page.waitForSelector(".tiles .tile");
  await page.waitForSelector("nav.tabs a[data-t=inspect].on", { timeout: 5000 }).catch(() => { throw new Error("Inspect tab not active"); });
  const labels = await page.$$eval(".tiles .tile b", e => e.map(x => x.textContent.trim()).join("|")); if (labels !== "Inspection|Take 5|Task Observation|Mentoring|Hazard|Positive|Trade Assistants") throw new Error("inspect tiles: " + labels);
  if (await page.$("#stp")) throw new Error("status panel should be on Home only");
  await settle(page); await shot(page, "01b-inspect");
});
await step("Inspection tile opens the list with category chips", async () => {
  await page.click(".tile >> text=Inspection"); await page.waitForSelector("#lib .card");
  const n = await page.$$eval("#lib .card", e => e.length); if (n !== 24) throw new Error("library cards: " + n);
  const nums = await page.$$eval("#lib .card .n", e => e.map(x => x.textContent)); if (nums.includes("24") || nums.includes("23") || nums.includes("22")) throw new Error("24 / 23 should not be in the list"); if (nums.slice(21, 24).join(",") !== "25,26,27") throw new Error("order: " + nums.join(","));
  await settle(page); await shot(page, "01b-inspections");
  await page.click("#libcats >> text=Fire, chemicals & environment"); await settle(page);
  const env = await page.$$eval("#lib .card .n", e => e.map(x => x.textContent)); if (!env.includes("25") || !env.includes("27")) throw new Error("env category: " + env);
  await page.click("#libcats >> text=All"); await settle(page);
});
await step("first run: pick your name from the team list", async () => {
  const p0 = await newPage({ name: "" }); await p0.click("text=Pick my name"); await p0.waitForSelector(".who button");
  await settle(p0); await shot(p0, "00-who-are-you");
  await p0.click(".who button >> text=Matthew Smith");
  const me = await p0.evaluate(() => [localStorage.getItem("inspector"), localStorage.getItem("myEmail")]);
  if (me[0] !== "Matthew Smith" || me[1] !== "matt.smith@genus.com.au") throw new Error("identity not saved: " + me);
  await p0.context().close();
});
await step("library search filters templates", async () => {
  await page.fill("#libq", "crane"); await settle(page);
  const n = await page.$$eval("#lib .card", e => e.length); if (n < 1 || n > 6) throw new Error("search results: " + n);
  await page.fill("#libq", ""); await settle(page);
});
await step("Mentoring tile opens the discussion record", async () => {
  await page.evaluate(() => go("#inspect")); await page.waitForSelector(".tiles .tile"); await page.click(".tile >> text=Mentoring");
  await page.waitForFunction(() => location.hash.startsWith("#insp/") && CUR && CUR.tab === 23);
  await page.evaluate(async () => { await dbDel("drafts", CUR.id); go("#home"); });
});
await step("inspection 24 – observation record is required, shown in review, email and PDF", async () => {
  await page.evaluate(() => go("#inspect")); await page.waitForSelector(".tiles .tile"); await page.click(".tile >> text=Task Observation"); await page.waitForSelector("#narr textarea");
  const p0 = await page.evaluate(() => problems(CUR));
  for (const want of ["Observation record – What was observed", "Observation record – Positives – what went well", "Overall – was the task performed safely?"]) if (!p0.includes(want)) throw new Error("missing check: " + want);
  await page.fill('[data-d="location"]', "Switchyard bay 3");
  await page.fill('[data-n="observed"]', "Crew pulling cable into conduit with a winch and two spotters");
  await page.fill('[data-n="positives"]', "Exclusion zone set up and clear comms before each pull");
  await page.fill('[data-n="improve"]', "Gloves worn but cuffs not secured");
  await page.click("#ovr >> text=Yes – with improvements");
  await page.evaluate(() => allQ(tabByNum(24)).forEach(q => rate(q.id, "C")));
  const p1 = await page.evaluate(() => problems(CUR)); if (p1.length) throw new Error(p1.join("; "));
  await page.locator("#narr").scrollIntoViewIfNeeded(); await settle(page); await shot(page, "02a-observation-record");
  await page.evaluate(() => toReview()); await page.waitForFunction(() => location.hash.startsWith("#review/"));
  const rv = await page.textContent("#app"); if (!/Observation record/i.test(rv) || !/Yes – with improvements/.test(rv)) throw new Error("review missing observation record");
  const txt = await page.evaluate(() => bodyText(CUR)); if (!/OBSERVATION RECORD/.test(txt) || !/Exclusion zone/.test(txt)) throw new Error("email text missing observation record");
  const html = await page.evaluate(() => htmlBody(CUR)); if (!/Observation record/.test(html)) throw new Error("email html missing observation record");
  await page.waitForFunction(() => typeof PDFFILE !== "undefined" && PDFFILE && PDFFILE.size > 20000, null, { timeout: 30000 });
  await page.evaluate(async () => { await dbDel("drafts", CUR.id); go("#home"); });
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
  if (await page.$(`${q0} .riskbox`)) throw new Error("checklist items should not ask for a risk rating");
  await page.click(`${q0} .seg button >> nth=1`); // open
  await page.selectOption(`${q0} .pp select`, "Zane Patten");
  if (!/zane\.patten@genus\.com\.au/.test(await page.textContent(q0))) throw new Error("team email not shown");
  const due = await page.inputValue(`${q0} .nc input[type=date]`); const want = await page.evaluate(() => addDaysISO(7)); if (due !== want) throw new Error(`NI due should be 7 days (${want}), got ${due}`);
  await settle(page); await page.locator(q0).scrollIntoViewIfNeeded(); await shot(page, "02-finding-risk");
  // second item UA closed on the spot, the rest compliant (fast path)
  await page.evaluate(ids => { rate(ids[1], "UA"); const a = CUR.answers[ids[1]]; Object.assign(a, { finding: "First aid kit missing burns dressings", action: "Restock kit", closed: true, taken: "Restocked from site store" }); ids.slice(2).forEach(id => rate(id, "C")); save(CUR, true); refreshQ(ids[1]); }, ids);
  const p = await page.evaluate(() => problems(CUR)); if (p.length) throw new Error(p.join("; "));
});
await step("risk rating: not needed on checklist items, required on other hazards", async () => {
  const r = await page.evaluate(() => [ncComplete({ finding: "x", action: "y", closed: true, taken: "z" }), ncComplete({ hazard: true, finding: "x", action: "y", closed: true, taken: "z" }), ncComplete({ hazard: true, finding: "x", action: "y", closed: true, taken: "z", cons: 2, like: 2 })]);
  if (r.join() !== "true,false,true") throw new Error("ncComplete: " + r);
  await page.evaluate(() => addOther()); await page.waitForSelector("#others .riskbox");
  if (!(await page.evaluate(() => problems(CUR))).some(x => /other hazards also need a risk rating/.test(x))) throw new Error("other hazard without risk not flagged");
  await page.evaluate(() => { CUR.others.splice(0, 1); save(CUR, true); renderOthers(); });
  const p = await page.evaluate(() => problems(CUR)); if (p.length) throw new Error(p.join("; "));
});
await step("review screen, signature and PDF", async () => {
  await page.evaluate(() => toReview());
  await page.waitForFunction(() => location.hash.startsWith("#review/"));
  const box = await page.locator("#sig").boundingBox();
  await page.mouse.move(box.x + 30, box.y + 100); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 40, { steps: 8 }); await page.mouse.move(box.x + 220, box.y + 110, { steps: 8 }); await page.mouse.up();
  await page.waitForFunction(() => typeof PDFFILE !== "undefined" && PDFFILE && PDFFILE.size > 20000, null, { timeout: 30000 });
  const size = await page.evaluate(() => PDFFILE.size); console.log("      pdf bytes", size);
  // a finger on the pad must not scroll the page (Paul: the screen moved up and down instead of signing)
  const held = await page.evaluate(() => ["touchstart", "touchmove"].map(t => { const e = new Event(t, { bubbles: true, cancelable: true }); $("#sig").dispatchEvent(e); return e.defaultPrevented; }));
  if (held.includes(false)) throw new Error("signature pad lets the page scroll: " + held);
  const css = await page.evaluate(() => getComputedStyle($("#sig")).touchAction); if (css !== "none") throw new Error("touch-action " + css);
  await settle(page); await shot(page, "03-review");
});
await step("send directly through the relay (findings reach the log)", async () => {
  await page.click("#bShare");
  await page.waitForFunction(() => location.hash === "#inspect", null, { timeout: 30000 });
  const j = relay.get({ action: "dashboard", key: relay.key });
  if (j.findings.length !== 2) throw new Error("findings logged: " + j.findings.length);
  if (!relay.mail.length || !relay.mail[0].attachments) throw new Error("no email with PDF");
  const rep = relay.mail.find(m => m.attachments); if (!/Risk/.test(rep.htmlBody)) throw new Error("email lacks risk column");
  if (/Risk: /.test(rep.body)) throw new Error("checklist findings should not show a risk line in the email");
  const asg = relay.mail.find(m => m.to === "zane.patten@genus.com.au"); if (!asg) throw new Error("assignee not emailed");
  if (!relay.mail.find(m => /^URGENT/.test(m.subject || ""))) throw new Error("no urgent alert for the UA finding");
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
  await p2.click("text=Close out action"); await p2.fill("#coBy", "Zane Patten"); await p2.fill("#coNote", "New ERP revision posted and crew briefed at prestart");
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
await step("home shows Badgingarra weather and the official FDR; manager can override", async () => {
  await page.evaluate(() => { localStorage.removeItem("wx"); localStorage.removeItem("fdr"); go("#home"); });
  await page.waitForFunction(() => /FIRE DANGER/.test((document.querySelector(".hero .wx") || {}).textContent || "") && /km\/h/.test(document.querySelector(".hero .wx").textContent) && /High/.test(document.querySelector(".fdr").textContent), null, { timeout: 15000 });
  const t = await page.textContent(".hero .wx");
  for (const want of ["High", "Tomorrow: Extreme", "27°", "ESE 24 km/h", "gusts 41", "10% rain", "Badgingarra"]) if (!t.includes(want)) throw new Error("weather strip missing " + want + ": " + t);
  await page.evaluate(() => window.scrollTo(0, 0)); await settle(page); await shot(page, "17-home-weather");
  await page.click(".fdr"); await page.waitForSelector(".fdrbig"); const info = await page.textContent(".sheet");
  if (!/Lesueur/.test(info) || !/Bureau of Meteorology/.test(info) || !/Be ready to act/.test(info)) throw new Error("FDR details: " + info.slice(0, 200));
  await settle(page); await shot(page, "18-fdr-details");
  await page.selectOption("#fdrSet", "Extreme"); await page.click("text=Save for everyone"); await page.waitForFunction(() => /Extreme/.test(document.querySelector(".fdr").textContent), null, { timeout: 10000 });
  if (relay.get({ action: "weather", key: relay.key }).fdr.today !== "Extreme") throw new Error("manual FDR not stored");
  await page.click(".fdr"); await page.waitForSelector("#fdrSet"); await page.selectOption("#fdrSet", ""); await page.click("text=Save for everyone");
  await page.waitForFunction(() => /High/.test(document.querySelector(".fdr").textContent), null, { timeout: 10000 });
});
await step("quick hazard report (Critical) goes to the register and alerts", async () => {
  const before = relay.mail.length;
  await page.evaluate(() => go("#report/hazard")); await page.waitForSelector("#obLoc");
  await page.fill("#obLoc", "Cowalla Road entry");
  await page.fill("#app textarea >> nth=0", "Unbunded fuel drum next to the table drain");
  await page.click(".riskbox .rscale >> nth=0 >> button >> nth=3"); // Severe
  await page.click(".riskbox .rscale >> nth=1 >> button >> nth=3"); // Likely -> Critical 20
  await page.click("text=No – needs action");
  await page.fill("#app textarea >> nth=2", "Move drum into bunded storage");
  await page.selectOption(".pp select", "Paul Delaney");
  await page.setInputFiles('#obPh input[type=file] >> nth=1', path.join(root, "icon-192.png")); await page.waitForSelector("#obPh .photos img");
  await settle(page); await shot(page, "09-hazard-report");
  await page.click("text=Send hazard report"); await page.waitForFunction(() => location.hash === "#inspect", null, { timeout: 20000 });
  const sent = relay.mail.slice(before);
  if (!sent.find(m => /^URGENT/.test(m.subject || ""))) throw new Error("no urgent alert for Critical hazard");
  if (!sent.find(m => m.to === "paul.delaney@genus.com.au")) throw new Error("owner not emailed");
  const j = relay.get({ action: "dashboard", key: relay.key });
  if (!j.findings.find(f => f.no === "HZ" && f.level === "Critical")) throw new Error("hazard not on register");
});
await step("positive observation is logged", async () => {
  await page.evaluate(() => go("#report/positive")); await page.waitForSelector("#obLoc");
  await page.fill("#obLoc", "Laydown area 2"); await page.fill("#app textarea >> nth=0", "Crew stopped work when wind exceeded the lift plan limit");
  await page.click(".chip >> text=Speaking up / stop work");
  await page.click("text=Send observation"); await page.waitForFunction(() => location.hash === "#inspect", null, { timeout: 20000 });
  const j = relay.get({ action: "dashboard", key: relay.key });
  if (j.obs.length !== 2) throw new Error("observations logged: " + j.obs.length);
});
await step("submitted hazard and positive reports open in the app, with photos and the linked action", async () => {
  await page.evaluate(() => { localStorage.removeItem("reps"); REPS = { at: 0, list: [], full: false }; go("#actions"); }); await page.waitForSelector(".acttabs");
  await page.click(".acttabs >> text=Reports"); await page.waitForSelector(".replist .rep");
  const n = await page.$$eval(".replist .rep", e => e.length); if (n < 2) throw new Error("reports listed: " + n);
  await page.click(".chips >> text=Open hazards"); await page.waitForSelector(".replist .rep.hz");
  await settle(page); await shot(page, "33-reports-list");
  await page.click(".replist .rep.hz >> nth=0"); await page.waitForSelector(".rephead");
  await page.waitForSelector("#repph img", { timeout: 15000 });
  const t = await page.textContent("#app"); if (!/Unbunded fuel drum/.test(t) || !/Move drum into bunded storage/.test(t) || !/Paul Delaney/.test(t)) throw new Error("report detail: " + t.slice(0, 300));
  await settle(page); await shot(page, "34-report-detail");
  await page.click(".card.act"); await page.waitForSelector(".sheet"); if (!/Open the hazard report/.test(await page.textContent(".sheet"))) throw new Error("action has no link back to the report");
  await page.evaluate(() => closeSheet());
});
await step("Insights shows lead indicators (no targets)", async () => {
  await page.evaluate(() => { REG.at = 0; go("#insights"); }); await page.waitForFunction(() => /HAZARD REPORTS/.test((document.querySelector("#dbody") || {}).textContent || ""));
  const t = await page.textContent("#dbody"); if (/Inspection targets/.test(t)) throw new Error("targets still shown");
  if (!/HAZARD REPORTS\s*1/.test(t) || !/POSITIVE OBS\s*1/.test(t)) throw new Error("lead indicators missing");
  await page.evaluate(() => [...document.querySelectorAll(".chart h3")].find(h => /Lead indicators/.test(h.textContent)).scrollIntoView({ block: "start" })); await settle(page); await shot(page, "10-lead-indicators");
});
await step("monthly HSE summary PDF builds", async () => {
  const n = await page.evaluate(() => buildMonthlyPDF(DASH.j).size); if (n < 15000) throw new Error("monthly pdf bytes " + n); console.log("      monthly pdf bytes", n);
});
await step("weekly report: Monday 6 am to Sunday 6 pm, across months, PDF and KPI text", async () => {
  await page.evaluate(() => go("#insights")); await page.waitForFunction(() => DASH.j && document.querySelector(".kpis") && !document.querySelector("#app .skel"), null, { timeout: 15000 }); await page.waitForTimeout(800);
  await page.click("button:has-text(\"Weekly report\")"); await page.waitForSelector("#wkSel");
  const opts = await page.$$eval("#wkSel option", o => o.map(x => x.textContent)); if (opts.length !== 12 || !/Mon .* – Sun /.test(opts[0])) throw new Error("weeks: " + opts.slice(0, 2));
  // window boundaries: Monday 06:00 to Sunday 18:00
  const b = await page.evaluate(() => { const s = wkStart(new Date(2026, 9, 1, 12)); const e = wkEnd(s); return [s.toString(), e.toString(), wkStart(new Date(2026, 9, 5, 5, 59)).getDate(), wkNo(s)]; });
  if (!/Mon Sep 28 2026 06:00/.test(b[0]) || !/Sun Oct 04 2026 18:00/.test(b[1]) || b[2] !== 5 || b[3] !== 40) throw new Error("week window: " + b.join(" | "));
  await page.selectOption("#wkSel", { index: 0 }); await page.waitForFunction(() => !document.querySelector("#wkPdf").disabled, null, { timeout: 15000 });
  const kv = await page.textContent("#wkPrev"); if (!/Inspections completed\s*[1-9]/.test(kv) || !/Hazard reports/.test(kv)) throw new Error("weekly preview: " + kv.slice(0, 300));
  const t = await page.evaluate(() => weeklyText(WK.data)); if (!/^PARRON weekly report – Week \d+/.test(t) || !/Positive observations: [1-9]/.test(t)) throw new Error("weekly text: " + t);
  const size = await page.evaluate(async () => (await buildWeeklyPDF(WK.data).arrayBuffer()).byteLength); if (size < 20000) throw new Error("weekly pdf " + size);
  if (SHOTS) fs.writeFileSync(path.join(out, "weekly.pdf"), Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await buildWeeklyPDF(WK.data).arrayBuffer())))));
  await settle(page); await shot(page, "27-weekly-report"); await page.evaluate(() => closeSheet());
});
await step("My Day: private planner – add, tick, edit, per-person, never sent", async () => {
  const postsBefore = JSON.stringify(relay.mail).length;
  await page.evaluate(() => go("#home")); await page.waitForSelector(".tile.myday"); await page.click(".tile.myday");
  await page.waitForSelector(".privacy"); const banner = await page.textContent(".privacy");
  if (!/Only you can see this page/.test(banner) || !/SHE Manager cannot see it/.test(banner)) throw new Error("privacy message missing");
  await page.fill("#mdIn", "Call Shire about Cowalla Rd potholes ZZPRIVATE"); await page.click(".chip >> text=Priority"); await page.fill("#mdIn", "Call Shire about Cowalla Rd potholes ZZPRIVATE"); await page.press("#mdIn", "Enter");
  await page.click(".chip >> text=Toolbox talk");
  await page.click(".seg >> text=Tomorrow"); await page.fill("#mdIn", "Review spill kit order"); await page.press("#mdIn", "Enter");
  let t = await page.textContent("#app"); if (!/2 to do today/.test(t) || !/Tomorrow/.test(t)) throw new Error("planner state: " + t.slice(0, 200));
  await page.click(".mdi >> nth=0 >> .mdc"); t = await page.textContent("#app"); if (!/Done today/.test(t) || !/1 to do today/.test(t)) throw new Error("tick failed");
  await page.evaluate(() => window.scrollTo(0, 0)); await settle(page); await shot(page, "16-my-day");
  // carried over from yesterday
  await page.evaluate(() => { const L = mdLoad(); L.push({ id: "old1", text: "Yesterday job", date: addDaysISO(-1), time: "", pri: false, done: false, created: 1 }); mdSave(L); drawMyDay(); });
  if (!/carried over/.test(await page.textContent("#app"))) throw new Error("carry-over missing");
  // another person on the same phone sees their own (empty) list
  const other = await page.evaluate(() => { const me = localStorage.getItem("inspector"); localStorage.setItem("inspector", "Matt Smith"); const n = mdLoad().length; localStorage.setItem("inspector", me); return n; });
  if (other !== 0) throw new Error("another user can see this list");
  // never sent anywhere
  await page.evaluate(() => flushOutbox()); await page.waitForTimeout(500);
  if (JSON.stringify(relay.mail).includes("ZZPRIVATE")) throw new Error("private item was emailed");
  const j = JSON.stringify(relay.get({ action: "dashboard", key: relay.key })); if (j.includes("ZZPRIVATE")) throw new Error("private item reached the project log");
  await page.evaluate(() => go("#home")); await page.waitForSelector(".tile.myday"); if (!/to do today/.test(await page.textContent(".tile.myday"))) throw new Error("tile count missing");
});
await step("My Day repeating reminder: monthly, emailed on the day, banner on home", async () => {
  await page.evaluate(() => { localStorage.setItem("myEmail", "darren.frizzell@genus.com.au"); go("#myday"); }); await page.waitForSelector("#mdRep");
  const dom = await page.evaluate(() => new Date().getDate());
  await page.selectOption("#mdRep", "monthly"); await page.selectOption("#mdRep + select, .mdopts select >> nth=1", String(dom));
  await page.check(".mdopts .vchk input"); await page.fill("#mdIn", "Re-print the SWMS"); await page.press("#mdIn", "Enter");
  await page.waitForFunction(() => /Repeating/.test(document.querySelector("#app").textContent));
  const t = await page.textContent("#app");
  if (!/Re-print the SWMS/.test(t) || !/Monthly on the/.test(t) || !/email/.test(t)) throw new Error("repeating list: " + t.slice(0, 300));
  if (!(await page.evaluate(() => mdLoad().some(x => x.rid && x.text === "Re-print the SWMS" && x.date === todayISO())))) throw new Error("today's reminder item not created");
  // weekly on another day does not appear today
  await page.selectOption("#mdRep", "weekly"); const other = await page.evaluate(() => (new Date().getDay() + 2) % 7);
  await page.selectOption(".mdopts select >> nth=1", String(other)); await page.fill("#mdIn", "Weekly plant audit"); await page.press("#mdIn", "Enter");
  if (await page.evaluate(() => mdLoad().some(x => x.text === "Weekly plant audit"))) throw new Error("weekly reminder appeared on the wrong day");
  await page.evaluate(() => window.scrollTo(0, 0)); await settle(page); await shot(page, "19-my-day-repeating");
  const rows = relay.sheet("Reminders").getLastRow(); if (rows !== 2) throw new Error("reminder rows in log: " + rows + " (only the emailed one should be stored)");
  const before = relay.mail.length; relay.ctx.remindersRun();
  const m = relay.mail.slice(before).find(x => /Reminder: Re-print the SWMS/.test(x.subject || "")); if (!m || m.to !== "darren.frizzell@genus.com.au") throw new Error("reminder email not sent");
  await page.evaluate(() => go("#home")); await page.waitForSelector(".remind"); if (!/Re-print the SWMS/.test(await page.textContent(".remind"))) throw new Error("home banner missing");
  await settle(page); await shot(page, "20-home-reminder");
});
await step("Trade Assistants: fuel register – one sheet a day (pre-starts, hour meters, fuel), sign and send to the Project Admin", async () => {
  await page.evaluate(() => go("#inspections")); await page.waitForSelector("#lib .card");
  if (/Firefighting Water Trailer|Fuel, Hours/.test(await page.textContent("#lib"))) throw new Error("TA forms should not be in the inspection list");
  await page.evaluate(() => go("#inspect")); await page.click(".tile >> text=Trade Assistants"); await page.waitForSelector(".tacard");
  if (!/Firefighting Water Trailer/.test(await page.textContent("#app"))) throw new Error("fire trailer missing from TA page");
  if (!/One entry a day/.test(await page.textContent(".tacard")) || /Start of day/.test(await page.textContent(".tacard"))) throw new Error("TA page should show a single daily register");
  await settle(page); await shot(page, "21-ta-page");
  await page.click(".tacard button.btn.o"); await page.waitForSelector(".fa");
  if (await page.$(".fstage") || /Save start of day/.test(await page.textContent("#app"))) throw new Error("start / end of day split should be gone");
  await page.click(".tachips >> text=Jayden Mullan"); await page.waitForSelector(".tachips .chip.on");
  if (await page.inputValue('[data-d="inspector"]') !== "Jayden Mullan" || await page.inputValue("#fuPos") !== "Trade Assistant") throw new Error("TA quick pick did not fill name / position"); await page.evaluate(() => window.scrollTo(0, 0)); await settle(page); await shot(page, "21b-fuel-who");
  const fixed = await page.textContent(".fixed"); if (!/PWF – 1084/.test(fixed) || !/Day/.test(fixed)) throw new Error("fixed details: " + fixed);
  // review with nothing filled in lists what is missing
  if (!(await page.evaluate(() => problems(CUR))).some(x => /WL46/.test(x))) throw new Error("missing list");
  const n = await page.$$eval(".fa", e => e.length); if (n !== 9) throw new Error("assets: " + n);
  // WL46 + GEN02 used; GEN01 pre-start not done (needs a reason); the rest N/A – all on the one sheet
  for (let i = 0; i < 9; i++) await page.click(`#fa-${i} .seg >> nth=0 >> button:has-text("${i === 0 || i === 2 ? "Yes" : i === 1 ? "No" : "N/A"}")`);
  for (const f of ["0|hs", "0|he", "0|flow", "0|fuel", "0|cmt"]) if (!await page.$(`#fa-0 [data-fu="${f}"]`)) throw new Error("one sheet should have " + f);
  if (await page.$('#fa-3 [data-fu="3|fuel"]')) throw new Error("N/A asset should hide its fields");
  await page.fill('#fa-0 [data-fu="0|hs"]', "8567.3"); await page.fill('#fa-2 [data-fu="2|hs"]', "9780.7");
  await page.fill('#fa-1 [data-fu="1|cmt"]', "Genset fault – reported to Supervisor");
  await page.setInputFiles('#fa-0 input[type=file] >> nth=1', path.join(root, "icon-192.png")); await page.waitForSelector("#fa-0 .photos img");
  await page.fill('[data-fu="0|he"]', "8575.1"); await page.fill('[data-fu="0|fuel"]', "40"); await page.fill('[data-fu="0|cmt"]', "Fuelled pod (Badgingarra Roadhouse)");
  await page.fill('[data-fu="2|fuel"]', "90"); await page.fill('[data-fu="1|fuel"]', "12.5");
  if ((await page.textContent("#ftot")).trim() !== "142.5") throw new Error("total: " + await page.textContent("#ftot"));
  if (!/7.8 hrs/.test(await page.textContent("#fhr-0"))) throw new Error("hours run not shown");
  await settle(page); await shot(page, "22-fuel-day");
  await page.click("#fstage >> text=Review & sign"); await page.waitForSelector("#sig");
  const sig = await page.$("#sig"); await sig.scrollIntoViewIfNeeded(); const b = await sig.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down(); await page.mouse.move(b.x + 120, b.y + 60); await page.mouse.move(b.x + 200, b.y + 25); await page.mouse.up();
  await page.fill("#fvName", "Matthew Smith"); if (await page.inputValue("#fvPos") !== "Senior Civil Supervisor") throw new Error("verifier role not filled");
  if (!/amie\.smith@genus\.com\.au/.test(await page.textContent("#app"))) throw new Error("Amie not shown as recipient");
  await page.waitForFunction(() => !document.querySelector("#bShare").disabled, null, { timeout: 15000 }).catch(async e => { throw new Error("send not ready: " + JSON.stringify(await page.evaluate(() => problems(CUR)))); });
  const pdf = await page.evaluate(async () => { PDFBLOB = null; const b = await buildPDF(CUR); const t = await b.text(); return { size: b.size, land: /\/MediaBox \[0 0 841/.test(t) }; });
  if (pdf.size < 5000 || !pdf.land) throw new Error("fuel PDF: " + JSON.stringify(pdf));
  if (SHOTS) fs.writeFileSync(path.join(out, "fuel-register.pdf"), Buffer.from(await page.evaluate(async () => { PDFBLOB = null; const b = await buildPDF(CUR); return Array.from(new Uint8Array(await b.arrayBuffer())); })));
  await settle(page); await shot(page, "24-fuel-review");
  const before = relay.mail.length; await page.click("#bShare"); await page.waitForFunction(() => location.hash === "#inspect", null, { timeout: 15000 });
  const m = relay.mail.slice(before).find(x => /Fuel, Hours/.test(x.subject || ""));
  if (!m || m.to !== "amie.smith@genus.com.au,darren.frizzell@genus.com.au") throw new Error("register email: " + (m && m.to));
  if (!/Recorded by: Jayden Mullan/.test(m.body) || !/Completed: [0-9:]+ \(end of day\)/.test(m.body) || /Start of day:/.test(m.body)) throw new Error("register body: " + m.body.slice(0, 400));
  if (!/142.5 L/.test(m.subject) || !/PRE-START NOT DONE/.test(m.subject)) throw new Error("subject: " + m.subject);
  const rows = relay.sheet("Fuel").getLastRow() - 1; if (rows !== 9) throw new Error("fuel rows logged: " + rows);
  await page.evaluate(() => go("#ta")); await page.waitForSelector(".tacard"); if (!/register has been sent/.test(await page.textContent("#app"))) throw new Error("TA page should show today's register as sent");
});
await step("PARRON Radio: shuffle play, next, skip unavailable song, keeps playing across screens", async () => {
  await page.evaluate(() => { localStorage.removeItem("radio"); go("#home"); }); await page.click(".tile >> text=PARRON Radio"); await page.waitForSelector(".rlist button");
  const n = await page.$$eval(".rlist button", e => e.length); if (n !== 26) throw new Error("songs: " + n);
  if (!/Vehicles &? ?&?amp;? ?Driving|Vehicles & Driving/.test(await page.textContent("#app"))) throw new Error("driving note missing");
  await page.waitForFunction(() => window._yt, null, { timeout: 10000 });
  await page.click("#rBig"); await page.waitForFunction(() => RADIO.playing, null, { timeout: 5000 });
  const first = await page.evaluate(() => radioSong().t); await page.click(".rc >> nth=2"); await page.waitForFunction(t => radioSong().t !== t, first);
  await page.evaluate(() => _ytErr()); // embedding refused → falls back or skips, never stops
  await page.waitForFunction(() => RADIO.playing); await page.evaluate(() => _ytEnd()); await page.waitForFunction(() => RADIO.playing);
  await page.evaluate(() => window.scrollTo(0, 0)); await settle(page); await shot(page, "25-radio");
  await page.evaluate(() => go("#home")); await page.waitForSelector("#radioDock:not(.hide):not(.full)");
  if (!(await page.evaluate(() => document.body.classList.contains("radio-on")))) throw new Error("mini player not shown on home");
  await settle(page); await shot(page, "26-home-radio");
  await page.click("#radioDock [aria-label='Stop and close']"); await page.waitForSelector("#radioDock.hide", { state: "attached" });
});
await step("site access code: asked once when the SHE Manager turns it on, then sent with every request", async () => {
  relay.props.set("SITE_CODE", "Parron26");
  await page.evaluate(() => { localStorage.removeItem("siteCode"); localStorage.removeItem("fdr"); go("#home"); });
  await page.waitForSelector("#scIn", { timeout: 15000 });
  await settle(page); await shot(page, "28-site-code");
  await page.fill("#scIn", "parron26"); await page.click("#scOk");
  await page.evaluate(() => go("#insights")); await page.waitForSelector(".kpis", { timeout: 15000 });
  if (await page.$("#scIn")) throw new Error("asked again after the right code");
  const r = await page.evaluate(async () => relayPost({ payload: { action: "status", uid: "sc1", state: "draft", meta: { name: "T" } } }, false)); if (!r.ok) throw new Error("post with code: " + JSON.stringify(r));
  relay.props.delete("SITE_CODE"); await page.evaluate(() => localStorage.removeItem("siteCode"));
});
await step("Insights: needs-attention strip, quieter report buttons", async () => {
  await page.evaluate(() => go("#insights")); await page.waitForSelector(".attn");
  const t = await page.textContent(".attn"); if (!/Needs attention|All actions on track/.test(t)) throw new Error("attention strip: " + t);
  if ((await page.$$(".reports .btn")).length !== 2) throw new Error("report buttons");
  await page.evaluate(() => window.scrollTo(0, 0)); await settle(page); await shot(page, "29-insights-attention");
});
await step("inspection list: compact by default, detailed on request (remembered)", async () => {
  await page.evaluate(() => { localStorage.removeItem("libView"); go("#inspections"); }); await page.waitForSelector("#lib.compact .card");
  if (await page.$("#lib .card .x > span")) throw new Error("compact view should hide the description");
  await settle(page); await shot(page, "30-inspections-compact");
  await page.click(".vtog button >> nth=1"); await page.waitForSelector("#lib.detail .card .x > span");
  if (await page.evaluate(() => localStorage.getItem("libView")) !== "detail") throw new Error("view not remembered");
  await page.click(".vtog button >> nth=0");
});
await step("offline banner shows, then confirms when signal is back", async () => {
  await page.evaluate(() => go("#home")); await page.waitForSelector(".hero");
  await page.context().setOffline(true); await page.waitForSelector("#offbar.off:not([hidden])");
  await settle(page); await shot(page, "31-offline-banner");
  await page.context().setOffline(false); await page.waitForSelector("#offbar.back:not([hidden])");
});
await step("motion: entrance, count-up and success tick run (and are skipped for reduced motion)", async () => {
  const m = await newPage({ motion: true, hash: "#home" }); await m.waitForSelector(".tiles .tile.rise");
  await m.evaluate(() => celebrate("Report sent", "Emailed to the SHE Manager")); await m.waitForSelector(".done-ov .done-tick");
  await m.waitForTimeout(900); await shot(m, "32-success-tick");
  if (await page.$(".tile.rise")) throw new Error("reduced-motion page should not animate");
});
await step("Emergency tab: call 000, site location, 21 situation cards (ERP Rev 1 + Unwell Worker card 20) (verbatim), contacts without Genus names, TARP", async () => {
  await page.evaluate(() => go("#home")); await page.click("nav.tabs >> text=Emergency"); await page.waitForSelector(".em-hero");
  if (await page.getAttribute(".em-000", "href") !== "tel:000") throw new Error("000 link");
  const t = await page.textContent("#app"); for (const w of ["M83P+PRV", "30.3456° S, 115.3370° E", "UHF Channel 24", "Primary – Site Office Muster Point"]) if (!t.includes(w)) throw new Error("emergency page missing " + w);
  if ((await page.$$(".em-tile")).length !== 21) throw new Error("cards: " + (await page.$$(".em-tile")).length);
  // alignment: a tile left alone in the last row spans the row, so the grid keeps straight edges
  const g = await page.evaluate(() => { const G = $(".em-grid").getBoundingClientRect(), L = [...document.querySelectorAll(".em-tile")].pop().getBoundingClientRect(); return [Math.round(G.left), Math.round(G.right), Math.round(L.left), Math.round(L.right)]; });
  if (g[0] !== g[2] || g[1] !== g[3]) throw new Error("last tile not aligned to the grid: " + g);
  await page.evaluate(() => window.scrollTo(0, 0)); await settle(page); await shot(page, "35-emergency");
  await page.click(".em-tile.em-snake"); await page.waitForSelector(".em-step .eb");
  const c = await page.textContent("#app"); if (!/elasticated roller bandage \(10-15cm wide\)/.test(c) || !/Appendix B Rev 1 \| 25\/09\/2026/.test(c)) throw new Error("snake card wording: " + c.slice(0, 200));
  await settle(page); await shot(page, "36-emergency-card");
  await page.evaluate(() => go("#emergency/card/drsabcd")); await page.waitForSelector(".em-evac");
  await page.evaluate(() => go("#emergency/card/unwell")); await page.waitForSelector(".em-step .eb"); await page.waitForFunction(() => document.querySelector("img.em-evac") && document.querySelector("img.em-evac").naturalWidth > 1000);
  { const u = await page.textContent("#app"); for (const w of ["UNWELL WORKER (FITNESS FOR WORK)", "healthdirect 1800 022 222", "Support and observe only", "Scenario Card 20"]) if (!u.includes(w)) throw new Error("unwell worker card missing " + w);
    if (/Gary|Armitage|Frizzell|0477|0484/.test(u)) throw new Error("Genus names on the unwell worker card"); }
  await settle(page); await shot(page, "36b-unwell-worker");
  await page.evaluate(() => go("#emergency/card/heat")); await page.waitForSelector(".em-step .eb"); if (!/Signs of heat stroke/.test(await page.textContent("#app"))) throw new Error("heat illness card");
  await page.evaluate(() => go("#emergency")); await page.waitForSelector("img.em-evac"); await page.waitForFunction(() => document.querySelector("img.em-evac").naturalWidth > 0);
  await page.evaluate(() => go("#emergency/contacts")); await page.waitForSelector(".callrow");
  const ct = await page.textContent("#app"); if (/Gary|Armitage|Frizzell|Shotter|0477|0484|0475/.test(ct)) throw new Error("Genus personal contacts shown on the public link");
  await page.fill("#emq", "moora"); const n = await page.$$eval(".callrow", e => e.length); if (n < 3) throw new Error("contact search: " + n);
  await page.fill("#emq", ""); await settle(page); await shot(page, "37-emergency-contacts");
  await page.evaluate(() => go("#emergency/tarp")); await page.waitForSelector(".tarp");
  if ((await page.$$(".tarp")).length !== 4) throw new Error("TARP levels"); if (/Pushparatnam|Sapsford|Linda Wood/.test(await page.textContent("#app"))) throw new Error("client names shown");
  await page.click(".tarp >> nth=1 >> summary"); await settle(page); await shot(page, "38-tarp");
});
await step("Traffic tab: six site maps (incl. HV clearance drawing), open full screen", async () => {
  await page.click("nav.tabs >> text=Traffic"); await page.waitForSelector(".tmap img");
  if ((await page.$$(".tmap")).length !== 6) throw new Error("maps");
  if (!/HV power line clearance – Lots Y & Z/.test(await page.textContent("#app"))) throw new Error("HV clearance map tile");
  await page.waitForFunction(() => [...document.querySelectorAll(".tmap img")].every(i => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
  await settle(page); await shot(page, "39-traffic");
  await page.click(".tmap >> nth=1"); await page.waitForSelector(".tmap-full img"); await page.click("text=Full screen"); await page.waitForSelector(".zoom img"); await page.click(".zoom .zb button >> nth=1");
});
const perthDay = (n = 0) => new Date(Date.now() + 8 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const BAD_WORDS = ["murder", "massacre", "killed", "killing", "terrorist", "bombing", "shooting", "assassinat", "executed", "genocide", "rape", "suicide", "war crime", "hostage", "behead"];
await step("Today on site: not set → wrong PIN rejected → Morning High / TFB No / HVMB Yes → HVMB box first, next check 12:00", async () => {
  await page.evaluate(() => { localStorage.removeItem("siteStatus"); localStorage.removeItem("statusPin"); SITEST = null; go("#home"); }); await page.waitForSelector("#stp .st-panel");
  if (!/NOT SET TODAY/.test(await page.textContent("#stp"))) throw new Error("should start NOT SET TODAY");
  const first = await page.evaluate(() => [...document.querySelector("#app").children].find(e => e.innerHTML.trim()).id); if (first !== "stp" && first !== "fdb") throw new Error("status panel is not at the top of Home: " + first);
  await page.click("#stp .st-upd"); await page.waitForSelector(".st-pick");
  await page.click(".st-pick button:has-text('High')"); await page.click(".seg[data-k=tfb] button:has-text('No')"); await page.click(".seg[data-k=hvmb] button:has-text('Yes')"); await page.click(".seg[data-k=type] button:has-text('Morning')");
  await page.fill("#stPin", "1111"); await page.click("#stSave"); await page.waitForFunction(() => /Incorrect status PIN/.test(document.querySelector("#toast").textContent));
  if (relay.sheet("Site Status").getLastRow() !== 1) throw new Error("wrong PIN saved a row");
  await settle(page); await shot(page, "40-status-set");
  await page.fill("#stPin", "4321"); await page.click("#stSave"); await page.waitForSelector("#stp .st-fdr");
  const t = await page.textContent("#stp"); if (!/High/.test(t) || !/Next check due 12:00/.test(t) || !/Set by Test Inspector/.test(t)) throw new Error("panel: " + t);
  if (!/DECLARED/.test(await page.textContent("#stp .st-chip.on"))) throw new Error("HVMB chip");
  await page.evaluate(() => window.scrollTo(0, 0)); await settle(page); await shot(page, "41-status-home");
  await page.click("#stp .st-panel"); await page.waitForSelector(".st-box");
  const boxes = await page.$$eval(".st-box", e => e.map(x => x.className)); if (!/hv/.test(boxes[0]) || boxes.length !== 2) throw new Error("boxes: " + boxes);
  // the restrictions text must be readable in light mode (it once inherited the white fire-danger badge style)
  const ink = await page.$eval(".st-box.fdrbox li", e => [getComputedStyle(e).color, getComputedStyle(e.closest(".st-box")).backgroundColor]);
  if (ink[0] === ink[1] || /rgb\(255, 255, 255\)/.test(ink[0])) throw new Error("restrictions text unreadable: " + ink);
  const d = await page.textContent("#app"); for (const w of ["An HVMB overrides TFB conditions and exemptions", "Lookout nominated at pre-start; regular monitoring of warnings; midday re-check.", "DFES TFB Hotline 1800 709 355", "New declarations are broadcast on UHF 24 and override this screen."]) if (!d.includes(w)) throw new Error("detail missing: " + w);
  await settle(page); await shot(page, "42-status-detail");
});
await step("Today on site: after 12:00 → overdue banner; next day → NOT SET TODAY; offline → last known", async () => {
  const at = Date.parse(perthDay() + "T11:00:00+08:00");
  const c = await newPage({ clock: at, hash: "#home" }); await c.waitForSelector("#stp .st-fdr");
  // status from the relay was set (real time) today as a Morning check – the clock page sees it at 11:00, 12:30 and the next morning
  await c.evaluate(() => { const s = SITEST.status; s.at = new Date(new Date().setHours(6, 10, 0, 0)).toISOString(); ls("siteStatus", JSON.stringify(SITEST)); });
  await c.route(/action=getStatus/, r => r.abort());
  await c.evaluate(() => go("#status")); await c.waitForSelector(".st-panel");
  if (await c.$(".st-late")) throw new Error("should not be overdue at 11:00");
  await c.clock.setFixedTime(Date.parse(perthDay() + "T12:30:00+08:00")); await c.evaluate(() => { go("#home"); route(); }); await c.waitForSelector("#stp .st-late");
  if (!/Check overdue – confirm with the site office before relying on this\./.test(await c.textContent("#stp"))) throw new Error("overdue text");
  if (!/Last known – may be out of date/.test(await c.textContent("#stp"))) throw new Error("offline marker");
  await settle(c); await shot(c, "43-status-overdue");
  await c.clock.setFixedTime(Date.parse(perthDay(1) + "T07:00:00+08:00")); await c.evaluate(() => route()); await c.waitForSelector("#stp .notset");
  if (!/NOT SET TODAY – ?|NOT SET TODAY/.test(await c.textContent("#stp")) || !/Do not rely on yesterday's rating\. Check DFES \/ Shire before work\./.test(await c.textContent("#stp"))) throw new Error("not set today");
  await c.evaluate(() => go("#status")); await c.waitForSelector(".st-panel.notset"); if (await c.$(".st-box")) throw new Error("restrictions should be hidden when not set today");
  await settle(c); await shot(c, "44-status-notset");
});
await step("This day in history: three suitable facts from the relay, big text, Swap, cached; direct Wikipedia fallback", async () => {
  await page.evaluate(() => { localStorage.removeItem("history"); HIST = null; go("#home"); }); await page.waitForFunction(() => HIST && HIST.facts && HIST.facts.length === 3, null, { timeout: 15000 });
  if (await page.evaluate(() => HIST.src) !== "relay") throw new Error("should come from the relay");
  await page.evaluate(() => go("#home")); await page.waitForSelector("#hcd .hist-card");
  if (!/This day in history/.test(await page.textContent("#hcd"))) throw new Error("home card");
  await page.click("#hcd .hist-card"); await page.waitForSelector(".hist-fact");
  const facts = await page.$$eval(".hist-fact p", e => e.map(x => x.textContent)); if (facts.length !== 3) throw new Error("facts: " + facts.length);
  for (const f of facts) if (BAD_WORDS.some(w => f.toLowerCase().includes(w))) throw new Error("excluded term: " + f);
  if (parseFloat(await page.$eval(".hist-fact p", e => getComputedStyle(e).fontSize)) < 20) throw new Error("text not large");
  await settle(page); await shot(page, "45-history");
  await page.click(".hist-fact >> nth=0 >> text=Swap"); await page.waitForFunction(t => document.querySelector(".hist-fact p").textContent !== t, facts[0]);
  if (await page.evaluate(() => JSON.parse(localStorage.getItem("history")).facts[0].text) === facts[0]) throw new Error("swap not saved");
  await page.context().setOffline(true); await page.evaluate(() => go("#home")); await page.waitForSelector("#hcd .hist-card");
  if (!/\d{4} – /.test(await page.textContent("#hcd"))) throw new Error("cached facts not shown offline"); await page.context().setOffline(false);
  const w = await newPage({ hash: "#home" }); await w.route(/action=getHistory/, r => r.abort());
  await w.evaluate(() => { localStorage.removeItem("history"); HIST = null; go("#history"); }); await w.waitForSelector(".hist-fact", { timeout: 15000 });
  if (await w.evaluate(() => HIST.src) !== "wikipedia") throw new Error("fallback source: " + await w.evaluate(() => HIST.src));
});
await step("Reference: nine SNN cards with icons, 330 kV card with MAD fallback, ChemAlert button (not set / opens externally)", async () => {
  if (await page.evaluate(() => appCfg().chemAlertUrl) !== "https://chemalert.rmt.com.au/genus/login/") throw new Error("config.json chemAlertUrl not loaded");
  await page.evaluate(() => { ls("appCfg", "{}"); go("#home"); }); await page.waitForSelector("#refsec .ref-list");
  if (!/ChemAlert link not set – ask the SHE Manager/.test(await page.textContent("#refsec"))) throw new Error("ChemAlert not-set message");
  await page.click("#refsec >> text=Safety Non-Negotiables"); await page.waitForSelector(".snn-card");
  const cards = await page.$$eval(".snn-card", e => e.map(x => [x.querySelector("img").getAttribute("src"), x.querySelector("small").textContent, x.querySelector("b").textContent]));
  if (cards.length !== 9) throw new Error("SNN cards " + cards.length);
  const icons = await page.evaluate(() => SNN_CARDS.map(s => SNN_ICONS[s.c])); if (cards.some((c, i) => c[0] !== icons[i])) throw new Error("SNN icons");
  if (cards[8][1] !== "Confined Spaces" || !/obtain authorisation before entering a confined space/.test(cards[8][2])) throw new Error("CS card: " + cards[8]);
  if (!/Think Safe\. Work Safe\. Home Safe\./.test(await page.textContent("#app"))) throw new Error("SNN footer");
  await settle(page); await shot(page, "46-snn");
  await page.evaluate(() => go("#reference/330kv")); await page.waitForSelector(".hv-fallback", { timeout: 10000 });
  if (!/MAD values: refer to your Western Power permit \/ ESSR/.test(await page.textContent(".hv-fallback"))) throw new Error("MAD fallback");
  const clr = await page.textContent(".hv-clr"); if (!/19\.3 m/.test(clr) || !/1959-ASC-007 Rev 0/.test(clr) || !/not approach distances/.test(clr)) throw new Error("clearance card: " + clr.slice(0, 200));
  await page.waitForFunction(() => { const i = document.querySelector(".hv-clr img"); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 });
  await page.evaluate(() => document.querySelector(".hv-clr").scrollIntoView({ block: "start" })); await settle(page); await shot(page, "53-hv-clearance");
  if (!/Reference only – your Western Power permit and the ESSR take precedence\./.test(await page.textContent("#app"))) throw new Error("330 footer");
  await settle(page); await shot(page, "47-330kv");
  await page.evaluate(() => { ls("appCfg", JSON.stringify({ chemAlertUrl: "https://example.com/chemalert" })); go("#reference/sds"); }); await page.waitForSelector(".ref-chem a");
  const a = await page.$eval(".ref-chem a", e => [e.getAttribute("href"), e.getAttribute("target")]); if (a[0] !== "https://example.com/chemalert" || a[1] !== "_blank") throw new Error("ChemAlert link: " + a);
  await page.evaluate(() => ls("appCfg", JSON.stringify({})));
});
await step("SHEQ Alerts: SHE Manager publishes a Critical alert to everyone on site → banner, pop-up, acknowledge, register; then to chosen people", async () => {
  await page.evaluate(() => { ls("mgrPin", "2468"); go("#alerts/new"); }); await page.waitForSelector("#alTitle");
  if (!/17 site-based people must acknowledge it/.test(await page.textContent("#alWhoN"))) throw new Error("everyone on site count: " + await page.textContent("#alWhoN"));
  await page.click("#alPri button:has-text('Critical')");
  await page.fill("#alTitle", "Underground service strike – Genus site, WA");
  await page.fill("#alWhat", "An excavator contacted a live LV cable during trenching. No injuries.");
  await page.fill("#alMust", "Pothole and locate before mechanical digging\nStop and call your Supervisor if services don't match the plans");
  await settle(page); await shot(page, "48-alert-publish");
  const before = relay.mail.length; await page.click("#alPub");
  await page.waitForFunction(() => /^#alerts\/SA-\d{4}-\d{3}$/.test(location.hash), null, { timeout: 15000 });
  if (relay.sheet("SHEQ Alerts").getLastRow() !== 2) throw new Error("alert not logged");
  const to = relay.mail.slice(before).filter(x => /CRITICAL – SHEQ Alert/.test(x.subject)).map(x => x.to);
  if (!to.includes("steven.pugh@genus.com.au") || to.includes("lee.allen@genus.com.au") || to.length !== 15) throw new Error("site emails: " + to.join(","));
  await page.waitForSelector(".al-reg"); if (!/0 of 17 acknowledged/.test(await page.textContent("#app"))) throw new Error("register");
  if (!/emailed 15 of 15/.test(await page.textContent(".al-mail"))) throw new Error("email record: " + await page.textContent(".al-mail"));
  // email again goes only to people who haven't acknowledged (Genus addresses)
  const b4 = relay.mail.length; await page.click("text=Email again to those not yet acknowledged"); await page.click("#aYes");
  await page.waitForFunction(() => /\n.*emailed 14 of 14|emailed 14 of 14/.test(ALERTS.alerts[0].emailed), null, { timeout: 10000 });
  if (relay.mail.slice(b4).some(x => x.to === "darren.frizzell@genus.com.au" || x.to === "lee.allen@genus.com.au")) throw new Error("email again recipients");
  await settle(page); await shot(page, "51b-alert-email-record");
  // Nicola opens PARRON: banner at the top of Home and the critical pop-up
  const l = await newPage({ name: "Nicola Rucci", hash: "#home" });
  await l.waitForSelector("#alb .al-banner.crit", { timeout: 15000 }); await l.waitForSelector("#alRead", { timeout: 10000 });
  if ((await l.$$eval("#tabs a[data-t=home] .bdg:not(.hide)", e => e.length)) !== 1) throw new Error("Home tab badge");
  await settle(l); await shot(l, "49-alert-popup");
  await l.click("#alRead"); await l.waitForSelector("#alAck");
  if (!/What you must do/.test(await l.textContent("#app"))) throw new Error("detail");
  await settle(l); await shot(l, "50-alert-detail");
  await l.click("#alAck"); await l.waitForSelector(".al-done", { timeout: 15000 });
  if (relay.sheet("Alert Acks").getLastRow() !== 2) throw new Error("ack not recorded");
  await l.evaluate(() => go("#home")); await l.waitForSelector("#stp"); if (await l.$("#alb .al-banner")) throw new Error("banner should clear after acknowledging");
  // Lee is not site-based: no banner; sees it for information
  const x = await newPage({ name: "Lee Allen", hash: "#home" }); await x.waitForSelector("#stp"); await x.evaluate(() => alRefresh()); await x.evaluate(() => { go("#home"); route(); });
  await x.waitForSelector("#stp"); if (await x.$("#alb .al-banner")) throw new Error("Lee was not ticked – no banner");
  // SHE Manager sees Nicola ticked off
  await page.evaluate(async () => { await alRefresh(); route(); }); await page.waitForFunction(() => /1 of 17 acknowledged/.test(document.querySelector("#app").textContent), null, { timeout: 10000 });
  await page.evaluate(() => document.querySelector(".al-prog").scrollIntoView({ block: "start" })); await settle(page); await shot(page, "51-alert-register");
  // acknowledging with no signal waits on the phone and records later
  const o = await newPage({ name: "Steven Pugh", hash: "#alerts" }); await o.waitForSelector(".al-item");
  await o.context().setOffline(true); await o.click(".al-item"); await o.waitForSelector("#alAck"); await o.click("#alAck"); await o.waitForSelector(".al-done");
  if (relay.sheet("Alert Acks").getLastRow() !== 2) throw new Error("offline ack should wait");
  await o.context().setOffline(false); await o.evaluate(() => alRefresh()); if (relay.sheet("Alert Acks").getLastRow() !== 3) throw new Error("queued ack not sent");
  // closing takes it off Home
  const id = await page.evaluate(() => ALERTS.alerts[0].id); await page.evaluate(i => go("#alerts/" + i), id); await page.click("text=Close this alert"); await page.click("#aYes");
  await page.waitForFunction(() => /Re-open this alert/.test(document.querySelector("#app").textContent), null, { timeout: 10000 });
  // choose people: Trade Assistants + Lee – Nicola gets no banner and sees it "for information"
  await page.evaluate(() => go("#alerts/new")); await page.waitForSelector("#alWho");
  await page.fill("#alTitle", "Toolbox: new wheel wash procedure"); await page.fill("#alWhat", "The wheel wash procedure has changed.");
  await page.click("#alWho button[data-v=pick]"); await page.waitForSelector(".al-person");
  await page.click(".al-quick .chip[data-g=ta]"); await page.check(".al-person input[value='Lee Allen']");
  if (!/3 people must acknowledge/.test(await page.textContent("#alPickN"))) throw new Error("pick count: " + await page.textContent("#alPickN"));
  await page.uncheck(".al-person input[value='Benjamin Herbert']");
  await page.evaluate(() => document.querySelector("#alPick").scrollIntoView({ block: "start" })); await settle(page); await shot(page, "52-alert-choose");
  await page.click("#alPub"); await page.waitForFunction(() => /^#alerts\/SA-\d{4}-002$/.test(location.hash), null, { timeout: 15000 });
  await page.waitForSelector(".al-reg"); if (!/0 of 2 acknowledged/.test(await page.textContent("#app"))) throw new Error("register for chosen people");
  await l.evaluate(async () => { await alRefresh(); go("#home"); route(); }); await l.waitForSelector("#stp");
  if (await l.$("#alb .al-banner")) throw new Error("Nicola was not chosen – no banner");
  await l.evaluate(() => go("#alerts")); await l.waitForSelector(".al-item"); if (!/For information/.test(await l.textContent("#app"))) throw new Error("for information label");
  await x.evaluate(async () => { await alRefresh(); go("#home"); route(); }); await x.waitForSelector("#alb .al-banner", { timeout: 10000 });
});
await step("My SHEQ Planner: Manager mode only; suggested items → check → approve; Home tile; mark done; edit; import from a Claude table", async () => {
  const o = await newPage({ name: "Steven Pugh", hash: "#planner" }); await o.waitForSelector(".card.empty");
  if (!/SHE Manager only/.test(await o.textContent("#app"))) throw new Error("planner should be locked without Manager mode");
  if (await o.$(".pl-tile")) throw new Error("planner tile shown to a non-manager"); await o.context().close();
  await page.evaluate(() => { ls("mgrPin", "2468"); go("#planner"); }); await page.waitForSelector("text=Your register is empty");
  await page.click("text=Start with suggested items"); await page.waitForSelector(".pl-imp");
  if (await page.$$eval(".pl-imp input[type=checkbox]:checked", e => e.length) !== 5) throw new Error("5 suggested items ticked");
  const imp = await page.textContent("#plRows"); if (!/Anphin Thomas \(SHE Advisor\)/.test(imp) || !/form 18 ticks it off/.test(imp)) throw new Error("owner / form not resolved: " + imp.slice(0, 200));
  await settle(page); await shot(page, "60-planner-import");
  await page.click("#plAdd"); await page.waitForFunction(() => location.hash === "#planner" && document.querySelector(".pl-item"), null, { timeout: 15000 });
  if (relay.sheet("SHEQ Register").getLastRow() !== 6) throw new Error("register rows: " + relay.sheet("SHEQ Register").getLastRow());
  if (await page.$$eval(".pl-item", e => e.length) !== 5) throw new Error("planner items");
  if (await page.textContent("#plMail .on") !== "Off" || relay.props.get("PLANNER_EMAILS")) throw new Error("reminder emails should be off by default");
  // a weekly item is due within the week → Done moves it on a week and logs it
  await page.click(".pl-item:has-text('Weekly DG store inspection') >> text=Done"); await page.waitForSelector("#plDs"); await page.click("#plDs");
  await page.waitForFunction(() => PLAN.log.length === 1, null, { timeout: 10000 });
  const dg = await page.evaluate(() => { const i = PLAN.items.find(i => /DG store/.test(i.title)); return i.last === todayISO() && i.due === plAddEvery(todayISO(), "1 week") ? "" : JSON.stringify(i); }); if (dg) throw new Error("done: " + dg);
  // edit: make the road check overdue and owned by me
  await page.evaluate(() => plDetail(PLAN.items.find(i => /road condition/.test(i.title)).id)); await page.click("#plE"); await page.waitForSelector("#peT");
  await page.fill("#peD", await page.evaluate(() => addDaysISO(-2))); await page.click("#peOk"); await page.waitForSelector("h2:has-text('Overdue')");
  await settle(page); await shot(page, "61-planner");
  await page.evaluate(() => go("#home")); await page.waitForSelector(".pl-tile"); if (!/1 overdue/.test(await page.textContent(".pl-tile"))) throw new Error("home tile count");
  // paste a table from the Claude Project: a bad frequency is flagged and can't be added
  await page.evaluate(() => go("#planner/import")); await page.waitForSelector("#plTxt");
  await page.fill("#plTxt", "Here is the table:\n\n| Obligation | Source | Frequency | Owner | PARRON form | Remind days before | First due | Notes |\n|---|---|---|---|---|---|---|---|\n| Site evacuation drill | ERP §6.4 | 6-monthly | SHE Manager | | 30 | 2026-12-01 | Book with the Chief Warden |\n| Bund inspection after rain | HSDG §18 | After rain events | SHE Advisor | 18 | | | |\n| Toolbox | WHSMP §9 | sometimes | Supervisor | | | | |\n| Weekly DG store inspection | HSDG §21 | Weekly | SHE Advisor | 18 | 2 | | |");
  await page.click("#plRead"); await page.waitForSelector(".pl-imp");
  const st = await page.$$eval(".pl-imp input[type=checkbox]", e => e.map(x => x.disabled ? "x" : x.checked ? "1" : "0").join(""));
  if (st !== "11x0") throw new Error("ticks (ok, ok, bad, duplicate): " + st);
  if (!/not understood/.test(await page.textContent(".pl-imp.bad"))) throw new Error("bad frequency message");
  await page.click("#plAdd"); await page.waitForFunction(() => location.hash === "#planner" && PLAN.items.length === 7, null, { timeout: 15000 });
  const rain = await page.evaluate(() => PLAN.items.find(i => /after rain/.test(i.title))); if (rain.every !== "As required") throw new Error("event item: " + rain.every);
  if (!/As required – when triggered/.test(await page.textContent("#app"))) throw new Error("as required group");
  // 5 am email
  relay.cache.delete("planner_" + perth(0)); let before = relay.mail.length; relay.ctx.plannerDigest_(new Date());
  if (relay.mail.slice(before).some(x => /SHEQ/.test(x.subject))) throw new Error("emailed while reminders are off");
  await page.click("#plMail >> text=Me only"); await page.waitForFunction(() => PLAN.emails === "me", null, { timeout: 10000 });
  if (relay.props.get("PLANNER_EMAILS") !== "me") throw new Error("setting not saved in the relay");
  relay.cache.delete("planner_" + perth(0)); before = relay.mail.length; relay.ctx.plannerDigest_(new Date());
  if (relay.mail.slice(before).some(x => x.to !== "darren.frizzell@genus.com.au")) throw new Error("only the SHE Manager should be emailed");
  const m = relay.mail.slice(before).find(x => /^Your SHEQ day/.test(x.subject)); if (!m || !/Monthly road condition check/.test(m.htmlBody)) throw new Error("planner email");
});
await step("computer: planner and form builder side by side", async () => {
  const d = await newPage({ viewport: { width: 1440, height: 900 }, hash: "#planner" }); await d.evaluate(() => { ls("mgrPin", "2468"); go("#planner"); });
  await d.waitForSelector(".pl-item"); await settle(d); await shot(d, "62-planner-computer");
  await d.evaluate(() => go("#forms/new")); await d.waitForSelector("#cfTxt"); await d.click("#cfEx"); await d.waitForSelector("#cfPrev .q");
  const cols = await d.evaluate(() => [document.querySelector(".cf-in").getBoundingClientRect().left, document.querySelector(".cf-prev").getBoundingClientRect().left]);
  if (!(cols[1] > cols[0] + 300)) throw new Error("form builder columns: " + cols);
  await settle(d); await shot(d, "63-form-builder-computer"); await d.context().close();
});
await step("Add a form: example → preview → publish as 29 → in every phone's inspection list → works → retire", async () => {
  await page.evaluate(() => go("#forms")); await page.waitForSelector("text=No forms added yet");
  await page.click("text=Add a form"); await page.waitForSelector("#cfTxt");
  await page.fill("#cfTxt", "Title: Haul road\n## SURFACE\nthis line is wrong"); await page.waitForTimeout(400);
  if (!/not understood/.test(await page.textContent("#cfPrev"))) throw new Error("error shown for a bad line");
  await page.click("#cfEx"); await page.waitForSelector("#cfPrev .q");
  const pv = await page.$$eval("#cfPrev .q .id", e => e.map(x => x.textContent).join(",")); if (pv !== "29.1,29.2,29.3,29.4") throw new Error("preview ids: " + pv);
  if (!/Vehicles &amp; Driving|Vehicles & Driving/.test(await page.innerHTML("#cfPrev"))) throw new Error("SNN badge in preview");
  await settle(page); await shot(page, "64-form-builder");
  await page.click("#cfPub"); await page.click("#aYes"); await page.waitForFunction(() => location.hash === "#forms" && document.querySelector(".cf-item"), null, { timeout: 15000 }).catch(async e => { throw new Error("publish: " + await page.textContent("#toast") + " | " + await page.evaluate(() => location.hash)); });
  if (relay.sheet("Custom Forms").getLastRow() !== 2) throw new Error("form not stored");
  await page.evaluate(() => go("#inspections")); await page.waitForSelector("#lib .card");
  if (await page.$$eval("#lib .card", e => e.length) !== 25) throw new Error("library should have 25 forms");
  await page.click("#libcats >> text=Plant & traffic"); await page.waitForSelector("#lib .card:has-text('Daily Haul Road Inspection')"); await page.click("#libcats >> text=All");
  // another phone picks it up at its next sync and can complete it
  const o = await newPage({ name: "Matthew Smith", hash: "#inspections" }); await o.waitForSelector("#lib .card:has-text('Daily Haul Road Inspection')", { timeout: 10000 });
  await o.click("#lib .card:has-text('Daily Haul Road Inspection')"); await o.waitForSelector("#q-29_1");
  if (!/Road or section inspected/.test(await o.textContent("#app"))) throw new Error("details box");
  await o.fill('[data-d="location"]', "Haul road north"); await o.evaluate(() => allQ(tabByNum(29)).forEach(q => rate(q.id, "C")));
  const p = await o.evaluate(() => problems(CUR)); if (p.length) throw new Error("problems: " + p.join("; "));
  if (!/29 – Daily Haul Road Inspection/.test(await o.evaluate(() => bodyText(CUR)))) throw new Error("email text");
  await settle(o); await shot(o, "65-added-form-in-use"); await o.evaluate(async () => { await dbDel("drafts", CUR.id); }); await o.context().close();
  // revise, then retire
  await page.evaluate(() => go("#forms/29")); await page.waitForSelector("#cfTxt");
  await page.fill("#cfTxt", (await page.inputValue("#cfTxt")) + "\n- Is the turnaround area clear of stockpiles and parked plant? [TMP §6.4]\n"); await page.waitForTimeout(400);
  await page.click("#cfPub"); await page.click("#aYes"); await page.waitForFunction(() => location.hash === "#forms" && /Rev 1 · 5 items/.test(document.querySelector(".cf-item")?.textContent), null, { timeout: 15000 });
  await page.evaluate(() => go("#forms/29")); await page.waitForSelector("#cfRet"); await page.click("#cfRet"); await page.click("#aYes");
  await page.waitForFunction(() => location.hash === "#forms" && /Retired/.test(document.querySelector(".cf-item")?.textContent), null, { timeout: 15000 });
  await page.evaluate(() => go("#inspections")); await page.waitForSelector("#lib .card"); if (await page.$$eval("#lib .card", e => e.length) !== 24) throw new Error("retired form still listed");
});
await step("Submitted forms (Manager mode): every sent report, filters, findings, PDF from Drive through the relay, not-sent list, CSV", async () => {
  const o = await newPage({ name: "Steven Pugh", hash: "#submitted" }); await o.waitForSelector(".card.empty");
  if (!/SHE Manager only/.test(await o.textContent("#app"))) throw new Error("register should be locked without Manager mode"); await o.context().close();
  await page.evaluate(() => { ls("mgrPin", "2468"); SBF.p = "all"; go("#submitted"); }); await page.waitForSelector(".sb-item");
  const sentRows = relay.sheet("Sent").getLastRow() - 1;
  const n = await page.$$eval(".sb-item", e => e.length); if (n !== Math.min(sentRows, 60)) throw new Error(`listed ${n}, sent ${sentRows}`);
  await page.selectOption("#sbNo", "01"); await page.waitForTimeout(200);
  const nos = await page.$$eval(".sb-item .n", e => [...new Set(e.map(x => x.textContent))].join()); if (nos !== "01") throw new Error("form filter: " + nos);
  await settle(page); await shot(page, "66-submitted");
  await page.click(".sb-item"); await page.waitForSelector("#sbPdf");
  if (!/Findings/.test(await page.textContent(".sheet"))) throw new Error("findings in detail");
  // headless Chromium can't display a PDF tab, so record where the new tab is sent instead
  await page.evaluate(() => { window._open = window.open; window._opened = ""; window.open = () => ({ closed: false, document: { write() {} }, location: { set href(v) { window._opened = v; } } }); });
  await page.click("#sbPdf"); await page.waitForFunction(() => /^blob:/.test(window._opened), null, { timeout: 10000 });
  await page.evaluate(() => { window.open = window._open; closeSheet(); });
  await page.selectOption("#sbNo", "");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("text=CSV")]); const csv = fs.readFileSync(await dl.path(), "utf8");
  if (!/Report ID/.test(csv) || !/drive\.google\.com\/file\/d\//.test(csv)) throw new Error("csv");
});
await step("Monthly figures (Manager mode): inspections (not mentoring / fuel register) and hazard reports for the client report", async () => {
  await page.evaluate(() => { FGM = todayISO().slice(0, 7); go("#figures"); }); await page.waitForSelector(".fg-kpis");
  const S = relay.sheet("Sent").data.slice(1); const mon = perth(0).slice(0, 7);
  const want = S.filter(r => !["23", "28"].includes(String(r[6]).padStart(2, "0")) && String(r[2]) === mon).length;
  const haz = relay.sheet("Observations").data.slice(1).filter(r => r[4] === "Hazard").length;
  const got = await page.$$eval(".fg-kpis b", e => e.map(x => +x.textContent));
  if (got[0] !== want || got[1] !== haz) throw new Error(`figures ${got} want ${want},${haz}`);
  if (!/Inspections <b>[A-Z]+51<\/b>/.test(await page.innerHTML(".alert.blue"))) throw new Error("App 7 cell hint");
  await settle(page); await shot(page, "67-monthly-figures");
});
await step("High-or-above fire danger day: Home banner with today's controls, pop-up for supervisors, Inspection 25 pre-filled, ticks off when sent; tomorrow note", async () => {
  // Lee Allen (SHE team) wasn't ticked on the earlier Critical SHEQ Alert, so no alert pop-up competes with this one
  const f = await newPage({ name: "Lee Allen", hash: "#home", firePopup: true });
  await f.waitForSelector("#fdb .fd-banner"); const b = await f.textContent("#fdb");
  for (const w of ["FIRE DANGER TODAY", "HIGH", "High-day controls apply (BFMP Table 13)", "Inspection 25 – Fire Danger Day", "Midday re-check", "Nominate a lookout"]) if (!b.includes(w)) throw new Error("banner missing " + w);
  await f.waitForSelector(".fd-pop", { timeout: 10000 }); if (!/Inspection 25 is required today/.test(await f.textContent(".fd-pop"))) throw new Error("pop-up");
  await settle(f); await shot(f, "68-fire-day-popup");
  // a screen refresh (e.g. the first-open reload when the relay settings arrive) closes it without using up today's pop-up
  await f.evaluate(() => route()); await f.waitForSelector(".fd-pop", { timeout: 10000 });
  await f.click("#fdGo"); await f.waitForFunction(() => location.hash.startsWith("#insp/") && CUR && CUR.tab === 25);
  if (await f.evaluate(() => CUR.details.extra["Fire Danger Rating today (High / Extreme / Catastrophic):"]) !== "High") throw new Error("rating not pre-filled");
  await f.evaluate(() => go("#home")); await f.waitForSelector("#fdb .fd-banner"); if (!/Continue/.test(await f.textContent("#fdb"))) throw new Error("draft should show Continue");
  if (await f.$(".fd-pop")) throw new Error("pop-up should only show once a day");
  // a supervisor sends Inspection 25 → the banner shows it done for everyone
  relay.post({ key: relay.key, uid: "fd1", reportId: "YMT-25-TEST", to: "darren.frizzell@genus.com.au", subject: "25", text: "x", meta: { name: "Paul Delaney", no: "25", title: "Fire Danger Day – High and Above", location: "Site" }, report: {} });
  await f.evaluate(async () => { await fdRefresh(true); go("#home"); }); await f.waitForSelector("#fdb .fd-step.ok");
  if (!/Sent by Paul Delaney/.test(await f.textContent("#fdb"))) throw new Error("done by");
  await f.evaluate(() => window.scrollTo(0, 0)); await settle(f); await shot(f, "69-fire-day-banner");
  const nxt = await f.evaluate(() => { ls("fdr", JSON.stringify({ at: Date.now(), date: todayISO(), today: "Moderate", tomorrow: "Extreme" })); const S = SITEST; SITEST = null; const h = fdBannerHTML(); SITEST = S; return h; });
  if (!/Tomorrow: EXTREME fire danger/.test(nxt)) throw new Error("tomorrow note");
  await f.context().close();
});
await step("Take 5: from the Inspect tab – Yes/No questions, hazard controls from the form, PROCEED → signed, emailed PDF; DO NOT PROCEED from the Trade Assistants tab; counted in Monthly figures", async () => {
  const sign = async p => { const box = await p.locator("#sig").boundingBox(); await p.mouse.move(box.x + 30, box.y + 90); await p.mouse.down(); await p.mouse.move(box.x + 160, box.y + 40, { steps: 8 }); await p.mouse.up(); };
  const p = await newPage({ name: "Jayden Mullan", hash: "#inspect" }); await p.waitForSelector(".tile.t5tile");
  await p.click(".tile.t5tile"); await p.waitForFunction(() => CUR && CUR.tab === 50); await p.waitForSelector(".t5-yn");
  await p.fill('[data-d="location"]', "Switchyard bay 3"); await p.fill('[data-t5="task"]', "Pull cable into conduit run C2");
  for (let i = 0; i < 7; i++) await p.click(`.t5-list .t5-q:nth-of-type(${i + 1}) .t5-yn .y`);
  if (!/Consider the following hazards/.test(await p.textContent("#app"))) throw new Error("hazards should show after all Yes");
  const hz = await p.$$(".t5-list"); if (hz.length !== 2) throw new Error("hazard list");
  const H = i => `.t5-list >> nth=1 >> .t5-q >> nth=${i}`;
  for (let i = 0; i < 7; i++) await p.click(`${H(i)} >> .t5-yn >> ${i === 1 || i === 6 ? ".y" : ".n"}`);
  if ((await p.evaluate(() => problems(CUR))).filter(x => /Hazard [27]/.test(x)).length !== 2) throw new Error("controls should be required for hazards 2 and 7");
  await p.check(".t5-ctl >> nth=0 >> input[type=checkbox] >> nth=0");
  await p.fill('[data-t5o="6"]', "Uneven ground at the pit edge – timber mats laid, spotter");
  await p.click(".card .t5-q .t5-yn .y >> nth=-1");
  await p.waitForSelector(".t5-out.go"); if (!/PROCEED TO COMPLETE TASK/.test(await p.textContent(".t5-out.go"))) throw new Error("proceed banner");
  const pr = await p.evaluate(() => problems(CUR)); if (pr.length) throw new Error("problems: " + pr.join("; "));
  await settle(p); await shot(p, "70-take5-form");
  await p.evaluate(() => toReview()); await p.waitForFunction(() => location.hash.startsWith("#review/")); await sign(p);
  await p.waitForFunction(() => typeof PDFFILE !== "undefined" && PDFFILE && PDFFILE.size > 10000, null, { timeout: 30000 });
  if (!/I have completed this Take 5 honestly/.test(await p.textContent("#app"))) throw new Error("declaration");
  await settle(p); await shot(p, "71-take5-review");
  const before = relay.mail.length; await p.click("#bShare"); await p.waitForFunction(() => location.hash === "#inspect", null, { timeout: 30000 });
  const m = relay.mail.slice(before).find(x => /^YMT Take 5/.test(x.subject || ""));
  if (!m || !m.attachments || m.to !== "darren.frizzell@genus.com.au" || !/\| Proceed$/.test(m.subject)) throw new Error("take 5 email: " + (m && m.subject));
  if (!/2a – I have confirmed/.test(m.htmlBody) || !/7a – Uneven ground/.test(m.htmlBody)) throw new Error("controls in email");
  const row = relay.sheet("Sent").data.slice(1).find(r => String(r[6]) === "50"); if (!row || row[9] !== 0) throw new Error("Sent log row");
  // from the Trade Assistants tab: a No → DO NOT PROCEED, supervisor named, still sent so the stop is recorded
  await p.evaluate(() => go("#ta")); await p.waitForSelector(".tacard >> text=Take 5 – before you start a task");
  if (!/1 sent today/.test(await p.textContent(".tacard >> nth=1"))) throw new Error("TA card count");
  await p.click(".tacard >> text=Take 5 – before you start a task"); await p.waitForFunction(() => CUR && CUR.tab === 50); await p.waitForSelector(".t5-yn");
  await p.fill('[data-d="location"]', "Laydown 2"); await p.fill('[data-t5="task"]', "Unload cable drums with telehandler");
  await p.click(".t5-list .t5-q:nth-of-type(1) .t5-yn .y"); await p.click(".t5-list .t5-q:nth-of-type(6) .t5-yn .n");
  await p.waitForSelector(".t5-out.stop"); if (await p.$(".t5-ctl") || /Consider the following hazards/.test(await p.textContent("#app"))) throw new Error("hazards should hide after a No");
  if (!(await p.evaluate(() => problems(CUR))).some(x => /name the Supervisor/.test(x))) throw new Error("supervisor required");
  await p.fill('[data-t5="sup"]', "Paul Delaney"); await settle(p); await shot(p, "72-take5-stop");
  await p.evaluate(() => toReview()); await p.waitForFunction(() => location.hash.startsWith("#review/")); await sign(p);
  await p.waitForFunction(() => typeof PDFFILE !== "undefined" && PDFFILE && PDFFILE.size > 10000, null, { timeout: 30000 });
  const b2 = relay.mail.length; await p.click("#bShare"); await p.waitForFunction(() => location.hash === "#inspect", null, { timeout: 30000 });
  const m2 = relay.mail.slice(b2).find(x => /^YMT Take 5/.test(x.subject || "")); if (!m2 || !/DO NOT PROCEED – referred to Supervisor/.test(m2.subject)) throw new Error("stop email: " + (m2 && m2.subject));
  await p.context().close();
  // monthly figures: 2 Take 5s, 1 stopped; not counted as inspections
  await page.evaluate(() => { ls("mgrPin", "2468"); FGM = todayISO().slice(0, 7); go("#figures"); }); await page.waitForSelector(".fg-t5");
  if (!/^Take 5s\s*2\s*1 stopped/.test((await page.textContent(".fg-t5")).trim())) throw new Error("figures: " + await page.textContent(".fg-t5"));
  const insp = +(await page.textContent(".fg-kpis .card >> nth=0 >> b")); const want = relay.sheet("Sent").data.slice(1).filter(r => !["23", "28", "50"].includes(String(r[6]).padStart(2, "0")) && String(r[2]) === perth(0).slice(0, 7)).length;
  if (insp !== want) throw new Error(`inspections ${insp} want ${want}`);
  await settle(page); await shot(page, "73-figures-take5");
});
await step("Load & Unloading Truck checklist (51): Trade Assistants tab, no Supervisor / Driver signature boxes, unloading checks, delivery docket photo + captioned photos, signed and emailed; a No = DO NOT PROCEED", async () => {
  const sign = async p => { const box = await p.locator("#sig").boundingBox(); await p.mouse.move(box.x + 30, box.y + 90); await p.mouse.down(); await p.mouse.move(box.x + 160, box.y + 40, { steps: 8 }); await p.mouse.up(); };
  const p = await newPage({ name: "Jayden Mullan", hash: "#ta" }); await p.waitForSelector(".tacard >> text=Load & Unloading Truck Checklist");
  await p.evaluate(() => go("#inspections")); await p.waitForSelector("#lib .card"); if (/Load and Unloading/.test(await p.textContent("#lib"))) throw new Error("51 belongs on the Trade Assistants tab only");
  await p.evaluate(() => go("#ta")); await p.click(".tacard >> text=Load & Unloading Truck Checklist"); await p.waitForFunction(() => CUR && CUR.tab === 51); await p.waitForSelector(".seg");
  const t0 = await p.textContent("#app"); if (!/Supervisor name/.test(t0) || !/Truck driver name/.test(t0) || /Signature/i.test(t0)) throw new Error("names stay, signature boxes go");
  await p.fill('[data-d="location"]', "Laydown 2"); await p.fill('[data-lu="sup"]', "Paul Delaney"); await p.fill('[data-lu="drv"]', "Steve Driver"); await p.fill('[data-lu="co"]', "Toll"); await p.fill('[data-lu="rego"]', "1ABC234");
  await p.click(".seg >> text=Unloading"); await p.waitForSelector(".t5-list");
  if ((await p.$$(".t5-list")).length !== 3 || /Weed Hygiene/.test(await p.textContent("#app"))) throw new Error("unloading only: unloading, general freight and equipment – no loading checks");
  await p.fill('[data-lu="us"]', "09:10"); await p.fill('[data-lu="ue"]', "09:55");
  for (let i = 0; i < 11; i++) await p.click(`.t5-list >> nth=0 >> .t5-q >> nth=${i} >> .t5-yn .${i === 3 ? "x" : "y"}`);
  for (let i = 0; i < 8; i++) await p.click(`.t5-list >> nth=1 >> .t5-q >> nth=${i} >> .t5-yn .y`);
  if (await p.$(".t5-list >> nth=1 >> .t5-yn .x")) throw new Error("general freight is Yes / No only");
  await p.click(".t5-list >> nth=2 >> .t5-q >> nth=2 >> .t5-yn .y"); await p.click(".t5-list >> nth=2 >> .t5-q >> nth=6 >> .t5-yn .y");
  await p.setInputFiles(".lu-docket input[type=file] >> nth=1", path.join(root, "icon-512.png")); await p.waitForSelector(".lu-docket.ok img");
  await p.setInputFiles(".slot.cx input[type=file] >> nth=1", path.join(root, "icon-192.png")); await p.waitForSelector(".slot.cx .cx-item img");
  await p.fill(".slot.cx .cx-item input", "Drums restrained on the tray"); await p.setInputFiles(".slot.cx input[type=file] >> nth=1", path.join(root, "icon-192.png")); await p.waitForFunction(() => document.querySelectorAll(".slot.cx .cx-item").length === 2);
  await p.fill('[data-lu="cmt"]', "Cable drums x 4");
  const pr = await p.evaluate(() => problems(CUR)); if (pr.length) throw new Error("problems: " + pr.join("; "));
  await settle(p); await shot(p, "74-load-form");
  await p.evaluate(() => toReview()); await p.waitForFunction(() => location.hash.startsWith("#review/")); await sign(p);
  await p.waitForFunction(() => typeof PDFFILE !== "undefined" && PDFFILE && PDFFILE.size > 10000, null, { timeout: 30000 });
  if (!/Docket photo/.test(await p.textContent("#app"))) throw new Error("review docket pill");
  if (SHOTS) fs.writeFileSync(path.join(out, "load-unloading.pdf"), Buffer.from(await p.evaluate(async () => { PDFBLOB = null; const b = await buildPDF(CUR); return Array.from(new Uint8Array(await b.arrayBuffer())); })));
  await settle(p); await shot(p, "75-load-review");
  const before = relay.mail.length; await p.click("#bShare"); await p.waitForFunction(() => location.hash === "#inspect", null, { timeout: 30000 });
  const m = relay.mail.slice(before).find(x => /^YMT Load & Unloading Checklist/.test(x.subject || ""));
  if (!m || !m.attachments || m.to !== "darren.frizzell@genus.com.au" || /DO NOT PROCEED/.test(m.subject) || !/Unloading \| Toll 1ABC234/.test(m.subject)) throw new Error("load email: " + (m && m.subject));
  if (!/SPECIAL EQUIPMENT \/ STAFF REQUEST: Telehandler \/ Manitou, Rigger \/ Dogman \/ Spotter/.test(m.body) || !/delivery docket \+ 2 other/.test(m.body) || !/09:10 to 09:55/.test(m.body)) throw new Error("load body: " + m.body.slice(0, 900));
  // loading with a No → DO NOT PROCEED; weight is asked for when known; Actions required
  await p.evaluate(() => go("#ta")); await p.click(".tacard >> text=Load & Unloading Truck Checklist"); await p.waitForFunction(() => CUR && CUR.tab === 51 && !LU(CUR).act);
  await p.fill('[data-d="location"]', "Switchyard"); await p.fill('[data-lu="sup"]', "Paul Delaney"); await p.click(".seg >> text=Loading");
  for (let i = 0; i < 17; i++) await p.click(`.t5-list >> nth=0 >> .t5-q >> nth=${i} >> .t5-yn .${i === 1 ? "n" : "y"}`);
  await p.waitForSelector(".t5-out.stop"); const pr2 = await p.evaluate(() => problems(CUR));
  if (!pr2.some(x => /weight/.test(x)) || !pr2.some(x => /Actions/.test(x))) throw new Error("weight + actions required: " + pr2.join("; "));
  await p.fill('[data-lu="wt"]', "6.5 t"); await p.fill('[data-lu="actions"]', "Area cleared by Paul Delaney before loading"); await settle(p); await shot(p, "76-load-stop");
  await p.evaluate(() => toReview()); await p.waitForFunction(() => location.hash.startsWith("#review/")); await sign(p);
  await p.waitForFunction(() => typeof PDFFILE !== "undefined" && PDFFILE && PDFFILE.size > 10000, null, { timeout: 30000 });
  if (!/No delivery docket photo/.test(await p.textContent("#app"))) throw new Error("docket reminder");
  const b2 = relay.mail.length; await p.click("#bShare"); await p.waitForFunction(() => location.hash === "#inspect", null, { timeout: 30000 });
  const m2 = relay.mail.slice(b2).find(x => /^YMT Load & Unloading Checklist/.test(x.subject || ""));
  if (!m2 || !/DO NOT PROCEED/.test(m2.subject) || !/specify the weight: 6\.5 t – YES/.test(m2.body) || !/Loading area clear\? – NO/.test(m2.body)) throw new Error("stop email: " + (m2 && m2.subject));
  const rows = relay.sheet("Sent").data.slice(1).filter(r => String(r[6]) === "51"); if (rows.length !== 2 || rows[1][9] !== 1) throw new Error("Sent log rows for 51");
  await p.context().close();
});
await step("Team suggestions: Genus logo goes Home from anywhere (form saved); extra captioned photos on the TMP check (21) in the PDF; 'Email me a copy' adds the inspector", async () => {
  const p = await newPage({ name: "Matthew Smith", hash: "#inspect" }); await p.waitForSelector(".tiles .tile");
  await p.evaluate(() => startInsp(21)); await p.waitForFunction(() => CUR && CUR.tab === 21); await p.waitForSelector("#cph-0 .slot.cx");
  // additional photos on the AM check, with a caption
  await p.setInputFiles('#cph-0 .slot.cx input[type=file] >> nth=1', path.join(root, "icon-192.png")); await p.waitForSelector("#cph-0 .cx-item img");
  await p.fill("#cph-0 .cx-item input.t", "Speed sign 80 reinstated"); await p.setInputFiles('#cph-0 .slot.cx input[type=file] >> nth=1', path.join(root, "icon-192.png"));
  await p.waitForFunction(() => document.querySelectorAll("#cph-0 .cx-item").length === 2);
  const ex = await p.evaluate(() => chkExtras(CUR, 0).map(x => x.cap)); if (ex[0] !== "Speed sign 80 reinstated" || ex.length !== 2) throw new Error("extras: " + ex);
  await p.locator("#cph-0 .slot.cx").scrollIntoViewIfNeeded(); await settle(p); await shot(p, "74-tmp-extra-photos");
  const pdf = await p.evaluate(async () => { PDFBLOB = null; const b = await buildPDF(CUR); return b.size; }); if (!(pdf > 20000)) throw new Error("pdf " + pdf);
  // logo → Home, the open form stays saved as a draft
  const id = await p.evaluate(() => CUR.id); await p.click("header.top a.logo"); await p.waitForFunction(() => location.hash === "#home");
  if (!(await p.evaluate(i => dbGet("drafts", i).then(d => !!d && chkExtras(d, 0).length === 2), id))) throw new Error("draft not kept");
  await p.evaluate(() => go("#settings")); await p.waitForSelector("#sRec"); await p.click("header.top a.logo"); await p.waitForFunction(() => location.hash === "#home");
  // email me a copy: off by default, then on → the inspector's Genus address is added to the report's To
  const d = await p.evaluate(() => { CUR = null; return null; });
  await p.evaluate(i => go("#review/" + i), id); await p.waitForSelector("#ccMe");
  if (await p.isChecked("#ccMe")) throw new Error("copy should be off by default");
  if (await p.evaluate(() => sendTo(CUR)) !== "darren.frizzell@genus.com.au") throw new Error("to without copy");
  await p.check("#ccMe"); if (await p.evaluate(() => sendTo(CUR)) !== "darren.frizzell@genus.com.au,matt.smith@genus.com.au") throw new Error("to with copy: " + await p.evaluate(() => sendTo(CUR)));
  await settle(p); await shot(p, "75-email-me-a-copy");
  // someone with no Genus email gets the hint instead
  const q = await newPage({ name: "Jayden Mullan", hash: "#inspect" }); await q.evaluate(() => startInsp(50)); await q.waitForFunction(() => CUR && CUR.tab === 50);
  await q.evaluate(() => toReview()); await q.waitForSelector(".cc-me"); if (await q.$("#ccMe") || !/Pick your name in Settings/.test(await q.textContent(".cc-me"))) throw new Error("no-email hint");
  await q.context().close(); await p.context().close();
});
await step("CSV exports", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => exportActions())]);
  const p = await dl.path(); const csv = fs.readFileSync(p, "utf8"); if (!/Corrective action/.test(csv) || csv.split("\n").length < 3) throw new Error("csv content");
});
if (SHOTS) {
  await step("dark mode + desktop screenshots", async () => {
    const d = await newPage({ dark: true, hash: "#home" }); await d.waitForSelector(".hero"); await settle(d); await shot(d, "11-home-dark");
    await d.evaluate(() => go("#insights")); await d.waitForSelector(".chart svg"); await settle(d); await shot(d, "12-insights-dark");
    const w = await newPage({ viewport: { width: 1280, height: 860 }, hash: "#insights" }); await w.waitForSelector(".chart svg"); await settle(w); await shot(w, "13-insights-desktop");
    await w.evaluate(() => go("#home")); await w.waitForSelector(".tiles .tile"); await settle(w); await shot(w, "14-home-desktop");
    await w.evaluate(() => go("#inspections")); await w.waitForSelector("#lib .card"); await settle(w); await shot(w, "15-inspections-desktop");
    fs.writeFileSync(path.join(out, "monthly.pdf"), Buffer.from(await page.evaluate(async () => { const b = buildMonthlyPDF(DASH.j); return Array.from(new Uint8Array(await b.arrayBuffer())); })));
  });
}
await browser.close(); srv.close();
if (errors.length) { console.log("\nERRORS:\n" + [...new Set(errors)].join("\n")); process.exit(1); }
console.log("\nAll smoke steps passed.");
