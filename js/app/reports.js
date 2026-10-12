"use strict";
/* ---------- Hazard & positive reports – browse and open what has been submitted ----------
   Read from the shared project log (relay action=reports); photos are fetched one at a time when a report is opened.
   With an older relay the list falls back to the summary held in Insights (no photos / immediate action). */
let REPS=lsJ("reps",{at:0,list:[],full:false});const REPF={f:"all",q:""};const REP_PH={};
async function repsRefresh(force){if(!directOn()||navigator.onLine===false)return false;if(!force&&Date.now()-(REPS.at||0)<60e3)return false;
  try{const r=await fetch(relayQ("action=reports"),{redirect:"follow"});const j=await r.json();if(j.needCode){askSiteCode();return false}
    let list,full=true;
    if(j.ok&&Array.isArray(j.reports))list=j.reports;
    else{full=false;const m0=monthKey(new Date()),d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);const m1=monthKey(d);   // older relay: use the Insights summary
      const js=await Promise.all([m0,m1].map(m=>fetch(relayQ(`action=dashboard&month=${m}`),{redirect:"follow"}).then(x=>x.json()).catch(()=>({}))));
      const seen=new Set();list=js.flatMap(x=>x.obs||[]).filter(o=>{const k=o.reportId+o.at;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>String(b.at).localeCompare(String(a.at)))}
    const ch=JSON.stringify(list)!==JSON.stringify(REPS.list);REPS={at:Date.now(),list,full};try{ls("reps",JSON.stringify(REPS))}catch(e){}return ch}
  catch(e){console.warn("reports",e);return false}}
const repFid=r=>`${r.reportId}|HZ`;
function repAction(r){return r.type==="hazard"?findF(repFid(r)):null}
function repStatus(r){if(r.type!=="hazard")return `<span class="pill ver">${ic("star","s")} Positive</span>`;const f=repAction(r);
  if(f)return statusPill(f);return r.status===ST.spot?`<span class="pill spot">Fixed on the spot</span>`:`<span class="pill open">Open</span>`}
async function viewReports(id){setHeader("Hazard & positive reports","Submitted from site – whole project",{icon:"refresh",aria:"Refresh",fn:async()=>{toast("Refreshing…",1200);await repsRefresh(true);viewReports(id)}});
  const seq=ROUTE_SEQ;if(!REPS.at&&directOn()){render(`<div class="skel" style="height:90px"></div><div class="skel"></div><div class="skel"></div>`);await Promise.all([repsRefresh(true),regRefresh()]);if(stale(seq))return}
  if(id){repDetail(decodeURIComponent(id));return}drawReports();
  Promise.all([repsRefresh(),regRefresh()]).then(r=>{if(r.some(Boolean)&&location.hash==="#reports"&&!stale(seq))drawReports()})}
const REP_FILTERS=[["all","All",()=>true],["hazard","Hazards",r=>r.type==="hazard"],["openhz","Open hazards",r=>r.type==="hazard"&&(repAction(r)?isOpen(repAction(r)):r.status===ST.open)],["positive","Positive",r=>r.type==="positive"]];
function drawReports(){const all=REPS.list||[];const q=REPF.q.trim().toLowerCase();const flt=REP_FILTERS.find(x=>x[0]===REPF.f)||REP_FILTERS[0];
  const list=all.filter(r=>flt[2](r)&&(!q||[r.description,r.location,r.name,r.reportId,r.owner,r.category,r.recognised].join(" ").toLowerCase().includes(q)));
  let h=actTabs("reports");
  if(!directOn())h+=`<div class="alert org">${ic("wifioff")}<div>Direct send is not set up, so submitted reports can't be shown here.</div></div>`;
  else if(REPS.at&&!REPS.full)h+=`<div class="alert blue">${ic("info")}<div>Showing the last two months without photos. <b>Update the relay script</b> to see every report with its photos and immediate action.</div></div>`;
  h+=`<div class="search">${ic("search")}<input id="repq" type="search" placeholder="Search hazards, locations, people" value="${esc(REPF.q)}" autocomplete="off" aria-label="Search reports"></div>
   <div class="chips scroll">${REP_FILTERS.map(([k,l,fn])=>`<button class="chip ${REPF.f===k?"on":""}" onclick="REPF.f='${k}';drawReports()">${l}<span class="c">${all.filter(fn).length}</span></button>`).join("")}</div>
   <h2>${esc(flt[1])} <span class="cnt">${list.length}</span></h2>`;
  if(!list.length)h+=`<div class="card empty">${ic(all.length?"search":"alert")}<b>${all.length?"Nothing matches":"No reports yet"}</b>${all.length?"Try a different filter or search.":"Hazard reports and positive observations sent from site appear here."}</div>`;
  h+=`<div class="replist">`+list.slice(0,200).map((r,i)=>{const H=r.type==="hazard";const lv=riskLevel(r.level);
    return `<div class="card tap rep ${H?"hz":"po"}" style="--rc:${H?(lv?lv.color:"var(--ua)"):"var(--c)"}" onclick="go('#reports/${encodeURIComponent(r.reportId)}')" role="button" tabindex="0">
     <div class="top">${repStatus(r)}${H&&r.level?levelChip(r.level):""}${(r.photos||[]).length?`<span class="tag">${ic("camera","s")} ${r.photos.length}</span>`:""}<span class="grow"></span><small class="muted">${esc(ago(r.at))}</small></div>
     <div class="ttl">${esc(r.description||"")}</div>
     <div class="foot2"><span>${ic("pin","s")} ${esc(r.location||"-")}</span><span>${ic("user","s")} ${esc(r.name||"-")}</span>${!H&&r.recognised?`<span>${ic("star","s")} ${esc(r.recognised)}</span>`:""}</div></div>`}).join("")+`</div>`;
  if(list.length>200)h+=`<p class="muted" style="text-align:center">Showing the newest 200 – use search to narrow down.</p>`;
  render(h);const i=$("#repq");i.addEventListener("input",()=>{REPF.q=i.value;clearTimeout(i._t);i._t=setTimeout(()=>{drawReports();const j=$("#repq");j.focus();j.setSelectionRange(j.value.length,j.value.length)},250)})}
