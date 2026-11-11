"use strict";
/* Event wiring, theme-change redraw, and boot. */

/* ============================================================
   WIRING
   ============================================================ */
$("cta-start").addEventListener("click", function(){ beginRun(buildQueue()); });
$("cta-resume").addEventListener("click", function(){ beginRun(buildQueue()); });
$("cta-profile").addEventListener("click", function(){ show("profile"); });
$("nav-profile").addEventListener("click", function(){ show("profile"); });
$("nav-ledger").addEventListener("click", function(){
  if(view!=="intro") show("intro");
  setTimeout(function(){ $("ledger").scrollIntoView({behavior:"smooth", block:"start"}); }, 30);
});
$("btn-back").addEventListener("click", function(){ if(qi>0){ qi--; renderQuestion(); } });
$("btn-skip").addEventListener("click", pass);
$("btn-bail").addEventListener("click", finishRun);
$("btn-answer-new").addEventListener("click", function(){
  beginRun(buildQueue(function(q){ return true; }));
});

$("handle").addEventListener("input", function(){
  state.handle = this.value.replace(/[^A-Za-z0-9_]/g,"");
  this.value = state.handle;
  save();
});

$("btn-copy-post").addEventListener("click", function(){
  const txt = postText();
  const done = function(){ toast("Post copied — paste it into X"); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done, function(){ fallbackCopy(txt, done); });
  } else fallbackCopy(txt, done);
});
function fallbackCopy(txt, ok){
  const ta = document.createElement("textarea");
  ta.value = txt; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); ok(); }catch(e){ toast("Copy failed — select the text manually"); }
  ta.remove();
}

$("btn-card").addEventListener("click", function(){
  drawCard().toBlob(function(blob){
    if(!blob){ toast("Couldn't render the card"); return; }
    saveFile("political-fingerprint.png", blob, "Profile card saved");
  }, "image/png");
});

$("btn-export").addEventListener("click", function(){
  const payload = {
    format:"political-fingerprint/v1",
    exported: new Date().toISOString(),
    handle: state.handle,
    checkins: state.checkins,
    answers: state.answers
  };
  saveFile("political-fingerprint-backup.json", JSON.stringify(payload,null,2), "Backup saved");
});

$("btn-import").addEventListener("click", function(){ $("file-import").click(); });
$("file-import").addEventListener("change", function(){
  const f = this.files && this.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = function(){
    try{
      const d = JSON.parse(r.result);
      if(!d || typeof d.answers !== "object") throw new Error("shape");
      let kept = 0;
      const next = {};
      for(const id in d.answers){
        if(!BY_ID[id]) continue;
        const v = d.answers[id];
        if(v==="pass" || (typeof v==="number" && v>=-2 && v<=2)){ next[id]=v; kept++; }
      }
      state.answers = next;
      if(typeof d.handle === "string") state.handle = d.handle.replace(/[^A-Za-z0-9_]/g,"");
      if(typeof d.checkins === "number") state.checkins = d.checkins;
      state.prev = null; state.runFrom = null;
      save();
      show("profile");
      toast("Restored " + kept + " answers");
    }catch(e){
      toast("That file isn't a Political Fingerprint backup");
    }
  };
  r.readAsText(f);
  this.value = "";
});

$("btn-review").addEventListener("click", function(){
  const r = $("review");
  const open = r.classList.toggle("hidden");
  this.textContent = open ? "Review every answer" : "Hide the full list";
  if(!open) setTimeout(function(){ r.scrollIntoView({behavior:"smooth", block:"start"}); }, 30);
});

$("btn-reset").addEventListener("click", function(){
  if(this.dataset.armed){
    state = blank();
    try{ localStorage.removeItem(KEY); }catch(e){}
    delete this.dataset.armed;
    this.textContent = "Erase profile";
    show("intro");
    toast("Profile erased");
    return;
  }
  this.dataset.armed = "1";
  this.textContent = "Erase everything — click again";
  const btn = this;
  setTimeout(function(){
    if(btn.dataset.armed){ delete btn.dataset.armed; btn.textContent = "Erase profile"; }
  }, 4000);
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
