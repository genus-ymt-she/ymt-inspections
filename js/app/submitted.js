"use strict";
/* ---------- SHE Manager only (Manager mode): Submitted forms register and Monthly figures ----------
   Submitted forms: every report sent through PARRON by anyone, searchable, with the PDF archived in Google Drive
   (fetched through the relay with the Manager PIN, so it opens on any device without a Google sign-in).
   Monthly figures: the totals PARRON captures, ready to copy into the client's monthly report (Atmos App 7). */
let SB={at:0,items:[],open:[]};
let SBF={p:"month",no:"",who:"",q:"",nc:false,n:60};
async function sbLoad(){if(!directOn()||navigator.onLine===false)return false;
  try{const r=await relayPost({payload:{action:"submitted",pin:ls("mgrPin")||""}},false);if(r&&r.badPin){toast("Manager PIN not accepted – turn Manager mode on again",4500);return false}
    if(!r||!r.ok)return false;SB={at:Date.now(),items:r.items||[],open:r.open||[]};return true}catch(e){return false}}
const sbMonth=(iso,off)=>{const d=new Date(iso+"-01T00:00:00");d.setMonth(d.getMonth()+(off||0));return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};
const sbLocalDay=v=>{const d=new Date(v);return isNaN(d)?"":`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
function sbFilter(){const now=todayISO().slice(0,7);const q=SBF.q.trim().toLowerCase();
  return SB.items.filter(s=>{const day=sbLocalDay(s.sentAt);
    if(SBF.p==="month"&&day.slice(0,7)!==now)return false;
    if(SBF.p==="last"&&day.slice(0,7)!==sbMonth(now,-1))return false;
    if(SBF.p==="90"&&daysTo(day)<-90)return false;
    if(SBF.no&&s.no!==SBF.no)return false;if(SBF.who&&!nameEq(s.name,SBF.who))return false;if(SBF.nc&&!(+s.ua||+s.ni))return false;
    return !q||[s.reportId,s.location,s.crew,s.supervisor,s.title,s.name].join(" ").toLowerCase().includes(q)})}
/* route: #submitted */
async function viewSubmitted(){const seq=ROUTE_SEQ;
  setHeader("Submitted forms","Every report sent through PARRON",{icon:"refresh",aria:"Refresh",fn:async()=>{toast("Refreshing…",1200);if(await sbLoad())sbDraw();else toast("Could not refresh – check signal",3000)}});
  if(!isManager()){render(PL_LOCKED().replace("open the planner","see submitted forms"));return}
  if(!directOn()){render(`<div class="alert org">${ic("wifioff")}<div>Direct send is not set up, so submitted forms can't be listed.</div></div>`);return}
  if(!SB.at||Date.now()-SB.at>120e3){render(`<div class="skel" style="height:90px"></div><div class="skel"></div><div class="skel"></div>`);
    const ok=await sbLoad();if(stale(seq))return;if(!ok&&!SB.at){render(`<div class="card empty">${ic("wifioff")}<b>Couldn't load the register</b>Open this with signal. The PDFs are also in Google Drive (PARRON – Reports).</div>`);return}}
  regRefresh().then(()=>{});sbDraw()}
