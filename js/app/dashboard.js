"use strict";
/* ---------- dashboard (shared log kept by the relay in a Google Sheet) ---------- */
let DASH={month:null,person:""};
function monthKey(dt){return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}`}
function monthLabel(k){const [y,m]=k.split("-");return new Date(+y,+m-1,1).toLocaleDateString("en-AU",{month:"long",year:"numeric"})}
function ago(iso){const h=(Date.now()-new Date(iso).getTime())/3600000;return h<1?`${Math.max(1,Math.round(h*60))} min ago`:h<48?`${Math.round(h)} h ago`:`${Math.round(h/24)} days ago`}
async function viewDash(){setHeader("Dashboard","Inspections – shared view",{label:"Home",fn:()=>go("#home")});DASH.month=DASH.month||monthKey(new Date());
  if(!directOn()){$("#app").innerHTML=`<div class="alert org"><b>Dashboard not available yet.</b> It needs direct send to be set up by the SHE Manager.</div>`;return}
  const months=[];const n=new Date();for(let i=0;i<12;i++){months.push(monthKey(new Date(n.getFullYear(),n.getMonth()-i,1)))}
  let cache=null;try{cache=JSON.parse(ls("dash_"+DASH.month)||"null")}catch(e){}
  $("#app").innerHTML=`<div class="dctl"><select class="t" id="dMonth">${months.map(m=>`<option value="${m}" ${m===DASH.month?"selected":""}>${monthLabel(m)}</option>`).join("")}</select><select class="t" id="dPerson"><option value="">Everyone</option></select></div><div id="dbody">${cache?"":`<div class="card sending"><span class="spin"></span>Loading…</div>`}</div>`;
  $("#dMonth").onchange=e=>{DASH.month=e.target.value;DASH.person="";viewDash()};
  if(cache)renderDash(cache,true);
  try{const u=`${RELAY.url}?action=dashboard&month=${DASH.month}&key=${encodeURIComponent(RELAY.key)}`;const r=await fetch(u,{redirect:"follow"});const j=await r.json();
    if(!j.ok)throw new Error(j.error||"Error");ls("dash_"+DASH.month,JSON.stringify(j));if(location.hash==="#dash")renderDash(j,false)}
  catch(e){console.error(e);if(location.hash!=="#dash")return;if(cache)toast("No connection – showing the last saved view",4000);else $("#dbody").innerHTML=`<div class="alert org">Could not load the dashboard – check signal and try again.</div><button class="btn w" onclick="viewDash()">Retry</button>`}}
function donutSVG(parts,centre,sub){const tot=parts.reduce((a,p)=>a+p.n,0);const r=52,c=2*Math.PI*r;let off=0;
  const gap=tot&&parts.filter(p=>p.n).length>1?2.2:0;
  const segs=parts.filter(p=>p.n).map(p=>{const len=c*p.n/tot;const el=`<circle class="seg" cx="69" cy="69" r="${r}" fill="none" stroke="${p.col}" stroke-width="20" stroke-dasharray="${Math.max(0,len-gap)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 69 69)"><title>${esc(p.label)}: ${p.n} (${Math.round(p.n/tot*100)}%)</title></circle>`;off+=len;return el}).join("");
  return `<svg viewBox="0 0 138 138" role="img" aria-label="${esc(parts.map(p=>`${p.label} ${p.n}`).join(", "))}"><circle cx="69" cy="69" r="${r}" fill="none" stroke="#E7EAEE" stroke-width="20"/>${segs}
   <text x="69" y="66" text-anchor="middle" font-size="24" font-weight="800" fill="#112B4E" font-family="inherit">${esc(centre)}</text><text x="69" y="84" text-anchor="middle" font-size="10.5" font-weight="700" fill="#5B6675" font-family="inherit">${esc(sub)}</text></svg>`}
function renderDash(j,cached){const key=s=>String(s||"").trim().toLowerCase();const disp={};
  [...j.sent,...j.open].forEach(x=>{const k=key(x.name)||"(no name)";if(!disp[k])disp[k]=x.name||"(no name)"});
  const sel=$("#dPerson");if(sel){const cur=DASH.person;sel.innerHTML=`<option value="">Everyone</option>`+Object.keys(disp).sort().map(k=>`<option value="${esc(k)}" ${k===cur?"selected":""}>${esc(disp[k])}</option>`).join("");sel.onchange=e=>{DASH.person=e.target.value;renderDash(j,cached)}}
  const P=DASH.person;const isNow=j.month===monthKey(new Date());const mine=x=>!P||key(x.name)===P;
  const inMonth=x=>isNow||String(x.started).slice(0,7)===j.month;
  const nm=x=>key(x.name)||"~";
  const inprog=j.open.filter(x=>mine(x)&&inMonth(x)&&x.state==="draft").sort((a,b)=>nm(a).localeCompare(nm(b))||String(a.started).localeCompare(String(b.started)));
  const done=[...j.sent.filter(mine).map(x=>({...x,sentOK:true,when:x.sentAt})),
              ...j.open.filter(x=>mine(x)&&inMonth(x)&&(x.state==="finished"||x.state==="outbox")).map(x=>({...x,sentOK:false,when:x.updated||x.started}))];
  const unsent=done.filter(x=>!x.sentOK).length;
  const people={};done.forEach(x=>{const k=key(x.name)||"(no name)";(people[k]=people[k]||[]).push(x)});
  const allP=new Set([...inprog,...done].map(x=>key(x.name)||"(no name)"));const total=inprog.length+done.length;
  const parts=[{label:"Done – sent",n:done.length-unsent,col:"#1B6B2F"},{label:"Done – not sent",n:unsent,col:"#E59328"},{label:"In progress",n:inprog.length,col:"#3672BE"}];
  const pc=n=>total?Math.round(n/total*100)+"%":"0%";
  let h=`<div class="donut">${donutSVG(parts,total?pc(done.length):"–",total?"completed":"no forms yet")}<div class="dleg">${parts.map(p=>`<div class="r"><span class="sw" style="background:${p.col}"></span>${esc(p.label)}<b>${p.n} · ${pc(p.n)}</b></div>`).join("")}
   <div class="ft">${total} form(s) opened · ${allP.size} ${allP.size===1?"person":"people"}${P?"":" · "+esc(monthLabel(j.month))}</div></div></div>`;
  h+=`<h2>In progress – opened, not finished (${inprog.length})</h2>`;
  if(!inprog.length)h+=`<div class="card muted">Nothing in progress.</div>`;
  inprog.forEach(o=>{const isLate=Date.now()-new Date(o.started).getTime()>24*3600000;
    h+=`<div class="orow ${isLate?"late":""}"><b style="color:var(--navy)">${esc(o.name||"(no name)")}</b> · ${esc(o.no)} ${esc(o.title)}<div class="muted">${esc(o.location||"")}${o.progress?` · <b>${esc(o.progress)}</b>`:""} · opened ${fmtDT(o.started)} (${ago(o.started)})${isLate?' · <b style="color:var(--ua)">over 24 h – follow up</b>':""}</div></div>`});
  h+=`<h2>Completed – ${esc(monthLabel(j.month))} (${done.length})</h2>`;
  if(!done.length)h+=`<div class="card muted">No completed inspections yet.</div>`;
  Object.keys(people).sort((a,b)=>a.localeCompare(b)).forEach(k=>{const L=people[k];const by={};L.forEach(x=>{const t=`${x.no} ${x.title}`;by[t]=(by[t]||0)+1});
    const ns=L.filter(x=>!x.sentOK).length;
    h+=`<div class="pcard"><div class="top"><b>${esc(disp[k]||k)}</b><span class="num">${L.length}</span></div>${ns?`<div style="color:var(--orange);font-weight:800;font-size:13px;margin-top:4px">${ns} finished but not sent yet</div>`:""}<div>${Object.keys(by).sort().map(t=>`<span class="tchip">${esc(t)} ×${by[t]}</span>`).join("")}</div>
     <details style="margin-top:6px" ${ns?"open":""}><summary class="muted" style="cursor:pointer">Show forms</summary>${L.sort((a,b)=>String(b.when).localeCompare(String(a.when))).map(x=>`<div class="muted" style="margin-top:4px">${fmtDT(x.when)} · ${esc(x.no)} ${esc(x.title)} · ${esc(x.location||"")}${(+x.ua||+x.ni)?` · ${x.ua} UA / ${x.ni} NI`:""} · ${x.sentOK?'<b style="color:var(--c)">✓ Sent</b>':x.state==="outbox"?'<b style="color:var(--orange)">Finished – waiting for signal</b>':'<b style="color:var(--orange)">Finished – not sent</b>'}</div>`).join("")}</details></div>`});
  h+=`<p class="muted" style="text-align:center">${cached?"Saved view":"Updated"} ${fmtDT(j.generated)} · <a href="#" onclick="viewDash();return false">Refresh</a><br>Grouped by the name in Settings – use your full name.</p>`;
  $("#dbody").innerHTML=h}
