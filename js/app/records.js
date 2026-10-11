"use strict";
/* ---------- discussion records (no ratings) ---------- */
function R(d){return d.rec=d.rec||{type:[],topics:[],other:"",summary:"",input:"",support:"",actions:[],photos:[],captions:"",fu:"",fuDate:"",raise:"",raiseReason:"",role:"",with:"",others:""}}
function viewRecord(d){const t=tabByNum(d.tab);const r=R(d);const D=d.details;const F=t.form;
  setHeader(`${pad(t.num)} · ${t.short}`,"Discussion record",backHome(d));
  const inp=(k,lab,req,ph)=>`<div><label class="f">${esc(lab)}${req?' <span class="req">*</span>':""}</label><input class="t" data-r="${k}" value="${esc(r[k]||"")}" ${ph?`placeholder="${esc(ph)}"`:""}></div>`;
  const ta=(k,lab,req,ph)=>`<label class="f">${esc(lab)}${req?' <span class="req">*</span>':""}</label><textarea class="t" rows="4" data-r="${k}" placeholder="${esc(ph||"")}">${esc(r[k]||"")}</textarea>`;
  let h=`<div class="band"><b>${esc(t.title)}</b>${esc(t.scope)}</div>`+voiceCardHTML("record");
  if(t.fixed)h+=`<div class="card"><div class="lock">${ic("lock","s")} Fixed</div><div class="fixed">${t.fixed.map(f=>`<div><small>${esc(f[0])}</small><span>${esc(f[1])}</span></div>`).join("")}</div></div>`;
  h+=`<div class="sec">1. Details</div><div class="card"><div class="grid2">
   <div><label class="f">Date & time</label><input class="t" type="datetime-local" data-d="datetime" value="${esc(D.datetime)}"></div>
   <div><label class="f">Location / work area</label><input class="t" data-d="location" value="${esc(D.location)}"></div>
   <div><label class="f">Recorded by <span class="req">*</span></label><input class="t" data-d="inspector" value="${esc(D.inspector)}"></div>
   ${inp("role","Role")}${inp("with","Discussion held with",1)}${inp("others","Others present")}</div></div>`;
  h+=`<div class="sec">2. Discussion type & topic</div><div class="card"><label class="f">Type <span class="req">*</span></label><div class="chips" id="ch-type">${chipsHTML(d,"type")}</div>
   <label class="f" style="margin-top:12px">Topic area(s) <span class="req">*</span></label><div class="chips" id="ch-topics">${chipsHTML(d,"topics")}</div>
   <div style="margin-top:8px">${inp("other","Other topic","","Optional")}</div></div>`;
  h+=`<div class="sec">3. Discussion record</div><div class="card">${ta("summary","Summary of discussion",1,"What was discussed")}${ta("input","Their input / feedback","","What they raised, asked or said")}${ta("support","Support needed / concerns noted","","")}</div>`;
  h+=`<div class="sec">4. Actions</div><div class="card"><div id="recact">${recActHTML(d)}</div><button class="addph" style="margin-top:8px" onclick="recAddAct()">+ Add action</button></div>`;
  h+=`<div class="sec">5. Photos (optional)</div><div class="card"><div id="recph">${recPhHTML(d)}</div>${ta("captions","Photo caption(s)","","Optional")}</div>`;
  h+=`<div class="sec">6. Follow-up</div><div class="card" id="recfu">${recFuHTML(d)}</div>`;
  render(h);
  document.querySelectorAll("[data-d]").forEach(el=>el.addEventListener("input",()=>{d.details[el.dataset.d]=el.value;if(el.dataset.d==="inspector"&&!ls("inspector"))ls("inspector",el.value.trim());save(d)}));
  bindRec(d);renderBar(d)}
