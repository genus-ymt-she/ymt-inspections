"use strict";
/* ---------- My Day – private daily planner ----------
   Stored ONLY on this phone (localStorage, one list per person picked under "Who are you?").
   Never sent to the relay, the project log, emails or Insights – nobody else can see it. */
const MD_SUGGEST=["Pre-start meeting","Site walk","Check permits","Toolbox talk","Review JHAs","Inspection","Follow up actions","Contractor meeting"];
let MD_ADD={when:"today",time:"",pri:false,repeat:"",dow:1,dom:1,email:false};
const DOW=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
/* the local (Perth) day an item was ticked – not the UTC date, which is still "yesterday" before 8 am */
function mdDoneDay(x){if(x.doneDay)return x.doneDay;if(!x.doneAt)return "";const d=new Date(x.doneAt);return isNaN(d)?"":isoDate(d)}
function mdKey(){return "myday:"+(nameKey(ls("inspector"))||"me")}
function mdLoad(){const L=lsJ(mdKey(),[]);return Array.isArray(L)?L:[]}
function mdSave(L){ls(mdKey(),JSON.stringify(L))}
/* ---- repeating reminders (rules kept on the phone; an email copy only if the person ticks "email me") ---- */
function recKey(){return "mdrec:"+(nameKey(ls("inspector"))||"me")}
function recLoad(){const R=lsJ(recKey(),[]);return Array.isArray(R)?R:[]}
function recSave(R){ls(recKey(),JSON.stringify(R))}
function isoDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function recOccurs(r,iso){const d=new Date(iso+"T12:00:00");const dow=d.getDay(),dom=d.getDate(),last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  return r.type==="daily"||(r.type==="weekdays"&&dow>=1&&dow<=5)||(r.type==="weekly"&&dow===+r.dow)||(r.type==="monthly"&&dom===Math.min(+r.dom||1,last))}
function recLabel(r){return r.type==="daily"?"Every day":r.type==="weekdays"?"Every weekday":r.type==="weekly"?`Every ${DOW[+r.dow]}`:`Monthly on the ${ordinal(Math.min(+r.dom||1,31))}${+r.dom>=29?" (or last day)":""}`}
function ordinal(n){const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}
function recNext(r){const d=new Date();for(let i=0;i<400;i++){const iso=isoDate(d);if(recOccurs(r,iso))return iso;d.setDate(d.getDate()+1)}return ""}
/* create today's (or the most recently missed) item for each rule – once */
function recGenerate(L){const R=recLoad();if(!R.length)return false;const t=todayISO();let ch=false;
  R.forEach(r=>{if(r.lastGen===t)return;let hit="";const d=new Date(t+"T12:00:00");
    for(let i=0;i<32;i++){const iso=isoDate(d);if(iso<=(r.lastGen||"")||iso<r.created)break;if(recOccurs(r,iso)){hit=iso;break}d.setDate(d.getDate()-1)}
    if(hit&&!L.some(x=>x.rid===r.id&&x.date===hit)){L.push({id:"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),rid:r.id,text:r.text,date:hit,time:r.time||"",pri:!!r.pri,done:false,created:Date.now()});ch=true}
    r.lastGen=t;ch=true});
  recSave(R);return ch}
async function recSync(r,del){if(!r.email&&!del)return true;if(!directOn()||!v3()){r.pending=true;return false}
  try{const res=await relayPost({payload:del?{action:"reminder",op:"delete",id:r.id}:{action:"reminder",id:r.id,name:ls("inspector")||"",email:ls("myEmail")||"",text:r.text,rule:{type:r.type,dow:r.dow,dom:r.dom},time:r.time||""}},false);
    if(res&&res.ok){r.pending=false;return true}if(res&&res.error)toast(res.error,5000);r.pending=true;return false}catch(e){r.pending=true;return false}}
async function recRetry(){const R=recLoad();const p=R.filter(r=>r.pending&&r.email);if(!p.length)return;for(const r of p)await recSync(r);recSave(R)}
function mdDueReminders(){return mdRoll().filter(x=>x.rid&&!x.done&&x.date<=todayISO())}
/* unfinished items from earlier days roll forward to today, so nothing gets lost */
function mdRoll(){const L=mdLoad();const t=todayISO();let ch=recGenerate(L);L.forEach(x=>{if(!x.done&&x.date<t){x.date=t;x.carried=true;ch=true}});if(ch)mdSave(L);return L}
function mdTodayCount(){return mdRoll().filter(x=>!x.done&&x.date===todayISO()).length}
async function viewMyDay(){if(!(ls("inspector")||"").trim()){const n=await askName();if(!n){go("#home");return}}
  setHeader("My Day","Private to you",{icon:"back",aria:"Back",fn:()=>go("#home")});drawMyDay();recRetry()}
function drawMyDay(){const L=mdRoll();const t=todayISO(),tm=addDaysISO(1);
  const sortF=(a,b)=>(b.pri-a.pri)||String(a.time||"99").localeCompare(String(b.time||"99"))||a.created-b.created;
  const today=L.filter(x=>!x.done&&x.date===t).sort(sortF),tomorrow=L.filter(x=>!x.done&&x.date===tm).sort(sortF),later=L.filter(x=>!x.done&&x.date>tm).sort((a,b)=>a.date.localeCompare(b.date)||sortF(a,b));
  const done=L.filter(x=>x.done&&mdDoneDay(x)===t);
  const me=ls("inspector")||"";const mine=regAll().filter(f=>isOpen(f)&&isMine(f)).sort((a,b)=>(daysTo(a.due)??999)-(daysTo(b.due)??999));
  const item=x=>`<div class="mdi ${x.done?"done":""}"><button class="mdc" aria-label="${x.done?"Mark not done":"Mark done"}" onclick="mdToggle('${x.id}')">${x.done?ic("check","s"):""}</button>
    <div class="mdt" onclick="mdEdit('${x.id}')"><span>${x.pri?`<b class="mdp">${ic("star","s")}</b>`:""}${x.rid?`<b class="mdr">${ic("refresh","s")}</b>`:""}${esc(x.text)}</span>${x.time||x.carried||x.date>tm?`<small>${x.time?`${ic("clock","s")} ${esc(x.time)}`:""}${x.date>tm?` ${ic("cal","s")} ${fmtD(x.date)}`:""}${x.carried&&!x.done?` · carried over`:""}</small>`:""}</div>
    <button class="iconbtn mdx" aria-label="Delete" onclick="mdDel('${x.id}')">${ic("trash","s")}</button></div>`;
  const total=today.length+done.length;
  let h=`<div class="privacy">${ic("lock")}<div><b>Private to you${me?`, ${esc(firstName(me))}`:""}</b>Only you can see this page. It is saved on this phone only – it is never sent to the project log, emails or Insights, and the SHE Manager cannot see it.</div></div>`;
  h+=`<div class="card mdhead"><div><div class="muted" style="font-weight:700">${new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}</div>
    <b class="mdbig">${today.length?`${today.length} to do today`:total?"All done for today":"Plan your day"}</b></div>${total?ring(done.length/total,"var(--c)"):""}</div>`;
  h+=`<div class="card"><div class="mdadd"><input class="t" id="mdIn" placeholder="Add something to do…" autocomplete="off" enterkeyhint="done" aria-label="New item"><button class="btn o" onclick="mdAdd()" aria-label="Add">${ic("plus")}</button></div>
    <div class="mdopts"><label class="mdrep">${ic("refresh","s")}<select id="mdRep" onchange="MD_ADD.repeat=this.value;drawMyDay()" aria-label="Repeat">
      ${[["","Doesn't repeat"],["daily","Every day"],["weekdays","Every weekday (Mon–Fri)"],["weekly","Every week"],["monthly","Every month"]].map(([k,l])=>`<option value="${k}" ${MD_ADD.repeat===k?"selected":""}>${l}</option>`).join("")}</select></label>
    ${MD_ADD.repeat==="weekly"?`<select class="t" onchange="MD_ADD.dow=+this.value" aria-label="Day of the week">${DOW.map((d,i)=>`<option value="${i}" ${+MD_ADD.dow===i?"selected":""}>on ${d}</option>`).join("")}</select>`:""}
    ${MD_ADD.repeat==="monthly"?`<select class="t" onchange="MD_ADD.dom=+this.value" aria-label="Day of the month">${Array.from({length:31},(_,i)=>i+1).map(n=>`<option value="${n}" ${+MD_ADD.dom===n?"selected":""}>on the ${ordinal(n)}${n>=29?" (or last day)":""}</option>`).join("")}</select>`:""}
    ${MD_ADD.repeat?`<label class="vchk" style="margin:2px 0"><input type="checkbox" ${MD_ADD.email?"checked":""} onchange="MD_ADD.email=this.checked;drawMyDay()"><span>Also email me on the day${ls("myEmail")?` (${esc(ls("myEmail"))})`:""}</span></label>
      ${MD_ADD.email?`<div class="muted" style="margin-top:-4px">${ls("myEmail")?"To send the email, the reminder text is stored by the project system. Leave this off to keep it on your phone only.":"Pick your name from the team list (Settings › Profile) to get email reminders."}</div>`:""}`:""}
    ${MD_ADD.repeat?"":`<div class="seg" role="group" aria-label="When">${[["today","Today"],["tomorrow","Tomorrow"],["later","Later"]].map(([k,l])=>`<button class="${MD_ADD.when===k?"on":""}" onclick="MD_ADD.when='${k}';drawMyDay();$('#mdIn').focus()">${l}</button>`).join("")}</div>`}
    ${!MD_ADD.repeat&&MD_ADD.when==="later"?`<input class="t" type="date" id="mdDate" value="${esc(MD_ADD.date||addDaysISO(2))}" min="${addDaysISO(2)}" onchange="MD_ADD.date=this.value">`:""}
    <div class="mdrow"><label class="mdtime">${ic("clock","s")}<input type="time" id="mdTime" value="${esc(MD_ADD.time)}" onchange="MD_ADD.time=this.value" aria-label="Time (optional)"></label>
    <button class="chip ${MD_ADD.pri?"on":""}" onclick="MD_ADD.pri=!MD_ADD.pri;drawMyDay()">${ic("star","s")} Priority</button></div></div>
    <div class="chips scroll" style="margin:10px -16px -2px;padding:2px 16px 4px">${MD_SUGGEST.map(s=>`<button class="chip" onclick="mdQuick(${JSON.stringify(s).replace(/"/g,"&quot;")})">${ic("plus","s")} ${esc(s)}</button>`).join("")}</div></div>`;
  h+=`<h2>Today <span class="cnt">${today.length}</span></h2>${today.length?`<div class="card mdl">${today.map(item).join("")}</div>`:`<div class="card empty" style="padding:18px">${ic("circlecheck")}<b>${done.length?"Nice – today is clear":"Nothing planned yet"}</b>${done.length?"":"Add your first item above."}</div>`}`;
  if(mine.length)h+=`<h2>Actions assigned to you <span class="cnt">${mine.length}</span></h2><div class="card mdl">${mine.slice(0,8).map(f=>`<div class="mdi act-link" onclick="go('#actions/${encodeURIComponent(f.fid)}')"><span class="mdc ro" style="border-color:${actLevelColor(f)}"></span><div class="mdt"><span>${esc(f.action||f.finding)}</span><small class="${isOverdue(f)?"late":""}">${ic("cal","s")} ${esc(dueText(f.due))} · ${esc(f.location||"")}</small></div>${ic("chev")}</div>`).join("")}</div>
    <p class="muted" style="margin:-4px 4px 0">From the project Action register – tap to open or close out.</p>`;
  if(tomorrow.length)h+=`<h2>Tomorrow <span class="cnt">${tomorrow.length}</span></h2><div class="card mdl">${tomorrow.map(item).join("")}</div>`;
  if(later.length)h+=`<h2>Later <span class="cnt">${later.length}</span></h2><div class="card mdl">${later.map(item).join("")}</div>`;
  {const R=recLoad();if(R.length)h+=`<h2>Repeating <span class="cnt">${R.length}</span></h2><div class="card mdl">${R.map(r=>`<div class="mdi"><span class="mdc ro rep">${ic("refresh","s")}</span><div class="mdt"><span>${r.pri?`<b class="mdp">${ic("star","s")}</b>`:""}${esc(r.text)}</span><small>${esc(recLabel(r))}${r.time?` · ${esc(r.time)}`:""} · next ${fmtD(recNext(r))}${r.email?` · ${ic("send","s")} email${r.pending?" (waiting for signal)":""}`:""}</small></div><button class="iconbtn mdx" aria-label="Stop repeating" onclick="recDel('${r.id}')">${ic("trash","s")}</button></div>`).join("")}</div>`}
  if(done.length)h+=`<h2>Done today <span class="cnt">${done.length}</span><span class="grow"></span><button class="linkbtn" onclick="mdClearDone()">Clear</button></h2><div class="card mdl">${done.map(item).join("")}</div>`;
  render(h);const i=$("#mdIn");i.addEventListener("keydown",e=>{if(e.key==="Enter")mdAdd()})}
