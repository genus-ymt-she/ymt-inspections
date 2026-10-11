"use strict";
function reportId(d){if(d.reportId)return d.reportId;const dt=new Date(d.details.datetime||Date.now());
  d.reportId=`YMT-${pad(d.tab)}-${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}-${pad(dt.getHours())}${pad(dt.getMinutes())}-${initials(d.details.inspector)}`;save(d);return d.reportId}
function fileName(d){const t=tabByNum(d.tab);return `${reportId(d)}_${t.short.replace(/[^A-Za-z0-9]+/g,"_").replace(/_+$/,"")}.pdf`}
function subject(d){const t=tabByNum(d.tab);const s=stats(d);
  if(t.kind==="fuel")return fuelSubject(d);
  if(t.kind==="record"){const r=R(d);return `YMT Discussion Record | ${t.short} | ${fmtDT(d.details.datetime).slice(0,10)} | with ${r.with||"-"} | by ${d.details.inspector}${r.raise==="Yes"?" | RAISE WITH SPONSOR":""}`}
  return `YMT Inspection | ${pad(t.num)} ${t.short} | ${fmtDT(d.details.datetime).slice(0,10)} | ${d.details.location} | ${s.UA} UA / ${s.NI} NI${s.snnN?` | ⚠ ${s.snnN} SNN`:""}`}
function bodyText(d,limit){if(tabByNum(d.tab).kind==="record"||tabByNum(d.tab).kind==="fuel"){let x=tabByNum(d.tab).kind==="fuel"?fuelBodyText(d):recBodyText(d);if(limit&&x.length>limit)x=x.slice(0,limit-60)+"\n…\n(Shortened – full record in the attached PDF.)";return x}const t=tabByNum(d.tab);const s=stats(d);const D=d.details;const L=[];
  const HR="━━━━━━━━━━━━━━━━━━━━━━━━━━━━",hr="──────────────────────────────";
  const st=n=>n.closed?"CLOSED":"OPEN";const rkT=n=>riskText(riskOf(n.cons,n.like));
  L.push(`PARRON | SITE INSPECTION REPORT`);
  L.push(`${pad(t.num)} – ${t.title.replace(/^\d+\s–\s/,"")}`);
  L.push(HR);L.push("");
  L.push("INSPECTION DETAILS");
  L.push(`• Report ID: ${reportId(d)}`);
  L.push(`• Date / time: ${fmtDT(D.datetime)}`);
  L.push(`• Location: ${D.location}`);
  L.push(`• Inspector: ${D.inspector}`);
  L.push(`• Supervisor: ${D.supervisor||"-"}`);
  L.push(`• Contractor / crew: ${D.crew||"-"}`);
  Object.entries(D.extra||{}).forEach(([k,v])=>{if(v)L.push(`• ${k.replace(/:$/,"")}: ${v}`)});
  if(t.fixed)t.fixed.forEach(f=>{if(!/^(Company|Project|Principal|Job|Area)/.test(f[0]))L.push(`• ${f[0]}: ${f[1]}`)});
  if(t.log){const Lg=t.log;Lg.cols.forEach((col,c)=>{if(logState(d,c)!=="none")L.push(`• ${col}: ${Lg.rows.map((row,r)=>`${row.no} ${logVal(d,r,c)||"-"}`).join(" | ")}`)});logWarnings(d).forEach(w=>L.push(`⚠ ${w}`))}
  {const vr=visualPhotos(d).length;if(vr)L.push(`• Visual record photos (compliant items): ${vr} (in PDF)`)}
  if(t.checks)t.checks.cols.forEach((c,i)=>L.push(`• ${c}: ${chkVal(d,i,0)||"not recorded"}${chkVal(d,i,1)?` – ${chkVal(d,i,1)}`:""}${chkVal(d,i,2)?` – ${chkVal(d,i,2)}`:""}${(t.checks.photos||[]).filter((_,k)=>chkPhoto(d,i,k)).length?` – ${(t.checks.photos||[]).filter((_,k)=>chkPhoto(d,i,k)).length} timestamped photos (in PDF)`:""}`));
  {const nr=narrRows(d);if(nr.length){L.push("");L.push("OBSERVATION RECORD");nr.forEach(r=>{L.push(`${r[0]}:`);L.push(r[1])})}}
  L.push("");L.push("RESULT");
  L.push(`C ${s.C}  |  UA ${s.UA}  |  NI ${s.NI}  |  N/A ${s.NA}${s.pct!==null?`  |  ${s.pct}% compliant`:""}`);
  if(s.snnN)L.push(`⚠ SAFETY NON-NEGOTIABLE NON-COMPLIANCES: ${s.snnN} (${[...new Set(s.ncs.flatMap(n=>snnNames(n.snn)))].join(", ")})`);
  if(s.UA)L.push("UA recorded – task stopped / made safe; Supervisor and SHE Manager to be notified.");
  L.push("");
  if(!s.ncs.length){L.push(HR);L.push("NO NON-COMPLIANCES IDENTIFIED");L.push(HR)}
  else{
    const open=s.ncs.filter(n=>!n.closed).length;
    L.push(`SUMMARY – ${s.ncs.length} non-compliance(s): ${open} open, ${s.ncs.length-open} closed`);
    L.push("No. | Ref | Rating | Risk | Status | SNN");
    s.ncs.forEach((n,i)=>L.push(`${i+1} | ${n.id} | ${n.r} | ${(riskOf(n.cons,n.like)||{}).level||"-"} | ${st(n)} | ${n.snn.length?"⚠ "+snnNames(n.snn).join(" / "):"–"}`));
    L.push("");L.push(HR);L.push(`NON-COMPLIANCES FOR HAZARD REGISTER (${s.ncs.length})`);L.push(HR);
    s.ncs.forEach((n,i)=>{L.push("");
      L.push(`${i+1} of ${s.ncs.length}  |  ${n.id}  |  ${n.r==="UA"?"UA – Unacceptable":"NI – Needs improvement"}  |  ${st(n)}`);
      if(n.snn.length)L.push(`⚠ Safety Non-Negotiable: ${snnNames(n.snn).join(" / ")}`);
      if(riskOf(n.cons,n.like))L.push(`Risk: ${rkT(n)}`);
      L.push(`Item: ${n.text}`);
      L.push(`Finding: ${n.finding}`);
      L.push(`Proposed corrective action: ${n.action}`);
      if(n.closed)L.push(`Status: CLOSED at time of inspection – action taken: ${n.taken}`);
      else L.push(`Status: OPEN  |  Responsible: ${n.owner||"TBC"}  |  Due: ${n.due?fmtD(n.due):"TBC"}`);
      if(n.photos.length)L.push(`Photos: ${n.photos.length} (see PDF)`);
      L.push(hr)})}
  L.push("");L.push("Completed form attached (PDF) – upload to MYOSH as a SHEQ Inspection. Open items are tracked in the PARRON Action register.");
  L.push(`Sent from PARRON v${CONFIG.appVersion} – Proactive Assessment, Reporting, Risk & Observation Network`);
  let txt=L.join("\n");if(limit&&txt.length>limit)txt=txt.slice(0,limit-80)+"\n…\n(Summary shortened – full detail in the attached PDF.)";return txt}

