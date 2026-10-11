"use strict";
/* ---------- inspection form ---------- */
function backHome(d){return {icon:"back",label:"Save",aria:"Save and go home",fn:()=>{save(d,true);queuePing(d,"draft");toast("Saved on this phone");go("#home")}}}
function viewInsp(d){const t=tabByNum(d.tab);if(t.kind==="record")return viewRecord(d);setHeader(`${pad(t.num)} · ${t.short}`,"Site inspection",backHome(d));
  const D=d.details;const hide=t.hideStd||[];let h=`<div class="band"><b>${esc(t.title)}</b>${esc(t.scope)}</div>`+voiceCardHTML("insp")+keyHTML();
  if(t.fixed)h+=`<div class="card"><div class="lock">${ic("lock","s")} Inspection details (fixed)</div><div class="fixed">${t.fixed.map(f=>`<div><small>${esc(f[0])}</small><span>${esc(f[1])}</span></div>`).join("")}</div></div>`;
  if(t.lockLocation&&D.location!==t.lockLocation){D.location=t.lockLocation;save(d)}
  h+=`<div class="sec">Details</div><div class="card"><div class="grid2">
   <div><label class="f">Inspection location / work front <span class="req">*</span></label><input class="t" data-d="location" value="${esc(D.location)}" ${t.lockLocation?"readonly":""} placeholder="e.g. Laydown area 2"></div>
   <div><label class="f">Date & time</label><input class="t" type="datetime-local" data-d="datetime" value="${esc(D.datetime)}"></div>
   ${hide.includes("crew")?"":`<div><label class="f">Contractor / crew</label><input class="t" data-d="crew" value="${esc(D.crew)}"></div>`}
   <div><label class="f">Inspector name <span class="req">*</span></label><input class="t" data-d="inspector" value="${esc(D.inspector)}" autocomplete="name"></div>
   ${hide.includes("supervisor")?"":`<div><label class="f">Supervisor / person in charge</label><input class="t" data-d="supervisor" value="${esc(D.supervisor)}"></div>`}`;
  (t.extra||[]).forEach(l=>{const ty=(t.extraTypes||{})[l];h+=`<div><label class="f">${esc(l.replace(/:$/,""))}</label><input class="t" ${ty?`type="${ty}"`:""} ${ty==="number"?'inputmode="numeric"':""} data-x="${esc(l)}" value="${esc(D.extra[l]||"")}"></div>`});
  h+=`</div></div>`;
  if(t.checks){const C=t.checks;D.checks=D.checks||{};
    h+=`<div class="sec">${esc(C.title)}</div><div class="card"><div class="muted" style="margin-bottom:10px">${esc(C.intro)}</div><div class="chk">${C.cols.map((col,c)=>`<div><h3>${esc(col)}</h3>${C.rows.map((row,r)=>`<label class="f">${esc(row)}${r<2?' <span class="req">*</span>':""}</label><input class="t" ${r===0?'type="time"':""} data-c="${c}|${r}" value="${esc(D.checks[c+"|"+r]||"")}">`).join("")}<div class="cph" id="cph-${c}">${cphHTML(d,c)}</div></div>`).join("")}</div>
    <div class="muted" style="margin-top:10px">Each check needs the time, who inspected it and <b>${(C.photos||[]).length} photos</b> taken from the vehicle looking down the middle of the road, so the signs on both sides are visible. The date and time are stamped onto every photo when it is taken. Complete the AM check at pre-start and the PM check before leaving site, then send.</div></div>`}
  if(t.log){const L=t.log;D.log=D.log||{};if(LOGDAY===null)LOGDAY=(new Date().getDay()+6)%7;
    h+=`<div class="sec">${esc(L.title)}</div><div class="card" id="logcard">${logHTML(d)}</div>`}
  if(t.refTable){const T=t.refTable;h+=`<div class="card"><div class="lock">${esc(T.title)}</div><div style="overflow-x:auto"><table class="reftbl"><tr>${T.head.map(x=>`<th>${esc(x)}</th>`).join("")}</tr>${T.rows.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</table></div>${T.foot?`<div class="muted" style="margin-top:8px">${esc(T.foot)}</div>`:""}</div>`}
  if(t.note)h+=`<div class="alert org">${ic("alert")}<div>${esc(t.note)}</div></div>`;
  if(t.image)h+=`<div class="card tgs"><div class="lock">${esc(t.imageTitle||"Reference")}</div><img src="${t.image}" alt="${esc(t.imageTitle||"")}" onclick="zoomImg(this.src,true)"><div class="muted" style="margin-top:6px">Tap the plan to enlarge.</div></div>`;
  t.sections.forEach(s=>{h+=`<div class="sec">${esc(s.name)}</div>`;s.q.forEach(q=>{h+=qHTML(d,q)})});
  h+=`<div class="sec">Other hazards identified</div><div id="others"></div>
  <button class="addph" style="width:100%" onclick="addOther()">${ic("plus","s")} Add a hazard not covered above</button>`;
  render(h);renderOthers();
  document.querySelectorAll("[data-d]").forEach(el=>el.addEventListener("input",()=>{d.details[el.dataset.d]=el.value;if(el.dataset.d==="inspector"&&!ls("inspector"))ls("inspector",el.value.trim());save(d)}));
  document.querySelectorAll("[data-x]").forEach(el=>el.addEventListener("input",()=>{d.details.extra[el.dataset.x]=el.value;save(d)}));
  document.querySelectorAll("[data-c]").forEach(el=>el.addEventListener("input",()=>{(d.details.checks=d.details.checks||{})[el.dataset.c]=el.value;save(d)}));
  renderBar(d)}
