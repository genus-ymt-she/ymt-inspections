"use strict";
/* ---------- Today on site: Fire Danger Rating, Total Fire Ban, Harvest & Vehicle Movement Ban ----------
   Shared through the relay (Site Status sheet, every change kept). Anyone with the status PIN (relay Script property
   STATUS_PIN) can set it; the PIN is remembered on that phone. The last status is cached so it still shows offline.
   Next check (BFMP §10.1): Morning → 12:00 the same day; Midday or Change → 05:30 the next day (phone time = Perth). */
let SITEST=lsJ("siteStatus",null);   // {status, today:[], fetchedAt, live}
const ST_FDR=["No Rating","Moderate","High","Extreme","Catastrophic"];
const ST_COL={"No Rating":["#FFFFFF","#3A4657"],"Moderate":["#64BF30","#0F2A06"],"High":["#FEDD3A","#3A2E00"],"Extreme":["#F78100","#2B1300"],"Catastrophic":["#AD0909","#FFFFFF"]};
const stDay=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const stHM=ms=>{const d=new Date(ms);return `${pad(d.getHours())}:${pad(d.getMinutes())}`};
function stNextDue(s){const d=new Date(s.at);if(s.type==="Morning")d.setHours(12,0,0,0);else{d.setDate(d.getDate()+1);d.setHours(5,30,0,0)}return d.getTime()}
function stState(now){now=now||Date.now();const s=SITEST&&SITEST.status;if(!s||!s.at)return {none:true,notToday:true};
  const at=new Date(s.at).getTime();const due=stNextDue(s);const notToday=stDay(at)!==stDay(now);
  return {s,at,due,notToday,overdue:!notToday&&now>due,dueText:stDay(due)===stDay(now)?stHM(due):`${stHM(due)} tomorrow`,
    lastKnown:!SITEST.live||navigator.onLine===false}}
async function stRefresh(){if(!directOn()||navigator.onLine===false){if(SITEST){SITEST.live=false}return false}
  try{const r=await fetch(relayQ("action=getStatus"),{redirect:"follow"});const j=await r.json();if(j.needCode){askSiteCode();throw new Error("code")}if(!j.ok)throw new Error(j.error||"status");
    const before=JSON.stringify(SITEST&&[SITEST.status,SITEST.today,SITEST.live]);SITEST={status:j.status||null,today:j.today||[],fetchedAt:Date.now(),live:true};ls("siteStatus",JSON.stringify(SITEST));
    return JSON.stringify([SITEST.status,SITEST.today,SITEST.live])!==before}
  catch(e){if(SITEST&&SITEST.live){SITEST.live=false;return true}return false}}
const stBadge=(fdr,big)=>{const c=ST_COL[fdr]||ST_COL["No Rating"];return `<span class="st-fdr ${big?"big":""} ${fdr==="No Rating"?"nr":""}" style="--fb:${c[0]};--fi:${c[1]}"><small>FIRE DANGER</small><b>${esc(fdr||"–")}</b></span>`};
const stChip=(lab,on)=>`<span class="st-chip ${on?"on":""}"><small>${esc(lab)}</small><b>${on?"DECLARED":"Not declared"}</b></span>`;
/* the panel at the top of Home (also the head of the detail page) */
function statusPanelHTML(detail){const S=stState();
  if(S.notToday){const last=S.s?`Last set ${fmtDT(S.s.at)} – ${esc(S.s.fdr)}, TFB ${esc(S.s.tfb)}, HVMB ${esc(S.s.hvmb)} (${esc(S.s.by)})`:"No status has been set yet.";
    return `<div class="st-panel notset" ${detail?"":`role="button" tabindex="0" onclick="go('#status')"`}><div class="st-head"><b>${ic("flame","s")} Today on site</b>${detail?"":ic("chev","s")}</div>
      <div class="st-ns"><b>NOT SET TODAY</b><span>Do not rely on yesterday's rating. Check DFES / Shire before work.</span></div><div class="st-line">${last}</div>
      ${S.lastKnown&&S.s?`<div class="st-off">${ic("wifioff","s")} Last known – may be out of date</div>`:""}
      ${detail?"":`<button class="btn o s st-upd" onclick="event.stopPropagation();statusEdit()">${ic("edit","s")} Update status</button>`}</div>`}
  const s=S.s;const tfb=s.tfb==="Yes",hv=s.hvmb==="Yes";
  return `<div class="st-panel ${S.overdue?"late":""} ${tfb||hv?"ban":""}" ${detail?"":`role="button" tabindex="0" onclick="go('#status')"`}><div class="st-head"><b>${ic("flame","s")} Today on site</b>${detail?"":ic("chev","s")}</div>
    <div class="st-row">${stBadge(s.fdr,detail)}<div class="st-chips">${stChip("Total Fire Ban",tfb)}${stChip("Harvest & Vehicle Movement Ban",hv)}</div></div>
    ${S.overdue?`<div class="st-late">${ic("clock","s")} <b>Check overdue</b> – confirm with the site office before relying on this.</div>`:""}
    <div class="st-line">Set by <b>${esc(s.by)}</b> at ${stHM(S.at)} (${esc(s.type)}) · Next check due ${esc(S.dueText)}</div>
    ${s.note?`<div class="st-line">${ic("info","s")} ${esc(s.note)}</div>`:""}
    ${S.lastKnown?`<div class="st-off">${ic("wifioff","s")} Last known – may be out of date</div>`:""}
    ${detail?"":`<button class="btn g s st-upd" onclick="event.stopPropagation();statusEdit()">${ic("edit","s")} Update</button>`}</div>`}
