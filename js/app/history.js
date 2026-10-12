"use strict";
/* ---------- This day in history – three facts for the 6 am pre-start ----------
   The relay prepares them 4–5 am (prepareHistory) from Wikipedia "On this day"; the phone caches today's set so it
   shows with poor signal. If the relay can't be reached, the phone reads the Wikipedia feed directly and picks the
   facts the same way. "Swap" changes one fact on this phone only. */
let HIST=lsJ("history",null);   // {date, facts:[{year,text,link}], pool:[...], src}
// Words that keep an event off the pre-start list – keep in step with HISTORY_EXCLUDE in the relay
const HIST_EXCLUDE=["murder","massacre","killed","killing","kills","terrorist","terrorism","bombing","bomb","shooting","shot dead","assassinat","executed","execution",
  "genocide","rape","suicide","war crime","hostage","behead","lynch","stabbing","torture","slaughter","atrocit","holocaust","abduct","kidnap","died","deaths","dead","crash","disaster"];
const HIST_AU_RE=/\b(Australia|Australian|Australians|Western Australia|Perth|Fremantle|Sydney|Melbourne|Brisbane|Adelaide|Hobart|Darwin|Canberra|Queensland|Tasmania|New South Wales|Kalgoorlie|Geraldton|Broome|Pilbara|Kimberley)\b/i;
const HIST_SCI_RE=/(scien|engineer|technolog|space|NASA|satellite|rocket|spacecraft|astronaut|computer|internet|telescope|invent|patent|discover|expedition|explor|aviat|aircraft|airline|flight|railway|bridge|tunnel|electric|power station|radio|television|telephone|Olympic|World Cup|cricket|football|rugby|championship|Grand Prix|tennis|record|mountain|summit|Antarctic)/i;
const histOK=t=>{const s=String(t||"").toLowerCase();return s.length>20&&!HIST_EXCLUDE.some(w=>s.includes(w))};
function histFact(e,born){const p=(e.pages||[])[0]||{};const link=(p.content_urls&&p.content_urls.desktop&&p.content_urls.desktop.page)||("https://en.wikipedia.org/wiki/Special:Search?search="+encodeURIComponent(String(e.text||"").slice(0,80)));
  let text=String(e.text||"").replace(/\s+/g," ").trim();if(born)text="Born: "+text.replace(/\.$/,"")+".";
  if(text.length>300){const cut=text.slice(0,300);const i=cut.lastIndexOf(". ");text=i>80?cut.slice(0,i+1):cut.replace(/\s+\S*$/,"")+"…"}
  return {year:Number(e.year)||"",text,link,au:HIST_AU_RE.test(text),sci:HIST_SCI_RE.test(text)}}
/* one Australian/WA, one science/engineering/exploration/sport, one general – spread across centuries; births top up */
function histPick(events,births){const ev=(events||[]).filter(e=>histOK(e.text)).map(e=>histFact(e,false)),bo=(births||[]).filter(e=>histOK(e.text)).map(e=>histFact(e,true));
  const out=[],used=new Set(),cent=f=>Math.floor((Number(f.year)||0)/100);const take=f=>{if(f&&!used.has(f.text)){out.push(f);used.add(f.text);return true}return false};
  const pick=(list,test)=>{const L=list.filter(f=>!used.has(f.text)&&test(f));return L.find(f=>!out.some(o=>cent(o)===cent(f)))||L[0]};
  take(pick(ev,f=>f.au));take(pick(ev,f=>f.sci&&!f.au));take(pick(ev,f=>!f.au&&!f.sci));
  while(out.length<3){const f=pick(ev,()=>true)||pick(bo,()=>true);if(!f||!take(f))break}
  return {facts:out.slice(0,3),pool:ev.concat(bo).filter(f=>!used.has(f.text)).slice(0,25)}}
async function histWiki(){const d=new Date(),mm=pad(d.getMonth()+1),dd=pad(d.getDate());const get=k=>fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/${k}/${mm}/${dd}`).then(r=>r.ok?r.json():{}).then(j=>j[k]||[]).catch(()=>[]);
  const ev=await get("events");const bo=ev.filter(e=>histOK(e.text)).length>=3?[]:await get("births");const p=histPick(ev,bo);if(!p.facts.length)throw new Error("feed");return p}
async function histLoad(force){const today=todayISO();if(!force&&HIST&&HIST.date===today&&(HIST.facts||[]).length)return false;if(navigator.onLine===false)return false;
  let got=null;
  if(directOn()&&!force){try{const r=await fetch(relayQ("action=getHistory"),{redirect:"follow"});const j=await r.json();if(j.needCode)askSiteCode();if(j.ok&&(j.facts||[]).length&&(!j.date||j.date===today))got={facts:j.facts,pool:j.pool||[],src:"relay"}}catch(e){}}
  if(!got){try{got=Object.assign(await histWiki(),{src:"wikipedia"})}catch(e){return false}}
  HIST={date:today,...got};ls("history",JSON.stringify(HIST));return true}
const histDate=()=>new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"});
function historyCardHTML(){const ok=HIST&&HIST.date===todayISO()&&(HIST.facts||[]).length;
  return `<button class="card tap hist-card" onclick="go('#history')"><span class="ti t-purple">${ic("cal","l")}</span><span class="hc-x"><b>This day in history – ${esc(new Date().toLocaleDateString("en-AU",{day:"numeric",month:"short"}))}</b>
    <small>${ok?`${esc(String(HIST.facts[0].year))} – ${esc(HIST.facts[0].text.slice(0,90))}${HIST.facts[0].text.length>90?"…":""}`:navigator.onLine===false?"Opens with signal – saved for the day once loaded":"Three facts for the pre-start"}</small></span>${ic("chev")}</button>`}
function viewHistory(){setHeader("This day in history",histDate(),{icon:"back",aria:"Back",fn:()=>go("#home")});const seq=ROUTE_SEQ;
  const draw=()=>{const ok=HIST&&HIST.date===todayISO()&&(HIST.facts||[]).length;
    render(`<div class="hist-date">${esc(histDate())}</div>${ok?HIST.facts.map((f,i)=>`<div class="card hist-fact"><div class="hf-n">${i+1}</div><div class="hf-y">${esc(String(f.year))}</div>
      <p>${esc(f.text)}</p><div class="hf-a"><a href="${esc(f.link)}" target="_blank" rel="noopener">${ic("ext","s")} Read more</a><button class="btn g s" onclick="histSwap(${i})">${ic("refresh","s")} Swap</button></div></div>`).join("")
      :`<div class="card empty">${ic(navigator.onLine===false?"wifioff":"cal")}<b>${navigator.onLine===false?"No signal":"Getting today's facts…"}</b>${navigator.onLine===false?"Open this once with signal – the facts are then saved for the whole day.":""}</div>`}
     <p class="foot">Source: Wikipedia – On this day (CC BY-SA). Check facts before reading if unsure.</p>`)};
  draw();histLoad().then(ch=>{if(ch&&!stale(seq)&&location.hash==="#history")draw()})}
/* swap one fact for another suitable one from today's feed (this phone only) */
function histSwap(i){if(!HIST||!(HIST.pool||[]).length){toast("No other suitable facts for today",3000);return}
  const next=HIST.pool.shift();HIST.pool.push(HIST.facts[i]);HIST.facts[i]=next;ls("history",JSON.stringify(HIST));viewHistory()}
