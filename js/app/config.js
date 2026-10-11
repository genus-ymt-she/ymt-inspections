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
  docPrefix: "J1084-HSE-FRM-YMT-TBA", rev: "0", appVersion: "2.6"
};

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
   Picking a name fills in their email, so they are emailed the action automatically. Add or remove people here. */
const TEAM = [
  { name: "Darren Frizzell",  role: "SHE Manager",                  email: "darren.frizzell@genus.com.au" },
  { name: "Lee Allen",        role: "SHE Manager",                  email: "lee.allen@genus.com.au" },
  { name: "Nicola Rucci",     role: "Senior SHE Advisor",           email: "nicola.rucci@genus.com.au" },
  { name: "Anphin Thomas",    role: "SHE Advisor",                  email: "anphin.thomas@genus.com.au" },
  { name: "Steve Armitage",   role: "Project Director",             email: "steve.armitage@genus.com.au" },
  { name: "Gary Armitage",    role: "Construction Manager",         email: "gary.armitage@genus.com.au" },
  { name: "Joey Ryan",        role: "Grad Project Manager",         email: "joey.ryan@genus.com.au" },
  { name: "Matt Smith",       role: "Senior Civil Supervisor",      email: "matt.smith@genus.com.au" },
  { name: "Paul Delaney",     role: "Civil Supervisor",             email: "paul.delaney@genus.com.au" },
  { name: "Cory Shotter",     role: "Senior Electrical Supervisor", email: "cory.shotter@genus.com.au" },
  { name: "Zane Patten",      role: "Electrical Supervisor",        email: "zane.patten@genus.com.au" }
];

/* Quick report – positive observation categories */
const OBS_CATEGORIES = ["Above-standard practice", "Speaking up / stop work", "Effective controls in place", "Good housekeeping", "Environmental care", "Leadership / mentoring", "Innovation / improvement"];

/* Forms opened from their own tile on the home screen instead of the inspection list */
const HOME_TILE_FORMS = [24];

/* Inspection library groups (template numbers). Anything not listed shows under "Other". */
const CATEGORIES = [
  { key: "site",   label: "Site & people",          nums: [1, 2, 3] },
  { key: "plan",   label: "Planning & permits",     nums: [4, 5, 6] },
  { key: "elec",   label: "Electrical",             nums: [7, 8] },
  { key: "height", label: "Heights & lifting",      nums: [9, 10, 11, 12] },
  { key: "plant",  label: "Plant & traffic",        nums: [13, 14, 21, 26] },
  { key: "ground", label: "Ground & hot work",      nums: [15, 16] },
  { key: "env",    label: "Fire, chemicals & environment", nums: [17, 18, 19, 20, 22, 25, 27] },
  { key: "rec",    label: "Records",                nums: [23] }
];
