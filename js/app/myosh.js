"use strict";
/* ---------- MYOSH entry workflow ----------
   Every sent report sits in this queue until the SHE Manager has keyed it into MYOSH and recorded the
   MYOSH reference. Fields are laid out in MYOSH order (MYOSH_FIELDS in config.js) with copy buttons. */
async function viewMyosh(reportId){const seq=ROUTE_SEQ;await loadLocalSent();
  if(reportId){await regFresh(seq);if(stale(seq))return;return viewMyoshEntry(reportId)}
  setHeader("MYOSH entry","Reports waiting to be entered in MYOSH",{icon:"refresh",aria:"Refresh",fn:async()=>{toast("Refreshing…",1200);await regRefresh(true);viewMyosh()}});
  await regFresh(seq);if(stale(seq))return;drawMyosh();regRefresh().then(ch=>{if(ch&&location.hash==="#myosh")drawMyosh()})}
function drawMyosh(){const q=myoshQueue();const M=isManager();
  const oldest=q.length?Math.max(0,-daysTo(String(q[0].sentAt).slice(0,10))):0;
  const cache=lsJ("dash_"+monthKey(new Date()),null);const entered=cache&&cache.sent?cache.sent.filter(s=>s.myoshRef).length:0;
  let h=`<div class="band"><b>${ic("upload","s")} Inspection → MYOSH</b>Each report sent from PARRON is listed here until it has been entered in MYOSH as a SHEQ Inspection and its hazards added to the Hazard Register.</div>`;
  if(!M)h+=`<div class="alert blue">${ic("lock")}<div><b>View only.</b> The SHE Manager records MYOSH references with Manager mode. <a href="#settings">Turn on in Settings</a>.</div></div>`;
  if(directOn()&&REG.v&&REG.v<3)h+=`<div class="alert org">${ic("info")}<div>Relay v2 – showing reports sent from this phone only. Update the relay to v3 for the project-wide queue.</div></div>`;
  h+=`<div class="kpis"><div class="kpi" style="--kc:var(--accent)"><div class="l">${ic("inbox","s")} WAITING</div><div class="v">${q.length}</div><div class="d">reports to enter</div></div>
   <div class="kpi" style="--kc:${oldest>7?"var(--ua)":"var(--ni)"}"><div class="l">${ic("clock","s")} OLDEST</div><div class="v">${q.length?oldest:"–"}<small>${q.length?" days":""}</small></div><div class="d">since sent</div></div>
   <div class="kpi" style="--kc:var(--c)"><div class="l">${ic("check","s")} ENTERED</div><div class="v">${entered}</div><div class="d">this month</div></div>
   <div class="kpi" style="--kc:var(--brand)"><div class="l">${ic("actions","s")} FINDINGS</div><div class="v">${q.reduce((a,r)=>a+(+r.ua||0)+(+r.ni||0),0)}</div><div class="d">for Hazard Register</div></div></div>`;
  h+=`<h2>Queue <span class="cnt">${q.length}</span><span class="grow"></span>${q.length?`<button class="linkbtn" onclick="exportMyoshCSV()">${ic("download","s")} Hazards CSV</button>`:""}</h2>`;
  if(!q.length)h+=`<div class="card empty">${ic("circlecheck")}<b>All caught up</b>Every sent report has been entered in MYOSH.</div>`;
  q.forEach(r=>{const w=Math.max(0,-daysTo(String(r.sentAt).slice(0,10)));const nf=(+r.ua||0)+(+r.ni||0);
    h+=`<div class="card tap" onclick="go('#myosh/${encodeURIComponent(r.reportId)}')"><div class="tab"><div class="n">${esc(r.no||"–")}</div><div class="x"><b>${esc(r.title||"")}</b><span>${esc(r.location||"")} · ${esc(r.name||"")} · ${fmtD(String(r.inspDate||r.sentAt).slice(0,10))}</span>
     <div class="libmeta">${nf?`<span class="tag r">${nf} finding${nf>1?"s":""}</span>`:`<span class="tag g">No findings</span>`}${+r.snn?`<span class="tag o">${r.snn} SNN</span>`:""}<span class="tag ${w>7?"r":""}">${ic("clock","s")} ${w?w+" day"+(w>1?"s":"")+" waiting":"Sent today"}</span>${r.local?`<span class="tag">This phone</span>`:""}</div></div>${ic("chev")}</div></div>`});
  render(h)}