function zoomImg(src,wide){const z=document.createElement("div");z.className="zoom"+(wide?" wide":"");z.innerHTML=`<div class="zb"><button class="btn s g" onclick="this.closest('.zoom').classList.toggle('wide')">Zoom</button><button class="btn s" onclick="this.closest('.zoom').remove()">${ic("x","s")} Close</button></div><img src="${src}" alt="">`;document.body.appendChild(z)}
function qHTML(d,q){const a=d.answers[q.id]||{};const cls=a.r?`r-${a.r}`:"unrated";
  return `<div class="q ${cls}" id="q-${q.id.replace(".","_")}"><div class="head"><div class="id">${q.id}</div><div class="txt">${esc(q.text)}</div></div>
  ${q.ref||(q.snn||[]).length?`<div class="meta">${q.ref?`<span class="ref">${esc(q.ref)}</span>`:""}${(q.snn||[]).map(c=>snnBadge(c,1)).join("")}</div>`:""}
  <div class="rates" role="group" aria-label="Rating for item ${q.id}">${["C","UA","NI","NA"].map(r=>`<button data-r="${r}" class="${a.r===r?"on":""}" aria-pressed="${a.r===r}" onclick="rate('${q.id}','${r}')">${RLABEL[r]}<small>${RSUB[r]}</small></button>`).join("")}</div>
  <div class="ncwrap">${(a.r==="UA"||a.r==="NI")?ncHTML("q",q.id,a):cmtHTML(q.id,a)}</div></div>`}
function cmtHTML(id,a){if(!a.r)return "";const k=`'q','${id}'`;const ph=a.photos||[];
  return `<div class="cmt">${a.comment!==undefined&&a.comment!==null&&a.showc?`<textarea class="t" placeholder="Comment / above-standard practice (optional)" oninput="setA('${id}','comment',this.value)">${esc(a.comment||"")}</textarea>`:`<button class="linkbtn" onclick="showCmt('${id}')">${ic("plus","s")} Comment</button>`}
  ${a.showp||ph.length?`<div class="vr"><div class="lbl">Photo – optional visual record</div>${ph.length?`<div class="photos">${ph.map((p,i)=>`<div class="ph"><img src="${p}" onclick="zoomImg(this.src)" alt="Photo ${i+1}"><button onclick="delPhoto(${k},${i})" aria-label="Remove photo">${ic("x")}</button></div>`).join("")}</div>`:""}${photoBtns(k)}</div>`
   :`<button class="linkbtn" onclick="showPh('${id}')">${ic("camera","s")} Photo</button>`}</div>`}
function showPh(id){getA("q",id).showp=true;save(CUR);refreshQ(id)}
function ncHTML(kind,id,a){const k=`'${kind}','${id}'`;const rk=riskOf(a.cons,a.like);return `<div class="nc">
  <label class="f">What was found <span class="req">*</span></label><textarea class="t" placeholder="Describe the non-compliance – what, where, who" oninput="setF(${k},'finding',this.value)">${esc(a.finding||"")}</textarea>
  <label class="f">Proposed corrective action <span class="req">*</span></label><textarea class="t" placeholder="What needs to be done to fix it / stop it recurring" oninput="setF(${k},'action',this.value)">${esc(a.action||"")}</textarea>
  ${riskHTML(kind,id,a)}
  <label class="f">Closed at time of inspection? <span class="req">*</span></label>
  <div class="seg"><button class="${a.closed===true?"on":""}" onclick="setClosed(${k},true)">Yes – closed</button><button class="${a.closed===false?"on":""}" onclick="setClosed(${k},false)">No – open</button></div>
  ${a.closed===true?`<label class="f">Action taken on the spot <span class="req">*</span></label><textarea class="t" oninput="setF(${k},'taken',this.value)">${esc(a.taken||"")}</textarea>`:""}
  ${a.closed===false?`<div class="grid2"><div><label class="f">Responsible person</label><input class="t" value="${esc(a.owner||"")}" oninput="setF(${k},'owner',this.value)" placeholder="Name"></div><div><label class="f">Due date${rk?` <span class="muted">· ${esc(rk.level)}: ${rk.days<=1?"immediate":rk.days+" days"}</span>`:""}</label><input class="t" type="date" value="${esc(a.due||"")}" oninput="setF(${k},'due',this.value)"></div></div>`:""}
  <label class="f">Photos (optional)</label>${(a.photos||[]).length?`<div class="photos">${(a.photos||[]).map((p,i)=>`<div class="ph"><img src="${p}" onclick="zoomImg(this.src)" alt="Photo ${i+1}"><button onclick="delPhoto(${k},${i})" aria-label="Remove photo">${ic("x")}</button></div>`).join("")}</div>`:""}
  ${photoBtns(k)}</div>`}
