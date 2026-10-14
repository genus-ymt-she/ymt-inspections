"use strict";
/* ---------- draft model ---------- */
function newDraft(num){const t=tabByNum(num);const id="d"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const extra={};(t.extra||[]).forEach(l=>extra[l]="");
  if(t.weekStart){const n=new Date();const m=new Date(n.getFullYear(),n.getMonth(),n.getDate()-((n.getDay()+6)%7));extra[t.weekStart]=`${m.getFullYear()}-${pad(m.getMonth()+1)}-${pad(m.getDate())}`}
  return {id,tab:num,created:Date.now(),updated:Date.now(),
    details:{location:t.lockLocation||"",datetime:nowLocal(),crew:"",inspector:ls("inspector")||"",supervisor:"",extra,
      checks:t.checks?{"0|1":ls("inspector")||""}:undefined},
    answers:{},others:[],signature:"",reportId:""};}
function stats(d){const t=tabByNum(d.tab);const qs=allQ(t);const c={C:0,UA:0,NI:0,NA:0};let rated=0;
  qs.forEach(q=>{const a=d.answers[q.id];if(a&&a.r){c[a.r]++;rated++}});
  d.others.forEach(o=>{if(o.r)c[o.r]++});
  const ncs=nonCompliances(d);const snnN=ncs.filter(n=>n.snn.length).length;
  const den=c.C+c.UA+c.NI;return {...c,rated,total:qs.length,pct:den?Math.round(c.C/den*100):null,ncs,snnN}}
function nonCompliances(d){const t=tabByNum(d.tab);const out=[];
  allQ(t).forEach(q=>{const a=d.answers[q.id];if(a&&(a.r==="UA"||a.r==="NI"))out.push({id:q.id,text:q.text,ref:q.ref,snn:q.snn||[],...a,photos:a.photos||[]})});
  d.others.forEach((o,i)=>{if(o.r==="UA"||o.r==="NI")out.push({id:`${t.num}.X${i+1}`,text:"Additional hazard: "+(o.title||""),ref:"",snn:o.snn||[],...o,hazard:true,photos:o.photos||[]})});
  const w=n=>(n.r==="UA"?0:2)+(n.snn.length?0:1);const rs=n=>{const k=riskOf(n.cons,n.like);return k?k.score:0};return out.map((n,i)=>[n,i]).sort((x,y)=>w(x[0])-w(y[0])||rs(y[0])-rs(x[0])||x[1]-y[1]).map(x=>x[0])}
function ncComplete(a){if(!a.finding||!a.finding.trim())return false;if(!a.action||!a.action.trim())return false;if(a.hazard&&!riskOf(a.cons,a.like))return false;
  if(a.closed===true)return !!(a.taken&&a.taken.trim());return a.closed===false}
function problems(d){const p=[];const t=tabByNum(d.tab);if(t.kind==="record")return recProblems(d);if(t.kind==="fuel")return fuelProblems(d);if(t.kind==="take5")return t5Problems(d);
  if(!d.details.location.trim())p.push("Inspection location / work front");
  if(t.narrative)t.narrative.fields.forEach(f=>{if(f.req&&!((d.details.narr||{})[f.key]||"").trim())p.push(`Observation record – ${f.label}`)});
  if(t.overall&&t.overall.req&&!d.details.overall)p.push(t.overall.label);
  if(!d.details.inspector.trim())p.push("Inspector name");
  const un=allQ(t).filter(q=>!(d.answers[q.id]&&d.answers[q.id].r));if(un.length)p.push(`${un.length} item(s) not rated`);
  const inc=nonCompliances(d).filter(n=>!ncComplete(n));if(inc.length)p.push(`${inc.length} non-compliance(s) missing finding / corrective action / closed status (other hazards also need a risk rating)`);
  {const bad=nonCompliances(d).filter(n=>n.closed===false&&n.ownerEmail&&!emailOK(n.ownerEmail));if(bad.length)p.push(`${bad.length} responsible person email(s) look wrong – check or clear them`)}
  d.others.forEach((o,i)=>{if(!o.r||!(o.title||"").trim())p.push(`Additional hazard ${i+1} needs a description and rating`)});
  if(t.checks){const C=t.checks;const done=checkDone(d);
    C.cols.forEach((col,c)=>{if(checkStarted(d,c)&&!done[c]){const miss=[];if(!chkVal(d,c,0))miss.push("time");if(!chkVal(d,c,1))miss.push("inspected by");
      (C.photos||[]).forEach((_,k)=>{if(!chkPhoto(d,c,k))miss.push(`photo – ${(C.photoShort||[])[k]||"photo "+(k+1)}`)});p.push(`${col} check missing: ${miss.join(", ")}`)}});
    if(!done.some(Boolean)&&!C.cols.some((_,c)=>checkStarted(d,c)))p.push(`Complete the ${C.cols[0]} or ${C.cols[1]} check – time, inspected by and ${(C.photos||[]).length} photos`)}
  if(t.log){const L=t.log;const st=L.cols.map((_,c)=>logState(d,c));
    st.forEach((x,c)=>{if(x==="part")p.push(`${L.cols[c]} – Part 1 daily log incomplete`)});
    if(!st.includes("done"))p.push("Part 1 daily log – complete at least one day")}
  return p}