function mdDateFor(){return MD_ADD.when==="today"?todayISO():MD_ADD.when==="tomorrow"?addDaysISO(1):(MD_ADD.date||addDaysISO(2))}
function mdPush(text){text=String(text||"").trim();if(!text)return false;const L=mdLoad();
  L.push({id:"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),text:text.slice(0,300),date:mdDateFor(),time:MD_ADD.time||"",pri:!!MD_ADD.pri,done:false,created:Date.now()});mdSave(L);return true}
async function mdAdd(){const i=$("#mdIn");const text=i.value.trim();if(!text){i.focus();return}
  if(MD_ADD.repeat){const y=new Date();y.setDate(y.getDate()-1);const r={id:"rem-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),text:text.slice(0,300),type:MD_ADD.repeat,dow:+MD_ADD.dow,dom:+MD_ADD.dom,time:MD_ADD.time||"",pri:!!MD_ADD.pri,email:!!(MD_ADD.email&&ls("myEmail")),created:todayISO(),lastGen:isoDate(y)};
    const R=recLoad();R.push(r);recSave(R);const ok=await recSync(r);recSave(recLoad().map(x=>x.id===r.id?r:x));
    toast(`Repeating: ${recLabel(r)}${r.email?(ok?" – email on":" – email will be set up when online"):""}`,3500);MD_ADD.repeat="";MD_ADD.email=false}
  else mdPush(text);
  MD_ADD.time="";MD_ADD.pri=false;drawMyDay();const j=$("#mdIn");if(j)j.focus()}
async function recDel(id){const R=recLoad();const r=R.find(x=>x.id===id);if(!r)return;if(!await ask2("Stop this repeating reminder?",`“${esc(r.text)}” – ${esc(recLabel(r))}. Items already on your list stay.`,"Stop",true))return;
  if(r.email)await recSync(r,true);recSave(recLoad().filter(x=>x.id!==id));drawMyDay();toast("Repeating reminder stopped")}
function mdQuick(s){mdPush(s);drawMyDay();toast(`Added “${s}”`,1500)}
function mdToggle(id){const L=mdLoad();const x=L.find(x=>x.id===id);if(!x)return;x.done=!x.done;x.doneAt=x.done?new Date().toISOString():"";x.doneDay=x.done?todayISO():"";if(!x.done&&x.date<todayISO())x.date=todayISO();mdSave(L);drawMyDay()}
function mdDel(id){mdSave(mdLoad().filter(x=>x.id!==id));drawMyDay()}
function mdClearDone(){const t=todayISO();mdSave(mdLoad().filter(x=>!(x.done&&mdDoneDay(x)===t)));drawMyDay()}
function mdEdit(id){const x=mdLoad().find(x=>x.id===id);if(!x)return;
  const s=sheet(`<h3>Edit</h3><label class="f" for="meT">What</label><textarea class="t" id="meT" rows="2">${esc(x.text)}</textarea>
   <div class="grid2"><div><label class="f" for="meD">Day</label><input class="t" type="date" id="meD" value="${esc(x.date)}"></div><div><label class="f" for="meH">Time</label><input class="t" type="time" id="meH" value="${esc(x.time||"")}"></div></div>
   <label class="vchk"><input type="checkbox" id="meP" ${x.pri?"checked":""}><span>Priority</span></label>
   <div class="row2"><button class="btn g" id="meDel">${ic("trash","s")} Delete</button><button class="btn o" id="meOk">Save</button></div>`);
  s.querySelector("#meOk").onclick=()=>{const L=mdLoad();const y=L.find(z=>z.id===id);if(y){y.text=s.querySelector("#meT").value.trim()||y.text;y.date=s.querySelector("#meD").value||y.date;y.time=s.querySelector("#meH").value;y.pri=s.querySelector("#meP").checked;y.carried=false;mdSave(L)}closeSheet();drawMyDay()};
  s.querySelector("#meDel").onclick=()=>{closeSheet();mdDel(id)}}