function sbDraw(){if(location.hash!=="#submitted")return;const forms=[...new Map(SB.items.map(s=>[s.no,s.title])).entries()].sort((a,b)=>+a[0]-+b[0]);
  const people=[...new Set(SB.items.map(s=>s.name).filter(Boolean))].sort();const L=sbFilter();
  const sod=todayISO();const open=SB.open.slice().sort((a,b)=>String(a.started).localeCompare(String(b.started)));const old=open.filter(o=>sbLocalDay(o.started)<sod);
  let h=open.length?`<details class="pl-more sb-open" ${old.length?"open":""}><summary><h2>Started, not sent <span class="cnt">${open.length}</span>${old.length?`<span class="tag r">${old.length} from earlier days</span>`:""}</h2></summary>
    <div class="card pl-log">${open.map(o=>`<div><span><b>${esc(o.no)} · ${esc(o.title)}</b><small>${esc(o.name)} · ${esc(o.location||"no location")} · started ${esc(fmtDT(o.started))}${o.state==="outbox"?" · finished, waiting for signal":""}</small></span></div>`).join("")}</div></details>`:"";
  h+=`<div class="sb-bar"><div class="search">${ic("search")}<input id="sbQ" type="search" placeholder="Report ID, location, crew…" value="${esc(SBF.q)}" aria-label="Search submitted forms"></div>
    <div class="chips sb-p">${[["month","This month"],["last","Last month"],["90","90 days"],["all","All"]].map(([k,l])=>`<button class="chip ${SBF.p===k?"on":""}" data-p="${k}">${l}</button>`).join("")}<button class="chip ${SBF.nc?"on":""}" id="sbNc">With UA / NI</button></div>
    <div class="grid2"><select class="t" id="sbNo" aria-label="Form"><option value="">All forms</option>${forms.map(([n,t])=>`<option value="${esc(n)}" ${SBF.no===n?"selected":""}>${esc(n)} – ${esc(t)}</option>`).join("")}</select>
    <select class="t" id="sbWho" aria-label="Person"><option value="">Everyone</option>${people.map(p=>`<option ${nameEq(SBF.who,p)?"selected":""}>${esc(p)}</option>`).join("")}</select></div></div>
    <h2>${L.length} report${L.length===1?"":"s"} <span class="grow"></span><button class="lnk" type="button" onclick="sbCSV()">${ic("download","s")} CSV</button></h2>`;
  h+=L.length?`<div class="sb-list">${L.slice(0,SBF.n).map(s=>`<button class="card tap sb-item" onclick="sbDetail('${esc(s.reportId||s.uid)}')"><span class="n">${esc(s.no)}</span><span class="x"><b>${esc(s.title)}</b>
      <small>${esc(s.name)} · ${esc(s.location||"–")} · ${esc(fmtDT(s.sentAt))}</small><small class="muted">${esc(s.reportId)}</small>
      <span class="libmeta">${+s.ua?`<span class="tag r">${s.ua} UA</span>`:""}${+s.ni?`<span class="tag o">${s.ni} NI</span>`:""}${+s.snn?`<span class="tag o">${s.snn} SNN</span>`:""}${s.pct!==""&&s.pct!=null?`<span class="tag">${esc(s.pct)}% compliant</span>`:""}${s.pdf?`<span class="tag g">${ic("file","s")} PDF</span>`:`<span class="tag">No PDF</span>`}</span></span>${ic("chev")}</button>`).join("")}</div>
      ${L.length>SBF.n?`<button class="btn g w" onclick="SBF.n+=100;sbDraw()">Show more (${L.length-SBF.n} more)</button>`:""}`
    :`<div class="card empty">${ic("search")}<b>No reports match</b>Try a different period or filter.</div>`;
  h+=`<p class="foot">PDFs are archived in Google Drive (PARRON – Reports, one folder per month) when they are sent. Hazard and positive reports are under <a href="#reports">Hazard &amp; positive reports</a>.</p>`;
  render(h);
  const q=$("#sbQ");let tm=0;q.addEventListener("input",()=>{clearTimeout(tm);tm=setTimeout(()=>{SBF.q=q.value;SBF.n=60;sbDraw();const e=$("#sbQ");if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length)}},300)});
  document.querySelectorAll(".sb-p [data-p]").forEach(b=>b.onclick=()=>{SBF.p=b.dataset.p;SBF.n=60;sbDraw()});
  $("#sbNc").onclick=()=>{SBF.nc=!SBF.nc;sbDraw()};$("#sbNo").onchange=e=>{SBF.no=e.target.value;sbDraw()};$("#sbWho").onchange=e=>{SBF.who=e.target.value;sbDraw()}}