function riskHTML(kind,id,a){const kk=`'${kind}','${id}'`;const k=riskOf(a.cons,a.like);
  const scale=(f,list)=>`<div class="rscale" role="group">${list.map(([v,l])=>`<button class="${+a[f]===v?"on":""}" aria-pressed="${+a[f]===v}" title="${esc(l)}" onclick="setRisk(${kk},'${f}',${v})"><b>${v}</b><span class="rl">${esc(l)}</span></button>`).join("")}</div>`;
  const desc=(f,list)=>{const x=list.find(x=>x[0]===+a[f]);return x?`<div class="rresp"><b>${esc(x[1])}</b> – ${esc(x[2])}</div>`:""};
  return `<div class="riskbox"><div class="rh"><b>${ic("gauge","s")} Risk rating <span class="req">*</span></b>${riskChip(a.cons,a.like)}</div>
   <div class="rlab">Consequence – worst credible outcome</div>${scale("cons",RISK.consequence)}${desc("cons",RISK.consequence)}
   <div class="rlab">Likelihood</div>${scale("like",RISK.likelihood)}${desc("like",RISK.likelihood)}
   ${k?`<div class="rresp" style="color:var(--ink)">${ic("info","s")} ${esc(k.response)}</div>`:""}
   <button class="linkbtn" onclick="showMatrix(${+a.cons||0},${+a.like||0})">${ic("layers","s")} View risk matrix</button></div>`}
function setRisk(kind,id,f,v){const a=getA(kind,id);a[f]=v;const k=riskOf(a.cons,a.like);
  if(k&&a.closed===false&&!a.due)a.due=addDaysISO(Math.max(0,k.days));
  save(CUR);kind==="q"?refreshQ(id):renderOthers()}
function showMatrix(c,l){const head=`<div class="h"></div>${RISK.likelihood.map(x=>`<div class="h">${x[0]}<br>${esc(x[1])}</div>`).join("")}`;
  const rows=RISK.consequence.slice().reverse().map(([cv,cl])=>`<div class="h" style="text-align:right;padding-right:6px">${cv} ${esc(cl)}</div>${RISK.likelihood.map(([lv])=>{const k=riskOf(cv,lv);return `<div class="${cv===c&&lv===l?"sel":""}" style="background:${k.color}">${k.score}</div>`}).join("")}`).join("");
  sheet(`<h3>Risk matrix</h3><p class="muted">Consequence (rows) × likelihood (columns).</p><div class="matrix">${head}${rows}</div>
   <div style="margin-top:14px">${RISK.levels.map(x=>`<div class="set"><span class="risk" style="--rc:${x.color}">${esc(x.key)}</span><div><span>${esc(x.response)}</span></div></div>`).join("")}</div>`)}
function photoBtns(k){return `<div class="pbtns" style="margin-top:8px"><label class="addph">${ic("camera","s")} Take photo<input type="file" accept="image/*" capture="environment" class="hide" onchange="addPhoto(${k},this,'camera')"></label><label class="addph">${ic("image","s")} Upload<input type="file" accept="image/*" class="hide" onchange="addPhoto(${k},this,'upload')"></label></div>`}
function addOther(){CUR.others.push({title:"",r:"NI",snn:[],photos:[]});save(CUR);renderOthers();renderBar(CUR)}
function renderOthers(){const box=$("#others");if(!box)return;box.innerHTML=CUR.others.map((o,i)=>`<div class="q r-${o.r||"NI"}"><div class="head"><div class="id">X${i+1}</div><div class="txt"><input class="t" placeholder="Short description of the hazard" value="${esc(o.title||"")}" oninput="setF('o','${i}','title',this.value)"></div></div>
  <div class="rates">${["UA","NI"].map(r=>`<button data-r="${r}" class="${o.r===r?"on":""}" onclick="setO(${i},'r','${r}')">${r}<small>${RSUB[r]}</small></button>`).join("")}<button onclick="rmOther(${i})" style="grid-column:span 2">${ic("trash","s")}<small>Remove</small></button></div>
  <div class="nc"><label class="f">Linked Safety Non-Negotiable (if any)</label><div class="chips">${Object.entries(SNN).map(([c,n])=>`<button class="chip ${(o.snn||[]).includes(c)?"on":""}" style="${(o.snn||[]).includes(c)?"background:var(--accent);border-color:var(--accent)":""}" onclick="togSNN(${i},'${c}')">${esc(n)}</button>`).join("")}</div></div>
  ${ncHTML("o",String(i),o)}</div>`).join("");renderBar(CUR)}
