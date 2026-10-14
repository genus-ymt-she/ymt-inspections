"use strict";
/* ---------- 50 – Take 5 (the Genus Take Five form) ----------
   Before you start (7 × Yes/No – any No = DO NOT PROCEED, refer to Supervisor), then the hazards (7 × Yes/No – any Yes needs
   controls from the form's standard responses or your own), then "Do these controls effectively manage the hazard?"
   (No = DO NOT PROCEED). Sent like any report: PDF emailed to the SHE Manager, archived in Drive, counted in the monthly figures. */
const T5_NUM=50;
function T5(d){return d.t5=d.t5||{task:"",a:[],h:[],ctl:{},oth:{},eff:"",sup:""}}
/* where the Take 5 stands: incomplete / proceed / stop */
function t5Outcome(d){const x=T5(d);const F=tabByNum(d.tab).form;
  const no=F.before.map((_,i)=>x.a[i]).indexOf("N");if(no>=0)return {state:"stop",why:`Before you start – question ${no+1} answered No`};
  if(F.before.some((_,i)=>!x.a[i]))return {state:"incomplete"};
  if(F.hazards.some((_,i)=>!x.h[i]))return {state:"incomplete"};
  const yes=F.hazards.map((_,i)=>i).filter(i=>x.h[i]==="Y");if(!yes.length)return {state:"proceed",why:"No hazards identified"};
  if(x.eff==="Y")return {state:"proceed",why:"Controls effectively manage the hazards"};
  if(x.eff==="N")return {state:"stop",why:"Controls do not effectively manage the hazards"};
  return {state:"incomplete"}}
const t5Stop=d=>t5Outcome(d).state==="stop";
function t5Controls(d,i){const x=T5(d);const H=tabByNum(d.tab).form.hazards[i];
  return [...(x.ctl[i]||[]).map(c=>{const k=H.controls.find(z=>z[0]===c);return k?`${k[0]} – ${k[1]}`:c}),...((x.oth[i]||"").trim()?[`${H.other||"Other"} – ${x.oth[i].trim()}`]:[])]}
function t5Problems(d){const x=T5(d);const F=tabByNum(d.tab).form;const D=d.details;const p=[];
  if(!(D.location||"").trim())p.push("Location");if(!(x.task||"").trim())p.push("Task description");if(!(D.inspector||"").trim())p.push("Completed by");
  const a=F.before.filter((_,i)=>!x.a[i]).length;const O=t5Outcome(d);
  if(O.state==="stop"){if(!(x.sup||"").trim())p.push("DO NOT PROCEED – name the Supervisor you referred this to");return p}
  if(a)p.push(`Before you start – ${a} question${a>1?"s":""} not answered`);
  if(!a){const h=F.hazards.filter((_,i)=>!x.h[i]).length;if(h)p.push(`Hazards – ${h} question${h>1?"s":""} not answered`);
    F.hazards.forEach((H,i)=>{if(x.h[i]==="Y"&&!t5Controls(d,i).length)p.push(`Hazard ${i+1} – choose or write the control`)});
    if(F.hazards.some((_,i)=>x.h[i]==="Y")&&!h&&!x.eff)p.push("Do these controls effectively manage the hazard? (Yes / No)")}
  return p}
const t5Answered=d=>{const x=T5(d);const F=tabByNum(d.tab).form;return F.before.filter((_,i)=>x.a[i]).length+F.hazards.filter((_,i)=>x.h[i]).length};
const t5Banner=(O,big)=>O.state==="stop"?`<div class="t5-out stop ${big?"big":""}">${ic("alert")}<span><b>DO NOT PROCEED</b>Refer to your Supervisor${O.why?` · ${esc(O.why)}`:""}</span></div>`
  :O.state==="proceed"?`<div class="t5-out go ${big?"big":""}">${ic("circlecheck")}<span><b>PROCEED TO COMPLETE TASK</b>${esc(O.why||"")}</span></div>`:"";
