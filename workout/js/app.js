import * as db from "./db.js";
import {
  setCount, visibleExercises, sessionAvailable, groupExercises, drops, setKey, parseWeight, parseIntOrNull,
  hasData, formatLast, agoText, daysAgo, fmtDuration, targetText, lastFor, lastPerformed, validateProgramme, validateBackup,
} from "./logic.js";

const S = { programme: null, onBlock: false, activeLogId: null, lastExport: null, logs: [], sets: new Map(), filter: "all", programmeWarning: "" };
const app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtTime = iso => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// ---------- toast ----------
let toastT;
function toast(msg, bad = false) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast show" + (bad ? " bad" : "");
  clearTimeout(toastT); toastT = setTimeout(() => (t.className = "toast"), bad ? 5000 : 2200);
}
const fail = e => { console.error(e); toast("Save failed – " + (e?.message || e), true); };

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
  const [logs, sets, onBlock, activeLogId, lastExport] = await Promise.all([
    db.getAll("sessionLogs"), db.getAll("setLogs"), db.getSetting("onBlock", false), db.getSetting("activeLogId", null), db.getSetting("lastExport", null),
  ]);
  S.logs = logs; S.sets = new Map(sets.map(s => [s.id, s])); S.onBlock = !!onBlock; S.lastExport = lastExport;
  const active = logs.find(l => l.id === activeLogId);
  S.activeLogId = active && !active.completed ? active.id : null;
}

const allSets = () => [...S.sets.values()];
const logById = id => S.logs.find(l => l.id === id);
const sessionById = id => S.programme.sessions.find(s => s.id === id);
const exerciseById = id => { for (const s of S.programme.sessions) for (const e of s.exercises) if (e.id === id) return e; return null; };
const setsOf = logId => allSets().filter(s => s.sessionLogId === logId);

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
function setOnBlock(v) {
  S.onBlock = v;
  db.setSetting("onBlock", v).catch(fail);
  const log = logById(S.activeLogId);
  if (log && !log.completed) { log.onBlock = v; saveLog(log).catch(fail); }
}

// ---------- router ----------
function route() {
  const [, view, arg] = (location.hash || "#/home").split("/");
  stopSessionExtras();
  if (view === "session" && logById(+arg)) return renderSession(+arg);
  if (view === "history" && arg && logById(+arg)) return renderDetail(+arg);
  if (view === "history") return renderHistory();
  renderHome();
}
const go = h => { if (location.hash === h) route(); else location.hash = h; };

