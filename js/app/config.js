"use strict";
const CONFIG = {
  recipient: "darren.frizzell@genus.com.au",          // <-- report recipient (set once before hosting)
  project: "J1084 – Parron Wind Farm Connection Assets – Yerramullah Terminal (YMT)",
  docPrefix: "J1084-HSE-FRM-YMT-TBA", rev: "0", appVersion: "1.8"
};
const SNN = {"FND": "Foundations", "FFW": "Fitness for Work", "VD": "Vehicles & Driving", "EI": "Energy & Isolation", "UU": "Underground Utilities", "WAH": "Working at Height", "TMP": "Live Traffic & Mobile Plant", "HL": "Hoisting & Lifting", "CS": "Confined Spaces"};
const snnBadge=(c,pre)=>`<span class="snn" title="Safety Non-Negotiable"><img src="${SNN_ICONS[c]}" alt="">${pre?"SNN · ":""}${esc(SNN[c])}</span>`;
