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

if (process.argv[2]) {
  const out = parseFdr(fs.readFileSync(process.argv[2], "utf8"));
  if (!Object.keys(out.districts).length) { console.error("No fire-district ratings found"); process.exit(1); }
  process.stdout.write(JSON.stringify(out, null, 1) + "\n");
}
