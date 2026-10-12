"use strict";
/* ---------- router ---------- */
let CUR=null,ROUTE_SEQ=0;
/* async screens capture ROUTE_SEQ when they start and stop if the user has navigated away meanwhile */
const stale=seq=>seq!==ROUTE_SEQ;
window.addEventListener("hashchange",route);
function go(h){if(location.hash===h)route();else location.hash=h}
async function route(){const seq=++ROUTE_SEQ;const h=location.hash||"#home";const [v,id]=h.slice(1).split("/");window.scrollTo(0,0);closeSheet();
  if(v!=="insp"){const b=document.getElementById("bar");if(b)b.remove()}
  document.body.classList.toggle("task",v==="insp"||v==="review"||v==="report");setNav(v);
  if(v==="insp"){const d=await dbGet("drafts",id);if(!d)return go("#home");CUR=d;return viewInsp(d)}
  if(v==="review"){const d=await dbGet("drafts",id);if(!d)return go("#home");CUR=d;return viewReview(d)}
  CUR=null;
  if(v==="settings")return viewSettings();
  if(v==="dash"||v==="insights")return viewDash();
  if(v==="myday")return viewMyDay();
  if(v==="ta")return viewTA();
  if(v==="radio")return viewRadio();
  if(v==="inspections")return viewInspections();
  if(v==="report")return viewReport(id||"hazard");
  if(v==="actions")return viewActions(id?decodeURIComponent(id):"");
  return viewHome()}
