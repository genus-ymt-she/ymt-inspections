"use strict";
/* ---------- 51 – Load and Unloading Truck Site Inspection Checklist (FRM-SHEQ-GNP-0036 Rev 3) – Trade Assistants ----------
   The Genus form as written, without the Supervisor and Truck Driver signature boxes (their names stay): checklist details,
   Loading and Unloading (Yes / No / N/A), off-loading general freight (Yes / No), special equipment / staff request, comments
   and actions, then the operator signs. Any No in the checks = DO NOT PROCEED – consult your Manager or Supervisor.
   Photos: one slot for the delivery docket, plus up to LU_MAX others with captions. Sent like any report. */
const LU_NUM=51,LU_MAX=10;
function LU(d){return d.lu=d.lu||{act:"",sup:"",drv:"",co:"",rego:"",ls:"",le:"",us:"",ue:"",wt:"",L:[],U:[],G:[],E:[],cmt:"",actions:"",docket:null,ph:[]}}
const luForm=d=>tabByNum(d.tab).form;
const luDoL=d=>/L|B/.test(LU(d).act),luDoU=d=>/U|B/.test(LU(d).act);
const LU_ACT={L:"Loading",U:"Unloading",B:"Loading and unloading"};
/* the sections that apply to this job: [key, title, questions, options] */
function luSecs(d){const F=luForm(d);const S=[];
  if(luDoL(d))S.push(["L","Loading",F.loading,"YNA"]);
  if(luDoU(d))S.push(["U","Unloading",F.unloading,"YNA"],["G","For off-loading general freight",F.freight,"YN"]);
  return S}
const luWtQ=d=>luForm(d).loading.findIndex(q=>/weight of your load\? If Yes/i.test(q));
function luNos(d){const x=LU(d);return luSecs(d).flatMap(([k,ti,Q])=>Q.map((q,i)=>x[k][i]==="N"?`${ti} – ${q.replace(/\s*If Yes, specify the weight.*$/i,"")}`:null)).filter(Boolean)}
const luStop=d=>luNos(d).length>0;
function luProblems(d){const x=LU(d);const D=d.details;const p=[];
  if(!(D.location||"").trim())p.push("Work location");if(!(x.sup||"").trim())p.push("Supervisor name");if(!(D.inspector||"").trim())p.push("Operator name");
  if(!x.act){p.push("Loading, unloading or both?");return p}
  luSecs(d).forEach(([k,ti,Q])=>{const n=Q.filter((_,i)=>!x[k][i]).length;if(n)p.push(`${ti} – ${n} question${n>1?"s":""} not answered`)});
  const w=luWtQ(d);if(luDoL(d)&&x.L[w]==="Y"&&!String(x.wt||"").trim())p.push("Loading – specify the weight of the load");
  if(luStop(d)&&!String(x.actions||"").trim())p.push("A check is No – record in Actions what your Manager / Supervisor decided");
  return p}
const luAnswered=d=>{const x=LU(d);return luSecs(d).reduce((a,[k,,Q])=>a+Q.filter((_,i)=>x[k][i]).length,0)};
const luTotal=d=>luSecs(d).reduce((a,[,,Q])=>a+Q.length,0);
const luBanner=(d,big)=>luStop(d)?`<div class="t5-out stop ${big?"big":""}">${ic("alert")}<span><b>DO NOT PROCEED</b>Consult your Manager or Supervisor · ${luNos(d).length} check${luNos(d).length>1?"s":""} answered No</span></div>`:"";

