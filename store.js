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

/* An answer is a whole number from -2 to 2, or "pass" for "No view". */
function isValidAnswer(v){
  return v === "pass" || (Number.isInteger(v) && v >= -2 && v <= 2);
}
/* Keep only answers to propositions that still exist, with valid values. */
function cleanAnswers(raw){
  const out = {};
  if(raw && typeof raw === "object"){
    for(const id in raw) if(BY_ID[id] && isValidAnswer(raw[id])) out[id] = raw[id];
  }
  return out;
}
function cleanHandle(h){
  return typeof h === "string" ? h.replace(/[^A-Za-z0-9_]/g, "") : "";
}

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return blank();
    const s = JSON.parse(raw);
    if(!s || typeof s !== "object") return blank();
    const b = blank();
    for(const k in b) if(!(k in s)) s[k] = b[k];
    s.answers = cleanAnswers(s.answers);
    return s;
  }catch(e){ return blank(); }
}
function save(){
  state.updated = Date.now();
  if(!state.started) state.started = state.updated;
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){ /* storage full or blocked */ }
}
function hasProfile(){ return Object.keys(state.answers).length > 0; }

/* ============================================================
   SCORING — each axis lands on 0-100, 50 being dead center.
   ============================================================ */
function scores(answers){
  const a = answers || state.answers, out = {};
  AXES.forEach(function(ax){
    let sum = 0, n = 0;
    ITEMS.forEach(function(q){
      const v = a[q.id];
      if(q.ax !== ax.key || typeof v !== "number") return;
      sum += v * q.dir; n++;
    });
    out[ax.key] = n ? Math.round(50 + (sum/(n*2))*50) : 50;
    out[ax.key+"_n"] = n;
  });
  return out;
}

function countAnswers(test){
  let n = 0;
  for(const id in state.answers) if(test(state.answers[id])) n++;
  return n;
}
function answeredCount(){ return countAnswers(function(v){ return typeof v === "number"; }); }
function passedCount(){ return countAnswers(function(v){ return v === "pass"; }); }
function strongCount(){ return countAnswers(function(v){ return v === 2 || v === -2; }); }
/* Share of answered propositions taken at full strength, as a whole percent. */
function convictionPct(){
  const done = answeredCount();
  return done ? Math.round(strongCount()/done*100) : 0;
}
function unansweredIn(pack){
  return pack.items.filter(function(q){ return !(q.id in state.answers); }).length;
}

/* The pole an axis score leans toward, or "dead center". */
function leaningPole(ax, v){
  return v === 50 ? "dead center" : ax.poles[v > 50 ? 1 : 0];
}
/* Name from the strongest axis (adjective) and the runner-up (noun), if it leans enough. */
function archetype(sc){
  const ranked = AXES.map(function(ax){
    return {ax:ax, dev:Math.abs(sc[ax.key]-50), side:sc[ax.key] >= 50 ? 1 : 0};
  }).sort(function(a,b){ return b.dev - a.dev; });
  const first = ranked[0];
  if(first.dev < 8) return "The Studiously Uncommitted";
  const second = ranked[1].dev >= 6 ? ranked[1] : first;
  return "The " + first.ax.words[first.side].adj + " " + second.ax.words[second.side].noun;
}
