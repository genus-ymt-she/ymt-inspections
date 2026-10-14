"use strict";
/* ---------- Inspection forms added by the SHE Manager (Manager mode) – no code change needed ----------
   The form is written in a plain text layout (by hand or by the SHE Manager's Claude Project with the Genus style guide),
   previewed, then published through the relay. Every phone picks it up at its next sync and keeps it for offline use.
   It works like a built-in checklist: C / UA / NI / N/A ratings, photos, risk-rated findings, actions, the PDF and the email.
   Built-in forms 01–28 (and anything with special behaviour) are still changed in the code. */
let CFORMS=lsJ("customForms",{at:0,forms:[]});
const CF_FIRST=29;
/* layout example only – the references are placeholders to replace with the real clauses */
const CF_EXAMPLE=`Title: Daily Haul Road Inspection
Category: plant
Scope: Daily check of the internal haul roads and access tracks before plant movements start – Supervisor or SHE Advisor.
Details: Road or section inspected | Weather / road conditions
Note: Rate UA where a defect could cause loss of control or a rollover – stop plant on that section and tell the Supervisor.

## ROAD SURFACE
- Is the running surface free of potholes, corrugations, soft spots and loose material that could cause loss of control? [TMP – add clause] {VD}
- Is dust controlled by watering so visibility is maintained for all road users? [CEMP – add clause]

## EDGES, SIGNS AND DELINEATION
- Are windrows / bunds in place on drop-offs, at least half the wheel height of the largest vehicle? [TMP – add clause] {TMP}
- Are speed, give-way and hazard signs in place, clean and visible, matching the TMP drawings? [TMP – add clause]
`;
/* add the published forms to the inspection list (numbers already used by built-in forms are never replaced) */
function cfApply(){for(let i=TABS.length-1;i>=0;i--)if(TABS[i].custom)TABS.splice(i,1);
  (CFORMS.forms||[]).forEach(f=>{if(!f.tpl||!(f.num>=CF_FIRST)||tabByNum(f.num))return;TABS.push(Object.assign({},f.tpl,{num:f.num,custom:true,rev:f.rev,retired:f.status!=="Active"}))})}
cfApply();
function cfStore(forms){const before=JSON.stringify(CFORMS.forms);CFORMS={at:Date.now(),forms:forms||[]};ls("customForms",JSON.stringify(CFORMS));cfApply();return JSON.stringify(CFORMS.forms)!==before}
async function cfRefresh(){if(!directOn()||navigator.onLine===false)return false;
  try{const r=await fetch(relayQ("action=forms"),{redirect:"follow"});const j=await r.json();if(!j.ok||!Array.isArray(j.forms))return false;return cfStore(j.forms)}catch(e){return false}}
