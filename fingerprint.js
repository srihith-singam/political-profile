"use strict";
/* Hexagonal fingerprint drawing on canvas, and the animated hero. */

/* ============================================================
   THE FINGERPRINT — hexagonal plot on canvas.
   ============================================================ */
function hexPoints(cx, cy, r){
  const pts = [];
  for(let i=0;i<6;i++){
    const a = -Math.PI/2 + i*Math.PI/3;
    pts.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]);
  }
  return pts;
}
function tracePoly(ctx, pts){
  ctx.beginPath();
  pts.forEach(function(p,i){ i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]); });
  ctx.closePath();
}
/* Hexagon vertices pulled toward the center by each axis score (0-100). */
function plotPoints(cx, cy, R, vals){
  return hexPoints(cx,cy,R).map(function(p,i){
    const t = Math.max(0, Math.min(100, vals[AXES[i].key]))/100;
    return [cx+(p[0]-cx)*t, cy+(p[1]-cy)*t];
  });
}
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function drawPrint(cv, vals, opt){
  opt = opt || {};
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height, cx = W/2, cy = H/2;
  const R = Math.min(W,H) * (opt.labels===false ? 0.44 : 0.355);
  const k = W/640; // stroke scale relative to the reference canvas
  ctx.clearRect(0,0,W,H);
  ctx.lineJoin = "round";

  const line = css("--line"), line2 = css("--line-2"), accent = css("--accent"),
        muted = css("--muted"), ink = css("--ink");

  // rings
  [0.25,0.5,0.75,1].forEach(function(t){
    tracePoly(ctx, hexPoints(cx,cy,R*t));
    if(t===0.5){ ctx.setLineDash([3*k,4*k]); ctx.strokeStyle = line2; }
    else { ctx.setLineDash([]); ctx.strokeStyle = line; }
    ctx.lineWidth = 1*k; ctx.stroke();
  });
  ctx.setLineDash([]);

  // spokes
  ctx.strokeStyle = line; ctx.lineWidth = 1*k;
  hexPoints(cx,cy,R).forEach(function(p){
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p[0],p[1]); ctx.stroke();
  });

  // ghost outline (previous check-in)
  if(opt.ghost){
    tracePoly(ctx, plotPoints(cx,cy,R,opt.ghost));
    ctx.setLineDash([4*k,4*k]); ctx.strokeStyle = line2; ctx.lineWidth = 1.5*k; ctx.stroke();
    ctx.setLineDash([]);
  }

  // the print itself
  const pts = plotPoints(cx,cy,R,vals);
  tracePoly(ctx,pts);
  ctx.fillStyle = accent; ctx.globalAlpha = opt.alpha==null ? 0.17 : opt.alpha; ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = accent; ctx.lineWidth = 2.2*k; ctx.stroke();
  ctx.fillStyle = accent;
  pts.forEach(function(p){
    ctx.beginPath(); ctx.arc(p[0],p[1],4*k,0,Math.PI*2); ctx.fill();
  });

  if(opt.labels === false) return;

  // axis labels, set outside the outer ring
  const lr = R + 26*k;
  const labelFont = "600 " + (11.5*k) + "px " + MONO, valueFont = "700 " + (13*k) + "px " + MONO;
  ctx.textBaseline = "middle";
  hexPoints(cx,cy,lr).forEach(function(p,i){
    const ax = AXES[i];
    const dx = p[0]-cx;
    ctx.textAlign = Math.abs(dx) < 1 ? "center" : (dx > 0 ? "left" : "right");
    ctx.font = labelFont; ctx.fillStyle = muted;
    ctx.fillText(ax.label.toUpperCase(), p[0], p[1] - (opt.values ? 7*k : 0));
    if(opt.values){
      ctx.font = valueFont; ctx.fillStyle = ink;
      ctx.fillText(String(vals[ax.key]), p[0], p[1] + 9*k);
    }
  });
}

/* ---- hero: an ambient print that keeps drifting ---- */
(function heroPrint(){
  const cv = $("hero-canvas"); if(!cv) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cur = {}, target = {};
  const roll = function(){ AXES.forEach(function(a){ target[a.key] = 18 + Math.random()*64; }); };
  AXES.forEach(function(a){ cur[a.key] = 30 + Math.random()*40; });
  roll();
  let last = 0;
  function frame(ts){
    if(hasProfile()){ refreshHero(); return; }
    if(ts - last > 2600){ roll(); last = ts; }
    let moving = false;
    AXES.forEach(function(a){
      const d = target[a.key] - cur[a.key];
      if(Math.abs(d) > 0.15){ cur[a.key] += d*0.018; moving = true; }
    });
    drawPrint(cv, cur, {labels:false, alpha:0.14});
    if(!reduce || moving) requestAnimationFrame(frame);
  }
  if(reduce){ AXES.forEach(function(a){ cur[a.key]=target[a.key]; }); drawPrint(cv,cur,{labels:false,alpha:0.14}); }
  else requestAnimationFrame(frame);
})();

function refreshHero(){
  const cv = $("hero-canvas");
  if(cv && hasProfile()) drawPrint(cv, scores(), {labels:false, alpha:0.2});
}