const stBox=(title,items,lead,cls)=>`<div class="card st-box ${cls||""}"><h3>${esc(title)}</h3>${lead?`<div class="st-lead">${esc(lead)}</div>`:""}<ul>${items.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
function viewStatus(){setHeader("Today on site","Fire danger · Total Fire Ban · HVMB",{icon:"back",aria:"Back",fn:()=>go("#home")});const seq=ROUTE_SEQ;
  const draw=()=>{const S=stState();const cfg=appCfg();let h=statusPanelHTML(true);
    if(!S.notToday){const s=S.s;h+=`<h2>Restrictions today</h2>`;
      if(s.hvmb==="Yes")h+=stBox(STATUS_REF.hvmb.title,STATUS_REF.hvmb.items,STATUS_REF.hvmb.lead,"hv");
      if(s.tfb==="Yes")h+=stBox(STATUS_REF.tfb.title,STATUS_REF.tfb.items,"","tfb");
      const key=s.fdr==="No Rating"||s.fdr==="Moderate"?"No Rating / Moderate":s.fdr;h+=stBox(`Fire Danger Rating: ${key} (BFMP Table 13)`,STATUS_REF.fdr[key]||[],"","fdr")}
    h+=`<button class="btn o w" onclick="statusEdit()">${ic("edit","s")} Update status</button>
     <h2>Check the status</h2><div class="card st-links">
      <a href="https://www.dfes.wa.gov.au/hazard-information/fire-danger-ratings" target="_blank" rel="noopener">${ic("ext","s")} DFES Fire Danger Ratings</a>
      <a href="https://www.emergency.wa.gov.au" target="_blank" rel="noopener">${ic("ext","s")} Emergency WA</a>
      <a href="tel:1800709355">${ic("phone","s")} DFES TFB Hotline 1800 709 355</a>
      ${cfg.hvmbUrl?`<a href="${esc(cfg.hvmbUrl)}" target="_blank" rel="noopener">${ic("ext","s")} Shire of Dandaragan – Harvest & Vehicle Movement Bans</a>`:`<span class="muted">${ic("info","s")} Shire of Dandaragan HVMB link – to be added (config.json hvmbUrl)</span>`}</div>
     <h2>Today's changes <span class="cnt">${(SITEST&&SITEST.today||[]).length}</span></h2><div class="card">${(SITEST&&SITEST.today||[]).slice().reverse().map(x=>`<div class="st-hist"><b>${stHM(new Date(x.at).getTime())} · ${esc(x.type)}</b> ${esc(x.fdr)} · TFB ${esc(x.tfb)} · HVMB ${esc(x.hvmb)}<small>${esc(x.by)}${x.note?` – ${esc(x.note)}`:""}</small></div>`).join("")||`<div class="muted">No changes recorded today.</div>`}</div>
     <p class="foot">${esc(STATUS_REF.footer)}</p>`;render(h)};
  draw();stRefresh().then(ch=>{if(ch&&!stale(seq)&&location.hash==="#status")draw()})}
/* update – PIN asked once per phone, then remembered */
function statusEdit(){if(!(ls("inspector")||"").trim()){askName().then(n=>{if(n)statusEdit()});return}
  const S=stState();const cur=!S.notToday&&S.s?S.s:null;const bom=(lsJ("fdr",{})||{});const h=new Date().getHours()+new Date().getMinutes()/60;
  const F={fdr:cur?cur.fdr:(bom.date===todayISO()&&ST_FDR.includes(fdrNorm(bom.today))?fdrNorm(bom.today):""),tfb:cur?cur.tfb:"",hvmb:cur?cur.hvmb:"",type:h<10.5?"Morning":h<14.5?"Midday":"Change",note:""};
  const seg=(k,opts)=>`<div class="seg" data-k="${k}">${opts.map(o=>`<button class="${F[k]===o?"on":""}" data-v="${o}">${o}</button>`).join("")}</div>`;
  const pinSaved=!!ls("statusPin");
  const sh=sheet(`<h3>${ic("flame","s")} Update today's status</h3><p class="muted">Set by <b>${esc(ls("inspector"))}</b>. Everyone sees this on their Home screen.</p>
    <label class="f">Fire Danger Rating <span class="req">*</span></label><div class="st-pick">${ST_FDR.map(o=>{const c=ST_COL[o];return `<button class="${F.fdr===o?"on":""}" data-v="${o}" style="--fb:${c[0]};--fi:${c[1]}">${o}</button>`}).join("")}</div>
    ${bom.date===todayISO()&&bom.today?`<div class="muted" style="margin-top:4px">BoM forecast for ${esc(bom.area||"the district")}: <b>${esc(fdrNorm(bom.today))}</b></div>`:""}
    <label class="f">Total Fire Ban declared? <span class="req">*</span></label>${seg("tfb",["No","Yes"])}
    <label class="f">Harvest & Vehicle Movement Ban declared? <span class="req">*</span></label>${seg("hvmb",["No","Yes"])}
    <label class="f">Check <span class="req">*</span></label>${seg("type",["Morning","Midday","Change"])}
    <label class="f">Note <span class="muted">· optional</span></label><input class="t" id="stNote" maxlength="300" placeholder="e.g. Confirmed with DFES and the Shire at 05:45">
    ${pinSaved?`<div class="muted" style="margin-top:10px">${ic("lock","s")} Status PIN remembered on this phone · <button class="linkbtn" id="stForget">forget</button></div>`:`<label class="f">Status PIN <span class="req">*</span></label><input class="t" id="stPin" type="password" inputmode="numeric" autocomplete="off" maxlength="12">`}
    <button class="btn o w" id="stSave" style="margin-top:14px">${ic("check","s")} Save for everyone</button>`);
  sh.querySelectorAll(".st-pick button").forEach(b=>b.onclick=()=>{F.fdr=b.dataset.v;sh.querySelectorAll(".st-pick button").forEach(x=>x.classList.toggle("on",x===b))});
  sh.querySelectorAll(".seg[data-k]").forEach(g=>g.querySelectorAll("button").forEach(b=>b.onclick=()=>{F[g.dataset.k]=b.dataset.v;g.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b))}));
  const fg=sh.querySelector("#stForget");if(fg)fg.onclick=()=>{lsDel("statusPin");closeSheet();statusEdit()};
  sh.querySelector("#stSave").onclick=async()=>{const miss=[!F.fdr&&"Fire Danger Rating",!F.tfb&&"Total Fire Ban",!F.hvmb&&"Harvest & Vehicle Movement Ban"].filter(Boolean);
    if(miss.length){toast("Still needed: "+miss.join(", "),4000);return}
    const pinEl=sh.querySelector("#stPin");const pin=pinEl?pinEl.value.trim():ls("statusPin");if(!pin){toast("Enter the status PIN",3000);return}
    if(navigator.onLine===false||!directOn()){toast("Needs signal – the status is shared through the project log",4500);return}
    const b=sh.querySelector("#stSave");b.disabled=true;b.innerHTML='<span class="sending"><span class="spin"></span>Saving…</span>';
    try{const r=await relayPost({payload:{action:"setStatus",pin,fdr:F.fdr,tfb:F.tfb,hvmb:F.hvmb,type:F.type,note:sh.querySelector("#stNote").value.trim(),by:ls("inspector")}},false);
      if(r&&r.badPin){lsDel("statusPin");b.disabled=false;b.innerHTML=`${ic("check","s")} Save for everyone`;toast("Incorrect status PIN",4000);if(!pinEl){closeSheet();statusEdit()}return}
      if(!r||!r.ok)throw new Error((r&&r.error)||"Not saved");
      ls("statusPin",pin);SITEST={status:r.status,today:r.today||[],fetchedAt:Date.now(),live:true};ls("siteStatus",JSON.stringify(SITEST));closeSheet();
      celebrate("Status updated","Everyone sees it on their Home screen");route()}
    catch(e){b.disabled=false;b.innerHTML=`${ic("check","s")} Save for everyone`;toast(String(e.message||e),4500)}}}
