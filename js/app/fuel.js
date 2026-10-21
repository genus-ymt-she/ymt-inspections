"use strict";
/* ---------- 28 Daily Fuel Usage / Hours / Pre-Start Register (TAs – one entry a day, sent at the end of the day) ----------
   One sheet per day: for each asset the pre-start (Y/N/N/A), hours basis, hour meter start and end, the standpipe flow meter,
   fuel issued and comments, then sign and send. The draft stays on the phone until it is sent. */
const FUEL_POS="Trade Assistant";
function FU(d){if(!d.fuel){const t=tabByNum(d.tab);d.fuel={rows:t.assets.map(a=>({id:a.id,desc:a.desc,hours:!!a.hours,pre:"",basis:"Daily",hs:"",he:"",flow:"",fuel:"",cmt:"",ph:[]})),
  amAt:"",pmAt:"",position:FUEL_POS,vName:"",vPos:"",vSig:""}}return d.fuel}
const fuelNum=v=>{const n=parseFloat(String(v==null?"":v).replace(/,/g,""));return isFinite(n)?n:null};
const fuelUsed=r=>r.pre&&r.pre!=="NA";
const fuelLabel=r=>[r.id,r.desc].filter(x=>String(x||"").trim()).join(" · ")||"New asset";
function fuelHrs(r){const s=fuelNum(r.hs),e=fuelNum(r.he);return s!==null&&e!==null&&e>=s?Math.round((e-s)*10)/10:null}
const fuelDone=d=>FU(d).rows.filter(r=>r.pre).length;
function fuelTotal(d){return Math.round(FU(d).rows.filter(fuelUsed).reduce((a,r)=>a+(fuelNum(r.fuel)||0),0)*10)/10}
const hhmm=()=>{const n=new Date();return `${pad(n.getHours())}:${pad(n.getMinutes())}`};
function fuelDate(d){return String(d.details.datetime||nowLocal()).slice(0,10)}

/* one-tap "who is doing this" for shared TA phones */
const TA_TEAM=()=>TEAM.filter(p=>p.ta);
function taChips(d){const cur=nameKey(d.details.inspector||"");return `<div class="chips tachips" role="group" aria-label="Who is completing this">${TA_TEAM().map(p=>`<button class="chip ${nameKey(p.name)===cur?"on":""}" onclick="taPick('${esc(p.name)}')">${ic("user","s")} ${esc(p.name)}</button>`).join("")}</div>`}
function taPick(name){const d=CUR;d.details.inspector=name;const t=tabByNum(d.tab);if(t.kind==="fuel"){const p=teamBy(name);FU(d).position=p?p.role:FU(d).position}d.reportId="";save(d);viewInsp(d)}
function viewFuel(d){const t=tabByNum(d.tab);const F=FU(d);const D=d.details;
  setHeader(`${pad(t.num)} · ${t.short}`,"Trade Assistants",backHome(d));
  let h=`<div class="band"><b>${esc(t.title)}</b>${esc(t.scope)}</div>
   <div class="card"><div class="lock">${ic("lock","s")} Project &amp; shift details (fixed)</div><div class="fixed">${t.fixed.map(f=>`<div><small>${esc(f[0])}</small><span>${esc(f[1])}</span></div>`).join("")}<div><small>Form</small><span>${esc(t.docNo)} · Rev ${esc(t.rev)}</span></div></div></div>
   <div class="card"><div class="grid2">
    <div><label class="f">Date</label><input class="t" type="date" id="fuDate" value="${esc(fuelDate(d))}"></div>
    <div><label class="f">Recorded by <span class="req">*</span></label>${taChips(d)}<input class="t" data-d="inspector" value="${esc(D.inspector)}" autocomplete="name" placeholder="Or type a name"></div>
    <div><label class="f">Position</label><input class="t" id="fuPos" value="${esc(F.position||"")}"></div></div></div>
   <div id="fstage">${fuelSheetHTML(d)}</div>`;
  render(h);
  document.querySelectorAll("[data-d]").forEach(el=>el.addEventListener("input",()=>{d.details[el.dataset.d]=el.value;if(el.dataset.d==="inspector"&&!ls("inspector"))ls("inspector",el.value.trim());save(d);renderBar(d)}));
  $("#fuDate").addEventListener("input",e=>{if(!e.target.value)return;d.details.datetime=`${e.target.value}T${String(d.details.datetime||nowLocal()).slice(11,16)||"06:00"}`;d.reportId="";save(d)});
  $("#fuPos").addEventListener("input",e=>{FU(d).position=e.target.value;save(d)});
  $("#fstage").addEventListener("input",e=>{const k=e.target.dataset.fu;if(!k)return;const [i,f]=k.split("|");FU(d).rows[+i][f]=e.target.value;save(d);
    if(f==="fuel"){const x=$("#ftot");if(x)x.textContent=fuelTotal(d)}if(f==="he"||f==="hs"){const x=$("#fhr-"+i);if(x)x.innerHTML=fuelHrsNote(FU(d).rows[+i])}renderBar(d)});
  renderBar(d)}