function viewTake5(d){const t=tabByNum(d.tab);const x=T5(d);const D=d.details;const F=t.form;const y=window.scrollY;
  setHeader(`${pad(t.num)} · ${t.short}`,"Before you start the task",backHome(d));
  const yn=(grp,i,v)=>`<div class="t5-yn" role="group" aria-label="Yes or No"><button class="y ${v==="Y"?"on":""}" onclick="t5Set('${grp}',${i},'Y')">YES</button><button class="n ${v==="N"?"on":""}" onclick="t5Set('${grp}',${i},'N')">NO</button></div>`;
  let h=`<div class="band"><b>${esc(t.title)}</b>${esc(t.scope)}</div><div class="alert red t5-note">${ic("info")}<div><b>NOTE:</b> ${esc(F.note)}</div></div>`;
  h+=`<div class="sec">Details</div><div class="card"><div class="grid2">
    <div><label class="f">Location <span class="req">*</span></label><input class="t" data-d="location" value="${esc(D.location)}" placeholder="e.g. Switchyard bay 3"></div>
    <div><label class="f">Date &amp; time</label><input class="t" type="datetime-local" data-d="datetime" value="${esc(D.datetime)}"></div></div>
    <label class="f">Task description <span class="req">*</span></label><textarea class="t" rows="2" data-t5="task" placeholder="What are you about to do?">${esc(x.task)}</textarea>
    <div class="grid2"><div><label class="f">Completed by <span class="req">*</span></label>${TA_TEAM().length?taChips(d):""}<input class="t" data-d="inspector" value="${esc(D.inspector)}"></div>
    <div><label class="f">Job No.</label><input class="t" value="${esc(CONFIG.jobNo)}" disabled></div></div></div>`;
  h+=`<div class="sec">1. Before you start</div><div class="card t5-list">${F.before.map((q,i)=>`<div class="t5-q ${x.a[i]==="N"?"bad":""}"><span class="t5-n">${i+1}</span><span class="t5-t">${esc(q)}</span>${yn("a",i,x.a[i])}</div>`).join("")}</div>`;
  const O=t5Outcome(d);const stopA=F.before.some((_,i)=>x.a[i]==="N");
  if(stopA)h+=t5Banner(O,true)+t5SupHTML(d);
  else{
    h+=`<div class="sec">2. Consider the following hazards</div><div class="card t5-list">${F.hazards.map((H,i)=>`<div class="t5-q ${x.h[i]==="Y"?"warn":""}"><span class="t5-n">${i+1}</span><span class="t5-t">${esc(H.q)}</span>${yn("h",i,x.h[i])}</div>
      ${x.h[i]==="Y"?`<div class="t5-ctl"><b>Nominate the controls to be applied</b>${H.controls.map(([c,txt])=>`<label class="t5-c"><input type="checkbox" ${((x.ctl[i]||[]).includes(c))?"checked":""} onchange="t5Ctl(${i},'${c}',this.checked)"><span><b>${c}</b> ${esc(txt)}</span></label>`).join("")}
        <label class="f">${H.controls.length?`Other control (${esc(H.other)})`:`${esc(H.other)} – hazard and control`}${H.controls.length?"":` <span class="req">*</span>`}</label><textarea class="t" rows="2" data-t5o="${i}" placeholder="${esc(H.otherHint||"Describe the control")}">${esc(x.oth[i]||"")}</textarea></div>`:""}`).join("")}</div>`;
    const anyY=F.hazards.some((_,i)=>x.h[i]==="Y");const allH=F.hazards.every((_,i)=>x.h[i]);
    if(anyY&&allH)h+=`<div class="sec">3. Check your controls</div><div class="card"><div class="t5-q"><span class="t5-t"><b>Do these controls effectively manage the hazard?</b></span>${yn("eff",0,x.eff)}</div></div>`;
    h+=t5Banner(O,true);if(O.state==="stop")h+=t5SupHTML(d)}
  render(h);window.scrollTo(0,y);
  document.querySelectorAll("[data-d]").forEach(el=>el.addEventListener("input",()=>{d.details[el.dataset.d]=el.value;save(d);renderBar(d)}));
  document.querySelectorAll("[data-t5]").forEach(el=>el.addEventListener("input",()=>{T5(d)[el.dataset.t5]=el.value;save(d);renderBar(d)}));
  document.querySelectorAll("[data-t5o]").forEach(el=>el.addEventListener("input",()=>{T5(d).oth[+el.dataset.t5o]=el.value;save(d);renderBar(d)}));
  renderBar(d)}
