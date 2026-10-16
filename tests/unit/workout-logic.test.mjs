// Workout Tracker (workout/) – a separate app from PARRON; these test its pure logic only.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as L from "../../workout/js/logic.js";

const prog = JSON.parse(fs.readFileSync(new URL("../../workout/programme.json", import.meta.url)));
const sess = id => prog.sessions.find(s => s.id === id);

test("seed programme.json is valid and has the five sessions", () => {
  assert.deepEqual(L.validateProgramme(prog), []);
  assert.deepEqual(prog.sessions.map(s => s.id), ["chest", "back", "legs", "shoulders", "arms"]);
  assert.equal(sess("legs").offBlockOnly, true);
});

test("on-block hides skipped exercises and uses onBlockSets", () => {
  const chest = sess("chest");
  assert.equal(L.visibleExercises(chest, false).length, 8);
  const on = L.visibleExercises(chest, true);
  assert.equal(on.length, 7);
  assert.ok(!on.some(e => e.id === "machine-chest-press-drop"));
  assert.equal(L.setCount(chest.exercises[0], false), 4);
  assert.equal(L.setCount(chest.exercises[0], true), 3);
  assert.equal(L.setCount(chest.exercises.find(e => e.id === "pec-deck"), true), 2);
  assert.equal(L.sessionAvailable(sess("legs"), true), false);
  assert.equal(L.sessionAvailable(sess("legs"), false), true);
});

test("supersets group; a superset whose partner is hidden renders alone", () => {
  const g = L.groupExercises(L.visibleExercises(sess("arms"), false));
  const ss = g.filter(x => x.superset).map(x => x.items.map(e => e.label).join("+"));
  assert.deepEqual(ss, ["C1+C2", "D1+D2"]);
  const gOn = L.groupExercises(L.visibleExercises(sess("arms"), true));
  assert.deepEqual(gOn.filter(x => x.superset).map(x => x.items.map(e => e.label).join("+")), ["C1+C2"]);
  assert.ok(gOn.some(x => !x.superset && x.items[0].label === "D2"));
});

test("parsing", () => {
  assert.equal(L.parseWeight("57.5"), 57.5);
  assert.equal(L.parseWeight("57,5"), 57.5);
  assert.equal(L.parseWeight(""), null);
  assert.equal(L.parseWeight("abc"), null);
  assert.equal(L.parseIntOrNull("10"), 10);
  assert.equal(L.parseIntOrNull("11", 10), null);
});

test("last-time lookup picks the most recent prior log for that exercise, across sessions", () => {
  const logs = [{ id: 1, sessionId: "chest", date: "2026-10-01T08:00:00Z" }, { id: 2, sessionId: "arms", date: "2026-10-05T08:00:00Z" }, { id: 3, sessionId: "chest", date: "2026-10-15T08:00:00Z" }];
  const s = (log, ex, n, w, r) => ({ id: L.setKey(log, ex, n), sessionLogId: log, exerciseId: ex, setNumber: n, drop: 0, weight: w, reps: r, rir: 1 });
  const sets = [s(1, "face-pull-er", 1, 20, 15), s(2, "face-pull-er", 1, 22.5, 16), s(2, "face-pull-er", 2, 22.5, 15), s(3, "face-pull-er", 1, 25, 12)];
  const last = L.lastFor("face-pull-er", logs.filter(l => l.id !== 3), sets, 3);
  assert.equal(last.log.id, 2);
  assert.equal(L.formatLast({ type: "standard" }, last.sets), "22.5kg x16 @1, 22.5kg x15 @1");
  assert.equal(L.lastPerformed("chest", logs, sets, 3), "2026-10-01T08:00:00Z");
});

test("format drop sets and timed holds", () => {
  const d = [{ setNumber: 1, drop: 0, weight: 40, reps: 12 }, { setNumber: 1, drop: 1, weight: 30, reps: 10 }, { setNumber: 2, drop: 0, weight: 40, reps: 10 }];
  assert.equal(L.formatLast({ type: "dropset" }, d), "40kg x12 → 30kg x10 | 40kg x10");
  assert.equal(L.formatLast({ type: "timed" }, [{ setNumber: 1, weight: null, reps: 40 }]), "40s");
  assert.equal(L.targetText(sess("back").exercises.find(e => e.type === "timed"), false), "2 x 30–45 sec");
  assert.equal(L.targetText(sess("chest").exercises[0], true), "3 x 8–10 · RIR 1-2");
});

test("backup validation", () => {
  assert.deepEqual(L.validateBackup({ app: "workout-tracker", sessionLogs: [{ id: 1, sessionId: "chest", date: "x" }], setLogs: [{ id: "1|a|1|0", sessionLogId: 1, exerciseId: "a", setNumber: 1 }] }), []);
  assert.ok(L.validateBackup({ app: "other" }).length);
  assert.ok(L.validateBackup({ app: "workout-tracker", sessionLogs: [], setLogs: [{ id: "x", sessionLogId: 9, exerciseId: "a", setNumber: 1 }] }).length);
});

