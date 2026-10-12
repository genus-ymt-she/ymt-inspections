// The app's scripts share one global scope (no build step), so two files declaring the same top-level name
// would silently break whichever loads first. This guards against it, and against shadowing key browser globals.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]).filter(f => !f.includes("/vendor/"));
const BROWSER = new Set("name status top parent self open close print alert confirm prompt history location navigator document event length origin find scroll stop focus blur fetch caches crypto performance screen external frames opener closed Image Audio Option Notification Request Response URL File Blob Event Map Set Date Math JSON Node Text Range Selection Storage localStorage sessionStorage indexedDB onload onerror".split(" "));

test("every app script is loaded once and listed in the offline cache", () => {
  assert.equal(new Set(files).size, files.length);
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  for (const f of files) assert.ok(sw.includes(`"./${f}"`), `${f} missing from sw.js FILES`);
  for (const f of fs.readdirSync(path.join(root, "js/app"))) assert.ok(files.includes(`js/app/${f}`), `js/app/${f} is not loaded by index.html`);
});

test("no two scripts declare the same top-level name, and none hide a browser global", () => {
  const seen = {};
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    for (const m of src.matchAll(/^(?:async\s+)?(?:function\s*\*?\s*([A-Za-z_$][\w$]*)|(?:const|let|var|class)\s+([A-Za-z_$][\w$]*))/gm)) {
      const n = m[1] || m[2]; (seen[n] = seen[n] || []).push(f);
    }
  }
  const dups = Object.entries(seen).filter(([, v]) => v.length > 1).map(([n, v]) => `${n}: ${v.join(", ")}`);
  assert.deepEqual(dups, [], "duplicate top-level names");
  const shadow = Object.keys(seen).filter(n => BROWSER.has(n));
  assert.deepEqual(shadow, [], "top-level names that hide browser globals");
});
