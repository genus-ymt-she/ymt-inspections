"use strict";
/* ---------- My SHEQ Planner – SHE Manager only (Manager mode) ----------
   A register of every SHEQ obligation from the project plans: what, the clause, how often, who, and when it is next due.
   Items are drafted in the SHE Manager's own Claude Project (or from the suggested list), pasted here and approved –
   nothing reminds anyone until it is approved. The relay keeps the register (Manager PIN checked on every request),
   emails the SHE Manager between 5 and 6 am, emails owners their own items, and ticks an item off when its PARRON form is sent. */
let PLAN=lsJ("planner",{at:0,items:[],log:[]});
let PLF="all";   // owner filter
const PL_FREQ=[["1 day","Daily"],["1 week","Weekly"],["2 weeks","Fortnightly"],["1 month","Monthly"],["2 months","Every 2 months"],["3 months","Quarterly"],["6 months","6-monthly"],["1 year","Yearly"],["2 years","Every 2 years"],["3 years","Every 3 years"],["5 years","Every 5 years"],["Once","Once"],["As required","As required"]];
const plEveryLabel=c=>(PL_FREQ.find(f=>f[0]===c)||[0,c&&/^\d/.test(c)?"Every "+c:c||"–"])[1];
/* frequency as written in a plan → "N day|week|month|year", "Once" or "As required" ("" when not understood) */
function plEvery(s){s=String(s||"").trim().toLowerCase().replace(/[‐-—]/g,"-").replace(/\.$/,"");if(!s)return "";
  const W={daily:"1 day","each day":"1 day","every day":"1 day",weekly:"1 week","every week":"1 week","each week":"1 week",fortnightly:"2 weeks",monthly:"1 month","every month":"1 month","each month":"1 month",
    "bi-monthly":"2 months",bimonthly:"2 months",quarterly:"3 months","6-monthly":"6 months","six-monthly":"6 months","6 monthly":"6 months","half-yearly":"6 months","twice yearly":"6 months",
    yearly:"1 year",annually:"1 year",annual:"1 year","every year":"1 year",once:"Once","one-off":"Once","one off":"Once","as required":"As required"};
  if(W[s])return W[s];
  let m=s.match(/^(?:every|each)?\s*(\d{1,3})\s*(day|week|month|year)s?$/);if(m&&+m[1]>0)return `${+m[1]} ${m[2]}${+m[1]>1?"s":""}`;
  m=s.match(/^(?:every|each)\s+(day|week|month|year)$/);if(m)return "1 "+m[1];
  if(/(as required|as needed|after |following |trigger|event|when |each use|every use|on change|prior to|before )/.test(s))return "As required";
  return ""}
/* next due date after a given date (same rule as the relay) */
function plAddEvery(iso,every){const m=String(every||"").match(/^(\d{1,3})\s*(day|week|month|year)s?$/);if(!m||!/^\d{4}-\d\d-\d\d$/.test(iso||""))return "";
  const n=+m[1],u=m[2];const [y,mo,d]=iso.split("-").map(Number);let dt;
  if(u==="day"||u==="week")dt=new Date(Date.UTC(y,mo-1,d+n*(u==="week"?7:1)));
  else{const k=n*(u==="year"?12:1);const last=new Date(Date.UTC(y,mo+k,0)).getUTCDate();dt=new Date(Date.UTC(y,mo-1+k,Math.min(d,last)))}
  return dt.toISOString().slice(0,10)}
/* default reminder lead time for a frequency */
function plLead(every){if(every==="Once")return 14;const m=String(every||"").match(/^(\d+)\s*(day|week|month|year)/);if(!m)return 0;
  const days=+m[1]*({day:1,week:7,month:30,year:365}[m[2]]);return days<=1?0:days<=7?2:days<=14?3:days<=31?7:days<=92?14:30}