function setO(i,f,v){CUR.others[i][f]=v;save(CUR);renderOthers()}
function togSNN(i,c){const s=CUR.others[i].snn=CUR.others[i].snn||[];const k=s.indexOf(c);k>=0?s.splice(k,1):s.push(c);save(CUR);renderOthers()}
async function rmOther(i){if(!await ask2("Remove this hazard?","The hazard, its finding and photos are removed from this inspection.","Remove",true))return;CUR.others.splice(i,1);save(CUR);renderOthers()}
function renderBar(d){let b=document.getElementById("bar");if(!b){b=document.createElement("div");b.id="bar";b.className="bar";document.body.appendChild(b)}
  if(!location.hash.startsWith("#insp")){b.remove();return}
  if(tabByNum(d.tab).kind==="record"){const n=recProblems(d).length;b.innerHTML=`<div class="in"><div class="stats">${n?`<b>${n}</b> item(s) still to complete`:`<b style="color:var(--c)">${ic("circlecheck","s")} Ready to review</b>`}<div class="prog"><i style="width:${Math.round((8-Math.min(8,n))/8*100)}%"></i></div></div><button class="btn o" onclick="toReview()">Review ${ic("arrow","s")}</button></div>`;return}
  const s=stats(d);b.innerHTML=`<div class="in"><div class="stats"><b>${s.rated}/${s.total}</b> rated · <span style="color:var(--ua);font-weight:800">${s.UA} UA</span> · <span style="color:var(--ni-ink);font-weight:800">${s.NI} NI</span>${s.snnN?` · <span style="color:var(--accent);font-weight:800">${s.snnN} SNN</span>`:""}<div class="prog"><i style="width:${Math.round(s.rated/s.total*100)}%"></i></div></div>
  ${s.rated<s.total?`<button class="btn g s" onclick="nextUnrated()" aria-label="Next unrated item"><span class="t">Next</span> ${ic("down","s")}</button>`:""}<button class="btn o" onclick="toReview()">Review ${ic("arrow","s")}</button></div>`}

function cphHTML(d,c){const t=tabByNum(d.tab);const C=t.checks;return (C.photos||[]).map((lab,k)=>{const ph=chkPhoto(d,c,k);
  const inp=(src,lbl,cls)=>`<label class="${cls}" style="text-align:center">${lbl}<input type="file" accept="image/*" ${src==="camera"?'capture="environment"':""} class="hide" onchange="addChkPhoto(${c},${k},this,'${src}')"></label>`;
  return `<div class="slot ${ph?"ok":""}"><b>📷 ${esc(lab)} <span class="req">*</span></b>${ph?`<img src="${ph.img}" onclick="zoomImg(this.src)"><div class="row">${inp("camera","Retake","addph")}${inp("upload","Upload instead","addph")}<button class="linkbtn" onclick="delChkPhoto(${c},${k})">Remove</button></div>`
   :`<div class="pbtns">${inp("camera","📷 Take photo","btn o")}${inp("upload","🖼 Upload photo","btn g")}</div>`}</div>`}).join("")}
function checkRefTime(d,c){const tm=chkVal(d,c,0);const dt=(d.details.datetime||"").slice(0,10);if(!tm||!dt)return null;const v=new Date(`${dt}T${tm}`);return isNaN(v)?null:v.getTime()}
async function addChkPhoto(c,k,inp,src){const f=inp.files&&inp.files[0];if(!f)return;const d=CUR;const t=tabByNum(d.tab);
  try{toast("Stamping photo…",1500);const lab=`${t.checks.cols[c]} – ${(t.checks.photoShort||[])[k]||"Photo "+(k+1)}`;
    const tgs=t.fixed?(t.fixed.find(x=>/TGS/.test(x[0]))||[])[1]:"";
    const ph=await stampPhoto(f,[[lab,chkVal(d,c,1)||d.details.inspector].filter(Boolean).join("  ·  "),[d.details.location,tgs].filter(Boolean).join("  ·  ")],{source:src||"camera",ref:checkRefTime(d,c)});
    (d.details.checkPhotos=d.details.checkPhotos||{})[c+"|"+k]=ph;save(d,true);$("#cph-"+c).innerHTML=cphHTML(d,c);renderBar(d);
    if(ph.old)toast("Photo time is more than an hour from the check time – the original time is shown on it",6500);
    else if(ph.unverified)toast("This photo has no original time recorded – it is marked as uploaded",6500)}catch(e){console.error(e);toast("Could not read that photo")}}
