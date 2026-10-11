"use strict";
/* ---------- Site weather + official Fire Danger Rating (home screen) ----------
   Weather: Open-Meteo forecast for the site (no key, read directly by the phone).
   FDR: Bureau of Meteorology fire-district rating, read by the relay (or set by the SHE Manager).
   Both are cached so the panel still shows the last reading with no signal. */
const FDR_COL={"No Rating":["#E9EDF2","#3A4657"],"Moderate":["#64BF30","#0F2A06"],"High":["#FEDD3A","#3A2E00"],"Extreme":["#F78100","#2B1300"],"Catastrophic":["#AD0909","#FFFFFF"]};
const FDR_ACT={"No Rating":"No fire danger rating issued.","Moderate":"Plan and prepare. Normal BFMP controls apply.","High":"Be ready to act. BFMP Table 13 High-day controls apply – complete Inspection 25.","Extreme":"Take action now. Extreme-day controls: no open-air hot work, appliances staged – complete Inspection 25.","Catastrophic":"For your survival, leave bush fire risk areas. Project Director decides mobilisation – complete Inspection 25."};
const WX_CODE=c=>c===0?["Clear","sun"]:c<=2?["Partly cloudy","cloud"]:c===3?["Cloudy","cloud"]:c<=48?["Fog","cloud"]:c<=57?["Drizzle","rain"]:c<=67?["Rain","rain"]:c<=77?["Snow","cloud"]:c<=82?["Showers","rain"]:["Thunderstorms","rain"];
const compass=d=>["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(((+d%360)+360)%360/22.5)%16];
function fdrNorm(r){r=String(r||"").trim();if(!r)return"";const k=Object.keys(FDR_COL).find(x=>x.toLowerCase()===r.toLowerCase());return k||r}
async function wxRefresh(force){const W=lsJ("wx",null);if(!force&&W&&Date.now()-W.at<30*60e3)return false;if(navigator.onLine===false)return false;
  try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${SITE.lat}&longitude=${SITE.lon}&timezone=Australia%2FPerth&wind_speed_unit=kmh&forecast_days=2`+
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code`+
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,weather_code`;
    const r=await fetch(u);if(!r.ok)throw new Error("weather "+r.status);const j=await r.json();
    ls("wx",JSON.stringify({at:Date.now(),date:todayISO(),cur:j.current,day:{max:j.daily.temperature_2m_max[0],min:j.daily.temperature_2m_min[0],rain:j.daily.precipitation_probability_max[0],wind:j.daily.wind_speed_10m_max[0],gust:j.daily.wind_gusts_10m_max[0],dir:j.daily.wind_direction_10m_dominant[0],code:j.daily.weather_code[0]}}));return true}
  catch(e){console.warn(e);return false}}
function isoPlus(n){const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
/* Rating for the site's district from the BoM feed (by date, so an overnight forecast still shows the right day) */
function fdrFromFeed(feed,want){const D=(feed&&feed.districts)||{};const name=D[want]?want:D[SITE.fdrDistrict]?SITE.fdrDistrict:"";if(!name)return null;
  const on=iso=>(D[name].find(x=>x.date===iso)||{}).rating||"";
  return{today:on(todayISO()),tomorrow:on(isoPlus(1)),area:name,areas:Object.keys(D).sort(),issued:feed.issued||"",source:"Bureau of Meteorology"}}
async function fdrRefresh(force){const F=lsJ("fdr",null);if(!force&&F&&F.date===todayISO()&&Date.now()-F.at<20*60e3)return false;if(navigator.onLine===false)return false;
  // the relay holds the SHE Manager's manual rating and district choice; the feed holds the official ratings
  const rel=(directOn()&&v3())?fetch(`${RELAY.url}?action=weather&key=${encodeURIComponent(RELAY.key)}`,{redirect:"follow"}).then(r=>r.json()).then(j=>j.ok?j.fdr:null).catch(()=>null):Promise.resolve(null);
  const feed=fetch(FDR_FEED,{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null);
  const [R,B]=await Promise.all([rel,feed]);if(!R&&!B)return false;
  let out=R&&R.manual?R:fdrFromFeed(B,R&&R.want)||(R&&R.today?R:null);
  if(!out){if(F&&F.date===todayISO())return false;out={today:"",tomorrow:"",area:"",areas:[],source:""}}
  if(R&&R.manual&&!out.areas){const f=fdrFromFeed(B,R.want);if(f)out={...out,areas:f.areas,area:out.area||f.area,tomorrow:out.tomorrow||f.tomorrow}}
  ls("fdr",JSON.stringify({at:Date.now(),date:todayISO(),...out,canPick:!!(R&&"want" in R)}));return true}
function wxHTML(){const W=lsJ("wx",null),F=lsJ("fdr",null);const fresh=F&&F.date===todayISO();const rating=fresh?fdrNorm(F.today):"";const col=FDR_COL[rating];
  const fdr=`<button class="fdr" style="${col?`--fb:${col[0]};--fi:${col[1]}`:""}" onclick="fdrInfo()" aria-label="Fire danger rating">
    <span class="fl">FIRE DANGER</span><b>${esc(rating||(F&&F.today?fdrNorm(F.today):"Check FDR"))}</b>${fresh&&F.tomorrow?`<span class="ft">Tomorrow: ${esc(fdrNorm(F.tomorrow))}</span>`:`<span class="ft">${fresh?esc(F.area||""):"Tap for details"}</span>`}</button>`;
  if(!W)return `<div class="wx">${fdr}<div class="wxm"><span class="muted" style="color:rgba(255,255,255,.8)">${ic("wifioff","s")} Weather loads when online</span></div></div>`;
  const c=W.cur||{},d=W.day||{};const [txt,icn]=WX_CODE(+(c.weather_code??d.code));
  return `<div class="wx">${fdr}<div class="wxm"><div class="wxt">${ic(icn,"l")}<b>${Math.round(c.temperature_2m??d.max)}°</b><span>${esc(txt)}<br><small>${Math.round(d.min)}° / ${Math.round(d.max)}°</small></span></div>
    <div class="wxs"><span title="Wind">${ic("wind","s")} ${compass(c.wind_direction_10m??d.dir)} ${Math.round(c.wind_speed_10m??d.wind)} km/h${c.wind_gusts_10m!=null?`, gusts ${Math.round(c.wind_gusts_10m)}`:""}</span><span title="Chance of rain">${ic("drop","s")} ${d.rain??"–"}% rain</span></div>
    <div class="wxp">${ic("pin","s")} ${esc(SITE.name)} · ${new Date(W.at).toLocaleTimeString("en-AU",{hour:"numeric",minute:"2-digit"})}</div></div></div>`}
function fdrInfo(){const F=lsJ("fdr",null);const fresh=F&&F.date===todayISO();const r=fresh?fdrNorm(F.today):"";const col=FDR_COL[r];
  sheet(`<h3>Fire Danger Rating – ${esc(SITE.name)}</h3>
   ${r?`<div class="fdrbig" style="--fb:${col?col[0]:"#E9EDF2"};--fi:${col?col[1]:"#3A4657"}">${esc(r)}</div><p>${esc(FDR_ACT[r]||"")}</p>`:`<div class="alert org">${ic("alert")}<div><b>Today's rating isn't available in the app yet.</b> Check the official rating before work starts.</div></div>`}
   ${fresh?`<dl class="kv"><dt>District</dt><dd>${esc(F.area||"–")}</dd>${F.tomorrow?`<dt>Tomorrow</dt><dd>${esc(fdrNorm(F.tomorrow))}</dd>`:""}<dt>Source</dt><dd>${esc(F.source||"–")}${F.issued?` · issued ${esc(fmtDT(F.issued))}`:""}</dd></dl>`:""}
   <p class="muted">Always confirm Total Fire Bans (DFES) and Harvest & Vehicle Movement Bans (Shire of Dandaragan) at pre-start.</p>
   <div class="row2"><a class="btn g" href="https://www.emergency.wa.gov.au/" target="_blank" rel="noopener">${ic("ext","s")} Emergency WA</a><a class="btn g" href="https://www.bom.gov.au/wa/forecasts/fire-danger.shtml" target="_blank" rel="noopener">${ic("ext","s")} BoM ratings</a></div>
   ${isManager()?`<h2 style="margin-top:18px">SHE Manager</h2><label class="f" for="fdrSet">Set today's rating</label><select class="t" id="fdrSet"><option value="">– use the Bureau of Meteorology –</option>${Object.keys(FDR_COL).map(k=>`<option ${F&&F.manual&&r===k?"selected":""}>${k}</option>`).join("")}</select>
     ${fresh&&F.canPick&&(F.areas||[]).length?`<label class="f" for="fdrArea">Bureau of Meteorology district</label><select class="t" id="fdrArea">${F.areas.map(a=>`<option ${a===F.area?"selected":""}>${esc(a)}</option>`).join("")}</select>`:""}
     <button class="btn o w" onclick="fdrSave()">${ic("check","s")} Save for everyone</button>`:""}`)}
async function fdrSave(){const rating=$("#fdrSet").value;const a=$("#fdrArea");const body={action:"fdr",rating,by:ls("inspector")||"SHE Manager",pin:ls("mgrPin")||""};if(a)body.area=a.value;
  try{const r=await relayPost({payload:body},false);if(!r||!r.ok){toast((r&&r.error)||"Not saved",4000);return}closeSheet();await fdrRefresh(true);toast("Fire danger rating updated");if((location.hash||"#home")==="#home")viewHome()}
  catch(e){toast("No connection – try again with signal",4000)}}