function viewLoad(d){const t=tabByNum(d.tab);const x=LU(d);const D=d.details;const F=t.form;const y=window.scrollY;
  setHeader(`${pad(t.num)} · ${t.short}`,"Trade Assistants",backHome(d));
  const yn=(k,i,v,opt)=>`<div class="t5-yn" role="group" aria-label="Yes, No${opt==="YNA"?" or N/A":""}"><button class="y ${v==="Y"?"on":""}" onclick="luSet('${k}',${i},'Y')">YES</button><button class="n ${v==="N"?"on":""}" onclick="luSet('${k}',${i},'N')">NO</button>${opt==="YNA"?`<button class="x ${v==="NA"?"on":""}" onclick="luSet('${k}',${i},'NA')">N/A</button>`:""}</div>`;
  const inp=(k,lab,ph,req,type)=>`<div><label class="f">${lab}${req?' <span class="req">*</span>':""}</label><input class="t" ${type?`type="${type}"`:""} data-lu="${k}" value="${esc(x[k])}" placeholder="${esc(ph||"")}"></div>`;
  let h=`<div class="band"><b>${esc(t.title)}</b>${esc(t.scope)}</div><div class="alert blue t5-note">${ic("info")}<div>${esc(F.intro)}<br><b>Note:</b> ${esc(F.note)}</div></div>`;
  h+=`<div class="sec">Inspection checklist details</div><div class="card"><div class="grid2">
    <div><label class="f">Project</label><input class="t" value="${esc(CONFIG.projectShort)} (${esc(CONFIG.jobNo)})" disabled></div>
    <div><label class="f">Date <span class="muted">(valid for 1 shift)</span></label><input class="t" type="date" id="luDate" value="${esc(String(D.datetime||nowLocal()).slice(0,10))}"></div>
    <div><label class="f">Work location <span class="req">*</span></label><input class="t" data-d="location" value="${esc(D.location)}" placeholder="e.g. Laydown 2"></div>
    ${inp("sup","Supervisor name","",true)}
    <div><label class="f">Operator name <span class="req">*</span></label>${TA_TEAM().length?taChips(d):""}<input class="t" data-d="inspector" value="${esc(D.inspector)}"></div>
    ${inp("drv","Truck driver name")}${inp("co","Truck company")}${inp("rego","Registration No.","e.g. 1ABC234")}</div>
    <label class="f">This job is <span class="req">*</span></label><div class="seg" role="group">${Object.entries(LU_ACT).map(([k,l])=>`<button class="${x.act===k?"on":""}" onclick="luAct('${k}')">${k==="B"?"Both":l}</button>`).join("")}</div>
    ${x.act?`<div class="grid2">${luDoL(d)?inp("ls","Truck loading start time","",false,"time")+inp("le","Loading end time","",false,"time"):""}${luDoU(d)?inp("us","Truck unloading start time","",false,"time")+inp("ue","Unloading end time","",false,"time"):""}</div>`:""}</div>`;
  if(!x.act)h+=`<div class="card empty">${ic("info")}<b>Choose Loading, Unloading or Both</b>The checks for that job appear here.</div>`;
  luSecs(d).forEach(([k,ti,Q,opt])=>{
    h+=`<div class="sec">${esc(ti)}</div>${k==="G"?`<div class="alert org" style="margin:0 0 8px">${ic("alert")}<div>${esc(F.freightNote)}</div></div>`:""}<div class="card t5-list">${Q.map((q,i)=>`<div class="t5-q ${x[k][i]==="N"?"bad":""}"><span class="t5-n">${i+1}</span><span class="t5-t">${esc(q.replace(/\s*If Yes, specify the weight.*$/i,""))}</span>${yn(k,i,x[k][i],opt)}</div>
      ${k==="L"&&i===luWtQ(d)&&x.L[i]==="Y"?`<div class="t5-ctl"><label class="f">Specify the weight <span class="req">*</span></label><input class="t" data-lu="wt" value="${esc(x.wt)}" placeholder="e.g. 4.2 t"></div>`:""}`).join("")}</div>
     <div class="muted lu-stop">${esc(F.stop)}</div>`});
  if(x.act)h+=`<div class="sec">Special equipment / staff request</div><div class="card t5-list">${F.equip.map((q,i)=>`<div class="t5-q"><span class="t5-t">${esc(q)}</span>${yn("E",i,x.E[i],"YN")}</div>`).join("")}</div>`;
  h+=luBanner(d,true);
  h+=`<div class="sec">Comments and actions</div><div class="card"><label class="f">Comments</label><textarea class="t" rows="3" data-lu="cmt">${esc(x.cmt)}</textarea>
    <label class="f">Actions${luStop(d)?' <span class="req">*</span>':""}</label><textarea class="t" rows="3" data-lu="actions" placeholder="${luStop(d)?"What did your Manager / Supervisor decide?":""}">${esc(x.actions)}</textarea></div>`;
  h+=`<div class="sec">Photos</div><div class="card"><div class="cph" id="luph" style="margin-top:0">${luPhotosHTML(d)}</div></div>`;
  render(h);window.scrollTo(0,y);
  document.querySelectorAll("[data-d]").forEach(el=>el.addEventListener("input",()=>{d.details[el.dataset.d]=el.value;if(el.dataset.d==="inspector"&&!ls("inspector"))ls("inspector",el.value.trim());save(d);renderBar(d)}));
  document.querySelectorAll("[data-lu]").forEach(el=>el.addEventListener("input",()=>{LU(d)[el.dataset.lu]=el.value;save(d);renderBar(d)}));
  $("#luDate").addEventListener("input",e=>{if(!e.target.value)return;d.details.datetime=`${e.target.value}T${String(d.details.datetime||nowLocal()).slice(11,16)||"07:00"}`;d.reportId="";save(d)});
  renderBar(d)}
