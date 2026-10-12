"use strict";
/* ============================================================================
   Shared project register – findings / corrective actions.
   Source of truth is the relay's Google Sheet (v3). Findings raised on this phone
   are also kept locally, so the register works offline and before the relay is
   updated. Close-outs made with no signal are queued and sync automatically.
   ========================================================================== */
const ST={spot:"Closed on spot",open:"Open",closed:"Closed",verified:"Verified"};
let REG=lsJ("reg",{at:0,v:0,findings:[],trend:[],month:null});
let LOCAL_SENT=[];
async function loadLocalSent(){LOCAL_SENT=await dbAll("sent");return LOCAL_SENT}

/* fetch the shared log (month defaults to the current one). Returns true when something changed. */
let REG_BUSY=null;
async function regRefresh(force,month){if(!directOn()||navigator.onLine===false)return false;
  if(!force&&!month&&Date.now()-(REG.at||0)<60e3)return false;if(REG_BUSY)return REG_BUSY;
  REG_BUSY=(async()=>{try{await flushUpdates();const m=month||monthKey(new Date());
    const r=await fetch(relayQ(`action=dashboard&month=${m}`),{redirect:"follow"});const j=await r.json();if(j.needCode)askSiteCode();if(!j.ok)throw new Error(j.error||"Error");
    if(j.v>=3&&RELAY.v<3){RELAY.v=j.v;RELAY.vAt=Date.now();ls("relayCfg",JSON.stringify(RELAY))}
    ls("dash_"+m,JSON.stringify(j));
    const before=JSON.stringify(REG.findings);
    if(j.v>=3){REG={at:Date.now(),v:j.v,findings:j.findings||[],trend:j.trend||[],month:j.month};ls("reg",JSON.stringify(REG))}
    else{REG.at=Date.now();REG.v=2}
    updateBadges();return JSON.stringify(REG.findings)!==before}
   catch(e){console.warn("register refresh",e);return false}finally{REG_BUSY=null}})();
  return REG_BUSY}

/* show a loading state (max 5 s) when the cached register is stale, so screens never flash out-of-date data */
async function regFresh(seq){if(!directOn()||navigator.onLine===false||Date.now()-(REG.at||0)<60e3)return;
  if(seq===undefined||!stale(seq))render(`<div class="skel" style="height:110px"></div><div class="skel"></div><div class="skel"></div>`);
  await Promise.race([regRefresh(),new Promise(r=>setTimeout(r,5000))])}

/* findings raised from this phone (kept with each sent report) */
function localFindings(){const out=[];LOCAL_SENT.forEach(s=>(s.findings||[]).forEach(f=>out.push({...f,reportId:s.reportId,uid:s.id,raised:new Date(s.sentAt).toISOString(),
  inspDate:(s.report||{}).inspDate||"",by:s.inspector||"",no:s.no||(s.title||"").slice(0,2),title:(s.title||"").replace(/^\d+\s–\s/,""),location:s.location||"",crew:(s.report||{}).crew||"",
  status:f.status==="spot"?ST.spot:ST.open,closedAt:f.status==="spot"?new Date(s.sentAt).toISOString():"",closedBy:f.status==="spot"?(s.inspector||""):"",note:f.status==="spot"?f.taken:"",
  history:[{at:new Date(s.sentAt).toISOString(),by:s.inspector||"",op:"raised",note:f.status==="spot"?"Closed at time of inspection: "+(f.taken||""):""}],local:true})));return out}

