"use strict";
/* ---------- Insights (shared log kept by the relay in a Google Sheet) ---------- */
let DASH={month:null,person:"",j:null};
function monthKey(dt){return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}`}
function monthLabel(k){const [y,m]=k.split("-");return new Date(+y,+m-1,1).toLocaleDateString("en-AU",{month:"long",year:"numeric"})}
function monthShort(k){const [y,m]=k.split("-");return new Date(+y,+m-1,1).toLocaleDateString("en-AU",{month:"short"})}
function ago(iso){const h=(Date.now()-new Date(iso).getTime())/3600000;return h<1?`${Math.max(1,Math.round(h*60))} min ago`:h<48?`${Math.round(h)} h ago`:`${Math.round(h/24)} days ago`}
async function viewDash(){const seq=ROUTE_SEQ;setHeader("Insights","Project HSE performance",{icon:"refresh",aria:"Refresh",fn:()=>viewDash()});DASH.month=DASH.month||monthKey(new Date());
  if(!directOn()){render(`<div class="card empty">${ic("chart")}<b>Insights not available yet</b>Insights need direct send to be set up by the SHE Manager.</div>`);return}
  await loadLocalSent();if(stale(seq))return;
  const months=[];const n=new Date();for(let i=0;i<12;i++){months.push(monthKey(new Date(n.getFullYear(),n.getMonth()-i,1)))}
  const cache=lsJ("dash_"+DASH.month,null);
  render(`<div class="dctl"><select class="t" id="dMonth" aria-label="Month">${months.map(m=>`<option value="${m}" ${m===DASH.month?"selected":""}>${monthLabel(m)}</option>`).join("")}</select><select class="t" id="dPerson" aria-label="Person"><option value="">Everyone</option></select></div><div id="dbody">${cache?"":`<div class="skel" style="height:120px"></div><div class="skel" style="height:220px"></div><div class="skel"></div>`}</div>`);
  $("#dMonth").onchange=e=>{DASH.month=e.target.value;DASH.person="";viewDash()};
  if(cache)renderDash(cache,true);
  try{const u=`${RELAY.url}?action=dashboard&month=${DASH.month}&key=${encodeURIComponent(RELAY.key)}`;const r=await fetch(u,{redirect:"follow"});const j=await r.json();
    if(!j.ok)throw new Error(j.error||"Error");ls("dash_"+DASH.month,JSON.stringify(j));
    if(j.v>=3){REG={at:Date.now(),v:j.v,findings:j.findings||[],trend:j.trend||[],month:j.month};ls("reg",JSON.stringify(REG));if(RELAY.v<3){RELAY.v=j.v;ls("relayCfg",JSON.stringify(RELAY))}updateBadges()}
    if(location.hash==="#dash"||location.hash==="#insights")renderDash(j,false)}
  catch(e){console.error(e);if(!/^#(dash|insights)$/.test(location.hash))return;if(cache)toast("No connection – showing the last saved view",4000);else $("#dbody").innerHTML=`<div class="card empty">${ic("wifioff")}<b>Could not load Insights</b>Check signal and try again.<br><br><button class="btn" onclick="viewDash()">${ic("refresh","s")} Retry</button></div>`}}
function donutSVG(parts,centre,sub){const tot=parts.reduce((a,p)=>a+p.n,0);const r=52,c=2*Math.PI*r;let off=0;
  const gap=tot&&parts.filter(p=>p.n).length>1?2.2:0;
  const segs=parts.filter(p=>p.n).map(p=>{const len=c*p.n/tot;const el=`<circle class="seg" cx="69" cy="69" r="${r}" fill="none" stroke="${p.col}" stroke-width="18" stroke-dasharray="${Math.max(0,len-gap)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 69 69)"><title>${esc(p.label)}: ${p.n} (${Math.round(p.n/tot*100)}%)</title></circle>`;off+=len;return el}).join("");
  return `<svg viewBox="0 0 138 138" role="img" aria-label="${esc(parts.map(p=>`${p.label} ${p.n}`).join(", "))}"><circle cx="69" cy="69" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="18"/>${segs}
   <text x="69" y="67" text-anchor="middle" font-size="24" font-weight="800" fill="var(--ink)">${esc(centre)}</text><text x="69" y="85" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--muted)">${esc(sub)}</text></svg>`}