function luSet(k,i,v){const x=LU(CUR);x[k][i]=x[k][i]===v?"":v;if(k==="L"&&i===luWtQ(CUR)&&x.L[i]!=="Y")x.wt="";save(CUR);viewLoad(CUR)}
function luAct(k){LU(CUR).act=k;save(CUR);viewLoad(CUR)}
/* photos: the delivery docket has its own slot; others are optional, with a caption each */
function luPhotosHTML(d){const x=LU(d);const pick=(fn,src,lbl,cls)=>`<label class="${cls}">${lbl}<input type="file" accept="image/*" ${src==="camera"?'capture="environment"':""} class="hide" onchange="${fn}(this,'${src}')"></label>`;
  return `<div class="slot lu-docket ${x.docket?"ok":""}"><b>${ic("file","s")} Delivery docket</b><div class="muted" style="margin:-4px 0 8px">Photo of the delivery docket / consignment note for this load.</div>
    ${x.docket?`<div class="cx-item"><img src="${x.docket.img}" onclick="zoomImg(this.src)" alt="Delivery docket"><span class="muted">${esc(x.docket.stamp||"Delivery docket")}</span><button class="linkbtn" onclick="luDelDocket()">Remove</button></div>`
      :`<div class="pbtns">${pick("luAddDocket","camera",`${ic("camera","s")} Photo of docket`,"btn o")}${pick("luAddDocket","upload",`${ic("image","s")} Upload`,"btn g")}</div>`}</div>
   <div class="slot cx"><b>${ic("camera","s")} Other photos <span class="muted">· optional – load, restraints, truck, conditions</span></b>
    ${x.ph.length?`<div class="cx-list">${x.ph.map((p,i)=>`<div class="cx-item"><img src="${p.img}" onclick="zoomImg(this.src)" alt="Photo ${i+1}"><input class="t" placeholder="What does this show? (optional)" value="${esc(p.cap||"")}" oninput="luCap(${i},this.value)"><button class="linkbtn" onclick="luDelPh(${i})">Remove</button></div>`).join("")}</div>`:""}
    ${x.ph.length<LU_MAX?`<div class="pbtns">${pick("luAddPh","camera",`${ic("camera","s")} ${x.ph.length?"Add another":"Take photo"}`,"btn g")}${pick("luAddPh","upload",`${ic("image","s")} Upload`,"btn g")}</div>`:`<div class="muted">Maximum ${LU_MAX} other photos.</div>`}</div>`}
async function luStamp(f,src,what){const d=CUR;const x=LU(d);
  return stampPhoto(f,[[what,x.rego,d.details.inspector].filter(Boolean).join("  ·  "),[`Load & Unloading Checklist`,d.details.location].filter(Boolean).join("  ·  ")],{source:src,max:1600})}
