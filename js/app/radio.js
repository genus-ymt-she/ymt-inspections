"use strict";
/* ---------- PARRON Radio – shuffle play of the project playlist ----------
   Songs play from their official YouTube uploads through YouTube's own embedded player (licensed by YouTube –
   no music is stored in PARRON). The player sits in a dock outside the page, so music keeps playing while
   people move around the app. Browsers pause it when the phone is locked or another app is opened. */
const RADIO={playing:false,started:false,ready:false,player:null,order:[],pos:0,alt:0,loading:null,stuck:null};
function radioLoad(){try{const s=JSON.parse(ls("radio")||"null");if(s&&Array.isArray(s.order)&&s.order.length===RADIO_SONGS.length){RADIO.order=s.order;RADIO.pos=Math.min(s.pos||0,s.order.length-1);return}}catch(e){}radioShuffle(true)}
function radioSave(){ls("radio",JSON.stringify({order:RADIO.order,pos:RADIO.pos}))}
function radioShuffle(silent){const o=RADIO_SONGS.map((_,i)=>i);for(let i=o.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[o[i],o[j]]=[o[j],o[i]]}
  // keep the song that is playing at the top so a reshuffle does not cut it off
  if(!silent&&RADIO.started){const cur=RADIO.order[RADIO.pos];o.splice(o.indexOf(cur),1);o.unshift(cur)}RADIO.order=o;RADIO.pos=0;RADIO.alt=0;radioSave()}