function bindRec(d){document.querySelectorAll("[data-r]").forEach(el=>{if(el._b)return;el._b=1;el.addEventListener("input",()=>{R(d)[el.dataset.r]=el.value;save(d);renderBar(d)})})}
function chipsHTML(d,key){const t=tabByNum(d.tab);const list=t.form[key==="type"?"types":key];const sel=R(d)[key];return list.map((x,i)=>`<button class="chip ${sel.includes(x)?"on":""}" onclick="recTog('${key}',${i})">${esc(x)}</button>`).join("")}
function recTog(key,i){const t=tabByNum(CUR.tab);const v=t.form[key==="type"?"types":key][i];const a=R(CUR)[key];const k=a.indexOf(v);k>=0?a.splice(k,1):a.push(v);save(CUR);$("#ch-"+key).innerHTML=chipsHTML(CUR,key);renderBar(CUR)}
function recActHTML(d){const a=R(d).actions;if(!a.length)return `<div class="muted">No actions yet.</div>`;
  return a.map((x,i)=>`<div class="q" style="padding:10px"><label class="f">Action ${i+1}</label><textarea class="t" rows="2" oninput="recSetAct(${i},'a',this.value)">${esc(x.a||"")}</textarea>
   <div class="grid2"><div><label class="f">Owner</label><input class="t" value="${esc(x.o||"")}" oninput="recSetAct(${i},'o',this.value)"></div><div><label class="f">Due date</label><input class="t" type="date" value="${esc(x.due||"")}" oninput="recSetAct(${i},'due',this.value)"></div></div>
   <div class="row" style="display:flex;gap:10px;align-items:center;margin-top:8px"><label style="display:flex;gap:6px;align-items:center;font-weight:700"><input type="checkbox" ${x.closed?"checked":""} onchange="recSetAct(${i},'closed',this.checked)"> Closed ✓</label><button class="linkbtn" onclick="recDelAct(${i})">Remove</button></div></div>`).join("")}
function recAddAct(){R(CUR).actions.push({a:"",o:"",due:"",closed:false});save(CUR);$("#recact").innerHTML=recActHTML(CUR)}
function recSetAct(i,k,v){R(CUR).actions[i][k]=v;save(CUR);renderBar(CUR)}
async function recDelAct(i){if(!await ask2("Remove this action?","It is removed from this record.","Remove",true))return;R(CUR).actions.splice(i,1);save(CUR);$("#recact").innerHTML=recActHTML(CUR)}
function recPhHTML(d){const p=R(d).photos;return `${p.length?`<div class="photos">${p.map((u,i)=>`<div class="ph"><img src="${u}" onclick="zoomImg(this.src)"><button onclick="recDelPh(${i})" aria-label="Remove">×</button></div>`).join("")}</div>`:""}
  <div class="pbtns" style="margin-top:6px"><label class="addph">${ic("camera","s")} Take photo<input type="file" accept="image/*" capture="environment" class="hide" onchange="recAddPh(this,'camera')"></label><label class="addph">${ic("image","s")} Upload<input type="file" accept="image/*" class="hide" onchange="recAddPh(this,'upload')"></label></div>`}
function recAddPh(inp,src){const f=inp.files&&inp.files[0];if(!f)return;const d=CUR;const r=R(d);
  stampPhoto(f,[["Discussion record",r.with?"with "+r.with:"",d.details.inspector].filter(Boolean).join("  ·  "),d.details.location||""],{source:src,max:1280})
   .then(ph=>{r.photos.push(ph.img);save(d);$("#recph").innerHTML=recPhHTML(d)}).catch(()=>toast("Could not read that photo"))}
async function recDelPh(i){if(!await ask2("Remove this photo?","It is removed from this record.","Remove",true))return;R(CUR).photos.splice(i,1);save(CUR);$("#recph").innerHTML=recPhHTML(CUR)}
function recFuHTML(d){const r=R(d);const seg=(k,v,l)=>`<button class="${r[k]===v?"on":""}" onclick="recSet('${k}','${v}')">${l}</button>`;
  return `<label class="f">Follow-up required? <span class="req">*</span></label><div class="seg">${seg("fu","No","No")}${seg("fu","Yes","Yes")}</div>
   ${r.fu==="Yes"?`<label class="f">Follow-up date <span class="req">*</span></label><input class="t" type="date" data-r="fuDate" value="${esc(r.fuDate||"")}">`:""}
   <label class="f" style="margin-top:12px">Raise with Sponsor / Manager? <span class="req">*</span></label><div class="seg">${seg("raise","No","No")}${seg("raise","Yes","Yes")}</div>
   ${r.raise==="Yes"?`<label class="f">Reason <span class="req">*</span></label><textarea class="t" rows="2" data-r="raiseReason">${esc(r.raiseReason||"")}</textarea>`:""}`}