async function delChkPhoto(c,k){if(!await ask2("Remove this photo?","It will need to be retaken before the check is complete.","Remove",true))return;delete (CUR.details.checkPhotos||{})[c+"|"+k];save(CUR);$("#cph-"+c).innerHTML=cphHTML(CUR,c)}
/* Reads the camera's own capture time (EXIF DateTimeOriginal) so an old gallery photo cannot pass as a new one. */
async function exifDate(file){const buf=await file.slice(0,262144).arrayBuffer();const v=new DataView(buf);if(v.byteLength<4||v.getUint16(0)!==0xFFD8)return null;let o=2;
  while(o<v.byteLength-10){const m=v.getUint16(o),len=v.getUint16(o+2);
    if(m===0xFFE1&&v.getUint32(o+4)===0x45786966){const t=o+10,le=v.getUint16(t)===0x4949;const g16=p=>v.getUint16(p,le),g32=p=>v.getUint32(p,le);
      const ifd=off=>{const n=g16(t+off),e={};for(let i=0;i<n;i++){const q=t+off+2+i*12;e[g16(q)]={count:g32(q+4),val:q+8}}return e};
      const str=en=>{const off=en.count>4?t+g32(en.val):en.val;let s="";for(let i=0;i<en.count-1;i++)s+=String.fromCharCode(v.getUint8(off+i));return s};
      const i0=ifd(g32(t+4));let ds=null;if(i0[0x8769]){const ex=ifd(g32(i0[0x8769].val));if(ex[0x9003])ds=str(ex[0x9003])}if(!ds&&i0[0x0132])ds=str(i0[0x0132]);
      const mm=ds&&ds.match(/(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);return mm?new Date(+mm[1],mm[2]-1,+mm[3],+mm[4],+mm[5],+mm[6]).getTime():null}
    if((m&0xFF00)!==0xFF00)break;o+=2+len}return null}
function stampPhoto(file,lines,opt){opt=opt||{};return new Promise(async(res,rej)=>{let ex=null;try{ex=await exifDate(file)}catch(e){}const added=Date.now();
  const ref=opt.ref||added;const upload=opt.source==="upload";
  const old=!!(ex&&Math.abs(ref-ex)>60*60*1000);const unverified=!ex&&upload;const taken=ex||(upload?null:added);
  const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{const m=opt.max||1600;let{width:w,height:h}=img;const s=Math.min(1,m/Math.max(w,h));w=Math.round(w*s);h=Math.round(h*s);
    const bh=Math.max(84,Math.round(Math.min(w,h)*0.17));
    // the banner sits BELOW the photo so it never covers the picture or a stamp already on it
    const c=document.createElement("canvas");c.width=w;c.height=h+bh;const g=c.getContext("2d");g.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
    g.fillStyle="#112B4E";g.fillRect(0,h,w,bh);g.fillStyle="#EC7723";g.fillRect(0,h,w,Math.max(3,bh*0.05));const H=h+bh;
    const f1=Math.round(bh*0.28),f2=Math.round(bh*0.155);g.textBaseline="alphabetic";
    const l1=unverified?`UPLOADED ${fmtDT(added)} · ORIGINAL TIME NOT RECORDED`:old?`TAKEN ${fmtDT(taken)} · ADDED ${fmtDT(added)}`:fmtDT(taken);let fs=f1;g.font=`bold ${fs}px Arial, sans-serif`;
    while(g.measureText(l1).width>w-bh*0.44&&fs>10){fs--;g.font=`bold ${fs}px Arial, sans-serif`}
    g.fillStyle=(old||unverified)?"#FFB066":"#fff";g.fillText(l1,Math.round(bh*0.2),H-bh+Math.round(bh*0.38));
    g.font=`${f2}px Arial, sans-serif`;g.fillStyle="#fff";
    lines.forEach((ln,i)=>{let f=f2;g.font=`${f}px Arial, sans-serif`;while(g.measureText(ln).width>w-bh*0.4&&f>9){f--;g.font=`${f}px Arial, sans-serif`}
      g.fillText(ln,Math.round(bh*0.2),H-bh+Math.round(bh*(0.63+i*0.24)))});
    res({img:c.toDataURL("image/jpeg",0.76),taken,added,old,unverified,exif:!!ex,source:upload?"upload":"camera"})};img.onerror=e=>{URL.revokeObjectURL(url);rej(e)};img.src=url})}
let LOGDAY=null;
function logHTML(d){const t=tabByNum(d.tab);const L=t.log;const c=LOGDAY;
  return `<div class="muted" style="margin-bottom:8px">${esc(L.ref)} – complete each day before the trailer mobilises. Pick the day:</div>
  <div class="days">${L.cols.map((col,i)=>`<button class="${i===c?"on":""} ${logState(d,i)==="done"?"done":""}" onclick="LOGDAY=${i};$('#logcard').innerHTML=logHTML(CUR)">${esc(col)}${logState(d,i)==="done"?" ✓":""}</button>`).join("")}</div>
  ${L.rows.map((row,r)=>{const v=logVal(d,r,c);const warn=row.warnIf&&v===row.warnIf;
    return `<div class="logrow"><label class="f">${esc(row.no)} ${esc(row.label)} <small>${esc(row.ref)}</small></label>${row.type==="select"
      ?`<select class="t" onchange="setLog(${r},${c},this.value)"><option value="">– select –</option>${row.options.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`
      :`<input class="t" type="number" inputmode="numeric" min="0" max="100" value="${esc(v)}" oninput="setLog(${r},${c},this.value,1)">`}${warn?`<div class="alert red" style="margin-top:6px">${esc(row.warn)}</div>`:""}</div>`}).join("")}`}
function setLog(r,c,v,quiet){(CUR.details.log=CUR.details.log||{})[r+"|"+c]=v;save(CUR);if(!quiet)$("#logcard").innerHTML=logHTML(CUR);renderBar(CUR)}
function getA(kind,id){const d=CUR;if(kind==="q"){return d.answers[id]=d.answers[id]||{}}return d.others[+id]}
function refreshQ(id){const t=tabByNum(CUR.tab);const q=allQ(t).find(x=>x.id===id);const el=document.getElementById("q-"+id.replace(".","_"));
  const wrap=document.createElement("div");wrap.innerHTML=qHTML(CUR,q);el.replaceWith(wrap.firstElementChild);renderBar(CUR)}
function rate(id,r){const a=getA("q",id);a.r=(a.r===r?null:r);if(!a.r){delete CUR.answers[id]}save(CUR);refreshQ(id)}
function setA(id,f,v){getA("q",id)[f]=v;save(CUR)}
function showCmt(id){const a=getA("q",id);a.showc=true;a.comment=a.comment||"";refreshQ(id)}
function setF(kind,id,f,v){getA(kind,id)[f]=v;save(CUR);renderBar(CUR)}
function setClosed(kind,id,v){const a=getA(kind,id);a.closed=v;if(v===false&&!a.due){const k=riskOf(a.cons,a.like);if(k)a.due=addDaysISO(Math.max(0,k.days))}save(CUR);kind==="q"?refreshQ(id):renderOthers()}
function delPhoto(kind,id,i){getA(kind,id).photos.splice(i,1);save(CUR);kind==="q"?refreshQ(id):renderOthers()}
function addPhoto(kind,id,inp,src){const f=inp.files&&inp.files[0];if(!f)return;const d=CUR;const t=tabByNum(d.tab);
  const lab=kind==="q"?`Item ${id}`:`${pad(t.num)} Other hazard X${+id+1}`;
  return stampPhoto(f,[[lab,t.short,d.details.inspector].filter(Boolean).join("  ·  "),d.details.location||""],{source:src||"camera",max:1280})
   .then(ph=>{const a=getA(kind,id);(a.photos=a.photos||[]).push(ph.img);save(CUR);kind==="q"?refreshQ(id):renderOthers()}).catch(()=>toast("Could not read that photo"))}
function compress(file){return new Promise((res,rej)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{const m=1280;let{width:w,height:h}=img;const s=Math.min(1,m/Math.max(w,h));w=Math.round(w*s);h=Math.round(h*s);
  const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);URL.revokeObjectURL(url);res(c.toDataURL("image/jpeg",0.72))};img.onerror=rej;img.src=url})}