/* the whole day on one sheet – completed and sent at the end of the day */
function fuelSheetHTML(d){const F=FU(d);
  return `<div class="muted fhelp">${ic("info","s")} Complete once a day, at the end of the day. For each asset: was the pre-start done, the hour meter at the start and end of the day, the standpipe flow meter and fuel issued. Leave fuel blank if none was issued. Photos are optional.</div>
    ${F.rows.map((r,i)=>`<div class="card fa ${r.pre==="NA"?"na":""}" id="fa-${i}">${fuelAssetCard(d,i)}</div>`).join("")}
    <button class="addph" style="width:100%" onclick="fuelAddRow()">${ic("plus","s")} Add another asset</button>
    <div class="card ftotal"><span>Total fuel used</span><b><span id="ftot">${fuelTotal(d)}</span> L</b></div>
    <button class="btn o w" onclick="toReview()">Review &amp; sign ${ic("arrow","s")}</button>`}
function fuelHead(r,i,edit){return edit?`<div class="grid2 fnew"><div><label class="f">Asset ID</label><input class="t" data-fu="${i}|id" value="${esc(r.id)}" placeholder="e.g. GEN03"></div><div><label class="f">Description <span class="req">*</span></label><input class="t" data-fu="${i}|desc" value="${esc(r.desc)}" placeholder="e.g. Lighting tower"></div></div>`
  :`<div class="fh"><span class="fid">${esc(r.id||"–")}</span><b>${esc(r.desc)}</b></div>`}
function fuelSeg(i,f,v,opts){return `<div class="seg">${opts.map(([val,lab])=>`<button class="${v===val?"on":""}" onclick="fuelPick(${i},'${f}','${val}')">${lab}</button>`).join("")}</div>`}
function fuelAssetCard(d,i){const r=FU(d).rows[i];const N=r.pre==="N";
  return `${fuelHead(r,i,r.custom)}
   <label class="f">Pre-start completed? <span class="req">*</span></label>${fuelSeg(i,"pre",r.pre,[["Y","Yes"],["N","No"],["NA","N/A"]])}
   ${N?`<div class="alert red" style="margin:10px 0 0">${ic("alert")}<div><b>Pre-start not done.</b> The plant must not be operated until the pre-start is completed. Say why below and tell your Supervisor.</div></div>`:""}
   ${fuelUsed(r)?`<div class="grid2"><div><label class="f">Hours basis</label>${fuelSeg(i,"basis",r.basis,[["Daily","Daily"],["Once-off","Once-off"]])}</div>
     <div><label class="f">Hour meter – start of day${r.hours&&r.pre==="Y"?' <span class="req">*</span>':""}</label><input class="t" inputmode="decimal" data-fu="${i}|hs" value="${esc(r.hs)}" placeholder="e.g. 8567.3"></div>
     <div><label class="f">Hour meter – end of day</label><input class="t" inputmode="decimal" data-fu="${i}|he" value="${esc(r.he)}" placeholder="Optional"><div class="muted" id="fhr-${i}" style="margin-top:4px">${fuelHrsNote(r)}</div></div>
     <div><label class="f">Flow meter reading (standpipe)</label><input class="t" inputmode="decimal" data-fu="${i}|flow" value="${esc(r.flow)}"></div>
     <div><label class="f">Fuel issued (L)</label><input class="t" inputmode="decimal" data-fu="${i}|fuel" value="${esc(r.fuel)}" placeholder="0"></div></div>
     <label class="f">${N?'Reason / issue <span class="req">*</span>':"Comments / issues"}</label><textarea class="t" rows="2" data-fu="${i}|cmt" placeholder="${N?"":"e.g. Fuelled pod (Badgingarra Roadhouse)"}">${esc(r.cmt)}</textarea>
     ${fuelPhotos(d,i)}`:""}
   ${r.custom?`<button class="linkbtn" onclick="fuelDelRow(${i})">${ic("trash","s")} Remove this asset</button>`:""}`}
function fuelHrsNote(r){const s=fuelNum(r.hs),e=fuelNum(r.he);if(e===null||s===null)return "";
  if(e<s)return `<span style="color:var(--ua);font-weight:800">Lower than the start reading (${esc(r.hs)})</span>`;const h=fuelHrs(r);return h!==null?`<b>${h} hrs</b> today`:""}
