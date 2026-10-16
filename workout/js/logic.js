// Pure functions only – no DOM, no IndexedDB – so they can be unit-tested in Node.

export const DAY = 86400000;

export const DELOAD_SETS = 2;
export const DELOAD_FACTOR = 0.6;

/** Sets to show for an exercise in the current mode. Deload overrides everything: 2 sets. */
export function setCount(ex, onBlock, deload = false) {
  if (deload) return DELOAD_SETS;
  if (onBlock && Number.isInteger(ex.onBlockSets) && ex.onBlockSets > 0) return ex.onBlockSets;
  return ex.sets;
}

/** Exercises visible for a session in the current mode, in programme order. Deload hides drop sets. */
export function visibleExercises(session, onBlock, deload = false) {
  return session.exercises.filter(ex => !(onBlock && ex.onBlockSkip) && !(deload && ex.type === "dropset"));
}

/** A session is unavailable when on-block and flagged off-block only. */
export function sessionAvailable(session, onBlock) {
  return !(onBlock && session.offBlockOnly);
}

/**
 * Groups visible exercises into render blocks. Two adjacent exercises that name each other
 * (or the first names the second) in supersetWith become one superset group. A superset whose
 * partner is hidden (e.g. on-block skip) renders as a single exercise.
 */
export function groupExercises(exercises) {
  const out = [];
  for (let i = 0; i < exercises.length; i++) {
    const a = exercises[i], b = exercises[i + 1];
    if (b && a.supersetWith && (a.supersetWith === b.id || b.supersetWith === a.id)) {
      out.push({ superset: true, items: [a, b] });
      i++;
    } else out.push({ superset: false, items: [a] });
  }
  return out;
}

export const drops = ex => (ex.type === "dropset" ? ex.drops || 3 : 1);

/** Unique id for a set record, so every save is an idempotent upsert. */
export const setKey = (sessionLogId, exerciseId, setNumber, drop = 0) => `${sessionLogId}|${exerciseId}|${setNumber}|${drop}`;

/** Parses a weight entry ("60", "57.5", "57,5"). Returns null for blank / invalid. */
export function parseWeight(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 1000) return null;
  return Math.round(n * 100) / 100;
}

export function parseIntOrNull(v, max = 1000) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n);
}

export const hasData = s => s && (s.weight != null || s.reps != null);

export const fmtKg = w => (w == null ? "BW" : `${+(+w).toFixed(2)}kg`);

/** "Last" summary, set by set. sets = set logs for one exercise from one session. */
export function formatLast(ex, sets) {
  const rows = [...sets].filter(hasData).sort((a, b) => a.setNumber - b.setNumber || (a.drop || 0) - (b.drop || 0));
  if (!rows.length) return "";
  if (ex.type === "dropset") {
    const bySet = new Map();
    for (const r of rows) { if (!bySet.has(r.setNumber)) bySet.set(r.setNumber, []); bySet.get(r.setNumber).push(r); }
    return [...bySet.values()].map(rs => rs.map(r => `${fmtKg(r.weight)} x${r.reps ?? "–"}`).join(" → ")).join(" | ");
  }
  if (ex.type === "timed") return rows.map(r => `${r.weight ? `+${fmtKg(r.weight)} ` : ""}${r.reps ?? "–"}s`).join(", ");
  return rows.map(r => `${fmtKg(r.weight)} x${r.reps ?? "–"}${r.rir != null ? ` @${r.rir}` : ""}`).join(", ");
}

export function daysAgo(iso, now = Date.now()) {
  const d = new Date(iso); const n = new Date(now);
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((b - a) / DAY);
}

export function agoText(iso, now = Date.now()) {
  const n = daysAgo(iso, now);
  return n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
}

export function fmtDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = x => String(x).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/** Target text, e.g. "4 x 8–10 · RIR 1-2", "3 rounds x 3 drops", "2 x 30–45 sec". */
export function targetText(ex, onBlock, deload = false) {
  const n = setCount(ex, onBlock, deload);
  if (ex.type === "dropset") return `${n} rounds x ${drops(ex)} drops`;
  const range = ex.repMin == null ? "" : ex.repMax != null && ex.repMax !== ex.repMin ? `${ex.repMin}–${ex.repMax}` : `${ex.repMin}`;
  const unit = ex.type === "timed" ? " sec" : ex.perSide ? " per side" : "";
  return `${n} x ${range}${unit}${ex.rir ? ` · RIR ${ex.rir}` : ""}`;
}

