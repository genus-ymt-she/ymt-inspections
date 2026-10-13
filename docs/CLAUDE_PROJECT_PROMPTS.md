# Prompts for the SHE Manager's Claude Project

Use these in your own Claude Project that holds the project plans (WHSMP, BFMP, ERP, HSDG, TMP/VMP, CEMP, SSMP) and the
Genus style guide. Claude drafts; you check and approve in PARRON (Manager mode). The same prompts have a *Copy the
prompt* button in the app. Check every clause Claude cites before approving.

## 1. SHEQ obligations → My SHEQ Planner

Paste into the Claude Project, then copy the table into PARRON → My SHEQ Planner → *Import from Claude*.
When a plan is revised, run it again on the new revision and import only the new or changed rows.

```text
Using only the project documents in this Project (WHSMP, BFMP, ERP, HSDG, TMP/VMP, CEMP/EMP, SSMP and any other plans), list every recurring or scheduled SHEQ obligation the SHE Manager, SHE Advisor, Environmental Lead or supervisors must complete – inspections, audits, reviews, drills and exercises, reports, meetings, re-prints and re-issues, register checks, testing and tagging, and licence or competency checks.

Output ONE markdown table and nothing else, with exactly these columns:
| Obligation | Source | Frequency | Owner | PARRON form | Remind days before | First due | Notes |

Rules:
- Obligation: a short name (under 80 characters), e.g. "Weekly DG store inspection".
- Source: document number or short name and clause, e.g. "HSDG §21" or "ERP J1084-HSE-PLN-YMT-0002 §6.4". Never invent a clause – if you can't cite one, leave the item out.
- Frequency: one of Daily, Weekly, Fortnightly, Monthly, Every 2 months, Quarterly, 6-monthly, Yearly, Every N days/weeks/months/years, As required (for event-triggered items such as "after rain" or "after an incident"), or Once.
- Owner: the role named in the plan – SHE Manager, SHE Advisor, Senior SHE Advisor, Environmental Lead, Construction Manager, Supervisor, Trade Assistant, Project Admin.
- PARRON form: the number of the PARRON inspection that records it, only when it clearly matches: 17 Bushfire Prevention & Fire Equipment, 18 Hazardous Chemicals & DG Storage, 20 Environmental & Biosecurity, 21 Traffic Management – Cowalla Road, 22 Firefighting Water Trailer, 24 Task Observation, 25 Fire Danger Day, 26 Monthly Road Condition Check, 27 Spill Kit Inspection. Otherwise leave it blank.
- Remind days before: 2 for weekly, 7 for monthly, 14 for quarterly, 30 for 6-monthly or yearly items (more if the plan needs notice or booking).
- First due: YYYY-MM-DD only if the plan or a date I give you sets it; otherwise blank.
- Notes: one short line – what "done" looks like or who else is involved. No names of individuals.
Do not use the | character inside a cell.
```

## 2. New inspection form → Inspection forms

Replace the first line with what the form is for, then paste the result into PARRON → Inspection forms → *Add a form*.

```text
Create a new PARRON site inspection form for: [describe the inspection – what, where, how often and who completes it].

Use the Genus style guide and only the project documents in this Project. Every item must be traceable to a clause in a plan or standard in this Project – if you can't cite one, leave the item out.

Write it in EXACTLY this plain text layout, inside one code block, with nothing else:

Title: [form name, under 60 characters, no number]
Category: [one of: site, plan, elec, height, plant, ground, env]
Scope: [one sentence – what is inspected, how often, by whom, and the plan it implements]
Details: [up to 4 extra boxes the inspector fills in, separated by | – location, date, inspector, crew and supervisor are already on every form]
Note: [optional – one or two sentences of rating guidance, e.g. when to rate UA]

## [SECTION NAME IN CAPITALS]
- [A closed question that can be answered Compliant / Not compliant / N/A, under 200 characters] [plan short name and clause, e.g. TMP §6.2] {SNN codes if it links to a Genus Safety Non-Negotiable}

Rules:
- 3 to 6 sections, 4 to 8 items each; most important or highest-risk items first in each section.
- Each item asks about one thing that can be seen or checked on site. Plain Australian English, no names of people.
- SNN codes (only where clearly relevant): FND Foundations, FFW Fitness for Work, VD Vehicles & Driving, EI Energy & Isolation, UU Underground Utilities, WAH Working at Height, TMP Live Traffic & Mobile Plant, HL Hoisting & Lifting, CS Confined Spaces.
- Do not use the characters < > | inside items.
```

## Text layout PARRON reads for a form

```text
Title: Daily Haul Road Inspection
Category: plant
Scope: What is inspected, how often and by whom.
Details: Road or section inspected | Weather / road conditions
Note: Optional rating guidance shown at the top of the form.

## SECTION NAME
- A closed question rated C / UA / NI / N/A? [Plan §clause] {VD}
```

Categories: site, plan, elec, height, plant, ground, env. SNN codes: FND, FFW, VD, EI, UU, WAH, TMP, HL, CS.
