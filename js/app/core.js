"use strict";
/* Direct send: the relay link lives in config.json in the GitHub repo, so it can be changed without rebuilding the app. */
let RELAY={url:"",key:""};
try{const c=JSON.parse(ls("relayCfg")||"null");if(c&&c.url)RELAY=c}catch(e){}
async function loadRelay(){try{const r=await fetch("config.json?v="+Date.now(),{cache:"no-store"});if(!r.ok)return;const c=await r.json();
  if(c&&typeof c.relayUrl==="string"){RELAY={url:c.relayUrl.trim(),key:c.key||""};ls("relayCfg",JSON.stringify(RELAY))}}catch(e){}}
const directOn=()=>/^https:\/\/script\.google(usercontent)?\.com\//.test(RELAY.url)||/^https?:\/\/localhost/.test(RELAY.url);

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
function fmtD(v){if(!v)return "";const p=v.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v}
function initials(n){return (n||"").split(/\s+/).filter(Boolean).map(w=>w[0].toUpperCase()).join("").slice(0,3)||"XX"}
const RLABEL={C:"C",UA:"UA",NI:"NI",NA:"N/A"};
const RSUB={C:"Compliant",UA:"Stop work",NI:"Improve",NA:"Not applicable"};
const RKEY=[["C","#2E7D32","Compliant","meets the requirement in the plan."],["UA","#C62828","Not compliant – UNACCEPTABLE","stop work, make safe and take immediate action. Notify the Supervisor and SHE Manager."],["NI","#E39A00","Not compliant – Needs improvement","safe to continue; corrective action required."],["NA","#7A8594","Not applicable","to this inspection / work front."]];
function keyHTML(){return `<div class="key"><div class="kt">Rating key</div><div class="kr">${RKEY.map(k=>`<div class="ki"><span class="kb" style="background:${k[1]}">${RLABEL[k[0]]}</span><span><b>${k[2]}</b> – ${k[3]}</span></div>`).join("")}</div>
  <div class="ks"><span class="snn"><img src="${SNN_ICONS.FND}" alt="">SNN</span> Orange tag with the Genus icon = item linked to a Safety Non-Negotiable. A UA or NI on these items is flagged in the report and email.</div></div>`}
function snnNames(codes){return (codes||[]).map(c=>SNN[c]).filter(Boolean)}
