"use strict";
/* ---------- Emergency Management + Traffic Management (bottom tabs) ----------
   Content lives in js/data/emergency.js (verbatim from the ERP and TARP). Everything here – text, the DRSABCD chart and the
   site maps – is in the offline cache, so it opens with no signal once PARRON has been opened online. */
const telOf=p=>String(p).replace(/[^\d+]/g,"");
function callBtn(p,label,cls){return `<a class="callbtn ${cls||""}" href="tel:${telOf(p)}">${ic("phone","s")} ${esc(label||p)}</a>`}
function viewEmergency(sub,id){
  if(sub==="card")return emCard(id);if(sub==="contacts")return emContacts();if(sub==="tarp")return emTarp();
  setHeader("Emergency Management","YMT – works offline",null);const S=EMERG.site;
  let h=`<section class="em-hero"><div class="em-h">${ic("siren","l")}<div><b>In an emergency</b><span>Make the area safe, raise the alarm, then call for help.</span></div></div>
    <a class="em-000" href="tel:000">${ic("phone","l")}<span><b>Call 000</b><small>Police · Fire · Ambulance</small></span></a>
    <div class="em-uhf">${ic("radio","s")} <span>${esc(S.alarm)}</span></div></section>`;
  h+=`<h2>Site location for 000 calls</h2><div class="card em-loc"><b>${esc(S.address)}</b><div class="muted">${esc(S.directions)}</div>
    <div class="em-codes"><button onclick="copyText('${esc(S.plus)}','Plus Code')"><small>Plus Code</small><b>${esc(S.plus)}</b>${ic("copy","s")}</button><button onclick="copyText('${esc(S.gps)}','GPS')"><small>GPS</small><b>${esc(S.gps)}</b>${ic("copy","s")}</button></div>
    <a class="btn g w" href="https://www.google.com/maps/search/?api=1&query=${S.lat},${S.lon}" target="_blank" rel="noopener">${ic("pin","s")} Open in Maps</a>
    <dl class="kv"><dt>Meet emergency services at</dt><dd>${esc(S.meet)}</dd><dt>Ambulance</dt><dd>${esc(S.ambulance)}</dd></dl></div>`;
  h+=`<h2>Emergency situation cards</h2><div class="em-grid">${EMERG.cards.map((c,i)=>`<button class="em-tile em-${c.id}" style="--i:${i}" onclick="go('#emergency/card/${c.id}')"><span class="ti">${ic(c.icon,"l")}</span><b>${esc(emTitle(c))}</b></button>`).join("")}</div>`;
  h+=`<h2>Muster points</h2><div class="card"><ul class="em-list">${S.muster.map(m=>`<li>${esc(m)}</li>`).join("")}</ul>
    ${EMERG.evac?`<img class="em-evac" src="${EMERG.evac}" alt="Site office evacuation and muster diagram" onclick="zoomImg(this.src,true)"><div class="muted">Tap the diagram to enlarge.</div>`:`<div class="muted">${ic("info","s")} The site office evacuation diagram will be added here.</div>`}</div>`;
  h+=`<div class="em-links"><button class="card tap" onclick="go('#lightning')"><span class="ti t-amber">${ic("zap","l")}</span><span><b>Lightning tracker</b><small>Live strikes around YMT · 10 km STOP · alerts on your phone</small></span>${ic("chev")}</button><button class="card tap" onclick="go('#emergency/contacts')"><span class="ti t-red">${ic("phone","l")}</span><span><b>Emergency contacts</b><small>Hospitals, police, regulators, utilities – tap to call</small></span>${ic("chev")}</button>
    <button class="card tap" onclick="go('#emergency/tarp')"><span class="ti t-amber">${ic("cloud","l")}</span><span><b>Adverse Weather &amp; Site Access TARP</b><small>Levels 1–4 · triggers, response, authority</small></span>${ic("chev")}</button></div>`;
  h+=`<details class="card em-when"><summary><b>When to dial 000</b></summary><ol>${S.when000.map(q=>`<li>${esc(q)}</li>`).join("")}</ol><p>${esc(S.when000note)}</p></details>
   <p class="foot">${esc(S.source)}<br>Situation cards: J1084-HSE-PLN-YMT-0002 Appendix B. Always follow the controlled ERP and the direction of the Chief Warden.</p>`;
  render(h)}
const emTitle=c=>c.title.replace(/\s*\/\s*$/,"");
function emBullets(paras){let h="";paras.forEach(([lv,t])=>{h+=lv?`<div class="eb lv${lv}">${esc(t)}</div>`:`<div class="eh">${esc(t)}</div>`});return h}
function emCard(id){const c=EMERG.cards.find(x=>x.id===id);if(!c)return go("#emergency");
  setHeader(emTitle(c),c.sub||"Emergency situation card",{icon:"back",aria:"Back to Emergency",fn:()=>go("#emergency")});
  let h=`<div class="em-cardh em-${c.id}"><span class="ti">${ic(c.icon,"l")}</span><div><b>${esc(emTitle(c))}</b>${c.sub?`<span>${esc(c.sub)}</span>`:""}</div></div>
   <a class="em-000 sm" href="tel:000">${ic("phone","s")}<span><b>Call 000</b></span></a>`;
  if(c.image)h+=`<div class="card"><img class="em-evac" src="${c.image}" alt="${esc(c.title)}" onclick="zoomImg(this.src,true)"><div class="muted">Tap to enlarge.</div></div>`;
  c.tables.forEach(t=>{const three=t.head.length===3;
    t.rows.forEach(r=>{const act=three?r[1]:r[0],resp=three?r[2]:r[1],lab=three?(r[0]||[]).map(x=>x[1]).join(" "):"";
      h+=`<div class="card em-step">${lab?`<div class="em-lab">${esc(t.head[0])}: <b>${esc(lab)}</b></div>`:""}${emBullets(act||[])}
       ${(resp||[]).length?`<div class="em-resp">${ic("user","s")} <span>${esc(resp.map(x=>x[1]).join(" / "))}</span></div>`:""}</div>`})});
  h+=`<p class="foot">Source: ${esc(c.source||"")}</p>`;render(h)}
