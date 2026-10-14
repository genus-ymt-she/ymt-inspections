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
  docPrefix: "J1084-HSE-FRM-YMT-TBA", rev: "0", appVersion: "3.14"
};

/* Site location for the home-screen weather (forecast for this point) and the Bureau of Meteorology
   fire weather district used for the Fire Danger Rating. The site is at Hill River (Shire of Dandaragan): the coastal part
   of the Shire is in the Lesueur district and the inland part in Watheroo – the boundary runs roughly along the Brand Highway
   near Badgingarra (DFES fire weather districts; BoM district boundaries IDM00007). */
const SITE = { name: "Badgingarra", lat: -30.39, lon: 115.50, fdrDistrict: "Lesueur" };
/* Official Fire Danger Ratings for every WA district, refreshed every 30 min by .github/workflows/fdr.yml */
const FDR_FEED = "https://raw.githubusercontent.com/genus-ymt-she/ymt-inspections/fdr-data/fdr.json";

/* Safety Non-Negotiables (Genus) */
const SNN = {"FND": "Foundations", "FFW": "Fitness for Work", "VD": "Vehicles & Driving", "EI": "Energy & Isolation", "UU": "Underground Utilities", "WAH": "Working at Height", "TMP": "Live Traffic & Mobile Plant", "HL": "Hoisting & Lifting", "CS": "Confined Spaces"};
const snnBadge=(c,pre)=>`<span class="snn" title="Safety Non-Negotiable"><img src="${SNN_ICONS[c]}" alt="">${pre?"SNN · ":""}${esc(SNN[c])}</span>`;

/* Genus Risk Matrix (as printed on Genus JHAs). Consequence x likelihood gives a ranked cell 1–25.
   Close-out days are a project default used to suggest a due date – the Genus matrix sets the response, not a timeframe. */
const RISK = {
  consequence: [
    [1, "Minor", "First aid injury/illness. Localised environmental event, no impact to an area of low significance (recovery < 1 week)."],
    [2, "Moderate", "Medical treatment injury/illness. Low-level localised environmental impact (recovery 1 week – 6 months)."],
    [3, "Major", "Lost time injury/illness < 2 weeks. Significant surrounding-area environmental impact (recovery 6 months – 1 year)."],
    [4, "Severe", "Lost time injury/illness > 2 weeks and/or permanent impairment. Serious widespread environmental impact."],
    [5, "Catastrophic", "Fatality or multiple serious injuries/illnesses. Extensive permanent and irreversible environmental impact."]
  ],
  likelihood: [
    [1, "Rare", "Could occur in exceptional circumstances or once in 10 years."],
    [2, "Unlikely", "Not likely to occur in normal circumstances. More than annually but less than 10-yearly."],
    [3, "Possible", "May occur at some time. Could occur annually."],
    [4, "Likely", "Expected to occur at some time. Could occur monthly."],
    [5, "Almost certain", "Expected to occur regularly under normal circumstances. Could occur weekly."]
  ],
  // ranked cell for [likelihood][consequence 1..5]
  matrix: { 5: [6, 10, 16, 21, 25], 4: [4, 9, 15, 20, 24], 3: [3, 8, 14, 18, 23], 2: [2, 7, 12, 17, 22], 1: [1, 5, 11, 13, 19] },
  // first band whose max >= rank applies
  levels: [
    { key: "Low",      max: 5,  color: "#00A651", ink: "#FFFFFF", days: 28, response: "Routine management – control, monitor and review with normal risk management processes." },
    { key: "Medium",   max: 13, color: "#FFD200", ink: "#3A2E00", days: 14, response: "Active management – implement additional controls where risk can be further reduced; monitor that identified controls are implemented effectively." },
    { key: "High",     max: 19, color: "#F07D00", ink: "#FFFFFF", days: 7,  response: "Proactive management – investigate further risk reduction with the workers affected; apply higher-level controls (hierarchy of control); monitor and review." },
    { key: "Critical", max: 25, color: "#E00000", ink: "#FFFFFF", days: 0,  response: "Immediate action – stop the activity / task and implement controls that reduce the risk to at least High." }
  ]
};

