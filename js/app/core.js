"use strict";
/* Direct send: the relay link lives in config.json in the GitHub repo, so it can be changed without rebuilding the app. */
let RELAY={url:"",key:"",v:0};
try{const c=JSON.parse(ls("relayCfg")||"null");if(c&&c.url)RELAY=Object.assign({v:0},c)}catch(e){}
async function loadRelay(){try{const r=await fetch("config.json?v="+Date.now(),{cache:"no-store"});if(!r.ok)return;const c=await r.json();
  if(c&&typeof c.relayUrl==="string"){const url=c.relayUrl.trim();RELAY={url,key:c.key||"",v:url===RELAY.url?RELAY.v:0};ls("relayCfg",JSON.stringify(RELAY))}}catch(e){}}
const directOn=()=>/^https:\/\/script\.google(usercontent)?\.com\//.test(RELAY.url)||/^https?:\/\/localhost/.test(RELAY.url);
/* v3 relays add the shared action register, action emails and Manager PIN. Older relays are detected so
   v3-only requests are never sent to them (an old relay would treat them as a report). */
async function relayVersion(force){if(!directOn())return 0;if(RELAY.v&&!force&&Date.now()-(RELAY.vAt||0)<6*3600e3)return RELAY.v;
  try{const r=await fetch(RELAY.url,{redirect:"follow"});const j=await r.json();RELAY.v=Number(j.v)||2;RELAY.vAt=Date.now();ls("relayCfg",JSON.stringify(RELAY))}catch(e){}
  return RELAY.v}
const v3=()=>RELAY.v>=3;

/* ---------- storage (IndexedDB, falls back to memory) ---------- */
const mem = {};
let idb = null;
function openDB(){return new Promise(res=>{try{const r=indexedDB.open("ymt-inspections",2);
  r.onupgradeneeded=()=>{const d=r.result;["drafts","sent","outbox"].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:"id"})})};
  r.onsuccess=()=>{idb=r.result;res()};r.onerror=()=>res();}catch(e){res()}})}