/* owner as written ("SHE Advisor", "Darren Frizzell") → a team member where one matches */
function plOwner(txt){txt=String(txt||"").trim();const p=teamBy(txt)||TEAM.find(t=>nameEq(t.role,txt));return p?{owner:p.name,email:p.email||"",role:p.role}:{owner:txt,email:emailOK(txt)?txt.toLowerCase():"",role:""}}
const plMe=()=>ls("inspector")||"";
const plMine=o=>!o.owner||nameEq(o.owner,plMe())||(!!o.ownerEmail&&nameEq(o.ownerEmail,ls("myEmail")||""));
function plState(o){if(o.status!=="Active")return {k:"off",n:null};if(o.every==="As required"||!o.due)return {k:"req",n:null};const n=daysTo(o.due);
  return {k:n<0?"over":n<=7?"week":n<=30?"month":"later",n}}
const plDueTxt=o=>{const s=plState(o);if(s.n===null)return o.every==="As required"?"As required":"No date";return s.n<0?`${-s.n} day${s.n===-1?"":"s"} overdue`:s.n===0?"Due today":s.n===1?"Due tomorrow":`${fmtD(o.due)} · in ${s.n} days`};
async function plRefresh(){if(!isManager()||!directOn()||navigator.onLine===false)return false;
  try{const r=await relayPost({payload:{action:"planner",pin:ls("mgrPin")||""}},false);if(r&&r.badPin){toast("Manager PIN not accepted – turn Manager mode on again",4500);return false}if(!r||!r.ok)return false;return plStore(r)}catch(e){return false}}
function plStore(j){const before=JSON.stringify([PLAN.items,PLAN.log]);PLAN={at:Date.now(),items:j.items||[],log:j.log||[]};ls("planner",JSON.stringify(PLAN));return JSON.stringify([PLAN.items,PLAN.log])!==before}
async function plSend(payload,okMsg){if(navigator.onLine===false||!directOn()){toast("Needs signal to save the register",3500);return null}
  try{const r=await relayPost({payload:{...payload,pin:ls("mgrPin")||"",by:plMe()||"SHE Manager"}},false);if(r&&r.badPin){toast("Manager PIN not accepted – turn Manager mode on again",4500);return null}
    if(!r||!r.ok)throw new Error((r&&r.error)||"Not saved");plStore(r);if(okMsg)toast(okMsg);return r}catch(e){toast(String(e.message||e),4500);return null}}
/* Home tile counts (Manager mode only) */
function plCounts(){const L=(PLAN.items||[]).map(plState);return {over:L.filter(s=>s.k==="over").length,week:L.filter(s=>s.k==="week").length}}
function plTileHTML(){if(!isManager())return "";const c=plCounts();
  return `<button class="tile wide pl-tile" onclick="go('#planner')"><span class="ti">${ic("shield","l")}</span><span class="tw"><b>My SHEQ Planner ${ic("lock","s")}</b><small>${c.over?`${c.over} overdue · `:""}${c.week} due this week · SHE Manager only</small></span>${ic("chev")}</button>`}
const PL_LOCKED=()=>`<div class="card empty">${ic("lock")}<b>SHE Manager only</b>Turn on Manager mode in Settings with the Manager PIN to open the planner.<button class="btn o s" style="margin-top:10px" onclick="go('#settings')">Open Settings</button></div>`;

