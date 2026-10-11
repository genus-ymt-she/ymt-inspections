"use strict";
/* ---------- boot ---------- */
openDB().then(async()=>{await route();const was=RELAY.url;await loadRelay();
  // refresh the screen once the latest settings have loaded, so "Direct send" and the Dashboard show the current state
  if(RELAY.url!==was||!was){const h=location.hash||"#home";if(h.startsWith("#review")&&CUR)viewReview(CUR);else if(h==="#settings")viewSettings();else if(h==="#dash")viewDash();else if(h==="#home"||h==="")viewHome()}
  flushOutbox()});
window.addEventListener("online",()=>flushOutbox());
document.addEventListener("visibilitychange",()=>{if(!document.hidden)flushOutbox()});
setInterval(()=>{if(navigator.onLine!==false)flushOutbox()},90000);
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});
