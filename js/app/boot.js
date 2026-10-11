"use strict";
/* ---------- boot ---------- */
openDB().then(async()=>{setNet();await loadLocalSent();updateBadges();await route();const was=RELAY.url;await loadRelay();
  // refresh the screen once the latest settings have loaded, so "Direct send" and Insights show the current state
  if(RELAY.url!==was||!was){if((location.hash||"").startsWith("#insp")){/* keep the open form as it is */}else if(location.hash.startsWith("#review")&&CUR)viewReview(CUR);else await route()}
  await relayVersion();flushOutbox();regRefresh().then(()=>updateBadges())});
window.addEventListener("online",()=>{flushOutbox();flushUpdates()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){flushOutbox();flushUpdates()}});
setInterval(()=>{if(navigator.onLine!==false){flushOutbox();flushUpdates()}},90000);
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(reg=>{document.addEventListener("visibilitychange",()=>{if(!document.hidden)reg.update().catch(()=>{})})}).catch(()=>{});
  // a new version has taken over: reload once so the screen shows it (but never in the middle of a form)
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!had||window._reloading)return;
    if(/^#(insp|review|report)/.test(location.hash)){toast("PARRON has been updated – it will refresh when you finish this form",5000);window._pendingReload=true;return}
    window._reloading=true;location.reload()});
  window.addEventListener("hashchange",()=>{if(window._pendingReload&&!/^#(insp|review|report)/.test(location.hash)){window._pendingReload=false;window._reloading=true;location.reload()}})}