/* merged, de-duplicated view with queued (unsynced) changes applied on top */
function regAll(){const map=new Map();localFindings().forEach(f=>map.set(f.fid,f));(REG.findings||[]).forEach(f=>map.set(f.fid,{...f,local:false}));
  const pend=lsJ("fupd",[]);pend.forEach(u=>{const f=map.get(u.fid);if(!f)return;const g={...f,pending:true,history:[...(f.history||[]),{at:new Date(u.at).toISOString(),by:u.by,op:u.op,note:u.note||"",pending:true}]};
    if(u.op==="close"){g.status=ST.closed;g.closedAt=new Date(u.at).toISOString();g.closedBy=u.by;g.note=u.note;if(u.photo)g.localPhoto="data:image/jpeg;base64,"+u.photo}
    if(u.op==="verify"){g.status=ST.verified;g.verifiedAt=new Date(u.at).toISOString();g.verifiedBy=u.by}
    if(u.op==="reopen"){g.status=ST.open;g.verifiedAt="";g.closedAt=""}
    if(u.op==="edit"){if(u.owner!=null)g.owner=u.owner;if(u.ownerEmail!=null)g.ownerEmail=u.ownerEmail;if(u.due!=null)g.due=u.due}
    map.set(u.fid,g)});
  return [...map.values()]}
const isOpen=f=>f.status===ST.open;
const isOverdue=f=>isOpen(f)&&f.due&&daysTo(f.due)<0;
const isMine=f=>{const me=nameKey(ls("inspector")),em=String(ls("myEmail")||"").trim().toLowerCase();return (!!em&&String(f.ownerEmail||"").toLowerCase()===em)||(!!me&&(nameKey(f.owner)===me||nameKey(f.by)===me))};
function regStats(list){const open=list.filter(isOpen);const closedish=list.filter(f=>f.status===ST.closed||f.status===ST.verified);
  const dur=closedish.map(f=>f.closedAt&&f.raised?(new Date(f.closedAt)-new Date(f.raised))/864e5:null).filter(x=>x!==null&&x>=0);
  return {total:list.length,open:open.length,overdue:open.filter(isOverdue).length,dueWeek:open.filter(f=>{const n=daysTo(f.due);return n!==null&&n>=0&&n<=7}).length,
    toVerify:list.filter(f=>f.status===ST.closed).length,verified:list.filter(f=>f.status===ST.verified).length,spot:list.filter(f=>f.status===ST.spot).length,
    highOpen:open.filter(f=>f.level==="High"||f.level==="Critical").length,avgClose:dur.length?Math.round(dur.reduce((a,b)=>a+b,0)/dur.length*10)/10:null}}

/* ---------- changes (close-out / verify / re-open / edit) ---------- */
function queueUpdate(u){const q=lsJ("fupd",[]);q.push({...u,id:"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),at:Date.now()});ls("fupd",JSON.stringify(q));return flushUpdates()}
let FLUSH_UPD=false;
async function flushUpdates(){if(FLUSH_UPD||!directOn()||navigator.onLine===false)return;const q=lsJ("fupd",[]);if(!q.length)return;
  if(await relayVersion()<3)return;FLUSH_UPD=true;
  try{for(const u of q){let r;try{r=await relayPost({payload:{action:"finding",fid:u.fid,op:u.op,by:u.by,note:u.note,owner:u.owner,ownerEmail:u.ownerEmail,due:u.due,photo:u.photo,pin:ls("mgrPin")||""}},false)}catch(e){break}
      const rest=lsJ("fupd",[]).filter(x=>x.id!==u.id);
      if(r&&r.ok){ls("fupd",JSON.stringify(rest));if(r.finding){const i=(REG.findings||[]).findIndex(f=>f.fid===r.finding.fid);if(i>=0)REG.findings[i]=r.finding;else(REG.findings=REG.findings||[]).push(r.finding);ls("reg",JSON.stringify(REG))}}
      else if(r&&/not found/i.test(r.error||"")&&Date.now()-u.at<3*864e5){/* report may still be in an Outbox – retry later */}
      else{ls("fupd",JSON.stringify(rest));toast(`Change not saved: ${(r&&r.error)||"unknown error"}`,5000)}}}
  finally{FLUSH_UPD=false;updateBadges()}}

function updateBadges(){const a=$("#bdgA");if(!a)return;const st=regStats(regAll());
  a.textContent=st.overdue;a.classList.toggle("hide",!st.overdue)}
