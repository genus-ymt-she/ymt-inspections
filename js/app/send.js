"use strict";
function downloadBlob(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},4000)}
/* PDF is prepared as soon as the review screen opens, so the share call happens
   directly inside the tap (phones refuse to open the share menu after a delay). */
let PDFFILE=null,SHARE_TEXT=true;
function setShareState(ready){const b=$("#bShare");if(!b||b.dataset.blocked)return;b.disabled=!ready;b.textContent=ready?(directOn()?"Send report":"Share PDF via Outlook"):"Preparing report…"}
function prepPDF(d){PDFFILE=null;setShareState(false);clearTimeout(prepPDF._t);prepPDF._t=setTimeout(async()=>{try{PDFBLOB=null;const b=await buildPDF(d);
  PDFFILE=new File([b],fileName(d),{type:"application/pdf"});setShareState(true)}catch(e){console.error(e);toast("Could not create the PDF");setShareState(true)}},200)}
function isMobile(){return !!((navigator.userAgentData&&navigator.userAgentData.mobile)||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent)))}
function copyAddr(){try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(recipient()).catch(()=>{})}catch(e){}}
function sendShare(){const d=CUR;if(!PDFFILE){toast("Report still being prepared – tap again in a moment");return}
  if(!(isMobile()&&navigator.canShare&&navigator.canShare({files:[PDFFILE]}))){sendOutlookLink();return}
  const data=SHARE_TEXT?{files:[PDFFILE],title:subject(d)}:{files:[PDFFILE]};
  let p;try{p=navigator.share(data)}catch(e){p=Promise.reject(e)}
  copyAddr();toast(`Tap Outlook, then paste ${recipient()} into To`,6000);
  p.then(()=>{d.shareUsed=true;save(d,true)}).catch(e=>{if(e&&e.name==="AbortError")return;console.error(e);
    if(SHARE_TEXT){SHARE_TEXT=false;toast("Tap Send via Outlook once more",5000)}else toast("Share menu not available – use the Backup button",6000)})}
function sendOutlookLink(){const d=CUR;const run=f=>{downloadBlob(f,fileName(d));copyAddr();
    const q=`?to=${encodeURIComponent(recipient())}&subject=${encodeURIComponent(subject(d))}&body=${encodeURIComponent(bodyText(d,1700))}`;
    const mailto=`mailto:${encodeURIComponent(recipient())}?subject=${encodeURIComponent(subject(d))}&body=${encodeURIComponent(bodyText(d,1700))}`;
    toast("PDF saved – attach it to the email before sending",6000);
    setTimeout(()=>{if(isMobile()){let left=false;const v=()=>{if(document.hidden)left=true};document.addEventListener("visibilitychange",v);
      location.href="ms-outlook://compose"+q;setTimeout(()=>{document.removeEventListener("visibilitychange",v);if(!left)location.href=mailto},1600)}else location.href=mailto},700)};
  if(PDFFILE)run(PDFFILE);else buildPDF(d).then(run).catch(e=>{console.error(e);toast("Could not create the PDF")})}
async function savePDF(){try{const blob=PDFFILE||await buildPDF(CUR);downloadBlob(blob,fileName(CUR));toast("PDF saved")}catch(e){console.error(e);toast("Could not create the PDF")}}
/* ---------- direct send (one tap) with Outbox ---------- */
function blobToB64(b){return new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(String(f.result).split(",")[1]);f.onerror=rej;f.readAsDataURL(b)})}
async function sendDirect(){const d=CUR;const b=$("#bShare");if(!PDFFILE){toast("Report still being prepared – tap again in a moment");return}
  if(b){b.disabled=true;b.innerHTML='<span class="sending"><span class="spin"></span>Sending…</span>'}
  try{const t=tabByNum(d.tab);const s=stats(d);
    const REC=t.kind==="record";const findings=findingsOf(d),report=reportFacts(d);findings.forEach(f=>rememberContact(f.owner,f.ownerEmail));
    const item={id:d.id,queuedAt:Date.now(),tries:0,title:`${pad(t.num)} – ${t.short}`,reportId:reportId(d),location:d.details.location,ua:REC?0:s.UA,ni:REC?0:s.NI,snn:REC?0:s.snnN,no:pad(t.num),inspector:d.details.inspector,findings,report,
      payload:{uid:d.id,meta:pingMeta(d),reportId:reportId(d),to:recipient(),subject:subject(d),text:bodyText(d),html:htmlBody(d),filename:fileName(d),pdf:await blobToB64(PDFFILE),report,findings,alert:alertInfo(d),targets:teamTargets()}};
    await dbPut("outbox",item);await dbDel("drafts",d.id);{const q=getPings();if(q[d.id]){q[d.id].state="outbox";ls("pings",JSON.stringify(q))}else queuePing(d,"outbox")}
    const r=await sendItem(item);
    if(r.ok){toast("✓ Report sent to the SHE Manager",4500)}else toast("No connection – report saved in the Outbox and will send automatically",6500);
    go("#home")}catch(e){console.error(e);toast("Could not send – report kept. Try again or use Other ways to send",6500);if(b){b.disabled=false;b.textContent="Send report"}}}
