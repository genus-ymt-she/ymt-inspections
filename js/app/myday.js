"use strict";
/* ---------- My Day – private daily planner ----------
   Stored ONLY on this phone (localStorage, one list per person picked under "Who are you?").
   Never sent to the relay, the project log, emails or Insights – nobody else can see it. */
const MD_SUGGEST=["Pre-start meeting","Site walk","Check permits","Toolbox talk","Review JHAs","Inspection","Follow up actions","Contractor meeting"];
let MD_ADD={when:"today",time:"",pri:false};
function mdKey(){return "myday:"+(nameKey(ls("inspector"))||"me")}
function mdLoad(){const L=lsJ(mdKey(),[]);return Array.isArray(L)?L:[]}
function mdSave(L){ls(mdKey(),JSON.stringify(L))}
/* unfinished items from earlier days roll forward to today, so nothing gets lost */
function mdRoll(){const L=mdLoad();const t=todayISO();let ch=false;L.forEach(x=>{if(!x.done&&x.date<t){x.date=t;x.carried=true;ch=true}});if(ch)mdSave(L);return L}
function mdTodayCount(){return mdRoll().filter(x=>!x.done&&x.date===todayISO()).length}
async function viewMyDay(){if(!(ls("inspector")||"").trim()){const n=await askName();if(!n){go("#home");return}}
  setHeader("My Day","Private to you",{icon:"back",aria:"Back",fn:()=>go("#home")});drawMyDay()}
function drawMyDay(){const L=mdRoll();const t=todayISO(),tm=addDaysISO(1);
  const sortF=(a,b)=>(b.pri-a.pri)||String(a.time||"99").localeCompare(String(b.time||"99"))||a.created-b.created;
  const today=L.filter(x=>!x.done&&x.date===t).sort(sortF),tomorrow=L.filter(x=>!x.done&&x.date===tm).sort(sortF),later=L.filter(x=>!x.done&&x.date>tm).sort((a,b)=>a.date.localeCompare(b.date)||sortF(a,b));
  const done=L.filter(x=>x.done&&String(x.doneAt||"").slice(0,10)===t);
  const me=ls("inspector")||"";const mine=regAll().filter(f=>isOpen(f)&&isMine(f)).sort((a,b)=>(daysTo(a.due)??999)-(daysTo(b.due)??999));
  const item=x=>`<div class="mdi ${x.done?"done":""}"><button class="mdc" aria-label="${x.done?"Mark not done":"Mark done"}" onclick="mdToggle('${x.id}')">${x.done?ic("check","s"):""}</button>
    <div class="mdt" onclick="mdEdit('${x.id}')"><span>${x.pri?`<b class="mdp">${ic("star","s")}</b>`:""}${esc(x.text)}</span>${x.time||x.carried||x.date>tm?`<small>${x.time?`${ic("clock","s")} ${esc(x.time)}`:""}${x.date>tm?` ${ic("cal","s")} ${fmtD(x.date)}`:""}${x.carried&&!x.done?` · carried over`:""}</small>`:""}</div>
    <button class="iconbtn mdx" aria-label="Delete" onclick="mdDel('${x.id}')">${ic("trash","s")}</button></div>`;
  const total=today.length+done.length;
  let h=`<div class="privacy">${ic("lock")}<div><b>Private to you${me?`, ${esc(firstName(me))}`:""}</b>Only you can see this page. It is saved on this phone only – it is never sent to the project log, emails or Insights, and the SHE Manager cannot see it.</div></div>`;
  h+=`<div class="card mdhead"><div><div class="muted" style="font-weight:700">${new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}</div>
    <b class="mdbig">${today.length?`${today.length} to do today`:total?"All done for today":"Plan your day"}</b></div>${total?ring(done.length/total,"var(--c)"):""}</div>`;
  h+=`<div class="card"><div class="mdadd"><input class="t" id="mdIn" placeholder="Add something to do…" autocomplete="off" enterkeyhint="done" aria-label="New item"><button class="btn o" onclick="mdAdd()" aria-label="Add">${ic("plus")}</button></div>
    <div class="mdopts"><div class="seg" role="group" aria-label="When">${[["today","Today"],["tomorrow","Tomorrow"],["later","Later"]].map(([k,l])=>`<button class="${MD_ADD.when===k?"on":""}" onclick="MD_ADD.when='${k}';drawMyDay();$('#mdIn').focus()">${l}</button>`).join("")}</div>
    ${MD_ADD.when==="later"?`<input class="t" type="date" id="mdDate" value="${esc(MD_ADD.date||addDaysISO(2))}" min="${addDaysISO(2)}" onchange="MD_ADD.date=this.value">`:""}
    <div class="mdrow"><label class="mdtime">${ic("clock","s")}<input type="time" id="mdTime" value="${esc(MD_ADD.time)}" onchange="MD_ADD.time=this.value" aria-label="Time (optional)"></label>
    <button class="chip ${MD_ADD.pri?"on":""}" onclick="MD_ADD.pri=!MD_ADD.pri;drawMyDay()">${ic("star","s")} Priority</button></div></div>
    <div class="chips scroll" style="margin:10px -16px -2px;padding:2px 16px 4px">${MD_SUGGEST.map(s=>`<button class="chip" onclick="mdQuick(${JSON.stringify(s).replace(/"/g,"&quot;")})">${ic("plus","s")} ${esc(s)}</button>`).join("")}</div></div>`;
  h+=`<h2>Today <span class="cnt">${today.length}</span></h2>${today.length?`<div class="card mdl">${today.map(item).join("")}</div>`:`<div class="card empty" style="padding:18px">${ic("circlecheck")}<b>${done.length?"Nice – today is clear":"Nothing planned yet"}</b>${done.length?"":"Add your first item above."}</div>`}`;
  if(mine.length)h+=`<h2>Actions assigned to you <span class="cnt">${mine.length}</span></h2><div class="card mdl">${mine.slice(0,8).map(f=>`<div class="mdi act-link" onclick="go('#actions/${encodeURIComponent(f.fid)}')"><span class="mdc ro" style="border-color:${actLevelColor(f)}"></span><div class="mdt"><span>${esc(f.action||f.finding)}</span><small class="${isOverdue(f)?"late":""}">${ic("cal","s")} ${esc(dueText(f.due))} · ${esc(f.location||"")}</small></div>${ic("chev")}</div>`).join("")}</div>
    <p class="muted" style="margin:-4px 4px 0">From the project Action register – tap to open or close out.</p>`;
  if(tomorrow.length)h+=`<h2>Tomorrow <span class="cnt">${tomorrow.length}</span></h2><div class="card mdl">${tomorrow.map(item).join("")}</div>`;
  if(later.length)h+=`<h2>Later <span class="cnt">${later.length}</span></h2><div class="card mdl">${later.map(item).join("")}</div>`;
  if(done.length)h+=`<h2>Done today <span class="cnt">${done.length}</span><span class="grow"></span><button class="linkbtn" onclick="mdClearDone()">Clear</button></h2><div class="card mdl">${done.map(item).join("")}</div>`;
  render(h);const i=$("#mdIn");i.addEventListener("keydown",e=>{if(e.key==="Enter")mdAdd()})}