function nextUnrated(){const t=tabByNum(CUR.tab);const q=allQ(t).find(q=>!(CUR.answers[q.id]&&CUR.answers[q.id].r));if(!q)return;const el=document.getElementById("q-"+q.id.replace(".","_"));el.classList.add("flag");el.scrollIntoView({behavior:"smooth",block:"start"})}
async function toReview(){await save(CUR,true);queuePing(CUR,"draft");go("#review/"+CUR.id)}

/* ---------- review / send ---------- */
let PDFBLOB=null;
function gauge(pct){const r=40,c=Math.PI*r;const p=pct===null?0:pct/100;const col=pct===null?"var(--na)":pct>=90?"var(--c)":pct>=75?"var(--ni)":"var(--ua)";
  return `<svg viewBox="0 0 100 58" width="120" aria-label="${pct===null?"No rated items":pct+"% compliant"}"><path d="M10 50a40 40 0 0 1 80 0" fill="none" stroke="var(--surface-3)" stroke-width="10" stroke-linecap="round"/><path d="M10 50a40 40 0 0 1 80 0" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c*p).toFixed(1)} ${c.toFixed(1)}"/><text x="50" y="47" text-anchor="middle" font-size="19" font-weight="800" fill="var(--ink)">${pct===null?"–":pct+"%"}</text></svg>`}