/* 6-month bars (inspections) + line (average compliance) */
function trendSVG(trend){const W=320,H=150,L=26,Rr=30,T=12,B=24;const n=trend.length||1;const bw=(W-L-Rr)/n;const mx=Math.max(4,...trend.map(t=>t.inspections));
  const y=v=>T+(H-T-B)*(1-v/mx),yp=v=>T+(H-T-B)*(1-v/100);
  const grid=[0,.5,1].map(f=>`<line class="gl" x1="${L}" x2="${W-Rr}" y1="${T+(H-T-B)*f}" y2="${T+(H-T-B)*f}"/><text x="${L-6}" y="${T+(H-T-B)*f+4}" text-anchor="end">${Math.round(mx*(1-f))}</text><text x="${W-Rr+6}" y="${T+(H-T-B)*f+4}">${Math.round(100*(1-f))}%</text>`).join("");
  const bars=trend.map((t,i)=>{const x=L+i*bw+bw*.2,w=bw*.6,yy=y(t.inspections);return `<rect x="${x}" y="${yy}" width="${w}" height="${H-B-yy}" rx="4" fill="var(--brand-2)" opacity="${i===n-1?1:.55}"><title>${monthLabel(t.month)}: ${t.inspections} inspections</title></rect><text x="${x+w/2}" y="${H-8}" text-anchor="middle">${monthShort(t.month)}</text>${t.inspections?`<text x="${x+w/2}" y="${yy-4}" text-anchor="middle" style="font-weight:800;fill:var(--ink)">${t.inspections}</text>`:""}`}).join("");
  const pts=trend.map((t,i)=>t.avgPct==null?null:[L+i*bw+bw/2,yp(t.avgPct),t]).filter(Boolean);
  const line=pts.length>1?`<polyline points="${pts.map(p=>p[0]+","+p[1]).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`:"";
  const dots=pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.5"><title>${monthLabel(p[2].month)}: ${p[2].avgPct}% average compliance</title></circle>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Inspections and compliance, last 6 months">${grid}${bars}${line}${dots}</svg>`}
function hbars(rows,max){max=max||Math.max(1,...rows.map(r=>r.parts.reduce((a,p)=>a+p.n,0)));
  return rows.map(r=>{const tot=r.parts.reduce((a,p)=>a+p.n,0);return `<div class="hbar"><span class="lb" title="${esc(r.label)}">${esc(r.label)}</span><span class="tr">${r.parts.map(p=>`<i style="width:${p.n/max*100}%;background:${p.col}" title="${esc(p.label)}: ${p.n}"></i>`).join("")}</span><span class="vl">${tot}</span></div>`}).join("")}
function delta(cur,prev,suffix,goodUp){if(cur==null||prev==null||prev===0&&cur===0)return "";const d=Math.round((cur-prev)*10)/10;if(!d)return `<span>no change</span>`;
  const good=goodUp?d>0:d<0;return `<span class="${good?"up":"dn"}">${d>0?"▲":"▼"} ${Math.abs(d)}${suffix||""}</span> vs last month`}
function dashData(j){const key=nameKey;const P=DASH.person;const mine=x=>!P||key(x.name)===P;const isNow=j.month===monthKey(new Date());
  const inMonth=x=>isNow||String(x.started).slice(0,7)===j.month;
  const inprog=j.open.filter(x=>mine(x)&&inMonth(x)&&x.state==="draft").sort((a,b)=>key(a.name).localeCompare(key(b.name))||String(a.started).localeCompare(String(b.started)));
  const sent=j.sent.filter(mine);
  const done=[...sent.map(x=>({...x,sentOK:true,when:x.sentAt})),...j.open.filter(x=>mine(x)&&inMonth(x)&&(x.state==="finished"||x.state==="outbox")).map(x=>({...x,sentOK:false,when:x.updated||x.started}))];
  const F=(j.findings||[]).filter(f=>String(f.raised).slice(0,7)===j.month&&(!P||key(f.by)===P));
  const pcs=sent.map(x=>x.pct).filter(x=>x!==""&&x!=null).map(Number);
  return {P,inprog,sent,done,F,avgPct:pcs.length?Math.round(pcs.reduce((a,b)=>a+b,0)/pcs.length):null,ua:sent.reduce((a,x)=>a+(+x.ua||0),0),ni:sent.reduce((a,x)=>a+(+x.ni||0),0),snn:sent.reduce((a,x)=>a+(+x.snn||0),0)}}
function renderDash(j,cached){DASH.j=j;const key=nameKey;const disp={};
  [...j.sent,...j.open].forEach(x=>{const k=key(x.name)||"(no name)";if(!disp[k])disp[k]=x.name||"(no name)"});
  const sel=$("#dPerson");if(sel){const cur=DASH.person;sel.innerHTML=`<option value="">Everyone</option>`+Object.keys(disp).sort().map(k=>`<option value="${esc(k)}" ${k===cur?"selected":""}>${esc(disp[k])}</option>`).join("");sel.onchange=e=>{DASH.person=e.target.value;renderDash(j,cached)}}
  const D=dashData(j);const V3=j.v>=3;const trend=j.trend||[];const prev=trend.length>1?trend[trend.length-2]:null;
  const all=V3?(j.findings||[]):regAll();const rs=regStats(all);
  const spotN=D.F.filter(f=>f.status===ST.spot).length;
  let h=`<div class="kpis">
   <div class="kpi" style="--kc:var(--brand-2)"><div class="l">${ic("clipboard","s")} INSPECTIONS</div><div class="v">${D.sent.length}</div><div class="d">${D.P?"sent":delta(D.sent.length,prev&&prev.inspections,"",true)||"sent this month"}</div></div>
   <div class="kpi" style="--kc:${D.avgPct===null?"var(--na)":D.avgPct>=90?"var(--c)":D.avgPct>=75?"var(--ni)":"var(--ua)"}"><div class="l">${ic("gauge","s")} COMPLIANCE</div><div class="v">${D.avgPct===null?"–":D.avgPct}<small>${D.avgPct===null?"":"%"}</small></div><div class="d">${D.P?"average":delta(D.avgPct,prev&&prev.avgPct,"%",true)||"average score"}</div></div>
   <div class="kpi" style="--kc:var(--ua)"><div class="l">${ic("alert","s")} FINDINGS</div><div class="v">${D.ua+D.ni}</div><div class="d"><b style="color:var(--ua)">${D.ua} UA</b> · ${D.ni} NI${D.snn?` · <b style="color:var(--accent)">${D.snn} SNN</b>`:""}</div></div>
   <div class="kpi" style="--kc:var(--c)"><div class="l">${ic("check","s")} CLOSED ON SPOT</div><div class="v">${D.F.length?Math.round(spotN/D.F.length*100):"–"}<small>${D.F.length?"%":""}</small></div><div class="d">${spotN} of ${D.F.length} findings</div></div>
   <button class="kpi" style="--kc:var(--ni)" onclick="ACTF.f='open';go('#actions')"><div class="l">${ic("actions","s")} OPEN ACTIONS</div><div class="v">${rs.open}</div><div class="d">${rs.highOpen} high / critical</div></button>
   <button class="kpi" style="--kc:var(--ua)" onclick="ACTF.f='overdue';go('#actions')"><div class="l">${ic("clock","s")} OVERDUE</div><div class="v" style="color:${rs.overdue?"var(--ua)":"inherit"}">${rs.overdue}</div><div class="d">${rs.dueWeek} due in 7 days</div></button>
   <div class="kpi" style="--kc:var(--brand)"><div class="l">${ic("trend","s")} AVG DAYS TO CLOSE</div><div class="v">${rs.avgClose===null?"–":rs.avgClose}</div><div class="d">raised → closed out</div></div>
   <button class="kpi" style="--kc:var(--accent)" onclick="ACTF.f='verify';go('#actions')"><div class="l">${ic("shield","s")} TO VERIFY</div><div class="v">${rs.toVerify}</div><div class="d">${rs.verified} verified</div></button></div>`;
  h+=`<div class="row2" style="margin:0 0 8px"><button class="btn o" onclick="monthlyPDF()">${ic("file","s")} Monthly report</button><button class="btn o" onclick="weeklyReport()">${ic("cal","s")} Weekly report</button></div><button class="btn g w" style="margin:0 0 12px" onclick="copySafetySummary()">${ic("copy","s")} Copy 2.1 text</button>`;
  if(!V3)h+=`<div class="alert org">${ic("info")}<div><b>Relay v2 connected.</b> Trend, findings and action charts appear once the relay script is updated to v3.</div></div>`;
  h+=`<div class="grid-2">`;
  if(trend.length)h+=`<div class="chart"><h3>Inspections & compliance</h3><div class="sub">Last 6 months · whole project</div>${trendSVG(trend)}<div class="legend"><span><i style="background:var(--brand-2)"></i>Inspections sent</span><span><i style="background:var(--accent)"></i>Average compliance</span></div></div>`;
  // status donut
  const unsent=D.done.filter(x=>!x.sentOK).length;const total=D.inprog.length+D.done.length;const pc=n=>total?Math.round(n/total*100)+"%":"0%";
  const parts=[{label:"Done – sent",n:D.done.length-unsent,col:"var(--c)"},{label:"Done – not sent",n:unsent,col:"var(--accent)"},{label:"In progress",n:D.inprog.length,col:"var(--info)"}];
  h+=`<div class="chart"><h3>Form status</h3><div class="sub">${esc(monthLabel(j.month))}${D.P?" · "+esc(disp[D.P]||""):""}</div><div class="donut">${donutSVG(parts,total?pc(D.done.length):"–",total?"completed":"no forms yet")}<div class="dleg">${parts.map(p=>`<div class="r"><span class="sw" style="background:${p.col}"></span>${esc(p.label)}<b>${p.n}</b></div>`).join("")}
   <div class="ft">${total} form(s) opened · ${new Set([...D.inprog,...D.done].map(x=>key(x.name))).size} people</div></div></div></div>`;
  if(V3){const byT={};D.sent.forEach(x=>{const k=`${x.no} ${x.title}`;const o=byT[k]=byT[k]||{ua:0,ni:0,n:0};o.ua+=+x.ua||0;o.ni+=+x.ni||0;o.n++});
    const rowsT=Object.entries(byT).sort((a,b)=>(b[1].ua+b[1].ni)-(a[1].ua+a[1].ni)||b[1].n-a[1].n).slice(0,8).map(([k,o])=>({label:k,parts:[{label:"UA",n:o.ua,col:"var(--ua)"},{label:"NI",n:o.ni,col:"var(--ni)"}]}));
    h+=`<div class="chart"><h3>Findings by inspection type</h3><div class="sub">${esc(monthLabel(j.month))}</div>${rowsT.some(r=>r.parts.some(p=>p.n))?hbars(rowsT):`<div class="empty" style="padding:14px">${ic("circlecheck")}<b>No findings this month</b></div>`}<div class="legend"><span><i style="background:var(--ua)"></i>UA</span><span><i style="background:var(--ni)"></i>NI</span></div></div>`;
    const lv=RISK.levels.slice().reverse().map(x=>({label:x.key,parts:[{label:"Open",n:D.F.filter(f=>f.level===x.key&&f.status===ST.open).length,col:x.color},{label:"Closed",n:D.F.filter(f=>f.level===x.key&&f.status!==ST.open).length,col:`color-mix(in srgb,${x.color} 35%,var(--surface-3))`}]}));
    h+=`<div class="chart"><h3>Risk profile</h3><div class="sub">Findings raised in ${esc(monthLabel(j.month))} by risk rating</div>${hbars(lv)}<div class="legend"><span><i style="background:var(--ua)"></i>Open (solid)</span><span><i style="background:var(--surface-3)"></i>Closed (faded)</span></div></div>`;
    const since=new Date();since.setDate(since.getDate()-90);const rep={};(j.findings||[]).filter(f=>new Date(f.raised)>=since).forEach(f=>{const k=f.item;const o=rep[k]=rep[k]||{n:0,text:f.text,title:f.title,locs:new Set()};o.n++;o.locs.add(f.location)});
    const repL=Object.entries(rep).filter(([,o])=>o.n>1).sort((a,b)=>b[1].n-a[1].n).slice(0,8);
    h+=`<div class="chart"><h3>Repeat findings</h3><div class="sub">Same checklist item failed more than once · last 90 days</div>${repL.length?`<table class="table"><tr><th>Item</th><th>Requirement</th><th class="right">Times</th></tr>${repL.map(([k,o])=>`<tr><td><b>${esc(k)}</b></td><td>${esc(o.text)}<div class="muted">${esc([...o.locs].filter(Boolean).slice(0,3).join(", "))}</div></td><td class="right"><b>${o.n}</b></td></tr>`).join("")}</table>`:`<div class="empty" style="padding:14px">${ic("circlecheck")}<b>No repeat findings</b></div>`}</div>`}
  // lead indicators
  {const O=(j.obs||[]).filter(o=>String(o.at).slice(0,7)===j.month&&(!D.P||nameKey(o.name)===D.P));const hz=O.filter(o=>o.type==="hazard"),po=O.filter(o=>o.type==="positive");
   if(j.v>=3){const by={};O.forEach(o=>{const k=o.name||"(no name)";by[k]=(by[k]||0)+1});
    h+=`<div class="chart"><h3>Lead indicators</h3><div class="sub">Hazard reports and positive observations · ${esc(monthLabel(j.month))}</div>
     <div class="kpis" style="margin-bottom:8px"><div class="kpi" style="--kc:var(--accent)"><div class="l">${ic("alert","s")} HAZARD REPORTS</div><div class="v">${hz.length}</div><div class="d">${hz.filter(o=>o.level==="Critical"||o.level==="High").length} high / critical</div></div>
     <div class="kpi" style="--kc:var(--c)"><div class="l">${ic("star","s")} POSITIVE OBS</div><div class="v">${po.length}</div><div class="d">good practice recognised</div></div></div>
     ${O.length?hbars(Object.keys(by).sort((a,b)=>by[b]-by[a]).slice(0,6).map(k=>({label:k,parts:[{label:"Hazard",n:hz.filter(o=>(o.name||"(no name)")===k).length,col:"var(--accent)"},{label:"Positive",n:po.filter(o=>(o.name||"(no name)")===k).length,col:"var(--c)"}]})))
       +`<div class="legend"><span><i style="background:var(--accent)"></i>Hazard</span><span><i style="background:var(--c)"></i>Positive</span></div>`
       +`<table class="table" style="margin-top:10px"><tr><th>Latest</th><th>Location</th></tr>${O.slice(-5).reverse().map(o=>`<tr><td>${o.type==="hazard"?`<span class="tag r">Hazard</span>`:`<span class="tag g">Positive</span>`} ${esc(String(o.description||"").slice(0,90))}<div class="muted">${esc(o.name||"")} · ${fmtD(String(o.at).slice(0,10))}</div></td><td>${esc(o.location||"")}</td></tr>`).join("")}</table>`
       :`<div class="empty" style="padding:12px">${ic("star")}<b>None yet this month</b>Use “Report a hazard” or “Positive observation” on the home screen.</div>`}</div>`}}
  h+=`</div>`;
  // people
  const people={};D.done.forEach(x=>{const k=key(x.name)||"(no name)";(people[k]=people[k]||[]).push(x)});
  if(!D.P&&Object.keys(people).length){const max=Math.max(...Object.values(people).map(l=>l.length));
    h+=`<div class="chart"><h3>Inspections by person</h3><div class="sub">${esc(monthLabel(j.month))} · completed forms</div>${hbars(Object.keys(people).sort((a,b)=>people[b].length-people[a].length).map(k=>({label:disp[k]||k,parts:[{label:"Sent",n:people[k].filter(x=>x.sentOK).length,col:"var(--brand-2)"},{label:"Not sent",n:people[k].filter(x=>!x.sentOK).length,col:"var(--accent)"}]})),max)}</div>`}
  h+=`<h2>In progress – opened, not finished <span class="cnt">${D.inprog.length}</span></h2>`;
  if(!D.inprog.length)h+=`<div class="card muted">Nothing in progress.</div>`;
  D.inprog.forEach(o=>{const isLate=Date.now()-new Date(o.started).getTime()>24*3600000;
    h+=`<div class="orow ${isLate?"late":""}"><b>${esc(o.name||"(no name)")}</b> · ${esc(o.no)} ${esc(o.title)}<div class="muted">${esc(o.location||"")}${o.progress?` · <b>${esc(o.progress)}</b>`:""} · opened ${fmtDT(o.started)} (${ago(o.started)})${isLate?' · <b style="color:var(--ua)">over 24 h – follow up</b>':""}</div></div>`});
  h+=`<h2>Completed – ${esc(monthLabel(j.month))} <span class="cnt">${D.done.length}</span></h2>`;
  if(!D.done.length)h+=`<div class="card muted">No completed inspections yet.</div>`;
  Object.keys(people).sort((a,b)=>a.localeCompare(b)).forEach(k=>{const L=people[k];const by={};L.forEach(x=>{const t=`${x.no} ${x.title}`;by[t]=(by[t]||0)+1});
    const ns=L.filter(x=>!x.sentOK).length;
    h+=`<div class="card pcard"><div class="top"><b>${esc(disp[k]||k)}</b><span class="numb">${L.length}</span></div>${ns?`<div style="color:var(--accent);font-weight:800;font-size:13px;margin-top:4px">${ns} finished but not sent yet</div>`:""}<div>${Object.keys(by).sort().map(t=>`<span class="tchip">${esc(t)} ×${by[t]}</span>`).join("")}</div>
     <details style="margin-top:6px" ${ns?"open":""}><summary class="muted" style="cursor:pointer;min-height:36px;display:flex;align-items:center">Show forms</summary>${L.sort((a,b)=>String(b.when).localeCompare(String(a.when))).map(x=>`<div class="muted" style="margin-top:4px">${fmtDT(x.when)} · ${esc(x.no)} ${esc(x.title)} · ${esc(x.location||"")}${(+x.ua||+x.ni)?` · ${x.ua} UA / ${x.ni} NI`:""}${x.pct!==""&&x.pct!=null&&x.sentOK?` · ${x.pct}%`:""} · ${x.sentOK?'<b style="color:var(--c)">✓ Sent</b>':x.state==="outbox"?'<b style="color:var(--accent)">Finished – waiting for signal</b>':'<b style="color:var(--accent)">Finished – not sent</b>'}</div>`).join("")}</details></div>`});
  h+=`<p class="foot">${cached?"Saved view":"Updated"} ${fmtDT(j.generated)} · <a href="#insights" onclick="viewDash();return false">Refresh</a><br>Grouped by the name in Settings – use your full name.</p>`;
  $("#dbody").innerHTML=h}