function emContacts(){setHeader("Emergency contacts","Tap a number to call",{icon:"back",aria:"Back to Emergency",fn:()=>go("#emergency")});
  let h=`<div class="search">${ic("search")}<input id="emq" type="search" placeholder="Search e.g. hospital, Western Power, poisons" autocomplete="off" aria-label="Search contacts"></div>
   <div class="alert blue">${ic("info")}<div>Genus project contacts (Chief Warden, Deputies, SHE) are on the <b>Emergency Response Board</b> and the project Communication Matrix – they are not shown here because PARRON is a public link.</div></div><div id="emc"></div>`;
  render(h);const draw=()=>{const q=($("#emq").value||"").trim().toLowerCase();
    $("#emc").innerHTML=EMERG.contacts.map(g=>{const items=g.items.filter(x=>!q||[g.group,x.name,x.detail,x.phone].join(" ").toLowerCase().includes(q));if(!items.length)return "";
      return `<h2>${esc(g.group)}</h2>${g.note?`<div class="muted" style="margin:0 4px 8px">${esc(g.note)}</div>`:""}<div class="card em-contacts">${items.map(x=>x.url?`<a class="callrow" href="${esc(x.url)}" target="_blank" rel="noopener"><span><b>${esc(x.name)}</b>${x.detail?`<small>${esc(x.detail)}</small>`:""}</span><em>${ic("ext","s")} Open</em></a>`
        :`<a class="callrow ${x.hl?"hl":""}" href="tel:${telOf(x.phone)}"><span><b>${esc(x.name)}</b>${x.detail?`<small>${esc(x.detail)}</small>`:""}</span><em>${ic("phone","s")} ${esc(x.phone)}</em></a>`).join("")}</div>`}).join("")||`<div class="card empty">${ic("search")}<b>No contacts match</b></div>`};
  $("#emq").addEventListener("input",draw);draw()}
function emTarp(){const T=EMERG.tarp;setHeader("Adverse Weather TARP",T.doc,{icon:"back",aria:"Back to Emergency",fn:()=>go("#emergency")});
  const li=a=>`<ul class="em-list">${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
  let h=`<div class="band"><b>${esc(T.title)}</b>${esc(T.scope)}</div><div class="alert red">${ic("alert")}<div><b>${esc(T.banner)}</b></div></div>
   ${T.levels.map(l=>`<details class="card tarp" style="--lc:${l.color}" ${l.n===1?"":""}><summary><span class="lvl">${l.n}</span><b>${esc(l.name)}</b>${ic("down","s")}</summary>
    <div class="tl">Triggers – any one of:</div>${li(l.triggers)}<div class="tl">Required response</div>${li(l.response)}<div class="tl">Authority</div><p>${esc(l.authority)}</p></details>`).join("")}
   <h2>Standing down a level</h2><div class="card">${li(T.standdown)}</div>
   <div class="alert org">${ic("shield")}<div><b>If in doubt:</b> ${esc(T.doubt)}</div></div><p class="foot">${esc(T.doc)} · read with J1084-HSE-PRO-YMT-0002</p>`;
  render(h)}
/* ---------- Traffic Management: site layout maps ---------- */
function viewTraffic(id){const m=id&&TRAFFIC_MAPS.find(x=>x.id===id);
  if(m){setHeader(m.title,"Traffic management",{icon:"back",aria:"Back to maps",fn:()=>go("#traffic")});
    render(`<div class="card tmap-full"><img src="${m.file}" alt="${esc(m.title)}"><div class="muted" style="margin-top:8px">${esc(m.note)}</div><button class="btn g w" style="margin-top:10px" onclick="zoomImg('${m.file}',true)">${ic("search","s")} Full screen – pinch to zoom</button></div>`);return}
  setHeader("Traffic Management","Site layout, routes and signage",null);
  render(`<div class="alert blue">${ic("radio")}<div><b>UHF Channel 24.</b> Follow the posted speed limits, one-way routes and give-way / stop control shown on the maps. Maps work offline.</div></div>
   <div class="tmaps">${TRAFFIC_MAPS.map((x,i)=>`<button class="card tap tmap" style="--i:${i}" onclick="go('#traffic/${x.id}')"><img src="${x.file}" alt="" loading="lazy"><span><b>${esc(x.title)}</b><small>${esc(x.note)}</small></span></button>`).join("")}</div>`)}