function recSet(k,v){R(CUR)[k]=v;save(CUR);$("#recfu").innerHTML=recFuHTML(CUR);bindRec(CUR);renderBar(CUR)}
function recProblems(d){const r=R(d);const p=[];
  if(!d.details.inspector.trim())p.push("Recorded by");if(!(r.with||"").trim())p.push("Discussion held with");
  if(!r.type.length)p.push("Discussion type");if(!r.topics.length&&!(r.other||"").trim())p.push("Topic area(s)");
  if(!(r.summary||"").trim())p.push("Summary of discussion");
  r.actions.forEach((a,i)=>{if((a.a||"").trim()&&!(a.o||"").trim())p.push(`Action ${i+1} needs an owner`);if(!(a.a||"").trim()&&((a.o||"")||(a.due||"")))p.push(`Action ${i+1} needs a description`)});
  if(!r.fu)p.push("Follow-up required? (Yes / No)");else if(r.fu==="Yes"&&!r.fuDate)p.push("Follow-up date");
  if(!r.raise)p.push("Raise with Sponsor / Manager? (Yes / No)");else if(r.raise==="Yes"&&!(r.raiseReason||"").trim())p.push("Reason for raising with Sponsor / Manager");
  return p}
function recActions(d){return R(d).actions.filter(a=>(a.a||"").trim())}
function recRows(d){const r=R(d);const D=d.details;return [["Record No",reportId(d)],["Date & time",fmtDT(D.datetime)],["Location / work area",D.location||"-"],["Project",(tabByNum(d.tab).fixed||[[0,""]])[0][1]],
  ["Recorded by",D.inspector],["Role",r.role||"-"],["Discussion held with",r.with],["Others present",r.others||"-"],
  ...(voiceRow(d)?[voiceRow(d)]:[]),["Type",r.type.join(", ")],["Topic area(s)",[...r.topics,...((r.other||"").trim()?["Other: "+r.other.trim()]:[])].join(", ")]]}
function recBodyText(d){const r=R(d);const L=[];const t=tabByNum(d.tab);const HR="━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  L.push("PARRON | DISCUSSION RECORD");L.push(t.title.replace(/^\d+\s–\s/,""));L.push(HR);L.push("");
  recRows(d).forEach(x=>L.push(`• ${x[0]}: ${x[1]}`));L.push("");
  L.push("SUMMARY OF DISCUSSION");L.push(r.summary||"-");L.push("");
  if((r.input||"").trim()){L.push("THEIR INPUT / FEEDBACK");L.push(r.input);L.push("")}
  if((r.support||"").trim()){L.push("SUPPORT NEEDED / CONCERNS NOTED");L.push(r.support);L.push("")}
  const A=recActions(d);L.push(`ACTIONS (${A.length})`);A.forEach((a,i)=>L.push(`${i+1}. ${a.a}  |  Owner: ${a.o||"-"}  |  Due: ${a.due?fmtD(a.due):"-"}  |  ${a.closed?"CLOSED":"OPEN"}`));if(!A.length)L.push("None");L.push("");
  L.push(`FOLLOW-UP: ${r.fu}${r.fu==="Yes"?` – ${fmtD(r.fuDate)}`:""}`);L.push(`RAISE WITH SPONSOR / MANAGER: ${r.raise}${r.raise==="Yes"?` – ${r.raiseReason}`:""}`);
  if(r.photos.length)L.push(`Photos: ${r.photos.length} (in PDF)`);
  L.push("");L.push("Completed record attached (PDF).");L.push(`Sent from PARRON v${CONFIG.appVersion} – Proactive Assessment, Reporting, Risk & Observation Network`);return L.join("\n")}