/* routes: #planner · #planner/import */
function viewPlanner(id){if(id==="import")return plImport();const seq=ROUTE_SEQ;
  setHeader("My SHEQ Planner","SHE Manager only",{icon:"back",aria:"Back",fn:()=>go("#home")});
  if(!isManager()){render(PL_LOCKED());return}
  const draw=()=>{const all=PLAN.items||[];const act=all.filter(o=>o.status==="Active");
    const owners=[...new Set(act.map(o=>o.owner||"SHE Manager"))].sort();if(PLF!=="all"&&PLF!=="mine"&&!owners.includes(PLF))PLF="all";
    const L=act.filter(o=>PLF==="all"||(PLF==="mine"?plMine(o):(o.owner||"SHE Manager")===PLF)).map(o=>({o,s:plState(o)})).sort((a,b)=>(a.s.n??1e9)-(b.s.n??1e9)||a.o.title.localeCompare(b.o.title));
    const g=k=>L.filter(x=>x.s.k===k);const mon=todayISO().slice(0,7);const doneM=(PLAN.log||[]).filter(x=>String(x.date).slice(0,7)===mon).length;
    const over=g("over"),wk=g("week"),mo=g("month"),later=g("later"),req=g("req");
    let h=`<div class="pl-kpis"><div class="bad"><b>${over.length}</b><span>Overdue</span></div><div class="warn"><b>${wk.length}</b><span>Due this week</span></div><div class="info"><b>${mo.length}</b><span>Next 30 days</span></div><div class="ok"><b>${doneM}</b><span>Done this month</span></div></div>
     <div class="pl-tools"><button class="btn o s" onclick="go('#planner/import')">${ic("upload","s")} Import from Claude</button><button class="btn g s" onclick="plEdit()">${ic("plus","s")} Add an item</button><button class="btn g s" onclick="go('#submitted')">${ic("inbox","s")} Submitted forms</button><button class="btn g s" onclick="go('#figures')">${ic("chart","s")} Monthly figures</button><button class="btn g s" onclick="go('#forms')">${ic("clipboard","s")} Inspection forms</button></div>`;
    if(!directOn())h+=`<div class="alert org">${ic("wifioff")}<div>Direct send is not set up, so the register can't be loaded.</div></div>`;
    if(!all.length){h+=`<div class="card empty">${ic("shield")}<b>Your register is empty</b>Start with the items PARRON already knows from its forms, or paste the list your Claude Project made from the plans. Nothing reminds anyone until you approve it.
      <div class="pl-tools" style="justify-content:center;margin-top:12px"><button class="btn o s" onclick="PL_START=true;go('#planner/import')">Start with suggested items</button><button class="btn g s" onclick="go('#planner/import')">Import from Claude</button></div></div>`;render(h);return}
    h+=`<div class="chips scroll pl-own">${[["all","Everything"],["mine","Mine"],...owners.filter(o=>!nameEq(o,plMe())).map(o=>[o,o])].map(([k,l])=>`<button class="chip ${PLF===k?"on":""}" data-k="${esc(k)}">${esc(l)}</button>`).join("")}</div>`;
    const sec=(t,list,cls)=>list.length?`<h2>${t} <span class="cnt">${list.length}</span></h2><div class="pl-list">${list.map(x=>plItemHTML(x.o,x.s,cls)).join("")}</div>`:"";
    h+=sec("Overdue",over)+sec("Due this week",wk)+sec("Next 30 days",mo);
    if(!over.length&&!wk.length&&!mo.length)h+=`<div class="card empty">${ic("circlecheck")}<b>Nothing due in the next 30 days</b>${PLF==="all"?"":"for this filter"}</div>`;
    if(later.length)h+=`<details class="pl-more"><summary><h2>Later <span class="cnt">${later.length}</span></h2></summary><div class="pl-list">${later.map(x=>plItemHTML(x.o,x.s)).join("")}</div></details>`;
    if(req.length)h+=`<details class="pl-more" open><summary><h2>As required – when triggered <span class="cnt">${req.length}</span></h2></summary><div class="pl-list">${req.map(x=>plItemHTML(x.o,x.s)).join("")}</div></details>`;
    const off=all.filter(o=>o.status!=="Active");if(off.length)h+=`<details class="pl-more"><summary><h2>Retired or finished <span class="cnt">${off.length}</span></h2></summary><div class="pl-list">${off.map(o=>plItemHTML(o,plState(o))).join("")}</div></details>`;
    const log=(PLAN.log||[]).slice(0,8);
    if(log.length)h+=`<h2>Recently done</h2><div class="card pl-log">${log.map(x=>`<div><span>${ic(/^Form/.test(x.how)?"clipboard":"check","s")} <b>${esc(x.title)}</b><small>${esc(fmtD(x.date))} · ${esc(x.by||"")} · ${esc(x.how)}</small></span></div>`).join("")}</div>`;
    h+=`<p class="foot">Emailed to you between 5 and 6 am when items are due. Owners with a Genus email get their own items on the day the reminder starts, the day before, on the day and while overdue.<br>Register kept in the PARRON project log (SHEQ Register sheet).</p>`;
    render(h);document.querySelectorAll(".pl-own .chip").forEach(c=>c.onclick=()=>{PLF=c.dataset.k;draw()})};
  draw();plRefresh().then(ch=>{if(ch&&!stale(seq)&&location.hash==="#planner")draw()})}
