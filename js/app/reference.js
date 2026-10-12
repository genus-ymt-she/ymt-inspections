"use strict";
/* ---------- Reference: Safety Non-Negotiables · Working near 330 kV · SDS (ChemAlert) ---------- */
const SNN_TITLE={FND:"Foundations",FFW:"Fitness for Work",VD:"Vehicles and Driving",EI:"Energy and Isolation",UU:"Underground Utilities",WAH:"Working at Height",TMP:"Working around Live Traffic and Mobile Plant",HL:"Hoisting and Lifting",CS:"Confined Spaces"};
function chemAlertHTML(){const u=appCfg().chemAlertUrl;
  return `<div class="card ref-chem">${u?`<a class="btn o w" href="${esc(u)}" target="_blank" rel="noopener external">${ic("ext","s")} SDS – ChemAlert</a>`:`<div class="alert org" style="margin:0">${ic("info")}<div><b>ChemAlert link not set – ask the SHE Manager</b></div></div>`}
    <p class="muted" style="margin:10px 2px 0">${esc(CHEMALERT_NOTE)}</p></div>`}
function referenceHTML(){return `<h2>Reference</h2><div class="ref-list">
   <button class="card tap" onclick="go('#alerts')"><span class="ti t-red">${ic("bell","l")}</span><span><b>SHEQ Alerts</b><small>${(()=>{const n=alUnread().length;return n?`${n} to read and acknowledge`:"Alerts, lessons learned and site notices"})()}</small></span>${ic("chev")}</button>
   <button class="card tap" onclick="go('#reference/snn')"><span class="ti t-accent"><img src="${SNN_ICONS.FND}" alt=""></span><span><b>Safety Non-Negotiables</b><small>The nine Genus SNNs and their rules</small></span>${ic("chev")}</button>
   <button class="card tap" onclick="go('#reference/330kv')"><span class="ti t-red">${ic("zap","l")}</span><span><b>Working near 330 kV lines</b><small>MADs, exclusion zones, permits, crossings</small></span>${ic("chev")}</button>
</div>${chemAlertHTML()}
  <div class="ref-more"><button class="chip" onclick="go('#traffic')">${ic("pin","s")} Traffic maps</button><button class="chip" onclick="go('#emergency/contacts')">${ic("phone","s")} Emergency contacts</button>
   <button class="chip" onclick="go('#emergency')">${ic("siren","s")} Response cards</button><button class="chip" onclick="go('#emergency')">${ic("users","s")} Muster points</button></div>`}
function viewReference(id){const back={icon:"back",aria:"Back",fn:()=>go(id?"#reference":"#home")};
  if(id==="snn"){setHeader("Safety Non-Negotiables","Genus – Think Safe. Work Safe. Home Safe.",back);
    render(`${SNN_CARDS.map((s,i)=>`<div class="card snn-card" style="--i:${i}"><div class="snn-h"><img src="${SNN_ICONS[s.c]}" alt=""><div><small>${esc(SNN_TITLE[s.c])}</small><b>${esc(s.head)}</b></div></div>
      <ul>${s.rules.map(([k,v])=>`<li>${k?`<b>${esc(k)}:</b> `:""}${esc(v)}</li>`).join("")}</ul></div>`).join("")}
     <p class="foot snn-foot">${esc(SNN_FOOTER)}</p><p class="foot">Source: Genus Safety Non-Negotiables booklet (GNP, web version).</p>`);return}
  if(id==="330kv"){setHeader(HV330.title,"Western Power 330 kV – treat as live",back);
    render(`<div class="alert red">${ic("zap")}<div><b>${esc(HV330.items[0])}</b></div></div>
     <div class="card hv-mad"><h3>Minimum Approach Distances</h3><img src="${HV330.madImg}" alt="Minimum Approach Distances" onclick="zoomImg(this.src,true)" onerror="this.outerHTML='<div class=&quot;hv-fallback&quot;>${esc(HV330.madFallback)}</div>'"></div>
     <div class="card"><ul class="hv-list">${HV330.items.slice(1).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
     <p class="foot">${esc(HV330.footer)}<br>Sources: ${esc(HV330.sources)}</p>`);return}
  if(id==="sds"){setHeader("SDS – ChemAlert","Safety data sheets",back);render(chemAlertHTML());return}
  setHeader("Reference","Site safety reference",{icon:"back",aria:"Back",fn:()=>go("#home")});render(referenceHTML())}
