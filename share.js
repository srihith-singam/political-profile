"use strict";
/* Sharing and backup: file saving, X post text, PNG card. */

/* ============================================================
   SHARING + BACKUP
   ============================================================ */
let downloads = null;
/* The save buttons only show once there is a way to save files. */
function showSaveButtons(on){
  $("btn-card").classList.toggle("hidden", !on);
  $("btn-export").classList.toggle("hidden", !on);
}
showSaveButtons(false);
if(window.claude && window.claude.use){
  window.claude.use("downloads").then(function(d){
    downloads = d;
    showSaveButtons(!!d);
  }).catch(function(){});
} else {
  // opened outside the viewer: fall back to a plain anchor download
  downloads = {save:function(req){
    return new Promise(function(res){
      const blob = req.data instanceof Blob ? req.data : new Blob([req.data]);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = req.filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
      res({status:"saved"});
    });
  }};
  showSaveButtons(true);
}
function saveFile(filename, data, okMsg){
  if(!downloads){ toast("Saving files isn't available here"); return; }
  downloads.save({filename:filename, data:data}).then(function(){
    toast(okMsg);
  }).catch(function(err){
    const code = err && err.code;
    if(code==="declined") return;
    if(code==="too_large") toast("That file is too big to save");
    else if(code==="rate_limited") toast("One save at a time — try again in a moment");
    else toast("Couldn't save the file");
  });
}

/* ---- X post ---- */
function postText(){
  const sc = scores(), h = state.handle;
  const lines = ["My political fingerprint" + (h ? " · @" + h : ""), "“" + archetype(sc) + "”", ""];
  AXES.forEach(function(ax){
    lines.push(ax.label + " → " + leaningPole(ax, sc[ax.key]) + " " + sc[ax.key]);
  });
  lines.push("", answeredCount() + "/" + TOTAL + " propositions · " + convictionPct() + "% answered without hedging");
  return lines.join("\n");
}
function copyPost(){
  const txt = postText();
  const done = function(){ toast("Post copied — paste it into X"); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done, function(){ fallbackCopy(txt, done); });
  } else fallbackCopy(txt, done);
}
function fallbackCopy(txt, ok){
  const ta = document.createElement("textarea");
  ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try{
    if(!document.execCommand("copy")) throw new Error("copy refused");
    ok();
  }catch(e){ toast("Copy failed — select the text manually"); }
  ta.remove();
}

/* ---- JSON backup ---- */
const BACKUP_FORMAT = "political-fingerprint/v1";
function exportBackup(){
  const payload = {
    format: BACKUP_FORMAT,
    exported: new Date().toISOString(),
    handle: state.handle,
    checkins: state.checkins,
    answers: state.answers
  };
  saveFile("political-fingerprint-backup.json", JSON.stringify(payload,null,2), "Backup saved");
}
/* Replace the current answers with a backup file's; invalid entries are dropped. */
function importBackup(file){
  const r = new FileReader();
  r.onload = function(){
    let d;
    try{ d = JSON.parse(r.result); }catch(e){ d = null; }
    if(!d || !d.answers || typeof d.answers !== "object"){
      toast("That file isn't a Political Fingerprint backup");
      return;
    }
    state.answers = cleanAnswers(d.answers);
    if(typeof d.handle === "string") state.handle = cleanHandle(d.handle);
    if(Number.isInteger(d.checkins) && d.checkins >= 0) state.checkins = d.checkins;
    state.prev = null; state.runFrom = null;
    save();
    show("profile");
    toast("Restored " + Object.keys(state.answers).length + " answers");
  };
  r.onerror = function(){ toast("Couldn't read that file"); };
  r.readAsText(file);
}

/* ---- PNG card ---- */
function saveCard(){
  drawCard().toBlob(function(blob){
    if(!blob){ toast("Couldn't render the card"); return; }
    saveFile("political-fingerprint.png", blob, "Profile card saved");
  }, "image/png");
}

function drawCard(){
  const W = 1200, H = 675;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const sc = scores(), done = answeredCount();
  const c = {};
  ["--paper","--card","--line","--line-2","--muted","--ink","--sunk","--accent"].forEach(function(n){ c[n] = css(n); });
  const monoFont = function(size){ return "500 " + size + "px " + MONO; };
  const headFont = function(weight, size){ return weight + " " + size + "px 'Bricolage Grotesque', Helvetica, Arial, sans-serif"; };

  ctx.fillStyle = c["--paper"]; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = c["--card"];
  ctx.fillRect(40,40,W-80,H-80);
  ctx.strokeStyle = c["--line"]; ctx.lineWidth = 2;
  ctx.strokeRect(40,40,W-80,H-80);

  // the print, on the left
  const sub = document.createElement("canvas"); sub.width = 460; sub.height = 460;
  drawPrint(sub, sc, {values:true});
  ctx.drawImage(sub, 78, 108);

  // wordmark + archetype
  const h = state.handle;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = c["--muted"];
  ctx.font = monoFont(15);
  ctx.fillText("POLITICAL FINGERPRINT" + (h ? "   ·   @"+h : ""), 588, 138);

  ctx.fillStyle = c["--ink"];
  const name = done ? archetype(sc) : "Nothing to plot yet";
  ctx.font = headFont(800, 46);
  const lines = [];
  let ln = "";
  name.split(" ").forEach(function(w){
    const t = ln ? ln+" "+w : w;
    if(ctx.measureText(t).width > 520 && ln){ lines.push(ln); ln = w; } else ln = t;
  });
  lines.push(ln);
  lines.forEach(function(l,i){ ctx.fillText(l, 588, 196 + i*54); });

  // axis bars
  let y = 196 + lines.length*54 + 34;
  AXES.forEach(function(ax){
    const v = sc[ax.key];
    ctx.font = headFont(600, 16);
    ctx.fillStyle = c["--ink"];
    ctx.fillText(ax.label, 588, y);
    ctx.font = monoFont(15);
    ctx.fillStyle = c["--muted"];
    ctx.textAlign = "right";
    ctx.fillText(leaningPole(ax, v).toLowerCase() + "  " + v, W-88, y);
    ctx.textAlign = "left";
    const bx = 588, bw = W-88-588;
    ctx.fillStyle = c["--sunk"]; ctx.fillRect(bx, y+10, bw, 4);
    ctx.fillStyle = c["--accent"];
    const half = bw/2, len = Math.abs(v-50)/50*half;
    ctx.fillRect(v >= 50 ? bx+half : bx+half-len, y+10, len, 4);
    ctx.fillStyle = c["--line-2"]; ctx.fillRect(bx+half-1, y+6, 2, 12);
    y += 40;
  });

  ctx.font = monoFont(14);
  ctx.fillStyle = c["--muted"];
  ctx.fillText(done + "/" + TOTAL + " propositions  ·  " + convictionPct() + "% without hedging  ·  " +
    fmtDate(state.updated||Date.now()), 78, H-72);
  return cv;
}