let PL_START=false;
function plItemHTML(o,s){const who=teamBy(o.owner);
  return `<div class="card tap pl-item ${s.k}" role="button" tabindex="0" onclick="plDetail('${esc(o.id)}')" onkeydown="if(event.key==='Enter')plDetail('${esc(o.id)}')">
    <div class="x"><b>${esc(o.title)}</b><span>${[o.source,plEveryLabel(o.every),(o.owner||"SHE Manager")+(who&&who.role&&!nameEq(who.role,o.owner)?` (${who.role})`:"")].filter(Boolean).map(esc).join(" · ")}</span>
    ${o.form?`<span class="pl-form">${ic("clipboard","s")} Sending form ${esc(pad(+o.form))} ticks this off</span>`:""}</div>
    <div class="r"><span class="pl-due">${esc(o.status==="Active"?plDueTxt(o):o.status)}</span>${o.status==="Active"&&o.every!=="As required"?`<button class="btn ok s" onclick="event.stopPropagation();plDone('${esc(o.id)}')">${ic("check","s")} Done</button>`:o.status==="Active"?`<button class="btn g s" onclick="event.stopPropagation();plDone('${esc(o.id)}')">${ic("check","s")} Record</button>`:""}</div></div>`}
function plDetail(id){const o=(PLAN.items||[]).find(x=>x.id===id);if(!o)return;const who=teamBy(o.owner);const t=o.form?tabByNum(+o.form):null;
  const log=(PLAN.log||[]).filter(x=>x.id===id).slice(0,8);
  const ev=s=>esc(s).replace(/(https:\/\/[^\s]+)/g,u=>`<a href="${u}" target="_blank" rel="noopener">open</a>`);
  const s=sheet(`<h3>${esc(o.title)}</h3><dl class="pl-kv">
    <dt>Source</dt><dd>${esc(o.source||"–")}</dd><dt>Frequency</dt><dd>${esc(plEveryLabel(o.every))}${o.lead?` · reminder ${o.lead} day${o.lead>1?"s":""} before`:""}</dd>
    <dt>Owner</dt><dd>${esc(o.owner||"SHE Manager")}${who?` – ${esc(who.role)}`:""}${o.ownerEmail&&!nameEq(o.ownerEmail,CONFIG.recipient)?` · emailed`:""}</dd>
    ${o.form?`<dt>Completes when</dt><dd>${t?`${pad(t.num)} – ${esc(t.short)}`:`Form ${esc(o.form)}`} is sent</dd>`:""}
    <dt>Next due</dt><dd>${esc(o.status==="Active"?plDueTxt(o):o.status)}</dd><dt>Last done</dt><dd>${o.last?esc(fmtD(o.last)):"–"}${o.evidence?` · ${ev(o.evidence)}`:""}</dd>
    ${o.notes?`<dt>Notes</dt><dd>${esc(o.notes)}</dd>`:""}<dt>Approved</dt><dd>${esc(o.approvedBy||"")} · ${esc(fmtD(o.approved))} · ${esc(o.id)}</dd></dl>
    ${log.length?`<h4 class="pl-h4">History</h4><div class="pl-log">${log.map(x=>`<div><span><b>${esc(fmtD(x.date))}</b><small>${esc(x.by||"")} · ${esc(x.how)}${x.evidence?` · ${ev(x.evidence)}`:""}</small></span></div>`).join("")}</div>`:""}
    <div class="row2">${o.status==="Active"?`<button class="btn ok" id="plD">${ic("check","s")} Mark done</button>`:`<button class="btn g" id="plR">${ic("reopen","s")} Make active</button>`}<button class="btn g" id="plE">${ic("edit","s")} Edit</button></div>
    ${o.status==="Active"?`<button class="btn g w" id="plX">${ic("x","s")} Retire this item</button>`:""}`);
  const b=k=>s.querySelector(k);if(b("#plD"))b("#plD").onclick=()=>plDone(id);b("#plE").onclick=()=>plEdit(id);
  if(b("#plX"))b("#plX").onclick=async()=>{if(!await ask2("Retire this item?","It stops showing as due and nobody is reminded. It stays in the register and can be made active again.","Retire"))return;if(await plSend({action:"saveOb",item:{...o,status:"Retired"}},"Item retired"))viewPlanner()};
  if(b("#plR"))b("#plR").onclick=async()=>{closeSheet();if(await plSend({action:"saveOb",item:{...o,status:"Active"}},"Item active again"))viewPlanner()}}
