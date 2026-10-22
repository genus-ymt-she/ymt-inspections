"use strict";
/* ---------- Lightning tracker (ERP J1084-HSE-PLN-YMT-0002 §10.2.1 – 30/30 rule) ----------
   The relay checks Xweather for strikes around the fixed YMT site point (no phone location) and pushes alerts through the
   free ntfy app when the level changes: WATCH (10–30 km), STOP (within 10 km), ALL CLEAR (30 min after the last strike
   within 10 km). This screen shows the level, a map of the last hour's strikes, what to do, and the storm log.
   It supports the 30/30 rule – it never replaces it. */
const LT_NTFY_IOS="https://apps.apple.com/app/ntfy/id1625396347",LT_NTFY_AND="https://play.google.com/store/apps/details?id=io.heckel.ntfy";
const ltData=()=>lsJ("ltn",null);
async function ltRefresh(){if(!directOn())return false;
  try{const r=await fetch(relayQ("action=lightning"),{redirect:"follow"});const j=await r.json();if(j.needCode){askSiteCode();return false}if(!j.ok)return false;
    const old=ls("ltn")||"";j.fetched=Date.now();ls("ltn",JSON.stringify(j));return old.replace(/,"fetched":\d+/,"")!==JSON.stringify(j).replace(/,"fetched":\d+/,"")}catch(e){return false}}
const ltMinsAgo=iso=>iso?Math.round((Date.now()-new Date(iso).getTime())/60000):null;
const ltTime=iso=>iso?new Date(iso).toLocaleTimeString("en-AU",{hour:"numeric",minute:"2-digit"}):"–";
/* what the screen shows: setup / nodata / quiet (outside hours) / clear / watch / stop */
function ltState(L){L=L||ltData();if(!L||!L.configured)return "setup";
  const ago=ltMinsAgo(L.lastOK);const ev=L.every||{calm:30,active:3};if(L.inHours&&(L.down||ago===null||ago>(L.active?ev.active:ev.calm)+10))return "nodata";if(!L.inHours&&L.level==="clear")return "quiet";return L.level||"clear"}
const LT_COPY={stop:["STOP – LIGHTNING WITHIN 10 KM","Cease all outdoor work and shelter now"],watch:["WATCH – LIGHTNING 10–30 KM","Prepare to stop work"],clear:["ALL CLEAR","No lightning within 30 km in the last 30 minutes"],
  nodata:["LIGHTNING DATA UNAVAILABLE","Use the 30/30 rule: thunder within 30 seconds of lightning = stop"],quiet:["TRACKER RESTS OVERNIGHT","Use the 30/30 rule outside tracker hours"],setup:["LIGHTNING TRACKER – BEING SET UP","Use the 30/30 rule until it is switched on"]};
const ltIsSup=()=>{const p=teamBy(ls("inspector")||"");return !!p&&/Supervisor|Manager|SHE|Director|Engineer/i.test(p.role||"")};
/* Home: a red / amber banner while lightning is close, and a reminder to turn alerts on */
function ltBannerHTML(){const L=ltData();const s=ltState(L);
  if(s==="stop")return `<button class="lt-banner stop" onclick="go('#lightning')">${ic("zap","l")}<span><b>LIGHTNING ${L.closest?`${esc(L.closest.km)} km ${esc(L.closest.dir)}`:"AT SITE"} – STOP outdoor work</b><small>All clear not before ${ltTime(L.allClearAt)} · tap for the map</small></span>${ic("chev")}</button>`;
  if(s==="watch")return `<button class="lt-banner watch" onclick="go('#lightning')">${ic("zap","l")}<span><b>Lightning ${L.closest?`${esc(L.closest.km)} km ${esc(L.closest.dir)}`:"nearby"} – prepare to stop</b><small>Lower EWPs and booms, finish hot work · tap for the map</small></span>${ic("chev")}</button>`;
  if(s==="nodata")return `<button class="lt-banner nodata" onclick="go('#lightning')">${ic("wifioff","l")}<span><b>Lightning data unavailable</b><small>Use the 30/30 rule until it is back</small></span>${ic("chev")}</button>`;
  if(L&&L.configured&&ls("ltnSub")!=="1"&&ls("ltnSubHide")!==todayISO())return `<div class="alert blue lt-sub">${ic("zap")}<div><b>Turn on lightning alerts</b> – get a loud alert on this phone when lightning is within 10 km of site. Takes 1 minute, no login.<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn o s" onclick="go('#lightning/alerts')">Set it up</button><button class="btn g s" onclick="ls('ltnSubHide',todayISO());this.closest('.lt-sub').remove()">Later</button></div></div></div>`;
  return ""}