function viewReview(d){const t=tabByNum(d.tab);setHeader("Review & send",`${pad(t.num)} · ${t.short}`,{icon:"back",aria:"Back to form",fn:()=>go("#insp/"+d.id)});
  const bar=document.getElementById("bar");if(bar)bar.remove();PDFBLOB=null;
  const s=stats(d);const p=problems(d);const REC=t.kind==="record";
  let h=`<div class="stepper"><div class="done">1 · Inspect</div><div class="on">2 · Review & sign</div><div>3 · Send</div></div>`;
  h+=REC?`<div class="card"><b>${esc(t.title)}</b><div class="muted">With ${esc(R(d).with||"-")} · ${fmtDT(d.details.datetime)} · recorded by ${esc(d.details.inspector)}</div><div class="muted" style="margin-top:6px">${esc(R(d).type.join(", "))}${R(d).topics.length?" · "+esc(R(d).topics.join(", ")):""} · ${recActions(d).length} action(s)${R(d).raise==="Yes"?' · <b style="color:var(--ua)">Raise with Sponsor / Manager</b>':""}</div></div>`
   :`<div class="card"><div style="display:flex;gap:14px;align-items:center"><div style="flex:1;min-width:0"><b style="font-size:16px">${esc(t.title)}</b><div class="muted" style="margin-top:3px">${ic("pin","s")} ${esc(d.details.location)} · ${fmtDT(d.details.datetime)}<br>${ic("user","s")} ${esc(d.details.inspector)}</div>
   <div class="libmeta" style="margin-top:8px"><span class="pill c">${s.C} C</span><span class="pill ua">${s.UA} UA</span><span class="pill ni">${s.NI} NI</span><span class="pill na">${s.NA} N/A</span></div></div><div style="text-align:center">${gauge(s.pct)}<div class="muted" style="font-size:11.5px;font-weight:700">COMPLIANCE</div></div></div></div>`;
  if(!REC){
  if(s.snnN)h+=`<div class="alert org">${ic("shield")}<div><b>${s.snnN} non-compliance(s) linked to a Safety Non-Negotiable</b><br>${[...new Set(s.ncs.flatMap(n=>snnNames(n.snn)))].map(esc).join(" · ")}</div></div>`;
  if(s.UA)h+=`<div class="alert red">${ic("alert")}<div><b>UA recorded.</b> Make sure the task was stopped and made safe, and the Supervisor and SHE Manager were told immediately.</div></div>`;
  logWarnings(d).forEach(w=>{h+=`<div class="alert red">${ic("alert")}<div><b>${esc(w)}</b></div></div>`});
  if(t.checks&&!p.length){const dn=checkDone(d);const miss=t.checks.cols.filter((c,i)=>!dn[i]);if(miss.length)h+=`<div class="alert org">${ic("clock")}<div><b>${esc(miss.join(" and "))} check not recorded yet.</b> If it still needs doing, go back and send after it is complete.</div></div>`}
  if(p.length)h+=`<div class="alert red">${ic("alert")}<div><b>Not ready to send</b><ul>${p.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><button class="btn s" style="margin-top:10px" onclick="go('#insp/${d.id}')">${ic("back","s")} Back to inspection</button></div></div>`;
  h+=`<h2>Non-compliances <span class="cnt">${s.ncs.length}</span></h2>`;
  if(!s.ncs.length)h+=`<div class="card empty">${ic("circlecheck")}<b>No non-compliances recorded</b>Nice work – everything inspected met the standard.</div>`;
  s.ncs.forEach(n=>{h+=`<div class="card ncsum ${n.r==="UA"?"ua":""}"><div class="libmeta" style="margin:0 0 6px"><span class="pill ${n.r==="UA"?"ua":"ni"}">${n.r}</span><b style="align-self:center">${esc(n.id)}</b>${riskChip(n.cons,n.like)}${n.snn.map(c=>snnBadge(c,1)).join("")}</div><div>${esc(n.text)}</div>
   <dl class="kv"><dt>Finding</dt><dd>${esc(n.finding||"—")}</dd><dt>Corrective action</dt><dd>${esc(n.action||"—")}</dd>
   <dt>Status</dt><dd>${n.closed===true?`<span class="pill spot">Closed at inspection</span> ${esc(n.taken||"")}`:n.closed===false?`<span class="pill open">Open</span>${n.owner?` ${esc(n.owner)}`:""}${n.due?` · due ${fmtD(n.due)}`:""}`:"—"}</dd></dl>
   ${n.photos.length?`<div class="photos">${n.photos.map(u=>`<div class="ph"><img src="${u}" onclick="zoomImg(this.src)" alt=""></div>`).join("")}</div>`:""}</div>`});
  if(s.ncs.some(n=>n.closed===false))h+=`<div class="alert blue">${ic("actions")}<div>Open items go onto the project <b>Action register</b> when sent, so they can be tracked to close-out and verified.</div></div>`;
  }else if(p.length)h+=`<div class="alert red">${ic("alert")}<div><b>Not ready to send</b><ul>${p.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><button class="btn s" style="margin-top:10px" onclick="go('#insp/${d.id}')">${ic("back","s")} Back to record</button></div></div>`;
  h+=`<h2>Sign-off</h2>${REC?`<div class="muted" style="margin:0 4px 6px">${esc(t.form.declaration)}</div>`:""}<div class="card"><canvas class="sig" id="sig" aria-label="Signature pad"></canvas><div style="display:flex;justify-content:space-between;align-items:center"><span class="muted">Sign with your finger</span><button class="linkbtn" onclick="clearSig()">Clear</button></div></div>`;
  h+=`<h2>Send to SHE Manager</h2><div class="card">
   ${recipientOK()?`<div class="muted">Report goes to <b style="color:var(--ink)">${esc(recipient())}</b></div>`:`<div class="alert red">${ic("alert")}<div>Recipient email not set – see Settings.</div></div>`}
   ${directOn()?`<button class="btn o w" id="bShare" ${p.length?'data-blocked="1" disabled':"disabled"} onclick="sendDirect()">${p.length?"Send report":"Preparing report…"}</button>
   <div class="muted" style="margin-top:8px">One tap. The PDF and summary are emailed straight to the SHE Manager. No signal? The report waits in the Outbox and sends automatically when you are back in range.</div>
   <details style="margin-top:14px"><summary class="muted" style="cursor:pointer;min-height:40px;display:flex;align-items:center">Other ways to send</summary>
   <button class="btn g w" ${p.length?"disabled":""} onclick="sendShare()">${ic("send","s")} Share PDF via Outlook</button>
   <button class="btn g w" ${p.length?"disabled":""} onclick="savePDF()">${ic("download","s")} Save PDF only</button>
   <button class="btn g w" ${p.length?"disabled":""} onclick="previewPDF()">${ic("file","s")} Preview PDF</button>
   <button class="btn w" ${p.length?"disabled":""} onclick="markSent()">I sent it another way – close this inspection</button></details>`
   :`<button class="btn o w" id="bShare" ${p.length?'data-blocked="1" disabled':"disabled"} onclick="sendShare()">${p.length?"Share PDF via Outlook":"Preparing report…"}</button>
   <div class="muted" style="margin-top:8px">Tap <b>Outlook</b> in the share menu, paste the address into <b>To</b> (already copied) and press Send.</div>
   <button class="btn g w" ${p.length?"disabled":""} onclick="savePDF()">${ic("download","s")} Save PDF only</button>
   <button class="btn g w" ${p.length?"disabled":""} onclick="previewPDF()">${ic("file","s")} Preview PDF</button>
   <button class="btn w" ${p.length?"disabled":""} onclick="markSent()">I've sent it – close this inspection</button>`}</div>`;
  render(h);initSig(d);if(!p.length)prepPDF(d)}