function plDone(id){const o=(PLAN.items||[]).find(x=>x.id===id);if(!o)return;
  const s=sheet(`<h3>${ic("check","s")} ${esc(o.title)}</h3><p class="muted">${o.every==="As required"?"Record that this was done.":`Next due moves on ${esc(plEveryLabel(o.every).toLowerCase())} from the date done.`}</p>
    <label class="f" for="plDd">Date done</label><input class="t" id="plDd" type="date" max="${todayISO()}" value="${todayISO()}">
    <label class="f" for="plDe">Evidence <span class="muted">· optional – report number, link or where the record is kept</span></label><input class="t" id="plDe" maxlength="500" placeholder="e.g. Drill record in site office folder">
    <button class="btn ok w" id="plDs">${ic("check","s")} Record as done</button>`);
  s.querySelector("#plDs").onclick=async()=>{const b=s.querySelector("#plDs");b.disabled=true;
    const r=await plSend({action:"doneOb",id,date:s.querySelector("#plDd").value,evidence:s.querySelector("#plDe").value.trim()});b.disabled=false;
    if(r){closeSheet();const n=(PLAN.items||[]).find(x=>x.id===id);celebrate("Done",n&&n.due&&n.every!=="As required"&&n.status==="Active"?`Next due ${fmtD(n.due)}`:"Recorded");if(location.hash==="#planner")viewPlanner()}}}