async function relayPost(item,noCors){const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),60000);
  try{const r=await fetch(RELAY.url,{method:"POST",body:JSON.stringify({...item.payload,key:RELAY.key}),signal:ctl.signal,redirect:"follow",...(noCors?{mode:"no-cors"}:{})});
    if(noCors)return {ok:true,unconfirmed:true};const j=await r.json().catch(()=>({ok:false,error:"Bad reply"}));return j}finally{clearTimeout(tm)}}
async function sendItem(item){if(!directOn())return {ok:false,error:"Direct send not set up"};
  if(navigator.onLine===false)return {ok:false,error:"Offline"};
  let res;try{res=await relayPost(item,false)}catch(e){
    // CORS-blocked replies still deliver the email; a second no-cors attempt is safe because the relay ignores duplicates.
    if(e&&e.name!=="AbortError"&&navigator.onLine!==false){try{res=await relayPost(item,true)}catch(e2){res={ok:false,error:String(e2)}}}else res={ok:false,error:String(e)}}
  if(res&&res.ok){await dbPut("sent",{id:item.id,reportId:item.reportId,title:item.title,location:item.location,sentAt:Date.now(),ua:item.ua,ni:item.ni,snn:item.snn,via:res.unconfirmed?"direct*":"direct",
      no:item.no,inspector:item.inspector,findings:item.findings||[],report:item.report||{},pdfLink:res.pdf||""});
    await dbDel("outbox",item.id);await loadLocalSent();REG.at=0;updateBadges();return res}
  item.tries=(item.tries||0)+1;item.lastError=(res&&res.error)||"Unknown";item.lastTry=Date.now();await dbPut("outbox",item);return res||{ok:false}}
let FLUSHING=false;
async function flushOutbox(manual){await flushPings();if(FLUSHING)return;FLUSHING=true;let sent=0,left=0;
  try{const items=await dbAll("outbox");for(const it of items){const r=await sendItem(it);r.ok?sent++:left++}}finally{FLUSHING=false}
  if(sent)toast(`✓ ${sent} report(s) from the Outbox sent`,4000);else if(manual&&left)toast("Still no connection – will keep trying",4000);
  if(sent&&(location.hash||"#home")==="#home")viewHome();return {sent,left}}

async function markSent(){const d=CUR;if(!await ask2("Close this inspection?","Confirm the report has been sent another way. The inspection is closed on this phone and its open items go on the Action register.","Close inspection"))return;const t=tabByNum(d.tab);const s=stats(d);const REC=t.kind==="record";
  const findings=findingsOf(d),report=reportFacts(d);findings.forEach(f=>rememberContact(f.owner,f.ownerEmail));
  await dbPut("sent",{id:d.id,reportId:reportId(d),title:`${pad(t.num)} – ${t.short}`,location:d.details.location,sentAt:Date.now(),ua:REC?0:s.UA,ni:REC?0:s.NI,snn:REC?0:s.snnN,no:pad(t.num),inspector:d.details.inspector,findings,report});
  await dbDel("drafts",d.id);queuePing(d,"sent",{reportId:reportId(d),report,findings});await loadLocalSent();updateBadges();toast("Inspection closed");go("#home")}
