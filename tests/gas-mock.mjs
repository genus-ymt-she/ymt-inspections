// In-memory stand-ins for the Google Apps Script services the relay uses, so the real
// PARRON_Relay_Code.gs can be exercised by unit tests and the browser smoke test.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const TZ_OFFSET_H = 8; // Australia/Perth, no daylight saving

// Sheets stores typed values: a leading apostrophe forces text, numbers and ISO dates are converted.
function coerce(v) {
  if (v instanceof Date || typeof v === "number" || typeof v === "boolean") return v;
  if (v == null) return "";
  const s = String(v);
  if (s.startsWith("'")) return s.slice(1);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^\d{4}-\d\d-\d\d$/.test(s)) return new Date(s + "T00:00:00+08:00");
  return s;
}

class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.data[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? "" : v); } out.push(row); } return out; }
  getValue() { return this.getValues()[0][0]; }
  setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => this.sh.set(this.r + i, this.c + j, coerce(v)))); return this; }
  setValue(v) { this.sh.set(this.r, this.c, coerce(v)); return this; }
  getBackground() { return this.sh.bg || "#ffffff"; }
  setBackground(b) { this.sh.bg = String(b).toLowerCase(); return this; }
  setFontWeight() { return this; } setFontColor() { return this; }
}
class Sheet {
  constructor(name) { this.name = name; this.data = []; }
  set(r, c, v) { while (this.data.length < r) this.data.push([]); const row = this.data[r - 1]; while (row.length < c) row.push(""); row[c - 1] = v; }
  getName() { return this.name; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); }
  appendRow(row) { this.data.push(row.map(coerce)); return this; }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  setFrozenRows() { return this; }
}
class Spreadsheet {
  constructor(name) { this.name = name; this.sheets = [new Sheet("Sheet1")]; this.id = "ss1"; }
  getId() { return this.id; } getUrl() { return "https://docs.google.com/spreadsheets/d/ss1"; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
  getSheets() { return this.sheets; }
  deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
}

const pad = n => String(n).padStart(2, "0");
function formatDate(d, tz, fmt) {
  const t = new Date(new Date(d).getTime() + TZ_OFFSET_H * 3600e3);
  const Y = t.getUTCFullYear(), M = t.getUTCMonth(), D = t.getUTCDate(), h = t.getUTCHours(), m = t.getUTCMinutes();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return fmt.replace(/^u$/, String(t.getUTCDay() || 7)).replace("EEEE", days[t.getUTCDay()]).replace("EEE", days[t.getUTCDay()].slice(0, 3)).replace("MMMM", months[M]).replace("MMM", months[M].slice(0, 3)).replace("yyyy", Y).replace("MM", pad(M + 1)).replace("dd", pad(D)).replace(/\bd\b/, D).replace("HH", pad(h)).replace("mm", pad(m));
}

export function createRelay({ pin = "2468", fetch: fetchHandler = null } = {}) {
  const props = new Map(pin ? [["MANAGER_PIN", pin]] : []);
  const cache = new Map();
  const mail = [], files = [], triggers = [];
  let ss = null;
  const folders = new Map();
  const mkFolder = (name) => { const id = "f" + (folders.size + 1); const f = { id, name, subs: new Map(), getId: () => id,
    createFile: (blob) => { const url = `https://drive.google.com/file/d/${files.length + 1}`; files.push({ folder: name, name: blob.getName(), bytes: blob.getBytes().length, url, blob }); return { getUrl: () => url }; },
    getFoldersByName: (n) => { const s = f.subs.get(n); let used = false; return { hasNext: () => !!s && !used, next: () => { used = true; return s; } }; },
    createFolder: (n) => { const s = mkFolder(name + "/" + n); f.subs.set(n, s); return s; } }; folders.set(id, f); return f; };
  const ctx = {
    console, Date, JSON, Math,
    UrlFetchApp: { fetch: (url, opts) => { const r = fetchHandler ? fetchHandler(url, opts) : null; return { getResponseCode: () => r ? (r.code || 200) : 404, getContentText: () => r ? r.body : "" }; } },
    SpreadsheetApp: { create: (n) => (ss = new Spreadsheet(n)), openById: () => { if (!ss) throw new Error("missing"); return ss; } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.has(k) ? props.get(k) : null, setProperty: (k, v) => props.set(k, v) }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.has(k) ? cache.get(k) : null, put: (k, v) => cache.set(k, v), remove: k => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: (a, b, c) => mail.push(typeof a === "object" ? a : { to: a, subject: b, body: c }), getRemainingDailyQuota: () => 100 },
    DriveApp: { getFileById: id => { const f = files[+id - 1]; if (!f) throw new Error("no file"); return { getBlob: () => ({ getBytes: () => f.blob.getBytes(), getContentType: () => f.blob.type || "image/jpeg" }), getSize: () => f.bytes }; }, createFolder: mkFolder, getFolderById: id => { const f = folders.get(id); if (!f) throw new Error("no folder"); return f; } },
    ScriptApp: { WeekDay: { MONDAY: 'MONDAY' }, getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: (fn) => { const t = { fn, timeBased: () => t, atHour: () => t, everyDays: () => t, onWeekDay: () => t, inTimezone: () => t, create: () => (triggers.push(fn), t) }; return t; } },
    Utilities: { formatDate, base64Decode: s => Buffer.from(s, "base64"), base64Encode: b => Buffer.from(b).toString("base64"), newBlob: (bytes, type, name) => ({ getBytes: () => bytes, getName: () => name, type }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: s => ({ content: s, setMimeType() { return this; } }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(here, "..", "PARRON_Relay_Code.gs"), "utf8"), ctx);
  const post = (obj) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).content);
  const get = (params) => JSON.parse(ctx.doGet({ parameter: params }).content);
  return { ctx, post, get, mail, files, triggers, props, cache, sheet: n => ss && ss.getSheetByName(n), key: "prn-ymt-7Qk2vX9m" };
}
