"use strict";
/* ---------- Corrective action register ---------- */
let ACTF={f:"open",q:"",mine:false};
const ACT_FILTERS=[["open","Open",f=>isOpen(f)],["overdue","Overdue",isOverdue],["high","High / Critical",f=>isOpen(f)&&(f.level==="High"||f.level==="Critical")],["week","Due ≤ 7 days",f=>{const n=daysTo(f.due);return isOpen(f)&&n!==null&&n>=0&&n<=7}],
  ["verify","To verify",f=>f.status===ST.closed],["closed","Closed",f=>f.status!==ST.open],["all","All",()=>true]];
const statusPill=f=>f.status===ST.open?(isOverdue(f)?`<span class="pill ua">Overdue</span>`:`<span class="pill open">Open</span>`):f.status===ST.closed?`<span class="pill closed">Closed · to verify</span>`:f.status===ST.verified?`<span class="pill ver">${ic("check","s")} Verified</span>`:`<span class="pill spot">Closed on spot</span>`;
function actLevelColor(f){const lv=riskLevel(f.level);return lv?lv.color:f.rating==="UA"?"var(--ua)":"var(--ni)"}
async function viewActions(fid){setHeader("Action register","Corrective actions – whole project",{icon:"refresh",aria:"Refresh",fn:async()=>{toast("Refreshing…",1200);await regRefresh(true);viewActions()}});
  const seq=ROUTE_SEQ;await loadLocalSent();await regFresh(seq);if(stale(seq))return;drawActions();
  if(fid){if(!findF(fid)&&directOn()){await regRefresh(true);if(stale(seq))return;drawActions()}
    if(findF(fid))actDetail(fid);else if(RELAY.url)toast("Action not found – it may have been removed",4000)}
  regRefresh().then(ch=>{if(ch&&location.hash.startsWith("#actions"))drawActions()})}