function fuelPhotos(d,i){const r=FU(d).rows[i];
  return `<div class="fph">${r.ph.length?`<div class="photos">${r.ph.map((p,k)=>`<div class="ph"><img src="${p.img}" onclick="zoomImg(this.src)" alt="Photo"><button onclick="fuelDelPh(${i},${k})" aria-label="Remove photo">${ic("x")}</button></div>`).join("")}</div>`:""}
   <div class="pbtns"><label class="addph">${ic("camera","s")} Photo of meter<input type="file" accept="image/*" capture="environment" class="hide" onchange="fuelAddPh(${i},this,'camera')"></label><label class="addph">${ic("image","s")} Upload<input type="file" accept="image/*" class="hide" onchange="fuelAddPh(${i},this,'upload')"></label></div></div>`}
function fuelCard(i){const el=$("#fa-"+i);if(!el)return;const r=FU(CUR).rows[i];el.className=`card fa ${r.pre==="NA"?"na":""}`;el.innerHTML=fuelAssetCard(CUR,i);const x=$("#ftot");if(x)x.textContent=fuelTotal(CUR);renderBar(CUR)}
function fuelPick(i,f,v){const r=FU(CUR).rows[i];r[f]=r[f]===v&&f==="pre"?"":v;save(CUR);fuelCard(i)}
function fuelAddRow(){FU(CUR).rows.push({id:"",desc:"",hours:true,custom:true,pre:"",basis:"Daily",hs:"",he:"",flow:"",fuel:"",cmt:"",ph:[]});save(CUR);$("#fstage").innerHTML=fuelSheetHTML(CUR);renderBar(CUR)}
async function fuelDelRow(i){if(!await ask2("Remove this asset?","It is removed from today's register.","Remove",true))return;FU(CUR).rows.splice(i,1);save(CUR);$("#fstage").innerHTML=fuelSheetHTML(CUR);renderBar(CUR)}
async function fuelAddPh(i,inp,src){const f=inp.files&&inp.files[0];if(!f)return;const d=CUR;const r=FU(d).rows[i];
  try{toast("Stamping photo…",1500);const ph=await stampPhoto(f,[[fuelLabel(r),d.details.inspector].filter(Boolean).join("  ·  "),`Fuel, Hours & Pre-Start Register  ·  ${fmtD(fuelDate(d))}`],{source:src,max:1280});
    r.ph.push({s:"day",img:ph.img});save(d,true);fuelCard(i)}catch(e){console.error(e);toast("Could not read that photo")}}
async function fuelDelPh(i,k){if(!await ask2("Remove this photo?","It is removed from the register.","Remove",true))return;FU(CUR).rows[i].ph.splice(k,1);save(CUR);fuelCard(i)}
function fuelProblems(d){const F=FU(d);const p=[];if(!d.details.inspector.trim())p.push("Recorded by");
  F.rows.forEach(r=>{const L=fuelLabel(r);if(r.custom&&!String(r.desc||"").trim())p.push("A new asset needs a description");
    if(!r.pre)p.push(`${L}: pre-start completed? (Yes / No / N/A)`);else if(r.pre==="N"&&!String(r.cmt||"").trim())p.push(`${L}: reason the pre-start was not done`);
    if(r.pre==="Y"&&r.hours&&fuelNum(r.hs)===null)p.push(`${L}: hour meter at the start of the day`)});
  F.rows.filter(fuelUsed).forEach(r=>{const L=fuelLabel(r);const s=fuelNum(r.hs),e=fuelNum(r.he);
    if(String(r.he||"").trim()&&e===null)p.push(`${L}: end-of-day hour meter is not a number`);else if(s!==null&&e!==null&&e<s)p.push(`${L}: end-of-day hour meter is lower than the start`);
    if(String(r.fuel||"").trim()&&fuelNum(r.fuel)===null)p.push(`${L}: fuel issued is not a number`)});
  return p}
function fuelBarHTML(d){const n=fuelProblems(d).length;
  return `<div class="in"><div class="stats">${n?`<b>${n}</b> item(s) to complete`:`<b style="color:var(--c)">${ic("circlecheck","s")} Ready to review</b>`} · ${fuelTotal(d)} L</div>
   <button class="btn o" onclick="toReview()">Review ${ic("arrow","s")}</button></div>`}

