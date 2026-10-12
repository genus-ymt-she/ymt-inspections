"use strict";
/* ---------- SHEQ Alerts – read and acknowledge ----------
   The SHE Manager publishes an alert (Manager mode) and ticks who must acknowledge it (everyone on site, or chosen people).
   It stays at the top of their Home screen until they tap "I have read and understood"; the relay keeps the register.
   Acknowledgements made with no signal wait on the phone. */
let ALERTS=lsJ("alerts",{at:0,alerts:[]});
let ACKQ=lsJ("ackQ",[]);
const AL_SEEN=new Set();   // critical pop-ups already shown since the app was opened
const AL_TYPES=["SHEQ Alert","Lesson learned","Plan or procedure change","Site notice"];
const AL_PRI={Critical:"crit",Important:"imp",Info:"info"};
const nameEq=(a,b)=>String(a||"").trim().replace(/\s+/g," ").toLowerCase()===String(b||"").trim().replace(/\s+/g," ").toLowerCase();
const alMine=a=>{const me=ls("inspector")||"";return (a.acks||[]).find(x=>nameEq(x.name,me))||(ACKQ.some(q=>q.id===a.id&&nameEq(q.name,me))?{name:me,at:"",queued:true}:null)};
/* the people ticked to acknowledge it when it was published */
const alForMe=a=>!(a.required||[]).length||a.required.some(n=>nameEq(n,ls("inspector")));
const alUnread=()=>(ls("inspector")?(ALERTS.alerts||[]).filter(a=>a.active&&alForMe(a)&&!alMine(a)):[]).sort((a,b)=>(a.priority==="Critical"?0:1)-(b.priority==="Critical"?0:1)||String(b.at).localeCompare(String(a.at)));
async function alRefresh(){if(!directOn()||navigator.onLine===false)return false;
  for(const q of ACKQ.slice()){try{const r=await relayPost({payload:{action:"ackAlert",id:q.id,name:q.name}},false);if(r&&(r.ok||r.error==="Alert not found")){ACKQ=ACKQ.filter(x=>x!==q);ls("ackQ",JSON.stringify(ACKQ));if(r.ok)alStore(r)}}catch(e){break}}
  try{const r=await fetch(relayQ("action=alerts"),{redirect:"follow"});const j=await r.json();if(j.needCode){askSiteCode();return false}if(!j.ok)return false;return alStore(j)}catch(e){return false}}
function alStore(j){const before=JSON.stringify(ALERTS.alerts);ALERTS={at:Date.now(),alerts:j.alerts||[]};ls("alerts",JSON.stringify(ALERTS));
  updateBadges();return JSON.stringify(ALERTS.alerts)!==before}
const alPill=a=>`<span class="al-pill ${AL_PRI[a.priority]||"info"}">${esc(a.priority)}</span>`;
/* Home – the banner for the most important unread alert */
function alertBannerHTML(){const u=alUnread();if(!u.length)return "";const a=u[0];
  return `<button class="al-banner ${AL_PRI[a.priority]||"info"}" onclick="go('#alerts/${encodeURIComponent(a.id)}')"><span class="al-bi">${ic("bell","l")}</span>
    <span class="al-bt"><small>${esc(a.priority)} · ${esc(a.type)}${u.length>1?` · ${u.length} to read`:""}</small><b>${esc(a.title)}</b><em>Read and acknowledge ${ic("chev","s")}</em></span></button>`}
/* a Critical alert also pops up once each time the app is opened, until it is acknowledged */
function alertPopup(){const a=alUnread().find(x=>x.priority==="Critical"&&!AL_SEEN.has(x.id));if(!a||document.getElementById("sheet"))return;AL_SEEN.add(a.id);
  const s=sheet(`<div class="al-pop">${alPill(a)}<h3>${esc(a.title)}</h3><p class="muted">${esc(a.type)} · published ${esc(fmtDT(a.at))}. Please read it and acknowledge before starting work.</p>
    <button class="btn o w" id="alRead">${ic("bell","s")} Read now</button><button class="btn g w" id="alLater">Later</button></div>`);
  s.querySelector("#alRead").onclick=()=>{closeSheet();go("#alerts/"+encodeURIComponent(a.id))};s.querySelector("#alLater").onclick=closeSheet}
