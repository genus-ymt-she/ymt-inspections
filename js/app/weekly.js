"use strict";
/* ---------- Weekly report: Monday 06:00 to Sunday 18:00 (Perth), for the weekly KPI tracker ----------
   A week can start and end in different months, so the shared log is read for each month it touches. */
const WK={start:null,data:null};
function wkStart(dt){const d=new Date(dt);d.setHours(6,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
function wkEnd(s){const e=new Date(s);e.setDate(e.getDate()+6);e.setHours(18,0,0,0);return e}
function wkNo(s){const d=new Date(Date.UTC(s.getFullYear(),s.getMonth(),s.getDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const y=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil(((d-y)/864e5+1)/7)}
const wkD=d=>`${d.toLocaleDateString("en-AU",{weekday:"short"})} ${d.getDate()} ${d.toLocaleDateString("en-AU",{month:"short"})}`;
function wkLabel(s){const e=wkEnd(s);return `${wkD(s)} – ${wkD(e)} ${e.getFullYear()}`}
function wkRange(s){const e=wkEnd(s);return `${fmtD(wkISO(s))} 06:00 – ${fmtD(wkISO(e))} 18:00`}
const wkISO=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
/* last 12 weeks; the default is the most recent week that has finished (Sunday 6 pm) */
function wkList(){const now=new Date();const cur=wkStart(now);if(now<cur)cur.setDate(cur.getDate()-7);const L=[];for(let i=0;i<12;i++){const s=new Date(cur);s.setDate(s.getDate()-7*i);L.push(s)}return L}
function wkDefault(){const L=wkList();return wkEnd(L[0])<=new Date()?L[0]:L[1]}
async function wkMonth(m){
  try{const r=await fetch(relayQ(`action=dashboard&month=${m}`),{redirect:"follow"});const j=await r.json();if(j.needCode)askSiteCode();if(!j.ok)throw new Error(j.error);ls("dash_"+m,JSON.stringify(j));return j}
  catch(e){const c=lsJ("dash_"+m,null);if(c)return c;throw e}}
async function wkLoad(s){const e=wkEnd(s);const ms=[...new Set([monthKey(s),monthKey(e)])];const js=await Promise.all(ms.map(wkMonth));
  const inW=v=>{const t=new Date(v).getTime();return t>=s.getTime()&&t<=e.getTime()};const uniq=(list,k)=>{const seen=new Set();return list.filter(x=>{const id=k(x);if(seen.has(id))return false;seen.add(id);return true})};
  const sent=uniq(js.flatMap(j=>j.sent||[]),x=>x.uid||x.reportId||x.sentAt).filter(x=>inW(x.sentAt));
  const findings=uniq(js.flatMap(j=>j.findings||[]),f=>f.fid);const obs=uniq(js.flatMap(j=>j.obs||[]),o=>`${o.reportId}|${o.at}`).filter(o=>inW(o.at));
  return {s,e,sent,findings,obs,v3:js.every(j=>j.v>=3),months:ms}}
function wkFacts(W){const NOT_INSP=["23","24","28"];const insp=W.sent.filter(x=>!NOT_INSP.includes(String(x.no)));const cnt=no=>W.sent.filter(x=>String(x.no)===no).length;
  const pcs=insp.map(x=>x.pct).filter(x=>x!==""&&x!=null).map(Number);const sum=k=>W.sent.reduce((a,x)=>a+(+x[k]||0),0);
  const inW=v=>{if(!v)return false;const t=new Date(v).getTime();return t>=W.s.getTime()&&t<=W.e.getTime()};
  const F=W.findings.filter(f=>inW(f.raised));const spot=F.filter(f=>f.status===ST.spot).length;
  const lv={};RISK.levels.forEach(l=>lv[l.key]=F.filter(f=>f.level===l.key).length);
  const closed=W.findings.filter(f=>inW(f.closedAt)&&f.status!==ST.spot).length,verified=W.findings.filter(f=>inW(f.verifiedAt)).length;
  const rs=regStats(W.findings);
  const byT={};insp.forEach(x=>{const k=`${x.no} ${x.title}`;const o=byT[k]=byT[k]||{n:0,ua:0,ni:0,pc:[]};o.n++;o.ua+=+x.ua||0;o.ni+=+x.ni||0;if(x.pct!==""&&x.pct!=null)o.pc.push(+x.pct)});
  const byP={};W.sent.forEach(x=>{const k=x.name||"(no name)";const o=byP[k]=byP[k]||{insp:0,other:0};NOT_INSP.includes(String(x.no))?o.other++:o.insp++});
  W.obs.forEach(o=>{const k=o.name||"(no name)";const p=byP[k]=byP[k]||{insp:0,other:0};p.obs=(p.obs||0)+1});
  return {insp,avgPct:pcs.length?Math.round(pcs.reduce((a,b)=>a+b,0)/pcs.length):null,ua:sum("ua"),ni:sum("ni"),snn:sum("snn"),F,spot,lv,closed,verified,rs,byT,byP,
    taskObs:cnt("24"),mentor:cnt("23"),fuel:cnt("28"),hz:W.obs.filter(o=>o.type==="hazard").length,po:W.obs.filter(o=>o.type==="positive").length}}
/* the figures, in the order they go into the KPI tracker */
function wkKpis(W){const x=wkFacts(W);return [
  ["Inspections completed",x.insp.length],["Average compliance",x.avgPct==null?"-":x.avgPct+"%"],["Unacceptable (UA) findings",x.ua],["Needs improvement (NI) findings",x.ni],
  ["Findings linked to an SNN",x.snn],...RISK.levels.slice().reverse().map(l=>[`Hazards rated ${l.key}`,x.lv[l.key]]),
  ["Findings closed at the time of inspection",x.F.length?`${x.spot} of ${x.F.length} (${Math.round(x.spot/x.F.length*100)}%)`:"-"],
  ["Corrective actions closed out",x.closed],["Corrective actions verified",x.verified],
  ["Task observations (form 24)",x.taskObs],["Mentoring / development discussions (form 23)",x.mentor],["Hazard reports",x.hz],["Positive observations",x.po],
  ["Fuel, hours & pre-start registers (form 28)",x.fuel],
  ["Open corrective actions (at time of report)",x.rs.open],["Overdue corrective actions (at time of report)",x.rs.overdue]]}
async function weeklyReport(){if(!directOn()){toast("Insights need direct send to be set up");return}const L=wkList();WK.start=WK.start||wkDefault();const now=new Date();
  sheet(`<h3>Weekly report</h3><p class="muted">Monday 6:00 am to Sunday 6:00 pm (Perth time). Weeks that cross into another month are included in full.</p>
   <label class="f" for="wkSel">Week</label><select class="t" id="wkSel">${L.map(s=>`<option value="${s.getTime()}" ${s.getTime()===WK.start.getTime()?"selected":""}>Week ${wkNo(s)} · ${esc(wkLabel(s))}${wkEnd(s)>now?" (to date)":""}</option>`).join("")}</select>
   <div id="wkPrev" style="margin-top:12px"><div class="skel"></div></div>
   <button class="btn o w" id="wkPdf" disabled onclick="weeklyPDF()">${ic("file","s")} Weekly report (PDF)</button>
   <button class="btn g w" id="wkCopy" disabled onclick="weeklyCopy()">${ic("copy","s")} Copy KPI figures</button>`);
  $("#wkSel").onchange=e=>{WK.start=new Date(+e.target.value);wkPreview()};wkPreview()}
async function wkPreview(){const s=WK.start;const box=$("#wkPrev");if(!box)return;box.innerHTML=`<div class="skel"></div>`;["#wkPdf","#wkCopy"].forEach(k=>{const b=$(k);if(b)b.disabled=true});
  try{const W=await wkLoad(s);if(WK.start!==s)return;WK.data=W;
    box.innerHTML=`<div class="muted" style="margin-bottom:6px">${esc(wkRange(s))}</div><dl class="kv wkkv">${wkKpis(W).map(([k,v])=>`<dt>${esc(k)}</dt><dd><b>${esc(String(v))}</b></dd>`).join("")}</dl>`;
    ["#wkPdf","#wkCopy"].forEach(k=>{const b=$(k);if(b)b.disabled=false})}
  catch(e){console.error(e);box.innerHTML=`<div class="alert red">${ic("wifioff")}<div>Could not load that week – check signal and try again.</div></div>`}}
function weeklyText(W){const s=W.s;return [`PARRON weekly report – Week ${wkNo(s)} (${wkRange(s)})`,CONFIG.project,"",...wkKpis(W).map(([k,v])=>`${k}: ${v}`)].join("\n")}
function weeklyCopy(){if(WK.data)copyText(weeklyText(WK.data),"KPI figures")}
async function weeklyPDF(){const W=WK.data;if(!W)return;try{const blob=buildWeeklyPDF(W);const name=docFileName(wkISO(W.s),"Weekly HSE Report",ls("inspector"));const f=new File([blob],name,{type:"application/pdf"});
    if(isMobile()&&navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:`Weekly HSE report – week ${wkNo(W.s)}`});return}catch(e){if(e&&e.name==="AbortError")return}}
    downloadBlob(blob,name);toast("Weekly report saved")}catch(e){console.error(e);toast("Could not build the report")}}
function buildWeeklyPDF(W){const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});const x=wkFacts(W);const s=W.s;
  const W_=210,M=12;const NAVY=hex("#112B4E"),ORG=hex("#EC7723"),GREY=hex("#F2F4F7");const docId=`${CONFIG.docPrefix}-WHS-${wkISO(s)}`;
  const lp=doc.getImageProperties(LOGO);const lh=11,lw=lp.width*lh/lp.height;doc.addImage(LOGO,"PNG",M,10,lw,lh);
  doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...ORG);doc.text("WEEKLY HSE REPORT",W_-M,12,{align:"right"});
  doc.setFontSize(15);doc.setTextColor(...NAVY);doc.text(PDFSAFE(`Week ${wkNo(s)} · ${wkLabel(s)}`),W_-M,18.5,{align:"right"});
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(90);doc.text(PDFSAFE(`${wkRange(s)}  ·  generated ${fmtDT(new Date())} from the PARRON project log`),W_-M,22.8,{align:"right"});
  doc.setFillColor(...NAVY);doc.rect(M,25,W_-2*M,6.5,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(PDFSAFE(CONFIG.project),M+2,29.3);
  let y=35;
  const tiles=[["Inspections",String(x.insp.length),"#1B3D6B"],["Avg compliance",x.avgPct==null?"-":x.avgPct+"%",x.avgPct==null?"#7A8594":x.avgPct>=90?"#1E8E3E":x.avgPct>=75?"#C98A00":"#C5221F"],["Findings (UA / NI)",`${x.ua+x.ni}  (${x.ua} / ${x.ni})`,"#C5221F"],["SNN-linked",String(x.snn),"#EC7723"],
    ["Hazard reports",String(x.hz),"#E8660D"],["Positive obs",String(x.po),"#1E8E3E"],["Actions closed",String(x.closed),"#1E8E3E"],["Overdue (now)",String(x.rs.overdue),"#C5221F"]];
  const tw=(W_-2*M-3*3)/4;tiles.forEach((t,i)=>{const cx=M+(i%4)*(tw+3),cy=y+Math.floor(i/4)*17;doc.setFillColor(...GREY);doc.roundedRect(cx,cy,tw,14.5,1.6,1.6,"F");doc.setFillColor(...hex(t[2]));doc.rect(cx,cy,1.4,14.5,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(6.6);doc.setTextColor(90);doc.text(t[0].toUpperCase(),cx+4,cy+5);doc.setFontSize(12.5);doc.setTextColor(...hex(t[2]));doc.text(t[1],cx+4,cy+11.6)});
  y+=37;
  const sec=txt=>{if(y>255){doc.addPage();y=16}doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(...NAVY);doc.text(txt,M,y+4);doc.setDrawColor(...ORG);doc.setLineWidth(.6);doc.line(M,y+5.5,W_-M,y+5.5);doc.setLineWidth(.2);y+=9};
  const sty={font:"helvetica",fontSize:8,cellPadding:1.7,lineColor:[200,206,214],lineWidth:.2,textColor:20,valign:"top"};
  const tbl=(head,body,cs,extra)=>{doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",head:[head],body:body.length?body.map(r=>r.map(c=>typeof c==="string"?PDFSAFE(c):c)):[[{content:"None.",colSpan:head.length}]],styles:sty,headStyles:{fillColor:NAVY,textColor:255},columnStyles:cs||{},...(extra||{})});y=doc.lastAutoTable.finalY+5};
  sec("KPI SUMMARY");tbl(["Indicator","This week"],wkKpis(W).map(([k,v])=>[k,String(v)]),{1:{halign:"center",cellWidth:46,fontStyle:"bold"}});
  sec("INSPECTIONS BY TYPE");tbl(["Inspection","Completed","Avg compliance","UA","NI"],Object.entries(x.byT).sort((a,b)=>b[1].n-a[1].n).map(([k,o])=>[k,o.n,o.pc.length?Math.round(o.pc.reduce((a,b)=>a+b,0)/o.pc.length)+"%":"-",o.ua,o.ni]),{1:{halign:"center"},2:{halign:"center"},3:{halign:"center"},4:{halign:"center"}});
  sec(`FINDINGS RAISED THIS WEEK (${x.F.length})`);tbl(["Report / item","Rating / risk","Finding","Status","Owner / due"],x.F.slice(0,40).map(f=>[`${f.reportId}\n${f.item} ${f.location||""}`,`${f.rating||""}${f.level?` · ${f.level} ${f.score||""}`:""}`,f.finding||f.text||"",f.status||"",`${f.owner||"-"}${f.due?`\n${fmtD(f.due)}`:""}`]),{0:{cellWidth:42},1:{cellWidth:26},3:{cellWidth:22},4:{cellWidth:30}});
  sec("ACTIVITY BY PERSON");tbl(["Name","Inspections","Other forms","Hazard / positive reports"],Object.entries(x.byP).sort((a,b)=>(b[1].insp-a[1].insp)||a[0].localeCompare(b[0])).map(([k,o])=>[k,o.insp,o.other,o.obs||0]),{1:{halign:"center",cellWidth:26},2:{halign:"center",cellWidth:26},3:{halign:"center",cellWidth:40}});
  if(!W.v3){doc.setFontSize(7.5);doc.setTextColor(160,40,40);doc.text("Note: relay v2 – findings and actions are not available.",M,y);y+=5}
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor(110);
    doc.text(PDFSAFE(`${docId}  |  Weekly HSE report – week ${wkNo(s)}`),M,290);doc.text(`PARRON v${CONFIG.appVersion}  |  Uncontrolled when printed  |  Page ${i} of ${n}`,W_-M,290,{align:"right"})}
  return doc.output("blob")}
