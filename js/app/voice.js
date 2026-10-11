"use strict";
/* ---------- VOICE MODE (v1.8 trial) ----------
   Guided, hands-free entry. The phone's own speech service turns speech into text; PARRON never stores audio.
   Prompts are spoken with the phone's built-in voice (works offline). Every step also has tap buttons. */
const SRC = window.SpeechRecognition || window.webkitSpeechRecognition;
const V = { on:false, gen:0, speak: ls("voiceSpeak")!=="0", step:null, tap:null, hearFinish:null, cur:{finals:[],interim:""}, noMic:false, noMicWhy:"", pre:"", photoBusy:false, lastErr:null };
function voiceSupported(){ return !!SRC }
function voiceCardHTML(kind){
  if(!voiceSupported()) return `<div class="vcard off"><div><b>🎙 Voice mode</b><span>Not available in this browser. You can still tap the microphone on your phone keyboard in any text box.</span></div></div>`;
  return `<div class="vcard"><div><b>🎙 Voice mode <em>TRIAL</em></b><span>${kind==="record"
    ? "PARRON asks each section out loud and types what you say into the right place. Start a sentence with “action” to add an action."
    : "PARRON reads each question out loud and fills in your answers. Say “compliant”, “needs improvement”, “unacceptable” or “not applicable”."} You review everything before you sign.</span></div><button class="btn o" onclick="voiceStart()">Start</button></div>`;
}

/* ---- speaking ---- */
function pickVoice(){ try{ const vs=speechSynthesis.getVoices(); return vs.find(v=>/en[-_]AU/i.test(v.lang))||vs.find(v=>/en[-_]GB/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null }catch(e){ return null } }
function primeSpeech(){ try{ if(window.speechSynthesis){ const u=new SpeechSynthesisUtterance(" "); u.volume=0; speechSynthesis.speak(u) } }catch(e){} }
function say(text){ return new Promise(res=>{
  text=String(text||"").trim(); if(!text){ res(); return }
  vState("speaking"); vPrompt(text);
  if(!V.speak||!window.speechSynthesis){ res(); return }
  let done=false; const fin=()=>{ if(done)return; done=true; clearTimeout(to); setTimeout(res,300) };
  const to=setTimeout(fin, 2500+text.length*95);
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text.replace(/–/g,",")); u.lang="en-AU"; const v=pickVoice(); if(v)u.voice=v; u.rate=1.03; u.onend=fin; u.onerror=fin; speechSynthesis.speak(u) }catch(e){ fin() }
}) }
function hush(){ try{ window.speechSynthesis&&speechSynthesis.cancel() }catch(e){} }

/* ---- listening: one utterance per session (most reliable on iPhone and Android); "long" keeps restarting until Next ---- */
const FATAL=["not-allowed","service-not-allowed","network","audio-capture","language-not-supported"];
function hear(mode){ return new Promise(res=>{
  const g=V.gen; let ended=false, guard=null; V.cur={finals:[],interim:""}; V.lastErr=null;
  const finish=v=>{ if(ended)return; ended=true; clearTimeout(guard); V.hearFinish=null; try{ r.onend=null; r.onresult=null; r.onerror=null; r.abort() }catch(e){} res(v) };
  V.hearFinish=finish;
  const pre=V.preRec; V.preRec=null; const r=pre||new SRC(); if(!pre){ r.lang="en-AU"; r.interimResults=true; r.maxAlternatives=1; r.continuous=false }
  const all=()=>(V.cur.finals.join(" ")+" "+V.cur.interim).replace(/\s+/g," ").trim();
  r.onresult=e=>{ V.cur.interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){ const x=e.results[i]; if(x.isFinal){ const s=x[0].transcript.trim(); if(s)V.cur.finals.push(s) } else V.cur.interim+=x[0].transcript }
    if(mode==="long"){ // spoken controls inside dictation – only when said on their own
      const last=V.cur.finals[V.cur.finals.length-1]||""; const n=norm(last);
      if(e.results[e.results.length-1].isFinal&&last){
        if(/^ (next|done|finished|that's it|that is it|that's all|that is all|end|next section|next question|ok next|okay next) $/.test(n)){ V.cur.finals.pop(); finish({text:V.cur.finals.join(" "),parts:V.cur.finals.slice(),end:true}); return }
        if(/^ (scratch that|delete that|undo that|remove that|cancel that) $/.test(n)){ V.cur.finals.pop(); V.cur.finals.pop() }
        else if(/^ (stop|stop voice|pause|pause voice) $/.test(n)&&V.cur.finals.length===1){ finish({cmd:"stop"}); return }
        else if(/^ (skip|skip it|skip that|none|nothing|nil|no) $/.test(n)&&V.cur.finals.length===1){ finish({cmd:"skip"}); return }
      }
      if(V.onLong) V.onLong(sentences(V.cur.finals));
    }
    vHeard(all());
  };
  r.onerror=e=>{ V.lastErr=e.error };
  r.onend=()=>{ if(ended)return;
    if(g!==V.gen||!V.on){ finish({cmd:"stop"}); return }
    if(FATAL.includes(V.lastErr)){ finish({err:V.lastErr,text:V.cur.finals.join(" ")}); return }
    if(mode==="long"){ V.lastErr=null; try{ r.start() }catch(e){ finish({err:"start",text:V.cur.finals.join(" ")}) } return }
    const t=all(); finish(t?{text:t}:{err:V.lastErr||"no-speech"});
  };
  if(mode!=="long") guard=setTimeout(()=>{ const t=all(); finish(t?{text:t}:{err:"no-speech"}) },15000);
  vState("listening");
  if(!pre){ try{ r.start() }catch(e){ finish({err:"start"}) } }
}) }
function stopHearing(){ if(V.hearFinish) V.hearFinish({cmd:"cancel"}) }