// ---------- HOME ----------
function renderHome() {
  document.title = "Workout";
  const active = logById(S.activeLogId);
  const exportAge = S.lastExport ? daysAgo(S.lastExport) : null;
  const cards = S.programme.sessions.map(s => {
    const last = lastPerformed(s.id, S.logs, allSets());
    const avail = sessionAvailable(s, S.onBlock);
    const since = last == null ? "Not done yet" : daysAgo(last) === 0 ? "Today" : `${daysAgo(last)} day${daysAgo(last) === 1 ? "" : "s"} ago`;
    const n = visibleExercises(s, S.onBlock).length;
    return `<button class="card session-card${avail ? "" : " disabled"}${s.offBlockOnly ? " offblock" : ""}${active?.sessionId === s.id ? " is-active" : ""}" data-start="${esc(s.id)}" ${avail ? "" : 'aria-disabled="true"'}>
      <span class="sc-name">${esc(s.name)}</span>
      ${s.offBlockOnly ? '<span class="badge warn">Off-block only</span>' : ""}
      ${active?.sessionId === s.id ? '<span class="badge live">In progress</span>' : ""}
      <span class="sc-since">${since}</span>
      <span class="sc-meta">${n} exercises</span>
    </button>`;
  }).join("");
  app.innerHTML = `
    <header class="bar"><h1>${esc(S.programme.blockName || "Workout")}</h1><button class="btn ghost" data-go="#/history">History</button></header>
    <main class="home">
      ${S.programmeWarning ? `<div class="notice bad">${esc(S.programmeWarning)}</div>` : ""}
      ${active ? `<button class="resume" data-go="#/session/${active.id}">Resume ${esc(sessionById(active.sessionId)?.name || active.sessionId)} <span id="resume-timer">${fmtDuration((Date.now() - new Date(active.date)) / 1000)}</span></button>` : ""}
      <label class="toggle">
        <input type="checkbox" id="onblock" ${S.onBlock ? "checked" : ""}>
        <span class="track"><span class="thumb"></span></span>
        <span class="tl"><b>${S.onBlock ? "On-block" : "Off-block"}</b><small>${S.onBlock ? "Reduced sets, drop sets hidden, Legs unavailable" : "Full programme"}</small></span>
      </label>
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
  const log = await saveLog({ sessionId, date: new Date().toISOString(), onBlock: S.onBlock, completed: false, notes: "" });
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
    toast(`Restored ${b.sessionLogs.length} sessions`);
    go("#/home");
  } catch (e) { toast("Import failed – " + (e instanceof SyntaxError ? "file is not valid JSON" : e.message), true); }
}

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

function lastMap(log, exs) {
  const prior = S.logs.filter(l => l.id !== log.id && l.date < log.date);
  const sets = allSets();
  const m = new Map();
  for (const ex of exs) m.set(ex.id, lastFor(ex.id, prior, sets, log.id));
  return m;
}

function renderSession(logId) {
  const log = logById(logId);
  const session = sessionById(log.sessionId);
  if (!session) { app.innerHTML = `<main class="pad"><p>Session "${esc(log.sessionId)}" is no longer in programme.json.</p><button class="btn" data-go="#/history/${log.id}">View log</button></main>`; return; }
  const onBlock = log.completed ? !!log.onBlock : S.onBlock;
  const exs = visibleExercises(session, onBlock);
  const last = lastMap(log, exs);
  const groups = groupExercises(exs).map(g => g.superset
    ? `<div class="superset"><div class="ss-label">Superset ${esc(g.items.map(e => e.label).filter(Boolean).join(" + "))}</div>${g.items.map(e => exCard(log, e, onBlock, last.get(e.id))).join('<div class="ss-link" aria-hidden="true"></div>')}</div>`
    : exCard(log, g.items[0], onBlock, last.get(g.items[0].id))).join("");
  const hidden = session.exercises.length - exs.length;
  document.title = session.name;
  app.innerHTML = `
    <header class="bar sticky">
      <button class="btn ghost icon" data-go="#/home" aria-label="Home">‹</button>
      <div class="bt"><h1>${esc(session.name)}</h1><span class="timer" id="timer">${fmtDuration(log.completed ? log.durationSec || 0 : (Date.now() - new Date(log.date)) / 1000)}</span></div>
      ${log.completed ? '<span class="badge">Editing</span>' : `<button class="btn chip${onBlock ? " on" : ""}" id="sess-onblock">${onBlock ? "On-block" : "Off-block"}</button>`}
    </header>
    <main class="session" data-log="${log.id}">
      ${log.completed ? `<p class="hint pad">Editing the ${esc(fmtDate(log.date))} session.</p>` : ""}
      ${hidden ? `<p class="hint pad">${hidden} exercise${hidden > 1 ? "s" : ""} hidden (on-block).</p>` : ""}
      ${groups}
      <label class="notes-l">Session notes<textarea id="sess-notes" rows="3" placeholder="Optional">${esc(log.notes)}</textarea></label>
      <button class="btn primary big" id="finish">${log.completed ? "Save & close" : "Finish session"}</button>
      ${log.completed ? "" : '<button class="btn danger-ghost" id="discard">Discard this session</button>'}
    </main>`;
  if (!log.completed) {
    startTicker(() => { const el = document.getElementById("timer"); if (el) el.textContent = fmtDuration((Date.now() - new Date(log.date)) / 1000); });
    requestWake();
  }
}

function exCard(log, ex, onBlock, last) {
  const n = setCount(ex, onBlock);
  const lastText = last ? `${formatLast(ex, last.sets)} <span class="ago">(${agoText(last.log.date)})</span>` : '<span class="ago">No history yet</span>';
  const lastRec = (set, drop) => last?.sets.find(s => s.setNumber === set && (s.drop || 0) === drop);
  let rows = "";
  for (let i = 1; i <= n; i++) rows += setRow(log, ex, i, lastRec);
  const head = ex.type === "dropset" ? "" : ex.type === "timed"
    ? '<div class="sr head timed"><span>#</span><span>+kg</span><span>sec</span><span></span></div>'
    : '<div class="sr head"><span>#</span><span>kg</span><span>reps</span><span>RIR</span><span></span></div>';
  return `<section class="ex" data-ex="${esc(ex.id)}">
    <div class="ex-h"><span class="lbl">${esc(ex.label || "")}</span><h2>${esc(ex.name)}${ex.type === "dropset" ? ' <span class="badge drop">Drop set</span>' : ""}${ex.type === "timed" ? ' <span class="badge">Timed</span>' : ""}</h2></div>
    <div class="target">${esc(targetText(ex, onBlock))}</div>
    ${ex.notes ? `<div class="exnotes">${esc(ex.notes)}</div>` : ""}
    <div class="last"><b>Last:</b> ${lastText}</div>
    <button class="btn same" data-same="${esc(ex.id)}" ${last ? "" : "disabled"}>Same as last time</button>
    ${head}${rows}
  </section>`;
}

const val = v => (v == null ? "" : String(v));
function setRow(log, ex, i, lastRec) {
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
  return `<div class="sr${isDone(0) ? " is-done" : ""}" data-row="${i}"><span class="sn">${i}</span>${inp(0, "weight", "decimal", l?.weight ?? "kg")}${inp(0, "reps", "numeric", l?.reps ?? "reps")}${inp(0, "rir", "numeric", l?.rir ?? ex.rir ?? "RIR")}${tick}</div>`;
}

function recFor(logId, exId, set, drop) {
  const id = setKey(logId, exId, set, drop);
  return S.sets.get(id) || { id, sessionLogId: logId, exerciseId: exId, setNumber: set, drop, weight: null, reps: null, rir: null, done: false };
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
  if (b.dataset.tick) {
    const exId = b.closest(".ex").dataset.ex, set = +b.dataset.tick;
    const rec = { ...recFor(logId, exId, set, 0), done: !b.classList.contains("done") };
    saveSet(rec);
    b.classList.toggle("done", rec.done); b.closest(".sr").classList.toggle("is-done", rec.done);
    if (rec.done && navigator.vibrate) navigator.vibrate(15);
  } else if (b.dataset.same) {
    const ex = exerciseById(b.dataset.same), onBlock = log.completed ? !!log.onBlock : S.onBlock;
    const last = lastMap(log, [ex]).get(ex.id); if (!last) return;
    const n = setCount(ex, onBlock);
    const existing = [...S.sets.values()].some(s => s.sessionLogId === logId && s.exerciseId === ex.id && hasData(s));
    if (existing && !confirm(`Overwrite what you've entered for ${ex.name} with last time's numbers?`)) return;
    const writes = [];
    for (let i = 1; i <= n; i++) for (let d = 0; d < drops(ex); d++) {
      const l = last.sets.find(s => s.setNumber === i && (s.drop || 0) === d); if (!l) continue;
      const rec = { ...recFor(logId, ex.id, i, d), weight: l.weight, reps: l.reps, rir: ex.type === "standard" || ex.type === "superset" ? l.rir ?? null : null };
      S.sets.set(rec.id, rec); writes.push(rec);
    }
    b.closest(".ex").outerHTML = exCard(log, ex, onBlock, last);
    await db.putMany("setLogs", writes).catch(fail);
    toast(`Filled ${writes.length} ${ex.type === "dropset" ? "drops" : "sets"} – edit as needed`);
  } else if (b.id === "sess-onblock") {
    setOnBlock(!S.onBlock); const y = scrollY; renderSession(logId); scrollTo(0, y);
  } else if (b.id === "finish") {
    const any = setsOf(logId).some(hasData);
    if (!any && !confirm("Nothing has been logged. Finish anyway?")) return;
    if (!log.completed) {
      log.completed = true; log.finishedAt = new Date().toISOString();
      log.durationSec = Math.round((Date.now() - new Date(log.date)) / 1000);
      S.activeLogId = null; await db.setSetting("activeLogId", null).catch(fail);
    }
    await saveLog(log).catch(fail);
    toast(`${sessionById(log.sessionId)?.name || "Session"} saved`);
    go("#/home");
  } else if (b.id === "discard") {
    if (!confirm("Discard this session and everything logged in it? This cannot be undone.")) return;
    await removeLog(logId); go("#/home");
  }
}

async function removeLog(logId) {
  await db.deleteLog(logId).catch(fail);
  S.logs = S.logs.filter(l => l.id !== logId);
  for (const [k, s] of S.sets) if (s.sessionLogId === logId) S.sets.delete(k);
  if (S.activeLogId === logId) { S.activeLogId = null; await db.setSetting("activeLogId", null).catch(fail); }
}

// ---------- HISTORY ----------
function renderHistory() {
  document.title = "History";
  const ids = [...new Set([...S.programme.sessions.map(s => s.id), ...S.logs.map(l => l.sessionId)])];
  const logs = S.logs.filter(l => S.filter === "all" || l.sessionId === S.filter).sort((a, b) => (a.date < b.date ? 1 : -1));
  const sets = allSets();
  const items = logs.map(l => {
    const ls = sets.filter(s => s.sessionLogId === l.id && hasData(s));
    const exn = new Set(ls.map(s => s.exerciseId)).size;
    return `<button class="card hist" data-go="#/history/${l.id}">
      <span class="h-top"><b>${esc(sessionById(l.sessionId)?.name || l.sessionId)}</b><span>${esc(fmtDate(l.date))}</span></span>
      <span class="h-sub">${l.completed ? fmtDuration(l.durationSec || 0) : ""} · ${exn} exercises · ${ls.length} sets
        ${l.onBlock ? '<span class="badge">On-block</span>' : ""}${l.completed ? "" : l.id === S.activeLogId ? '<span class="badge live">In progress</span>' : '<span class="badge warn">Unfinished</span>'}</span>
    </button>`;
  }).join("");
  app.innerHTML = `
    <header class="bar sticky"><button class="btn ghost icon" data-go="#/home" aria-label="Home">‹</button><h1>History</h1><span></span></header>
    <main class="history">
      <div class="filters">${["all", ...ids].map(id => `<button class="btn chip${S.filter === id ? " on" : ""}" data-filter="${esc(id)}">${esc(id === "all" ? "All" : sessionById(id)?.name || id)}</button>`).join("")}</div>
      ${items || '<p class="hint pad">No sessions logged yet.</p>'}
    </main>`;
}

function renderDetail(logId) {
  const log = logById(logId); const session = sessionById(log.sessionId);
  const ls = setsOf(logId).filter(s => hasData(s) || s.done);
  const order = [...(session?.exercises.map(e => e.id) || [])];
  for (const s of ls) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);
  const blocks = order.filter(id => ls.some(s => s.exerciseId === id)).map(id => {
    const ex = exerciseById(id) || { id, name: id, type: "standard" };
    const rows = ls.filter(s => s.exerciseId === id).sort((a, b) => a.setNumber - b.setNumber || (a.drop || 0) - (b.drop || 0));
    let body;
    if (ex.type === "dropset") {
      const rounds = [...new Set(rows.map(r => r.setNumber))];
      body = rounds.map(n => `<tr><td>R${n}</td><td colspan="3">${rows.filter(r => r.setNumber === n && hasData(r)).map(r => `${esc(r.weight ?? "BW")}kg x${esc(r.reps ?? "–")}`).join(" → ")}</td><td>${rows.find(r => r.setNumber === n && !r.drop)?.done ? "✓" : ""}</td></tr>`).join("");
    } else body = rows.map(r => `<tr><td>${r.setNumber}</td><td>${r.weight == null ? (ex.type === "timed" ? "–" : "BW") : esc(r.weight) + "kg"}</td><td>${esc(r.reps ?? "–")}${ex.type === "timed" ? "s" : ""}</td><td>${ex.type === "timed" ? "" : esc(r.rir ?? "")}</td><td>${r.done ? "✓" : ""}</td></tr>`).join("");
    return `<section class="ex detail"><div class="ex-h"><span class="lbl">${esc(ex.label || "")}</span><h2>${esc(ex.name)}</h2></div>
      <table><thead><tr><th>#</th><th>${ex.type === "timed" ? "+kg" : "Weight"}</th><th>${ex.type === "timed" ? "Time" : "Reps"}</th><th>${ex.type === "timed" || ex.type === "dropset" ? "" : "RIR"}</th><th></th></tr></thead><tbody>${body}</tbody></table></section>`;
  }).join("");
  document.title = "Session detail";
  app.innerHTML = `
    <header class="bar sticky"><button class="btn ghost icon" data-go="#/history" aria-label="Back">‹</button><h1>${esc(session?.name || log.sessionId)}</h1><span></span></header>
    <main class="detail-v">
      <p class="meta">${esc(fmtDate(log.date))} · ${esc(fmtTime(log.date))}${log.completed ? ` · ${fmtDuration(log.durationSec || 0)}` : " · not finished"}${log.onBlock ? " · On-block" : " · Off-block"}</p>
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
  if (b.id === "export") return doExport();
  if (b.id === "import") return document.getElementById("importfile").click();
  if (b.id === "del-log") {
    const id = +location.hash.split("/")[2];
    if (confirm("Delete this session and all its sets? This cannot be undone.")) { await removeLog(id); go("#/history"); }
    return;
  }
  if (app.querySelector(".session")) onSessionClick(e).catch(fail);
});
app.addEventListener("input", e => { if (app.querySelector(".session")) onSessionInput(e); });
app.addEventListener("change", e => {
  if (e.target.id === "onblock") { setOnBlock(e.target.checked); renderHome(); }
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
    await loadData();
    route();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<main class="pad"><h1>Couldn't start</h1><p>${esc(e.message || e)}</p><p class="hint">Open the app once with internet so it can download programme.json.</p><button class="btn" onclick="location.reload()">Retry</button></main>`;
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW", e));
})();