function drawActions(){const all=regAll();const st=regStats(all);const q=ACTF.q.trim().toLowerCase();
  const flt=ACT_FILTERS.find(x=>x[0]===ACTF.f)||ACT_FILTERS[0];
  const list=all.filter(f=>flt[2](f)&&(!ACTF.mine||isMine(f))&&(!q||[f.text,f.finding,f.action,f.owner,f.location,f.title,f.reportId,f.by,f.item].join(" ").toLowerCase().includes(q)))
    .sort((a,b)=>ACTF.f==="closed"?String(b.closedAt||b.verifiedAt||"").localeCompare(String(a.closedAt||a.verifiedAt||"")):(daysTo(a.due)??9999)-(daysTo(b.due)??9999)||(+b.score||0)-(+a.score||0));
  let h=actTabs("actions");
  if(directOn()&&REG.v&&REG.v<3)h+=`<div class="alert org">${ic("info")}<div><b>Showing actions raised on this phone only.</b> Update the relay script to v3 to share the register across the whole project (see the deployment guide).</div></div>`;
  if(!directOn())h+=`<div class="alert org">${ic("wifioff")}<div>Direct send is not set up, so the register shows actions raised on this phone only.</div></div>`;
  h+=`<div class="kpis">
   <button class="kpi" style="--kc:var(--ua)" onclick="ACTF.f='open';drawActions()"><div class="l">${ic("actions","s")} OPEN</div><div class="v">${st.open}</div><div class="d">${st.highOpen} high / critical</div></button>
   <button class="kpi" style="--kc:var(--ua)" onclick="ACTF.f='overdue';drawActions()"><div class="l">${ic("clock","s")} OVERDUE</div><div class="v" style="color:${st.overdue?"var(--ua)":"inherit"}">${st.overdue}</div><div class="d">${st.dueWeek} due in 7 days</div></button>
   <button class="kpi" style="--kc:var(--ni)" onclick="ACTF.f='verify';drawActions()"><div class="l">${ic("shield","s")} TO VERIFY</div><div class="v">${st.toVerify}</div><div class="d">${st.verified} verified</div></button>
   <div class="kpi" style="--kc:var(--c)"><div class="l">${ic("trend","s")} AVG CLOSE</div><div class="v">${st.avgClose===null?"–":st.avgClose}<small>${st.avgClose===null?"":" days"}</small></div><div class="d">${st.spot} closed on the spot</div></div></div>`;
  h+=`<div class="search">${ic("search")}<input id="actq" type="search" placeholder="Search actions, people, locations" value="${esc(ACTF.q)}" autocomplete="off" aria-label="Search actions"></div>
   <div class="chips scroll">${ACT_FILTERS.map(([k,l,fn])=>`<button class="chip ${ACTF.f===k?"on":""}" onclick="ACTF.f='${k}';drawActions()">${l}<span class="c">${all.filter(fn).length}</span></button>`).join("")}
   <button class="chip ${ACTF.mine?"on":""}" onclick="ACTF.mine=!ACTF.mine;drawActions()">${ic("user","s")} Mine</button></div>`;
  h+=`<h2>${esc(flt[1])} <span class="cnt">${list.length}</span><span class="grow"></span>${list.length?`<button class="linkbtn" onclick="exportActions()">${ic("download","s")} CSV</button>`:""}</h2>`;
  if(!list.length)h+=`<div class="card empty">${ic(all.length?"circlecheck":"actions")}<b>${all.length?"Nothing here":"No actions yet"}</b>${all.length?"No actions match this filter.":"Open non-compliances from sent inspections appear here to be tracked to close-out."}</div>`;
  list.slice(0,300).forEach(f=>{const late=isOverdue(f);const soon=isOpen(f)&&!late&&daysTo(f.due)!==null&&daysTo(f.due)<=3;
    h+=`<div class="card tap act" style="--rc:${actLevelColor(f)}" onclick="actDetail('${esc(f.fid)}')" role="button" tabindex="0">
     <div class="top">${statusPill(f)}${f.level?levelChip(f.level):`<span class="pill ${f.rating==="UA"?"ua":"ni"}">${esc(f.rating)}</span>`}${f.snn?`<span class="tag o">${ic("shield","s")} SNN</span>`:""}<span class="grow"></span>${f.pending?`<span class="tag">${ic("refresh","s")} Syncing</span>`:""}</div>
     <div class="ttl">${esc(f.action||f.finding||f.text)}</div><div class="what">${esc(f.finding||"")}</div>
     <div class="foot2"><span>${ic("user","s")} ${esc(f.owner||"Owner TBC")}</span>${isOpen(f)?`<span class="due ${late?"late":soon?"soon":""}">${ic("cal","s")} ${esc(dueText(f.due))}</span>`:f.closedAt?`<span>${ic("check","s")} ${fmtD(String(f.closedAt).slice(0,10))}</span>`:""}<span>${ic("pin","s")} ${esc(f.location||"")}</span><span>${ic("file","s")} ${esc(f.no)} ${esc(f.title||"")}</span></div></div>`});
  if(list.length>300)h+=`<p class="muted" style="text-align:center">Showing the first 300 – use search to narrow down.</p>`;
  render(h);const i=$("#actq");i.addEventListener("input",()=>{ACTF.q=i.value;clearTimeout(i._t);i._t=setTimeout(()=>{drawActions();const j=$("#actq");j.focus();j.setSelectionRange(j.value.length,j.value.length)},250)})}
