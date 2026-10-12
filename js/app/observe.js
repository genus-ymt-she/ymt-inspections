"use strict";
/* ---------- Quick report: hazard or positive observation (30-second form) ----------
   Hazards are risk-rated with the Genus matrix and go onto the action register (with an email to the
   responsible person). Positive observations are logged as a lead indicator. Both work offline (Outbox). */
let OBS=null;
function newObs(type){return {type,location:"",description:"",immediate:"",fixed:null,action:"",owner:"",ownerEmail:"",due:"",cons:0,like:0,category:"",recognised:"",photos:[],at:Date.now()}}
async function viewReport(type){if(!(ls("inspector")||"").trim()){const n=await askName();if(!n){go("#home");return}}
  if(!OBS||OBS.type!==type)OBS=newObs(type==="positive"?"positive":"hazard");
  const H=OBS.type==="hazard";
  setHeader(H?"Report a hazard":"Positive observation",H?"Quick report – goes to the SHE Manager":"Recognise good safety practice",{icon:"back",aria:"Back",fn:()=>{go("#home")}});
  drawReport()}
function drawReport(){const o=OBS;const H=o.type==="hazard";const k=riskOf(o.cons,o.like);
  const scale=(f,list)=>`<div class="rscale" role="group">${list.map(([v,l])=>`<button class="${+o[f]===v?"on":""}" aria-pressed="${+o[f]===v}" onclick="obsSet('${f}',${v},1)">${esc(l)}</button>`).join("")}</div>`;
  let h=`<div class="seg" style="margin-bottom:14px" role="group" aria-label="Report type"><button class="${H?"on":""}" onclick="obsType('hazard')">${ic("alert","s")} Hazard</button><button class="${!H?"on":""}" onclick="obsType('positive')">${ic("star","s")} Positive</button></div>`;
  h+=`<div class="card"><label class="f">Location / work front <span class="req">*</span></label><input class="t" id="obLoc" value="${esc(o.location)}" oninput="OBS.location=this.value" placeholder="e.g. Cowalla Road entry">
   <label class="f">${H?"What is the hazard?":"What was done well?"} <span class="req">*</span></label><textarea class="t" oninput="OBS.description=this.value" placeholder="${H?"What could cause harm – what, where, who":"Describe the good practice you saw"}">${esc(o.description)}</textarea>
   <label class="f">Photos <span class="muted">· recommended</span></label><div id="obPh">${obsPhotos()}</div></div>`;
  if(H){h+=`<div class="riskbox"><div class="rh"><b>${ic("gauge","s")} Risk rating <span class="req">*</span></b>${riskChip(o.cons,o.like)}</div>
     <div class="rlab">Consequence – worst credible outcome</div>${scale("cons",RISK.consequence)}<div class="rlab">Likelihood</div>${scale("like",RISK.likelihood)}
     ${k?`<div class="rresp" style="color:var(--ink)">${ic("info","s")} ${esc(k.response)}</div>`:""}<button class="linkbtn" onclick="showMatrix(${+o.cons||0},${+o.like||0})">${ic("layers","s")} View risk matrix</button></div>
    <div class="card" style="margin-top:10px"><label class="f">Immediate action taken <span class="muted">· optional</span></label><textarea class="t" oninput="OBS.immediate=this.value" placeholder="e.g. Area barricaded, supervisor told">${esc(o.immediate)}</textarea>
     <label class="f">Fixed on the spot? <span class="req">*</span></label><div class="seg"><button class="${o.fixed===true?"on":""}" onclick="obsSet('fixed',true,1)">Yes – fixed</button><button class="${o.fixed===false?"on":""}" onclick="obsSet('fixed',false,1)">No – needs action</button></div>
     ${o.fixed===false?`<label class="f">Action required <span class="req">*</span></label><textarea class="t" oninput="OBS.action=this.value" placeholder="What needs to be done">${esc(o.action)}</textarea>
      ${personPicker("obs",o.owner,o.ownerEmail,"obsOwner")}<label class="f">Due date${k?` <span class="muted">· ${esc(k.level)}: ${k.days<1?"immediate":k.days+" days"}</span>`:""}</label><input class="t" type="date" value="${esc(o.due)}" oninput="OBS.due=this.value">`:""}</div>`;
    if(k&&(k.level==="Critical"))h+=`<div class="alert red">${ic("alert")}<div><b>Critical risk.</b> Stop the activity and make the area safe. The SHE Manager is alerted as soon as this is sent.</div></div>`}
  else h+=`<div class="card"><label class="f">Person or crew recognised <span class="muted">· optional</span></label><input class="t" list="teamnames2" value="${esc(o.recognised)}" oninput="OBS.recognised=this.value" placeholder="e.g. Civil crew A, Joe Bloggs"><datalist id="teamnames2">${TEAM.map(p=>`<option value="${esc(p.name)}">`).join("")}</datalist>
    <label class="f">Category</label><div class="chips">${OBS_CATEGORIES.map(c=>`<button class="chip ${o.category===c?"on":""}" onclick="obsSet('category',OBS.category===${JSON.stringify(c).replace(/"/g,"&quot;")}?'':${JSON.stringify(c).replace(/"/g,"&quot;")},1)">${esc(c)}</button>`).join("")}</div></div>`;
  h+=`<button class="btn o w" style="margin-top:14px" onclick="sendObs()">${ic("send","s")} Send ${H?"hazard report":"observation"}</button>
   <p class="muted" style="text-align:center">Goes straight to the SHE Manager. No signal? It waits in the Outbox and sends automatically.</p>`;
  render(h)}
function obsType(t){if(OBS.type===t)return;const keep={location:OBS.location,description:OBS.description,photos:OBS.photos};OBS=Object.assign(newObs(t),keep);location.replace("#report/"+t);drawReport()}
function obsSet(f,v,redraw){OBS[f]=v;if((f==="cons"||f==="like"||f==="fixed")&&OBS.fixed===false&&!OBS.due){const k=riskOf(OBS.cons,OBS.like);if(k)OBS.due=addDaysISO(k.days)}if(redraw)drawReport()}
function obsOwner(uid,name,email,redraw){OBS.owner=name;OBS.ownerEmail=email;if(redraw)drawReport()}
function obsPhotos(){return `${OBS.photos.length?`<div class="photos">${OBS.photos.map((p,i)=>`<div class="ph"><img src="${p}" onclick="zoomImg(this.src)" alt="Photo ${i+1}"><button onclick="OBS.photos.splice(${i},1);document.getElementById('obPh').innerHTML=obsPhotos()" aria-label="Remove photo">${ic("x")}</button></div>`).join("")}</div>`:""}
  ${OBS.photos.length<6?`<div class="pbtns" style="margin-top:8px"><label class="addph">${ic("camera","s")} Take photo<input type="file" accept="image/*" capture="environment" class="hide" onchange="obsPhoto(this,'camera')"></label><label class="addph">${ic("image","s")} Upload<input type="file" accept="image/*" class="hide" onchange="obsPhoto(this,'upload')"></label></div>`:""}`}
async function obsPhoto(inp,src){const f=inp.files&&inp.files[0];if(!f)return;try{const ph=await stampPhoto(f,[[OBS.type==="hazard"?"Hazard report":"Positive observation",ls("inspector")].filter(Boolean).join("  ·  "),OBS.location||""],{source:src,max:1280});OBS.photos.push(ph.img);document.getElementById("obPh").innerHTML=obsPhotos()}catch(e){toast("Could not read that photo")}}
function obsProblems(o){const p=[];if(!o.location.trim())p.push("Location");if(!o.description.trim())p.push(o.type==="hazard"?"What the hazard is":"What was done well");
  if(o.type==="hazard"){if(!riskOf(o.cons,o.like))p.push("Risk rating");if(o.fixed===null)p.push("Fixed on the spot? (Yes / No)");if(o.fixed===false&&!o.action.trim())p.push("Action required");
    if(o.fixed===false&&o.ownerEmail&&!emailOK(o.ownerEmail))p.push("Responsible person email looks wrong")}return p}
function obsHtml(o,k,rid,me){const e=esc;const H=o.type==="hazard";const row=(a,b)=>b?`<tr><td style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px;background:#F2F4F7;font-weight:700;color:#112B4E;width:170px">${e(a)}</td><td style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px">${e(b)}</td></tr>`:"";
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1B2430;max-width:720px"><div style="background:${H?"#112B4E":"#1E8E3E"};color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:${H?"#EC7723":"#E6F4EA"};font-weight:700;letter-spacing:.06em">PARRON | ${H?"HAZARD REPORT":"POSITIVE OBSERVATION"}</div><div style="font-size:18px;font-weight:700">${e(o.location)}</div></div>
   <table style="border-collapse:collapse;margin:12px 0;width:100%">${row("Report ID",rid)}${row("Reported by",me)}${row("Date / time",fmtDT(new Date()))}${row(H?"Hazard":"What was done well",o.description)}
   ${H?row("Risk",k?riskText(k):"")+row("Immediate action",o.immediate)+row("Status",o.fixed?"Fixed on the spot":"OPEN – action required")+(o.fixed?"":row("Action required",o.action)+row("Responsible",o.owner?o.owner+(o.ownerEmail?` (${o.ownerEmail})`:""):"TBC")+row("Due",o.due?fmtD(o.due):"TBC")):row("Recognised",o.recognised)+row("Category",o.category)}</table>
   <p style="font-size:13px">${o.photos.length?`${o.photos.length} photo(s) attached.`:"No photos."}${H&&!o.fixed?" The action is on the PARRON Action register.":""}</p><p style="color:#5B6675;font-size:12px">Sent from PARRON v${e(CONFIG.appVersion)}</p></div>`}
async function sendObs(){const o=OBS;const p=obsProblems(o);if(p.length){toast("Still needed: "+p.join(", "),5000);return}
  const me=ls("inspector")||"";const H=o.type==="hazard";const k=H?riskOf(o.cons,o.like):null;const d=new Date();
  const rid=`YMT-${H?"HZ":"PO"}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}-${initials(me)}`;
  const uid="o"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);const title=H?"Hazard report":"Positive observation";
  const findings=H?[{fid:`${rid}|${H?"HZ":"PO"}`,item:"HZ",text:o.description.trim(),rating:k.level==="Critical"?"UA":"NI",snn:"",cons:o.cons,like:o.like,score:k.score,level:k.level,finding:o.description.trim(),
    action:o.fixed?(o.immediate||"Fixed on the spot"):o.action.trim(),status:o.fixed?"spot":"open",owner:o.fixed?"":o.owner,ownerEmail:o.fixed?"":String(o.ownerEmail||"").toLowerCase(),due:o.fixed?"":o.due,taken:o.immediate||"Fixed on the spot"}]:[];
  if(H&&!o.fixed)rememberContact(o.owner,o.ownerEmail);
  const report={inspDate:nowLocal(),crew:"",supervisor:""};const sup=TEAM.find(x=>nameKey(x.name)===nameKey(o.owner));
  const subject=H?`YMT Hazard report | ${o.location} | ${k.level} ${k.score}${o.fixed?" | fixed":" | OPEN"}`:`YMT Positive observation | ${o.location}${o.recognised?" | "+o.recognised:""}`;
  const text=[`PARRON | ${title.toUpperCase()}`,`Report ID: ${rid}`,`By: ${me}`,`Location: ${o.location}`,`${H?"Hazard":"What was done well"}: ${o.description}`,...(H?[`Risk: ${riskText(k)}`,o.immediate?`Immediate action: ${o.immediate}`:"",o.fixed?"Status: fixed on the spot":`Status: OPEN – ${o.action} – ${o.owner||"TBC"} – due ${o.due?fmtD(o.due):"TBC"}`]:[o.recognised?`Recognised: ${o.recognised}`:"",o.category?`Category: ${o.category}`:""])].filter(Boolean).join("\n");
  const item={id:uid,queuedAt:Date.now(),tries:0,title,reportId:rid,location:o.location,ua:findings.filter(f=>f.rating==="UA").length,ni:findings.filter(f=>f.rating==="NI").length,snn:0,no:H?"HZ":"PO",inspector:me,findings,report,obsType:o.type,
    payload:{action:"observation",uid,reportId:rid,to:recipient(),subject,text,html:obsHtml(o,k,rid,me),meta:{name:me,no:H?"HZ":"PO",title,location:o.location,started:new Date(o.at).toISOString()},
      obs:{type:o.type,description:o.description.trim(),immediate:o.immediate,category:o.category,recognised:o.recognised},photos:o.photos.map(x=>x.split(",")[1]),findings,report,alert:{supervisorEmail:sup?sup.email:""}}};
  await dbPut("outbox",item);OBS=null;toast("Sending…",1500);
  const r=await sendItem(item);if(r.ok)celebrate(H?"Hazard report sent":"Observation sent",H?"The SHE Manager has been told":"Thanks for recognising good work");else toast("No connection – saved in the Outbox and will send automatically",5000);go("#home")}