/* ---------- review, sign and send ---------- */
function fuelRecipients(d){const t=tabByNum(d.tab);return [...new Set([...(t.to||[]),recipient()].filter(e=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)).map(e=>e.toLowerCase()))]}
function viewFuelReview(d){const t=tabByNum(d.tab);const F=FU(d);setHeader("Review & send",`${pad(t.num)} · ${t.short}`,{icon:"back",aria:"Back to register",fn:()=>go("#insp/"+d.id)});
  const bar=document.getElementById("bar");if(bar)bar.remove();PDFBLOB=null;F.pmAt=hhmm();save(d)
  const p=fuelProblems(d);const used=F.rows.filter(fuelUsed);
  let h=`<div class="stepper"><div class="done">1 · Record</div><div class="on">2 · Review & sign</div><div>3 · Send</div></div>
   <div class="card"><b style="font-size:16px">${esc(t.title)}</b><div class="muted" style="margin-top:3px">${ic("cal","s")} ${fmtD(fuelDate(d))} · ${ic("user","s")} ${esc(d.details.inspector)}${F.position?` (${esc(F.position)})`:""}<br>${ic("clock","s")} Completed ${esc(F.pmAt||"–")}</div>
    <div class="libmeta" style="margin-top:8px"><span class="pill c">${used.filter(r=>r.pre==="Y").length} pre-starts done</span>${used.some(r=>r.pre==="N")?`<span class="pill ua">${used.filter(r=>r.pre==="N").length} not done</span>`:""}<span class="pill na">${F.rows.length-used.length} not in use</span><span class="pill ni">${fuelTotal(d)} L fuel</span></div></div>`;
  if(p.length)h+=`<div class="alert red">${ic("alert")}<div><b>Not ready to send</b><ul>${p.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><button class="btn s" style="margin-top:10px" onclick="go('#insp/${d.id}')">${ic("back","s")} Back to register</button></div></div>`;
  h+=`<h2>Register</h2><div class="card" style="overflow-x:auto"><table class="reftbl ftbl"><tr><th>Asset</th><th>Pre-start</th><th>Hours</th><th>Fuel (L)</th></tr>
   ${F.rows.map(r=>`<tr class="${fuelUsed(r)?"":"off"}"><td><b>${esc(r.id||"–")}</b> ${esc(r.desc)}</td><td>${r.pre==="NA"?"N/A":r.pre==="Y"?"Yes":r.pre==="N"?'<b style="color:var(--ua)">No</b>':"–"}</td><td>${esc(r.hs||"")}${r.he?` → ${esc(r.he)}`:""}${fuelHrs(r)!==null?` <span class="muted">(${fuelHrs(r)} h)</span>`:""}</td><td>${esc(r.fuel||"")}</td></tr>`).join("")}
   <tr><td colspan="3" style="text-align:right"><b>Total fuel used</b></td><td><b>${fuelTotal(d)}</b></td></tr></table></div>`;
  h+=`<h2>Completed by</h2><div class="muted" style="margin:0 4px 6px">${esc(t.declaration)}</div><div class="card"><canvas class="sig" id="sig" aria-label="Signature pad"></canvas><div style="display:flex;justify-content:space-between;align-items:center"><span class="muted">Sign with your finger</span><button class="linkbtn" onclick="clearSig()">Clear</button></div></div>
   <h2>Verified by – Supervisor (optional)</h2><div class="muted" style="margin:0 4px 6px">Supervisor or site representative, if available at the end of the day.</div><div class="card"><div class="grid2">
    <div><label class="f">Name</label><input class="t" id="fvName" list="teamnames" value="${esc(F.vName)}" autocomplete="off"><datalist id="teamnames">${TEAM.filter(p=>!p.ta).map(x=>`<option value="${esc(x.name)}">${esc(x.role)}</option>`).join("")}</datalist></div>
    <div><label class="f">Position</label><input class="t" id="fvPos" value="${esc(F.vPos)}"></div></div>
    <label class="f">Signature</label><canvas class="sig" id="sig2" aria-label="Supervisor signature pad"></canvas><div style="display:flex;justify-content:space-between;align-items:center"><span class="muted">Hand the phone to the Supervisor to sign</span><button class="linkbtn" onclick="fuelClearSig2()">Clear</button></div></div>`;
  const to=fuelRecipients(d);
  h+=`<h2>Send to ${esc(t.toLabel||"Project Admin")}</h2><div class="card"><div class="muted">Register goes to <b style="color:var(--ink)">${to.map(esc).join(", ")}</b></div>
   ${directOn()?`<button class="btn o w" id="bShare" ${p.length?'data-blocked="1" disabled':"disabled"} onclick="fuelSend()">${p.length?"Send register":"Preparing register…"}</button>
   <div class="muted" style="margin-top:8px">One tap. The PDF and table are emailed straight away. No signal? It waits in the Outbox and sends automatically when you are back in range.</div>
   <details style="margin-top:14px"><summary class="muted" style="cursor:pointer;min-height:40px;display:flex;align-items:center">Other ways to send</summary>
   <button class="btn g w" ${p.length?"disabled":""} onclick="fuelSend(true)">${ic("send","s")} Share PDF via Outlook</button>
   <button class="btn g w" ${p.length?"disabled":""} onclick="savePDF()">${ic("download","s")} Save PDF only</button>
   <button class="btn g w" ${p.length?"disabled":""} onclick="previewPDF()">${ic("file","s")} Preview PDF</button>
   <button class="btn w" ${p.length?"disabled":""} onclick="markSent()">I sent it another way – close this register</button></details>`
   :`<button class="btn o w" id="bShare" ${p.length?'data-blocked="1" disabled':"disabled"} onclick="fuelSend(true)">${p.length?"Share PDF via Outlook":"Preparing register…"}</button>
   <button class="btn g w" ${p.length?"disabled":""} onclick="savePDF()">${ic("download","s")} Save PDF only</button>
   <button class="btn w" ${p.length?"disabled":""} onclick="markSent()">I've sent it – close this register</button>`}</div>`;
  render(h);initSig(d);fuelInitSig2(d);
  $("#fvName").addEventListener("input",e=>{F.vName=e.target.value;const m=TEAM.find(x=>x.name===e.target.value);if(m&&!F.vPos){F.vPos=m.role;$("#fvPos").value=m.role}save(d);fuelPrep(d)});
  $("#fvPos").addEventListener("input",e=>{F.vPos=e.target.value;save(d);fuelPrep(d)});
  if(!p.length)prepPDF(d)}
