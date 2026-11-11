"use strict";
/* Sharing and backup: file saving, X post text, PNG card. */

/* ============================================================
   SHARING + BACKUP
   ============================================================ */
let downloads = null;
$("btn-card").classList.add("hidden");
$("btn-export").classList.add("hidden");
if(window.claude && window.claude.use){
  window.claude.use("downloads").then(function(d){
    downloads = d;
    if(d){ $("btn-card").classList.remove("hidden"); $("btn-export").classList.remove("hidden"); }
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
  $("btn-card").classList.remove("hidden"); $("btn-export").classList.remove("hidden");
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

function postText(){
  const sc = scores(), done = answeredCount();
  const h = (state.handle||"").replace(/^@/,"").trim();
  const lines = [];
  lines.push("My political fingerprint" + (h ? " · @" + h : ""));
  lines.push("“" + archetype(sc) + "”");
  lines.push("");
  AXES.forEach(function(ax){
    const v = sc[ax.key];
    const pole = v===50 ? "dead center" : ax.poles[v>50?1:0];
    lines.push(ax.label + " → " + pole + " " + v);
  });
  lines.push("");
  lines.push(done + "/" + TOTAL + " propositions · " +
    (done ? Math.round(strongCount()/done*100) : 0) + "% answered without hedging");
  return lines.join("\n");
}

function drawCard(){
  const W = 1200, H = 675;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const sc = scores(), done = answeredCount();

  ctx.fillStyle = css("--paper"); ctx.fillRect(0,0,W,H);
  ctx.fillStyle = css("--card");
  ctx.fillRect(40,40,W-80,H-80);
  ctx.strokeStyle = css("--line"); ctx.lineWidth = 2;
  ctx.strokeRect(40,40,W-80,H-80);

  // the print, on the left
  const sub = document.createElement("canvas"); sub.width = 460; sub.height = 460;
  drawPrint(sub, sc, {values:true});
  ctx.drawImage(sub, 78, 108);

  // wordmark + archetype
  const h = (state.handle||"").replace(/^@/,"").trim();
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = css("--muted");
  ctx.font = "500 15px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("POLITICAL FINGERPRINT" + (h ? "   ·   @"+h : ""), 588, 138);

  ctx.fillStyle = css("--ink");
  const name = done ? archetype(sc) : "Nothing to plot yet";
  ctx.font = "800 46px 'Bricolage Grotesque', Helvetica, Arial, sans-serif";
  const words = name.split(" "); let ln = "", lines = [];
  words.forEach(function(w){
    const t = ln ? ln+" "+w : w;
    if(ctx.measureText(t).width > 520 && ln){ lines.push(ln); ln = w; } else ln = t;
  });
  lines.push(ln);
  lines.forEach(function(l,i){ ctx.fillText(l, 588, 196 + i*54); });

  // axis bars
  let y = 196 + lines.length*54 + 34;
  AXES.forEach(function(ax){
    const v = sc[ax.key];
    ctx.font = "600 16px 'Bricolage Grotesque', Helvetica, Arial, sans-serif";
    ctx.fillStyle = css("--ink");
    ctx.fillText(ax.label, 588, y);
    ctx.font = "500 15px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = css("--muted");
    const pole = v===50 ? "dead center" : ax.poles[v>50?1:0];
    ctx.textAlign = "right";
    ctx.fillText(pole.toLowerCase() + "  " + v, W-88, y);
    ctx.textAlign = "left";
    const bx = 588, bw = W-88-588;
    ctx.fillStyle = css("--sunk"); ctx.fillRect(bx, y+10, bw, 4);
    ctx.fillStyle = css("--accent");
    const half = bw/2;
    if(v>=50) ctx.fillRect(bx+half, y+10, (v-50)/50*half, 4);
    else ctx.fillRect(bx+half - (50-v)/50*half, y+10, (50-v)/50*half, 4);
    ctx.fillStyle = css("--line-2"); ctx.fillRect(bx+half-1, y+6, 2, 12);
    y += 40;
  });

  ctx.font = "500 14px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = css("--muted");
  ctx.fillText(done + "/" + TOTAL + " propositions  ·  " +
    (done ? Math.round(strongCount()/done*100) : 0) + "% without hedging  ·  " +
    fmtDate(state.updated||Date.now()), 78, H-72);
  return cv;
}