async function luAddDocket(inp,src){const f=inp.files&&inp.files[0];if(!f)return;try{toast("Stamping photo…",1500);LU(CUR).docket=await luStamp(f,src,"Delivery docket");save(CUR,true);$("#luph").innerHTML=luPhotosHTML(CUR);renderBar(CUR)}catch(e){console.error(e);toast("Could not read that photo")}}
async function luDelDocket(){if(!await ask2("Remove the docket photo?","You can take it again.","Remove",true))return;LU(CUR).docket=null;save(CUR);$("#luph").innerHTML=luPhotosHTML(CUR)}
async function luAddPh(inp,src){const f=inp.files&&inp.files[0];if(!f)return;const x=LU(CUR);try{toast("Stamping photo…",1500);x.ph.push({...await luStamp(f,src,`Photo ${x.ph.length+1}`),cap:""});save(CUR,true);$("#luph").innerHTML=luPhotosHTML(CUR)}catch(e){console.error(e);toast("Could not read that photo")}}
function luCap(i,v){const p=LU(CUR).ph[i];if(p){p.cap=v;save(CUR)}}
async function luDelPh(i){if(!await ask2("Remove this photo?","It is removed from this checklist.","Remove",true))return;LU(CUR).ph.splice(i,1);save(CUR);$("#luph").innerHTML=luPhotosHTML(CUR)}
function luBarHTML(d){const n=luProblems(d).length;const T=luTotal(d);
  return `<div class="in"><div class="stats">${luStop(d)?`<b style="color:var(--ua)">DO NOT PROCEED</b>${n?` · ${n} to complete`:""}`:!n?`<b style="color:var(--c)">${ic("circlecheck","s")} Ready to review</b>`:`<b>${luAnswered(d)}/${T||"–"}</b> answered · ${n} to complete`}<div class="prog"><i style="width:${T?Math.round(luAnswered(d)/T*100):0}%"></i></div></div>
   <button class="btn o" onclick="toReview()">Review ${ic("arrow","s")}</button></div>`}
function luReviewHTML(d){const x=LU(d);const D=d.details;const n=luPhotoList(d).length;
  return `<div class="card"><b style="font-size:16px">${esc(tabByNum(d.tab).title)}</b><div class="muted" style="margin-top:3px">${ic("pin","s")} ${esc(D.location||"–")} · ${fmtD(String(D.datetime).slice(0,10))} · ${esc(LU_ACT[x.act]||"–")}<br>${ic("user","s")} Operator ${esc(D.inspector||"–")} · Supervisor ${esc(x.sup||"–")}${x.co||x.rego?`<br>${ic("truck","s")} ${esc([x.co,x.rego].filter(Boolean).join(" · "))}`:""}</div>
    <div class="libmeta" style="margin-top:8px"><span class="pill ${x.docket?"c":"na"}">${x.docket?"Docket photo":"No docket photo"}</span><span class="pill na">${n} photo${n===1?"":"s"}</span></div></div>${luBanner(d)}
    ${!x.docket?`<div class="alert org">${ic("camera")}<div><b>No delivery docket photo.</b> If there is a docket for this load, go back and add a photo of it.</div></div>`:""}`}

/* ---------- report: rows, email text, email HTML, PDF ---------- */
const luYN=v=>v==="Y"?"YES":v==="N"?"NO":v==="NA"?"N/A":"-";
function luRows(d){const x=LU(d);const D=d.details;const tm=(a,b)=>a||b?`${a||"-"} to ${b||"-"}`:"-";
  return [["Record No",reportId(d)],["Project",`${CONFIG.project}`],["Date (valid for 1 shift)",fmtD(String(D.datetime).slice(0,10))],["Work location",D.location||"-"],["Job",LU_ACT[x.act]||"-"],
    ["Supervisor name",x.sup||"-"],["Operator name",D.inspector||"-"],["Truck driver name",x.drv||"-"],["Truck company",x.co||"-"],["Registration No.",x.rego||"-"],
    ...(luDoL(d)?[["Truck loading start / end time",tm(x.ls,x.le)]]:[]),...(luDoU(d)?[["Truck unloading start / end time",tm(x.us,x.ue)]]:[])]}