function t5SupHTML(d){return `<div class="card"><label class="f">Supervisor you referred this to <span class="req">*</span></label><input class="t" data-t5="sup" value="${esc(T5(d).sup)}" placeholder="Supervisor's name"><div class="muted" style="margin-top:6px">Stop. Don't start the task. Talk to your Supervisor, then send this Take 5 so the stop is recorded.</div></div>`}
function t5Set(g,i,v){const x=T5(CUR);if(g==="eff")x.eff=v;else x[g][i]=v;if(g==="h"&&v==="N"){delete x.ctl[i];delete x.oth[i]}
  if(g!=="eff"&&!tabByNum(CUR.tab).form.hazards.some((_,k)=>x.h[k]==="Y"))x.eff="";save(CUR);viewTake5(CUR)}
function t5Ctl(i,c,on){const x=T5(CUR);const L=x.ctl[i]=x.ctl[i]||[];const k=L.indexOf(c);if(on&&k<0)L.push(c);if(!on&&k>=0)L.splice(k,1);save(CUR);renderBar(CUR)}
function t5BarHTML(d){const n=t5Problems(d).length;const O=t5Outcome(d);const tot=tabByNum(d.tab).form.before.length+tabByNum(d.tab).form.hazards.length;
  return `<div class="in"><div class="stats">${O.state==="stop"?`<b style="color:var(--ua)">DO NOT PROCEED</b>`:O.state==="proceed"&&!n?`<b style="color:var(--c)">${ic("circlecheck","s")} Ready to review</b>`:`<b>${t5Answered(d)}/${tot}</b> answered${n?` · ${n} to complete`:""}`}<div class="prog"><i style="width:${Math.round(t5Answered(d)/tot*100)}%"></i></div></div><button class="btn o" onclick="toReview()">Review ${ic("arrow","s")}</button></div>`}
function t5ReviewHTML(d){const x=T5(d);const D=d.details;const O=t5Outcome(d);const F=tabByNum(d.tab).form;const hz=F.hazards.map((H,i)=>i).filter(i=>x.h[i]==="Y");
  return `<div class="card"><b style="font-size:16px">${esc(tabByNum(d.tab).title)}</b><div class="muted" style="margin-top:3px">${ic("pin","s")} ${esc(D.location||"–")} · ${fmtDT(D.datetime)}<br>${ic("user","s")} ${esc(D.inspector||"–")}</div>
    <div style="margin-top:6px"><b>Task:</b> ${esc(x.task||"–")}</div><div class="muted" style="margin-top:4px">${hz.length?`${hz.length} hazard${hz.length>1?"s":""} identified – controls nominated`:"No hazards identified"}</div></div>${t5Banner(O)}`}
/* ---------- report: rows, email text, email HTML, PDF ---------- */
function t5Rows(d){const x=T5(d);const D=d.details;return [["Take 5 No",reportId(d)],["Date & time",fmtDT(D.datetime)],["Location",D.location||"-"],["Task description",x.task||"-"],["Completed by",D.inspector||"-"],["Job No.",CONFIG.jobNo]]}
const t5YN=v=>v==="Y"?"YES":v==="N"?"NO":"-";
function t5OutText(d){const O=t5Outcome(d);return O.state==="stop"?`DO NOT PROCEED – referred to Supervisor ${T5(d).sup||""}`.trim():O.state==="proceed"?"PROCEED TO COMPLETE TASK":"Incomplete"}
function t5Subject(d){const x=T5(d);const D=d.details;const stop=t5Stop(d);
  return `YMT Take 5 | ${String(x.task||"").replace(/\s+/g," ").slice(0,60)} | ${fmtDT(D.datetime).slice(0,10)} | ${D.location} | by ${D.inspector}${stop?" | ⚠ DO NOT PROCEED – referred to Supervisor":" | Proceed"}`}
