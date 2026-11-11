"use strict";
/* DOM helpers: $(), CSS token reader, date formatting, toast. */

/* ============================================================
   DOM helpers
   ============================================================ */
const $ = function(id){ return document.getElementById(id); };
const css = function(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
const fmtDate = function(ms){
  return new Date(ms).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
};
const fmtAdded = function(iso){
  const p = iso.split("-");
  return new Date(+p[0], +p[1]-1, +p[2]).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
};
let toastTimer;
function toast(msg){
  const el = $("toast"); el.textContent = msg; el.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(function(){ el.classList.remove("on"); }, 2200);
}
