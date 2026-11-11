"use strict";
/* Event wiring, theme-change redraw, and boot. */

/* ============================================================
   WIRING
   ============================================================ */
function startBallot(){ beginRun(buildQueue()); }
function showProfile(){ show("profile"); }

$("cta-start").addEventListener("click", startBallot);
$("cta-resume").addEventListener("click", startBallot);
$("btn-answer-new").addEventListener("click", startBallot);
$("cta-profile").addEventListener("click", showProfile);
$("nav-profile").addEventListener("click", showProfile);
$("nav-ledger").addEventListener("click", function(){
  if(view!=="intro") show("intro");
  setTimeout(function(){ $("ledger").scrollIntoView({behavior:"smooth", block:"start"}); }, 30);
});
$("btn-back").addEventListener("click", back);
$("btn-skip").addEventListener("click", pass);
$("btn-bail").addEventListener("click", finishRun);

$("handle").addEventListener("input", function(){
  state.handle = cleanHandle(this.value);
  this.value = state.handle;
  save();
});

$("btn-copy-post").addEventListener("click", copyPost);
$("btn-card").addEventListener("click", saveCard);
$("btn-export").addEventListener("click", exportBackup);
$("btn-import").addEventListener("click", function(){ $("file-import").click(); });
$("file-import").addEventListener("change", function(){
  const f = this.files && this.files[0];
  if(f) importBackup(f);
  this.value = "";
});

$("btn-review").addEventListener("click", function(){
  const r = $("review");
  const hidden = r.classList.toggle("hidden");
  this.textContent = hidden ? "Review every answer" : "Hide the full list";
  if(!hidden) setTimeout(function(){ r.scrollIntoView({behavior:"smooth", block:"start"}); }, 30);
});

/* Erasing takes two clicks; the second must come within 4 seconds. */
$("btn-reset").addEventListener("click", function(){
  const btn = this;
  const disarm = function(){ delete btn.dataset.armed; btn.textContent = "Erase profile"; };
  if(btn.dataset.armed){
    disarm();
    state = blank();
    try{ localStorage.removeItem(KEY); }catch(e){ /* storage blocked */ }
    show("intro");
    toast("Profile erased");
    return;
  }
  btn.dataset.armed = "1";
  btn.textContent = "Erase everything — click again";
  setTimeout(function(){ if(btn.dataset.armed) disarm(); }, 4000);
});

/* redraw the canvases when the viewer flips theme */
const mq = window.matchMedia("(prefers-color-scheme: dark)");
(mq.addEventListener ? mq.addEventListener.bind(mq,"change") : mq.addListener.bind(mq))(function(){
  refreshHero();
  if(view==="profile") drawPrint($("print-canvas"), scores(), {values:true, ghost:state.prev});
});

/* ---- boot ---- */
renderLedger();
show(hasProfile() ? "profile" : "intro");
