"use strict";
/* ---------- High-or-above fire danger days (BFMP Rev 1 §10, Table 13, Appendix D) ----------
   When today's Fire Danger Rating is High, Extreme or Catastrophic – from the Bureau of Meteorology feed or the
   HVMB & Fire Status set on site – Home shows a banner with what must be done today and whether Inspection 25 and the
   midday re-check have been done. Supervisors, the SHE team and managers also get a pop-up once a day until
   Inspection 25 is sent. A High-or-above rating tomorrow shows a plan-ahead note. */
const FD_LEVELS=["High","Extreme","Catastrophic"];
const FD_FORM=25;
const FD_DO={
  High:[["Check FDR, TFB and HVMB before shift – brief at pre-start, broadcast on UHF 24","BFMP §10.1"],["Nominate a lookout; monitor Emergency WA and ABC Local Radio","BFMP §10.1; App D 7"],
    ["Hot work only under permit – appliance, fire watch and 15 m clearance confirmed first","BFMP Table 13; §8.2"],["Firefighting appliance at least 50% full, operator within UHF range","BFMP Table 13"],
    ["Mid-shift plant clean-outs; no plant parked or idling on dry grass","BFMP §8.4"],["Slashing only with the appliance in attendance","BFMP Table 13"],["Midday re-check of FDR / TFB / HVMB, broadcast any change","BFMP §10.1"]],
  Extreme:[["No hot work in the open air (enclosed building only, Construction Manager approval, never in a TFB)","BFMP App D 2"],["Appliances full, staged at each active work area and function-checked","BFMP App D 4"],
    ["Stop slashing, mowing and grading of vegetation – crews on formed tracks and cleared pads","BFMP App D 5"],["Confirm evacuation routes, vehicles fuelled, headcount ready","BFMP App D 6"],["Advise the Project Director and the Principal of today's restrictions","BFMP App D 8"]],
  Catastrophic:[["Project Director's mobilisation decision recorded – PD-approved essential attendance only","BFMP Table 13; BERP Table 5"],["All construction work in bushfire risk areas stopped; plant on hardstand, appliances staged at the compound","BFMP Table 13"]]};
let FD={at:0,date:"",shared:[],done:[],draft:null};
const fdRank=r=>FD_LEVELS.indexOf(r);
/* today's rating: the higher of the official feed and the site status set today */
function fdToday(){const F=lsJ("fdr",null);const off=F&&F.date===todayISO()?fdrNorm(F.today):"";const S=stState();const site=!S.notToday&&S.s?fdrNorm(S.s.fdr):"";
  const r=fdRank(site)>fdRank(off)?site:off;return {rating:r,high:fdRank(r)>=0,src:r&&r===site&&r!==off?`HVMB & Fire Status (${S.s.by})`:r?"Bureau of Meteorology":"",
    tomorrow:F&&F.date===todayISO()?fdrNorm(F.tomorrow):""}}
/* has Inspection 25 been sent today – this phone, plus everyone's from the project log */
async function fdRefresh(force){const t=todayISO();const before=JSON.stringify([FD.done,FD.draft]);
  const mine=(await dbAll("sent")).filter(s=>+s.no===FD_FORM&&stDay(s.sentAt)===t).map(s=>({name:s.inspector||ls("inspector")||"",at:s.sentAt}));
  const dr=(await dbAll("drafts")).find(d=>d.tab===FD_FORM&&stDay(d.created)===t)||null;
  // the project log (everyone's reports) is fetched at most every 5 minutes
  let shared=FD.date===t?FD.shared||[]:[];
  if((force||FD.date!==t||Date.now()-FD.at>5*60e3)&&directOn()&&navigator.onLine!==false){try{const j=await wkMonth(t.slice(0,7));shared=(j.sent||[]).filter(s=>+s.no===FD_FORM&&stDay(s.sentAt)===t).map(s=>({name:s.name,at:new Date(s.sentAt).getTime()}));FD.at=Date.now()}catch(e){}}
  const all=[...shared,...mine];FD={...FD,date:t,shared,done:[...new Map(all.map(x=>[nameKey(x.name)+Math.round(x.at/6e4),x])).values()].sort((a,b)=>a.at-b.at),draft:dr?{id:dr.id}:null};
  return JSON.stringify([FD.done,FD.draft])!==before}