/**
 * Most recent previous logged sets for an exercise, across all sessions (shared exercises such as
 * Face Pull carry their history between days). sessionLogs newest-first is not required.
 * Returns { log, sets } or null.
 */
export function lastFor(exerciseId, sessionLogs, setLogs, excludeLogId) {
  const byLog = new Map();
  for (const s of setLogs) {
    if (s.exerciseId !== exerciseId || s.sessionLogId === excludeLogId || !hasData(s)) continue;
    if (!byLog.has(s.sessionLogId)) byLog.set(s.sessionLogId, []);
    byLog.get(s.sessionLogId).push(s);
  }
  let best = null;
  for (const log of sessionLogs) {
    if (!byLog.has(log.id) || log.id === excludeLogId) continue;
    if (!best || log.date > best.date) best = log;
  }
  return best ? { log: best, sets: byLog.get(best.id) } : null;
}

/** Most recent date a session type was performed (any log with at least one set entered). */
export function lastPerformed(sessionId, sessionLogs, setLogs, excludeLogId) {
  const withData = new Set(setLogs.filter(hasData).map(s => s.sessionLogId));
  let best = null;
  for (const l of sessionLogs) if (l.sessionId === sessionId && l.id !== excludeLogId && (l.completed || withData.has(l.id)) && (!best || l.date > best)) best = l.date;
  return best;
}

/** Validates programme.json. Returns an array of problems (empty = OK). */
export function validateProgramme(p) {
  const errs = [];
  if (!p || typeof p !== "object") return ["programme is not an object"];
  if (!Array.isArray(p.sessions) || !p.sessions.length) return ["programme.sessions must be a non-empty array"];
  const sids = new Set();
  for (const s of p.sessions) {
    if (!s.id || !s.name) errs.push("every session needs an id and name");
    if (sids.has(s.id)) errs.push(`duplicate session id "${s.id}"`);
    sids.add(s.id);
    if (!Array.isArray(s.exercises)) { errs.push(`session "${s.id}" has no exercises array`); continue; }
    const eids = new Set();
    for (const e of s.exercises) {
      if (!e.id || !e.name) errs.push(`session "${s.id}": every exercise needs an id and name`);
      if (eids.has(e.id)) errs.push(`session "${s.id}": duplicate exercise id "${e.id}"`);
      eids.add(e.id);
      if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 20) errs.push(`"${e.id}": sets must be a whole number 1–20`);
      if (!["standard", "dropset", "superset", "timed"].includes(e.type || "standard")) errs.push(`"${e.id}": unknown type "${e.type}"`);
      if (e.alternatives != null && (!Array.isArray(e.alternatives) || e.alternatives.some(x => !(typeof x === "string" ? x.trim() : x && x.name))))
        errs.push(`"${e.id}": alternatives must be a list of names or { "id", "name" } objects`);
    }
  }
  return errs;
}

/** Validates an export file before import. Returns an array of problems (empty = OK). */
export function validateBackup(b) {
  if (!b || typeof b !== "object") return ["not a JSON object"];
  if (b.app !== "workout-tracker") return ["this file is not a Workout Tracker export"];
  if (!Array.isArray(b.sessionLogs) || !Array.isArray(b.setLogs)) return ["missing sessionLogs / setLogs"];
  const errs = [];
  const ids = new Set();
  for (const l of b.sessionLogs) {
    if (typeof l.id !== "number" || !l.sessionId || !l.date) { errs.push("a session log is missing id / sessionId / date"); break; }
    ids.add(l.id);
  }
  for (const s of b.setLogs) {
    if (typeof s.id !== "string" || !ids.has(s.sessionLogId) || !s.exerciseId || typeof s.setNumber !== "number") { errs.push("a set log is malformed or points to a missing session"); break; }
  }
  return errs;
}

// ---------------------------------------------------------------- Phase 2

export const slug = s => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Alternatives for a programme slot as full exercise definitions. Each inherits the slot's
 * sets / reps / RIR / type / rest / increment and logs under its own id.
 * programme.json may list alternatives as names ("Pendulum Squat") or objects ({ id, name, notes, ... }).
 */
