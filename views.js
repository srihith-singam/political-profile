"use strict";
/* Views: intro + question log, ballot, profile. */

/* ============================================================
   VIEWS
   ============================================================ */
const VIEWS = {intro:$("view-intro"), test:$("view-test"), profile:$("view-profile")};
let view = "intro";
function show(name){
  view = name;
  for(const k in VIEWS) VIEWS[k].classList.toggle("hidden", k!==name);
  $("nav-profile").classList.toggle("hidden", !hasProfile());
  if(name==="intro"){ renderIntro(); refreshHero(); }
  if(name==="profile"){ renderProfile(); }
  window.scrollTo({top:0, behavior:"auto"});
  updateRail();
}
function updateRail(){
  const done = answeredCount() + passedCount();
  $("rail-fill").style.width = Math.round(done/TOTAL*100) + "%";
}

/* ============================================================
   INTRO + QUESTION LOG
   ============================================================ */
function packStatus(p){
  const open = unansweredIn(p);
  if(open===0) return {cls:"done", text:"Complete"};
  if(open===p.items.length && hasProfile()) return {cls:"new", text:"Unanswered"};
  if(open===p.items.length) return {cls:"", text:"Waiting"};
  return {cls:"", text:open + " left"};
}
function renderLedger(){
  $("edition-no").textContent = PACKS.length;
  $("pack-rows").innerHTML = PACKS.map(function(p){
    const st = packStatus(p);
    return '<tr>'+
      '<td class="name">'+p.name+'</td>'+
      '<td>'+fmtAdded(p.added)+'</td>'+
      '<td>'+p.items.length+'</td>'+
      '<td>'+p.covers+'</td>'+
      '<td style="text-align:right"><span class="chip '+st.cls+'">'+st.text+'</span></td>'+
    '</tr>';
  }).join("");
}
function renderIntro(){
  renderLedger();
  const done = answeredCount(), passed = passedCount(), open = TOTAL - done - passed;
  const start = $("cta-start"), resume = $("cta-resume"), prof = $("cta-profile");
  if(!hasProfile()){
    start.classList.remove("hidden"); start.textContent = "Start the ballot";
    resume.classList.add("hidden"); prof.classList.add("hidden");
    $("intro-status").textContent = TOTAL + " propositions. Nothing is sent anywhere — your answers stay in this browser.";
  } else {
    start.classList.add("hidden");
    prof.classList.remove("hidden");
    resume.classList.toggle("hidden", open===0);
    resume.textContent = open ? "Answer the remaining " + open : "Resume";
    $("intro-status").textContent = done + " of " + TOTAL + " answered" +
      (passed ? " · " + passed + " passed" : "") +
      (state.updated ? " · last saved " + fmtDate(state.updated) : "");
  }
}

/* ============================================================
   BALLOT
   ============================================================ */
let queue = [], qi = 0;

/* Ids of every proposition not yet answered or passed, in ballot order. */
function buildQueue(){
  return ITEMS.filter(function(q){ return !(q.id in state.answers); })
    .map(function(q){ return q.id; });
}
function beginRun(ids){
  queue = ids;
  qi = 0;
  if(!queue.length){ show("profile"); return; }
  if(!state.runFrom){ state.runFrom = scores(); state.runFromN = answeredCount(); }
  save();
  show("test");
  renderQuestion();
}
function renderQuestion(){
  const q = BY_ID[queue[qi]];
  if(!q){ finishRun(); return; }
  const ax = AXIS[q.ax];
  const card = $("q-card");
  card.classList.remove("anim-in"); void card.offsetWidth; card.classList.add("anim-in");

  const overallIdx = answeredCount() + passedCount() + 1;
  $("q-counter").textContent = "Q " + String(Math.min(overallIdx,TOTAL)).padStart(2,"0") + " / " + TOTAL;
  $("q-pack").textContent = q.pack.name;
  $("q-axis").textContent = ax.label;
  $("q-topic").textContent = q.topic;
  $("q-text").textContent = q.t;

  $("ovals").innerHTML = CHOICES.map(function(c){
    return '<button class="oval" role="radio" aria-checked="false" data-v="'+c.v+'">'+
      '<i></i><span>'+c.label+'</span></button>';
  }).join("");
  markChoice(state.answers[q.id]);
  $("btn-back").disabled = qi===0;
}
/* Highlight the oval for answer v (none if v isn't a number). */
function markChoice(v){
  Array.prototype.forEach.call($("ovals").children, function(b){
    const on = +b.dataset.v === v;
    b.setAttribute("aria-checked", on ? "true" : "false");
    if(on) b.dataset.on = "1"; else delete b.dataset.on;
    if(on && Math.abs(v)===2) b.dataset.strong = "1"; else delete b.dataset.strong;
  });
}
$("ovals").addEventListener("click", function(e){
  const b = e.target.closest("button[data-v]");
  if(b) answer(+b.dataset.v);
});