async function previewPDF(){try{const blob=PDFFILE||await buildPDF(CUR);const u=URL.createObjectURL(blob);window.open(u,"_blank")||downloadBlob(blob,fileName(CUR))}catch(e){console.error(e);toast("Could not create the PDF")}}
function initSig(d){const c=$("#sig");const r=c.getBoundingClientRect();const k=window.devicePixelRatio||1;c.width=r.width*k;c.height=r.height*k;const g=c.getContext("2d");g.scale(k,k);g.lineWidth=2.2;g.lineCap="round";g.strokeStyle="#112B4E";
  if(d.signature){const im=new Image();im.onload=()=>g.drawImage(im,0,0,r.width,r.height);im.src=d.signature}
  let dn=false,lx=0,ly=0;const pos=e=>{const b=c.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]};
  c.onpointerdown=e=>{dn=true;[lx,ly]=pos(e);c.setPointerCapture(e.pointerId)};
  c.onpointermove=e=>{if(!dn)return;const[x,y]=pos(e);g.beginPath();g.moveTo(lx,ly);g.lineTo(x,y);g.stroke();lx=x;ly=y};
  c.onpointerup=()=>{dn=false;d.signature=c.toDataURL("image/png");save(d);if(!problems(d).length)prepPDF(d)}}
function clearSig(){const c=$("#sig");c.getContext("2d").clearRect(0,0,c.width,c.height);CUR.signature="";save(CUR);if(!problems(CUR).length)prepPDF(CUR)}