function t5BodyText(d){const x=T5(d);const F=tabByNum(d.tab).form;const L=[];const HR="━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  L.push("PARRON | TAKE 5");L.push(HR);L.push("");t5Rows(d).forEach(r=>L.push(`• ${r[0]}: ${r[1]}`));L.push("");
  L.push(`OUTCOME: ${t5OutText(d)}`);L.push("");L.push("BEFORE YOU START");F.before.forEach((q,i)=>L.push(`${i+1}. ${q} – ${t5YN(x.a[i])}`));L.push("");
  if(!F.before.some((_,i)=>x.a[i]==="N")){L.push("HAZARDS");F.hazards.forEach((H,i)=>{L.push(`${i+1}. ${H.q} – ${t5YN(x.h[i])}`);if(x.h[i]==="Y")t5Controls(d,i).forEach(c=>L.push(`   Control: ${c}`))});
    if(F.hazards.some((_,i)=>x.h[i]==="Y"))L.push(`Do these controls effectively manage the hazard? ${t5YN(x.eff)}`);L.push("")}
  L.push("Completed Take 5 attached (PDF).");L.push(`Sent from PARRON v${CONFIG.appVersion}`);return L.join("\n")}
function t5Html(d){const x=T5(d);const F=tabByNum(d.tab).form;const e=esc;const stop=t5Stop(d);
  const td='style="border:1px solid #D0D5DD;padding:6px 8px;vertical-align:top;font-size:13px"',tl='style="border:1px solid #D0D5DD;padding:6px 8px;vertical-align:top;font-size:13px;background:#F2F4F7;font-weight:700;color:#112B4E;width:180px"',th='style="border:1px solid #112B4E;background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const yn=v=>`<b style="color:${v==="Y"?"#2E7D32":v==="N"?"#C62828":"#5B6675"}">${t5YN(v)}</b>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1B2430;max-width:860px">
  <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700;letter-spacing:.06em">PARRON | TAKE 5</div><div style="font-size:18px;font-weight:700">${e(x.task||"Take 5")}</div></div>
  <div style="margin:12px 0;padding:10px 12px;border-radius:6px;font-weight:700;font-size:15px;color:#fff;background:${stop?"#C62828":"#2E7D32"}">${e(t5OutText(d))}</div>
  <table style="border-collapse:collapse;width:100%">${t5Rows(d).map(r=>`<tr><td ${tl}>${e(r[0])}</td><td ${td}>${e(r[1])}</td></tr>`).join("")}</table>
  <h3 style="color:#112B4E;margin:14px 0 4px">Before you start</h3><table style="border-collapse:collapse;width:100%"><tr><th ${th}>#</th><th ${th}>Question</th><th ${th}>Answer</th></tr>${F.before.map((q,i)=>`<tr><td ${td}>${i+1}</td><td ${td}>${e(q)}</td><td ${td}>${yn(x.a[i])}</td></tr>`).join("")}</table>
  ${F.before.some((_,i)=>x.a[i]==="N")?"":`<h3 style="color:#112B4E;margin:14px 0 4px">Hazards</h3><table style="border-collapse:collapse;width:100%"><tr><th ${th}>#</th><th ${th}>Hazard</th><th ${th}>Answer</th><th ${th}>Controls</th></tr>${F.hazards.map((H,i)=>`<tr><td ${td}>${i+1}</td><td ${td}>${e(H.q)}</td><td ${td}>${yn(x.h[i])}</td><td ${td}>${t5Controls(d,i).map(e).join("<br>")||"-"}</td></tr>`).join("")}</table>
  ${F.hazards.some((_,i)=>x.h[i]==="Y")?`<p style="font-size:13px"><b>Do these controls effectively manage the hazard?</b> ${yn(x.eff)}</p>`:""}`}
  <p style="color:#5B6675;font-size:12px">Completed Take 5 attached (PDF). Sent from PARRON v${e(CONFIG.appVersion)}</p></div>`}
async function buildTake5PDF(d){const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});const t=tabByNum(d.tab);const x=T5(d);const F=t.form;const D=d.details;
  const W=210,M=12;const NAVY=hex("#112B4E"),ORG=hex("#EC7723"),GREY=hex("#F2F4F7");const docId=`${CONFIG.docPrefix}-${pad(t.num)}`;const stop=t5Stop(d);
  const lp=doc.getImageProperties(LOGO);const lh=11,lw=lp.width*lh/lp.height;doc.addImage(LOGO,"PNG",M,10,lw,lh);
  doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...ORG);doc.text("TAKE FIVE",W-M,12,{align:"right"});
  doc.setFontSize(15);doc.setTextColor(...NAVY);doc.text("Take 5",W-M,18.5,{align:"right"});
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(90);doc.text(`${docId}  |  Take 5 No ${reportId(d)}`,W-M,22.5,{align:"right"});
  doc.setFillColor(...NAVY);doc.rect(M,25,W-2*M,6.5,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(PDFSAFE(CONFIG.project),M+2,29.3);
  let y=34;const sty={font:"helvetica",fontSize:8.2,cellPadding:1.8,lineColor:[200,206,214],lineWidth:.2,textColor:20,valign:"top"};
  doc.setFillColor(...hex(stop?"#C62828":"#2E7D32"));doc.roundedRect(M,y,W-2*M,9,1.5,1.5,"F");doc.setTextColor(255);doc.setFontSize(11);doc.text(PDFSAFE(t5OutText(d)),W/2,y+6,{align:"center"});y+=13;
  const kv=rows=>{doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",body:rows.map(r=>r.map(PDFSAFE)),styles:sty,columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:44}}});y=doc.lastAutoTable.finalY+4};
  const sec=txt=>{if(y>262){doc.addPage();y=16}doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...NAVY);doc.text(txt,M,y+4);doc.setDrawColor(...ORG);doc.setLineWidth(.6);doc.line(M,y+5.5,W-M,y+5.5);doc.setLineWidth(.2);y+=8};
  const ynCell=c=>{if(c.section==="body"&&c.column.index===2){const v=c.cell.raw;if(v==="YES"||v==="NO"){c.cell.styles.fontStyle="bold";c.cell.styles.textColor=hex(v==="YES"?"#2E7D32":"#C62828")}}};
  sec("DETAILS");kv(t5Rows(d));
  doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(90);const nl=doc.splitTextToSize(PDFSAFE("NOTE: "+F.note),W-2*M);doc.text(nl,M,y);y+=nl.length*3.3+3;
  sec("BEFORE YOU START");doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",head:[["#","Question","Answer"]],body:F.before.map((q,i)=>[i+1,PDFSAFE(q),t5YN(x.a[i])]),styles:sty,headStyles:{fillColor:NAVY,textColor:255},columnStyles:{0:{cellWidth:8},2:{cellWidth:18,halign:"center"}},didParseCell:ynCell});y=doc.lastAutoTable.finalY+4;
  if(!F.before.some((_,i)=>x.a[i]==="N")){sec("CONSIDER THE FOLLOWING HAZARDS");
    doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",head:[["#","Hazard","Answer","Controls to be applied"]],body:F.hazards.map((H,i)=>[i+1,PDFSAFE(H.q),t5YN(x.h[i]),PDFSAFE(t5Controls(d,i).join("\n")||"-")]),styles:sty,headStyles:{fillColor:NAVY,textColor:255},columnStyles:{0:{cellWidth:8},1:{cellWidth:62},2:{cellWidth:16,halign:"center"}},didParseCell:ynCell});y=doc.lastAutoTable.finalY+4;
    if(F.hazards.some((_,i)=>x.h[i]==="Y"))kv([["Do these controls effectively manage the hazard?",t5YN(x.eff)]])}
  if(stop)kv([["Referred to Supervisor",x.sup||"-"]]);
  if(y>240){doc.addPage();y=16}sec("SIGN-OFF");doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(60);doc.text(PDFSAFE(F.declaration),M,y+2);y+=5;
  doc.autoTable({startY:y,margin:{left:M,right:M},theme:"grid",styles:{...sty,minCellHeight:9},columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:44}},
    body:[["Completed by",PDFSAFE(D.inspector)],["Signature",""],["Date",fmtDT(D.datetime)]],
    didDrawCell:c=>{if(c.section==="body"&&c.row.index===1&&c.column.index===1&&d.signature){const h=Math.min(c.cell.height-2,14);try{doc.addImage(d.signature,"PNG",c.cell.x+2,c.cell.y+1,h*2.6,h)}catch(e){}}},
    didParseCell:c=>{if(c.section==="body"&&c.row.index===1)c.cell.styles.minCellHeight=16}});
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor(110);
    doc.text(`${docId}  |  ${reportId(d)}`,M,290);doc.text(`PARRON v${CONFIG.appVersion}  |  Uncontrolled when printed  |  Page ${i} of ${n}`,W-M,290,{align:"right"})}
  PDFBLOB=doc.output("blob");return PDFBLOB}
