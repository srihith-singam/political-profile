"use strict";
/* State persisted to localStorage, plus scoring and archetype naming. */

/* ============================================================
   STATE
   ============================================================ */
const KEY = "political-fingerprint/v1";
let state = load();

function blank(){
  return {answers:{}, handle:"", checkins:0, prev:null, runFrom:null, runFromN:0, started:null, updated:null};
}
function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return blank();
    const s = JSON.parse(raw);
    const b = blank();
    for(const k in b) if(!(k in s)) s[k]=b[k];
    // drop answers for propositions that no longer exist
    for(const id in s.answers) if(!BY_ID[id]) delete s.answers[id];
    return s;
  }catch(e){ return blank(); }
}
function save(){
  state.updated = Date.now();
  if(!state.started) state.started = state.updated;
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
}
function hasProfile(){ return Object.keys(state.answers).length > 0; }

/* ============================================================
   SCORING — each axis lands on 0-100, 50 being dead center.
   ============================================================ */
function scores(answers){
  const a = answers || state.answers, out = {};
  AXES.forEach(function(ax){
    let sum=0, n=0;
    ITEMS.forEach(function(q){
      if(q.ax!==ax.key) return;
      const v = a[q.id];
      if(typeof v !== "number") return;
      sum += v * q.dir; n++;
    });
    out[ax.key] = n ? Math.round(50 + (sum/(n*2))*50) : 50;
    out[ax.key+"_n"] = n;
  });
  return out;
}
function answeredCount(){
  let n=0; for(const id in state.answers) if(typeof state.answers[id]==="number") n++;
  return n;
}
function strongCount(){
  let n=0; for(const id in state.answers) if(Math.abs(state.answers[id])===2) n++;
  return n;
}
function archetype(sc){
  const ranked = AXES.map(function(ax){
    return {ax:ax, dev:Math.abs(sc[ax.key]-50), side:sc[ax.key]>=50?1:0};
  }).sort(function(a,b){ return b.dev-a.dev; });
  if(ranked[0].dev < 8) return "The Studiously Uncommitted";
  const adj = ranked[0].ax.words[ranked[0].side].adj;
  const noun = (ranked[1].dev >= 6 ? ranked[1] : ranked[0]).ax.words[(ranked[1].dev>=6?ranked[1]:ranked[0]).side].noun;
  return "The " + adj + " " + noun;
}
