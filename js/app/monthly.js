"use strict";
/* ---------- Monthly HSE summary (director-ready PDF + 2.1 Safety Summary text) ---------- */
function monthlyFacts(j){const P=DASH.person;DASH.person="";const D=dashData(j);DASH.person=P;const trend=j.trend||[];const prev=trend.length>1?trend[trend.length-2]:null;
  const all=j.findings||[];const rs=regStats(j.v>=3?all:regAll());const F=D.F;const spot=F.filter(f=>f.status===ST.spot).length;
  const types=new Set(D.sent.map(x=>x.no)).size;const people=new Set(D.sent.map(x=>nameKey(x.name))).size;
  const byT={};D.sent.forEach(x=>{const k=`${x.no} ${x.title}`;const o=byT[k]=byT[k]||{n:0,ua:0,ni:0,pc:[]};o.n++;o.ua+=+x.ua||0;o.ni+=+x.ni||0;if(x.pct!==""&&x.pct!=null)o.pc.push(+x.pct)});
  const since=new Date(+j.month.slice(0,4),+j.month.slice(5,7),0);const from=new Date(since);from.setDate(from.getDate()-90);
  const rep={};all.filter(f=>{const d=new Date(f.raised);return d>=from&&d<=new Date(since.getTime()+864e5)}).forEach(f=>{const o=rep[f.item]=rep[f.item]||{n:0,text:f.text};o.n++});
  const repeat=Object.entries(rep).filter(([,o])=>o.n>1).sort((a,b)=>b[1].n-a[1].n).slice(0,6);
  const openHi=all.filter(f=>isOpen(f)&&(f.level==="High"||f.level==="Critical")).sort((a,b)=>(+b.score||0)-(+a.score||0));
  const overdue=all.filter(isOverdue).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
  const persons={};D.sent.forEach(x=>{const k=x.name||"(no name)";persons[k]=(persons[k]||0)+1});
  const O=(j.obs||[]).filter(o=>String(o.at).slice(0,7)===j.month);const hz=O.filter(o=>o.type==="hazard").length,po=O.filter(o=>o.type==="positive").length;
  const T=targetRows(j);const tMet=T.filter(r=>r.month>=r.monthTarget).length;
  return {D,trend,prev,rs,F,spot,types,people,byT,repeat,openHi,overdue,persons,v3:j.v>=3,hz,po,T,tMet}}
function safetySummaryText(j){const x=monthlyFacts(j);const D=x.D;const m=monthLabel(j.month);const nf=D.ua+D.ni;
  const dp=x.prev&&x.prev.avgPct!=null&&D.avgPct!=null?D.avgPct-x.prev.avgPct:null;
  const topT=Object.entries(x.byT).sort((a,b)=>(b[1].ua+b[1].ni)-(a[1].ua+a[1].ni))[0];
  const s=[`During ${m}, ${D.sent.length} site inspection${D.sent.length===1?" was":"s were"} completed and submitted through PARRON across ${x.types} inspection type${x.types===1?"":"s"} by ${x.people} inspector${x.people===1?"":"s"}${D.avgPct!=null?`, with an average compliance score of ${D.avgPct}%${dp!=null&&dp!==0?` (${dp>0?"up":"down"} ${Math.abs(dp)} points on the previous month)`:dp===0?" (unchanged on the previous month)":""}`:""}.`];
  s.push(nf?`A total of ${nf} non-compliance${nf===1?" was":"s were"} identified (${D.ua} unacceptable – stop work, ${D.ni} needs improvement)${D.snn?`, of which ${D.snn} ${D.snn===1?"was":"were"} linked to Genus Safety Non-Negotiables`:""}.`:"No non-compliances were identified.");
  if(x.F.length)s.push(`${Math.round(x.spot/x.F.length*100)}% of findings were closed out at the time of inspection.`);
  if(topT&&topT[1].ua+topT[1].ni)s.push(`The highest number of findings was recorded on ${topT[0].replace(/^\d+\s/,"")} inspections (${topT[1].ua+topT[1].ni}).`);
  if(x.v3)s.push(`At the time of reporting, ${x.rs.open} corrective action${x.rs.open===1?" remains":"s remain"} open (${x.rs.highOpen} rated High or Critical), ${x.rs.overdue} ${x.rs.overdue===1?"is":"are"} overdue and ${x.rs.toVerify} ${x.rs.toVerify===1?"is":"are"} awaiting verification${x.rs.avgClose!=null?`; the average time from finding to close-out is ${x.rs.avgClose} days`:""}.`);
  if(x.v3)s.push(`Lead indicators: ${x.hz} hazard report${x.hz===1?"":"s"} and ${x.po} positive observation${x.po===1?"":"s"} were submitted${x.T.length?`, and ${x.tMet} of ${x.T.length} team members met their inspection target`:""}.`);
  if(x.repeat.length)s.push(`Repeat findings over the last 90 days relate to item${x.repeat.length>1?"s":""} ${x.repeat.slice(0,3).map(([k,o])=>`${k} (${o.n}×)`).join(", ")}, which will be targeted in toolbox talks and supervisor verification.`);
  return s.join(" ")}