function fdMidday(){const L=(SITEST&&SITEST.today)||[];return L.find(x=>x.type==="Midday"||(x.type==="Change"&&new Date(x.at).getHours()>=12))||null}
function fdBannerHTML(){const T=fdToday();const col=c=>{const k=FDR_COL[c];return k?`--fb:${k[0]};--fi:${k[1]}`:""};
  if(!T.high){if(fdRank(T.tomorrow)<0)return "";
    return `<div class="fd-next" style="${col(T.tomorrow)}">${ic("flame","s")}<span><b>Tomorrow: ${esc(T.tomorrow.toUpperCase())} fire danger</b>${T.tomorrow==="Catastrophic"?"Project Director decides today whether the workforce mobilises.":"Inspection 25 before work, midday re-check. Brief crews at pre-start."}</span></div>`}
  const r=T.rating;const lv=fdRank(r);const list=FD_LEVELS.slice(0,lv+1).flatMap(k=>FD_DO[k]);
  const done=FD.date===todayISO()?FD.done:[];const mid=fdMidday();const now=new Date();const afterNoon=now.getHours()>=12;
  const step=(ok,late,txt,sub,btn)=>`<div class="fd-step ${ok?"ok":late?"late":""}">${ic(ok?"circlecheck":late?"alert":"clock","s")}<span><b>${txt}</b><small>${sub}</small></span>${btn||""}</div>`;
  return `<div class="fd-banner lv${lv}" style="${col(r)}">
    <div class="fd-top"><span class="fd-r"><small>FIRE DANGER TODAY</small><b>${esc(r.toUpperCase())}</b></span><span class="fd-src">${esc(T.src)}</span></div>
    <p class="fd-lead">${lv===2?"For your survival, leave bush fire risk areas. Only Project Director-approved essential work.":lv===1?"Extreme-day controls apply (BFMP Appendix D) as well as the High-day controls.":"High-day controls apply (BFMP Table 13)."}</p>
    <div class="fd-steps">
      ${step(done.length,!done.length&&now.getHours()>=9,"Inspection 25 – Fire Danger Day",done.length?`Sent by ${done.map(d=>`${esc(d.name)} ${esc(stHM(d.at))}`).join(", ")}`:FD.draft?"Started on this phone – finish and send":"Before work – Chief Warden or delegate",
        done.length?"":`<button class="btn s fd-go" onclick="fdStart()">${FD.draft?"Continue":"Start"}</button>`)}
      ${step(!!mid,afterNoon&&!mid,"Midday re-check",mid?`Recorded ${esc(stHM(new Date(mid.at).getTime()))} by ${esc(mid.by)}`:"FDR / TFB / HVMB at 12:00 – update HVMB & Fire Status",
        mid?"":`<button class="btn s fd-go" onclick="statusEdit()">Update</button>`)}
    </div>
    <details class="fd-do" ${lv>0?"open":""}><summary>What must be done today (${list.length})</summary><ul>${list.map(([t,ref])=>`<li>${esc(t)} <small>${esc(ref)}</small></li>`).join("")}</ul></details>
  </div>`}
async function fdStart(){if(FD.draft){go("#insp/"+FD.draft.id);return}
  const d0=(await dbAll("drafts")).find(d=>d.tab===FD_FORM&&stDay(d.created)===todayISO());if(d0){go("#insp/"+d0.id);return}
  if(!(ls("inspector")||"").trim()){const n=await askName();if(!n)return}
  const d=newDraft(FD_FORM);const k="Fire Danger Rating today (High / Extreme / Catastrophic):";if(k in d.details.extra)d.details.extra[k]=fdToday().rating;
  await save(d,true);queuePing(d,"draft");FD.draft={id:d.id};go("#insp/"+d.id)}
/* once a day for supervisors, the SHE team and managers (or Manager mode) until Inspection 25 is sent */
function fdPopup(){const T=fdToday();if(!T.high||FD.done.length||FD.date!==todayISO()||document.getElementById("sheet"))return;
  const me=teamBy(ls("inspector")||"");const g=me?alGroup(me):"";if(!(isManager()||g==="she"||g==="sup"))return;
  const k="fdPop_"+todayISO();if(ls(k))return;const seen=()=>ls(k,"1");   // counts as seen only when the person responds – a screen refresh doesn't use it up
  const s=sheet(`<div class="fd-pop" style="${FDR_COL[T.rating]?`--fb:${FDR_COL[T.rating][0]};--fi:${FDR_COL[T.rating][1]}`:""}"><span class="fd-r"><small>FIRE DANGER TODAY</small><b>${esc(T.rating.toUpperCase())}</b></span>
    <h3>Inspection 25 is required today</h3><p class="muted">BFMP Table 13: complete the Fire Danger Day inspection before work, brief crews at pre-start, and re-check FDR / TFB / HVMB at midday.</p>
    <button class="btn o w" id="fdGo">${ic("clipboard","s")} Start Inspection 25</button><button class="btn g w" id="fdLater">Later</button></div>`);
  s.querySelector("#fdGo").onclick=()=>{seen();closeSheet();fdStart()};s.querySelector("#fdLater").onclick=()=>{seen();closeSheet()};
  s.querySelector(".sheet-x").addEventListener("click",seen);const bg=document.getElementById("sheet");bg.addEventListener("click",e=>{if(e.target===bg)seen()})}
