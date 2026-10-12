/* Builds fdr.json – the official Fire Danger Rating for every WA fire weather district – from the
   Bureau of Meteorology's public fire-district forecast (IDW15100, anonymous FTP feed).
   Run by .github/workflows/fdr.yml every 30 minutes; the app reads the result from the fdr-data branch.
   Usage: node tools/fdr-feed.mjs IDW15100.xml > fdr.json */
import fs from "node:fs";

export function parseFdr(xml) {
  const tag = (re) => (xml.match(re) || [])[1] || "";
  const districts = {};
  const re = /<area\b([^>]*)>([\s\S]*?)<\/area>/g; let m;
  while ((m = re.exec(xml))) {
    if (!/type="fire-district"/.test(m[1])) continue;
    const name = (m[1].match(/description="([^"]+)"/) || [])[1]; if (!name) continue;
    const days = [];
    for (const fp of m[2].match(/<forecast-period\b[\s\S]*?<\/forecast-period>/g) || []) {
      const date = (fp.match(/start-time-local="(\d{4}-\d{2}-\d{2})/) || [])[1];
      const rating = ((fp.match(/<text type="fire_danger">([^<]+)<\/text>/) || [])[1] || "").trim();
      const fbi = (fp.match(/<element type="fire_behaviour_index">([^<]+)<\/element>/) || [])[1];
      if (date && rating) days.push(fbi != null ? { date, rating, fbi: +fbi } : { date, rating });
    }
    if (days.length) districts[name] = days;
  }
  return {
    source: "Bureau of Meteorology", product: tag(/<identifier>([^<]+)</) || "IDW15100",
    issued: tag(/<issue-time-local[^>]*>([^<]+)</), next: tag(/<next-routine-issue-time-local[^>]*>([^<]+)</),
    districts
  };
}

/* The afternoon issue starts from tomorrow, so today's rating would vanish at about 4 pm. Earlier issues are
   merged in (oldest first, newest wins for any date) and kept from yesterday onwards (Perth time). */
export function mergeFdr(latest, previous, today) {
  const keepFrom = new Date(Date.parse(today + "T00:00:00Z") - 864e5).toISOString().slice(0, 10);
  const byD = {};
  for (const f of [...previous, latest]) for (const [name, days] of Object.entries((f && f.districts) || {})) {
    const m = byD[name] = byD[name] || {};
    for (const d of days) if (d && d.date >= keepFrom) m[d.date] = { ...d, issued: f.issued || "" };
  }
  const districts = {};
  for (const [name, m] of Object.entries(byD)) districts[name] = Object.keys(m).sort().map(k => m[k]);
  return { ...latest, districts };
}
const perthToday = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

if (process.argv[2]) {
  const latest = parseFdr(fs.readFileSync(process.argv[2], "utf8"));
  if (!Object.keys(latest.districts).length) { console.error("No fire-district ratings found"); process.exit(1); }
  const previous = process.argv.slice(3).map(f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return null; } }).filter(Boolean);
  process.stdout.write(JSON.stringify(mergeFdr(latest, previous, perthToday()), null, 1) + "\n");
}