/* tabs shared by the Action register and the reports list */
function actTabs(on){return `<div class="seg acttabs" role="tablist"><button class="${on==="actions"?"on":""}" role="tab" aria-selected="${on==="actions"}" onclick="go('#actions')">${ic("actions","s")} Actions</button><button class="${on==="reports"?"on":""}" role="tab" aria-selected="${on==="reports"}" onclick="go('#reports')">${ic("alert","s")} Reports</button></div>`}
function repDetail(rid){const r=(REPS.list||[]).find(x=>x.reportId===rid);if(!r){render(`${actTabs("reports")}<div class="card empty">${ic("search")}<b>Report not found</b>It may be older than 13 months, or still in someone's Outbox.</div>`);return}
  const H=r.type==="hazard";const f=repAction(r);const k=H?riskOf(r.cons,r.like):null;
  setHeader(H?"Hazard report":"Positive observation",r.reportId,{icon:"back",aria:"Back to reports",fn:()=>go("#reports")});
  const row=(a,b)=>b?`<dt>${esc(a)}</dt><dd style="white-space:pre-wrap">${b}</dd>`:"";
  let h=`<div class="card rephead ${H?"hz":"po"}"><div class="libmeta" style="margin:0 0 8px">${repStatus(r)}${H&&k?riskChip(r.cons,r.like):H&&r.level?levelChip(r.level):""}</div>
   <div class="ttl">${esc(r.description||"")}</div><div class="muted" style="margin-top:6px">${ic("pin","s")} ${esc(r.location||"-")} · ${ic("user","s")} ${esc(r.name||"-")} · ${fmtDT(r.at)}</div></div>`;
  h+=`<h2>Photos <span class="cnt">${(r.photos||[]).length}</span></h2><div class="card"><div class="photos repph" id="repph">${(r.photos||[]).map((p,i)=>`<div class="ph" data-id="${esc(p)}"><div class="skel" style="height:100%;margin:0"></div></div>`).join("")||`<div class="muted">${REPS.full?"No photos were taken.":"Photos show once the relay script is updated."}</div>`}</div></div>`;
  h+=`<h2>Details</h2><div class="card"><dl class="kv">${row("Report ID",esc(r.reportId))}${H?row("Risk",k?esc(riskText(k)):esc(r.level||"")):""}${H?row("Immediate action",esc(r.immediate||"")):""}
   ${!H?row("Recognised",esc(r.recognised||"")):""}${!H?row("Category",esc(r.category||"")):""}${H?row("Status",r.status===ST.spot?"Fixed on the spot":"Action required"):""}</dl></div>`;
  if(H&&f)h+=`<h2>Corrective action</h2><div class="card tap act" style="--rc:${actLevelColor(f)}" onclick="go('#actions/${encodeURIComponent(f.fid)}')" role="button" tabindex="0"><div class="top">${statusPill(f)}<span class="grow"></span>${ic("chev","s")}</div>
    <div class="ttl">${esc(f.action||"")}</div><div class="foot2"><span>${ic("user","s")} ${esc(f.owner||"Owner TBC")}</span>${isOpen(f)?`<span class="due ${isOverdue(f)?"late":""}">${ic("cal","s")} ${esc(dueText(f.due))}</span>`:f.closedAt?`<span>${ic("check","s")} Closed ${fmtD(String(f.closedAt).slice(0,10))}</span>`:""}</div></div>`;
  else if(H&&r.status!==ST.spot)h+=`<div class="alert blue">${ic("info")}<div>The corrective action is on the Action register${r.owner?` – <b>${esc(r.owner)}</b>`:""}${r.due?`, due ${fmtD(r.due)}`:""}.</div></div>`;
  render(h);repPhotos(r)}
async function repPhotos(r){for(const id of (r.photos||[])){const box=document.querySelector(`#repph .ph[data-id="${CSS.escape(id)}"]`);if(!box)return;
  try{if(!REP_PH[id]){const x=await fetch(relayQ(`action=photo&id=${encodeURIComponent(id)}`),{redirect:"follow"}).then(y=>y.json());if(x.needCode){askSiteCode();return}if(!x.ok)throw new Error(x.error);REP_PH[id]=`data:${x.type};base64,${x.data}`}
    const b=document.querySelector(`#repph .ph[data-id="${CSS.escape(id)}"]`);if(b)b.innerHTML=`<img src="${REP_PH[id]}" alt="Report photo" onclick="zoomImg(this.src)">`}
  catch(e){const b=document.querySelector(`#repph .ph[data-id="${CSS.escape(id)}"]`);if(b)b.innerHTML=`<div class="muted" style="padding:8px;font-size:12px">${navigator.onLine===false?"Offline":"Could not load"}</div>`}}}
