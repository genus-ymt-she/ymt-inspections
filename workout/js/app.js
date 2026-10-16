import * as db from "./db.js";
import {
  setCount, visibleExercises, sessionAvailable, groupExercises, drops, setKey, parseWeight, parseIntOrNull,
  hasData, formatLast, agoText, daysAgo, fmtDuration, targetText, lastFor, lastPerformed, validateProgramme, validateBackup,
  alternativesOf, exerciseIndex, defaultIncrement, progression, restKind, REST_DEFAULTS, unloggedSlots, matchesSearch,
} from "./logic.js";

const DEFAULT_TAGS = ["Right shoulder", "Lower back", "Low energy"];
const S = {
  programme: null, idx: new Map(), onBlock: false, deload: false, activeLogId: null, lastExport: null,
  logs: [], sets: new Map(), filter: "all", hq: "", htag: "", programmeWarning: "",
  rest: { ...REST_DEFAULTS }, exSettings: {},
};
const app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtTime = iso => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const buzz = p => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

// ---------- toast ----------
let toastT;
function toast(msg, bad = false) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast show" + (bad ? " bad" : "");
  clearTimeout(toastT); toastT = setTimeout(() => (t.className = "toast"), bad ? 5000 : 2200);
}
const fail = e => { console.error(e); toast("Save failed – " + (e?.message || e), true); };

// ---------- modal (big buttons, no native confirm for multi-choice) ----------
function choose({ title, body = "", options }) {
  return new Promise(res => {
    const d = document.createElement("dialog"); d.className = "modal";
    d.innerHTML = `<div class="m-in"><h2>${esc(title)}</h2>${body ? `<div class="m-body">${body}</div>` : ""}
      <div class="m-opts">${options.map(o => `<button class="btn ${o.cls || ""}" data-v="${esc(o.value)}">${esc(o.label)}</button>`).join("")}</div></div>`;
    document.body.appendChild(d);
    const done = v => {
      const vals = Object.fromEntries([...d.querySelectorAll("input[name]")].map(i => [i.name, i.value]));
      d.close(); d.remove(); res({ value: v, vals });
    };
    d.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) done(b.dataset.v); else if (e.target === d) done(null); });
    d.addEventListener("cancel", e => { e.preventDefault(); done(null); });
    d.showModal();
  });
}