function myoshRecord(reportId){const r=myoshQueue().find(x=>x.reportId===reportId)||(()=>{const s=LOCAL_SENT.find(x=>x.reportId===reportId);if(!s)return null;
    return {reportId,sentAt:new Date(s.sentAt).toISOString(),name:s.inspector,no:s.no||(s.title||"").slice(0,2),title:(s.title||"").replace(/^\d+\s–\s/,""),location:s.location,ua:s.ua,ni:s.ni,snn:s.snn,...(s.report||{}),local:true}})();
  if(!r)return null;const F=regAll().filter(f=>f.reportId===reportId).sort((a,b)=>String(a.item).localeCompare(String(b.item),undefined,{numeric:true}));
  const ls_=LOCAL_SENT.find(x=>x.reportId===reportId);const sup=r.supervisor||(ls_&&ls_.report&&ls_.report.supervisor)||"";
  const dt=String(r.inspDate||r.sentAt||"");const nc=(+r.ua||0)+(+r.ni||0);const open=F.filter(f=>f.status!==ST.spot).length;
  const top=F.map(f=>riskLevel(f.level)).filter(Boolean).sort((a,b)=>b.max-a.max)[0];
  const result=r.c!==""&&r.c!=null?`C ${r.c} | UA ${r.ua} | NI ${r.ni} | N/A ${r.na}${r.pct!==""&&r.pct!=null?` | ${r.pct}% compliant`:""}`:`UA ${r.ua} | NI ${r.ni}`;
  const narrative=[`${r.title} inspection carried out at ${r.location||"the work front"} on ${fmtD(dt.slice(0,10))}${dt.length>10?" at "+dt.slice(11,16):""} by ${r.name||"the inspector"}${r.crew?` (contractor / crew: ${r.crew})`:""}.`,
    r.c!==""&&r.c!=null?`${(+r.c||0)+(+r.ua||0)+(+r.ni||0)+(+r.na||0)} items assessed: ${r.c} compliant, ${r.ua} unacceptable, ${r.ni} needs improvement, ${r.na} not applicable${r.pct!==""&&r.pct!=null?` (${r.pct}% compliant)`:""}.`:"",
    nc?`${nc} non-compliance${nc>1?"s":""} identified${F.length?`: ${F.length-open} closed at the time of inspection and ${open} open with corrective actions assigned`:""}.`:"No non-compliances identified.",
    +r.snn?`${r.snn} finding${+r.snn>1?"s are":" is"} linked to a Genus Safety Non-Negotiable.`:"",top?`Highest residual risk rating: ${top.key}.`:"",
    `Full report: PARRON ${r.reportId} (PDF attached).`].filter(Boolean).join(" ");
  return {...r,supervisor:sup,date:fmtD(dt.slice(0,10)),time:dt.length>10?dt.slice(11,16):"",inspector:r.name||"",result,narrative,findings:F}}