/* the completed-by signature is required before the register is sent */
function fuelSend(share){if(!CUR.signature){toast("Sign the register first (Completed by)",4000);const c=$("#sig");if(c)c.scrollIntoView({behavior:"smooth",block:"center"});return}share?sendShare():sendDirect()}
function fuelPrep(d){clearTimeout(fuelPrep._t);fuelPrep._t=setTimeout(()=>{if(!problems(d).length)prepPDF(d)},500)}
function fuelInitSig2(d){sigPad($("#sig2"),FU(d).vSig,u=>{FU(d).vSig=u;save(d);fuelPrep(d)})}
function fuelClearSig2(){const c=$("#sig2");c.getContext("2d").clearRect(0,0,c.width,c.height);FU(CUR).vSig="";save(CUR);fuelPrep(CUR)}

/* ---------- outputs ---------- */
const fuelPre=r=>r.pre==="Y"?"Y":r.pre==="N"?"N":r.pre==="NA"?"N/A":"";
function fuelRows(d){const F=FU(d);return F.rows.map(r=>({id:r.id||"",desc:r.desc||"",pre:fuelPre(r),basis:fuelUsed(r)?r.basis:"",hs:fuelUsed(r)?r.hs:"",he:fuelUsed(r)?r.he:"",
  hrs:fuelUsed(r)&&fuelHrs(r)!==null?fuelHrs(r):"",flow:fuelUsed(r)?r.flow:"",fuel:fuelUsed(r)&&fuelNum(r.fuel)!==null?fuelNum(r.fuel):"",cmt:r.cmt||""}))}
function fuelPayload(d){const F=FU(d);return {date:fuelDate(d),by:d.details.inspector,position:F.position||"",amAt:F.amAt,pmAt:F.pmAt,total:fuelTotal(d),verifiedBy:F.vName||"",rows:fuelRows(d)}}
function fuelSubject(d){return `YMT Fuel, Hours & Pre-Start Register | ${fmtD(fuelDate(d))} | ${fuelTotal(d)} L | by ${d.details.inspector}${FU(d).rows.some(r=>r.pre==="N")?" | ⚠ PRE-START NOT DONE":""}`}
function fuelBodyText(d){const t=tabByNum(d.tab);const F=FU(d);const L=[];const HR="━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  L.push("PARRON | DAILY FUEL USAGE / HOURS / PRE-START REGISTER");L.push(t.subtitle);L.push(HR);
  L.push(`• Date: ${fmtD(fuelDate(d))}`);L.push(`• Recorded by: ${d.details.inspector}${F.position?` (${F.position})`:""}`);L.push(`• Completed: ${F.pmAt||"-"} (end of day)`);L.push("");
  fuelRows(d).forEach(r=>L.push(`${r.id||"-"} ${r.desc}: pre-start ${r.pre||"-"}${r.basis?` | ${r.basis}`:""}${r.hs!==""?` | hours ${r.hs}${r.he?` → ${r.he}`:""}`:""}${r.flow?` | flow ${r.flow}`:""}${r.fuel!==""?` | fuel ${r.fuel} L`:""}${r.cmt?` | ${r.cmt}`:""}`));
  L.push("");L.push(`TOTAL FUEL USED: ${fuelTotal(d)} L`);L.push(`Verified by: ${F.vName?`${F.vName}${F.vPos?` (${F.vPos})`:""}`:"not verified on the day"}`);L.push("");
  L.push("Completed register attached (PDF).");L.push(`Sent from PARRON v${CONFIG.appVersion}`);return L.join("\n")}