// ---------- data ----------
async function loadProgramme() {
  const cached = await db.getSetting("programme", null);
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch("programme.json", { cache: "no-cache", signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const p = JSON.parse(await r.text());
    const errs = validateProgramme(p);
    if (errs.length) {
      if (!cached) throw new Error("programme.json is invalid: " + errs.join("; "));
      S.programmeWarning = "programme.json has errors – using the last good copy. " + errs.slice(0, 3).join("; ");
      return cached;
    }
    await db.setSetting("programme", p);
    return p;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

async function loadData() {
  const [logs, sets, onBlock, deload, activeLogId, lastExport, rest, exSettings, restState] = await Promise.all([
    db.getAll("sessionLogs"), db.getAll("setLogs"), db.getSetting("onBlock", false), db.getSetting("deload", false),
    db.getSetting("activeLogId", null), db.getSetting("lastExport", null), db.getSetting("restDefaults", null),
    db.getSetting("exSettings", {}), db.getSetting("restState", null),
  ]);
  S.logs = logs; S.sets = new Map(sets.map(s => [s.id, s])); S.onBlock = !!onBlock; S.deload = !!deload; S.lastExport = lastExport;
  S.rest = { ...REST_DEFAULTS, ...(rest || {}) }; S.exSettings = exSettings || {};
  const active = logs.find(l => l.id === activeLogId);
  S.activeLogId = active && !active.completed ? active.id : null;
  if (restState && restState.endAt > Date.now()) { Object.assign(R, restState); runRest(); }
}

const allSets = () => [...S.sets.values()];
const logById = id => S.logs.find(l => l.id === id);
const sessionById = id => S.programme.sessions.find(s => s.id === id);
const exerciseById = id => S.idx.get(id) || null;
const setsOf = logId => allSets().filter(s => s.sessionLogId === logId);
const noteTags = () => (Array.isArray(S.programme.noteTags) && S.programme.noteTags.length ? S.programme.noteTags : DEFAULT_TAGS);
const modeOf = log => (log.completed ? { onBlock: !!log.onBlock, deload: !!log.deload } : { onBlock: S.onBlock, deload: S.deload });
const incrementFor = ex => S.exSettings[ex.id]?.increment ?? defaultIncrement(ex);

async function saveLog(log) {
  const id = await db.put("sessionLogs", log);
  log.id = id;
  if (!S.logs.includes(log)) S.logs.push(log);
  return log;
}
function saveSet(rec) {
  S.sets.set(rec.id, rec);
  return db.put("setLogs", rec).catch(fail);
}
/** Updates state synchronously (so the caller can re-render instantly), then persists. */
function setMode(key, v) {
  S[key] = v;
  db.setSetting(key, v).catch(fail);
  document.body.classList.toggle("deload", S.deload);
  const log = logById(S.activeLogId);
  if (log && !log.completed) { log[key] = v; saveLog(log).catch(fail); }
}

// ---------- router ----------
function route() {
  const [, view, arg] = (location.hash || "#/home").split("/");
  stopSessionExtras();
  if (view === "session" && logById(+arg)) return renderSession(+arg);
  if (view === "history" && arg && logById(+arg)) return renderDetail(+arg);
  if (view === "history") return renderHistory();
  if (view === "settings") return renderSettings();
  renderHome();
}
const go = h => { if (location.hash === h) route(); else location.hash = h; };

// ---------- HOME ----------
function toggleHtml(id, on, title, sub, cls = "") {
  return `<label class="toggle ${cls}">
    <input type="checkbox" id="${id}" ${on ? "checked" : ""}>
    <span class="track"><span class="thumb"></span></span>
    <span class="tl"><b>${title}</b><small>${sub}</small></span>
  </label>`;
}

function renderHome() {
  document.title = "Workout";
  const active = logById(S.activeLogId);
  const exportAge = S.lastExport ? daysAgo(S.lastExport) : null;
  const cards = S.programme.sessions.map(s => {
    const last = lastPerformed(s.id, S.logs, allSets());
    const avail = sessionAvailable(s, S.onBlock);
    const since = last == null ? "Not done yet" : daysAgo(last) === 0 ? "Today" : `${daysAgo(last)} day${daysAgo(last) === 1 ? "" : "s"} ago`;
    const n = visibleExercises(s, S.onBlock, S.deload).length;
    return `<button class="card session-card${avail ? "" : " disabled"}${s.offBlockOnly ? " offblock" : ""}${active?.sessionId === s.id ? " is-active" : ""}" data-start="${esc(s.id)}" ${avail ? "" : 'aria-disabled="true"'}>
      <span class="sc-name">${esc(s.name)}</span>
      ${s.offBlockOnly ? '<span class="badge warn">Off-block only</span>' : ""}
      ${active?.sessionId === s.id ? '<span class="badge live">In progress</span>' : ""}
      <span class="sc-since">${since}</span>
      <span class="sc-meta">${n} exercises</span>
    </button>`;
  }).join("");
  app.innerHTML = `
    <header class="bar"><h1>${esc(S.programme.blockName || "Workout")}</h1><span class="bar-r"><button class="btn ghost" data-go="#/history">History</button><button class="btn ghost icon-s" data-go="#/settings" aria-label="Settings">⚙</button></span></header>
    <main class="home">
      ${S.deload ? '<div class="deload-banner">DELOAD ACTIVE<small>2 sets per exercise · 60% of last weights · no drop sets</small></div>' : ""}
      ${S.programmeWarning ? `<div class="notice bad">${esc(S.programmeWarning)}</div>` : ""}
      ${active ? `<button class="resume" data-go="#/session/${active.id}">Resume ${esc(sessionById(active.sessionId)?.name || active.sessionId)} <span id="resume-timer">${fmtDuration((Date.now() - new Date(active.date)) / 1000)}</span></button>` : ""}
      ${toggleHtml("onblock", S.onBlock, S.onBlock ? "On-block" : "Off-block", S.onBlock ? "Reduced sets, drop sets hidden, Legs unavailable" : "Full programme")}
      ${toggleHtml("deload", S.deload, S.deload ? "Deload ON" : "Deload off", S.deload ? "2 sets · 60% loads · drop sets hidden" : "Normal training", "deload-t")}
      <div class="cards">${cards}</div>
      <section class="data">
        <button class="btn" id="export">Export data</button>
        <button class="btn" id="import">Import data</button>
        <input type="file" id="importfile" accept="application/json,.json" hidden>
        <p class="hint">${exportAge == null ? "No backup exported yet." : `Last export ${exportAge === 0 ? "today" : exportAge === 1 ? "yesterday" : exportAge + " days ago"}.`} <span id="persist"></span></p>
      </section>
    </main>`;
  showPersist();
  if (active) startTicker(() => { const el = document.getElementById("resume-timer"); if (el) el.textContent = fmtDuration((Date.now() - new Date(active.date)) / 1000); });
}

async function showPersist() {
  const el = document.getElementById("persist");
  if (!el || !navigator.storage?.persisted) return;
  const p = await navigator.storage.persisted();
  el.textContent = p ? "Storage: protected." : "Storage: not yet protected (install to home screen).";
}

async function startSession(sessionId) {
  const s = sessionById(sessionId);
  if (!s) return;
  if (!sessionAvailable(s, S.onBlock)) return toast(`${s.name} is off-block only. Switch to off-block to train it.`);
  const active = logById(S.activeLogId);
  if (active && !active.completed) {
    if (active.sessionId === sessionId) return go(`#/session/${active.id}`);
    const an = sessionById(active.sessionId)?.name || active.sessionId;
    if (!confirm(`Your ${an} session is still open.\n\nStart ${s.name} instead? ${an} stays saved in History as unfinished.`)) return;
  }
  const log = await saveLog({ sessionId, date: new Date().toISOString(), onBlock: S.onBlock, deload: S.deload, completed: false, notes: "", tags: [], subs: {} });
  S.activeLogId = log.id;
  await db.setSetting("activeLogId", log.id);
  navigator.storage?.persist?.().catch(() => {});
  go(`#/session/${log.id}`);
}

async function doExport() {
  try {
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const name = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    S.lastExport = new Date().toISOString();
    await db.setSetting("lastExport", S.lastExport);
    toast(`Exported ${data.sessionLogs.length} sessions`);
    renderHome();
  } catch (e) { fail(e); }
}

async function doImport(file) {
  try {
    const b = JSON.parse(await file.text());
    const errs = validateBackup(b);
    if (errs.length) return toast("Import cancelled – " + errs[0], true);
    if (!confirm(`Replace ALL data on this phone with this backup?\n\n${b.sessionLogs.length} sessions, ${b.setLogs.length} sets` +
      (b.exportedAt ? `\nExported ${fmtDate(b.exportedAt)}` : "") + `\n\nCurrently on this phone: ${S.logs.length} sessions. Export first if unsure.`)) return;
    await db.importAll(b);
    await loadData();
    document.body.classList.toggle("deload", S.deload);
    toast(`Restored ${b.sessionLogs.length} sessions`);
    go("#/home");
  } catch (e) { toast("Import failed – " + (e instanceof SyntaxError ? "file is not valid JSON" : e.message), true); }
}

// ---------- SETTINGS ----------
function renderSettings() {
  document.title = "Settings";
  const row = (k, label) => `<label class="set-row"><span>${label}</span><input class="in sm" data-rest-def="${k}" inputmode="numeric" value="${S.rest[k]}"><span class="unit">sec</span></label>`;
  app.innerHTML = `
    <header class="bar sticky"><button class="btn ghost icon" data-go="#/home" aria-label="Home">‹</button><h1>Settings</h1><span></span></header>
    <main class="settings">
      <h2>Rest timer defaults</h2>
      <p class="hint">Starts when you tick a set. Override any single exercise with its ⚙ button in a session.</p>
      ${row("compound", "Compound (first 2 exercises)")}
      ${row("standard", "Standard")}
      ${row("superset", "Superset – between the pair")}
      ${row("dropset", "Drop set")}
      <button class="btn" id="rest-reset">Reset to 120 / 90 / 45 / 15</button>
    </main>`;
}

// ---------- REST TIMER (lives outside #app so it survives re-renders) ----------
const R = { endAt: 0, total: 0, label: "", int: null, doneT: null };
const restEl = document.getElementById("rest");
function startRest(sec, label) {
  if (!sec || sec <= 0) return;
  Object.assign(R, { endAt: Date.now() + sec * 1000, total: sec, label });
  db.setSetting("restState", { endAt: R.endAt, total: R.total, label }).catch(() => {});
  runRest();
}
function runRest() {
  clearInterval(R.int); clearTimeout(R.doneT);
  restEl.className = "rest show";
  paintRest();
  R.int = setInterval(paintRest, 250);
}
function paintRest() {
  const left = Math.ceil((R.endAt - Date.now()) / 1000);
  if (left <= 0) return finishRest(true);
  const pct = Math.max(0, Math.min(100, (left / R.total) * 100));
  restEl.innerHTML = `<div class="rest-bar" style="width:${pct}%"></div>
    <div class="rest-in"><span class="rest-l">Rest<small>${esc(R.label)}</small></span><span class="rest-t">${fmtDuration(left)}</span>
    <button class="btn" data-rest="add">+30s</button><button class="btn" data-rest="skip">Skip</button></div>`;
}
function finishRest(natural) {
  clearInterval(R.int); R.endAt = 0;
  db.setSetting("restState", null).catch(() => {});
  if (natural) {
    buzz([300, 120, 300, 120, 500]);
    restEl.className = "rest show over";
    restEl.innerHTML = `<div class="rest-in"><span class="rest-go">Rest over – next set</span><button class="btn" data-rest="skip">OK</button></div>`;
    R.doneT = setTimeout(() => (restEl.className = "rest"), 6000);
  } else restEl.className = "rest";
}
restEl.addEventListener("click", e => {
  const b = e.target.closest("[data-rest]"); if (!b) return;
  if (b.dataset.rest === "skip") { clearTimeout(R.doneT); return finishRest(false); }
  if (b.dataset.rest === "add" && R.endAt) {
    R.endAt += 30000; R.total += 30;
    db.setSetting("restState", { endAt: R.endAt, total: R.total, label: R.label }).catch(() => {});
    paintRest();
  }
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && R.endAt) paintRest(); });

// ---------- ACTIVE SESSION ----------
let ticker, wakeLock;
function startTicker(fn) { clearInterval(ticker); ticker = setInterval(fn, 1000); }
function stopSessionExtras() {
  clearInterval(ticker);
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
async function requestWake() {
  try {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch { /* unsupported / denied / low battery – ignore */ }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && location.hash.startsWith("#/session/") && !wakeLock) requestWake();
});

/** Slots shown for a session log: programme slot + the exercise actually used in it (after any swap). */
function slotsFor(log, session, mode) {
  const vis = visibleExercises(session, mode.onBlock, mode.deload);
  const out = [];
  for (const g of groupExercises(vis)) g.items.forEach((slot, i) => {
    const subId = log.subs?.[slot.id];
    out.push({ slot, ex: (subId && exerciseById(subId)) || slot, slotIndex: session.exercises.indexOf(slot), group: g, firstInSuperset: g.superset && i === 0 });
  });
  return out;
}

function historyFor(log, ex) {
  const prior = S.logs.filter(l => l.id !== log.id && l.date < log.date);
  const sets = allSets();
  // Progression only trusts sets with reps recorded (a pre-filled weight alone isn't a performed set)
  return { last: lastFor(ex.id, prior, sets, log.id), base: lastFor(ex.id, prior.filter(l => !l.deload), sets.filter(s => s.reps != null), log.id) };
}

function restFor(c) {
  const own = S.exSettings[c.ex.id]?.rest ?? c.ex.rest;
  return typeof own === "number" ? own : S.rest[restKind(c.ex, c)];
}

function renderSession(logId) {
  const log = logById(logId);
  const session = sessionById(log.sessionId);
  if (!session) { app.innerHTML = `<main class="pad"><p>Session "${esc(log.sessionId)}" is no longer in programme.json.</p><button class="btn" data-go="#/history/${log.id}">View log</button></main>`; return; }
  const mode = modeOf(log);
  const slots = slotsFor(log, session, mode);
  let html = "";
  for (let i = 0; i < slots.length; i++) {
    const c = slots[i];
    if (c.group.superset && c.firstInSuperset) {
      const pair = slots.slice(i, i + 2);
      html += `<div class="superset"><div class="ss-label">Superset ${esc(pair.map(p => p.slot.label).filter(Boolean).join(" + "))}</div>${pair.map(p => exCard(log, p, mode)).join('<div class="ss-link" aria-hidden="true"></div>')}</div>`;
      i++;
    } else html += exCard(log, c, mode);
  }
  const hidden = session.exercises.length - slots.length;
  const tags = log.tags || [];
  document.title = session.name;
  app.innerHTML = `
    <header class="bar sticky">
      <button class="btn ghost icon" data-go="#/home" aria-label="Home">‹</button>
      <div class="bt"><h1>${esc(session.name)}</h1><span class="timer" id="timer">${fmtDuration(log.completed ? log.durationSec || 0 : (Date.now() - new Date(log.date)) / 1000)}</span></div>
      ${log.completed ? '<span class="badge">Editing</span>' : `<span class="chips"><button class="btn chip${mode.onBlock ? " on" : ""}" id="sess-onblock">${mode.onBlock ? "On-block" : "Off-block"}</button><button class="btn chip dl${mode.deload ? " on" : ""}" id="sess-deload">Deload</button></span>`}
    </header>
    <main class="session" data-log="${log.id}">
      ${mode.deload ? '<div class="deload-banner">DELOAD<small>2 sets · 60% of last weights · no drop sets</small></div>' : ""}
      ${log.completed ? `<p class="hint pad">Editing the ${esc(fmtDate(log.date))} session.</p>` : ""}
      ${hidden ? `<p class="hint pad">${hidden} exercise${hidden > 1 ? "s" : ""} hidden (${[mode.onBlock && "on-block", mode.deload && "deload"].filter(Boolean).join(" / ")}).</p>` : ""}
      ${html}
      <section class="notes-s">
        <h2>Session notes</h2>
        <div class="tags">${noteTags().map(t => `<button class="btn chip tag${tags.includes(t) ? " on" : ""}" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div>
        <textarea id="sess-notes" rows="3" placeholder="How did it go? Anything to remember next time">${esc(log.notes)}</textarea>
      </section>
      <button class="btn primary big" id="finish">${log.completed ? "Save & close" : "Finish session"}</button>
      ${log.completed ? "" : '<button class="btn danger-ghost" id="discard">Discard this session</button>'}
    </main>`;
  if (!log.completed) {
    startTicker(() => { const el = document.getElementById("timer"); if (el) el.textContent = fmtDuration((Date.now() - new Date(log.date)) / 1000); });
    requestWake();
  }
}

function exCard(log, c, mode) {
  const { slot, ex } = c;
  const n = setCount(ex, mode.onBlock, mode.deload);
  const { last, base } = historyFor(log, ex);
  const prog = progression(ex, base, { increment: incrementFor(ex), deload: mode.deload, sets: n });
  const lastText = last ? `${formatLast(ex, last.sets)} <span class="ago">(${agoText(last.log.date)}${last.log.deload ? ", deload" : ""})</span>` : '<span class="ago">No history yet</span>';
  const lastRec = (set, drop) => last?.sets.find(s => s.setNumber === set && (s.drop || 0) === drop);
  let rows = "";
  for (let i = 1; i <= n; i++) rows += setRow(log, ex, i, lastRec, prog?.perSet[i - 1]);
  const head = ex.type === "dropset" ? "" : ex.type === "timed"
    ? '<div class="sr head timed"><span>#</span><span>+kg</span><span>sec</span><span></span></div>'
    : '<div class="sr head"><span>#</span><span>kg</span><span>reps</span><span>RIR</span><span></span></div>';
  const alts = alternativesOf(slot);
  return `<section class="ex${prog?.ready ? " ready" : ""}" data-ex="${esc(ex.id)}" data-slot="${esc(slot.id)}" data-rest="${restFor(c)}">
    <div class="ex-h"><span class="lbl">${esc(slot.label || "")}</span><h2>${esc(ex.name)}${ex.type === "dropset" ? ' <span class="badge drop">Drop set</span>' : ""}${ex.type === "timed" ? ' <span class="badge">Timed</span>' : ""}</h2>
      <span class="ex-tools">${alts.length ? `<button class="btn tool" data-swap="${esc(slot.id)}" aria-label="Swap exercise">⇄</button>` : ""}<button class="btn tool" data-gear="${esc(ex.id)}" aria-label="Exercise settings">⚙</button></span></div>
    ${prog?.ready ? '<div class="ready-badge">READY TO PROGRESS</div>' : ""}
    ${ex.subFor ? `<div class="swapped">⇄ Swapped in for ${esc(slot.name)}</div>` : ""}
    <div class="target">${esc(targetText(ex, mode.onBlock, mode.deload))}</div>
    ${ex.notes ? `<div class="exnotes">${esc(ex.notes)}</div>` : ""}
    <div class="last"><b>Last:</b> ${lastText}</div>
    ${prog ? `<div class="sugg${prog.ready ? " up" : ""}">${esc(prog.text)}</div>` : ""}
    <div class="ex-btns">
      <button class="btn same" data-same="${esc(ex.id)}" ${last ? "" : "disabled"}>Same as last time</button>
      ${prog && prog.perSet.some(p => p.weight != null) ? `<button class="btn same" data-sugg="${esc(ex.id)}">Use suggested kg</button>` : ""}
    </div>
    ${head}${rows}
  </section>`;
}

const val = v => (v == null ? "" : String(v));
function setRow(log, ex, i, lastRec, sug) {
  const inp = (drop, field, mode, ph, extra = "") => {
    const rec = S.sets.get(setKey(log.id, ex.id, i, drop));
    return `<input class="in" data-set="${i}" data-drop="${drop}" data-f="${field}" inputmode="${mode}" enterkeyhint="next" autocomplete="off" ${extra}
      value="${esc(val(rec?.[field]))}" placeholder="${esc(ph ?? "")}" aria-label="Set ${i} ${field}">`;
  };
  const isDone = d => S.sets.get(setKey(log.id, ex.id, i, d))?.done;
  const tick = `<button class="tick${isDone(0) ? " done" : ""}" data-tick="${i}" aria-label="Set ${i} complete">✓</button>`;
  if (ex.type === "dropset") {
    let cells = "";
    for (let d = 0; d < drops(ex); d++) {
      const l = lastRec(i, d);
      cells += `<div class="drop"><span class="dl">D${d + 1}</span>${inp(d, "weight", "decimal", l?.weight ?? "kg", 'step="0.5"')}${inp(d, "reps", "numeric", l?.reps ?? "reps")}</div>`;
    }
    return `<div class="sr dropset${isDone(0) ? " is-done" : ""}" data-row="${i}"><span class="sn">R${i}</span>${cells}${tick}</div>`;
  }
  const l = lastRec(i, 0);
  if (ex.type === "timed") return `<div class="sr timed${isDone(0) ? " is-done" : ""}" data-row="${i}"><span class="sn">${i}</span>${inp(0, "weight", "decimal", l?.weight ?? "0")}${inp(0, "reps", "numeric", l?.reps ?? "sec")}${tick}</div>`;
  const wPh = sug ? sug.weight ?? "BW" : l?.weight ?? "kg";
  const rPh = sug ? sug.reps ?? "reps" : l?.reps ?? "reps";
  return `<div class="sr${isDone(0) ? " is-done" : ""}" data-row="${i}"><span class="sn">${i}</span>${inp(0, "weight", "decimal", wPh)}${inp(0, "reps", "numeric", rPh)}${inp(0, "rir", "numeric", l?.rir ?? ex.rir ?? "RIR")}${tick}</div>`;
}

function recFor(logId, exId, set, drop) {
  const id = setKey(logId, exId, set, drop);
  return S.sets.get(id) || { id, sessionLogId: logId, exerciseId: exId, setNumber: set, drop, weight: null, reps: null, rir: null, done: false };
}

/** Re-render one exercise card in place (keeps scroll and the rest of the page). */
function refreshCard(log, slotId) {
  const session = sessionById(log.sessionId); const mode = modeOf(log);
  const c = slotsFor(log, session, mode).find(x => x.slot.id === slotId);
  const el = app.querySelector(`.ex[data-slot="${CSS.escape(slotId)}"]`);
  if (c && el) el.outerHTML = exCard(log, c, mode);
}

function onSessionInput(e) {
  const t = e.target;
  if (t.id === "sess-notes") { const log = logById(+app.querySelector(".session").dataset.log); log.notes = t.value; saveLog(log).catch(fail); return; }
  if (!t.classList.contains("in")) return;
  const logId = +app.querySelector(".session").dataset.log, exId = t.closest(".ex").dataset.ex;
  const f = t.dataset.f, rec = { ...recFor(logId, exId, +t.dataset.set, +t.dataset.drop) };
  const v = f === "weight" ? parseWeight(t.value) : parseIntOrNull(t.value, f === "rir" ? 10 : 1000);
  t.classList.toggle("invalid", t.value.trim() !== "" && v == null);
  rec[f] = v;
  saveSet(rec);
}

async function onSessionClick(e) {
  const b = e.target.closest("button"); if (!b) return;
  const main = app.querySelector(".session"); const logId = +main.dataset.log; const log = logById(logId);
  const card = b.closest(".ex");
  if (b.dataset.tick) {
    const exId = card.dataset.ex, set = +b.dataset.tick;
    const rec = { ...recFor(logId, exId, set, 0), done: !b.classList.contains("done") };
    saveSet(rec);
    b.classList.toggle("done", rec.done); b.closest(".sr").classList.toggle("is-done", rec.done);
    if (rec.done) { buzz(15); startRest(+card.dataset.rest, `${exerciseById(exId)?.name || ""} · set ${set}`); }
  } else if (b.dataset.same) {
    const ex = exerciseById(b.dataset.same), mode = modeOf(log);
    const { last } = historyFor(log, ex); if (!last) return;
    const n = setCount(ex, mode.onBlock, mode.deload);
    const existing = allSets().some(s => s.sessionLogId === logId && s.exerciseId === ex.id && hasData(s));
    if (existing && !confirm(`Overwrite what you've entered for ${ex.name} with last time's numbers?`)) return;
    const writes = [];
    for (let i = 1; i <= n; i++) for (let d = 0; d < drops(ex); d++) {
      const l = last.sets.find(s => s.setNumber === i && (s.drop || 0) === d); if (!l) continue;
      const rec = { ...recFor(logId, ex.id, i, d), weight: l.weight, reps: l.reps, rir: ex.type === "standard" || ex.type === "superset" ? l.rir ?? null : null };
      S.sets.set(rec.id, rec); writes.push(rec);
    }
    refreshCard(log, card.dataset.slot);
    await db.putMany("setLogs", writes).catch(fail);
    toast(`Filled ${writes.length} ${ex.type === "dropset" ? "drops" : "sets"} – edit as needed`);
  } else if (b.dataset.sugg) {
    // Fills only EMPTY weight boxes with the suggestion – never overwrites what you typed
    const ex = exerciseById(b.dataset.sugg), mode = modeOf(log);
    const n = setCount(ex, mode.onBlock, mode.deload);
    const prog = progression(ex, historyFor(log, ex).base, { increment: incrementFor(ex), deload: mode.deload, sets: n });
    const writes = [];
    for (let i = 1; i <= n; i++) {
      const w = prog?.perSet[i - 1]?.weight; const rec = recFor(logId, ex.id, i, 0);
      if (w == null || rec.weight != null) continue;
      const nr = { ...rec, weight: w }; S.sets.set(nr.id, nr); writes.push(nr);
    }
    refreshCard(log, card.dataset.slot);
    await db.putMany("setLogs", writes).catch(fail);
    toast(writes.length ? `Suggested weights filled on ${writes.length} set${writes.length > 1 ? "s" : ""}` : "Weights already entered");
  } else if (b.dataset.swap) {
    const slot = exerciseById(b.dataset.swap); const current = log.subs?.[slot.id] || slot.id;
    const opts = [slot, ...alternativesOf(slot)];
    const { value } = await choose({
      title: `Swap ${slot.label || ""} ${slot.name}`.trim(), body: '<p class="hint">Logs against the exercise you pick, in this slot.</p>',
      options: [...opts.map(o => ({ label: (o.id === current ? "✓ " : "") + o.name + (o.id === slot.id ? " (programme)" : ""), value: o.id, cls: o.id === current ? "primary" : "" })), { label: "Cancel", value: "", cls: "ghost" }],
    });
    if (!value || value === current) return;
    // Drop untouched pre-fills (weight only, no reps, not ticked) from the exercise being swapped out
    for (const [k, r] of S.sets) if (r.sessionLogId === logId && r.exerciseId === current && r.reps == null && !r.done) { S.sets.delete(k); db.del("setLogs", k).catch(fail); }
    log.subs = { ...(log.subs || {}) };
    if (value === slot.id) delete log.subs[slot.id]; else log.subs[slot.id] = value;
    refreshCard(log, slot.id);
    await saveLog(log).catch(fail);
    toast(`Now doing ${exerciseById(value)?.name}`);
  } else if (b.dataset.gear) {
    const ex = exerciseById(b.dataset.gear); const own = S.exSettings[ex.id] || {};
    const c = slotsFor(log, sessionById(log.sessionId), modeOf(log)).find(x => x.ex.id === ex.id);
    const restDef = c ? S.rest[restKind(ex, c)] : S.rest.standard;
    const { value, vals } = await choose({
      title: ex.name,
      body: `<label class="set-row"><span>Weight jump when ready</span><input class="in sm" name="inc" inputmode="decimal" value="${esc(own.increment ?? "")}" placeholder="${defaultIncrement(ex)}"><span class="unit">kg</span></label>
        <label class="set-row"><span>Rest after each set</span><input class="in sm" name="rest" inputmode="numeric" value="${esc(own.rest ?? "")}" placeholder="${ex.rest ?? restDef}"><span class="unit">sec</span></label>
        <p class="hint">Leave blank to use the default.</p>`,
      options: [{ label: "Save", value: "save", cls: "primary" }, { label: "Cancel", value: "", cls: "ghost" }],
    });
    if (value !== "save") return;
    const inc = parseWeight(vals.inc), rest = parseIntOrNull(vals.rest, 1800);
    const next = { ...(inc != null ? { increment: inc } : {}), ...(rest != null ? { rest } : {}) };
    S.exSettings = { ...S.exSettings }; if (Object.keys(next).length) S.exSettings[ex.id] = next; else delete S.exSettings[ex.id];
    refreshCard(log, card.dataset.slot);
    await db.setSetting("exSettings", S.exSettings).catch(fail);
  } else if (b.dataset.tag) {
    const t = b.dataset.tag; const tags = new Set(log.tags || []);
    tags.has(t) ? tags.delete(t) : tags.add(t);
    log.tags = [...tags]; b.classList.toggle("on", tags.has(t));
    saveLog(log).catch(fail);
  } else if (b.id === "sess-onblock" || b.id === "sess-deload") {
    const key = b.id === "sess-onblock" ? "onBlock" : "deload";
    setMode(key, !S[key]); const y = scrollY; renderSession(logId); scrollTo(0, y);
  } else if (b.id === "finish") {
    await finishSession(log);
  } else if (b.id === "discard") {
    if (!confirm("Discard this session and everything logged in it? This cannot be undone.")) return;
    await removeLog(logId); go("#/home");
  }
}

async function finishSession(log) {
  const session = sessionById(log.sessionId);
  const slots = slotsFor(log, session, modeOf(log)).map(c => c.ex);
  const unlogged = unloggedSlots(slots, allSets(), log.id);
  if (unlogged.length === slots.length) {
    if (!confirm("Nothing has been logged. Finish anyway?")) return;
  } else if (unlogged.length) {
    const { value } = await choose({
      title: `${unlogged.length} exercise${unlogged.length > 1 ? "s" : ""} not logged`,
      body: `<ul class="m-list">${unlogged.map(e => `<li>${esc(e.label || "")} ${esc(e.name)}</li>`).join("")}</ul>
        <p class="hint"><b>Complete</b> – the session counts as done. <b>Partial</b> – flagged in History, and the skipped exercises don't affect progression.</p>`,
      options: [{ label: "Complete", value: "complete", cls: "primary" }, { label: "Partial", value: "partial", cls: "warn" }, { label: "Keep training", value: "", cls: "ghost" }],
    });
    if (!value) return;
    log.partial = value === "partial";
    log.skipped = log.partial ? unlogged.map(e => e.id) : [];
  } else { log.partial = false; log.skipped = []; }
  if (!log.completed) {
    log.completed = true; log.finishedAt = new Date().toISOString();
    log.durationSec = Math.round((Date.now() - new Date(log.date)) / 1000);
    S.activeLogId = null; await db.setSetting("activeLogId", null).catch(fail);
  }
  await saveLog(log).catch(fail);
  if (R.endAt) finishRest(false);
  toast(`${session?.name || "Session"} saved${log.partial ? " as partial" : ""}`);
  go("#/home");
}