const luOutText=d=>luStop(d)?"DO NOT PROCEED – consult your Manager or Supervisor":"All checks satisfactory – proceed";
function luQText(d,k,q,i){const x=LU(d);return k==="L"&&i===luWtQ(d)?q.replace(/specify the weight:?\s*$/i,`specify the weight: ${x.wt||"-"}`):q}
function luPhotoList(d){const x=LU(d);return [...(x.docket?[{img:x.docket.img,cap:"Delivery docket"}]:[]),...x.ph.map((p,i)=>({img:p.img,cap:p.cap?`Photo ${i+1} – ${p.cap}`:`Photo ${i+1}`}))]}
function luSubject(d){const x=LU(d);const D=d.details;
  return `YMT Load & Unloading Checklist | ${LU_ACT[x.act]||""} | ${[x.co,x.rego].filter(Boolean).join(" ")||"truck"} | ${fmtD(String(D.datetime).slice(0,10))} | ${D.location} | by ${D.inspector}${luStop(d)?" | ⚠ DO NOT PROCEED":""}`}
function luBodyText(d){const x=LU(d);const F=luForm(d);const L=[];const HR="━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  L.push("PARRON | LOAD AND UNLOADING TRUCK SITE INSPECTION CHECKLIST");L.push(HR);L.push("");luRows(d).forEach(r=>L.push(`• ${r[0]}: ${r[1]}`));L.push("");
  L.push(`OUTCOME: ${luOutText(d)}`);if(luStop(d))luNos(d).forEach(n=>L.push(`  ✗ ${n}`));L.push("");
  luSecs(d).forEach(([k,ti,Q])=>{L.push(ti.toUpperCase());Q.forEach((q,i)=>L.push(`${i+1}. ${luQText(d,k,q,i)} – ${luYN(x[k][i])}`));L.push("")});
  const eq=F.equip.map((q,i)=>x.E[i]==="Y"?q:null).filter(Boolean);L.push(`SPECIAL EQUIPMENT / STAFF REQUEST: ${eq.length?eq.join(", "):"none"}`);L.push("");
  L.push(`Comments: ${x.cmt||"-"}`);L.push(`Actions: ${x.actions||"-"}`);L.push(`Photos: ${x.docket?"delivery docket + ":"no docket photo, "}${x.ph.length} other`);L.push("");
  L.push("Completed checklist attached (PDF).");L.push(`Sent from PARRON v${CONFIG.appVersion}`);return L.join("\n")}