export function alternativesOf(slot) {
  return (slot.alternatives || []).map(a => {
    const o = typeof a === "string" ? { name: a } : a;
    const { alternatives, ...base } = slot;
    return { ...base, notes: "", ...o, id: o.id || slug(o.name), subFor: slot.id };
  });
}

/** Map of every exercise id (programme exercises and their alternatives) to its definition. */
export function exerciseIndex(programme) {
  const m = new Map();
  for (const s of programme.sessions) for (const e of s.exercises) {
    if (!m.has(e.id)) m.set(e.id, { ...e, region: e.region || (s.id === "legs" ? "lower" : "upper") });
    for (const a of alternativesOf(e)) if (!m.has(a.id)) m.set(a.id, { ...a, region: a.region || (s.id === "legs" ? "lower" : "upper") });
  }
  return m;
}

/** Default load jump for a successful progression: 5 kg lower body, 2.5 kg upper body. */
export const defaultIncrement = ex => (typeof ex.increment === "number" ? ex.increment : ex.region === "lower" ? 5 : 2.5);

const round2 = n => Math.round(n * 100) / 100;
const roundHalf = n => Math.round(n * 2) / 2;

/** Logged working sets (drop 0) with data, in set order. */
const working = sets => sets.filter(s => hasData(s) && !s.drop).sort((a, b) => a.setNumber - b.setNumber);

/**
 * Double progression. base = { log, sets } from the last NON-deload session with data for this exercise.
 * Ready when every programmed working set of that session was logged at or above the top of the rep range.
 * Returns null when no suggestion applies (no history, drop sets, timed holds).
 *   { ready, perSet: [{ weight, reps }], text }
 */
export function progression(ex, base, { increment, deload = false, sets: nSets } = {}) {
  if (!base || ex.type === "dropset" || ex.type === "timed") return null;
  const w = working(base.sets);
  if (!w.length) return null;
  const top = ex.repMax ?? ex.repMin;
  const needed = setCount(ex, !!base.log.onBlock, false);
  const ready = !deload && top != null && w.length >= needed && w.every(s => s.reps != null && s.reps >= top);
  const inc = increment ?? defaultIncrement(ex);
  const n = nSets ?? w.length;
  const perSet = [];
  for (let i = 0; i < n; i++) {
    const b = w[Math.min(i, w.length - 1)];
    let weight = b.weight;
    if (weight != null) weight = deload ? roundHalf(weight * DELOAD_FACTOR) : ready ? round2(weight + inc) : weight;
    perSet.push({ weight, reps: deload ? b.reps : ready ? ex.repMin ?? b.reps : b.reps });
  }
  const topW = w[0].weight;
  const text = deload
    ? `Deload: ${fmtKg(perSet[0].weight)} (60% of ${fmtKg(topW)})`
    : ready
      ? `Go up: ${fmtKg(perSet[0].weight)} (+${inc}kg), aim for ${ex.repMin ?? top}+ reps`
      : `Same weight ${fmtKg(topW)} – beat last time's reps${top != null ? ` (target ${top})` : ""}`;
  return { ready, perSet, text };
}

/** Which rest default applies to an exercise in a session. */
export function restKind(ex, { slotIndex = 99, firstInSuperset = false } = {}) {
  if (ex.type === "dropset") return "dropset";
  if (firstInSuperset) return "superset";
  if (slotIndex < 2) return "compound";
  return "standard";
}
export const REST_DEFAULTS = { standard: 90, superset: 45, dropset: 15, compound: 120 };

/** Exercises in the visible list with nothing logged (by the id actually used in the slot). */
export function unloggedSlots(slots, sets, logId) {
  const logged = new Set(sets.filter(s => s.sessionLogId === logId && hasData(s)).map(s => s.exerciseId));
  return slots.filter(e => !logged.has(e.id));
}

/** History search: matches session name, notes and tags (case-insensitive). */
export function matchesSearch(log, q, sessionName = "") {
  if (!q) return true;
  const hay = [sessionName, log.notes || "", ...(log.tags || []), log.deload ? "deload" : "", log.partial ? "partial" : ""].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}