function tx(store,mode){return idb.transaction(store,mode).objectStore(store)}
function dbPut(store,obj){if(!idb){(mem[store]=mem[store]||{})[obj.id]=obj;return Promise.resolve()}
  return new Promise((res,rej)=>{const r=tx(store,"readwrite").put(obj);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function dbGet(store,id){if(!idb)return Promise.resolve((mem[store]||{})[id]);
  return new Promise(res=>{const r=tx(store,"readonly").get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)})}
function dbAll(store){if(!idb)return Promise.resolve(Object.values(mem[store]||{}));
  return new Promise(res=>{const r=tx(store,"readonly").getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>res([])})}
function dbDel(store,id){if(!idb){delete (mem[store]||{})[id];return Promise.resolve()}
  return new Promise(res=>{const r=tx(store,"readwrite").delete(id);r.onsuccess=()=>res();r.onerror=()=>res()})}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function lsJ(k,def){try{const v=JSON.parse(ls(k)||"null");return v==null?def:v}catch(e){return def}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}

/* ---------- helpers ---------- */
const $ = s=>document.querySelector(s);
const esc = s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tabByNum = n=>TABS.find(t=>t.num===n);
const allQ = t=>t.sections.flatMap(s=>s.q);
function recipient(){return (ls("recipientOverride")||CONFIG.recipient||"").trim()}
function recipientOK(){const r=recipient();return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r)}
function toast(m,ms=2600){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("on"),ms)}
function pad(n){return String(n).padStart(2,"0")}
function nowLocal(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function fmtDT(v){if(!v)return "";const d=new Date(v);if(isNaN(d))return v;return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`}
function fmtD(v){if(!v)return "";const p=String(v).slice(0,10).split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v}
function initials(n){return (n||"").split(/\s+/).filter(Boolean).map(w=>w[0].toUpperCase()).join("").slice(0,3)||"XX"}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function addDaysISO(n){const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
/* whole days from today to an ISO date (negative = past) */
function daysTo(iso){if(!iso)return null;const a=new Date(todayISO()+"T00:00:00"),b=new Date(String(iso).slice(0,10)+"T00:00:00");return isNaN(b)?null:Math.round((b-a)/864e5)}
function dueText(iso){const n=daysTo(iso);if(n===null)return "No due date";if(n<0)return `Overdue ${-n} day${n===-1?"":"s"}`;if(n===0)return "Due today";if(n===1)return "Due tomorrow";return `Due in ${n} days`}
function greeting(){const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening"}
function firstName(n){return String(n||"").trim().split(/\s+/)[0]||""}
const nameKey=s=>String(s||"").trim().toLowerCase().replace(/\s+/g," ");
const RLABEL={C:"C",UA:"UA",NI:"NI",NA:"N/A"};
const RSUB={C:"Compliant",UA:"Stop work",NI:"Improve",NA:"Not applicable"};
const RKEY=[["C","var(--c)","Compliant","meets the requirement in the plan."],["UA","var(--ua)","Not compliant – UNACCEPTABLE","stop work, make safe and take immediate action. Notify the Supervisor and SHE Manager."],["NI","var(--ni)","Not compliant – Needs improvement","safe to continue; corrective action required."],["NA","var(--na)","Not applicable","to this inspection / work front."]];
function keyHTML(){return `<details class="key"><summary><span class="kt">${ic("info")} Rating key</span><span class="kchips">${RKEY.map(k=>`<span class="kb" style="background:${k[1]}">${RLABEL[k[0]]}</span>`).join("")}</span></summary><div class="kr">${RKEY.map(k=>`<div class="ki"><span class="kb" style="background:${k[1]}">${RLABEL[k[0]]}</span><span><b>${k[2]}</b> – ${k[3]}</span></div>`).join("")}</div>
  <div class="ks"><span class="snn"><img src="${SNN_ICONS.FND}" alt="">SNN</span> Orange tag = item linked to a Safety Non-Negotiable. A UA or NI on these items is flagged in the report and email.</div></details>`}
function snnNames(codes){return (codes||[]).map(c=>SNN[c]).filter(Boolean)}
/* people the inspector has assigned actions to – remembered on this phone (name -> email) */
function contacts(){const c=lsJ("contacts",{});(REG&&REG.findings||[]).forEach(f=>{if(f.owner&&f.ownerEmail&&!c[f.owner])c[f.owner]=f.ownerEmail});return c}
function rememberContact(name,email){name=String(name||"").trim();email=String(email||"").trim().toLowerCase();if(!name||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return;const c=lsJ("contacts",{});c[name]=email;ls("contacts",JSON.stringify(c))}
const emailOK=e=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e||"").trim());
function csvCell(v){v=String(v??"");return /[",\n\r]/.test(v)?`"${v.replace(/"/g,'""')}"`:v}
function toCSV(rows){return "﻿"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n")}
async function copyText(t,label){try{await navigator.clipboard.writeText(String(t??""));toast(`${label||"Text"} copied`)}catch(e){
  const a=document.createElement("textarea");a.value=String(t??"");document.body.appendChild(a);a.select();try{document.execCommand("copy");toast(`${label||"Text"} copied`)}catch(e2){toast("Copy not available on this device")}a.remove()}}

/* ---------- icons (inline SVG, Lucide-style strokes) ---------- */
const ICONS={
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  clipboard:'<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  actions:'<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  chart:'<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  upload:'<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>',
  settings:'<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  back:'<path d="m15 18-6-6 6-6"/>', chev:'<path d="m9 18 6-6-6-6"/>', down:'<path d="m6 9 6 6 6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  image:'<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  check:'<path d="M20 6 9 17l-5-5"/>', x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  alert:'<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  cal:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  copy:'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  mic:'<rect width="6" height="12" x="9" y="2" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 15.7-6L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.7 6L3 16"/><path d="M8 16H3v5"/>',
  lock:'<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  ext:'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  edit:'<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trend:'<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  circlecheck:'<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>',
  reopen:'<path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',
  arrow:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  layers:'<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  gauge:'<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  wifioff:'<path d="M12 20h.01"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M19 12.9a10 10 0 0 0-2.9-2"/><path d="M2 8.8a15 15 0 0 1 4.2-2.6"/><path d="M22 8.8a15 15 0 0 0-11.3-3.8"/><path d="m2 2 20 20"/>',
  star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'
};
function ic(n,cls){return `<svg class="ic ${cls||""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||""}</svg>`}

/* ---------- bottom sheet (modal) ---------- */
function sheet(html,opt){opt=opt||{};closeSheet();const m=document.createElement("div");m.className="sheet-bg";m.id="sheet";
  m.innerHTML=`<div class="sheet ${opt.wide?"wide":""}" role="dialog" aria-modal="true"><div class="grab"></div><button class="sheet-x" onclick="closeSheet()" aria-label="Close">${ic("x")}</button>${html}</div>`;
  m.addEventListener("click",e=>{if(e.target===m)closeSheet()});document.body.appendChild(m);document.body.classList.add("noscroll");
  requestAnimationFrame(()=>m.classList.add("on"));return m.querySelector(".sheet")}
function closeSheet(){const m=document.getElementById("sheet");if(!m)return;m.remove();document.body.classList.remove("noscroll")}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
function ask2(title,msg,okLabel,danger){return new Promise(res=>{const s=sheet(`<h3>${esc(title)}</h3><p class="muted">${msg}</p><div class="row2"><button class="btn g" id="aNo">Cancel</button><button class="btn ${danger?"r":"o"}" id="aYes">${esc(okLabel||"OK")}</button></div>`);
  s.querySelector("#aNo").onclick=()=>{closeSheet();res(false)};s.querySelector("#aYes").onclick=()=>{closeSheet();res(true)}})}
