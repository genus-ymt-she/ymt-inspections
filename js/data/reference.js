"use strict";
/* Reference content – verbatim from the source documents. Edit here when they are revised.
   Fire status: BFMP J1084-HSE-PLN-YMT-0009 Rev 1 §10.1–10.4 and Table 13; TMP Rev 1 §TFB/HVMB.
   Safety Non-Negotiables: Genus Safety Non-Negotiables booklet (GNP, web version).
   330 kV: WHSMP Rev 1 §MADs; TMP Rev 1 §Travel and Work Under Overhead Power Lines; SSMP Rev 1 §10.1 and Appendix A. */
const STATUS_REF = {
  fdr: {
    "No Rating / Moderate": [
      "Hot work under permit with BFMP §8.2 controls; in the bushfire season, appliance at the work area.",
      "Standard plant controls; no parking on grass.",
      "Firefighting appliance operationally ready and filled to 100% at start of shift.",
      "Pre-start briefing of FDR, TFB and HVMB."],
    "High": [
      "Hot work under permit – permit issuer confirms appliance, fire watch and 15 m clearance on site before work starts.",
      "Mid-shift plant clean-outs; JHA and spotter or appliance for rocky earthworks; slashing only with appliance in attendance.",
      "Appliance at least 50% full at all times, operator within UHF range, staging point briefed.",
      "Lookout nominated at pre-start; regular monitoring of warnings; midday re-check."],
    "Extreme": [
      "NO hot work in the open air – hot work inside an enclosed building only with Construction Manager approval and never during a TFB.",
      "No slashing, mowing or grading of vegetation; corridor and paddock work on formed tracks and cleared pads only; outdoor ignition-risk activities risk-assessed.",
      "Appliance full, staged at each active work area, operator on standby, mid-shift readiness check.",
      "Fire Danger Day checklist (PARRON 25 / BFMP App D) completed in the morning; evacuation routes confirmed; Project Director and Principal advised."],
    "Catastrophic": [
      "NO hot work.",
      "No construction work in bushfire risk areas; plant parked on hardstand or mineral earth.",
      "Appliance full and staged at the compound.",
      "Project Director decides the day before whether the workforce mobilises; if declared during a shift, withdraw on the Chief Warden's direction.",
      "Only Project Director-approved essential attendance, with an appliance. Principal notified."]
  },
  tfb: { title: "Total Fire Ban declared (BFMP §10.3)", items: [
    "No hot work – welding, grinding, cutting or any spark-generating activity – anywhere on the Works.",
    "All off-road activities using engines, vehicles, plant or machinery over or near flammable ground fuels or vegetation stop immediately; vehicles keep to formed roads and cleared hardstand.",
    "Off-road work only under a TFB exemption (Bush Fires Act s22C) or DFES rules, with Project Director approval and the exemption conditions.",
    "Restricted activities resume only when the ban ends."] },
  hvmb: { title: "Harvest & Vehicle Movement Ban declared (BFMP §10.4)", lead: "An HVMB overrides TFB conditions and exemptions", items: [
    "Declared by the Shire of Dandaragan, often at short notice during harvest.",
    "All off-road activities using engines, vehicles, plant or machinery over or near flammable ground fuels or vegetation stop immediately; movement only on formed access tracks and cleared hardstand.",
    "No hot work in the open air unless expressly permitted by the ban conditions.",
    "Restricted activities do not resume until the HVMB is lifted, confirmed through the Shire."] },
  footer: "Reference: BFMP J1084-HSE-PLN-YMT-0009 Rev 1 §10 and Table 13. New declarations are broadcast on UHF 24 and override this screen."
};
const SNN_CARDS = [
  { c: "FND", head: "I will always implement the foundation requirements for all operational works.", rules: [
    ["Stop Work Authority", "I will use my Stop Work Authority to immediately stop work or behaviour I deem unsafe to myself or others."],
    ["Permits", "I will ensure that all permit conditions will be met before commencing works requiring a permit."],
    ["Emergency Response", "I will always have an understanding of the emergency response processes in place."],
    ["Training and Authorisation", "I will only undertake work that I am trained, competent, licenced and authorised."],
    ["Equipment", "I will check all fleet, equipment and tools before use to check it is fit for purpose."],
    ["Risk Awareness & Assessments", "I will discuss with my team and complete a documented risk assessment prior to starting any operational works; I will assess caught in/between, struck by/against, release of stored energy, and line of fire risks."],
    ["Safety Devices", "I will never tamper with, override, remove or bypass safety devices."],
    ["Change Management", "I will stop work and re-assess the job plan and documented risk assessment when changes occur."],
    ["Reporting", "I will report all hazards, near misses, incidents and injuries immediately."],
    ["PPE", "I will wear the correct PPE."]] },
  { c: "FFW", head: "I will always present mentally and physically fit for work.", rules: [
    ["Fatigue", "I will present for work well rested and alert; I will only work past my normal working hours with approval from my Supervisor or Manager."],
    ["Drugs and Alcohol", "I will present for work unimpaired by drugs or alcohol."],
    ["Mental Health", "I will be aware of my own behaviours and their impact on others, to prevent psychosocial hazards; I will encourage the EAP as a tool for myself and others and respect confidentiality."]] },
  { c: "VD", head: "I commit to being a responsible driver.", rules: [
    ["Driving", "I will drive to conditions and to the road traffic laws."],
    ["Journey Management", "I will manage the risks of long distance and/or remote driving, and follow the agreed journey management plan."],
    ["Load Restraint", "I will ensure that loads are secure and do not exceed manufacturer's specification and legal limits for the vehicle."]] },
  { c: "EI", head: "I will ensure that all energy sources have been isolated and verified before commencing works.", rules: [
    ["", "I will isolate using personal locks and tags."],
    ["", "I will ensure EWPs, tools, equipment and PPE are insulated and rated to the correct voltage."],
    ["", "Where live works have been authorised, I will use appropriate barriers and maintain safe approach distances."],
    ["", "I will only perform live works where a rescue plan is in place, rescue equipment is set up and a trained Safety Observer is present."],
    ["", "I will earth EWPs and drill rigs when operating near live electricity."],
    ["", "I will ensure all mandatory testing has been carried out before placing electrical equipment back into service."]] },
  { c: "UU", head: "I will have a current Before You Dig plan on site when locating utilities or undertaking ground disturbance works.", rules: [
    ["", "I will positively identify the location of underground utilities using non-destructive digging before any mechanical ground disturbance."],
    ["", "I will maintain minimum approach distances (MADs) of at least 300 mm when operating mobile plant."],
    ["", "I will use a spotter during excavator operations."],
    ["", "I will always follow the 5P's – Plan, Prepare, Pothole, Protect, Proceed – before any ground disturbance."]] },
  { c: "WAH", head: "I will ensure that fall protection or fall prevention is in place at all times while working at heights.", rules: [
    ["", "I will consider alternatives to eliminate working at height."],
    ["", "I will ensure there is a rescue plan in place when using a fall arrest system."],
    ["", "I will limit free fall to less than 2 metres."],
    ["", "I will maintain 100% hook up."],
    ["", "I will ensure anchor points are inspected and rated for fall arrest before use."],
    ["", "I will secure tools and equipment at height to prevent dropped objects."]] },
  { c: "TMP", title: "Working around Live Traffic and Mobile Plant", head: "I will always have traffic management in place when working around live traffic and mobile plant.", rules: [
    ["", "I will only start works near live traffic with an approved TMP."],
    ["", "I will set up traffic control devices as per the approved TGS."],
    ["", "I will always establish positive contact with the mobile plant operator and gain their approval before approaching (project 50 / 20 / 10 Rule)."],
    ["", "I will set up exclusion zones around mobile plant."]] },
  { c: "HL", head: "I will never position myself underneath a suspended load.", rules: [
    ["Before a lift", "A competent person develops a lift plan, rigs the load and inspects all lifting equipment before each lift."],
    ["", "The load does not exceed the capacity of the lifting equipment."],
    ["", "Persons are separated and protected from the lift area and travel path."],
    ["", "Only authorised persons in the lift zone."]] },
  { c: "CS", head: "I will always obtain authorisation before entering a confined space.", rules: [
    ["", "I will consider alternatives to eliminate entry."],
    ["Before entry", "A rescue plan is in place, rescue kit is set up and a trained stand-by person is present; the atmosphere is tested before and during entry; services and systems that can cause harm are isolated."]] }
];
const SNN_FOOTER = "Think Safe. Work Safe. Home Safe. – Stop Work Authority: if it's not safe, we don't do it.";
const HV330 = {
  title: "Working near 330 kV lines",
  /* surveyed clearance to the power lines over Lots Y and Z (Noble Surveys drawing 1959-ASC-007 Rev 0, 11/10/26) */
  clearance: { title: "Measured clearance – Lots Y & Z", img: "assets/traffic/hv-clearance-lots-yz.jpg",
    basis: "Values are the height difference from the highest point of the finished surface level (asphalt) to the lowest power line.",
    readings: [["Western line", "19.5 m", "19.3 m"], ["Centre line", "22.3 m", "22.3 m"], ["Eastern line", "21.7 m", "21.6 m"]], lowest: "19.3 m",
    source: "Noble Surveys drawing 1959-ASC-007 Rev 0 – Yerramullah Terminal HV Power Line Minimum Clearance (issued 11/10/26)",
    caution: "These are surveyed clearances, not approach distances. Plant, loads and people must still stay outside the MAD on your Western Power permit." },
  items: [
    "The existing Western Power dual-circuit 330 kV line beside YMT stays in service during the Works. Treat every conductor as live.",
    "Minimum Approach Distances (MADs) apply to people, vehicles, mobile plant (including the load, tag lines and attachments) and objects. MADs are set by Western Power's Electrical System Safety Rules (EDM 41392645) and your Vicinity Access permit – check the MAD on your permit before work.",
    "No plant, vehicle or material inside the MAD exclusion zone – at any time, including overnight. Exclusion zones are marked with barriers and signage at the line vicinity boundary and checked at the start of every shift.",
    "Work near the line only under a Western Power Vicinity Access permit (Electrical Permit to Work, EDM 34141096). Where any part of plant or load could enter the no-go zone: Western Power permit or access authority and a dedicated trained Safety Observer.",
    "All plant travels lowered or stowed – tipper bodies down, booms stowed, jibs retracted. Elevated travel is prohibited site-wide.",
    "Crossings under overhead lines: DANGER sign, \"Look Up and Live\" signs and non-conductive height goalposts on each approach. Know the crossing locations from the VMP.",
    "Cranes, EWPs, drill rigs, telehandlers at height within reach of a conductor: only under a lift / work plan approved by the Construction Manager.",
    "Metal fencing, posts, plant and generators near HV lines or in the substation: bonded or controlled per Western Power requirements. No driven star pickets or plastic barrier tape inside an energised substation.",
    "End of shift: confirm no plant, vehicle or material inside the MAD exclusion zone (SSMP Appendix A, item 8).",
    "Anyone seen approaching or interfering with the line: report immediately to Western Power via the permit issuer and the Western Power Incident Hotline (ERP Appendix A), then the Construction Manager."],
  madImg: "img/mad.png", madFallback: "MAD values: refer to your Western Power permit / ESSR",
  sources: "WHSMP Rev 1 §MADs; TMP Rev 1 §Travel and Work Under Overhead Power Lines; SSMP Rev 1 §10.1 and Appendix A",
  footer: "Reference only – your Western Power permit and the ESSR take precedence."
};
const CHEMALERT_NOTE = "Search the product name to view the SDS. No signal or can't log in? Use the hard-copy SDS at the chemical store or ask your Supervisor. Never use a chemical without reading its SDS.";