function findF(fid){return regAll().find(f=>f.fid===fid)}
function actDetail(fid){const f=findF(fid);if(!f){toast("Action not found");return}const M=isManager();
  const ev=(f.history||[]).slice().reverse().map(e=>`<div class="ev"><b>${esc({raised:"Raised",close:"Closed out",verify:"Verified",reopen:"Re-opened",edit:"Updated"}[e.op]||e.op)}</b> · ${esc(e.by||"")}${e.pending?" · waiting to sync":""}<small>${fmtDT(e.at)}</small>${e.note?`<div>${esc(e.note)}</div>`:""}</div>`).join("");
  let h=`<div class="libmeta" style="margin:0 0 8px">${statusPill(f)}${riskChip(f.cons,f.like)}<span class="pill ${f.rating==="UA"?"ua":"ni"}">${esc(f.rating)}</span>${f.snn?`<span class="tag o">${ic("shield","s")} ${esc(f.snn)}</span>`:""}</div>
   <h3>${esc(f.action||"Corrective action")}</h3>${f.item==="HZ"?`<button class="linkbtn" style="margin:-4px 0 8px" onclick="closeSheet();go('#reports/${encodeURIComponent(f.reportId||String(f.fid).split("|")[0])}')">${ic("alert","s")} Open the hazard report (photos)</button>`:""}
   <dl class="kv"><dt>Item</dt><dd><b>${esc(f.item)}</b> ${esc(f.text||"")}</dd><dt>Finding</dt><dd>${esc(f.finding||"—")}</dd>
   <dt>Owner</dt><dd>${esc(f.owner||"TBC")}${f.ownerEmail?`<div class="muted">${ic("send","s")} ${esc(f.ownerEmail)}${f.notified?` · emailed ${fmtD(String(f.notified).slice(0,10))}`:isOpen(f)&&!f.local?" · not emailed (address not allowed by the relay)":""}</div>`:isOpen(f)?`<div class="muted">No email – they were not notified</div>`:""}</dd><dt>Due</dt><dd>${f.due?`${fmtD(f.due)} · <b style="color:${isOverdue(f)?"var(--ua)":"inherit"}">${esc(dueText(f.due))}</b>`:"—"}</dd>
   <dt>Inspection</dt><dd>${esc(f.no)} ${esc(f.title||"")}</dd><dt>Location</dt><dd>${esc(f.location||"—")}${f.crew?` · ${esc(f.crew)}`:""}</dd>
   <dt>Raised</dt><dd>${esc(f.by||"")} · ${fmtD(String(f.inspDate||f.raised||"").slice(0,10))}</dd><dt>Report</dt><dd>${esc(f.reportId)}</dd>
   ${f.note?`<dt>Close-out</dt><dd>${esc(f.note)}${f.closedBy?` <span class="muted">– ${esc(f.closedBy)}</span>`:""}</dd>`:""}
   ${f.evidence?`<dt>Evidence</dt><dd><a href="${esc(f.evidence)}" target="_blank" rel="noopener">${ic("ext","s")} Open photo (Drive)</a></dd>`:""}</dl>
   ${f.localPhoto?`<img class="evph" src="${f.localPhoto}" alt="Close-out evidence">`:""}`;
  if(f.local&&directOn()&&!v3())h+=`<div class="alert blue">${ic("info")}<div>This action is stored on this phone. Changes will sync once the relay is updated to v3.</div></div>`;
  const btns=[];
  if(isOpen(f))btns.push(`<button class="btn o w" onclick="closeOutForm('${esc(fid)}')">${ic("check","s")} Close out action</button>`);
  if(M&&f.status===ST.closed)btns.push(`<button class="btn ok w" onclick="actOp('${esc(fid)}','verify')">${ic("shield","s")} Verify close-out</button>`);
  if(M&&isOpen(f))btns.push(`<button class="btn g w" onclick="editForm('${esc(fid)}')">${ic("edit","s")} Reassign / change due date</button>`);
  if(M&&(f.status===ST.closed||f.status===ST.verified))btns.push(`<button class="btn g w" onclick="actOp('${esc(fid)}','reopen')">${ic("reopen","s")} Re-open</button>`);
  if(!M&&f.status===ST.closed)h+=`<p class="muted">${ic("lock","s")} The SHE Manager verifies close-outs (Manager mode).</p>`;
  h+=btns.join("");
  if(ev)h+=`<h2 style="margin-top:20px">History</h2><div class="timeline">${ev}</div>`;
  sheet(h)}