function sbDetail(id){const s=SB.items.find(x=>(x.reportId||x.uid)===id);if(!s)return;const F=regAll().filter(f=>f.reportId===s.reportId);
  const sh=sheet(`<h3>${esc(s.no)} · ${esc(s.title)}</h3><dl class="pl-kv">
    <dt>Report ID</dt><dd>${esc(s.reportId||"–")}</dd><dt>By</dt><dd>${esc(s.name)}</dd><dt>Location</dt><dd>${esc(s.location||"–")}</dd>
    <dt>Inspected</dt><dd>${esc(s.inspDate?fmtDT(s.inspDate):"–")}</dd><dt>Sent</dt><dd>${esc(fmtDT(s.sentAt))}</dd>
    ${s.crew?`<dt>Crew</dt><dd>${esc(s.crew)}</dd>`:""}${s.supervisor?`<dt>Supervisor</dt><dd>${esc(s.supervisor)}</dd>`:""}
    ${s.pct!==""&&s.pct!=null?`<dt>Result</dt><dd>${esc(s.c)} C · ${esc(s.ua)} UA · ${esc(s.ni)} NI · ${esc(s.na)} N/A · ${esc(s.pct)}% compliant</dd>`:""}</dl>
    ${F.length?`<h4 class="pl-h4">Findings (${F.length})</h4><div class="pl-log">${F.map(f=>`<div><span><b>${esc(f.item)} · ${esc(f.rating)}${f.level?` · ${esc(f.level)}`:""} – ${esc(f.status)}</b><small>${esc(f.finding||f.text)}${f.action?` → ${esc(f.action)}`:""}${f.owner?` · ${esc(f.owner)}`:""}</small></span></div>`).join("")}</div>`:""}
    ${s.pdf?`<button class="btn o w" id="sbPdf">${ic("file","s")} Open the PDF</button><a class="btn g w" href="https://drive.google.com/file/d/${esc(s.pdf)}/view" target="_blank" rel="noopener">${ic("ext","s")} Open in Google Drive</a>`
      :`<div class="alert org">${ic("info")}<div>No PDF was archived for this report (sent before Drive archiving, or shared through Outlook).</div></div>`}
    <button class="btn g w" onclick="copyText('${esc(s.reportId)}','Report ID')">${ic("copy","s")} Copy report ID</button>`,{wide:true});
  const b=sh.querySelector("#sbPdf");if(b)b.onclick=()=>sbPdf(s.pdf,b)}
async function sbPdf(id,btn){const w=window.open("","_blank");
  try{if(w)w.document.write('<p style="font:16px sans-serif;padding:24px">Loading the PDF…</p>');}catch(e){}
  if(btn){btn.disabled=true;btn.innerHTML='<span class="sending"><span class="spin"></span>Loading…</span>'}
  try{const r=await relayPost({payload:{action:"reportPdf",id,pin:ls("mgrPin")||""}},false);if(r&&r.badPin)throw new Error("Manager PIN not accepted – turn Manager mode on again");if(!r||!r.ok)throw new Error((r&&r.error)||"Could not open the PDF");
    const bin=atob(r.data);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([u8],{type:"application/pdf"}));
    if(w&&!w.closed)w.location.href=url;else{const l=document.createElement("a");l.href=url;l.target="_blank";l.rel="noopener";document.body.appendChild(l);l.click();l.remove()}
    setTimeout(()=>URL.revokeObjectURL(url),120e3)}
  catch(e){try{if(w)w.close()}catch(x){}toast(navigator.onLine===false?"Needs signal to open the PDF":String(e.message||e),4000)}
  finally{if(btn){btn.disabled=false;btn.innerHTML=`${ic("file","s")} Open the PDF`}}}
function sbCSV(){const L=sbFilter();downloadBlob(new Blob([toCSV([["Sent","Report ID","No","Form","Name","Location","Inspection date","Crew","Supervisor","C","UA","NI","N/A","SNN","Compliance %","PDF"],
  ...L.map(s=>[fmtDT(s.sentAt),s.reportId,s.no,s.title,s.name,s.location,s.inspDate,s.crew,s.supervisor,s.c,s.ua,s.ni,s.na,s.snn,s.pct,s.pdf?`https://drive.google.com/file/d/${s.pdf}/view`:""])])],{type:"text/csv"}),`PARRON-submitted-forms-${todayISO()}.csv`)}