/* add or edit one item */
function plEdit(id){const o=(PLAN.items||[]).find(x=>x.id===id)||{title:"",source:"",every:"1 month",owner:plMe(),lead:7,form:"",due:"",notes:"",status:"Active"};
  const fq=PL_FREQ.some(f=>f[0]===o.every)?PL_FREQ:PL_FREQ.concat([[o.every,plEveryLabel(o.every)]]);
  const s=sheet(`<h3>${id?"Edit item":"Add an item"}</h3>
    <label class="f" for="peT">Obligation <span class="req">*</span></label><input class="t" id="peT" maxlength="120" value="${esc(o.title)}" placeholder="e.g. Site evacuation drill">
    <label class="f" for="peS">Source – plan and clause</label><input class="t" id="peS" maxlength="120" value="${esc(o.source)}" placeholder="e.g. ERP J1084-HSE-PLN-YMT-0002 §6.4">
    <div class="grid2"><div><label class="f" for="peF">Frequency</label><select class="t" id="peF">${fq.map(([k,l])=>`<option value="${esc(k)}" ${k===o.every?"selected":""}>${esc(l)}</option>`).join("")}</select></div>
     <div><label class="f" for="peD">Next due</label><input class="t" id="peD" type="date" value="${esc(o.due||"")}"></div></div>
    <label class="f" for="peO">Owner</label><select class="t" id="peO">${TEAM.map(p=>`<option value="${esc(p.name)}" ${nameEq(p.name,o.owner)?"selected":""}>${esc(p.name)} – ${esc(p.role)}</option>`).join("")}${o.owner&&!teamBy(o.owner)?`<option selected value="${esc(o.owner)}">${esc(o.owner)}</option>`:""}</select>
    <div class="grid2"><div><label class="f" for="peL">Remind days before</label><input class="t" id="peL" type="number" min="0" max="365" inputmode="numeric" value="${esc(o.lead)}"></div>
     <div><label class="f" for="peP">Ticked off by form</label><select class="t" id="peP"><option value="">– none –</option>${TABS.filter(t=>!t.retired).map(t=>`<option value="${t.num}" ${String(t.num)===String(o.form)?"selected":""}>${pad(t.num)} – ${esc(t.short)}</option>`).join("")}</select></div></div>
    <label class="f" for="peN">Notes</label><input class="t" id="peN" maxlength="1000" value="${esc(o.notes)}">
    <button class="btn o w" id="peOk">${ic("check","s")} ${id?"Save changes":"Approve and add"}</button>`);
  const v=k=>s.querySelector(k).value.trim();
  s.querySelector("#peF").onchange=()=>{const f=v("#peF");if(!id)s.querySelector("#peL").value=plLead(f);if(!v("#peD")&&f!=="As required")s.querySelector("#peD").value=f==="Once"?"":plAddEvery(todayISO(),f)};
  s.querySelector("#peOk").onclick=async()=>{const title=v("#peT");if(!title){toast("Name the obligation",3000);return}const every=v("#peF");
    if(every==="Once"&&!v("#peD")){toast("A one-off item needs a due date",3500);return}
    const p=plOwner(v("#peO"));const b=s.querySelector("#peOk");b.disabled=true;
    const r=await plSend({action:"saveOb",item:{id:id||"",title,source:v("#peS"),every,owner:p.owner,ownerEmail:p.email,lead:+v("#peL")||0,form:v("#peP"),due:every==="As required"?v("#peD"):v("#peD")||plAddEvery(todayISO(),every),notes:v("#peN"),status:o.status||"Active"}},id?"Saved":"Added to the register");
    b.disabled=false;if(r){closeSheet();viewPlanner()}}}