function setNav(v){const m={home:"home","":"home",inspections:"home",myday:"home",ta:"home",radio:"home",insights:"insights",dash:"insights",actions:"actions"};const k=m[v]||"";
  document.querySelectorAll("#tabs a").forEach(a=>{const on=a.dataset.t===k;a.classList.toggle("on",on);if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")})}
function setHeader(title,sub,btn){$("#hTitle").textContent=title;$("#hSub").textContent=sub;const b=$("#hBtn");
  if(btn){b.innerHTML=(btn.icon?ic(btn.icon):"")+(btn.label?`<span>${esc(btn.label)}</span>`:"");b.setAttribute("aria-label",btn.aria||btn.label||"");b.onclick=btn.fn;b.classList.remove("hide")}else b.classList.add("hide")}
const SETTINGS_BTN={icon:"settings",aria:"Settings",fn:()=>go("#settings")};
function render(h){const a=$("#app");a.innerHTML=h;a.classList.remove("fade");void a.offsetWidth;a.classList.add("fade");motionIn(a)}
let NET_ON=true;
function setNet(){const hd=document.querySelector("header.top");if(hd)document.documentElement.style.setProperty("--hdr",hd.offsetHeight+"px");const n=$("#net");if(!n)return;const on=navigator.onLine!==false;n.classList.toggle("off",!on);n.title=on?"Online":"Offline – everything is saved on this phone";
  // a clear banner instead of relying on the small dot
  const b=$("#offbar");if(b){clearTimeout(setNet._t);
    if(!on){b.className="offbar off";b.innerHTML=`${ic("wifioff","s")}<span><b>Offline</b> – your work is saved on this phone and sends when you have signal</span>`;b.hidden=false}
    else if(!NET_ON){b.className="offbar back";b.innerHTML=`${ic("check","s")}<span><b>Back online</b> – sending anything waiting</span>`;b.hidden=false;setNet._t=setTimeout(()=>{b.hidden=true},3500)}
    else b.hidden=true;
    document.body.classList.toggle("is-off",!on)}
  NET_ON=on}
window.addEventListener("online",setNet);window.addEventListener("offline",setNet);

/* ---------- home ---------- */
let LIB={q:"",cat:"all"};
function ring(p,col){const r=18,c=2*Math.PI*r;return `<div class="ringw"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="5"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="${col||"var(--accent)"}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(c*Math.max(0,Math.min(1,p))).toFixed(1)} ${c.toFixed(1)}"/></svg><b>${Math.round(p*100)}%</b></div>`}
async function viewHome(){const seq=ROUTE_SEQ;setHeader("PARRON",CONFIG.projectShort,SETTINGS_BTN);
  const me=ls("inspector")||"";const drafts=(await dbAll("drafts")).sort((a,b)=>b.updated-a.updated);
  const sentAll=(await dbAll("sent")).sort((a,b)=>b.sentAt-a.sentAt);const ob=await dbAll("outbox");if(stale(seq))return;
  const reg=regAll();const st=regStats(reg);const mine=reg.filter(f=>isMine(f)&&f.status==="Open");
  const mon=new Date();mon.setDate(1);mon.setHours(0,0,0,0);const sentMonth=sentAll.filter(s=>s.sentAt>=mon.getTime()).length;
  let h=`<section class="hero"><div class="hi">${esc(greeting())}${me?",":""}</div><h1>${esc(firstName(me)||"Welcome")}</h1>
   <div class="proj">${ic("pin","s")} ${esc(CONFIG.jobNo)} · ${esc(CONFIG.projectShort)} · ${new Date().toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"})}</div>
   ${wxHTML()}
   <div class="kp"><button onclick="document.getElementById('drafts')?.scrollIntoView({behavior:'smooth'})"><b>${drafts.length}</b><span>In progress</span></button>
   <button onclick="go('#actions')" class="${mine.length?"warn":""}"><b>${mine.length}</b><span>My actions</span></button>
   <button onclick="ACTF.f='overdue';go('#actions')" class="${st.overdue?"bad":""}"><b>${st.overdue}</b><span>Overdue</span></button>
   <button onclick="go('#insights')"><b>${sentMonth}</b><span>This month</span></button></div></section>`;
  {const due=mdDueReminders();if(due.length)h+=`<button class="remind" onclick="go('#myday')">${ic("clock")}<div><b>Reminder${due.length>1?"s":""} today</b>${due.slice(0,3).map(x=>`<span>${esc(x.text)}${x.time?` · ${esc(x.time)}`:""}</span>`).join("")}${due.length>3?`<span>+${due.length-3} more</span>`:""}</div>${ic("chev")}</button>`}
  {const n=mdTodayCount();h+=`<div class="tiles">
   <button class="tile wide myday" onclick="go('#myday')"><span class="ti">${ic("cal","l")}</span><span class="tw"><b>My Day ${ic("lock","s")}</b><small>${n?`${n} to do today`:"Plan your day"} · private to you</small></span>${ic("chev")}</button>
   <button class="tile wide" onclick="go('#inspections')"><span class="ti t-info">${ic("clipboard","l")}</span><span class="tw"><b>Inspection</b><small>${LIB_TABS().length} forms · browse by category</small></span>${ic("chev")}</button>
   <button class="tile" onclick="startInsp(24)"><span class="ti t-accent">${ic("eye","l")}</span><b>Task Observation</b><span>Observe a crew</span></button>
   <button class="tile" onclick="startInsp(23)"><span class="ti t-purple">${ic("users","l")}</span><b>Mentoring</b><span>Discussion record</span></button>
   <button class="tile" onclick="go('#report/hazard')"><span class="ti t-red">${ic("alert","l")}</span><b>Hazard</b><span>Quick report</span></button>
   <button class="tile" onclick="go('#report/positive')"><span class="ti t-green">${ic("star","l")}</span><b>Positive</b><span>Observation</span></button>
   <button class="tile" onclick="go('#ta')"><span class="ti t-amber">${ic("hardhat","l")}</span><b>Trade Assistants</b><span>Fuel register · fire trailer</span></button>
   <button class="tile radio ${RADIO.playing?"on":""}" onclick="go('#radio')"><span class="ti t-blue">${ic("radio","l")}</span><b>PARRON Radio</b><span>${RADIO.playing?"Now playing":"Shuffle play"}</span></button></div>`;}
  if(ob.length)h+=`<div class="outbox">${ic("inbox")}<div><b>Outbox – ${ob.length} report${ob.length>1?"s":""} waiting to send</b><div class="muted" style="margin:4px 0 8px">${ob.map(o=>`${esc(o.title)} · ${esc(o.location)}`).join("<br>")}<br>They send automatically when the phone has signal${ob[0].lastError?` (last try: ${esc(ob[0].lastError)})`:""}.</div><button class="btn o s" onclick="flushOutbox(true)">${ic("send","s")} Send now</button></div></div>`;
  {const sod=new Date();sod.setHours(0,0,0,0);const stale=drafts.filter(d=>d.created<sod.getTime());
   if(stale.length)h+=`<div class="alert red">${ic("clock")}<div><b>${stale.length} unsent inspection${stale.length>1?"s":""} started before today.</b> Finish and send ${stale.length>1?"them":"it"} – or delete if no longer needed.</div></div>`}
  if(!recipientOK())h+=`<div class="alert red">${ic("alert")}<div><b>Report recipient not set.</b> Set it under Settings.</div></div>`;
  if(!me)h+=`<div class="alert blue">${ic("user")}<div><b>Who are you?</b> Pick your name once so it fills in on every report and your actions show here.<br><button class="btn o s" style="margin-top:8px" onclick="askName().then(()=>viewHome())">Pick my name</button></div></div>`;
  if(drafts.length){h+=`<h2 id="drafts">Continue <span class="cnt">${drafts.length}</span></h2>`;
    drafts.forEach(d=>{const t=tabByNum(d.tab);const FUEL=t.kind==="fuel";const REC=t.kind==="record"||FUEL;const s=REC?null:stats(d);const p=FUEL?(FU(d).amAt?.5:.1):REC?Math.max(0,8-recProblems(d).length)/8:(s.total?s.rated/s.total:0);
      h+=`<div class="card tap draft" onclick="go('#insp/${d.id}')"><div class="tab">${ring(p)}<div class="x"><b>${pad(t.num)} · ${esc(t.short)}</b><span>${esc(d.details.location||"No location yet")} · ${fmtDT(d.details.datetime)}</span>
        ${s?`<div class="libmeta"><span class="tag">${s.rated}/${s.total} rated</span>${s.UA?`<span class="tag r">${s.UA} UA</span>`:""}${s.NI?`<span class="tag o">${s.NI} NI</span>`:""}</div>`:""}</div>
        <button class="iconbtn" aria-label="Delete draft" onclick="event.stopPropagation();delDraft('${d.id}')">${ic("trash")}</button></div></div>`})}
  const recent=sentAll.slice(0,5);
  if(recent.length){h+=`<h2>Recently sent <span class="cnt">${sentAll.length}</span></h2>`;
    recent.forEach(s=>{h+=`<div class="card flat"><div class="tab"><div class="n" style="background:var(--c)">${ic("check")}</div><div class="x"><b>${esc(s.title)}</b><span>${esc(s.reportId)} · ${esc(s.location)} · ${new Date(s.sentAt).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}</span>
      <div class="libmeta">${s.ua?`<span class="tag r">${s.ua} UA</span>`:""}${s.ni?`<span class="tag o">${s.ni} NI</span>`:""}${s.snn?`<span class="tag o">${s.snn} SNN</span>`:""}${!s.ua&&!s.ni&&s.ua!==undefined?`<span class="tag g">No findings</span>`:""}${s.via?`<span class="tag g">${ic("check","s")} Emailed</span>`:""}</div></div></div></div>`})}
  h+=`<p class="foot">PARRON v${esc(CONFIG.appVersion)} · Proactive Assessment, Reporting, Risk &amp; Observation Network<br>Works offline · Data stays on this phone until you send it</p>`;
  render(h);
  regRefresh().then(ch=>{if(ch&&(location.hash||"#home")==="#home")viewHome()});
  Promise.all([wxRefresh(),fdrRefresh()]).then(r=>{if(r.some(Boolean)&&(location.hash||"#home")==="#home"&&!stale(seq)){const w=document.querySelector(".hero .wx");if(w)w.outerHTML=wxHTML()}})}
/* ---------- inspection library (own page: search + categories) ---------- */
async function viewInspections(){const seq=ROUTE_SEQ;setHeader("Inspections",`${LIB_TABS().length} forms · pick one to start`,{icon:"back",aria:"Back",fn:()=>go("#home")});
  const sentAll=(await dbAll("sent")).sort((a,b)=>b.sentAt-a.sentAt);if(stale(seq))return;
  render(`<div class="search">${ic("search")}<input id="libq" type="search" placeholder="Search inspections, e.g. crane, permit, fire" value="${esc(LIB.q)}" autocomplete="off" aria-label="Search inspections"></div>
   <div class="libbar"><div class="chips scroll" id="libcats"></div><div class="vtog" role="group" aria-label="List view">${[["compact","layers","Compact view"],["detail","clipboard","Detailed view"]].map(([k,i,l])=>`<button class="${libView()===k?"on":""}" aria-label="${l}" aria-pressed="${libView()===k}" onclick="setLibView('${k}')">${ic(i,"s")}</button>`).join("")}</div></div><div class="lib ${libView()}" id="lib"></div>`);
  const q=$("#libq");q.addEventListener("input",()=>{LIB.q=q.value;renderLib(sentAll)});renderLib(sentAll)}
const libView=()=>ls("libView")||"compact";
function setLibView(v){ls("libView",v);document.querySelectorAll(".vtog button").forEach((b,i)=>{const on=(i===0)===(v==="compact");b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});const l=$("#lib");if(l){l.className="lib "+v;renderLib(window._sent)}}
const LIB_TABS=()=>TABS.filter(t=>!HOME_TILE_FORMS.includes(t.num));
function catOf(t){const c=CATEGORIES.find(c=>c.nums.includes(t.num));return c?c.key:"other"}
function renderLib(sentAll){const box=$("#lib");if(!box)return;const q=LIB.q.trim().toLowerCase();
  const last={};(sentAll||[]).forEach(s=>{const k=(s.title||"").slice(0,2);if(!last[k])last[k]=s.sentAt});
  const match=t=>!q||[t.title,t.short,t.scope,...allQ(t).map(x=>x.text)].join(" ").toLowerCase().includes(q);
  const cats=[{key:"all",label:"All"},...CATEGORIES];
  $("#libcats").innerHTML=cats.map(c=>{const n=LIB_TABS().filter(t=>(c.key==="all"||catOf(t)===c.key)&&match(t)).length;return n||c.key==="all"?`<button class="chip ${LIB.cat===c.key?"on":""}" onclick="LIB.cat='${c.key}';renderLib(window._sent)">${esc(c.label)}<span class="c">${n}</span></button>`:""}).join("");
  window._sent=sentAll;
  const list=LIB_TABS().filter(t=>(LIB.cat==="all"||catOf(t)===LIB.cat)&&match(t));
  box.innerHTML=list.length?list.map((t,i)=>{const REC=t.kind==="record";const nq=REC?0:allQ(t).length;const snn=REC?0:allQ(t).filter(x=>(x.snn||[]).length).length;const ls_=last[pad(t.num)];
    return `<div class="card tap" style="--i:${Math.min(i,12)}" onclick="startInsp(${t.num})" role="button" tabindex="0" onkeydown="if(event.key==='Enter')startInsp(${t.num})"><div class="tab"><div class="n">${pad(t.num)}</div><div class="x"><b>${esc(t.short)}</b>${libView()==="compact"?"":`<span>${esc(t.scope)}</span>`}
      <div class="libmeta">${REC?`<span class="tag">Record</span>`:`<span class="tag">${nq} items</span>`}${snn?`<span class="tag o">${snn} SNN</span>`:""}${ls_?`<span class="tag g">Sent ${ago(new Date(ls_).toISOString())}</span>`:""}</div></div>${ic("chev")}</div></div>`}).join("")
    :`<div class="card empty" style="grid-column:1/-1">${ic("search")}<b>No inspections match “${esc(LIB.q)}”</b>Try a different word.</div>`}
async function startInsp(num){
  if(!(ls("inspector")||"").trim()){const n=await askName();if(!n)return}
  const d=newDraft(num);await save(d,true);queuePing(d,"draft");go("#insp/"+d.id)}
function setMe(name,email){ls("inspector",name);if(email)ls("myEmail",email.toLowerCase());else lsDel("myEmail");updateBadges()}
function askName(){return new Promise(res=>{const s=sheet(`<h3>Who are you?</h3><p class="muted">Your name goes on your reports, and actions assigned to you show under <b>My actions</b>. You only do this once.</p>
  <div class="who">${TEAM.map((p,i)=>`<button class="card tap" data-i="${i}"><b>${esc(p.name)}</b><span>${esc(p.role)}</span></button>`).join("")}</div>
  <details style="margin-top:10px"><summary class="muted" style="cursor:pointer;min-height:40px;display:flex;align-items:center">I'm not on this list</summary>
  <label class="f" for="nmIn">Full name</label><input class="t" id="nmIn" autocomplete="name" placeholder="e.g. Alex Smith"><button class="btn o w" id="nmOk">Continue</button></details>`);
  s.querySelectorAll(".who button").forEach(b=>b.onclick=()=>{const p=TEAM[+b.dataset.i];setMe(p.name,p.email);closeSheet();toast(`Welcome, ${firstName(p.name)}`);res(p.name)});
  const i=s.querySelector("#nmIn");
  const ok=()=>{const n=i.value.trim().replace(/\s+/g," ");if(n.split(" ").length<2){toast("Please enter your first and last name",3500);return}setMe(n,"");closeSheet();res(n)};
  s.querySelector("#nmOk").onclick=ok;i.addEventListener("keydown",e=>{if(e.key==="Enter")ok()})})}
async function delDraft(id){if(!await ask2("Delete this draft?","The unfinished inspection and its photos are removed from this phone. This cannot be undone.","Delete",true))return;const d=await dbGet("drafts",id);await dbDel("drafts",id);if(d)queuePing(d,"deleted");toast("Draft deleted");route()}
/* ---------- status pings: lets Insights see inspections that are started but not sent (name, inspection, location and times only) ---------- */
function pingMeta(d){const t=tabByNum(d.tab);const s=stats(d);
  const progress=t.kind==="fuel"?(FU(d).amAt?"start of day done":"start of day"):t.kind==="record"?`${Math.max(0,8-recProblems(d).length)}/8 fields`:`${s.rated}/${s.total} rated`;
  return {name:(d.details.inspector||ls("inspector")||"").trim(),no:pad(t.num),title:t.short,location:d.details.location||"",started:new Date(d.created).toISOString(),ua:s.UA,ni:s.NI,snn:s.snnN,progress}}
function getPings(){try{return JSON.parse(ls("pings")||"{}")}catch(e){return {}}}
function queuePing(d,state,extra){if(state==="draft"&&!problems(d).length)state="finished";const p=getPings();p[d.id]={action:"status",uid:d.id,state,meta:pingMeta(d),...(extra||{})};ls("pings",JSON.stringify(p));d._pinged=Date.now();flushPings()}
let PINGING=false;
async function flushPings(){if(PINGING||!directOn()||navigator.onLine===false)return;PINGING=true;
  try{const p=getPings();for(const uid of Object.keys(p)){try{const r=await relayPost({payload:p[uid]},false);if(r&&r.ok){const q=getPings();if(q[uid]&&q[uid].state===p[uid].state)delete q[uid];ls("pings",JSON.stringify(q))}}catch(e){break}}}finally{PINGING=false}}


/* ---------- settings ---------- */
const isManager=()=>!!ls("mgrPin");
async function viewSettings(){setHeader("Settings","This phone only",{icon:"back",aria:"Back",fn:()=>history.length>1?history.back():go("#home")});
  const th=ls("theme")||"auto";const hc=ls("contrast")==="high";
  render(`<h2>Profile</h2><div class="card"><div class="set">${ic("user")}<div><b>${esc(ls("inspector")||"Not set")}</b><span>${esc((teamBy(ls("inspector"))||{}).role||ls("myEmail")||"Tap Change to pick your name")}</span></div><button class="btn g s" onclick="askName().then(()=>viewSettings())">Change</button></div>
   <label class="f" for="sRec">Reports are sent to</label><input class="t" id="sRec" type="email" value="${esc(recipient())}">
   <p class="muted">Set by the SHE Manager. Only change this if instructed.</p><button class="btn o w" onclick="saveSettings()">${ic("check","s")} Save</button></div>
  <h2>Appearance</h2><div class="card"><div class="set">${ic("sun")}<div><b>Theme</b><span>Dark mode is easier on the eyes at night and saves battery.</span></div></div>
   <div class="seg" role="group" aria-label="Theme">${[["auto","Auto"],["light","Light"],["dark","Dark"]].map(([k,l])=>`<button class="${th===k?"on":""}" onclick="setTheme('${k}')">${l}</button>`).join("")}</div>
   <div class="set" style="margin-top:6px">${ic("sun")}<div><b>High contrast</b><span>Stronger text and borders for bright sunlight.</span></div><label class="switch"><input type="checkbox" ${hc?"checked":""} onchange="setContrast(this.checked)"><i></i></label></div></div>
  <h2>Manager mode</h2><div class="card"><div class="set">${ic("lock")}<div><b>${isManager()?"On – this phone can verify, re-open and reassign actions":"Off"}</b><span>For the SHE Manager. Needs the Manager PIN set in the relay.</span></div></div>
   ${isManager()?`<button class="btn g w" onclick="mgrOff()">Turn off on this phone</button>`:`<label class="f" for="mPin">Manager PIN</label><input class="t" id="mPin" type="password" inputmode="numeric" autocomplete="off" maxlength="12"><button class="btn w" onclick="mgrOn()">${ic("lock","s")} Turn on</button>`}</div>
  <h2>Connection</h2><div class="card"><div class="set">${ic("send")}<div><b>Direct send</b><span id="cState">${directOn()?"On – reports email automatically":"Not set up – reports are shared via Outlook"}</span></div></div>
   <div class="set">${ic("layers")}<div><b>Project log</b><span id="rState">${directOn()?(v3()?"Connected – shared actions, action emails and Insights":"Checking…"):"Not connected"}</span></div></div>
   ${directOn()?`<div class="set">${ic("lock")}<div><b>Site access code</b><span>${siteCode()?"Saved on this phone":"Not entered – only needed once the SHE Manager turns it on"}</span></div><button class="btn g s" onclick="askSiteCode(true)">${siteCode()?"Change":"Enter"}</button></div>`:""}
   ${directOn()?`<button class="btn g w" onclick="testRelay()">${ic("refresh","s")} Test connection</button>`:""}</div>
  <h2>Install on your phone</h2><div class="card"><ol class="steps"><li><b>iPhone:</b> open this page in Safari › Share › <i>Add to Home Screen</i>.</li><li><b>Android:</b> open in Chrome › ⋮ menu › <i>Install app</i>.</li><li>Open it once with coverage. After that it works with no signal – reports send when you are back in range.</li></ol></div>
  <h2>Data on this phone</h2><div class="card"><div class="set">${ic("download")}<div><b>Back up my data</b><span>Drafts and sent history as a file – useful before changing phones.</span></div><button class="btn g s" onclick="backupData()">Back up</button></div>
   <div class="set">${ic("shield")}<div><b>Storage</b><span id="stState">Checking…</span></div></div></div>
  <p class="foot">PARRON v${esc(CONFIG.appVersion)}<br>${esc(CONFIG.project)}</p>`);
  keepStorage().then(p=>{const e=$("#stState");if(e)e.textContent=p===true?"Kept permanently – the phone will not clear drafts or photos":p===false?"The phone may clear PARRON's data if space runs low – add PARRON to the home screen and send drafts promptly":"Send drafts promptly – this browser does not report storage status"});
  if(directOn()&&!v3())relayVersion(true).then(()=>{const e=$("#rState");if(e)e.textContent=v3()?"Connected – shared actions, action emails and Insights":"Relay v2 – update the relay script to share actions and send action emails"})}
function saveSettings(){const r=$("#sRec").value.trim();
  if(r&&r!==CONFIG.recipient)ls("recipientOverride",r);else lsDel("recipientOverride");
  toast("Saved");go("#home")}
function setTheme(k){if(k==="auto"){lsDel("theme");delete document.documentElement.dataset.theme}else{ls("theme",k);document.documentElement.dataset.theme=k}viewSettings()}
function setContrast(on){if(on){ls("contrast","high");document.documentElement.dataset.contrast="high"}else{lsDel("contrast");delete document.documentElement.dataset.contrast}}
async function mgrOn(){const p=$("#mPin").value.trim();if(!p){toast("Enter the PIN");return}
  if(await relayVersion(true)<3){toast("The relay needs updating to v3 before Manager mode can be used",5000);return}
  try{const r=await relayPost({payload:{action:"pin",pin:p}},false);if(r&&r.ok){ls("mgrPin",p);toast("Manager mode on");updateBadges();viewSettings()}else toast((r&&r.error)||"PIN not accepted",4000)}
  catch(e){toast("No connection – try again with signal",4000)}}
function mgrOff(){lsDel("mgrPin");toast("Manager mode off");updateBadges();viewSettings()}
async function testRelay(){toast("Testing…",1500);const v=await relayVersion(true);
  try{const r=await fetch(RELAY.url,{redirect:"follow"});const j=await r.json();toast(j.ok?`Connected · relay v${v} · ${j.emailsLeftToday} emails left today`:"Relay replied with an error",5000)}catch(e){toast("Could not reach the relay – check signal",4000)}
  if(location.hash==="#settings")viewSettings()}
async function backupData(){const data={app:"PARRON",v:CONFIG.appVersion,at:new Date().toISOString(),inspector:ls("inspector"),myDay:mdLoad(),myReminders:recLoad(),drafts:await dbAll("drafts"),sent:await dbAll("sent"),outbox:(await dbAll("outbox")).map(o=>({...o,payload:{...o.payload,pdf:undefined}}))};
  downloadBlob(new Blob([JSON.stringify(data)],{type:"application/json"}),`PARRON-backup-${todayISO()}.json`);toast("Backup saved")}