/* Project team – people who use PARRON and can be assigned actions.
   Picking a name fills in their email, so they are emailed the action automatically. Add or remove people here.
   ta: true = Trade Assistant (shown as quick-pick names on the Trade Assistants forms; no email needed).
   site: true = site-based – ticked when a SHEQ Alert is sent to "Everyone on site". */
const TEAM = [
  { name: "Darren Frizzell",   role: "SHE Manager",                  email: "darren.frizzell@genus.com.au", site: true },
  { name: "Lee Allen",         role: "SHE Manager",                  email: "lee.allen@genus.com.au" },
  { name: "Nicola Rucci",      role: "Senior SHE Advisor",           email: "nicola.rucci@genus.com.au", site: true },
  { name: "Anphin Thomas",     role: "SHE Advisor",                  email: "anphin.thomas@genus.com.au", site: true },
  { name: "Steve Armitage",    role: "Project Director",             email: "" },
  { name: "Gary Armitage",     role: "Construction Manager",         email: "gary.armitage@genus.com.au", site: true },
  { name: "Saeed Heidari",     role: "Project Quality Manager",      email: "saeed.heidari@genus.com.au", site: true },
  { name: "Vinal Khambhayta",  role: "Senior Project Engineer",      email: "vinal.khambhayta@genus.com.au", site: true },
  { name: "Dayou Ding",        role: "Project Engineer (Civil)",     email: "dayou.ding@genus.com.au", site: true },
  { name: "Joey Ryan",         role: "Grad Project Manager",         email: "joey.ryan@genus.com.au", site: true },
  { name: "Matthew Smith",     role: "Senior Civil Supervisor",      email: "matt.smith@genus.com.au", site: true },
  { name: "Paul Delaney",      role: "Civil Supervisor",             email: "paul.delaney@genus.com.au", site: true },
  { name: "Corey Shotter",     role: "Senior Electrical Supervisor", email: "corey.shotter@genus.com.au", site: true },
  { name: "Zane Patten",       role: "Electrical Supervisor",        email: "zane.patten@genus.com.au", site: true },
  { name: "Steven Pugh",       role: "Supervisor (Electrical)",      email: "steven.pugh@genus.com.au", site: true },
  { name: "Amie Smith",        role: "Project Admin",                email: "amie.smith@genus.com.au", site: true },
  { name: "Sarah Donnolley",   role: "Site Support Attendant",       email: "sarah.donnolley@genus.com.au", site: true },
  { name: "Jayden Mullan",     role: "Trade Assistant",              email: "", ta: true, site: true },
  { name: "Benjamin Herbert",  role: "Trade Assistant",              email: "", ta: true, site: true }
];

/* Quick report – positive observation categories */
const OBS_CATEGORIES = ["Above-standard practice", "Speaking up / stop work", "Effective controls in place", "Good housekeeping", "Environmental care", "Leadership / mentoring", "Innovation / improvement"];

/* Forms opened from their own tile on the home screen instead of the inspection list */
const HOME_TILE_FORMS = [24, 23, 22, 28, 50];   // 22 + 28 sit under the Trade Assistants tile; 50 Take 5 has its own tile (Inspect and Trade Assistants)

/* Inspection library groups (template numbers). Anything not listed shows under "Other". */
const CATEGORIES = [
  { key: "site",   label: "Site & people",          nums: [1, 2, 3] },
  { key: "plan",   label: "Planning & permits",     nums: [4, 5, 6] },
  { key: "elec",   label: "Electrical",             nums: [7, 8] },
  { key: "height", label: "Heights & lifting",      nums: [9, 10, 11, 12] },
  { key: "plant",  label: "Plant & traffic",        nums: [13, 14, 21, 26] },
  { key: "ground", label: "Ground & hot work",      nums: [15, 16] },
  { key: "env",    label: "Fire, chemicals & environment", nums: [17, 18, 19, 20, 25, 27] }
];