async function removeLog(logId) {
  await db.deleteLog(logId).catch(fail);
  S.logs = S.logs.filter(l => l.id !== logId);
  for (const [k, s] of S.sets) if (s.sessionLogId === logId) S.sets.delete(k);
  if (S.activeLogId === logId) { S.activeLogId = null; await db.setSetting("activeLogId", null).catch(fail); }
}

// ---------- HISTORY ----------
function logBadges(l) {
  return `${l.deload ? '<span class="badge dl">Deload</span>' : ""}${l.onBlock ? '<span class="badge">On-block</span>' : ""}${l.partial ? '<span class="badge warn">Partial</span>' : ""}` +
    `${l.completed ? "" : l.id === S.activeLogId ? '<span class="badge live">In progress</span>' : '<span class="badge warn">Unfinished</span>'}` +
    `${Object.keys(l.subs || {}).length ? '<span class="badge sw">⇄ Swaps</span>' : ""}` +
    (l.tags || []).map(t => `<span class="badge tagb">${esc(t)}</span>`).join("");
}

function renderHistory() {
  document.title = "History";
  const ids = [...new Set([...S.programme.sessions.map(s => s.id), ...S.logs.map(l => l.sessionId)])];
  app.innerHTML = `
    <header class="bar sticky"><button class="btn ghost icon" data-go="#/home" aria-label="Home">‹</button><h1>History</h1><span></span></header>
    <main class="history">
      <div class="filters">${["all", ...ids].map(id => `<button class="btn chip${S.filter === id ? " on" : ""}" data-filter="${esc(id)}">${esc(id === "all" ? "All" : sessionById(id)?.name || id)}</button>`).join("")}</div>
      <input class="search" id="hsearch" type="search" placeholder="Search notes and tags" value="${esc(S.hq)}" autocomplete="off">
      <div class="filters">${noteTags().map(t => `<button class="btn chip tag${S.htag === t ? " on" : ""}" data-htag="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <div id="hlist"></div>
    </main>`;
  renderHistoryList();
}

function renderHistoryList() {
  const sets = allSets();
  const logs = S.logs
    .filter(l => (S.filter === "all" || l.sessionId === S.filter) && (!S.htag || (l.tags || []).includes(S.htag)) && matchesSearch(l, S.hq, sessionById(l.sessionId)?.name))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const items = logs.map(l => {
    const ls = sets.filter(s => s.sessionLogId === l.id && hasData(s));
    const exn = new Set(ls.map(s => s.exerciseId)).size;
    return `<button class="card hist" data-go="#/history/${l.id}">
      <span class="h-top"><b>${esc(sessionById(l.sessionId)?.name || l.sessionId)}</b><span>${esc(fmtDate(l.date))}</span></span>
      <span class="h-sub">${l.completed ? fmtDuration(l.durationSec || 0) + " · " : ""}${exn} exercises · ${ls.length} sets ${logBadges(l)}</span>
      ${l.notes ? `<span class="h-note">${esc(l.notes.length > 90 ? l.notes.slice(0, 90) + "…" : l.notes)}</span>` : ""}
    </button>`;
  }).join("");
  document.getElementById("hlist").innerHTML = items || `<p class="hint pad">${S.logs.length ? "No sessions match." : "No sessions logged yet."}</p>`;
}

function renderDetail(logId) {
  const log = logById(logId); const session = sessionById(log.sessionId);
  const ls = setsOf(logId).filter(s => hasData(s) || s.done);
  // Programme slot order; a swapped-in exercise sits in its slot
  const order = [];
  for (const e of session?.exercises || []) { order.push(e.id); if (log.subs?.[e.id]) order.push(log.subs[e.id]); }
  for (const s of ls) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);
  const blocks = order.filter(id => ls.some(s => s.exerciseId === id)).map(id => {
    const ex = exerciseById(id) || { id, name: id, type: "standard" };
    const slot = ex.subFor ? exerciseById(ex.subFor) : null;
    const label = session?.exercises.find(e => e.id === id || log.subs?.[e.id] === id || e.id === ex.subFor)?.label || "";
    const rows = ls.filter(s => s.exerciseId === id).sort((a, b) => a.setNumber - b.setNumber || (a.drop || 0) - (b.drop || 0));
    let body;
    if (ex.type === "dropset") {
      const rounds = [...new Set(rows.map(r => r.setNumber))];
      body = rounds.map(n => `<tr><td>R${n}</td><td colspan="3">${rows.filter(r => r.setNumber === n && hasData(r)).map(r => `${esc(r.weight ?? "BW")}kg x${esc(r.reps ?? "–")}`).join(" → ")}</td><td>${rows.find(r => r.setNumber === n && !r.drop)?.done ? "✓" : ""}</td></tr>`).join("");
    } else body = rows.map(r => `<tr><td>${r.setNumber}</td><td>${r.weight == null ? (ex.type === "timed" ? "–" : "BW") : esc(r.weight) + "kg"}</td><td>${esc(r.reps ?? "–")}${ex.type === "timed" ? "s" : ""}</td><td>${ex.type === "timed" ? "" : esc(r.rir ?? "")}</td><td>${r.done ? "✓" : ""}</td></tr>`).join("");
    return `<section class="ex detail"><div class="ex-h"><span class="lbl">${esc(label)}</span><h2>${esc(ex.name)}</h2></div>
      ${slot ? `<div class="swapped">⇄ Substituted for ${esc(slot.name)}</div>` : ""}
      <table><thead><tr><th>#</th><th>${ex.type === "timed" ? "+kg" : "Weight"}</th><th>${ex.type === "timed" ? "Time" : "Reps"}</th><th>${ex.type === "timed" || ex.type === "dropset" ? "" : "RIR"}</th><th></th></tr></thead><tbody>${body}</tbody></table></section>`;
  }).join("");
  const skipped = (log.skipped || []).map(id => exerciseById(id)?.name || id);
  document.title = "Session detail";
  app.innerHTML = `
    <header class="bar sticky"><button class="btn ghost icon" data-go="#/history" aria-label="Back">‹</button><h1>${esc(session?.name || log.sessionId)}</h1><span></span></header>
    <main class="detail-v">
      <p class="meta">${esc(fmtDate(log.date))} · ${esc(fmtTime(log.date))}${log.completed ? ` · ${fmtDuration(log.durationSec || 0)}` : " · not finished"}${log.onBlock ? " · On-block" : " · Off-block"}</p>
      <p class="h-sub">${logBadges(log)}</p>
      ${skipped.length ? `<div class="notice warn">Partial session – skipped: ${esc(skipped.join(", "))}</div>` : ""}
      ${log.notes ? `<div class="exnotes">${esc(log.notes)}</div>` : ""}
      ${blocks || '<p class="hint">No sets logged.</p>'}
      <div class="row-btns">
        <button class="btn" data-go="#/session/${log.id}">${log.completed ? "Edit" : "Resume"}</button>
        <button class="btn danger-ghost" id="del-log">Delete session</button>
      </div>
    </main>`;
}