const radioSong=()=>RADIO_SONGS[RADIO.order[RADIO.pos]]||RADIO_SONGS[0];
const radioId=s=>(s.ids||[])[Math.min(RADIO.alt,(s.ids||[]).length-1)];
function radioAPI(){if(window.YT&&YT.Player)return Promise.resolve();if(RADIO.loading)return RADIO.loading;
  RADIO.loading=new Promise((res,rej)=>{const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(prev)try{prev()}catch(e){}res()};
    const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";s.onerror=()=>{RADIO.loading=null;rej(new Error("YouTube could not be reached"))};document.head.appendChild(s)});return RADIO.loading}
function radioDock(){let k=document.getElementById("radioDock");if(k)return k;k=document.createElement("div");k.id="radioDock";k.className="rdock hide";
  k.innerHTML=`<div class="rv"><div id="radioPlayer"></div></div><div class="rm"><button class="rinfo" onclick="go('#radio')" aria-label="Open PARRON Radio"><small>${ic("radio","s")} PARRON RADIO</small><b id="rdT"></b><span id="rdA"></span></button>
    <div class="rbtns"><button onclick="radioToggle()" id="rdP" aria-label="Play or pause">${ic("play")}</button><button onclick="radioNext()" aria-label="Next song">${ic("skip")}</button><button onclick="radioStop()" aria-label="Stop and close">${ic("x")}</button></div></div>`;
  document.body.appendChild(k);return k}
async function radioEnsure(){radioDock();if(RADIO.player)return RADIO.player;await radioAPI();
  return new Promise(res=>{RADIO.player=new YT.Player("radioPlayer",{width:"100%",height:"100%",videoId:radioId(radioSong()),
    playerVars:{playsinline:1,rel:0,modestbranding:1,iv_load_policy:3,origin:location.origin},
    events:{onReady:()=>{RADIO.ready=true;res(RADIO.player)},onStateChange:radioState,onError:radioError}})})}
function radioState(e){const S=YT.PlayerState;
  if(e.data===S.PLAYING){RADIO.playing=true;RADIO.started=true;clearTimeout(RADIO.stuck);radioHint(false)}
  else if(e.data===S.PAUSED){RADIO.playing=false}
  else if(e.data===S.ENDED){RADIO.playing=false;radioNext();return}
  radioPaint()}
function radioError(){const s=radioSong();if(RADIO.alt<(s.ids||[]).length-1){RADIO.alt++;radioCue(true);return}toast(`“${s.t}” is not available – skipping`,3000);radioNext()}
function radioCue(play){const p=RADIO.player;if(!p||!RADIO.ready)return;const id=radioId(radioSong());if(play){p.loadVideoById(id);radioWatch()}else p.cueVideoById(id);radioSave();radioPaint()}
/* phones can refuse to start sound that was not started by a tap – if nothing plays, ask for a tap on the video */
function radioWatch(){clearTimeout(RADIO.stuck);RADIO.stuck=setTimeout(()=>{if(!RADIO.playing)radioHint(true)},2500)}
function radioHint(on){const h=document.getElementById("rHint");if(h)h.classList.toggle("hide",!on)}
async function radioPlay(i){try{if(i!=null){const k=RADIO.order.indexOf(i);RADIO.pos=k<0?0:k;RADIO.alt=0}
    const fresh=!RADIO.player;const p=await radioEnsure();RADIO.started=true;
    if(fresh&&i==null)p.playVideo();else if(i!=null||fresh)radioCue(true);else p.playVideo();radioWatch();radioPaint()}
  catch(e){console.warn(e);toast("PARRON Radio needs signal – YouTube could not be reached",4500)}}
function radioToggle(){if(!RADIO.player||!RADIO.ready){radioPlay();return}if(RADIO.playing)RADIO.player.pauseVideo();else{RADIO.player.playVideo();radioWatch()}}
function radioNext(){RADIO.pos=(RADIO.pos+1)%RADIO.order.length;if(RADIO.pos===0)radioShuffle(true);RADIO.alt=0;if(RADIO.player&&RADIO.ready)radioCue(true);else radioPaint()}
function radioPrev(){RADIO.pos=(RADIO.pos-1+RADIO.order.length)%RADIO.order.length;RADIO.alt=0;if(RADIO.player&&RADIO.ready)radioCue(true);else radioPaint()}
function radioReshuffle(){radioShuffle(false);toast("Playlist shuffled",2000);radioPaint();if(location.hash==="#radio")viewRadio()}
function radioStop(){if(RADIO.player&&RADIO.ready)try{RADIO.player.stopVideo()}catch(e){}RADIO.playing=false;RADIO.started=false;clearTimeout(RADIO.stuck);radioPaint();if(location.hash==="#radio")viewRadio()}
/* pause for voice mode (the microphone and speech need the speaker) */
function radioPause(){if(RADIO.playing&&RADIO.player)try{RADIO.player.pauseVideo()}catch(e){}}
function radioPaint(){const hd=document.querySelector("header.top");if(hd)document.documentElement.style.setProperty("--hdr",hd.offsetHeight+"px");const k=document.getElementById("radioDock");const on=(location.hash||"#home")==="#radio";const s=radioSong();
  if(k){k.classList.toggle("hide",!(on||RADIO.started));k.classList.toggle("full",on);
    const t=k.querySelector("#rdT"),a=k.querySelector("#rdA"),p=k.querySelector("#rdP");if(t)t.textContent=s.t;if(a)a.textContent=s.a;if(p)p.innerHTML=ic(RADIO.playing?"pause":"play")}
  document.body.classList.toggle("radio-on",!!(RADIO.started&&!on));
  const big=document.getElementById("rBig");if(big)big.innerHTML=ic(RADIO.playing?"pause":"play","l");
  const np=document.getElementById("rNow");if(np)np.innerHTML=`<b>${esc(s.t)}</b><span>${esc(s.a)}</span>`;
  document.querySelectorAll(".rlist button[data-i]").forEach(b=>{const cur=+b.dataset.i===RADIO.order[RADIO.pos];b.classList.toggle("on",cur);b.querySelector(".rn").innerHTML=cur&&RADIO.playing?ic("music","s"):b.dataset.n})}
window.addEventListener("hashchange",()=>setTimeout(radioPaint,0));
function radioYouTubeLink(){const ids=RADIO.order.slice(RADIO.pos).concat(RADIO.order.slice(0,RADIO.pos)).map(i=>RADIO_SONGS[i].ids[0]);return `https://www.youtube.com/watch_videos?video_ids=${ids.slice(0,50).join(",")}`}
function viewRadio(){setHeader("PARRON Radio",`${RADIO_SONGS.length} songs · shuffle play`,{icon:"back",aria:"Back",fn:()=>go("#home")});if(!RADIO.order.length)radioLoad();
  const s=radioSong();const nowIdx=RADIO.order[RADIO.pos];
  render(`<div class="rspace"></div>
   <div class="card rnow"><div id="rNow"><b>${esc(s.t)}</b><span>${esc(s.a)}</span></div>
    <div class="rctl"><button class="rc" onclick="radioPrev()" aria-label="Previous song">${ic("prev")}</button><button class="rc big" id="rBig" onclick="radioToggle()" aria-label="Play or pause">${ic(RADIO.playing?"pause":"play","l")}</button><button class="rc" onclick="radioNext()" aria-label="Next song">${ic("skip")}</button></div>
    <div id="rHint" class="muted hide" style="text-align:center;margin-top:8px">Tap the video once to start the music.</div>
    <div class="rrow"><button class="btn g s" onclick="radioReshuffle()">${ic("shuffle","s")} Shuffle</button><a class="btn g s" href="${radioYouTubeLink()}" target="_blank" rel="noopener">${ic("ext","s")} Open in YouTube</a>${RADIO.started?`<button class="btn g s" onclick="radioStop()">${ic("x","s")} Stop</button>`:""}</div></div>
   <div class="alert org">${ic("alert")}<div><b>Driving? Set it playing before you move off.</b> Don't touch the phone while driving (SNN – Vehicles &amp; Driving). Use the car's Bluetooth or steering-wheel controls, and pull over safely to change anything.</div></div>
   <h2>Up next</h2><div class="card rlist">${RADIO.order.map((i,k)=>{const x=RADIO_SONGS[i];return `<button data-i="${i}" data-n="${k+1}" class="${i===nowIdx?"on":""}" onclick="radioPlay(${i})"><span class="rn">${k+1}</span><span class="rt"><b>${esc(x.t)}</b><small>${esc(x.a)}</small></span><em>${esc(x.k)}</em></button>`}).join("")}</div>
   <p class="foot">Music plays from the artists' official YouTube videos and uses mobile data (roughly 3–5 MB a song). It keeps playing while you use PARRON, but pauses if the phone is locked or you switch apps – use <b>Open in YouTube</b> for that.</p>`);
  radioDock();radioPaint();radioEnsure().then(()=>radioPaint()).catch(()=>{const h=document.getElementById("rHint");if(h){h.textContent="No signal – PARRON Radio needs a connection.";h.classList.remove("hide")}})}
