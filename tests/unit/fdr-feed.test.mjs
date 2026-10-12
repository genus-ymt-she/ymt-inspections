import test from "node:test";
import assert from "node:assert/strict";
import { parseFdr, mergeFdr } from "../../tools/fdr-feed.mjs";

// Trimmed from a real IDW15100 issue (12 Oct 2026, 04:35 WST)
const XML = `<?xml version="1.0" encoding="UTF-8"?><product><amoc><identifier>IDW15100</identifier>
<issue-time-local tz="WST">2026-10-12T04:35:00+08:00</issue-time-local><next-routine-issue-time-local tz="WST">2026-10-12T16:10:00+08:00</next-routine-issue-time-local></amoc><forecast>
<area aac="WA_FA001" description="Western Australia" type="region"><forecast-period start-time-local="2026-10-12T05:00:00+08:00"><text type="forecast">x</text></forecast-period></area>
<area aac="WA_FW056" description="Watheroo" type="fire-district" parent-aac="WA_FA001">
 <forecast-period index="0" start-time-local="2026-10-12T05:17:00+08:00" end-time-local="2026-10-13T00:00:00+08:00"><element type="fire_behaviour_index">14</element><text type="fire_danger">Moderate</text></forecast-period>
 <forecast-period index="1" start-time-local="2026-10-13T00:00:00+08:00" end-time-local="2026-10-14T00:00:00+08:00"><element type="fire_behaviour_index">15</element><text type="fire_danger">High</text></forecast-period>
</area>
<area aac="WA_FW055" description="Lesueur" type="fire-district" parent-aac="WA_FA001">
 <forecast-period index="0" start-time-local="2026-10-12T05:17:00+08:00"><text type="fire_danger">No Rating</text></forecast-period>
</area></forecast></product>`;

test("fire-district ratings are read with their dates", () => {
  const f = parseFdr(XML);
  assert.equal(f.issued, "2026-10-12T04:35:00+08:00"); assert.equal(f.next, "2026-10-12T16:10:00+08:00");
  assert.deepEqual(Object.keys(f.districts), ["Watheroo", "Lesueur"]);
  assert.deepEqual(f.districts.Watheroo, [{ date: "2026-10-12", rating: "Moderate", fbi: 14 }, { date: "2026-10-13", rating: "High", fbi: 15 }]);
  assert.deepEqual(f.districts.Lesueur, [{ date: "2026-10-12", rating: "No Rating" }]);
});

test("afternoon issue keeps today's rating from the morning issue", () => {
  const morning = { issued: "2026-10-12T04:35:00+08:00", districts: { Lesueur: [{ date: "2026-10-12", rating: "High" }, { date: "2026-10-13", rating: "Moderate" }] } };
  const older = { issued: "2026-10-10T16:10:00+08:00", districts: { Lesueur: [{ date: "2026-10-10", rating: "Extreme" }] } };
  const pm = { issued: "2026-10-12T16:10:00+08:00", districts: { Lesueur: [{ date: "2026-10-13", rating: "Extreme" }, { date: "2026-10-14", rating: "Moderate" }] } };
  const m = mergeFdr(pm, [older, morning], "2026-10-12");
  assert.equal(m.issued, pm.issued);
  assert.deepEqual(m.districts.Lesueur.map(d => [d.date, d.rating]), [["2026-10-12", "High"], ["2026-10-13", "Extreme"], ["2026-10-14", "Moderate"]]);
  assert.equal(m.districts.Lesueur[0].issued, morning.issued);   // today's entry remembers which issue it came from
});
