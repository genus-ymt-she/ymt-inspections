"use strict";
/* ---------- boot ---------- */
openDB().then(async()=>{setNet();await loadLocalSent();updateBadges();await route();const was=RELAY.url;await loadRelay();
  // refresh the screen once the latest settings have loaded, so "Direct send" and Insights show the current state
  if(RELAY.url!==was||!was){if((location.hash||"").startsWith("#insp")){/* keep the open form as it is */}else if(location.hash.startsWith("#review")&&CUR)viewReview(CUR);else await route()}
  await relayVersion();flushOutbox();regRefresh().then(()=>updateBadges())});
window.addEventListener("online",()=>{flushOutbox();flushUpdates()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){flushOutbox();flushUpdates()}});
setInterval(()=>{if(navigator.onLine!==false){flushOutbox();flushUpdates()}},90000);
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});