/* PARRON Radio playlist (shuffle). ids = official YouTube uploads, first choice first; the player falls back to the next id. */
const RADIO_SONGS = [
  { t: "The Safety Dance", a: "Men Without Hats", k: "Safety", ids: ["nM4okRvCg2g", "1p_BvaHsgGg"] },
  { t: "High Voltage", a: "AC/DC", k: "Electrical", ids: ["Nnjh-zp6pP4"] },
  { t: "Live Wire", a: "AC/DC", k: "Wire", ids: ["DbTG9YTbdc0"] },
  { t: "Electric Avenue (Live)", a: "Eddy Grant", k: "Electric", ids: ["YtU_u0RyGZU"] },
  { t: "Power and the Passion", a: "Midnight Oil", k: "Power", ids: ["6pKPNnk-JhE"] },
  { t: "The Power", a: "SNAP!", k: "Power", ids: ["nm6DO_7px1I"] },
  { t: "Shock the Monkey", a: "Peter Gabriel", k: "Shock", ids: ["CnVf1ZoCJSo"] },
  { t: "Danger! High Voltage", a: "Electric Six", k: "Electrical", ids: ["Jjd1mfhIVEk", "2a4gyJsY0mc"] },
  { t: "Electric Blue", a: "ICEHOUSE", k: "Electric", ids: ["zeV_POB16f8"] },
  { t: "Wichita Lineman", a: "Glen Campbell", k: "Lineman", ids: ["Q8P_xTBpAcY"] },
  { t: "Electric Feel", a: "MGMT", k: "Electric", ids: ["MmZexg8sxyk"] },
  { t: "The Power of Love", a: "Huey Lewis & the News", k: "Power", ids: ["wBl2QGAIx1s"] },
  { t: "Shock to the System", a: "Billy Idol", k: "Shock", ids: ["lx2fZU5USus"] },
  { t: "Electrical Storm", a: "U2", k: "Electrical", ids: ["F4gUkN4Ohho"] },
  { t: "She's Electric", a: "Oasis", k: "Electric", ids: ["h9JZWhjQDvc", "u-80T2Ve-c0"] },
  { t: "Live Wire", a: "Mötley Crüe", k: "Wire", ids: ["Ahq4blDfU5s"] },
  { t: "Together in Electric Dreams", a: "Philip Oakey & Giorgio Moroder", k: "Electric", ids: ["PE1lzqJCeJ0", "vVJYBPQyFTQ"] },
  { t: "Electricity", a: "Orchestral Manoeuvres in the Dark", k: "Electricity", ids: ["Y43XLVqjytQ", "XXNF4KoVyoU"] },
  { t: "Wire to Wire", a: "Razorlight", k: "Wire", ids: ["MwRNvpGydzw"] },
  { t: "The Shock of the Lightning", a: "Oasis", k: "Shock", ids: ["87IQhui_Yy8"] },
  { t: "Electric Love", a: "BØRNS", k: "Electric", ids: ["RYr96YYEaZY"] },
  { t: "Electric Boogie", a: "Marcia Griffiths", k: "Electric", ids: ["1vF84LABHm0"] },
  { t: "Bird on the Wire", a: "Leonard Cohen", k: "Wire", ids: ["BqGArXHDOKY"] },
  { t: "Shot in the Dark", a: "AC/DC", k: "Power Up", ids: ["54LEywabkl4", "xNhn1KOqq8g"] },
  { t: "Wichita Lineman", a: "Johnny Cash", k: "Lineman", ids: ["kEM1ri_W4F8"] },
  { t: "Telegraph Road", a: "Dire Straits", k: "Wire", ids: ["d8bWGGA-5HM"] }
];