// ---------- events ----------
app.addEventListener("click", async e => {
  const b = e.target.closest("button, [data-go]"); if (!b) return;
  if (b.dataset.go) return go(b.dataset.go);
  if (b.dataset.start) return startSession(b.dataset.start).catch(fail);
  if (b.dataset.filter) { S.filter = b.dataset.filter; return renderHistory(); }
  if (b.dataset.htag != null && !app.querySelector(".session")) { S.htag = S.htag === b.dataset.htag ? "" : b.dataset.htag; return renderHistory(); }
  if (b.id === "export") return doExport();
  if (b.id === "import") return document.getElementById("importfile").click();
  if (b.id === "rest-reset") { S.rest = { ...REST_DEFAULTS }; await db.setSetting("restDefaults", S.rest).catch(fail); return renderSettings(); }
  if (b.id === "del-log") {
    const id = +location.hash.split("/")[2];
    if (confirm("Delete this session and all its sets? This cannot be undone.")) { await removeLog(id); go("#/history"); }
    return;
  }
  if (app.querySelector(".session")) onSessionClick(e).catch(fail);
});
app.addEventListener("input", e => {
  if (app.querySelector(".session")) return onSessionInput(e);
  if (e.target.id === "hsearch") { S.hq = e.target.value; return renderHistoryList(); }
  if (e.target.dataset.restDef) {
    const v = parseIntOrNull(e.target.value, 1800);
    e.target.classList.toggle("invalid", v == null);
    if (v != null) { S.rest = { ...S.rest, [e.target.dataset.restDef]: v }; db.setSetting("restDefaults", S.rest).catch(fail); }
  }
});
app.addEventListener("change", e => {
  if (e.target.id === "onblock") { setMode("onBlock", e.target.checked); renderHome(); }
  if (e.target.id === "deload") { setMode("deload", e.target.checked); renderHome(); }
  if (e.target.id === "importfile" && e.target.files[0]) doImport(e.target.files[0]);
});
// Select-all on focus so a new number replaces the old one without fiddly deleting
app.addEventListener("focusin", e => { if (e.target.classList?.contains("in")) setTimeout(() => e.target.select(), 0); });
window.addEventListener("hashchange", route);

// ---------- boot ----------
(async () => {
  try {
    await db.open();
    S.programme = await loadProgramme();
    S.idx = exerciseIndex(S.programme);
    await loadData();
    document.body.classList.toggle("deload", S.deload);
    route();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<main class="pad"><h1>Couldn't start</h1><p>${esc(e.message || e)}</p><p class="hint">Open the app once with internet so it can download programme.json.</p><button class="btn" onclick="location.reload()">Retry</button></main>`;
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW", e));
})();