function copySafetySummary(){if(!DASH.j){toast("Insights still loading");return}copyText(safetySummaryText(DASH.j),"2.1 Safety summary")}
async function monthlyPDF(){const j=DASH.j;if(!j){toast("Insights still loading");return}toast("Building the monthly summary…",2000);
  try{const blob=buildMonthlyPDF(j);const name=`PARRON-Monthly-HSE-Summary-${j.month}.pdf`;
    const f=new File([blob],name,{type:"application/pdf"});
    if(isMobile()&&navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:`Monthly HSE summary – ${monthLabel(j.month)}`});return}catch(e){if(e&&e.name==="AbortError")return}}
    downloadBlob(blob,name);toast("Monthly summary saved")}catch(e){console.error(e);toast("Could not build the summary")}}
function buildMonthlyPDF(j){const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});const x=monthlyFacts(j);const D=x.D;
  const W=210,M=12;const NAVY=hex("#112B4E"),ORG=hex("#EC7723"),GREY=hex("#F2F4F7");const docId=`${CONFIG.docPrefix}-MHS-${j.month}`;
  const lp=doc.getImageProperties(LOGO);const lh=11,lw=lp.width*lh/lp.height;doc.addImage(LOGO,"PNG",M,10,lw,lh);
  doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...ORG);doc.text("MONTHLY HSE SUMMARY",W-M,12,{align:"right"});
  doc.setFontSize(15);doc.setTextColor(...NAVY);doc.text(PDFSAFE(monthLabel(j.month)),W-M,18.5,{align:"right"});
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(90);doc.text(`Generated ${fmtDT(new Date())} from the PARRON project log`,W-M,22.8,{align:"right"});
  doc.setFillColor(...NAVY);doc.rect(M,25,W-2*M,6.5,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(PDFSAFE(CONFIG.project),M+2,29.3);
  let y=35;
  const tiles=[["Inspections",String(D.sent.length),"#1B3D6B"],["Avg compliance",D.avgPct==null?"-":D.avgPct+"%",D.avgPct==null?"#7A8594":D.avgPct>=90?"#1E8E3E":D.avgPct>=75?"#C98A00":"#C5221F"],["Findings (UA / NI)",`${D.ua+D.ni}  (${D.ua} / ${D.ni})`,"#C5221F"],["SNN-linked",String(D.snn),"#EC7723"],
    ["Open actions",x.v3?String(x.rs.open):"-","#C98A00"],["Overdue",x.v3?String(x.rs.overdue):"-","#C5221F"],["Closed on spot",x.F.length?Math.round(x.spot/x.F.length*100)+"%":"-","#1E8E3E"],["To verify",x.v3?String(x.rs.toVerify):"-","#112B4E"]];
  const tw=(W-2*M-3*3)/4;tiles.forEach((t,i)=>{const cx=M+(i%4)*(tw+3),cy=y+Math.floor(i/4)*17;doc.setFillColor(...GREY);doc.roundedRect(cx,cy,tw,14.5,1.6,1.6,"F");doc.setFillColor(...hex(t[2]));doc.rect(cx,cy,1.4,14.5,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(6.6);doc.setTextColor(90);doc.text(t[0].toUpperCase(),cx+4,cy+5);doc.setFontSize(12.5);doc.setTextColor(...hex(t[2]));doc.text(t[1],cx+4,cy+11.6)});
  y+=37;
  const sec=txt=>{if(y>255){doc.addPage();y=16}doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(...NAVY);doc.text(txt,M,y+4);doc.setDrawColor(...ORG);doc.setLineWidth(.6);doc.line(M,y+5.5,W-M,y+5.5);doc.setLineWidth(.2);y+=9};
  const sty={font:"helvetica",fontSize:8,cellPadding:1.7,lineColor:[200,206,214],lineWidth:.2,textColor:20,valign:"top"};
  const tbl=(head,body,cs,extra)=>{doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",head:[head],body:body.length?body.map(r=>r.map(c=>typeof c==="string"?PDFSAFE(c):c)):[[{content:"None.",colSpan:head.length}]],styles:sty,headStyles:{fillColor:NAVY,textColor:255},columnStyles:cs||{},...(extra||{})});y=doc.lastAutoTable.finalY+5};
  sec("2.1 SAFETY SUMMARY");doc.setFont("helvetica","normal");doc.setFontSize(8.6);doc.setTextColor(30);const para=doc.splitTextToSize(PDFSAFE(safetySummaryText(j)),W-2*M);doc.text(para,M,y+1);y+=para.length*3.9+5;
  if(x.trend.length){sec("SIX-MONTH TREND");tbl(["Month","Inspections","Avg compliance","UA","NI","SNN-linked"],x.trend.map(t=>[monthLabel(t.month),t.inspections,t.avgPct==null?"-":t.avgPct+"%",t.ua,t.ni,t.snn]),{0:{fontStyle:"bold"}})}
  sec("INSPECTIONS BY TYPE");tbl(["Inspection","Completed","Avg compliance","UA","NI"],Object.entries(x.byT).sort((a,b)=>b[1].n-a[1].n).map(([k,o])=>[k,o.n,o.pc.length?Math.round(o.pc.reduce((a,b)=>a+b,0)/o.pc.length)+"%":"-",o.ua,o.ni]),{1:{halign:"center"},2:{halign:"center"},3:{halign:"center"},4:{halign:"center"}});
  if(x.v3){sec("RISK PROFILE – FINDINGS RAISED THIS MONTH");tbl(["Risk rating","Raised","Closed on spot","Open now"],RISK.levels.slice().reverse().map(l=>[l.key,x.F.filter(f=>f.level===l.key).length,x.F.filter(f=>f.level===l.key&&f.status===ST.spot).length,x.F.filter(f=>f.level===l.key&&f.status===ST.open).length]),{},
      {didParseCell:c=>{if(c.section==="body"&&c.column.index===0){const l=riskLevel(c.cell.raw);if(l){c.cell.styles.fillColor=hex(l.color);c.cell.styles.textColor=hex(l.ink||"#FFFFFF");c.cell.styles.fontStyle="bold"}}}});
    sec(`OPEN HIGH / CRITICAL RISK ACTIONS (${x.openHi.length})`);tbl(["Report / item","Risk","Corrective action","Owner","Due"],x.openHi.slice(0,25).map(f=>[`${f.reportId}\n${f.item} ${f.location||""}`,`${f.level} ${f.score}`,f.action,f.owner||"TBC",f.due?fmtD(f.due):"-"]),{0:{cellWidth:44},1:{cellWidth:22},3:{cellWidth:32},4:{cellWidth:20}});
    sec(`OVERDUE CORRECTIVE ACTIONS (${x.overdue.length})`);tbl(["Report / item","Risk","Corrective action","Owner","Due"],x.overdue.slice(0,25).map(f=>[`${f.reportId}\n${f.item} ${f.location||""}`,f.level||f.rating,f.action,f.owner||"TBC",`${fmtD(f.due)}\n(${-daysTo(f.due)} d late)`]),{0:{cellWidth:44},1:{cellWidth:22},3:{cellWidth:32},4:{cellWidth:20}},{didParseCell:c=>{if(c.section==="body"&&c.column.index===4){c.cell.styles.textColor=hex("#C5221F");c.cell.styles.fontStyle="bold"}}});
    sec("REPEAT FINDINGS – LAST 90 DAYS");tbl(["Item","Requirement","Times"],x.repeat.map(([k,o])=>[k,o.text,o.n]),{0:{cellWidth:16,fontStyle:"bold"},2:{cellWidth:16,halign:"center"}})}
  if(x.v3){sec("LEAD INDICATORS");tbl(["Indicator","This month"],[["Hazard reports submitted",x.hz],["Positive observations submitted",x.po],["Inspections completed",D.sent.length]],{1:{halign:"center",cellWidth:40}})}
  if(x.T.length){sec("INSPECTION TARGETS");tbl(["Team member","Role","Completed","Target","Achieved"],x.T.map(r=>[r.name,r.role,r.month,r.monthTarget,r.monthTarget?Math.round(r.month/r.monthTarget*100)+"%":"-"]),{2:{halign:"center"},3:{halign:"center"},4:{halign:"center"}},
    {didParseCell:c=>{if(c.section==="body"&&c.column.index===4){const r=x.T[c.row.index];if(r){c.cell.styles.textColor=hex(r.month>=r.monthTarget?"#1E8E3E":"#C5221F");c.cell.styles.fontStyle="bold"}}}})}
  sec("INSPECTIONS BY PERSON");tbl(["Inspector","Inspections sent"],Object.entries(x.persons).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[k,n]),{1:{halign:"center",cellWidth:40}});
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor(110);
    doc.text(`${docId}  |  Monthly HSE summary – ${monthLabel(j.month)}`,M,290);doc.text(`PARRON v${CONFIG.appVersion}  |  Uncontrolled when printed  |  Page ${i} of ${n}`,W-M,290,{align:"right"})}
  return doc.output("blob")}