function viewMyoshEntry(reportId){const R_=myoshRecord(reportId);
  setHeader("MYOSH entry",reportId,{icon:"back",aria:"Back to queue",fn:()=>go("#myosh")});
  if(!R_){render(`<div class="card empty">${ic("search")}<b>Report not in the queue</b>It may already have been entered in MYOSH.<br><br><button class="btn" onclick="go('#myosh')">Back to queue</button></div>`);return}
  window._myosh=R_;
  const fields=MYOSH_FIELDS.map(([k,v],i)=>({k,v:typeof v==="function"?String(v(R_)??""):String(v)}));
  let h=`<div class="stepper"><div class="on">1 · Report</div><div>2 · Hazards</div><div>3 · MYOSH ref</div></div>`;
  h+=`<div class="card"><div class="lock">${ic("file","s")} Inspection record</div>${R_.pdf?`<a class="btn g w" style="margin:0 0 6px" href="${esc(R_.pdf)}" target="_blank" rel="noopener">${ic("ext","s")} Open report PDF (Drive) to attach</a>`:`<p class="muted" style="margin-top:0">${ic("info","s")} The PDF is in the report email${R_.local?"":" (Drive archive starts with relay v3)"} – attach it in MYOSH.</p>`}
   ${fields.map((f,i)=>`<div class="mf"><div class="k">${esc(f.k)}</div><div class="v">${esc(f.v||"—")}</div>${f.v?`<button class="iconbtn" aria-label="Copy ${esc(f.k)}" onclick="copyText(window._mf[${i}].v,'${esc(f.k).replace(/'/g,"")}')">${ic("copy")}</button>`:""}</div>`).join("")}
   <button class="btn g w" onclick="copyText(window._mf.map(f=>f.k+': '+f.v).join('\\n'),'All fields')">${ic("copy","s")} Copy all fields</button></div>`;
  window._mf=fields;
  h+=`<h2>Hazard Register entries <span class="cnt">${R_.findings.length}</span></h2>`;
  if(!R_.findings.length)h+=`<div class="card muted">${(+R_.ua||0)+(+R_.ni||0)?"Finding details were not found in the log – use the PDF.":"No findings – nothing to add to the Hazard Register."}</div>`;
  R_.findings.forEach((f,i)=>{h+=`<div class="card act" style="--rc:${actLevelColor(f)}"><div class="top">${riskChip(f.cons,f.like)}<span class="pill ${f.rating==="UA"?"ua":"ni"}">${esc(f.rating)}</span>${statusPill(f)}<span class="grow"></span><button class="iconbtn" aria-label="Copy hazard" onclick="copyText(hazText(${i}),'Hazard ${i+1}')">${ic("copy")}</button></div>
    <dl class="kv"><dt>Hazard</dt><dd>${esc(f.text)}</dd><dt>Finding</dt><dd>${esc(f.finding)}</dd><dt>Control / action</dt><dd>${esc(f.action)}</dd><dt>Assigned to</dt><dd>${esc(f.owner||(f.status===ST.spot?"Closed at inspection":"TBC"))}</dd><dt>Due</dt><dd>${f.due?fmtD(f.due):"—"}</dd>${f.snn?`<dt>SNN</dt><dd>${esc(f.snn)}</dd>`:""}</dl></div>`});
  h+=`<h2>Record MYOSH entry</h2><div class="card">${isManager()?`<label class="f" for="myRef">MYOSH inspection reference No <span class="req">*</span></label><input class="t" id="myRef" placeholder="e.g. INS-004512" autocomplete="off">
   <button class="btn o w" onclick="markMyosh('${esc(reportId)}')">${ic("check","s")} Mark as entered in MYOSH</button>`:`<p class="muted">${ic("lock","s")} Turn on Manager mode in Settings to record the MYOSH reference.</p>`}</div>`;
  render(h)}
function hazText(i){const f=window._myosh.findings[i];return [`Hazard: ${f.text}`,`Finding: ${f.finding}`,`Location: ${f.location||window._myosh.location}`,`Risk: ${f.level||f.rating}${f.score?` (${f.score})`:""}`,`Corrective action: ${f.action}`,
  `Assigned to: ${f.owner||(f.status===ST.spot?"Closed at time of inspection":"TBC")}`,`Due: ${f.due?fmtD(f.due):"-"}`,f.snn?`Safety Non-Negotiable: ${f.snn}`:"",`Source: PARRON ${f.reportId} item ${f.item}`].filter(Boolean).join("\n")}
async function markMyosh(reportId){const ref=($("#myRef").value||"").trim();if(!ref){toast("Enter the MYOSH reference number");return}
  if(v3()){try{const r=await relayPost({payload:{action:"myosh",reportId,ref,by:ls("inspector")||"SHE Manager",pin:ls("mgrPin")||""}},false);
      if(!r||!r.ok){toast((r&&r.error)||"Not saved",5000);if(r&&/PIN/.test(r.error||""))lsDel("mgrPin");return}}catch(e){toast("No connection – try again with signal",4000);return}}
  const done=lsJ("myoshDone",{});done[reportId]=ref;ls("myoshDone",JSON.stringify(done));
  REG.myoshPending=(REG.myoshPending||[]).filter(x=>x.reportId!==reportId);ls("reg",JSON.stringify(REG));updateBadges();
  toast(`✓ Recorded – MYOSH ${ref}`,3500);go("#myosh")}
function exportMyoshCSV(){const H=["PARRON report","Item","Inspection","Location","Date","Inspector","Hazard","Finding","Risk level","Risk score","Corrective action","Assigned to","Due","Status","SNN"];
  const ids=new Set(myoshQueue().map(r=>r.reportId));const rows=regAll().filter(f=>ids.has(f.reportId)).map(f=>[f.reportId,f.item,`${f.no} ${f.title||""}`,f.location,String(f.inspDate||"").slice(0,10),f.by,f.text,f.finding,f.level||f.rating,f.score,f.action,f.owner,f.due,f.status,f.snn]);
  downloadBlob(new Blob([toCSV([H,...rows])],{type:"text/csv"}),`PARRON-MYOSH-hazards-${todayISO()}.csv`);toast("Hazards exported")}