// ---------------------------------------------------------------- Phase 2
const IDX = L.exerciseIndex(prog);
const ex = id => IDX.get(id);
const mk = (log, exId, rows) => rows.map(([w, r], i) => ({ id: L.setKey(log, exId, i + 1), sessionLogId: log, exerciseId: exId, setNumber: i + 1, drop: 0, weight: w, reps: r, rir: 1 }));

test("double progression: top of range on all sets → +2.5kg upper / +5kg lower", () => {
  const smith = ex("incline-smith"); // 4 x 8-10, upper
  const up = L.progression(smith, { log: { onBlock: false }, sets: mk(1, smith.id, [[60, 10], [60, 10], [60, 10], [57.5, 10]]) }, { sets: 4 });
  assert.equal(up.ready, true);
  assert.deepEqual(up.perSet.map(p => p.weight), [62.5, 62.5, 62.5, 60]);
  assert.equal(up.perSet[0].reps, 8);
  const legPress = ex("leg-press-high"); // lower
  assert.equal(legPress.region, "lower");
  const lp = L.progression(legPress, { log: {}, sets: mk(1, legPress.id, [[200, 12], [200, 12], [200, 12], [200, 12]]) }, { sets: 4 });
  assert.equal(lp.perSet[0].weight, 205);
});

test("double progression: any set short of the top → same weight, not ready", () => {
  const smith = ex("incline-smith");
  const p = L.progression(smith, { log: {}, sets: mk(1, smith.id, [[60, 10], [60, 10], [60, 9], [57.5, 8]]) }, { sets: 4 });
  assert.equal(p.ready, false);
  assert.deepEqual(p.perSet.map(x => x.weight), [60, 60, 60, 57.5]);
  assert.match(p.text, /beat last time/);
});

test("progression needs every programmed set logged; on-block counts its own set number", () => {
  const smith = ex("incline-smith");
  const two = mk(1, smith.id, [[60, 10], [60, 10]]);
  assert.equal(L.progression(smith, { log: { onBlock: false }, sets: two }, {}).ready, false);
  const three = mk(1, smith.id, [[60, 10], [60, 10], [60, 10]]);
  assert.equal(L.progression(smith, { log: { onBlock: true }, sets: three }, {}).ready, true);
});

test("custom increment and deload 60%", () => {
  const smith = ex("incline-smith");
  const base = { log: {}, sets: mk(1, smith.id, [[60, 10], [60, 10], [60, 10], [60, 10]]) };
  assert.equal(L.progression(smith, base, { increment: 5 }).perSet[0].weight, 65);
  const d = L.progression(smith, base, { deload: true, sets: 2 });
  assert.equal(d.ready, false);
  assert.deepEqual(d.perSet.map(x => x.weight), [36, 36]);
  assert.equal(L.progression(smith, { log: {}, sets: mk(1, smith.id, [[57.5, 10]]) }, { deload: true }).perSet[0].weight, 34.5);
});

test("deload: 2 sets, drop sets hidden", () => {
  const chest = sess("chest");
  const v = L.visibleExercises(chest, false, true);
  assert.ok(!v.some(e => e.type === "dropset"));
  assert.equal(L.setCount(chest.exercises[0], false, true), 2);
  assert.equal(L.setCount(chest.exercises[0], true, true), 2);
});

test("rest kinds", () => {
  assert.equal(L.restKind(ex("incline-smith"), { slotIndex: 0 }), "compound");
  assert.equal(L.restKind(ex("incline-db-fly"), { slotIndex: 2, firstInSuperset: true }), "superset");
  assert.equal(L.restKind(ex("cable-crossover-lth"), { slotIndex: 3 }), "standard");
  assert.equal(L.restKind(ex("machine-chest-press-drop"), { slotIndex: 4 }), "dropset");
});

test("alternatives inherit the slot and log under their own id", () => {
  const alts = L.alternativesOf(ex("hack-pendulum-squat"));
  assert.deepEqual(alts.map(a => a.id), ["pendulum-squat", "leg-press-narrow"]);
  assert.equal(alts[0].sets, 3); assert.equal(alts[0].subFor, "hack-pendulum-squat");
  assert.equal(ex("pendulum-squat").region, "lower");
  assert.equal(ex("incline-machine-press").name, "Incline Machine Press");
  assert.equal(L.alternativesOf({ id: "x", sets: 3, alternatives: ["Seal Row"] })[0].id, "seal-row");
});

test("unlogged slots and history search", () => {
  const slots = [ex("incline-smith"), ex("pec-deck")];
  const sets = mk(5, "incline-smith", [[60, 10]]);
  assert.deepEqual(L.unloggedSlots(slots, sets, 5).map(e => e.id), ["pec-deck"]);
  const log = { notes: "felt flat", tags: ["Right shoulder"], deload: true };
  assert.ok(L.matchesSearch(log, "shoulder"));
  assert.ok(L.matchesSearch(log, "deload flat"));
  assert.ok(!L.matchesSearch(log, "lower back"));
});