/* ---------- Monthly figures – the numbers PARRON captures, for the client's monthly report ---------- */
const FG_NOT_INSP=[23,28,50];   // Mentoring discussion record, the fuel register and Take 5s are not inspections (Take 5s are counted on their own)
const fgIsInsp=no=>+no>0&&!FG_NOT_INSP.includes(+no);
let FGM="";
/* Atmos App 7 – HSE Metrics: Principal Contractor "Actual" column for a month (template runs Jul 2025 – Mar 2027) */
function fgCell(m,row){const k=(+m.slice(0,4)-2025)*12+(+m.slice(5,7)-7);if(k<0||k>20)return "";let n=6+2*k,s="";while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26)}return s+row}
const fgMonthOf=s=>(String(s.inspDate||"").slice(0,7))||sbLocalDay(s.sentAt).slice(0,7);
async function viewFigures(){const seq=ROUTE_SEQ;
  if(!FGM){const t=new Date();FGM=t.getDate()<=15?sbMonth(todayISO().slice(0,7),-1):todayISO().slice(0,7)}
  const lab=m=>new Date(m+"-01T00:00:00").toLocaleDateString("en-AU",{month:"long",year:"numeric"});
  setHeader("Monthly figures",`${lab(FGM)} · for the client monthly report`,{icon:"back",aria:"Back",fn:()=>go("#planner")});
  if(!isManager()){render(PL_LOCKED().replace("open the planner","see the monthly figures"));return}
  const months=[];for(let i=0;i<13;i++)months.push(sbMonth(todayISO().slice(0,7),-i));
  const pick=`<label class="f" for="fgM">Month</label><select class="t" id="fgM">${months.map(m=>`<option value="${m}" ${m===FGM?"selected":""}>${lab(m)}</option>`).join("")}</select>`;
  render(pick+`<div class="skel" style="height:120px"></div><div class="skel"></div>`);$("#fgM").onchange=e=>{FGM=e.target.value;viewFigures()};
  let a,b;try{[a,b]=await Promise.all([wkMonth(FGM),wkMonth(sbMonth(FGM,1)).catch(()=>({sent:[],obs:[],open:[]}))])}
  catch(e){if(!stale(seq)){render(pick+`<div class="card empty">${ic("wifioff")}<b>Couldn't load ${esc(lab(FGM))}</b>Open this with signal.</div>`);$("#fgM").onchange=e=>{FGM=e.target.value;viewFigures()}}return}
  if(stale(seq))return;
  // reports are counted in the month they were carried out (sent late still counts); de-duplicated across the two months fetched
  const sent=[...new Map([...(a.sent||[]),...(b.sent||[])].map(s=>[(s.uid||"")+"|"+(s.reportId||""),s])).values()].filter(s=>fgMonthOf(s)===FGM);
  const obs=[...new Map([...(a.obs||[]),...(b.obs||[])].map(o=>[o.reportId||o.at,o])).values()].filter(o=>sbLocalDay(o.at).slice(0,7)===FGM);
  const ins=sent.filter(s=>fgIsInsp(s.no)),haz=obs.filter(o=>o.type==="hazard"),pos=obs.filter(o=>o.type!=="hazard"),other=sent.filter(s=>!fgIsInsp(s.no)&&+s.no!==T5_NUM);const t5=sent.filter(s=>+s.no===T5_NUM),t5stop=t5.filter(s=>+s.ua>0);
  const pend=[...(a.open||[]),...(b.open||[])].filter(o=>fgIsInsp(o.no)&&sbLocalDay(o.started).slice(0,7)===FGM);
  const pendU=[...new Map(pend.map(o=>[o.name+o.no+o.started,o])).values()];
  const by=(L,k)=>{const m={};L.forEach(x=>{const key=k(x);m[key]=(m[key]||0)+1});return Object.entries(m).sort((x,y)=>y[1]-x[1]||x[0].localeCompare(y[0]))};
  const tbl=(rows,h1)=>rows.length?`<table class="hv-tab"><tr><th>${h1}</th><th style="text-align:right">Count</th></tr>${rows.map(([k,n])=>`<tr><td>${esc(k)}</td><td style="text-align:right"><b>${n}</b></td></tr>`).join("")}</table>`:`<p class="muted">None.</p>`;
  const cI=fgCell(FGM,51),cH=fgCell(FGM,56);
  let h=pick+`<div class="fg-kpis">
    <div class="card"><span class="muted">Inspections</span><b>${ins.length}</b><small>All PARRON inspections and task observations(not mentoring, the fuel register or Take 5s)</small><button class="btn g s" onclick="copyText('${ins.length}','Inspections')">${ic("copy","s")} Copy</button></div>
    <div class="card"><span class="muted">Hazard reports</span><b>${haz.length}</b><small>Hazard reports submitted in PARRON</small><button class="btn g s" onclick="copyText('${haz.length}','Hazard reports')">${ic("copy","s")} Copy</button></div>
    <div class="card fg-t5"><span class="muted">Take 5s</span><b>${t5.length}</b><small>${t5stop.length} stopped – referred to a Supervisor</small><button class="btn g s" onclick="copyText('${t5.length}','Take 5s')">${ic("copy","s")} Copy</button></div>${ltMonthHTML(FGM)}</div>
    ${cI?`<div class="alert blue">${ic("info")}<div>Atmos App 7 › <b>HSE Metrics</b> › Principal Contractor › ${esc(lab(FGM))} <b>Actual</b>: Inspections <b>${cI}</b>, Hazard reports <b>${cH}</b>.</div></div>`:""}
    ${pendU.length?`<div class="alert org">${ic("clock")}<div><b>${pendU.length} inspection${pendU.length>1?"s":""} started in ${esc(lab(FGM))} not sent yet</b> – not counted until sent.<br>${pendU.slice(0,6).map(o=>`${esc(o.no)} ${esc(o.title)} – ${esc(o.name)}`).join("<br>")}</div></div>`:""}
    <h2>Inspections by form</h2><div class="card">${tbl(by(ins,s=>`${s.no} – ${s.title}`),"Form")}</div>
    <h2>Take 5s by person <span class="cnt">${t5.length}</span></h2><div class="card">${tbl(by(t5,s=>s.name||"(no name)"),"Person")}${t5stop.length?`<p class="muted" style="margin:8px 0 0"><b style="color:var(--ua)">${t5stop.length} DO NOT PROCEED:</b> ${t5stop.map(s=>`${esc(s.name)} – ${esc(s.location||"")} (${esc(fmtD(sbLocalDay(s.sentAt)))})`).join("; ")}</p>`:""}</div>
    <h2>Inspections by person</h2><div class="card">${tbl(by(ins,s=>s.name||"(no name)"),"Person")}</div>
    <h2>Hazard reports <span class="cnt">${haz.length}</span></h2><div class="card pl-log">${haz.length?haz.map(o=>`<div><span><b>${esc(o.reportId||"")} · ${esc(o.level||"Not rated")}</b><small>${esc(fmtD(sbLocalDay(o.at)))} · ${esc(o.name||"")} · ${esc(o.location||"")}${o.description?` – ${esc(String(o.description).slice(0,90))}`:""}</small></span></div>`).join(""):`<p class="muted">None.</p>`}</div>
    <h2>Also captured (not in App 7)</h2><div class="card"><table class="hv-tab"><tr><td>Positive observations</td><td style="text-align:right"><b>${pos.length}</b></td></tr>${by(other,s=>`${s.no} – ${s.title}`).map(([k,n])=>`<tr><td>${esc(k)}</td><td style="text-align:right"><b>${n}</b></td></tr>`).join("")}</table></div>
    <h2>Enter from MYOSH and site records</h2><div class="card"><ul class="fg-man">${["Hours worked (including subcontractors)","HSE audits","Leadership interactions (SHEDs)","Team meetings (toolbox, HSE / SIMOPS)","Near miss reports","Injury, significant, property, vehicle, environment and community incidents","Fuel and water consumption","Quality defects (Category A–D)"].map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
    <button class="btn g w" onclick="copyText('Inspections\\t${ins.length}\\nHazard reports\\t${haz.length}\\nTake 5s\\t${t5.length}','Figures')">${ic("copy","s")} Copy all three (paste into Excel)</button>
    <p class="foot">Counted by the date each inspection was carried out. Hazard reports are entered in MYOSH from PARRON, so the two totals should match.</p>`;
  render(h);$("#fgM").onchange=e=>{FGM=e.target.value;viewFigures()}}