function visualPhotos(d){const t=tabByNum(d.tab);const out=[];allQ(t).forEach(q=>{const a=d.answers[q.id];if(a&&(a.r==="C"||a.r==="NA")&&(a.photos||[]).length)a.photos.forEach(p=>out.push({p,id:q.id}))});return out}
function htmlBody(d){if(tabByNum(d.tab).kind==="record")return recHtml(d);if(tabByNum(d.tab).kind==="fuel")return fuelHtml(d);const t=tabByNum(d.tab);const s=stats(d);const D=d.details;const e=esc;
  const td='style="border:1px solid #D0D5DD;padding:6px 8px;vertical-align:top;font-size:13px"';const th='style="border:1px solid #112B4E;background:#112B4E;color:#fff;padding:6px 8px;text-align:left;font-size:12px"';
  const pill=(txt,bg)=>`<span style="display:inline-block;background:${bg};color:#fff;font-weight:700;border-radius:4px;padding:2px 8px;font-size:12px">${e(txt)}</span>`;
  const rows=[["Report ID",reportId(d)],["Date / time",fmtDT(D.datetime)],["Location",D.location],["Inspector",D.inspector]];
  if(!(t.hideStd||[]).includes("supervisor"))rows.push(["Supervisor",D.supervisor||"-"]);if(!(t.hideStd||[]).includes("crew"))rows.push(["Contractor / crew",D.crew||"-"]);
  Object.entries(D.extra||{}).forEach(([k,v])=>{if(v)rows.push([k.replace(/:$/,""),v])});
  if(t.fixed)t.fixed.forEach(f=>{if(!/^(Company|Project|Principal|Job|Area)/.test(f[0]))rows.push(f)});
  if(t.log){t.log.cols.forEach((col,c)=>{if(logState(d,c)!=="none")rows.push([`Part 1 – ${col}`,t.log.rows.map((row,r)=>`${row.no} ${logVal(d,r,c)||"-"}`).join("  |  ")])})}
  {const vr=visualPhotos(d).length;if(vr)rows.push(["Visual record photos",`${vr} photo(s) of compliant items in the PDF`])}
  if(t.checks)t.checks.cols.forEach((c,i)=>rows.push([c,[chkVal(d,i,0)||"not recorded",chkVal(d,i,1),chkVal(d,i,2),(()=>{const n=(t.checks.photos||[]).filter((_,k)=>chkPhoto(d,i,k)).length;return n?n+" timestamped photos (in PDF)":""})()].filter(Boolean).join(" – ")]));
  let h=`<div style="font-family:Arial,Helvetica,sans-serif;color:#1B2430;max-width:860px">
  <div style="background:#112B4E;color:#fff;padding:12px 14px;border-bottom:4px solid #EC7723"><div style="font-size:12px;color:#EC7723;font-weight:700;letter-spacing:.06em">PARRON | SITE INSPECTION REPORT</div><div style="font-size:18px;font-weight:700">${e(t.title)}</div></div>
  <table style="border-collapse:collapse;margin:12px 0;width:100%">${rows.map(r=>`<tr><td ${td.replace('"',  '"background:#F2F4F7;font-weight:700;color:#112B4E;width:200px;')}>${e(r[0])}</td><td ${td}>${e(r[1])}</td></tr>`).join("")}</table>
  <p style="margin:8px 0">${pill(s.C+" C","#2E7D32")} ${pill(s.UA+" UA","#C62828")} ${pill(s.NI+" NI","#E39A00")} ${pill(s.NA+" N/A","#7A8594")} ${s.pct!==null?`<b style="color:#112B4E">&nbsp;${s.pct}% compliant</b>`:""}</p>`;
  if(s.snnN)h+=`<p style="background:#EC7723;color:#fff;padding:8px 10px;font-weight:700;margin:8px 0">⚠ SAFETY NON-NEGOTIABLE NON-COMPLIANCES: ${s.snnN} – ${e([...new Set(s.ncs.flatMap(n=>snnNames(n.snn)))].join(", "))}</p>`;
  logWarnings(d).forEach(w=>{h+=`<p style="background:#FDECEC;border:1px solid #C62828;color:#7A1414;padding:8px 10px;font-weight:700;margin:8px 0">⚠ ${e(w)}</p>`});
  if(s.UA)h+=`<p style="background:#FDECEC;border:1px solid #C62828;color:#7A1414;padding:8px 10px;font-weight:700;margin:8px 0">UA recorded – task stopped / made safe; Supervisor and SHE Manager to be notified.</p>`;
  {const nr=narrRows(d);if(nr.length)h+=`<h3 style="color:#112B4E;margin:16px 0 6px">Observation record</h3><table style="border-collapse:collapse;width:100%">${nr.map(r=>`<tr><td style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px;background:#F2F4F7;font-weight:700;color:#112B4E;width:200px;vertical-align:top">${e(r[0])}</td><td style="border:1px solid #D0D5DD;padding:6px 8px;font-size:13px;white-space:pre-wrap">${e(r[1])}</td></tr>`).join("")}</table>`}
  if(!s.ncs.length)h+=`<p style="font-weight:700;color:#2E7D32">No non-compliances identified.</p>`;
  else{h+=`<h3 style="color:#112B4E;margin:16px 0 6px">Non-compliances for Hazard Register (${s.ncs.length})</h3><table style="border-collapse:collapse;width:100%">
    <tr><th ${th}>#</th><th ${th}>Ref</th><th ${th}>Rating</th><th ${th}>Risk</th><th ${th}>Item / finding</th><th ${th}>Proposed corrective action</th><th ${th}>Status</th><th ${th}>SNN</th></tr>`;
    s.ncs.forEach((n,i)=>{h+=`<tr><td ${td}>${i+1}</td><td ${td}><b>${e(n.id)}</b></td><td ${td}>${pill(n.r,n.r==="UA"?"#C62828":"#E39A00")}</td><td ${td}>${(()=>{const k=riskOf(n.cons,n.like);return k?`<span style="display:inline-block;background:${k.color};color:${k.ink};font-weight:700;border-radius:4px;padding:2px 8px;font-size:12px">${e(k.level+" "+k.score)}</span>`:"–"})()}</td>
      <td ${td}>${e(n.text)}<br><b>Finding:</b> ${e(n.finding)}${n.photos.length?`<br><i>${n.photos.length} photo(s) in PDF</i>`:""}</td><td ${td}>${e(n.action)}</td>
      <td ${td}>${n.closed?`<b style="color:#2E7D32">CLOSED</b><br>${e(n.taken)}`:`<b style="color:#C62828">OPEN</b><br>${n.owner?"Responsible: "+e(n.owner)+"<br>":""}${n.due?"Due: "+fmtD(n.due):""}`}</td>
      <td ${td}>${n.snn.length?`<b style="color:#EC7723">⚠ ${e(snnNames(n.snn).join(" / "))}</b>`:"–"}</td></tr>`});
    h+=`</table>`}
  h+=`<p style="margin-top:14px">Completed form attached (PDF) – upload to MYOSH as a SHEQ Inspection.</p><p style="color:#5B6675;font-size:12px">Sent from PARRON v${e(CONFIG.appVersion)} – Proactive Assessment, Reporting, Risk &amp; Observation Network</p></div>`;
  return h}