/* routes: #alerts · #alerts/new · #alerts/<id> */
function viewAlerts(id){if(id==="new")return alNew();if(id)return alDetail(decodeURIComponent(id));
  setHeader("SHEQ Alerts","Alerts, lessons learned and site notices",isManager()?{icon:"plus",aria:"Publish an alert",fn:()=>go("#alerts/new")}:{icon:"back",aria:"Back",fn:()=>go("#home")});const seq=ROUTE_SEQ;
  const draw=()=>{const L=ALERTS.alerts||[];const u=alUnread();const act=L.filter(a=>a.active&&!u.includes(a)),old=L.filter(a=>!a.active);
    const card=a=>{const m=alMine(a);const R=alReach(a);return `<button class="card tap al-item ${AL_PRI[a.priority]||"info"}" onclick="go('#alerts/${encodeURIComponent(a.id)}')"><div class="top">${alPill(a)}<span class="tag">${esc(a.type)}</span><span class="grow"></span><small class="muted">${esc(fmtDT(a.at).slice(0,10))}</small></div>
      <b class="ttl">${esc(a.title)}</b><div class="foot2">${m?`<span class="ok">${ic("check","s")} ${m.queued?"Acknowledged – sends with signal":"You acknowledged"}</span>`:a.active?(alForMe(a)?`<span class="late">${ic("bell","s")} To read</span>`:`<span>${ic("info","s")} For information</span>`):`<span>Closed</span>`}${isManager()?`<span>${ic("users","s")} ${R.done} of ${R.expected} acknowledged</span>`:""}</div></button>`};
    let h="";
    if(!directOn())h+=`<div class="alert org">${ic("wifioff")}<div>Direct send is not set up, so alerts can't be shown here.</div></div>`;
    if(isManager())h+=`<button class="btn o w" onclick="go('#alerts/new')">${ic("plus","s")} Publish a SHEQ Alert</button>`;
    h+=`<h2>To read <span class="cnt">${u.length}</span></h2>${u.map(card).join("")||`<div class="card empty">${ic("circlecheck")}<b>You're up to date</b>New alerts appear here and at the top of Home.</div>`}`;
    if(act.length)h+=`<h2>Active <span class="cnt">${act.length}</span></h2>${act.map(card).join("")}`;
    if(old.length)h+=`<h2>Closed <span class="cnt">${old.length}</span></h2>${old.map(card).join("")}`;
    h+=`<p class="foot">Alerts are published by the SHE Manager. Full incident details stay in MYOSH.</p>`;render(h)};
  draw();alRefresh().then(ch=>{if(ch&&!stale(seq)&&location.hash==="#alerts")draw()})}
