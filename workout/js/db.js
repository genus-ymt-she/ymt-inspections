// IndexedDB wrapper. Database is separate from any other app on this origin.
//   sessionLogs: { id (auto), sessionId, date (ISO start), onBlock, completed, notes, finishedAt, durationSec }
//   setLogs:     { id "logId|exerciseId|setNumber|drop", sessionLogId, exerciseId, setNumber, drop, weight, reps, rir, done }
//                (timed exercises store seconds in reps; drop is 0 except for drop sets 0..n-1)
//   settings:    { key, value }  – onBlock, activeLogId, programme (last good copy)

const NAME = "workout-tracker", VERSION = 1;
let dbp;

export function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("sessionLogs")) {
        const s = db.createObjectStore("sessionLogs", { keyPath: "id", autoIncrement: true });
        s.createIndex("sessionId", "sessionId"); s.createIndex("date", "date");
      }
      if (!db.objectStoreNames.contains("setLogs")) {
        const s = db.createObjectStore("setLogs", { keyPath: "id" });
        s.createIndex("sessionLogId", "sessionLogId"); s.createIndex("exerciseId", "exerciseId");
      }
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
    };
    r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); resolve(r.result); };
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("Database blocked – close other tabs of this app"));
  });
  return dbp;
}

const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error("aborted")); });
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

async function store(name, mode = "readonly") { return (await open()).transaction(name, mode).objectStore(name); }

export async function getAll(name) { return req((await store(name)).getAll()); }
export async function get(name, key) { return req((await store(name)).get(key)); }
export async function put(name, value) {
  const s = await store(name, "readwrite"); const k = await req(s.put(value)); await done(s.transaction); return k;
}
export async function del(name, key) { const s = await store(name, "readwrite"); s.delete(key); await done(s.transaction); }

export async function setsForLog(logId) {
  return req((await store("setLogs")).index("sessionLogId").getAll(logId));
}

export async function putMany(name, values) {
  const db = await open(); const tx = db.transaction(name, "readwrite"); const s = tx.objectStore(name);
  for (const v of values) s.put(v);
  await done(tx);
}

export async function deleteLog(logId) {
  const db = await open(); const tx = db.transaction(["sessionLogs", "setLogs"], "readwrite");
  tx.objectStore("sessionLogs").delete(logId);
  const idx = tx.objectStore("setLogs").index("sessionLogId");
  idx.openKeyCursor(IDBKeyRange.only(logId)).onsuccess = e => { const c = e.target.result; if (c) { tx.objectStore("setLogs").delete(c.primaryKey); c.continue(); } };
  await done(tx);
}

export async function getSetting(key, fallback) { const r = await get("settings", key); return r ? r.value : fallback; }
export async function setSetting(key, value) { return put("settings", { key, value }); }

export async function exportAll() {
  const [sessionLogs, setLogs, settings] = await Promise.all([getAll("sessionLogs"), getAll("setLogs"), getAll("settings")]);
  return { app: "workout-tracker", version: 1, exportedAt: new Date().toISOString(),
    sessionLogs, setLogs, settings: settings.filter(s => s.key !== "programme") };
}

/** Replaces all logged data in one transaction – all or nothing. Keeps the cached programme. */
export async function importAll(b) {
  const db = await open(); const tx = db.transaction(["sessionLogs", "setLogs", "settings"], "readwrite");
  tx.objectStore("sessionLogs").clear(); tx.objectStore("setLogs").clear();
  for (const l of b.sessionLogs) tx.objectStore("sessionLogs").put(l);
  for (const s of b.setLogs) tx.objectStore("setLogs").put(s);
  for (const s of b.settings || []) if (s && s.key && s.key !== "programme") tx.objectStore("settings").put(s);
  await done(tx);
}