const cfNext=()=>Math.max(CF_FIRST-1,...TABS.filter(t=>t.num!==T5_NUM).map(t=>t.num),...(CFORMS.forms||[]).map(f=>f.num))+1;
const cfClean=s=>String(s||"").replace(/[<>]/g,"").replace(/\s+/g," ").trim();
/* SNN given as a code (VD) or a name (Vehicles & Driving) */
const cfSnn=x=>{x=cfClean(x);return SNN[x.toUpperCase()]?x.toUpperCase():Object.keys(SNN).find(k=>nameEq(SNN[k],x))||""};
function cfCat(x){x=cfClean(x).toLowerCase();if(!x)return "other";const c=CATEGORIES.find(c=>c.key===x||c.label.toLowerCase()===x||c.label.toLowerCase().startsWith(x));return c?c.key:"other"}
/* text layout → template. Errors stop publishing; warnings are shown but allowed. */
function cfParse(text,num){const errs=[],warns=[];const F={title:"",cat:"other",scope:"",extra:[],note:"",sections:[]};let item=null;
  String(text||"").split(/\r?\n/).forEach((raw,i)=>{const s=raw.trim().replace(/^\*\*(\w+\s*:)\*\*/,"$1");if(!s||/^```/.test(s)||/^---+$/.test(s))return;let m;
    if((m=s.match(/^(title|name)\s*:\s*(.*)$/i))){F.title=cfClean(m[2]).replace(/^\d+\s*[–-]\s*/,"").slice(0,80);item=null;return}
    if((m=s.match(/^category\s*:\s*(.*)$/i))){F.cat=cfCat(m[1]);if(F.cat==="other"&&cfClean(m[1]))warns.push(`Category "${cfClean(m[1])}" not found – listed under Other`);item=null;return}
    if((m=s.match(/^scope\s*:\s*(.*)$/i))){F.scope=cfClean(m[1]).slice(0,400);item=null;return}
    if((m=s.match(/^details\s*:\s*(.*)$/i))){F.extra=m[1].split("|").map(cfClean).filter(Boolean).slice(0,6).map(x=>x.slice(0,60).replace(/:?$/,":"));item=null;return}
    if((m=s.match(/^note\s*:\s*(.*)$/i))){F.note=cfClean(m[1]).slice(0,600);item=null;return}
    if((m=s.match(/^#{1,4}\s*(.+)$/))){F.sections.push({name:cfClean(m[1]).replace(/^\*+|\*+$/g,"").toUpperCase().slice(0,60),q:[]});item=null;return}
    if((m=s.match(/^(?:[-*•]|\d{1,3}[.)])\s+(.+)$/))){let t=m[1],ref="",snn=[];
      for(let k=0;k<2;k++){let x;if((x=t.match(/\s*\{([^}]*)\}\s*$/))){snn=x[1].split(/[,/;]/).map(v=>{const c=cfSnn(v);if(v.trim()&&!c)warns.push(`SNN "${cfClean(v)}" not recognised – left off`);return c}).filter(Boolean);t=t.slice(0,x.index)}
        if((x=t.match(/\s*\[([^\]]*)\]\s*$/))){ref=cfClean(x[1]).slice(0,80);t=t.slice(0,x.index)}}
      if(!F.sections.length)F.sections.push({name:"CHECKLIST",q:[]});
      item={text:cfClean(t.replace(/^\*\*|\*\*$/g,"")).slice(0,500),ref,snn:[...new Set(snn)]};F.sections[F.sections.length-1].q.push(item);return}
    if(item){item.text=cfClean(item.text+" "+s).slice(0,500);return}
    errs.push(`Line ${i+1} not understood: "${cfClean(s).slice(0,50)}" – items start with "- ", sections with "## "`)});
  if(!F.title)errs.push('Add a "Title:" line');
  F.sections=F.sections.filter(sec=>{if(!sec.q.length){warns.push(`Section "${sec.name}" has no items – left out`);return false}return true});
  const nq=F.sections.reduce((a,sec)=>a+sec.q.length,0);
  if(!nq)errs.push("Add at least one item (a line starting with - )");if(nq>120)errs.push(`${nq} items – keep a form to 120 or fewer`);
  if(F.sections.length>20)errs.push("Keep a form to 20 sections or fewer");
  F.sections.forEach(sec=>sec.q.forEach(q=>{if(q.text.length<8)errs.push(`Item "${q.text}" is too short`);if(!q.ref)q.noRef=true}));
  const noRef=F.sections.reduce((a,sec)=>a+sec.q.filter(q=>q.noRef).length,0);if(noRef)warns.push(`${noRef} item${noRef>1?"s have":" has"} no plan reference in [ ]`);
  let k=0;const tpl={title:`${pad(num)} – ${F.title}`,short:F.title,scope:F.scope||F.title,extra:F.extra,cat:F.cat,
    sections:F.sections.map(sec=>({name:sec.name,q:sec.q.map(q=>({id:`${num}.${++k}`,text:q.text,ref:q.ref,snn:q.snn}))}))};
  if(F.note)tpl.note=F.note;
  return {tpl,errs,warns,count:nq}}
/* preview in the same look as the inspection screen */
function cfPreviewHTML(P){const t=P.tpl;if(!P.count&&!t.short)return `<div class="card empty">${ic("clipboard")}<b>Preview</b>Paste or type the form on the left – the preview appears here.</div>`;
  return `${P.errs.length?`<div class="alert red">${ic("alert")}<div><b>Fix before publishing</b><ul>${P.errs.map(e=>`<li>${esc(e)}</li>`).join("")}</ul></div></div>`:""}
    ${P.warns.length?`<div class="alert org">${ic("info")}<div><ul>${P.warns.map(e=>`<li>${esc(e)}</li>`).join("")}</ul></div></div>`:""}
    <div class="band"><b>${esc(t.title)}</b>${esc(t.scope)}</div>
    <div class="cf-meta"><span class="tag">${esc((CATEGORIES.find(c=>c.key===t.cat)||{label:"Other"}).label)}</span><span class="tag">${P.count} items</span>${t.extra.map(x=>`<span class="tag">${esc(x.replace(/:$/,""))}</span>`).join("")}</div>
    ${t.note?`<div class="alert org">${ic("alert")}<div>${esc(t.note)}</div></div>`:""}
    ${t.sections.map(sec=>`<div class="sec">${esc(sec.name)}</div>${sec.q.map(q=>`<div class="q"><div class="head"><div class="id">${esc(q.id)}</div><div class="txt">${esc(q.text)}</div></div>
      <div class="meta">${q.ref?`<span class="ref">${esc(q.ref)}</span>`:""}${(q.snn||[]).map(c=>snnBadge(c,1)).join("")}</div></div>`).join("")}`).join("")}`}

/* routes: #forms · #forms/new · #forms/<number> */
function viewForms(id){if(id)return cfEdit(id==="new"?null:+id);const seq=ROUTE_SEQ;
  setHeader("Inspection forms","Forms you have added",{icon:"back",aria:"Back",fn:()=>go(isManager()?"#planner":"#inspect")});
  if(!isManager()){render(PL_LOCKED().replace("open the planner","add or change forms"));return}
  const draw=()=>{const L=(CFORMS.forms||[]).slice().sort((a,b)=>a.num-b.num);
    let h=`<button class="btn o w" onclick="go('#forms/new')">${ic("plus","s")} Add a form</button>
      <div class="card pl-steps"><ol class="steps"><li>In your Claude Project, paste the <b>new inspection form prompt</b> and say what the form is for. <button class="btn g s" onclick="copyText(CF_PROMPT,'Prompt')">${ic("copy","s")} Copy the prompt</button></li>
      <li>Tap <b>Add a form</b>, paste what Claude gives you and check the preview.</li><li>Publish – it appears under Inspect › Inspection on every phone at its next sync.</li></ol></div>`;
    h+=L.length?`<h2>Your forms <span class="cnt">${L.length}</span></h2>${L.map(f=>{const n=(f.tpl.sections||[]).reduce((a,s)=>a+s.q.length,0);
      return `<button class="card tap cf-item ${f.status==="Active"?"":"off"}" onclick="go('#forms/${f.num}')"><span class="n">${pad(f.num)}</span><span class="x"><b>${esc(f.tpl.short||f.title)}</b>
        <small>Rev ${esc(f.rev)} · ${n} items · ${esc(fmtD(f.at))}${f.by?` · ${esc(f.by)}`:""}</small></span><span class="tag ${f.status==="Active"?"g":""}">${esc(f.status==="Active"?"In use":"Retired")}</span></button>`}).join("")}`
      :`<div class="card empty">${ic("clipboard")}<b>No forms added yet</b>Forms 01–28 are built in. Forms you add are numbered from ${CF_FIRST}.</div>`;
    h+=`<p class="foot">Added forms work like the built-in checklists – ratings, photos, findings, actions, PDF and email. Forms with special behaviour (like the fuel register) still need a code change.</p>`;
    render(h)};
  draw();cfRefresh().then(ch=>{if(ch&&!stale(seq)&&location.hash==="#forms")draw()})}
function cfEdit(num){const f=num?(CFORMS.forms||[]).find(x=>x.num===num):null;
  if(num&&!f){go("#forms");return}const n=f?f.num:cfNext();
  setHeader(f?`${pad(n)} · ${f.tpl.short}`:"Add a form",f?`Rev ${f.rev} · ${f.status==="Active"?"in use":"retired"}`:`Will be form ${pad(n)}`,{icon:"back",aria:"Back",fn:()=>go("#forms")});
  if(!isManager()){render(PL_LOCKED());return}
  render(`<div class="cf-edit"><div class="cf-in">
     <div class="pl-tools"><button class="btn g s" onclick="copyText(CF_PROMPT,'Prompt')">${ic("copy","s")} Copy the Claude prompt</button>${f?"":`<button class="btn g s" id="cfEx">${ic("file","s")} Load an example</button>`}</div>
     <label class="f" for="cfTxt">Form text</label><textarea class="t cf-txt" id="cfTxt" rows="18" spellcheck="true" placeholder="Title: …&#10;Category: …&#10;Scope: …&#10;Details: … | …&#10;&#10;## SECTION&#10;- Question? [Plan §clause] {SNN}">${esc(f?f.text:"")}</textarea>
     <details class="cf-help"><summary>How to write a form</summary><ul>
       <li><b>Title:</b> the form name. <b>Category:</b> ${CATEGORIES.map(c=>esc(c.key)).join(", ")}.</li>
       <li><b>Scope:</b> one line on what is inspected, how often and by whom. <b>Note:</b> optional guidance shown at the top.</li>
       <li><b>Details:</b> extra boxes on the form, separated by | (location, date, inspector, crew and supervisor are always there).</li>
       <li><b>## SECTION NAME</b> starts a section. Each item starts with <b>- </b> and is a yes/no question rated C / UA / NI / N/A.</li>
       <li>End an item with the plan reference in <b>[ ]</b> and any Safety Non-Negotiable codes in <b>{ }</b>: ${Object.keys(SNN).map(esc).join(", ")}.</li></ul></details>
     <div class="row2" style="margin-top:12px">${f?`<button class="btn g" id="cfRet">${ic(f.status==="Active"?"x":"reopen","s")} ${f.status==="Active"?"Retire":"Use again"}</button>`:`<button class="btn g" onclick="go('#forms')">Cancel</button>`}<button class="btn o" id="cfPub">${ic("send","s")} ${f?`Publish Rev ${f.rev+1}`:`Publish as form ${pad(n)}`}</button></div>
     ${f&&f.status==="Active"?`<button class="btn g w" onclick="startInsp(${n})">${ic("clipboard","s")} Try it – start this inspection</button>`:""}
    </div><div class="cf-prev" id="cfPrev"></div></div>`);
  const ta=$("#cfTxt");const upd=()=>{$("#cfPrev").innerHTML=cfPreviewHTML(cfParse(ta.value,n))};let tm=0;ta.addEventListener("input",()=>{clearTimeout(tm);tm=setTimeout(upd,250)});upd();
  const ex=$("#cfEx");if(ex)ex.onclick=()=>{ta.value=CF_EXAMPLE;upd()};
  $("#cfPub").onclick=async()=>{const P=cfParse(ta.value,n);upd();if(P.errs.length){toast("Fix the items in red first",3500);$("#cfPrev").scrollIntoView({behavior:"smooth"});return}
    if(navigator.onLine===false||!directOn()){toast("Needs signal to publish",3500);return}
    if(!await ask2(f?`Publish Rev ${f.rev+1}?`:`Publish form ${pad(n)}?`,`<b>${esc(P.tpl.title)}</b> – ${P.count} items. It appears under Inspect › Inspection on every phone at its next sync.${f?" Inspections already started use the new revision.":""}`,"Publish"))return;
    const b=$("#cfPub");b.disabled=true;b.innerHTML='<span class="sending"><span class="spin"></span>Publishing…</span>';
    try{const r=await relayPost({payload:{action:"saveForm",pin:ls("mgrPin")||"",num:n,tpl:P.tpl,text:ta.value.trim(),by:ls("inspector")||"SHE Manager"}},false);
      if(r&&r.badPin){toast("Manager PIN not accepted – turn Manager mode on again",4500);throw 0}
      if(!r||!r.ok)throw new Error((r&&r.error)||"Not published");cfStore(r.forms);celebrate("Form published",`${pad(n)} – ${P.tpl.short}`);go("#forms")}
    catch(e){if(e)toast(String(e.message||e),4500);b.disabled=false;b.innerHTML=`${ic("send","s")} ${f?`Publish Rev ${f.rev+1}`:`Publish as form ${pad(n)}`}`}};
  const rt=$("#cfRet");if(rt)rt.onclick=async()=>{const off=f.status==="Active";
    if(off&&!await ask2("Retire this form?","It comes off the inspection list on every phone. Reports already sent are kept, and you can use it again later.","Retire"))return;
    try{const r=await relayPost({payload:{action:"saveForm",pin:ls("mgrPin")||"",num:n,status:off?"Retired":"Active"}},false);if(r&&r.badPin){toast("Manager PIN not accepted – turn Manager mode on again",4500);return}
      if(!r||!r.ok)throw new Error((r&&r.error)||"Not saved");cfStore(r.forms);toast(off?"Form retired":"Form back in use");go("#forms")}catch(e){toast(String(e.message||e),4500)}}}

/* the prompt for the SHE Manager's Claude Project (also in docs/CLAUDE_PROJECT_PROMPTS.md) */
const CF_PROMPT=`Create a new PARRON site inspection form for: [describe the inspection – what, where, how often and who completes it].

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
- Do not use the characters < > | inside items.`;