/* how many of the people ticked have acknowledged */
function alReach(a){const exp=a.required||[];return {expected:exp.length,done:exp.filter(n=>(a.acks||[]).some(x=>nameEq(x.name,n))).length}}
function alDetail(id){const a=(ALERTS.alerts||[]).find(x=>x.id===id);const seq=ROUTE_SEQ;
  setHeader(a?a.type:"SHEQ Alert",a?`${a.id} · ${a.priority}`:id,{icon:"back",aria:"Back to alerts",fn:()=>go("#alerts")});
  if(!a){render(`<div class="card empty">${ic("bell")}<b>${navigator.onLine===false?"Open this with signal":"Loading the alert…"}</b>It shows once PARRON has fetched the latest alerts.</div>`);
    alRefresh().then(()=>{if(!stale(seq)&&(ALERTS.alerts||[]).some(x=>x.id===id))alDetail(id)});return}
  const m=alMine(a);const para=s=>esc(s||"").replace(/\n/g,"<br>");
  let h=`<div class="card al-head ${AL_PRI[a.priority]||"info"}">${alPill(a)}<h2 class="al-title">${esc(a.title)}</h2><div class="muted">${esc(a.type)} · ${esc(a.by||"SHE Manager")} · ${esc(fmtDT(a.at))}${a.active?"":" · Closed"}</div></div>
    <h2>What happened</h2><div class="card al-text">${para(a.what)}</div>`;
  if(a.must){const L=String(a.must).split(/\n+/).map(x=>x.replace(/^\s*[-•*\d.)]+\s*/,"").trim()).filter(Boolean);h+=`<h2>What you must do</h2><div class="card al-text al-must">${L.length>1?`<ul>${L.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:para(a.must)}</div>`}
  if(a.file)h+=`<h2>Attachment</h2><div class="card" id="alFile">${a.fileType==="application/pdf"?`<button class="btn g w" onclick="alOpenFile('${esc(a.file)}','application/pdf')">${ic("file","s")} Open the PDF</button>`:`<div class="skel" style="height:180px;margin:0"></div>`}</div>`;
  h+=m?`<div class="alert blue al-done">${ic("circlecheck")}<div><b>${m.queued?"Acknowledged – it records when you have signal":"You acknowledged this alert"}</b>${m.at?` ${esc(fmtDT(m.at))}`:""}</div></div>`
    :a.active?`${alForMe(a)?"":`<div class="alert blue">${ic("info")}<div>This alert is for selected people only – acknowledging is optional for you.</div></div>`}<button class="btn o w al-ack" id="alAck">${ic("check","s")} I have read and understood</button><p class="muted" style="text-align:center;margin-top:6px">Recorded as <b>${esc(ls("inspector")||"– pick your name first")}</b></p>`:"";
  if(isManager())h+=alRegisterHTML(a);
  h+=`<p class="foot">Published by the SHE Manager through PARRON. Follow the controlled documents and your Supervisor.</p>`;
  render(h);
  const b=$("#alAck");if(b)b.onclick=()=>alAck(a);
  if(a.file&&a.fileType!=="application/pdf")alOpenFile(a.file,a.fileType,true)}
async function alAck(a){let me=ls("inspector")||"";if(!me.trim()){me=await askName();if(!me)return}
  ACKQ.push({id:a.id,name:ls("inspector")});ls("ackQ",JSON.stringify(ACKQ));updateBadges();
  if(navigator.onLine===false||!directOn()){toast("Acknowledged – it records when you have signal",4000);alDetail(a.id);return}
  const b=$("#alAck");if(b){b.disabled=true;b.innerHTML='<span class="sending"><span class="spin"></span>Recording…</span>'}
  await alRefresh();celebrate("Acknowledged","Thanks for reading the alert");if(location.hash.startsWith("#alerts/"))alDetail(a.id)}
/* SHE Manager view: who has read it and who hasn't */
function alRegisterHTML(a){const acks=a.acks||[];const req=a.required||[];
  const rows=req.map(n=>{const k=acks.find(x=>nameEq(x.name,n));const t=TEAM.find(x=>nameEq(x.name,n));
    return `<div class="al-reg"><span>${esc(n)}${t?` <small class="muted">${esc(t.role)}</small>`:""}</span>${k?`<span class="al-st ok">${ic("check","s")} ${esc(fmtDT(k.at).slice(0,16))}</span>`:`<span class="al-st wait">Not yet</span>`}</div>`}).join("");
  const extra=acks.filter(x=>!req.some(n=>nameEq(n,x.name)));const S=alReach(a);const pc=S.expected?Math.round(100*S.done/S.expected):0;
  return `<h2>Acknowledgement register</h2><div class="card"><div class="row" style="display:flex;justify-content:space-between;gap:8px"><b>${S.done} of ${S.expected} acknowledged</b><span class="muted">${pc}%</span></div>
    <div class="al-prog"><i style="width:${pc}%"></i></div>${rows}
    ${extra.length?`<div class="al-reg"><span><b>Also read</b></span><span class="muted">${extra.map(x=>esc(x.name)).join(", ")}</span></div>`:""}
    <p class="muted" style="margin-top:8px">Outstanding names are listed in the 6 pm daily email until they acknowledge or you close the alert.</p></div>
    <button class="btn g w" onclick="alClose('${esc(a.id)}',${a.active?"false":"true"})">${ic(a.active?"lock":"reopen","s")} ${a.active?"Close this alert":"Re-open this alert"}</button>`}
async function alClose(id,reopen){if(!reopen&&!await ask2("Close this alert?","It comes off everyone's Home screen and the daily email. The register is kept.","Close alert"))return;
  try{const r=await relayPost({payload:{action:"closeAlert",id,reopen:!!reopen,pin:ls("mgrPin")||""}},false);if(r&&r.badPin){toast("Manager PIN not accepted – turn Manager mode on again",4500);return}
    if(!r||!r.ok)throw new Error((r&&r.error)||"Not saved");alStore(r);toast(reopen?"Alert re-opened":"Alert closed");alDetail(id)}catch(e){toast(String(e.message||e),4000)}}
async function alOpenFile(id,type,inline){const box=$("#alFile");
  try{const x=await fetch(relayQ(`action=alertFile&id=${encodeURIComponent(id)}`),{redirect:"follow"}).then(r=>r.json());if(!x.ok)throw new Error(x.error);
    if(inline){if(box)box.innerHTML=`<img class="al-img" src="data:${x.type};base64,${x.data}" alt="Alert attachment" onclick="zoomImg(this.src,true)"><div class="muted">Tap to enlarge.</div>`;return}
    const bin=atob(x.data);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([u8],{type:x.type}));const l=document.createElement("a");l.href=url;l.target="_blank";l.rel="noopener";document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),60e3)}
  catch(e){if(box&&inline)box.innerHTML=`<div class="muted">${navigator.onLine===false?"Open with signal to see the attachment.":"Could not load the attachment."}</div>`;else toast(navigator.onLine===false?"Needs signal to open the PDF":"Could not open the PDF",3500)}}
/* SHE Manager – publish */
function alNew(){setHeader("New SHEQ Alert","Choose who must acknowledge it",{icon:"back",aria:"Back",fn:()=>go("#alerts")});
  if(!isManager()){render(`<div class="card empty">${ic("lock")}<b>Manager mode is off</b>Turn on Manager mode in Settings with the Manager PIN to publish alerts.<button class="btn o s" style="margin-top:10px" onclick="go('#settings')">Open Settings</button></div>`);return}
  const F={type:AL_TYPES[0],priority:"Important",file:null};
  render(`<div class="card al-form">
    <label class="f" for="alType">Type</label><select class="t" id="alType">${AL_TYPES.map(t=>`<option>${esc(t)}</option>`).join("")}</select>
    <label class="f">Priority <span class="req">*</span></label><div class="seg" id="alPri">${Object.keys(AL_PRI).map(p=>`<button type="button" data-v="${p}" class="${p===F.priority?"on":""}">${p}</button>`).join("")}</div>
    <p class="muted" style="margin-top:4px">Critical also pops up when PARRON opens until it's acknowledged.</p>
    <label class="f" for="alTitle">Title <span class="req">*</span></label><input class="t" id="alTitle" maxlength="120" placeholder="e.g. Underground service strike – Genus site, WA">
    <label class="f" for="alWhat">What happened <span class="req">*</span></label><textarea class="t" id="alWhat" rows="5" maxlength="4000" placeholder="The facts and the lesson. No names of injured people or medical details – the full report stays in MYOSH."></textarea>
    <label class="f" for="alMust">What you must do</label><textarea class="t" id="alMust" rows="4" maxlength="4000" placeholder="One action per line"></textarea>
    <label class="f" for="alFileIn">Photo or PDF <span class="muted">· optional, up to 8 MB</span></label><input class="t" id="alFileIn" type="file" accept="image/jpeg,image/png,image/webp,application/pdf">
    <label class="f">Who must acknowledge <span class="req">*</span></label>
    <div class="seg al-who" id="alWho"><button type="button" data-v="all" class="on">Everyone on site</button><button type="button" data-v="pick">Choose people</button></div>
    <p class="muted" id="alWhoN" style="margin-top:4px"></p>
    <div id="alPick" hidden>
      <div class="al-quick">${[["she","SHE team"],["sup","Supervisors &amp; managers"],["eng","Engineers"],["ta","Trade Assistants"],["site","Everyone on site"],["none","Clear"]].map(([g,l])=>`<button type="button" class="chip" data-g="${g}">${l}</button>`).join("")}</div>
      <div class="al-people">${alCandidates().map((t,i)=>`<label class="al-person"><input type="checkbox" id="alP${i}" value="${esc(t.name)}"><span><b>${esc(t.name)}</b><small>${esc(t.role||"")}</small></span></label>`).join("")}</div>
      <p class="muted" id="alPickN">Nobody selected yet</p>
    </div>
    <label class="al-chk"><input type="checkbox" id="alEmail" checked> <span id="alEmailL">Also email it to the project team</span></label>
    <button class="btn o w" id="alPub" style="margin-top:14px">${ic("send","s")} Publish</button></div>
    <p class="foot">PARRON is a public link protected by the site code. Keep alerts to facts and lessons.</p>`);
  $("#alPri").querySelectorAll("button").forEach(b=>b.onclick=()=>{F.priority=b.dataset.v;$("#alPri").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b))});
  const picks=()=>[...document.querySelectorAll(".al-person input:checked")].map(x=>x.value);
  const upd=()=>{const n=picks().length;$("#alPickN").textContent=n?`${n} ${n>1?"people":"person"} must acknowledge – it only shows on their Home screen`:"Nobody selected yet";
    $("#alEmailL").textContent=F.who==="pick"?"Also email the people selected (those with a Genus email)":"Also email everyone on site (those with a Genus email)";
    $("#alWhoN").textContent=F.who==="all"?`${alSite().length} site-based people must acknowledge it`:""};
  F.who="all";upd();
  $("#alWho").querySelectorAll("button").forEach(b=>b.onclick=()=>{F.who=b.dataset.v;$("#alWho").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));$("#alPick").hidden=F.who!=="pick";upd()});
  document.querySelectorAll(".al-person input").forEach(x=>x.onchange=upd);
  document.querySelectorAll(".al-quick .chip").forEach(c=>c.onclick=()=>{const C=alCandidates();
    document.querySelectorAll(".al-person input").forEach((x,i)=>{const t=C[i];const g=c.dataset.g;
      if(g==="none")x.checked=false;else if(g==="site"?t.site:alGroup(t)===g)x.checked=true});upd()});
  $("#alFileIn").onchange=e=>{const f=e.target.files[0];F.file=null;if(!f)return;if(f.size>8*1024*1024){toast("That file is over 8 MB",3500);e.target.value="";return}F.file=f};
  $("#alPub").onclick=async()=>{const title=$("#alTitle").value.trim(),what=$("#alWhat").value.trim();
    if(!title||!what){toast("Add a title and what happened",3500);return}
    const required=F.who==="pick"?picks():alSite();if(!required.length){toast("Tick who must acknowledge, or choose Everyone on site",3500);return}
    if(navigator.onLine===false||!directOn()){toast("Needs signal to publish",3500);return}
    const b=$("#alPub");b.disabled=true;b.innerHTML='<span class="sending"><span class="spin"></span>Publishing…</span>';
    try{let file=null;if(F.file){file=F.file.type.startsWith("image/")&&F.file.size>1.5e6?{name:F.file.name,type:"image/jpeg",data:(await compress(F.file)).split(",")[1]}:{name:F.file.name,type:F.file.type,data:await blobToB64(F.file)}}
      const r=await relayPost({payload:{action:"publishAlert",pin:ls("mgrPin")||"",type:$("#alType").value,priority:F.priority,title,what,must:$("#alMust").value.trim(),file,
        by:ls("inspector")||"SHE Manager",email:$("#alEmail").checked,required,notify:TEAM.filter(t=>required.some(n=>nameEq(n,t.name))).map(t=>t.email).filter(Boolean)}},false);
      if(r&&r.badPin){toast("Manager PIN not accepted – turn Manager mode on again",4500);b.disabled=false;b.innerHTML=`${ic("send","s")} Publish`;return}
      if(!r||!r.ok)throw new Error((r&&r.error)||"Not published");
      alStore(r);celebrate("Alert published",`${r.id} sent to ${required.length} ${required.length>1?"people":"person"}`);go("#alerts/"+encodeURIComponent(r.id))}
    catch(e){toast(String(e.message||e),4500);b.disabled=false;b.innerHTML=`${ic("send","s")} Publish`}}}
/* people who can be ticked: the project team (js/app/config.js) – site-based people first */
const alCandidates=()=>TEAM.filter(t=>t.site).concat(TEAM.filter(t=>!t.site));
const alSite=()=>TEAM.filter(t=>t.site).map(t=>t.name);
const alGroup=t=>t.ta?"ta":/SHE/.test(t.role||"")?"she":/Engineer/.test(t.role||"")?"eng":/Supervisor|Manager|Director/.test(t.role||"")?"sup":"";
