"use strict";
/* ============================================================================
   PARRON – project configuration. Everything a SHE Manager may need to change
   for this project lives in this file (no other code needs editing).
   ========================================================================== */
const CONFIG = {
  recipient: "darren.frizzell@genus.com.au",          // <-- report recipient (set once before hosting)
  project: "J1084 – Parron Wind Farm Connection Assets – Yerramullah Terminal (YMT)",
  projectShort: "YMT – Yerramullah Terminal",
  jobNo: "J1084",
  docPrefix: "J1084-HSE-FRM-YMT-TBA", rev: "0", appVersion: "2.0"
};

/* Safety Non-Negotiables (Genus) */
const SNN = {"FND": "Foundations", "FFW": "Fitness for Work", "VD": "Vehicles & Driving", "EI": "Energy & Isolation", "UU": "Underground Utilities", "WAH": "Working at Height", "TMP": "Live Traffic & Mobile Plant", "HL": "Hoisting & Lifting", "CS": "Confined Spaces"};
const snnBadge=(c,pre)=>`<span class="snn" title="Safety Non-Negotiable"><img src="${SNN_ICONS[c]}" alt="">${pre?"SNN · ":""}${esc(SNN[c])}</span>`;

/* Risk matrix – 5 x 5, consequence x likelihood.
   Align the labels, bands and response times with the project HSE Management Plan risk matrix. */
const RISK = {
  consequence: [
    [1, "Insignificant", "No injury or first aid only; negligible environmental impact"],
    [2, "Minor", "Medical treatment injury; minor, contained environmental impact"],
    [3, "Moderate", "Lost time / restricted duties injury; reportable environmental incident"],
    [4, "Major", "Serious injury or permanent impairment; significant environmental harm"],
    [5, "Catastrophic", "Fatality or multiple serious injuries; severe, long-term environmental harm"]
  ],
  likelihood: [
    [1, "Rare", "May occur only in exceptional circumstances"],
    [2, "Unlikely", "Could occur at some time"],
    [3, "Possible", "Might occur at some time"],
    [4, "Likely", "Will probably occur in most circumstances"],
    [5, "Almost certain", "Expected to occur in most circumstances"]
  ],
  // score = consequence x likelihood; first band whose max >= score applies
  levels: [
    { key: "Low",      max: 4,  color: "#1E8E3E", days: 28, response: "Manage by routine procedures – close within 28 days" },
    { key: "Medium",   max: 9,  color: "#C98A00", days: 14, response: "Supervisor action required – close within 14 days" },
    { key: "High",     max: 14, color: "#E8660D", days: 7,  response: "Senior management attention – close within 7 days" },
    { key: "Extreme",  max: 25, color: "#C5221F", days: 1,  response: "Stop work – immediate action and escalation" }
  ]
};

/* MYOSH entry sheet – the order and labels the SHE Manager sees when keying a report into MYOSH.
   Change labels or order to match the MYOSH configuration on this project. */
const MYOSH_FIELDS = [
  ["Inspection type", "SHEQ Inspection"],
  ["Inspection title", r => r.title],
  ["Date of inspection", r => r.date],
  ["Time", r => r.time],
  ["Site / project", () => CONFIG.project],
  ["Location / work front", r => r.location],
  ["Inspected by", r => r.inspector],
  ["Contractor / crew", r => r.crew],
  ["Supervisor / person in charge", r => r.supervisor],
  ["Result summary", r => r.result],
  ["Description / comments", r => r.narrative],
  ["PARRON report ID", r => r.reportId]
];

/* Inspection library groups (template numbers). Anything not listed shows under "Other". */
const CATEGORIES = [
  { key: "site",   label: "Site & people",          nums: [1, 2, 3] },
  { key: "plan",   label: "Planning & permits",     nums: [4, 5, 6] },
  { key: "elec",   label: "Electrical",             nums: [7, 8] },
  { key: "height", label: "Heights & lifting",      nums: [9, 10, 11, 12] },
  { key: "plant",  label: "Plant & traffic",        nums: [13, 14, 21] },
  { key: "ground", label: "Ground & hot work",      nums: [15, 16] },
  { key: "env",    label: "Fire, chemicals & environment", nums: [17, 18, 19, 20, 22] },
  { key: "rec",    label: "Records",                nums: [23] }
];