function luHtml(d){const x=LU(d);const F=luForm(d);const e=esc;const stop=luStop(d);
  const td='style="border:1px solid #D0D5DD;padding:6px 8px;vertical-align:top;font-size:13px"',tl='style="border:1px solid #D0D5DD;padding:6px 8px;vertical-align:top;font-size:13px;background:#F2F4F7;font-weight:700;color:#112B4E;width:220px"',th='style="border:1px solid #112B4E;background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const yn=v=>`<b style="color:${v==="Y"?"#2E7D32":v==="N"?"#C62828":"#5B6675"}">${luYN(v)}</b>`;const eq=F.equip.map((q,i)=>x.E[i]==="Y"?q:null).filter(Boolean);
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1B2430;max-width:860px">
  <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700;letter-spacing:.06em">PARRON | ${e(tabByNum(d.tab).docNo)}</div><div style="font-size:18px;font-weight:700">Load and Unloading Truck Site Inspection Checklist</div></div>
  <div style="margin:12px 0;padding:10px 12px;border-radius:6px;font-weight:700;font-size:15px;color:#fff;background:${stop?"#C62828":"#2E7D32"}">${e(luOutText(d))}</div>
  <table style="border-collapse:collapse;width:100%">${luRows(d).map(r=>`<tr><td ${tl}>${e(r[0])}</td><td ${td}>${e(r[1])}</td></tr>`).join("")}</table>
  ${luSecs(d).map(([k,ti,Q])=>`<h3 style="color:#112B4E;margin:14px 0 4px">${e(ti)}</h3><table style="border-collapse:collapse;width:100%"><tr><th ${th}>#</th><th ${th}>Check</th><th ${th}>Answer</th></tr>${Q.map((q,i)=>`<tr><td ${td}>${i+1}</td><td ${td}>${e(luQText(d,k,q,i))}</td><td ${td}>${yn(x[k][i])}</td></tr>`).join("")}</table>`).join("")}
  <p style="font-size:13px"><b>Special equipment / staff request:</b> ${eq.length?e(eq.join(", ")):"none"}</p>
  <p style="font-size:13px"><b>Comments:</b> ${e(x.cmt||"-")}<br><b>Actions:</b> ${e(x.actions||"-")}</p>
  <p style="font-size:13px"><b>Photos:</b> ${x.docket?"delivery docket and ":"no docket photo, "}${x.ph.length} other – in the attached PDF.</p>
  <p style="color:#5B6675;font-size:12px">Completed checklist attached (PDF). Sent from PARRON v${e(CONFIG.appVersion)}</p></div>`}
async function buildLoadPDF(d){const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});const t=tabByNum(d.tab);const x=LU(d);const F=t.form;const D=d.details;
  const W=210,M=12;const NAVY=hex("#112B4E"),ORG=hex("#EC7723"),GREY=hex("#F2F4F7");const stop=luStop(d);
  const lp=doc.getImageProperties(LOGO);const lh=11,lw=lp.width*lh/lp.height;doc.addImage(LOGO,"PNG",M,10,lw,lh);
  doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...ORG);doc.text("FORM",W-M,12,{align:"right"});
  doc.setFontSize(13);doc.setTextColor(...NAVY);doc.text("Load and Unloading Truck Site Inspection Checklist",W-M,18.5,{align:"right"});
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(90);doc.text(`${t.docNo}  Rev ${t.rev}  |  Record No ${reportId(d)}`,W-M,22.5,{align:"right"});
  doc.setFillColor(...NAVY);doc.rect(M,25,W-2*M,6.5,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(PDFSAFE(CONFIG.project),M+2,29.3);
  let y=34;const sty={font:"helvetica",fontSize:8.2,cellPadding:1.8,lineColor:[200,206,214],lineWidth:.2,textColor:20,valign:"top"};
  doc.setFillColor(...hex(stop?"#C62828":"#2E7D32"));doc.roundedRect(M,y,W-2*M,9,1.5,1.5,"F");doc.setTextColor(255);doc.setFontSize(11);doc.text(PDFSAFE(luOutText(d)),W/2,y+6,{align:"center"});y+=13;
  const tbl=o=>{doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",styles:sty,headStyles:{fillColor:NAVY,textColor:255},...o});y=doc.lastAutoTable.finalY+4};
  const kv=rows=>tbl({body:rows.map(r=>r.map(PDFSAFE)),columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:56}}});
  const sec=txt=>{if(y>262){doc.addPage();y=16}doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...NAVY);doc.text(txt,M,y+4);doc.setDrawColor(...ORG);doc.setLineWidth(.6);doc.line(M,y+5.5,W-M,y+5.5);doc.setLineWidth(.2);y+=8};
  const ynCell=c=>{if(c.section==="body"&&c.column.index===2){const v=c.cell.raw;if(v==="YES"||v==="NO"){c.cell.styles.fontStyle="bold";c.cell.styles.textColor=hex(v==="YES"?"#2E7D32":"#C62828")}}};
  doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(90);const nl=doc.splitTextToSize(PDFSAFE(`${F.intro} Note: ${F.note}`),W-2*M);doc.text(nl,M,y);y+=nl.length*3.3+2;
  sec("INSPECTION CHECKLIST DETAILS");kv(luRows(d));
  luSecs(d).forEach(([k,ti,Q])=>{sec(ti.toUpperCase());if(k==="G"){doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.setTextColor(...hex("#C62828"));const g=doc.splitTextToSize(PDFSAFE("Note: "+F.freightNote),W-2*M);doc.text(g,M,y+1);y+=g.length*3.3+2}
    tbl({head:[["#","Check","Answer"]],body:Q.map((q,i)=>[i+1,PDFSAFE(luQText(d,k,q,i)),luYN(x[k][i])]),columnStyles:{0:{cellWidth:8},2:{cellWidth:18,halign:"center"}},didParseCell:ynCell})});
  if(!luDoL(d)||!luDoU(d)){doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(90);doc.text(PDFSAFE(`${luDoL(d)?"Unloading and general freight":"Loading"} checks not applicable – this job was ${(LU_ACT[x.act]||"").toLowerCase()} only.`),M,y);y+=5}
  doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...hex("#C62828"));doc.text(PDFSAFE(F.stop),M,y+1);y+=5;
  sec("SPECIAL EQUIPMENT / STAFF REQUEST");tbl({head:[["Equipment / staff","Requested"]],body:F.equip.map((q,i)=>[PDFSAFE(q),luYN(x.E[i])]),columnStyles:{1:{cellWidth:24,halign:"center"}}});
  sec("COMMENTS AND ACTIONS");kv([["Comments",x.cmt||"-"],["Actions",x.actions||"-"]]);
  if(y>240){doc.addPage();y=16}sec("SIGN-OFF");doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(60);doc.text(PDFSAFE(F.declaration),M,y+2);y+=5;
  doc.autoTable({startY:y,margin:{left:M,right:M},theme:"grid",styles:{...sty,minCellHeight:9},columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:56}},
    body:[["Operator name",PDFSAFE(D.inspector)],["Operator signature",""],["Supervisor name",PDFSAFE(x.sup||"-")],["Truck driver name",PDFSAFE(x.drv||"-")],["Date",fmtD(String(D.datetime).slice(0,10))]],
    didDrawCell:c=>{if(c.section==="body"&&c.row.index===1&&c.column.index===1&&d.signature){const h=Math.min(c.cell.height-2,14);try{doc.addImage(d.signature,"PNG",c.cell.x+2,c.cell.y+1,h*2.6,h)}catch(e){}}},
    didParseCell:c=>{if(c.section==="body"&&c.row.index===1)c.cell.styles.minCellHeight=16}});
  const ph=luPhotoList(d);
  if(ph.length){doc.addPage();y=16;doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(...NAVY);doc.text("PHOTOS",M,y);y+=4;
    const cap=(t,px,py,w)=>{doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(60);doc.text(PDFSAFE(t),px,py,{maxWidth:w})};
    let rest=ph;if(x.docket){const p=ph[0];const ip=doc.getImageProperties(p.img);const w=W-2*M;const h=Math.min(w*ip.height/ip.width,170);
      doc.addImage(p.img,"JPEG",M,y,Math.min(h*ip.width/ip.height,w),h);cap(p.cap,M,y+h+3.5,w);y+=h+10;rest=ph.slice(1)}
    const cols=2,gap=6,pw=(W-2*M-gap)/cols;let rh=0;
    rest.forEach((p,i)=>{const ip=doc.getImageProperties(p.img);const h=Math.min(pw*ip.height/ip.width,95);const c=i%cols;
      if(c===0&&i>0){y+=rh+10;rh=0}if(c===0&&y+h>275){doc.addPage();y=16}
      doc.addImage(p.img,"JPEG",M+c*(pw+gap),y,Math.min(h*ip.width/ip.height,pw),h);cap(p.cap,M+c*(pw+gap),y+h+3.5,pw);rh=Math.max(rh,h)})}
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor(110);
    doc.text(`Doc ID: ${t.docNo}  |  Rev: ${t.rev}  |  Date: ${t.issued}  |  ${reportId(d)}`,M,290);doc.text(`PARRON v${CONFIG.appVersion}  |  Uncontrolled when printed  |  Page ${i} of ${n}`,W-M,290,{align:"right"})}
  PDFBLOB=doc.output("blob");return PDFBLOB}
async function startLoad(){const d0=(await dbAll("drafts")).filter(x=>x.tab===LU_NUM).sort((a,b)=>b.updated-a.updated)[0];if(d0)return go("#insp/"+d0.id);startInsp(LU_NUM)}