/* ---- understanding what was said ---- */
const norm=s=>" "+String(s||"").toLowerCase().replace(/[‘’]/g,"'").replace(/[.,!?;:"()]/g," ").replace(/\s+/g," ").trim()+" ";
const nameCase=s=>String(s||"").trim().split(/\s+/).map(w=>w?w[0].toUpperCase()+w.slice(1):w).join(" ");
const sentences=a=>(a||[]).map(x=>String(x||"").trim()).filter(Boolean).map(x=>{ x=x[0].toUpperCase()+x.slice(1); return /[.!?]$/.test(x)?x:x+"." }).join(" ");
const cap=s=>{ s=String(s||"").trim(); return s?s[0].toUpperCase()+s.slice(1):s };
function firstHit(s,pats){ let best=null; for(const [v,re] of pats){ const m=re.exec(s); if(m&&(!best||m.index<best.i)) best={v,i:m.index,len:m[0].length} } return best }
const RATE_PATS=[
  ["UA",/ (unacceptable|un acceptable|not acceptable|stop work|unsafe|dangerous)(?= )/],
  ["NONC",/ (not compliant|non compliant|non-compliant|noncompliant|not complying|not ok|not okay|no good|not in place|not there|failed|fail|defect|defective|missing|damaged|broken|expired|out of date)(?= )/],
  ["NI",/ (needs improvement|need improvement|needs improving|needs to improve|improvement needed|improvement|minor issue)(?= )/],
  ["NA",/ (not applicable|n\/a|doesn't apply|does not apply|not relevant|not needed today)(?= )/],
  ["C",/ (compliant|complies|complied|yes|yep|yeah|ok|okay|good|all good|fine|pass|passed|tick|satisfactory|correct|in place)(?= )/]];
const RATE_EXACT={UA:/^ (ua|u a|you a|you ay|stop) $/,NI:/^ (ni|n i|knee|and i|in i|needs work) $/,NA:/^ (na|n a|and a|in a|nay|n slash a) $/,NONC:/^ (no|nope|nah) $/,C:/^ (c|see|sea|si) $/};
function parseRating(t){ const s=norm(t); for(const k in RATE_EXACT) if(RATE_EXACT[k].test(s)) return {val:k,rest:""};
  const h=firstHit(s,RATE_PATS); if(!h) return null;
  let rest=s.slice(h.i+h.len).trim().replace(/^(and|because|as|so|the|it's|its|it is|cause|-)\s+/,"");
  if(/^(all good|good|ok|okay|fine|yep|yes|yeah|compliant|mate|no worries|no issues|sweet|all ok|all okay|that's fine|thanks)?$/.test(rest)) rest="";
  return {val:h.v,rest:cap(rest)} }
function parseYesNo(t){ const s=norm(t);
  if(/^ (no|nope|nah|negative|not|none|nothing|nil|open|still open|it's open|it is open|it isn't|it wasn't|isn't|wasn't|didn't)(?= )/.test(s)) return {val:false};
  const m=/^ (yes|yeah|yep|yup|yes please|correct|affirmative|sure|definitely|it was|it is|closed|all closed|done)(?= )/.exec(s);
  if(m){ const rest=s.slice(m[0].length).trim().replace(/^(and|so|there is|there's|we have|we've got)\s+/,""); return {val:true,text:cap(rest)} }
  return null }
const MON=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const WDAY=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const NUMW={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fourteen:14,twenty:20,thirty:30};
function ymd(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function parseDate(t){ const s=norm(t).replace(/(\d)(st|nd|rd|th)\b/g,"$1"); const n=new Date(); n.setHours(12,0,0,0);
  const add=k=>{ const d=new Date(n); d.setDate(d.getDate()+k); return ymd(d) };
  if(/ (today|tonight|now|immediately|asap|straight away|right away|this arvo|this afternoon|this morning) /.test(s)) return add(0);
  if(/ (tomorrow|tomorrow's) /.test(s)) return add(1);
  let m=s.match(/ in (\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|twenty|thirty) (day|days|week|weeks|fortnight|fortnights)/);
  if(m){ const k=isNaN(+m[1])?NUMW[m[1]]:+m[1]; return add(k*(/week/.test(m[2])?7:/fortnight/.test(m[2])?14:1)) }
  if(/ (a |one )?fortnight /.test(s)) return add(14);
  if(/ end of (the )?(week|day shift|swing|rotation) /.test(s)){ const k=(5-n.getDay()+7)%7; return add(k) }
  if(/ end of (the )?month /.test(s)){ const d=new Date(n.getFullYear(),n.getMonth()+1,0,12); return ymd(d) }
  if(/ next week /.test(s)) return add(7);
  m=s.match(/ (\d{1,2})[\/\-. ](\d{1,2})(?:[\/\-. ](\d{2,4}))? /);
  if(m&&+m[2]<=12&&+m[1]<=31){ let y=m[3]?+m[3]:n.getFullYear(); if(y<100)y+=2000; const d=new Date(y,+m[2]-1,+m[1],12); if(!m[3]&&d<add0(n))d.setFullYear(y+1); return ymd(d) }
  m=s.match(/ (\d{1,2}) (?:of )?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* /)||null;
  let day,mon; if(m){ day=+m[1]; mon=MON.indexOf(m[2]) } else { m=s.match(/ (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (?:the )?(\d{1,2}) /); if(m){ mon=MON.indexOf(m[1]); day=+m[2] } }
  if(m&&day>=1&&day<=31){ const d=new Date(n.getFullYear(),mon,day,12); if(d<add0(n)) d.setFullYear(d.getFullYear()+1); return ymd(d) }
  for(let i=0;i<7;i++){ if(s.includes(" "+WDAY[i]+" ")){ const k=(i-n.getDay()+7)%7||7; return add(k) } }
  m=s.match(/ the (\d{1,2}) /); if(m&&+m[1]>=1&&+m[1]<=31){ const d=new Date(n.getFullYear(),n.getMonth(),+m[1],12); if(d<add0(n)) d.setMonth(d.getMonth()+1); return ymd(d) }
  return null }
function add0(n){ const d=new Date(n); d.setHours(0,0,0,0); return d }
const TYPE_KW=[/check ?in|scheduled|schedule|catch ?up|regular|weekly|monthly|one on one|1 on 1/,/formal|review|thirty|sixty|ninety|\b30\b|\b60\b|\b90\b|quarterly|probation/,/rotation|phase|transition|handover|moving to|swap/,/field|on the job|on-the-job|out on site|in the field|on site|at the work ?front|toolbox/,/informal|ad hoc|adhoc|casual|quick chat|impromptu|yarn/,/concern|complaint|worried|worry|grievance/];
const TOPIC_KW=[/construction|civil|earthwork|build|concrete|trench/,/safety|hse|h s e|hazard|permit|risk|incident|isolation|lock ?out/,/environment|dust|water|waste|flora|fauna|spill|clearing|heritage/,/quality|itp|inspection and test|defect|\bqa\b|\bqc\b|ncr/,/engineering|design|drawing/,/commercial|cost|budget|variation|contract|claim|invoice/,/project controls|programme|program|schedule|planning|reporting/,/plant|equipment|machine|crane|excavator|vehicle|ewp/,/training|ticket|licen[cs]e|course|competenc|induction|verification of competency|\bvoc\b/,/wellbeing|well being|workload|fatigue|stress|roster|welfare|mental|work life|hours/];
function parseChoice(t,list,kws){ const s=norm(t); const out=[]; list.forEach((x,i)=>{ const re=kws[i]; 
  if(re&&re.test(s)) out.push(x) }); return out }
function splitAction(text){ // "action Joey to book EWP ticket owner Matt Smith due Friday"
  let a=String(text).replace(/^\s*(action( item)?( point)?( one| two| three|\s\d+)?( is)?)[\s:,-]*/i,"").trim(); let o="",due="";
  let m=a.match(/\s*,?\s*\b(?:due|by)\s+(.+)$/i); if(m){ const d=parseDate(m[1]); if(d){ due=d; a=a.slice(0,m.index).trim() } }
  m=a.match(/\s*,?\s*\bowner(?: is| will be)?\s+(.+)$/i); if(m){ o=m[1].trim(); a=a.slice(0,m.index).trim() }
  if(!o){ m=a.match(/\s*,?\s*\b(?:responsible|assigned to)(?: person)?(?: is)?\s+(.+)$/i); if(m){ o=m[1].trim(); a=a.slice(0,m.index).trim() } }
  if(!due){ m=o.match(/\s*,?\s*\b(?:due|by)\s+(.+)$/i); if(m){ const d=parseDate(m[1]); if(d){ due=d; o=o.slice(0,m.index).trim() } } }
  return {a:cap(a.replace(/[.\s]+$/,"")),o:nameCase(o.replace(/[.\s]+$/,"")),due,closed:false} }
const CMD_PATS=[["stop",/^ (stop|stop voice|pause|pause voice|exit|quit|end voice|finish voice|cancel voice) $/],["repeat",/^ (repeat|repeat that|say again|say that again|again|pardon|come again|what was that) $/],["back",/^ (back|go back|previous|previous question|undo) $/],["skip",/^ (skip|skip it|skip that|pass|next|next one|next question|move on) $/]];
function parseCmd(t){ const s=norm(t); for(const [c,re] of CMD_PATS) if(re.test(s)) return c; return null }

/* ---- the panel ---- */
function vPanel(){ let p=document.getElementById("vpanel"); if(p) return p;
  p=document.createElement("div"); p.id="vpanel"; p.className="vpanel";
  p.innerHTML=`<div class="vin"><div class="vtop"><span class="vdot"></span><span id="vstate">Voice mode</span><button id="vspk" onclick="vToggleSpeak()"></button><button onclick="voiceStop()">Stop ✕</button></div>
   <div class="vprompt" id="vprompt"></div><div class="vheard" id="vheard"></div><div class="vnote" id="vnote"></div><div class="vopts" id="vopts"></div>
   <div class="vnav"><button class="vmic" onclick="vTap('__mic')" aria-label="Speak">🎙</button><button onclick="vTap('__repeat')">Repeat</button><button onclick="vTap('__back')">Back</button><button onclick="vTap('__skip')">Skip</button><button class="vnext" onclick="vTap('__next')">Next ▸</button></div></div>`;
  document.body.appendChild(p); vSpkBtn(); return p }
function vSpkBtn(){ const b=document.getElementById("vspk"); if(b) b.textContent=V.speak?"🔊 Sound on":"🔇 Sound off" }
function vToggleSpeak(){ V.speak=!V.speak; ls("voiceSpeak",V.speak?"1":"0"); if(!V.speak) hush(); vSpkBtn() }
function vState(s){ const p=vPanel(); p.classList.remove("listening","speaking","idle"); p.classList.add(s);
  document.getElementById("vstate").textContent=s==="listening"?"Listening…":s==="speaking"?"Speaking…":"Tap 🎙 to speak, or use the buttons" }
function vPrompt(t){ vPanel(); document.getElementById("vprompt").textContent=t }
function vHeard(t){ vPanel(); document.getElementById("vheard").textContent=t?`“${t}”`:"" }
function vNote(t){ vPanel(); document.getElementById("vnote").textContent=t||"" }
function vOpts(o){ vPanel(); const box=document.getElementById("vopts"); let h="";
  const rb=(v,l,c)=>`<button style="background:${c}" onclick="vTap('${v}')">${l}</button>`;
  if(o.type==="rating") h=rb("C","C · Compliant","#2E7D32")+rb("NI","NI · Improve","#B87800")+rb("UA","UA · Stop work","#C62828")+rb("NA","N/A","#7A8594");
  else if(o.type==="rating2") h=rb("UA","UA · Unacceptable","#C62828")+rb("NI","NI · Needs improvement","#B87800");
  else if(o.type==="yesno") h=rb("Y","Yes","#2E7D32")+rb("N","No","#5B6675");
  else if(o.type==="photo") h=`<label class="vph" onclick="V.photoBusy=true">📷 Take photo<input type="file" accept="image/*" capture="environment" class="hide" onchange="vPhoto(this,'camera')"></label><label class="vph" onclick="V.photoBusy=true">🖼 Upload<input type="file" accept="image/*" class="hide" onchange="vPhoto(this,'upload')"></label>`;
  box.innerHTML=h; box.style.display=h?"flex":"none" }
function vTap(v){ if(v==="__mic"){ if(V.noMic){ V.noMic=false; vNote("") }
    if(!V.hearFinish&&SRC&&V.on){ try{ const r=new SRC(); r.lang="en-AU"; r.interimResults=true; r.maxAlternatives=1; r.continuous=false; r.start(); V.preRec=r }catch(e){ V.preRec=null } } }
  if(V.tap){ const f=V.tap; V.tap=null; f({tap:v}) } }
function vPhoto(inp,src){ const s=V.step&&V.step.photo; V.photoBusy=false; if(!s||!inp.files||!inp.files[0]) return;
  Promise.resolve(addPhoto(s.kind,s.id,inp,src)).then(()=>{ if(V.on) vTap("__photo") }) }
function vFocus(el){ document.querySelectorAll(".vfocus").forEach(x=>x.classList.remove("vfocus")); if(!el) return; el.classList.add("vfocus");
  const y=el.getBoundingClientRect().top+window.scrollY-82; window.scrollTo({top:Math.max(0,y),behavior:"smooth"}) }

/* ---- one question/answer step ---- */
async function ask(prompt,o){ o=o||{}; V.step=Object.assign({prompt},o); vOpts(o); vHeard(""); vNote(V.noMic?V.noMicWhy:(o.hint||""));
  let speakText=(V.pre?V.pre+" ":"")+prompt; V.pre=""; let tries=0;
  while(true){
    if(!V.on) return {cmd:"stop"}; const g=V.gen;
    const tapP=new Promise(r=>{ V.tap=r });
    let res=await Promise.race([say(speakText).then(()=>null),tapP]); speakText="";
    vPrompt(prompt);
    if(g!==V.gen||!V.on) return {cmd:"stop"};
    if(!res){ if(V.noMic||V.photoBusy){ vState("idle"); res=await tapP } else res=await Promise.race([hear(o.type==="long"?"long":"short"),tapP]) }
    if(g!==V.gen||!V.on) return {cmd:"stop"};
    const heardSoFar=(V.cur.finals.join(" ")+" "+V.cur.interim).trim();
    stopHearing(); hush(); V.tap=null;
    if(res.tap!==undefined){ const v=res.tap;
      if(v==="__stop") return {cmd:"stop"};
      if(v==="__mic"){ continue }
      if(v==="__repeat"){ speakText=prompt; continue }
      if(v==="__back") return {cmd:"back"};
      if(v==="__skip") return {cmd:"skip"};
      if(v==="__photo"){ speakText="Photo added. Take another, or say next."; continue }
      if(v==="__next"){
        if(o.type==="long"&&heardSoFar){ const parts=V.cur.finals.slice().concat(V.cur.interim.trim()?[V.cur.interim.trim()]:[]); return {val:sentences(parts),parts} }
        if(o.type==="text"&&heardSoFar) return {val:cap(heardSoFar)};
        if(o.form){ const fv=o.form(); if(fv&&(!Array.isArray(fv)||fv.length)) return {val:fv,fromForm:true} }
        return {cmd:"skip"} }
      if(o.type==="rating"||o.type==="rating2") return {val:v,rest:""};
      if(o.type==="yesno") return {val:v==="Y"};
      continue }
    if(res.cmd==="stop") return {cmd:"stop"};
    if(res.cmd==="skip") return {cmd:"skip"};
    if(res.cmd==="cancel") continue;
    if(res.err){
      if(V.photoBusy) continue;
      if(FATAL.includes(res.err)||res.err==="start"){
        V.noMic=true; V.noMicWhy=res.err==="network"?"No signal for voice. Use the buttons and type on the form, then tap Next. Tap 🎙 to try voice again.":"Microphone not available. Allow the microphone for this site in your phone settings, or use the buttons and type on the form, then tap Next.";
        vNote(V.noMicWhy); if(res.text&&o.type==="long") return {val:sentences([res.text]),parts:[res.text]}; continue }
      tries++; if(tries>=2){ V.noMicWhy="Didn't hear anything. Tap 🎙 to try again, or use the buttons."; vNote(V.noMicWhy); vState("idle"); const t=await new Promise(r=>{ V.tap=r }); V.tap=null;
        if(!V.on) return {cmd:"stop"}; if(t.tap==="__mic"){ tries=0; vNote(o.hint||""); continue } res=t; // fall through to tap handling by re-entering
        const v=t.tap; if(v==="__stop") return {cmd:"stop"}; if(v==="__back") return {cmd:"back"}; if(v==="__skip") return {cmd:"skip"}; if(v==="__repeat"){ tries=0; speakText=prompt; continue }
        if(v==="__next"){ if(o.form){ const fv=o.form(); if(fv&&(!Array.isArray(fv)||fv.length)) return {val:fv,fromForm:true} } return {cmd:"skip"} }
        if(o.type==="rating"||o.type==="rating2") return {val:v,rest:""}; if(o.type==="yesno") return {val:v==="Y"}; continue }
      speakText=o.short||"Sorry, I didn't hear that."; continue }
    const text=res.text||""; vHeard(text);
    const c=o.type==="long"?null:parseCmd(text);
    if(c==="repeat"){ speakText=prompt; continue }
    if(c==="stop"||c==="back") return {cmd:c};
    if(c==="skip"&&o.type!=="photo") return {cmd:"skip"};
    let p=null;
    if(o.type==="rating"){ p=parseRating(text); if(p&&!["C","UA","NI","NA","NONC"].includes(p.val)) p=null }
    else if(o.type==="rating2"){ const q=parseRating(text); if(q&&(q.val==="UA"||q.val==="NI")) p=q }
    else if(o.type==="yesno"){ p=parseYesNo(text); if(!p&&o.yesText&&text.trim()) p={val:true,text:cap(text)} }
    else if(o.type==="date"){ const d=parseDate(text); p=d?{val:d}:(tries>=1?{val:null,raw:text}:null) }
    else if(o.type==="choice"){ const sel=parseChoice(text,o.list,o.kws); p=(sel.length||o.allowOther)?{val:sel,raw:cap(text)}:null }
    else if(o.type==="photo"){ if(/ (next|done|no|skip|continue|nah|nope|that's it|carry on) /.test(norm(text))) return {cmd:"skip"}; speakText="Say next to carry on."; continue }
    else if(o.type==="long"){ const parts=res.parts||[res.text||""]; p={val:sentences(parts),parts} }
    else p=text.trim()?{val:cap(text)}:null;
    if(p) return p;
    tries++; speakText="Sorry, I didn't catch that. "+(o.short||prompt);
  } }

/* ---- start / stop ---- */
async function voiceStart(){ if(!voiceSupported()||V.on||!CUR) return; const d=CUR; const t=tabByNum(d.tab);
  primeSpeech();
  if(t.kind==="record"){ const ok=await voiceConsent(d); if(!ok) return }
  V.on=true; V.gen++; V.noMic=false; V.pre=""; document.body.classList.add("voiceon"); vPanel(); vState("speaking");
  let res; try{ res=await (t.kind==="record"?voiceRecord(d):voiceInsp(d)) }catch(e){ console.error(e); res="error" }
  const was=V.on; if(was&&res==="done"){ vOpts({}); vNote(""); vHeard(""); await say(t.kind==="record"?"That's every section. Check the record on screen, then tap Review to sign and send.":"That's the end of the checklist. Check your answers on screen, then tap Review to sign and send.") }
  voiceClose(res==="done") }
function voiceStop(){ if(!V.on) return; V.on=false; V.gen++; stopHearing(); hush(); if(V.tap){ const f=V.tap; V.tap=null; f({tap:"__stop"}) } }
function voiceClose(done){ V.on=false; V.gen++; stopHearing(); hush(); V.tap=null; V.step=null; document.body.classList.remove("voiceon");
  const p=document.getElementById("vpanel"); if(p) p.remove(); document.querySelectorAll(".vfocus").forEach(x=>x.classList.remove("vfocus"));
  if(CUR){ save(CUR,true); queuePing(CUR,"draft"); if(location.hash.startsWith("#insp")) renderBar(CUR) }
  toast(done?"Voice finished – check the form, then tap Review":"Voice stopped – your answers are saved",3200) }
window.addEventListener("hashchange",()=>{ if(V.on&&!(CUR&&location.hash==="#insp/"+CUR.id)) voiceStop() });

/* ---- consent (discussion records) ---- */
function voiceConsent(d){ return new Promise(res=>{ const r=R(d); const m=document.createElement("div"); m.className="vmodal";
  m.innerHTML=`<div class="vm"><h3>🎙 Voice mode – discussion record</h3>
   <p>Your phone turns speech into text and PARRON types it into the record. <b>No audio is saved.</b> You check and edit everything before you sign.</p>
   <div class="f" style="margin-bottom:6px">How are you using it?</div>
   <label class="vopt"><input type="radio" name="vmode" value="self" checked><span><b>Just me</b> – dictating my notes of the discussion</span></label>
   <label class="vopt"><input type="radio" name="vmode" value="live"><span><b>During the discussion</b> – the other person is with me</span></label>
   <div id="vlive" class="hide"><label class="f">Their name <span class="req">*</span></label><input class="t" id="vwith" value="${esc(r.with||"")}" autocomplete="off">
    <label class="vchk"><input type="checkbox" id="vcons"><span>They have agreed to voice-to-text being used for this record</span></label>
    <div class="muted">Using a device to listen to or record a private conversation generally needs the consent of everyone in it (<i>Surveillance Devices Act 1998</i> (WA)). If they say no, close this and type the record instead.</div></div>
   <div class="vmb"><button class="btn g" id="vno">Cancel</button><button class="btn o" id="vyes">Start voice</button></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll("input[name=vmode]").forEach(x=>x.addEventListener("change",()=>{ m.querySelector("#vlive").classList.toggle("hide",m.querySelector("input[name=vmode]:checked").value!=="live") }));
  m.querySelector("#vno").onclick=()=>{ m.remove(); res(false) };
  m.querySelector("#vyes").onclick=()=>{ const mode=m.querySelector("input[name=vmode]:checked").value; const w=m.querySelector("#vwith").value.trim();
    if(mode==="live"&&(!w||!m.querySelector("#vcons").checked)){ toast("Enter their name and tick that they have agreed"); return }
    primeSpeech(); r.voice=r.voice||{};
    if(mode==="live"){ r.voice.live={with:w,at:Date.now()}; if(!(r.with||"").trim()){ r.with=w; const el=document.querySelector('[data-r="with"]'); if(el) el.value=w } }
    else r.voice.self=true;
    save(d,true); m.remove(); res(true) };
}) }
function voiceRow(d){ const v=R(d).voice; if(!v) return null;
  if(v.live) return ["Voice-to-text",`Used during the discussion with the agreement of ${v.live.with} (${fmtDT(v.live.at)}). No audio saved. Checked by the recorder before signing.`];
  if(v.self) return ["Voice-to-text","Used by the recorder to dictate notes. No audio saved. Checked before signing."];
  return null }

/* ---- inspection walkthrough ---- */
function qEl(id){ return document.getElementById("q-"+id.replace(".","_")) }
function setDetail(k,v){ CUR.details[k]=v; const el=document.querySelector(`[data-d="${k}"]`); if(el) el.value=v; save(CUR) }
async function voiceInsp(d){ const t=tabByNum(d.tab); const qs=allQ(t); const hide=t.hideStd||[];
  const first=qs.findIndex(q=>!(d.answers[q.id]&&d.answers[q.id].r));
  V.pre=first<0?"Voice mode on. Every question is already rated.":`Voice mode on. Answer with compliant, needs improvement, unacceptable, or not applicable. You can also say skip, back, repeat, or stop.`;
  if(!t.lockLocation&&!(d.details.location||"").trim()){ vFocus(document.querySelector('[data-d="location"]'));
    const a=await ask("Where is the inspection? Say the location or work front.",{type:"text",short:"Say the location.",form:()=>(document.querySelector('[data-d="location"]')||{}).value});
    if(a.cmd==="stop") return; if(a.val) setDetail("location",String(a.val)) }
  if(!hide.includes("supervisor")&&!(d.details.supervisor||"").trim()){ vFocus(document.querySelector('[data-d="supervisor"]'));
    const a=await ask("Who is the supervisor or person in charge? Say skip if not needed.",{type:"text",form:()=>(document.querySelector('[data-d="supervisor"]')||{}).value});
    if(a.cmd==="stop") return; if(a.val) setDetail("supervisor",nameCase(a.val)) }
  if(t.checks||t.log) V.pre=(V.pre?V.pre+" ":"")+(t.checks?"Do the time checks and photos on screen.":"Fill in the daily log on screen.");
  const nextIdx=i=>{ for(let k=i+1;k<qs.length;k++) if(!(d.answers[qs[k].id]&&d.answers[qs[k].id].r)) return k; return -1 };
  let i=first;
  while(i>=0&&i<qs.length){ const q=qs[i]; vFocus(qEl(q.id));
    const a=await ask(`${q.id}. ${q.text}`,{type:"rating",short:"Compliant, needs improvement, unacceptable, or not applicable?"});
    if(a.cmd==="stop") return;
    if(a.cmd==="back"){ i=Math.max(0,i-1); continue }
    if(a.cmd==="skip"){ i=nextIdx(i); continue }
    let r=a.val, note=a.rest||"";
    if(r==="NONC"){ const b=await ask("Is that unacceptable, or needs improvement?",{type:"rating2",short:"Unacceptable, or needs improvement?"}); if(b.cmd==="stop") return; if(b.cmd) continue; r=b.val; if(b.rest) note=(note?note+" ":"")+b.rest }
    const A=getA("q",q.id); A.r=r; save(CUR); refreshQ(q.id); vFocus(qEl(q.id));
    if(r==="C"||r==="NA"){ if(note){ A.comment=note; A.showc=true; save(CUR); refreshQ(q.id) } V.pre=r==="C"?"Compliant.":"Not applicable." }
    else { const f=await voiceNC("q",q.id,r,note); if(f==="stop") return; if(f==="redo") continue; V.pre="Recorded." }
    i=nextIdx(i) }
  // other hazards
  while(true){ vFocus(document.getElementById("others")||null);
    const y=await ask("Any other hazards not covered by the checklist? Yes or no.",{type:"yesno",short:"Any other hazards? Yes or no.",yesText:true});
    if(y.cmd==="stop") return; if(y.cmd||!y.val) break;
    let title=(y.text||"").trim();
    if(!title){ const h=await ask("Describe the hazard. Say next when you've finished.",{type:"long"}); if(h.cmd==="stop") return; if(h.cmd||!h.val) continue; title=h.val }
    const b=await ask("Is it unacceptable, or needs improvement?",{type:"rating2",short:"Unacceptable, or needs improvement?"}); if(b.cmd==="stop") return;
    const r=b.val||"NI"; CUR.others.push({title:cap(title).slice(0,140),r,snn:[],photos:[],finding:cap(title)}); save(CUR); renderOthers();
    const idx=CUR.others.length-1; vFocus(document.querySelectorAll("#others .q")[idx]);
    const f=await voiceNC("o",String(idx),r,title,true); if(f==="stop") return; V.pre="Hazard added." }
  return "done" }
async function voiceNC(kind,id,r,note,haveFinding){ const A=getA(kind,id); const refresh=()=>{ kind==="q"?refreshQ(id):renderOthers(); vFocus(kind==="q"?qEl(id):document.querySelectorAll("#others .q")[+id]) };
  if(r==="UA") V.pre="Unacceptable. Stop work and make the area safe, then notify the supervisor and SHE Manager.";
  if(note&&!haveFinding){ A.finding=cap(note); save(CUR); refresh() }
  if(!(A.finding||"").trim()){ const f=await ask("What was found? Say what, where and who. Say next when you've finished.",{type:"long",short:"What was found?"});
    if(f.cmd==="stop") return "stop"; if(f.cmd==="back") return "redo"; if(f.val){ A.finding=f.val; save(CUR); refresh() } }
  if(!(A.action||"").trim()){ const f=await ask("What's the corrective action? Say next when you've finished.",{type:"long",short:"What's the corrective action?"});
    if(f.cmd==="stop") return "stop"; if(f.cmd==="back") return "redo"; if(f.val){ A.action=f.val; save(CUR); refresh() } }
  const c=await ask("Was it closed out on the spot? Yes or no.",{type:"yesno",short:"Closed on the spot? Yes or no."});
  if(c.cmd==="stop") return "stop";
  if(!c.cmd){ A.closed=c.val; save(CUR); refresh();
    if(c.val){ const f=await ask("What action was taken? Say next when you've finished.",{type:"long"}); if(f.cmd==="stop") return "stop"; if(f.val){ A.taken=f.val; save(CUR); refresh() } }
    else { const o=await ask("Who is responsible for closing it out?",{type:"text"}); if(o.cmd==="stop") return "stop"; if(o.val){ A.owner=nameCase(o.val); save(CUR); refresh() }
      const due=await ask("When is it due? For example, tomorrow, Friday, or the 20th of October.",{type:"date",short:"When is it due?"}); if(due.cmd==="stop") return "stop";
      if(due.val){ A.due=due.val; save(CUR); refresh() } else if(due.raw!==undefined) V.pre="I didn't catch the date. Set it on screen." } }
  const p=await ask("Add a photo with the buttons below if you need one. Say next to carry on.",{type:"photo",photo:{kind,id},short:"Say next to carry on."});
  if(p.cmd==="stop") return "stop"; return "ok" }

/* ---- discussion record walkthrough ---- */
function recField(k,v){ R(CUR)[k]=v; const el=document.querySelector(`[data-r="${k}"]`); if(el) el.value=v; save(CUR) }
function recAddActs(parts){ const r=R(CUR); const keep=[]; let n=0;
  (parts||[]).forEach(p=>{ if(/^\s*action\b/i.test(p)){ const a=splitAction(p); if(a.a){ r.actions.push(a); n++ } } else keep.push(p) });
  if(n){ save(CUR); $("#recact").innerHTML=recActHTML(CUR) } return {n,text:sentences(keep)} }
async function longField(k,prompt,short){ const r=R(CUR); vFocus(document.querySelector(`[data-r="${k}"]`));
  const base=(r[k]||"").trim(); V.onLong=txt=>{ r[k]=(base?base+" ":"")+txt; save(CUR) };
  const a=await ask(prompt,{type:"long",short,form:()=>(document.querySelector(`[data-r="${k}"]`)||{}).value});
  V.onLong=null; if(a.cmd==="stop"){ return "stop" } if(a.cmd){ recField(k,base); return a.cmd }
  if(a.fromForm){ recField(k,a.val); return "ok" }
  const x=recAddActs(a.parts&&a.parts.length?a.parts:[a.val]); recField(k,(base?base+" ":"")+x.text);
  if(x.n) V.pre=`Added ${x.n} action${x.n>1?"s":""}.`; return "ok" }
async function voiceRecord(d){ const t=tabByNum(d.tab); const r=R(d); const F=t.form;
  V.pre="Voice mode on. I'll ask each section. Say skip, back, repeat, or stop at any time.";
  if(!(r.with||"").trim()){ vFocus(document.querySelector('[data-r="with"]')); const a=await ask("Who was the discussion held with?",{type:"text",form:()=>(document.querySelector('[data-r="with"]')||{}).value});
    if(a.cmd==="stop") return; if(a.val) recField("with",nameCase(a.val)) }
  if(!(d.details.location||"").trim()){ vFocus(document.querySelector('[data-d="location"]')); const a=await ask("Where did it take place? Say skip to leave it blank.",{type:"text",form:()=>(document.querySelector('[data-d="location"]')||{}).value});
    if(a.cmd==="stop") return; if(a.val) setDetail("location",String(a.val)) }
  if(!r.type.length){ vFocus($("#ch-type")); const a=await ask("What type of discussion was it? For example: scheduled check-in, formal review, rotation, field or on the job, informal, or a concern raised.",{type:"choice",list:F.types,kws:TYPE_KW,short:"What type of discussion? Or tap one on the form, then Next.",hint:"You can also tap the options on the form, then Next.",form:()=>R(CUR).type});
    if(a.cmd==="stop") return; if(a.val&&!a.fromForm){ a.val.forEach(x=>{ if(!r.type.includes(x)) r.type.push(x) }); save(CUR); $("#ch-type").innerHTML=chipsHTML(CUR,"type") } }
  if(!r.topics.length&&!(r.other||"").trim()){ vFocus($("#ch-topics")); const a=await ask("Which topic areas did you cover? For example: construction, safety, environment, quality, engineering, commercial, project controls, plant, training, or wellbeing.",{type:"choice",list:F.topics,kws:TOPIC_KW,allowOther:true,short:"Which topics?",hint:"You can also tap the topics on the form, then Next.",form:()=>R(CUR).topics});
    if(a.cmd==="stop") return; if(!a.cmd&&!a.fromForm){ if(a.val.length){ a.val.forEach(x=>{ if(!r.topics.includes(x)) r.topics.push(x) }); save(CUR); $("#ch-topics").innerHTML=chipsHTML(CUR,"topics") } else if(a.raw) recField("other",a.raw) } }
  if(!(r.summary||"").trim()){ const s=await longField("summary","Summary of the discussion. Speak freely, and say next when you've finished. Start a sentence with the word action to add an action.","Summary of the discussion."); if(s==="stop") return }
  if(!(r.input||"").trim()){ const s=await longField("input","What did they raise, ask or say? Say skip if nothing.","Their input or feedback."); if(s==="stop") return }
  if(!(r.support||"").trim()){ const s=await longField("support","Any support needed, or concerns noted? Say skip if none.","Support needed or concerns."); if(s==="stop") return }
  // owners and due dates for actions picked up from dictation
  for(let i=0;i<r.actions.length;i++){ const x=r.actions[i]; if(!(x.a||"").trim()) continue; vFocus($("#recact"));
    if(!(x.o||"").trim()){ const o=await ask(`Who owns action ${i+1}: ${x.a}?`,{type:"text"}); if(o.cmd==="stop") return; if(o.val) x.o=nameCase(o.val) }
    if(!x.due){ const due=await ask(`When is action ${i+1} due?`,{type:"date",short:"When is it due?"}); if(due.cmd==="stop") return; if(due.val) x.due=due.val }
    save(CUR); $("#recact").innerHTML=recActHTML(CUR) }
  // more actions
  while(true){ vFocus($("#recact"));
    const y=await ask(r.actions.some(a=>(a.a||"").trim())?"Any other actions? Say the action, or say no.":"Any actions to record? Say the action, or say no.",{type:"yesno",yesText:true,short:"Any actions? Say the action, or no."});
    if(y.cmd==="stop") return; if(y.cmd||!y.val) break;
    let txt=(y.text||"").trim();
    if(!txt){ const a=await ask("What's the action?",{type:"long",short:"What's the action?"}); if(a.cmd==="stop") return; if(a.cmd||!a.val) continue; txt=a.val }
    const act=splitAction(txt); r.actions.push(act); save(CUR); $("#recact").innerHTML=recActHTML(CUR); const n=r.actions.length;
    if(!act.o){ const o=await ask("Who owns it?",{type:"text"}); if(o.cmd==="stop") return; if(o.val) act.o=nameCase(o.val) }
    if(!act.due){ const due=await ask("When is it due?",{type:"date"}); if(due.cmd==="stop") return; if(due.val) act.due=due.val }
    save(CUR); $("#recact").innerHTML=recActHTML(CUR); V.pre=`Action ${n} added.` }
  // follow-up
  const fu=()=>{ $("#recfu").innerHTML=recFuHTML(CUR); bindRec(CUR) };
  if(!r.fu){ vFocus($("#recfu")); const a=await ask("Is follow-up required? Yes or no.",{type:"yesno"}); if(a.cmd==="stop") return; if(!a.cmd){ r.fu=a.val?"Yes":"No"; save(CUR); fu() } }
  if(r.fu==="Yes"&&!r.fuDate){ const a=await ask("When is the follow-up?",{type:"date"}); if(a.cmd==="stop") return; if(a.val){ r.fuDate=a.val; save(CUR); fu() } }
  if(!r.raise){ vFocus($("#recfu")); const a=await ask("Does this need to be raised with the sponsor or manager? Yes or no.",{type:"yesno"}); if(a.cmd==="stop") return; if(!a.cmd){ r.raise=a.val?"Yes":"No"; save(CUR); fu() } }
  if(r.raise==="Yes"&&!(r.raiseReason||"").trim()){ const a=await ask("What's the reason for raising it? Say next when you've finished.",{type:"long"}); if(a.cmd==="stop") return; if(a.val){ r.raiseReason=a.val; save(CUR); fu() } }
  return "done" }