function logVal(d,r,c){return ((d.details.log||{})[r+"|"+c]||"").trim()}
function logState(d,c){const t=tabByNum(d.tab);const n=t.log.rows.filter((_,r)=>logVal(d,r,c)).length;return n===0?"none":n===t.log.rows.length?"done":"part"}
function logWarnings(d){const t=tabByNum(d.tab);if(!t.log)return[];const w=[];t.log.rows.forEach((row,r)=>{if(!row.warnIf)return;t.log.cols.forEach((col,c)=>{if(logVal(d,r,c)===row.warnIf)w.push(`${col}: ${row.warn}`)})});return w}
function chkPhoto(d,c,k){return ((d.details.checkPhotos||{})[c+"|"+k])||null}
function checkStarted(d,c){const t=tabByNum(d.tab);return !!(chkVal(d,c,0)||chkVal(d,c,2)||(t.checks.photos||[]).some((_,k)=>chkPhoto(d,c,k)))}
function chkVal(d,c,r){return ((d.details.checks||{})[c+"|"+r]||"").trim()}
function checkDone(d){const t=tabByNum(d.tab);if(!t.checks)return[];return t.checks.cols.map((_,c)=>!!(chkVal(d,c,0)&&chkVal(d,c,1)&&(t.checks.photos||[]).every((_,k)=>chkPhoto(d,c,k))))}
let saveT=null;
function save(d,now){d.updated=Date.now();if(d._pinged!==undefined&&Date.now()-(d._pinged||0)>15*60*1000)queuePing(d,"draft");else if(d._pinged===undefined){d._pinged=Date.now()}clearTimeout(saveT);if(now)return dbPut("drafts",d);saveT=setTimeout(()=>dbPut("drafts",d),400)}

/* ---------- risk (5 x 5 matrix, see RISK in config.js) ---------- */
function riskOf(c,l){c=+c;l=+l;if(!(c>=1&&c<=5&&l>=1&&l<=5))return null;const score=RISK.matrix[l][c-1];const lv=RISK.levels.find(x=>score<=x.max)||RISK.levels[RISK.levels.length-1];
  return {score,level:lv.key,color:lv.color,ink:lv.ink||"#fff",days:lv.days,response:lv.response,cons:c,like:l,cl:RISK.consequence[c-1][1],ll:RISK.likelihood[l-1][1]}}
const riskText=k=>k?`${k.level} ${k.score} (${k.cl} / ${k.ll})`:"Not rated";
function riskLevel(key){return RISK.levels.find(x=>x.key===key)||null}
function riskChip(c,l,small){const k=riskOf(c,l);if(!k)return small?"":`<span class="risk none">Risk not rated</span>`;
  return `<span class="risk" style="--rc:${k.color};--ri:${k.ink}" title="${esc(k.response)}">${esc(k.level)}${small?"":` ${k.score}`}</span>`}
function levelChip(level){const lv=riskLevel(level);return lv?`<span class="risk" style="--rc:${lv.color};--ri:${lv.ink||"#fff"}">${esc(lv.key)}</span>`:""}

/* ---------- findings for the shared action register ---------- */
function findingsOf(d){const t=tabByNum(d.tab);if(t.kind==="record"||t.kind==="fuel"||t.kind==="take5")return [];const rid=reportId(d);
  return nonCompliances(d).map(n=>{const k=riskOf(n.cons,n.like)||{};return {fid:`${rid}|${n.id}`,item:n.id,text:n.text,rating:n.r,snn:snnNames(n.snn).join(" / "),
    cons:n.cons||"",like:n.like||"",score:k.score||"",level:k.level||"",finding:n.finding||"",action:n.action||"",status:n.closed?"spot":"open",
    owner:n.closed?"":(n.owner||""),ownerEmail:n.closed?"":String(n.ownerEmail||"").trim().toLowerCase(),due:n.closed?"":(n.due||""),taken:n.taken||""}})}
function reportFacts(d){const t=tabByNum(d.tab);const s=t.kind==="record"||t.kind==="fuel"||t.kind==="take5"?null:stats(d);
  return {c:s?s.C:"",na:s?s.NA:"",pct:s&&s.pct!==null?s.pct:"",inspDate:String(d.details.datetime||"").slice(0,16),crew:d.details.crew||"",supervisor:t.kind==="take5"?T5(d).sup||"":d.details.supervisor||""}}

/* written observation record (e.g. 24 Task Observation): [label, text] pairs that have content, plus the overall answer */
function narrRows(d){const t=tabByNum(d.tab);const n=d.details.narr||{};const rows=[];
  if(t.narrative)t.narrative.fields.forEach(f=>{const v=(n[f.key]||"").trim();if(v)rows.push([f.label,v])});
  if(t.overall&&d.details.overall)rows.push([t.overall.label.replace(/^Overall – /,"Overall – "),d.details.overall]);return rows}

/* suggested close-out: hazards use the Genus risk level; checklist items use the rating (UA today, NI 7 days) */
const NC_DAYS={UA:0,NI:7};
function suggestDays(a,hazard){const k=hazard?riskOf(a.cons,a.like):null;return k?{days:k.days,label:k.level}:{days:NC_DAYS[a.r]??7,label:a.r||"NI"}}