function recHtml(d){const r=R(d);const t=tabByNum(d.tab);const e=esc;
  const td='style="border:1px solid #D0D5DD;padding:6px 8px;vertical-align:top;font-size:13px"',tl='style="border:1px solid #D0D5DD;padding:6px 8px;vertical-align:top;font-size:13px;background:#F2F4F7;font-weight:700;color:#112B4E;width:200px"',th='style="border:1px solid #112B4E;background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const blk=(tt,v)=>v&&String(v).trim()?`<h3 style="color:#112B4E;margin:14px 0 4px">${e(tt)}</h3><div style="white-space:pre-wrap;font-size:13px">${e(v)}</div>`:"";
  const A=recActions(d);
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1B2430;max-width:860px">
  <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700;letter-spacing:.06em">PARRON | DISCUSSION RECORD</div><div style="font-size:18px;font-weight:700">${e(t.title)}</div></div>
  <table style="border-collapse:collapse;margin:12px 0;width:100%">${recRows(d).map(x=>`<tr><td ${tl}>${e(x[0])}</td><td ${td}>${e(x[1])}</td></tr>`).join("")}</table>
  ${blk("Summary of discussion",r.summary)}${blk("Their input / feedback",r.input)}${blk("Support needed / concerns noted",r.support)}
  <h3 style="color:#112B4E;margin:14px 0 4px">Actions (${A.length})</h3>${A.length?`<table style="border-collapse:collapse;width:100%"><tr><th ${th}>#</th><th ${th}>Action</th><th ${th}>Owner</th><th ${th}>Due</th><th ${th}>Status</th></tr>${A.map((a,i)=>`<tr><td ${td}>${i+1}</td><td ${td}>${e(a.a)}</td><td ${td}>${e(a.o||"-")}</td><td ${td}>${a.due?fmtD(a.due):"-"}</td><td ${td}><b style="color:${a.closed?"#2E7D32":"#C62828"}">${a.closed?"CLOSED":"OPEN"}</b></td></tr>`).join("")}</table>`:`<div style="font-size:13px">None</div>`}
  <table style="border-collapse:collapse;margin:12px 0;width:100%"><tr><td ${tl}>Follow-up required?</td><td ${td}>${e(r.fu)}${r.fu==="Yes"?" – "+fmtD(r.fuDate):""}</td></tr><tr><td ${tl}>Raise with Sponsor / Manager?</td><td ${td}>${e(r.raise)}${r.raise==="Yes"?" – "+e(r.raiseReason):""}</td></tr>${r.photos.length?`<tr><td ${tl}>Photos</td><td ${td}>${r.photos.length} (in PDF)</td></tr>`:""}</table>
  <p style="color:#5B6675;font-size:12px">Completed record attached (PDF). Sent from PARRON v${e(CONFIG.appVersion)}</p></div>`}
async function buildRecordPDF(d){const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});const t=tabByNum(d.tab);const r=R(d);const D=d.details;
  const W=210,M=12;const NAVY=hex("#112B4E"),ORG=hex("#EC7723"),GREY=hex("#F2F4F7");const docId=`${CONFIG.docPrefix}-${pad(t.num)}`;
  const lp=doc.getImageProperties(LOGO);const lh=11,lw=lp.width*lh/lp.height;doc.addImage(LOGO,"PNG",M,10,lw,lh);
  doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...ORG);doc.text("DISCUSSION RECORD",W-M,12,{align:"right"});
  doc.setFontSize(13);doc.setTextColor(...NAVY);doc.text(PDFSAFE(t.title),W-M,18,{align:"right"});
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(90);doc.text(`${docId}  |  Rev A  |  Record No ${reportId(d)}`,W-M,22.5,{align:"right"});
  doc.setFillColor(...NAVY);doc.rect(M,25,W-2*M,6.5,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(PDFSAFE(CONFIG.project),M+2,29.3);
  let y=34;const sty={font:"helvetica",fontSize:8.2,cellPadding:1.8,lineColor:[200,206,214],lineWidth:.2,textColor:20,valign:"top"};
  const sec=txt=>{if(y>262){doc.addPage();y=16}doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...NAVY);doc.text(txt,M,y+4);doc.setDrawColor(...ORG);doc.setLineWidth(.6);doc.line(M,y+5.5,W-M,y+5.5);doc.setLineWidth(.2);y+=8};
  const kv=rows=>{doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",body:rows.map(x=>x.map(PDFSAFE)),styles:sty,columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:52}}});y=doc.lastAutoTable.finalY+4};
  sec("1. DETAILS");kv(recRows(d).filter(x=>!/^(Type|Topic)/.test(x[0])));
  sec("2. DISCUSSION TYPE & TOPIC");kv(recRows(d).filter(x=>/^(Type|Topic)/.test(x[0])));
  sec("3. DISCUSSION RECORD");kv([["Summary of discussion",r.summary||"-"],["Their input / feedback (what they raised, asked or said)",r.input||"-"],["Support needed / concerns noted",r.support||"-"]]);
  sec("4. ACTIONS");const A=recActions(d);
  doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",head:[["#","Action","Owner","Due date","Closed"]],
    body:A.length?A.map((a,i)=>[i+1,PDFSAFE(a.a),PDFSAFE(a.o||"-"),a.due?fmtD(a.due):"-",a.closed?"Yes":"No"]):[[{content:"No actions recorded.",colSpan:5}]],
    styles:sty,headStyles:{fillColor:NAVY,textColor:255},columnStyles:{0:{cellWidth:8},2:{cellWidth:38},3:{cellWidth:22},4:{cellWidth:16,halign:"center"}}});y=doc.lastAutoTable.finalY+4;
  sec("5. PHOTOS (OPTIONAL)");kv([["Photos attached?",r.photos.length?`Yes – ${r.photos.length}`:"No"],["Photo caption(s)",r.captions||"-"]]);
  if(r.photos.length){const pw=(W-2*M-2*4)/3;let rh=0;r.photos.forEach((p,i)=>{const ip=doc.getImageProperties(p);const phh=Math.min(pw*ip.height/ip.width,70);const col=i%3;
      if(col===0&&i>0){y+=rh+6;rh=0}if(col===0&&y+phh>280){doc.addPage();y=16}doc.addImage(p,"JPEG",M+col*(pw+4),y,Math.min(phh*ip.width/ip.height,pw),phh);rh=Math.max(rh,phh)});y+=rh+6}
  sec("6. FOLLOW-UP");kv([["Follow-up required?",r.fu+(r.fu==="Yes"?` – Date: ${fmtD(r.fuDate)}`:"")],["Raise with Sponsor / Manager?",r.raise+(r.raise==="Yes"?` – Reason: ${r.raiseReason}`:"")]]);
  if(y>235){doc.addPage();y=16}sec("SIGN-OFF");
  doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(60);doc.text(PDFSAFE(t.form.declaration),M,y+2);y+=5;
  doc.autoTable({startY:y,margin:{left:M,right:M},theme:"grid",styles:{...sty,minCellHeight:9},columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:52}},
    body:[["Recorded by",PDFSAFE(D.inspector)],["Signature",""],["Date",fmtDT(D.datetime)]],
    didDrawCell:c=>{if(c.section==="body"&&c.row.index===1&&c.column.index===1&&d.signature){const h=Math.min(c.cell.height-2,14);try{doc.addImage(d.signature,"PNG",c.cell.x+2,c.cell.y+1,h*2.6,h)}catch(e){}}},
    didParseCell:c=>{if(c.section==="body"&&c.row.index===1)c.cell.styles.minCellHeight=16}});
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor(110);
    doc.text(`${docId}  |  Rev A  |  ${reportId(d)}`,M,290);doc.text(`PARRON v${CONFIG.appVersion}  |  Uncontrolled when printed  |  Page ${i} of ${n}`,W-M,290,{align:"right"})}
  PDFBLOB=doc.output("blob");return PDFBLOB}