/* ---------- import: paste the table from the Claude Project (or the suggested list), check, approve ---------- */
const PL_COLS=["Obligation","Source","Frequency","Owner","PARRON form","Remind days before","First due","Notes"];
const PL_SUGGESTED=`| ${PL_COLS.join(" | ")} |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Weekly DG store inspection | HSDG §21 | Weekly | SHE Advisor | 18 | 2 | | Inspection 18 – Hazardous Chemicals & DG |
| Weekly environmental inspection | PARRON form 20 (check the CEMP) | Weekly | SHE Advisor | 20 | 2 | | Confirm the owner – Environmental Lead? |
| Firefighting water trailer – weekly pre-start | BFMP Rev 1 App B Tables 26–27 | Weekly | Trade Assistant | 22 | 1 | | |
| Monthly road condition check | TMP Table 11; Sch 2 §5.3(b) | Monthly | SHE Manager | 26 | 7 | | With the Construction Manager – results in the Monthly Progress Report |
| Spill kit inspection – all locations | HSDG MP §Spill; CEMP Table 19; ERP Table 12 | Monthly | SHE Advisor | 27 | 7 | | Also after every use |`;
function plDate(s){s=String(s||"").trim();let m=s.match(/^(\d{4})-(\d\d)-(\d\d)$/);if(m)return s;m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${pad(m[2])}-${pad(m[1])}`:""}
function plParse(text){const out=[];
  String(text||"").split(/\r?\n/).forEach(line=>{const s=line.trim();if(!s.includes("|")||/^```/.test(s))return;
    const c=s.replace(/^\|/,"").replace(/\|$/,"").split("|").map(x=>x.trim().replace(/^\*\*|\*\*$/g,"").replace(/[<>]/g,""));
    if(c.every(x=>!x||/^:?-{2,}:?$/.test(x))||/^obligation$/i.test(c[0]))return;
    const [title,source,freq,owner,form,lead,first,notes]=c;const r={title:(title||"").slice(0,120),source:(source||"").slice(0,120),freq:freq||"",notes:(notes||"").slice(0,1000),warn:[],err:""};
    r.every=plEvery(freq);if(!r.title)r.err="No obligation name";else if(!r.every)r.err=`Frequency "${freq||"blank"}" not understood – use e.g. Weekly, Monthly, Every 3 months, Yearly, As required or Once`;
    const p=plOwner(owner||"SHE Manager");r.owner=p.owner;r.ownerEmail=p.email;r.role=p.role;if(owner&&!p.role&&!p.email)r.warn.push(`"${owner}" isn't on the team list – only you are reminded`);
    const fn=(String(form||"").match(/\d{1,3}/)||[])[0];r.form=fn&&tabByNum(+fn)?String(+fn):"";if(fn&&!r.form)r.warn.push(`Form ${fn} isn't in PARRON – not linked`);
    r.lead=/^\d+$/.test(String(lead||"").trim())?Math.min(365,+lead):plLead(r.every);
    r.due=plDate(first);if(first&&!r.due)r.warn.push(`First due "${first}" not understood`);
    if(!r.due&&r.every&&r.every!=="As required"){if(r.every==="Once"){if(!r.err)r.err="A one-off item needs a first due date"}else{r.due=plAddEvery(todayISO(),r.every);r.est=true}}
    r.dup=(PLAN.items||[]).some(o=>o.status!=="Retired"&&nameEq(o.title,r.title));
    out.push(r)});
  return out}
function plImport(){setHeader("Import obligations","Check and approve – nothing reminds anyone until you do",{icon:"back",aria:"Back",fn:()=>go("#planner")});
  if(!isManager()){render(PL_LOCKED());return}
  render(`<div class="card pl-steps"><ol class="steps">
     <li>In your Claude Project (with the plans), paste the <b>SHEQ obligations prompt</b>. <button class="btn g s" onclick="copyText(PL_PROMPT,'Prompt')">${ic("copy","s")} Copy the prompt</button></li>
     <li>Copy the table Claude gives you and paste it below.</li>
     <li>Check each item, untick anything you don't want, and approve.</li></ol></div>
    <label class="f" for="plTxt">Paste the table</label><textarea class="t pl-txt" id="plTxt" rows="8" placeholder="${esc(PL_COLS.join(" | "))}"></textarea>
    <div class="pl-tools"><button class="btn o s" id="plRead">${ic("search","s")} Check the list</button><button class="btn g s" id="plSug">${ic("clipboard","s")} Suggested items from PARRON forms</button></div>
    <div id="plRows"></div>`);
  const ta=$("#plTxt");if(PL_START){PL_START=false;ta.value=PL_SUGGESTED;setTimeout(()=>plCheck(),0)}
  $("#plSug").onclick=()=>{ta.value=PL_SUGGESTED;plCheck()};$("#plRead").onclick=plCheck}
