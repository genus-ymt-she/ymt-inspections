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
// Google's servers are refused by the BoM, so the relay finds nothing; the app reads the GitHub feed instead
const relay = createRelay({ pin: "2468", fetch: () => null });
const perth = n => new Date(Date.now() + 8 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const FEED = { source: "Bureau of Meteorology", issued: perth(0) + "T04:35:00+08:00", districts: {
  Watheroo: [{ date: perth(-1), rating: "Moderate" }, { date: perth(0), rating: "High", fbi: 31 }, { date: perth(1), rating: "Extreme", fbi: 55 }],
  Lesueur: [{ date: perth(0), rating: "Moderate" }] } };
const WX = { current: { temperature_2m: 27.4, relative_humidity_2m: 22, wind_speed_10m: 24, wind_direction_10m: 112, wind_gusts_10m: 41, weather_code: 1 },
  daily: { temperature_2m_max: [33.1, 30], temperature_2m_min: [14.2, 13], precipitation_probability_max: [10, 0], wind_speed_10m_max: [31, 20], wind_gusts_10m_max: [52, 30], wind_direction_10m_dominant: [100, 200], weather_code: [1, 0] } };
const errors = [];
const browser = await chromium.launch();

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block", timezoneId: "Australia/Perth", locale: "en-AU", colorScheme: opts.dark ? "dark" : "light", acceptDownloads: true });
  await ctx.route(/api\.open-meteo\.com/, route => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(WX) }));
  await ctx.route(/raw\.githubusercontent\.com\/.*fdr\.json/, route => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(FEED) }));
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
await step("home shows hero and the eight tiles (no long list)", async () => {
  await page.waitForSelector(".hero"); await page.waitForSelector(".tiles .tile");
  if (await page.$("#lib")) throw new Error("inspection list should not be on home");
  const n = await page.$$eval(".tiles .tile", e => e.length); if (n !== 8) throw new Error("tiles: " + n);
  const labels = await page.$$eval(".tiles .tile b", e => e.map(x => x.textContent.trim()).join("|")); if (labels !== "My Day|Inspection|Task Observation|Mentoring|Hazard|Positive|Trade Assistants|PARRON Radio") throw new Error("tiles: " + labels);
  await settle(page); await shot(page, "01-home");
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
  await p0.click(".who button >> text=Matt Smith");
  const me = await p0.evaluate(() => [localStorage.getItem("inspector"), localStorage.getItem("myEmail")]);
  if (me[0] !== "Matt Smith" || me[1] !== "matt.smith@genus.com.au") throw new Error("identity not saved: " + me);
  await p0.context().close();
});
await step("library search filters templates", async () => {
  await page.fill("#libq", "crane"); await settle(page);
  const n = await page.$$eval("#lib .card", e => e.length); if (n < 1 || n > 6) throw new Error("search results: " + n);
  await page.fill("#libq", ""); await settle(page);
});
await step("Mentoring tile opens the discussion record", async () => {
  await page.evaluate(() => go("#home")); await page.waitForSelector(".tiles .tile"); await page.click(".tile >> text=Mentoring");
  await page.waitForFunction(() => location.hash.startsWith("#insp/") && CUR && CUR.tab === 23);
  await page.evaluate(async () => { await dbDel("drafts", CUR.id); go("#home"); });
});
await step("inspection 24 – observation record is required, shown in review, email and PDF", async () => {
  await page.evaluate(() => go("#home")); await page.waitForSelector(".tiles .tile"); await page.click(".tile >> text=Task Observation"); await page.waitForSelector("#narr textarea");
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
  await settle(page); await shot(page, "03-review");
});
await step("send directly through the relay (findings reach the log)", async () => {
  await page.click("#bShare");
  await page.waitForFunction(() => (location.hash === "#home" || location.hash === ""), null, { timeout: 30000 });
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
  if (!/Watheroo/.test(info) || !/Bureau of Meteorology/.test(info) || !/Be ready to act/.test(info)) throw new Error("FDR details: " + info.slice(0, 200));
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
  await settle(page); await shot(page, "09-hazard-report");
  await page.click("text=Send hazard report"); await page.waitForFunction(() => location.hash === "#home" || location.hash === "", null, { timeout: 20000 });
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
  await page.click("text=Send observation"); await page.waitForFunction(() => location.hash === "#home" || location.hash === "", null, { timeout: 20000 });
  const j = relay.get({ action: "dashboard", key: relay.key });
  if (j.obs.length !== 2) throw new Error("observations logged: " + j.obs.length);
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
await step("Trade Assistants: fuel register – start of day, end of day, sign and send to the Project Admin", async () => {
  await page.evaluate(() => go("#inspections")); await page.waitForSelector("#lib .card");
  if (/Firefighting Water Trailer|Fuel, Hours/.test(await page.textContent("#lib"))) throw new Error("TA forms should not be in the inspection list");
  await page.evaluate(() => go("#home")); await page.click(".tile >> text=Trade Assistants"); await page.waitForSelector(".tacard");
  if (!/Firefighting Water Trailer/.test(await page.textContent("#app"))) throw new Error("fire trailer missing from TA page");
  await settle(page); await shot(page, "21-ta-page");
  await page.click(".tacard button.btn.o"); await page.waitForSelector(".fa");
  const fixed = await page.textContent(".fixed"); if (!/PWF – 1084/.test(fixed) || !/Day/.test(fixed)) throw new Error("fixed details: " + fixed);
  // saving with nothing filled in lists what is missing
  await page.click("text=Save start of day"); await page.waitForSelector(".sheet"); if (!/WL46/.test(await page.textContent(".sheet"))) throw new Error("missing list"); await page.evaluate(() => closeSheet());
  const n = await page.$$eval(".fa", e => e.length); if (n !== 9) throw new Error("assets: " + n);
  // WL46 + GEN02 used; GEN01 pre-start not done (needs a reason); the rest N/A
  for (let i = 0; i < 9; i++) await page.click(`#fa-${i} .seg >> nth=0 >> button:has-text("${i === 0 || i === 2 ? "Yes" : i === 1 ? "No" : "N/A"}")`);
  await page.fill('#fa-0 [data-fu="0|hs"]', "8567.3"); await page.fill('#fa-2 [data-fu="2|hs"]', "9780.7");
  await page.fill('#fa-1 [data-fu="1|cmt"]', "Genset fault – reported to Supervisor");
  await page.setInputFiles('#fa-0 input[type=file] >> nth=1', path.join(root, "icon-192.png")); await page.waitForSelector("#fa-0 .photos img");
  await settle(page); await shot(page, "22-fuel-start");
  await page.click("text=Save start of day"); await page.waitForSelector(".tacard .tstep.done");
  if (!/Saved at/.test(await page.textContent(".tacard"))) throw new Error("start of day not shown as saved");
  await page.click(".tacard button.btn.o"); await page.waitForSelector('[data-fu="0|fuel"]');
  await page.fill('[data-fu="0|he"]', "8575.1"); await page.fill('[data-fu="0|fuel"]', "40"); await page.fill('[data-fu="0|cmt"]', "Fuelled pod (Badgingarra Roadhouse)");
  await page.fill('[data-fu="2|fuel"]', "90"); await page.fill('[data-fu="1|fuel"]', "12.5");
  if ((await page.textContent("#ftot")).trim() !== "142.5") throw new Error("total: " + await page.textContent("#ftot"));
  if (!/7.8 hrs/.test(await page.textContent("#fhr-0"))) throw new Error("hours run not shown");
  await settle(page); await shot(page, "23-fuel-end");
  await page.click("#fstage >> text=Review & sign"); await page.waitForSelector("#sig");
  const sig = await page.$("#sig"); await sig.scrollIntoViewIfNeeded(); const b = await sig.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down(); await page.mouse.move(b.x + 120, b.y + 60); await page.mouse.move(b.x + 200, b.y + 25); await page.mouse.up();
  await page.fill("#fvName", "Matt Smith"); if (await page.inputValue("#fvPos") !== "Senior Civil Supervisor") throw new Error("verifier role not filled");
  if (!/amie\.smith@genus\.com\.au/.test(await page.textContent("#app"))) throw new Error("Amie not shown as recipient");
  await page.waitForFunction(() => !document.querySelector("#bShare").disabled, null, { timeout: 15000 }).catch(async e => { throw new Error("send not ready: " + JSON.stringify(await page.evaluate(() => problems(CUR)))); });
  const pdf = await page.evaluate(async () => { PDFBLOB = null; const b = await buildPDF(CUR); const t = await b.text(); return { size: b.size, land: /\/MediaBox \[0 0 841/.test(t) }; });
  if (pdf.size < 5000 || !pdf.land) throw new Error("fuel PDF: " + JSON.stringify(pdf));
  if (SHOTS) fs.writeFileSync(path.join(out, "fuel-register.pdf"), Buffer.from(await page.evaluate(async () => { PDFBLOB = null; const b = await buildPDF(CUR); return Array.from(new Uint8Array(await b.arrayBuffer())); })));
  await settle(page); await shot(page, "24-fuel-review");
  const before = relay.mail.length; await page.click("#bShare"); await page.waitForFunction(() => location.hash === "#home", null, { timeout: 15000 });
  const m = relay.mail.slice(before).find(x => /Fuel, Hours/.test(x.subject || ""));
  if (!m || m.to !== "amie.smith@genus.com.au,darren.frizzell@genus.com.au") throw new Error("register email: " + (m && m.to));
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