function closeOutForm(fid){const f=findF(fid);let photo="";
  const s=sheet(`<h3>Close out action</h3><p class="muted">${esc(f.action||"")}</p>
   <label class="f" for="coBy">Closed out by <span class="req">*</span></label><input class="t" id="coBy" value="${esc(ls("inspector")||"")}" autocomplete="name">
   <label class="f" for="coNote">What was done <span class="req">*</span></label><textarea class="t" id="coNote" placeholder="Describe the action taken and the control now in place"></textarea>
   <label class="f">Evidence photo (recommended)</label><div id="coPh"></div>
   <div class="pbtns"><label class="addph">${ic("camera","s")} Take photo<input type="file" accept="image/*" capture="environment" class="hide" id="coCam"></label><label class="addph">${ic("image","s")} Upload<input type="file" accept="image/*" class="hide" id="coUp"></label></div>
   <button class="btn o w" id="coGo">${ic("check","s")} Submit close-out</button>`);
  const pick=async(inp,src)=>{const file=inp.files&&inp.files[0];if(!file)return;try{const ph=await stampPhoto(file,[[`Close-out ${f.item}`,f.reportId].join("  ·  "),f.location||""],{source:src,max:1280});photo=ph.img;s.querySelector("#coPh").innerHTML=`<img class="evph" src="${photo}" alt="Evidence">`}catch(e){toast("Could not read that photo")}};
  s.querySelector("#coCam").onchange=e=>pick(e.target,"camera");s.querySelector("#coUp").onchange=e=>pick(e.target,"upload");
  s.querySelector("#coGo").onclick=async()=>{const by=s.querySelector("#coBy").value.trim(),note=s.querySelector("#coNote").value.trim();if(!by||!note){toast("Add your name and what was done");return}
    if(!ls("inspector"))ls("inspector",by);closeSheet();await queueUpdate({fid,op:"close",by,note,photo:photo?photo.split(",")[1]:""});toast(navigator.onLine===false||!v3()?"Close-out saved – it will sync when connected":"✓ Action closed out",4000);drawActions();actDetail(fid)}}
let EDIT={};
function editOwner(uid,name,email){EDIT.owner=name;EDIT.ownerEmail=email}
function editForm(fid){const f=findF(fid);EDIT={owner:f.owner||"",ownerEmail:f.ownerEmail||""};const s=sheet(`<h3>Reassign / change due date</h3>
  ${personPicker("edit",f.owner,f.ownerEmail,"editOwner")}
  <label class="f" for="edD">Due date</label><input class="t" id="edD" type="date" value="${esc(f.due||"")}">
  <p class="muted">If the person changes, the new person is emailed the action.</p><button class="btn o w" id="edGo">Save</button>`);
  s.querySelector("#edGo").onclick=async()=>{const {owner,ownerEmail}=EDIT,due=s.querySelector("#edD").value;
    if(ownerEmail&&!emailOK(ownerEmail)){toast("That email looks wrong");return}closeSheet();rememberContact(owner,ownerEmail);
    const changed=ownerEmail!==(f.ownerEmail||"")||owner!==(f.owner||"");
    await queueUpdate({fid,op:"edit",by:ls("inspector")||"SHE Manager",owner,due,ownerEmail:changed?ownerEmail:undefined,note:""});toast(changed&&ownerEmail?"Saved – they will be emailed":"Saved");drawActions();actDetail(fid)}}
async function actOp(fid,op){const lbl={verify:["Verify close-out?","Confirms the action is complete and the control is effective.","Verify"],reopen:["Re-open action?","The action returns to Open and the owner must close it again.","Re-open"]}[op];
  if(!await ask2(lbl[0],lbl[1],lbl[2],op==="reopen"))return;await queueUpdate({fid,op,by:ls("inspector")||"SHE Manager",note:""});toast(op==="verify"?"✓ Verified":"Re-opened");drawActions();actDetail(fid)}
function exportActions(){const all=regAll();const H=["Report ID","Item","Inspection","Location","Crew","Raised by","Inspection date","Rating","SNN","Consequence","Likelihood","Risk score","Risk level","Item text","Finding","Corrective action","Status","Owner","Owner email","Due","Closed at","Closed by","Close-out note","Verified at","Verified by"];
  const rows=all.map(f=>[f.reportId,f.item,`${f.no} ${f.title||""}`,f.location,f.crew,f.by,f.inspDate,f.rating,f.snn,f.cons,f.like,f.score,f.level,f.text,f.finding,f.action,f.status,f.owner,f.ownerEmail,f.due,String(f.closedAt||"").slice(0,10),f.closedBy,f.note,String(f.verifiedAt||"").slice(0,10),f.verifiedBy]);
  downloadBlob(new Blob([toCSV([H,...rows])],{type:"text/csv"}),`PARRON-action-register-${todayISO()}.csv`);toast("Register exported")}