let PL_ROWS=[];
function plCheck(){PL_ROWS=plParse($("#plTxt").value);const box=$("#plRows");
  if(!PL_ROWS.length){box.innerHTML=`<div class="alert org">${ic("alert")}<div>No rows found. Paste the table with one item per line and the columns separated by <b>|</b>.</div></div>`;return}
  const ok=PL_ROWS.filter(r=>!r.err);
  box.innerHTML=`<h2>Found ${PL_ROWS.length} item${PL_ROWS.length>1?"s":""} <span class="grow"></span><button class="lnk" type="button" onclick="document.querySelectorAll('.pl-imp input[type=checkbox]:not(:disabled)').forEach(x=>x.checked=true);plCount()">Tick all</button></h2>
    ${PL_ROWS.map((r,i)=>`<label class="card pl-imp ${r.err?"bad":""}"><input type="checkbox" data-i="${i}" ${r.err?"disabled":r.dup?"":"checked"} onchange="plCount()">
      <span class="x"><b>${esc(r.title||"(no name)")}</b><small>${[r.source,r.every?plEveryLabel(r.every):r.freq].filter(Boolean).map(esc).join(" · ")}</small>
      <small>${ic("user","s")} ${esc(r.owner)}${r.role?` (${esc(r.role)})`:""}${r.ownerEmail&&!nameEq(r.ownerEmail,CONFIG.recipient)?" · emailed":""}${r.form?` · ${ic("clipboard","s")} form ${esc(pad(+r.form))} ticks it off`:""}${r.every&&r.every!=="As required"?` · remind ${r.lead} day${r.lead===1?"":"s"} before`:""}</small>
      ${r.every&&r.every!=="As required"&&!r.err?`<span class="pl-first">First due <input type="date" class="t" data-d="${i}" value="${esc(r.due)}">${r.est?`<em>estimated – check</em>`:""}</span>`:""}
      ${r.err?`<em class="pl-err">${esc(r.err)}</em>`:""}${r.dup?`<em class="pl-warn">Already in the register – ticked off by default</em>`:""}${r.warn.map(w=>`<em class="pl-warn">${esc(w)}</em>`).join("")}</span></label>`).join("")}
    <button class="btn o w" id="plAdd">${ic("check","s")} Approve and add</button>
    <p class="muted" style="text-align:center">${ok.length} can be added. You can edit or retire any item later.</p>`;
  box.querySelectorAll("[data-d]").forEach(x=>x.onchange=()=>{const r=PL_ROWS[+x.dataset.d];r.due=x.value;r.est=false});
  $("#plAdd").onclick=plApprove;plCount()}
function plCount(){const n=document.querySelectorAll(".pl-imp input[type=checkbox]:checked").length;const b=$("#plAdd");if(b){b.disabled=!n;b.innerHTML=`${ic("check","s")} Approve and add ${n} item${n===1?"":"s"}`}}
async function plApprove(){const pick=[...document.querySelectorAll(".pl-imp input[type=checkbox]:checked")].map(x=>PL_ROWS[+x.dataset.i]);if(!pick.length)return;
  const bad=pick.find(r=>r.every==="Once"&&!r.due);if(bad){toast(`"${bad.title}" needs a first due date`,4000);return}
  const b=$("#plAdd");b.disabled=true;b.innerHTML='<span class="sending"><span class="spin"></span>Adding…</span>';
  const r=await plSend({action:"importOb",items:pick.map(x=>({title:x.title,source:x.source,every:x.every,owner:x.owner,ownerEmail:x.ownerEmail,lead:x.lead,form:x.form,due:x.due,notes:x.notes}))});
  if(!r){plCount();return}
  celebrate("Register updated",`${r.added} item${r.added===1?"":"s"} approved${(r.skipped||[]).length?` · ${r.skipped.length} skipped`:""}`);go("#planner")}

/* the prompt for the SHE Manager's Claude Project (also in docs/CLAUDE_PROJECT_PROMPTS.md) */
const PL_PROMPT=`Using only the project documents in this Project (WHSMP, BFMP, ERP, HSDG, TMP/VMP, CEMP/EMP, SSMP and any other plans), list every recurring or scheduled SHEQ obligation the SHE Manager, SHE Advisor, Environmental Lead or supervisors must complete – inspections, audits, reviews, drills and exercises, reports, meetings, re-prints and re-issues, register checks, testing and tagging, and licence or competency checks.

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
Do not use the | character inside a cell.`;