function ltTileHTML(){const L=ltData();const s=ltState(L);const sub={stop:`STOP · ${L&&L.closest?esc(L.closest.km)+" km":"at site"}`,watch:`Watch · ${L&&L.closest?esc(L.closest.km)+" km":"nearby"}`,clear:"All clear",nodata:"Data unavailable",quiet:"Resting overnight",setup:"Being set up"}[s];
  return `<button class="tile wide lt-tile ${s}" onclick="go('#lightning')"><span class="ti">${ic("zap","l")}</span><span class="tw"><b>Lightning</b><small>${sub} · YMT site</small></span>${ic("chev")}</button>`}
/* map: site in the middle, north up, 10 / 30 km rings, strikes by distance and bearing, coloured by age */
function ltRadarSVG(L){const W=300,C=150,S=132/((L&&L.km&&L.km.range)||50);const K=(L&&L.km)||{stop:10,watch:30,range:50};
  const pt=x=>{const a=(x.brg-90)*Math.PI/180;return [C+Math.cos(a)*x.km*S,C+Math.sin(a)*x.km*S]};
  const dots=((L&&L.strikes)||[]).slice().sort((a,b)=>b.age-a.age).map(x=>{const [px,py]=pt(x);const c=x.age<10?"var(--ua)":x.age<30?"var(--ni)":"var(--muted)";return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${x.age<10?4.5:3.5}" fill="${c}" opacity="${x.age<30?1:.55}"/>`}).join("");
  return `<svg class="lt-radar" viewBox="0 0 ${W} ${W+16}" role="img" aria-label="Lightning strikes in the last hour around the YMT site, with 10 and 30 km rings">
   <circle cx="${C}" cy="${C}" r="${K.range*S}" fill="var(--surface-2)" stroke="var(--line)"/>
   <circle cx="${C}" cy="${C}" r="${K.watch*S}" fill="none" stroke="var(--ni)" stroke-width="2" stroke-dasharray="5 5"/>
   <circle cx="${C}" cy="${C}" r="${K.stop*S}" fill="color-mix(in srgb,var(--ua) 12%,transparent)" stroke="var(--ua)" stroke-width="2"/>
   <text x="${C}" y="${C-K.stop*S-4}" text-anchor="middle" class="lt-rl" fill="var(--ua)">${K.stop} km</text><text x="${C}" y="${C-K.watch*S-4}" text-anchor="middle" class="lt-rl" fill="var(--ni)">${K.watch} km</text>
   <text x="${C}" y="14" text-anchor="middle" class="lt-rl" fill="var(--muted)">N</text>${dots}
   <rect x="${C-7}" y="${C-7}" width="14" height="14" rx="3" fill="var(--brand)" stroke="#fff" stroke-width="2"/><text x="${C+11}" y="${C+16}" class="lt-rl" fill="var(--ink)">YMT site</text>
   <g class="lt-key"><circle cx="12" cy="${W+8}" r="4" fill="var(--ua)"/><text x="20" y="${W+12}">under 10 min</text><circle cx="108" cy="${W+8}" r="4" fill="var(--ni)"/><text x="116" y="${W+12}">10–30 min</text><circle cx="196" cy="${W+8}" r="4" fill="var(--muted)" opacity=".55"/><text x="204" y="${W+12}">30–60 min</text></g></svg>`}
/* Lightning protocol by distance – ERP J1084-HSE-PLN-YMT-0002 §10.2.1 wording; the 10–30 km band is the PARRON early warning (not an ERP trigger) */
const LT_PROTO=[
 {k:"clear",band:"More than 30 km – monitor",tag:"ERP §10.2",lead:"Normal work.",items:[
   "Monitor BoM / MetEye and this tracker, more often when severe weather is forecast.",
   "On detection of lightning by sight, sound, or BoM/MetEye advisory, the 30/30 rule applies."]},
 {k:"watch",band:"10–30 km – WATCH",tag:"PARRON early warning",lead:"Prepare to stop.",items:[
   "Plan to lower EWP baskets and booms, and finish or make safe hot work and refuelling.",
   "Know where your crew will shelter: hard-roof vehicles, site offices or substantial buildings.",
   "Watch and listen: thunder within 30 seconds of lightning means the storm is within 10 km – stop now, whatever the tracker shows."]},
 {k:"stop",band:"Within 10 km – STOP",tag:"ERP §10.2.1",lead:"Cease all outdoor work immediately.",items:[
   "If thunder is heard within 30 seconds of seeing lightning, the storm is within 10 km — cease all outdoor work immediately.",
   "Cessation triggers: all work at heights, EWP work (lower basket and exit), crane lifting (boom down, secure), energised electrical work, any work on or near metallic structures (330kV gantry, lattice towers, fencing), refuelling, hot work.",
   "EWP operators with personnel at height: lower the basket immediately using primary controls; if controls unresponsive due to electrical interference, use the emergency descent device.",
   "Personnel shelter inside hard-roof vehicles, site offices, or substantial buildings — never under isolated trees, towers, or in open ground.",
   "Tap “I'm sheltered” in PARRON so your Supervisor knows you are safe."]},
 {k:"resume",band:"All clear – resuming work",tag:"ERP §10.2.1",lead:"Wait 30 minutes.",items:[
   "Work may resume only when 30 minutes have elapsed after the last thunder is heard (or the last strike within 10 km).",
   "Every new strike within 10 km, or thunder heard, restarts the 30 minutes – tap “I heard thunder” in PARRON.",
   "Supervisors confirm the restart in PARRON before crews return to work."]}];
function ltProtoHTML(s){const cur=s==="stop"?"stop":s==="watch"?"watch":s==="clear"?"clear":"";
  return `<h2>Lightning protocol</h2><div class="lt-proto">${LT_PROTO.map(p=>`<details class="lt-pb ${p.k} ${p.k===cur?"cur":""}" ${p.k===cur||(cur===""&&p.k==="stop")?"open":""}><summary><span class="lt-pk"></span><span class="lt-pt"><b>${esc(p.band)}</b><small>${esc(p.lead)} · ${esc(p.tag)}</small></span>${p.k===cur?'<span class="lt-now">NOW</span>':""}${ic("down","s")}</summary><ul>${p.items.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details>`).join("")}</div>`}

let LT_TIMER=null;
async function viewLightning(sub){const seq=ROUTE_SEQ;setHeader("Lightning","YMT site · ERP §10.2.1",{icon:"back",aria:"Back",fn:()=>go("#home")});
  ltDraw(sub);clearInterval(LT_TIMER);LT_TIMER=setInterval(()=>{if(!/^#lightning/.test(location.hash)){clearInterval(LT_TIMER);return}ltRefresh().then(ch=>{if(ch&&!stale(seq))ltDraw()})},60000);
  if(await ltRefresh()&&!stale(seq))ltDraw(sub)}
function ltDraw(sub){const L=ltData();const s=ltState(L);const [t1,t2]=LT_COPY[s];const me=ls("inspector")||"";
  let h=`<div class="lt-state ${s}"><b>${esc(t1)}</b><span>${esc(t2)}</span>${s==="stop"&&L.allClearAt?`<div class="lt-clk"><small>All clear not before</small><strong>${ltTime(L.allClearAt)}</strong><small>${Math.max(0,-ltMinsAgo(L.allClearAt))} min · restarts with every strike within 10 km</small></div>`:""}</div>`;
  if(L&&L.configured){h+=ltRadarSVG(L);
    const n10=(L.strikes||[]).filter(x=>x.km<=L.km.stop&&x.age<=30).length,n30=(L.strikes||[]).filter(x=>x.km<=L.km.watch&&x.age<=30).length;
    h+=`<div class="card"><dl class="kv">${L.closest?`<dt>Closest strike (30 min)</dt><dd><b>${esc(L.closest.km)} km ${esc(L.closest.dir)}</b> · ${ltTime(L.closest.at)}</dd>`:""}<dt>Within 10 km</dt><dd>${n10} in the last 30 min</dd><dt>Within 30 km</dt><dd>${n30} in the last 30 min</dd>
      <dt>Checked</dt><dd>${L.lastCheck?`${ltTime(L.lastCheck)} (${ltMinsAgo(L.lastCheck)} min ago)`:"–"} · ${L.active?`every ${(L.every||{}).active||3} min while lightning is around`:`every ${(L.every||{}).calm||30} min when calm, every ${(L.every||{}).active||3} min once lightning is within 30 km`}</dd><dt>Tracker hours</dt><dd>${pad(L.hours[0])}:00 – ${pad(L.hours[1])}:00 (alerts in these hours)</dd></dl></div>`}
  if(s==="stop"||s==="watch")h+=ltProtoHTML(s);
  if(s==="stop"){const sh=L.sheltered||[];const mine=sh.some(n=>nameEq(n,me));
    h+=`<div class="card"><button class="btn ${mine?"g":"o"} w" ${mine?"disabled":""} onclick="ltPost('ltnShelter')">${ic("check","s")} ${mine?"You're marked as sheltered":"I'm sheltered – tell my Supervisor"}</button>
      <div class="muted" style="margin-top:8px">${sh.length?`<b>${sh.length} sheltered:</b> ${sh.map(esc).join(", ")}`:"Nobody has confirmed yet."}</div></div>`}
  if(L&&L.configured&&s!=="setup")h+=`<button class="btn g w lt-thunder" onclick="ltThunder()">${ic("zap","s")} I heard thunder – ${s==="stop"?"restart the 30 minutes":"stop work now"}</button>`;
  if(L&&L.lastStop&&s!=="stop"&&ltMinsAgo(L.lastStop.end)<=180){h+=`<div class="card"><b>Last stop</b> ${ltTime(L.lastStop.start)} – ${ltTime(L.lastStop.end)} (${L.lastStop.mins} min)<div class="muted" style="margin-top:4px">${L.restartBy?`Restart confirmed by ${esc(L.restartBy)}`:"Restart not yet confirmed by a Supervisor."}</div>
    ${!L.restartBy&&ltIsSup()?`<button class="btn o w" style="margin-top:10px" onclick="ltPost('ltnRestart')">${ic("check","s")} Confirm work has restarted</button>`:""}</div>`}
  if(s!=="stop"&&s!=="watch")h+=ltProtoHTML(s);
  h+=`<h2 id="lt-alerts">Alerts on this phone</h2>${ltAlertsHTML(L)}`;
  if(isManager()&&L&&L.configured)h+=`<button class="btn g w" onclick="ltTest()">${ic("bell","s")} Send a test alert to everyone</button>`;
  if(L&&L.log&&L.log.length)h+=`<h2>Storm log</h2><div class="card"><div class="lt-log">${L.log.map(e=>`<div><span>${new Date(e.at).toLocaleDateString("en-AU",{day:"numeric",month:"short"})} ${ltTime(e.at)}</span><b class="ev ${esc(String(e.event).toLowerCase().replace(/[^a-z]+/g,"-"))}">${esc(e.event)}</b><span>${e.km!==""&&e.km!=null?`${esc(e.km)} km ${esc(e.dir||"")}`:""}${e.by?` ${esc(e.by)}`:""}</span></div>`).join("")}</div></div>`;
  h+=`<div class="alert red">${ic("alert")}<div><b>This tracker supports the 30/30 rule – it does not replace it.</b> UHF Ch 24 and your Supervisor's direction come first. No network detects every strike: if you see lightning or hear thunder, stop work, whatever this screen shows.</div></div>
   <p class="foot">Lightning data: Xweather (Vaisala). Distances are measured from the YMT site point (Plus Code M83P+PRV) – your phone's location is not used.</p>`;
  render(h);if(sub==="alerts"){const e=$("#lt-alerts");if(e)e.scrollIntoView({block:"start"})}}
function ltAlertsHTML(L){const on=ls("ltnSub")==="1";const topic=L&&L.topic;
  if(!L||!L.configured)return `<div class="card muted">Alerts can be turned on once the SHE Manager has switched the tracker on.</div>`;
  return `<div class="card lt-setup ${on?"on":""}">${on?`<div class="lt-on">${ic("circlecheck")} <b>Alerts are on for this phone.</b></div>`:""}
    <ol class="steps"><li><b>Install the free “ntfy” app</b> – <a href="${LT_NTFY_IOS}" target="_blank" rel="noopener">iPhone</a> · <a href="${LT_NTFY_AND}" target="_blank" rel="noopener">Android</a>. No account or login.</li>
     <li><b>Subscribe to YMT lightning:</b> <a class="btn o s" href="ntfy://ntfy.sh/${esc(topic)}">Open in ntfy</a>. If that does nothing, open ntfy, tap <b>+</b> and paste the topic:<div class="lt-topic"><code>${esc(topic)}</code><button class="btn g s" onclick="copyText('${esc(topic)}','Topic')">${ic("copy","s")} Copy</button></div></li>
     <li><b>Allow notifications</b> when ntfy asks. On iPhone, also allow <i>Time Sensitive</i> alerts so they come through Focus / Do Not Disturb.</li></ol>
    <button class="btn ${on?"g":"o"} w" onclick="ls('ltnSub',${on?"''":"'1'"});ltDraw()">${on?"Turn the reminder back on":"Done – alerts are set up on this phone"}</button></div>`}
async function ltPost(action,extra){const me=(ls("inspector")||"").trim();if(!me&&action!=="ltnTest"){const n=await askName();if(!n)return}
  try{const r=await relayPost({payload:{action,name:ls("inspector")||"",...(extra||{})}},false);if(r&&r.ok){const j={...r};delete j.ok;j.fetched=Date.now();ls("ltn",JSON.stringify(j));toast(action==="ltnTest"?"Test alert sent":"Recorded",2500);ltDraw()}else toast((r&&r.error)||"Could not reach the relay – try again",4000)}
  catch(e){toast("No signal – use UHF Ch 24 and tell your Supervisor",4500)}}
async function ltThunder(){if(!await ask2("Thunder heard?","This starts a lightning STOP for everyone on site (or restarts the 30 minutes) and sends an alert.","Yes – I heard thunder",true))return;ltPost("ltnThunder")}
async function ltTest(){if(!await ask2("Send a test alert?","Everyone with lightning alerts on gets a message marked TEST.","Send test"))return;ltPost("ltnTest",{pin:ls("mgrPin")})}
/* Monthly figures: lightning stops and time stopped this month (from the storm log) */
function ltMonthHTML(m){const L=ltData();if(!L||!L.configured)return "";const x=(L.months||{})[m]||{stops:0,mins:0};
  return `<div class="card fg-lt"><span class="muted">Lightning stops</span><b>${x.stops}</b><small>${(x.mins/60).toFixed(1)} h stopped (ERP §10.2.1)</small></div>`}
