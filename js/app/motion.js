"use strict";
/* ---------- motion: entrance stagger, number count-up, success tick ----------
   Everything here is skipped when the phone asks for reduced motion. */
const calm=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
/* stagger cards and tiles in as a screen opens */
function motionIn(root){if(calm()||!root)return;
  root.querySelectorAll(".tiles,.kpis,.lib,.attn,.tsteps,.rlist,#drafts~.card").forEach(box=>{[...box.children].forEach((el,i)=>{el.style.setProperty("--i",Math.min(i,14));el.classList.add("rise")})});
  root.querySelectorAll(".kpi .v,.hero .kp b,.ach b,.ftotal b span").forEach(countUp)}
/* numbers count up from zero (only plain whole numbers; "90%" style values keep their suffix element) */
function countUp(el){const node=[...el.childNodes].find(n=>n.nodeType===3&&/^\s*\d+\s*$/.test(n.textContent));if(!node)return;const to=+node.textContent.trim();if(!to||to>100000)return;
  const t0=performance.now(),dur=Math.min(900,420+to*12);node.textContent="0";
  const step=t=>{const p=Math.min(1,(t-t0)/dur);node.textContent=String(Math.round(to*(1-Math.pow(1-p,3))));if(p<1&&node.isConnected)requestAnimationFrame(step);else node.textContent=String(to)};requestAnimationFrame(step)}
/* full-screen success tick after a report is sent */
function celebrate(title,sub){if(calm()){toast(`✓ ${title}`,3500);return}
  const o=document.createElement("div");o.className="done-ov";o.setAttribute("role","status");
  o.innerHTML=`<div class="done-card"><svg viewBox="0 0 64 64" class="done-tick" aria-hidden="true"><circle cx="32" cy="32" r="29"/><path d="M19 33.5 28 42 46 23"/></svg><b>${esc(title)}</b>${sub?`<span>${esc(sub)}</span>`:""}</div>`;
  document.body.appendChild(o);const close=()=>{o.classList.add("out");setTimeout(()=>o.remove(),260)};o.onclick=close;setTimeout(close,1700)}