function mdDateFor(){return MD_ADD.when==="today"?todayISO():MD_ADD.when==="tomorrow"?addDaysISO(1):(MD_ADD.date||addDaysISO(2))}
function mdPush(text){text=String(text||"").trim();if(!text)return false;const L=mdLoad();
  L.push({id:"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),text:text.slice(0,300),date:mdDateFor(),time:MD_ADD.time||"",pri:!!MD_ADD.pri,done:false,created:Date.now()});mdSave(L);return true}
function mdAdd(){const i=$("#mdIn");if(!mdPush(i.value)){i.focus();return}MD_ADD.time="";MD_ADD.pri=false;drawMyDay();const j=$("#mdIn");if(j)j.focus()}
function mdQuick(s){mdPush(s);drawMyDay();toast(`Added “${s}”`,1500)}
function mdToggle(id){const L=mdLoad();const x=L.find(x=>x.id===id);if(!x)return;x.done=!x.done;x.doneAt=x.done?new Date().toISOString():"";if(!x.done&&x.date<todayISO())x.date=todayISO();mdSave(L);drawMyDay()}
function mdDel(id){mdSave(mdLoad().filter(x=>x.id!==id));drawMyDay()}
function mdClearDone(){const t=todayISO();mdSave(mdLoad().filter(x=>!(x.done&&String(x.doneAt||"").slice(0,10)===t)));drawMyDay()}
function mdEdit(id){const x=mdLoad().find(x=>x.id===id);if(!x)return;
  const s=sheet(`<h3>Edit</h3><label class="f" for="meT">What</label><textarea class="t" id="meT" rows="2">${esc(x.text)}</textarea>
   <div class="grid2"><div><label class="f" for="meD">Day</label><input class="t" type="date" id="meD" value="${esc(x.date)}"></div><div><label class="f" for="meH">Time</label><input class="t" type="time" id="meH" value="${esc(x.time||"")}"></div></div>
   <label class="vchk"><input type="checkbox" id="meP" ${x.pri?"checked":""}><span>Priority</span></label>
   <div class="row2"><button class="btn g" id="meDel">${ic("trash","s")} Delete</button><button class="btn o" id="meOk">Save</button></div>`);
  s.querySelector("#meOk").onclick=()=>{const L=mdLoad();const y=L.find(z=>z.id===id);if(y){y.text=s.querySelector("#meT").value.trim()||y.text;y.date=s.querySelector("#meD").value||y.date;y.time=s.querySelector("#meH").value;y.pri=s.querySelector("#meP").checked;y.carried=false;mdSave(L)}closeSheet();drawMyDay()};
  s.querySelector("#meDel").onclick=()=>{closeSheet();mdDel(id)}}