/* While an answer is animating out, ignore further input so a quick second
   key press can't overwrite it or skip the next proposition. */
let advancing = false;
function record(v, delay){
  if(advancing) return;
  const q = BY_ID[queue[qi]];
  if(!q) return;
  state.answers[q.id] = v;
  save();
  updateRail();
  advancing = true;
  setTimeout(function(){ advancing = false; qi++; renderQuestion(); }, delay);
}
function answer(v){ markChoice(v); record(v, 260); }
function pass(){ record("pass", 0); }
function back(){
  if(advancing || qi===0) return;
  qi--; renderQuestion();
}
function finishRun(){
  if(state.runFrom && answeredCount() > (state.runFromN||0)){
    const before = state.runFrom, now = scores();
    const firstEver = !state.checkins;
    let moved = false;
    AXES.forEach(function(a){ if(before[a.key] !== now[a.key]) moved = true; });
    // nothing to drift against on the first pass, and nothing worth showing if
    // the new answers left every axis where it was
    state.prev = (firstEver || !moved) ? null : before;
    state.runFrom = null;
    state.checkins = (state.checkins||0) + 1;
    save();
  } else if(state.runFrom){
    // walked in and straight back out — not a check-in
    state.runFrom = null; save();
  }
  show("profile");
}

document.addEventListener("keydown", function(e){
  if(view!=="test") return;
  if(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if(e.key>="1" && e.key<="5"){ e.preventDefault(); answer(CHOICES[+e.key-1].v); }
  else if(e.key==="0"){ e.preventDefault(); pass(); }
  else if(e.key==="ArrowLeft"){ e.preventDefault(); back(); }
});

/* ============================================================
   PROFILE
   ============================================================ */
function renderProfile(){
  const sc = scores();
  const done = answeredCount();

  $("handle").value = state.handle || "";
  $("archetype").textContent = done ? archetype(sc) : "Nothing to plot yet";
  $("slip-date").textContent = "Standing record · " + fmtDate(state.updated || Date.now());
  $("stat-answered").textContent = done;
  $("stat-conviction").textContent = convictionPct() + "%";
  $("stat-checkins").textContent = state.checkins || 1;

  drawPrint($("print-canvas"), sc, {values:true, ghost:state.prev});

  // meters
  $("meters").innerHTML = AXES.map(function(ax){
    const v = sc[ax.key], n = sc[ax.key+"_n"];
    const prev = state.prev ? state.prev[ax.key] : null;
    const d = prev==null ? 0 : v - prev;
    const lean = v===50 ? -1 : (v>50 ? 1 : 0);
    const fillLeft = v>=50 ? 50 : v, fillW = Math.abs(v-50);
    return '<div class="meter">'+
      '<div class="meter-head">'+
        '<b>'+ax.label+'</b>'+
        (d ? '<span class="drift '+(d>0?"up":"dn")+'">'+(d>0?"+":"")+d+'</span>' : '')+
        '<span class="val">'+(n ? v : "—")+'</span>'+
      '</div>'+
      '<div class="track">'+
        '<div class="bar"></div><div class="mid"></div>'+
        (prev!=null ? '<div class="ghost" style="left:'+prev+'%"></div>' : '')+
        '<div class="fill" style="left:'+fillLeft+'%;width:'+fillW+'%"></div>'+
        '<div class="knob" style="left:'+v+'%"></div>'+
      '</div>'+
      '<div class="poles">'+
        '<span'+(lean===0?' class="hot"':'')+'>'+ax.poles[0]+'</span>'+
        '<span'+(lean===1?' class="hot"':'')+'>'+ax.poles[1]+'</span>'+
      '</div>'+
    '</div>';
  }).join("");

  renderSignatures();
  renderNote();
  renderReview();
  updateRail();
}

function renderSignatures(){
  const strong = ITEMS.filter(function(q){ return Math.abs(state.answers[q.id])===2; });
  const el = $("sig-list");
  if(!strong.length){
    el.innerHTML = '<div class="sig"><span class="verdict no">None yet</span>'+
      '<div><q>You hedged on everything you answered. That is itself a position, but it makes for a quiet profile.</q></div></div>';
    return;
  }
  strong.sort(function(a,b){ return AXIS[a.ax].i - AXIS[b.ax].i; });
  el.innerHTML = strong.slice(0,10).map(function(q){
    const agree = state.answers[q.id] > 0;
    return '<div class="sig">'+
      '<span class="verdict'+(agree?"":" no")+'">'+(agree?"Agrees":"Rejects")+'</span>'+
      '<div><q>'+q.t+'</q><small>'+AXIS[q.ax].label+' · '+q.topic+' · '+q.pack.name+'</small></div>'+
    '</div>';
  }).join("");
}

function renderNote(){
  const note = $("update-note");
  if(!hasProfile()){ note.classList.add("hidden"); return; }
  // packs that still have unanswered propositions
  const open = PACKS.filter(function(p){ return unansweredIn(p) > 0; });
  if(!open.length){ note.classList.add("hidden"); return; }
  // a pack you have never touched is genuinely new; a half-finished one is just unfinished
  const untouched = open.filter(function(p){ return unansweredIn(p) === p.items.length; });
  const listed = untouched.length ? untouched : open;
  const count = listed.reduce(function(n,p){ return n + unansweredIn(p); }, 0);
  $("note-count").textContent = count;
  $("note-pack").textContent = listed.map(function(p){ return p.name; }).join(", ");
  $("note-verb").textContent = untouched.length
    ? (count===1 ? "new proposition since you last checked in" : "new propositions since you last checked in")
    : (count===1 ? "proposition you have not answered yet" : "propositions you have not answered yet");
  $("btn-answer-new").textContent = untouched.length ? "Answer the new ones" : "Finish them off";
  note.classList.remove("hidden");
}

const MINI_MARKS = {"-2":"--", "-1":"-", "0":"~", "1":"+", "2":"++"};
function renderReview(){
  const el = $("review-list");
  el.innerHTML = ITEMS.map(function(q){
    const cur = state.answers[q.id];
    return '<div class="rev">'+
      '<div><q>'+q.t+'</q><small class="eyebrow" style="display:block;margin-top:5px">'+AXIS[q.ax].label+' · '+q.topic+'</small></div>'+
      '<div class="mini" data-q="'+q.id+'">'+ CHOICES.map(function(c){
        return '<button data-v="'+c.v+'"'+(cur===c.v?' data-on="1"':'')+' title="'+c.label+'" aria-label="'+c.label+'">'+
          MINI_MARKS[c.v]+'</button>';
      }).join("") +'</div>'+
    '</div>';
  }).join("");
}
$("review-list").addEventListener("click", function(e){
  const b = e.target.closest("button[data-v]"); if(!b) return;
  const id = b.parentNode.dataset.q;
  state.answers[id] = +b.dataset.v;
  save();
  renderProfile();
  $("review").classList.remove("hidden");
});