function fuelHtml(d){const t=tabByNum(d.tab);const F=FU(d);const e=esc;
  const td='style="border:1px solid #D0D5DD;padding:5px 7px;font-size:13px;vertical-align:top"',th='style="border:1px solid #112B4E;background:#112B4E;color:#fff;padding:5px 7px;font-size:12px;text-align:left"';
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1B2430;max-width:960px">
  <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700;letter-spacing:.06em">PARRON | ${e(t.docNo)}</div><div style="font-size:18px;font-weight:700">Daily Fuel Usage / Hours / Pre-Start Register</div><div style="font-size:12px">${e(t.subtitle)}</div></div>
  <p style="font-size:13px"><b>Date:</b> ${fmtD(fuelDate(d))} &nbsp; <b>Recorded by:</b> ${e(d.details.inspector)}${F.position?` (${e(F.position)})`:""} &nbsp; <b>Completed:</b> ${e(F.pmAt||"-")} (end of day)</p>
  <table style="border-collapse:collapse;width:100%"><tr>${["Asset ID","Description","Pre-start","Hours basis","Hour meter start","Hour meter end","Hours","Flow meter (standpipe)","Fuel issued (L)","Comments / issues"].map(x=>`<th ${th}>${x}</th>`).join("")}</tr>
  ${fuelRows(d).map(r=>`<tr>${[r.id,r.desc,r.pre,r.basis,r.hs,r.he,r.hrs,r.flow,r.fuel,r.cmt].map((v,i)=>`<td ${td}>${i===2&&v==="N"?'<b style="color:#C62828">N</b>':e(v)}</td>`).join("")}</tr>`).join("")}
  <tr><td ${td} colspan="8" style="border:1px solid #D0D5DD;padding:5px 7px;text-align:right;font-weight:700">TOTAL FUEL USED (L)</td><td ${td}><b>${fuelTotal(d)}</b></td><td ${td}></td></tr></table>
  <p style="font-size:13px"><b>Verified by:</b> ${F.vName?`${e(F.vName)}${F.vPos?` (${e(F.vPos)})`:""}`:"not verified on the day"}</p>
  <p style="color:#5B6675;font-size:12px">Completed register attached (PDF). Sent from PARRON v${e(CONFIG.appVersion)}</p></div>`}
async function buildFuelPDF(d){const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4",orientation:"landscape"});const t=tabByNum(d.tab);const F=FU(d);
  const W=297,M=10;const NAVY=hex("#112B4E"),ORG=hex("#EC7723"),GREY=hex("#F2F4F7");
  const lp=doc.getImageProperties(LOGO);const lh=10,lw=lp.width*lh/lp.height;doc.addImage(LOGO,"PNG",M,8,lw,lh);
  doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(...NAVY);doc.text("DAILY FUEL USAGE/HOURS/PRE START REGISTER",W/2,14,{align:"center"});
  doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(60);doc.text(PDFSAFE(t.subtitle),W/2,19,{align:"center"});
  doc.setFontSize(7.5);doc.text(`Doc No: ${t.docNo}`,W-M,10,{align:"right"});doc.text(`Revision: ${t.rev}   Issued: ${t.issued}`,W-M,14,{align:"right"});doc.text(`Record No ${reportId(d)}`,W-M,18,{align:"right"});
  doc.setDrawColor(...ORG);doc.setLineWidth(.8);doc.line(M,22,W-M,22);doc.setLineWidth(.2);
  const sty={font:"helvetica",fontSize:8,cellPadding:1.6,lineColor:[200,206,214],lineWidth:.2,textColor:20,valign:"middle"};
  const sec=(txt,y)=>{doc.setFillColor(...NAVY);doc.rect(M,y,W-2*M,6,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.text(txt,M+2,y+4.2);return y+6};
  let y=sec("1. PROJECT & SHIFT DETAILS",25);
  const L={fontStyle:"bold",fillColor:GREY,textColor:NAVY};
  doc.autoTable({startY:y,margin:{left:M,right:M},theme:"grid",styles:sty,body:[[{content:"Project / Job No.",styles:L},"PWF – 1084",{content:"Date",styles:L},fmtD(fuelDate(d)),{content:"Site / Location",styles:L},"PWF",{content:"Recorded By",styles:L},PDFSAFE(d.details.inspector)]].map(r=>r.map(c=>typeof c==="string"?PDFSAFE(c):c))});
  y=doc.lastAutoTable.finalY+3;y=sec("2. FUEL USAGE, PLANT HOURS & PRE-START VERIFICATION",y);
  const rows=fuelRows(d);
  doc.autoTable({startY:y,margin:{left:M,right:M,bottom:14},theme:"grid",styles:sty,
    head:[["Asset ID","Description","Pre-start completed","Hours basis","Hour meter (start)","Hour meter (end)","Hours","Flow meter reading (standpipe)","Fuel issued (L)","Comments / issues"]],
    headStyles:{fillColor:NAVY,textColor:255,fontSize:7.2,halign:"center"},
    body:[...rows.map(r=>[r.id,r.desc,r.pre,r.basis,r.hs,r.he,r.hrs===""?"":String(r.hrs),r.flow,r.fuel===""?"":String(r.fuel),r.cmt].map(PDFSAFE)),
      [{content:"TOTAL FUEL USED (L)",colSpan:8,styles:{halign:"right",fontStyle:"bold",fillColor:GREY,textColor:NAVY}},{content:String(fuelTotal(d)),styles:{fontStyle:"bold",halign:"center"}},""]],
    columnStyles:{0:{cellWidth:20,fontStyle:"bold"},1:{cellWidth:40},2:{cellWidth:20,halign:"center"},3:{cellWidth:19,halign:"center"},4:{cellWidth:22,halign:"center"},5:{cellWidth:22,halign:"center"},6:{cellWidth:13,halign:"center"},7:{cellWidth:26,halign:"center"},8:{cellWidth:18,halign:"center"}},
    didParseCell:c=>{if(c.section==="body"&&c.column.index===2&&c.cell.raw==="N"){c.cell.styles.textColor=hex("#C62828");c.cell.styles.fontStyle="bold"}}});
  y=doc.lastAutoTable.finalY+3;if(y>160){doc.addPage();y=14}y=sec("3. VERIFICATION & SIGN-OFF",y);
  const sigCell=(img)=>c=>{};
  doc.autoTable({startY:y,margin:{left:M,right:M},theme:"grid",styles:{...sty,minCellHeight:8},
    head:[[{content:"COMPLETED BY – FUEL AND HOURS RECORDED ARE TRUE AND ACCURATE",colSpan:4},{content:"VERIFIED BY – SUPERVISOR / SITE REPRESENTATIVE",colSpan:4}],["Name","Position","Signature","Date","Name","Position","Signature","Date"]],
    headStyles:{fillColor:GREY,textColor:NAVY,fontSize:7.2},
    body:[[PDFSAFE(d.details.inspector),PDFSAFE(F.position||""),"",fmtD(fuelDate(d)),PDFSAFE(F.vName||""),PDFSAFE(F.vPos||""),"",F.vName||F.vSig?fmtD(fuelDate(d)):""]],
    didParseCell:c=>{if(c.section==="body")c.cell.styles.minCellHeight=16},
    didDrawCell:c=>{if(c.section!=="body")return;const img=c.column.index===2?d.signature:c.column.index===6?F.vSig:"";if(!img)return;const h=Math.min(c.cell.height-2,14);try{doc.addImage(img,"PNG",c.cell.x+1,c.cell.y+1,Math.min(h*2.6,c.cell.width-2),h)}catch(e){}}});
  y=doc.lastAutoTable.finalY+4;doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(80);
  doc.text(PDFSAFE(`Daily register completed ${F.pmAt||"-"} by ${d.details.inspector}  ·  Recorded in PARRON`),M,y);
  const ph=[];F.rows.forEach(r=>r.ph.forEach(p=>ph.push({img:p.img,cap:fuelLabel(r)})));
  if(ph.length){doc.addPage();y=14;doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(...NAVY);doc.text("PHOTOS",M,y);y+=4;
    const cols=4,gap=5,pw=(W-2*M-gap*(cols-1))/cols;let rh=0;
    ph.forEach((p,i)=>{const ip=doc.getImageProperties(p.img);const h=Math.min(pw*ip.height/ip.width,80);const c=i%cols;if(c===0&&i>0){y+=rh+9;rh=0}
      if(c===0&&y+h>195){doc.addPage();y=14}doc.addImage(p.img,"JPEG",M+c*(pw+gap),y,Math.min(h*ip.width/ip.height,pw),h);
      doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(60);doc.text(PDFSAFE(p.cap),M+c*(pw+gap),y+h+3.5,{maxWidth:pw});rh=Math.max(rh,h)})}
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor(110);
    doc.text("Genus Infrastructure Pty Ltd  |  Uncontrolled when printed",M,204);doc.text(`Retain completed register with daily site records  |  PARRON v${CONFIG.appVersion}  |  Page ${i} of ${n}`,W-M,204,{align:"right"})}
  PDFBLOB=doc.output("blob");return PDFBLOB}

/* ---------- Trade Assistants page ---------- */
async function viewTA(){const seq=ROUTE_SEQ;setHeader("Trade Assistants","Take 5 · daily register · loads · fire trailer",{icon:"back",aria:"Back",fn:()=>go("#inspect")});
  const drafts=await dbAll("drafts"),sent=await dbAll("sent");if(stale(seq))return;const today=todayISO();
  const fd=drafts.filter(x=>x.tab===28).sort((a,b)=>b.updated-a.updated);const fToday=fd.find(x=>fuelDate(x)===today);
  const fSent=sent.filter(s=>s.no==="28"&&new Date(s.sentAt).toDateString()===new Date().toDateString()).sort((a,b)=>b.sentAt-a.sentAt)[0];
  const tr=drafts.filter(x=>x.tab===22).sort((a,b)=>b.updated-a.updated)[0];const trSent=sent.filter(s=>s.no==="22").sort((a,b)=>b.sentAt-a.sentAt)[0];
  const F=fToday?FU(fToday):null;
  let h=`<div class="card tacard"><div class="tah"><span class="ti t-accent">${ic("fuel","l")}</span><div><b>Fuel, Hours &amp; Pre-Start Register</b><span>Today · ${new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}</span></div></div>
   <div class="muted" style="margin:8px 0 0">One entry a day – complete it at the end of the day (pre-starts, hour meters and fuel issued), then sign and send.</div>
   ${fSent&&!fToday?`<div class="alert green" style="margin:10px 0 0">${ic("circlecheck")}<div><b>Today's register has been sent</b> at ${new Date(fSent.sentAt).toLocaleTimeString("en-AU",{hour:"numeric",minute:"2-digit"})}.</div></div><button class="btn g w" onclick="startFuel(true)">Start another register</button>`
    :`<button class="btn o w" onclick="startFuel()">${F?`Continue today's register ${ic("arrow","s")}`:`${ic("plus","s")} Start today's register`}</button>`}
   ${fd.filter(x=>x!==fToday).length?`<div class="muted" style="margin-top:10px">${ic("alert","s")} ${fd.filter(x=>x!==fToday).length} unsent register(s) from an earlier day – <a href="#insp/${fd.filter(x=>x!==fToday)[0].id}">open</a></div>`:""}</div>
   <div class="card tap tacard" onclick="startInsp(T5_NUM)"><div class="tah"><span class="ti t-green">${ic("circlecheck","l")}</span><div><b>Take 5 – before you start a task</b><span>${(()=>{const n=sent.filter(s=>s.no===String(T5_NUM)&&new Date(s.sentAt).toDateString()===new Date().toDateString()).length;const dr=drafts.filter(x=>x.tab===T5_NUM).length;return `${n?`${n} sent today`:"None sent today"}${dr?` · ${dr} in progress`:""}`})()} · do a new one when the task or conditions change</span></div>${ic("chev")}</div></div>
   <div class="card tap tacard" onclick="startLoad()"><div class="tah"><span class="ti t-blue">${ic("truck","l")}</span><div><b>Load &amp; Unloading Truck Checklist</b><span>${(()=>{const n=sent.filter(s=>s.no===String(LU_NUM)&&new Date(s.sentAt).toDateString()===new Date().toDateString()).length;const dr=drafts.filter(x=>x.tab===LU_NUM).length;return `${n?`${n} sent today`:"None sent today"}${dr?` · ${dr} in progress`:""}`})()} · before each load or delivery – with a photo of the docket</span></div>${ic("chev")}</div></div>
   <div class="card tap tacard" onclick="startTrailer()"><div class="tah"><span class="ti t-red">${ic("flame","l")}</span><div><b>Firefighting Water Trailer – Weekly Pre-Start</b><span>${tr?`In progress · updated ${ago(new Date(tr.updated).toISOString())}`:trSent?`Last sent ${new Date(trSent.sentAt).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}`:"Weekly checks + daily fire danger log"}</span></div>${ic("chev")}</div></div>
   <div class="muted" style="margin:6px 4px">The register is emailed to Amie Smith (Project Admin) for the weekly client report. Photos are optional.</div>`;
  render(h)}
async function startFuel(another){if(!(ls("inspector")||"").trim()){const n=await askName();if(!n)return}
  const today=todayISO();const d0=(await dbAll("drafts")).filter(x=>x.tab===28&&fuelDate(x)===today).sort((a,b)=>b.updated-a.updated)[0];
  if(d0&&!another)return go("#insp/"+d0.id);
  const d=newDraft(28);d.details.location="PWF";FU(d);await save(d,true);queuePing(d,"draft");go("#insp/"+d.id)}
async function startTrailer(){const d0=(await dbAll("drafts")).filter(x=>x.tab===22).sort((a,b)=>b.updated-a.updated)[0];if(d0)return go("#insp/"+d0.id);startInsp(22)}
