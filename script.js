(function(){
"use strict";

/* ==========================================
   Supabase 設定 (アカウント同期用)
   ========================================== */
const SUPABASE_URL = 'https://cluingpqudgjhyjhegiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWluZ3BxdWRnamh5amhlZ2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzg0NTMsImV4cCI6MjEwNjk1NDQ1M30.6TyaxqKQwP-0c3sUbtlbUVX3XgQLg1nABvPoB26a9co';
const supabaseClient = (SUPABASE_URL.includes('xxxx') || !window.supabase) ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===== 40種類のアイコンリスト生成 (icon/char01.png 〜 char40.png) ===== */
const ICONS = [];
for(let i = 1; i <= 40; i++){
  let numStr = String(i).padStart(2, '0');
  ICONS.push(`icon/char${numStr}.png`);
}

/* ===== ユーザー・アカウント管理 ===== */
let accounts = []; 
let currentAccount = null; 
let selectedNewIcon = ICONS[0];

function loadAccounts(){
  try {
    accounts = JSON.parse(localStorage.getItem("rhythm_accounts") || "[]");
    let curId = localStorage.getItem("rhythm_current_id");
    if(accounts.length > 0){
      currentAccount = accounts.find(a => a.id === curId) || accounts[0];
    } else {
      currentAccount = null;
    }
  } catch(e){
    currentAccount = null;
  }
  updateProfileBtnUI();
}

function saveAccountsToLocal(){
  localStorage.setItem("rhythm_accounts", JSON.stringify(accounts));
  if(currentAccount) localStorage.setItem("rhythm_current_id", currentAccount.id);
  updateProfileBtnUI();
}

function updateProfileBtnUI(){
  const btn = document.getElementById("profileBtn");
  if(currentAccount){
    btn.innerHTML = `<img src="${currentAccount.icon}" style="width:20px;height:20px;vertical-align:middle;object-fit:contain"> ${currentAccount.nickname}`;
  } else {
    btn.textContent = "👤 プレーヤー";
  }
}

async function syncAccountToSupabase(acc){
  if(!supabaseClient) return;
  try {
    await supabaseClient.from('profiles').upsert({
      id: acc.id,
      secret_code: acc.secret_code,
      nickname: acc.nickname,
      icon: acc.icon
    });
  } catch(e){ console.error(e); }
}

/* ===== Web Audio (テスト音・メトロノーム等) ===== */
var ctx = null, master = null, bus = null, pw = null, perfOffset = null;
function newBus(){ bus = ctx.createGain(); bus.connect(master); }
function refreshOffset(){ perfOffset = ctx.currentTime - performance.now()/1000; }   
function ensureAudio(){
  if(!ctx){
    var AC = window.AudioContext || window.webkitAudioContext;
    try { ctx = new AC({latencyHint:"interactive"}); } catch(e){ ctx = new AC(); }
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    newBus();
    pw = ctx.createPeriodicWave(new Float32Array([0,0,0,0,0]), new Float32Array([0,1,0.55,0.3,0.15]));
    var ko = ctx.createOscillator(), kg = ctx.createGain();   
    kg.gain.value = 0.00002;
    ko.connect(kg); kg.connect(ctx.destination); ko.start();
  }
  if(ctx.state === "suspended") ctx.resume();
  if(perfOffset === null) refreshOffset();
}
function stopAll(){
  if(!ctx) return;
  var old = bus;
  old.gain.setTargetAtTime(0, ctx.currentTime, 0.008);
  setTimeout(function(){ try{ old.disconnect(); }catch(e){} }, 120);
  newBus();
}

function playTestBuzzer(type){
  ensureAudio();
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type === 'correct' ? 'sine' : 'square';
  o.frequency.setValueAtTime(type === 'correct' ? 523.25 : 220, ctx.currentTime);
  if(type === 'correct'){
    o.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    o.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
  }
  g.gain.setValueAtTime(0.3, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type==='correct'?0.6:0.4));
  o.connect(g); g.connect(bus);
  o.start(); o.stop(ctx.currentTime + (type==='correct'?0.6:0.4));
}

var volMetro = 50, volTap = 50, timingOfs = 0, themeIdx = 1;   
var PIANO_F = 392, TAIL = 0.08, PV = 0.55;   
function voice(t){
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.setPeriodicWave(pw);              
  o.frequency.value = PIANO_F;
  var peak = 0.45 * PV * (volTap/50);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.006);
  g.gain.setTargetAtTime(peak * 0.25, t + 0.006, 0.4);
  o.connect(g); g.connect(bus);
  o.start(t);
  return function(rt){
    if(rt < t + 0.02) rt = t + 0.02;
    g.gain.setTargetAtTime(0, rt, TAIL);
    o.stop(rt + TAIL * 6);
  };
}
function piano(t, holdSec){ voice(t)(t + holdSec); }
function click(t, accent){
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "square";
  o.frequency.value = accent ? 1600 : 1000;
  var v = (accent ? 0.55 : 0.4) * (volMetro/50);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + 0.08);
}
function metro(base){ for(var i=0;i<TOTAL;i++) click(base + i*BEAT, i%4===0); }

/* ===== クエスト（すごろく）画面のロジック ===== */
function updateQuestUI(){
  if(!currentAccount) return;
  document.getElementById("tokenCount").textContent = currentAccount.tokens || 0;
  document.getElementById("currentPos").textContent = currentAccount.position || 1;
  
  const container = document.getElementById("boardContainer");
  container.innerHTML = "";
  for(let i = 1; i <= 10; i++){
    const cell = document.createElement("div");
    cell.className = "map-cell" + (i === currentAccount.position ? " current" : "") + (i === 10 ? " boss" : "");
    if(i === 10){
      cell.innerHTML = "👑<br>ボス";
    } else if(i === currentAccount.position){
      cell.innerHTML = `<img src="${currentAccount.icon}"><br>${i}`;
    } else {
      cell.innerHTML = "マス<br>" + i;
    }
    container.appendChild(cell);
  }
}

document.getElementById("rollDiceBtn").addEventListener("click", function(){
  ensureAudio();
  if(!currentAccount) return;
  
  let adv = Math.floor(Math.random() * 3) + 1;
  currentAccount.position = (currentAccount.position || 1) + adv;
  
  if(currentAccount.position >= 10){
    currentAccount.position = 10;
    updateQuestUI();
    setTimeout(() => {
      alert("ボス（ベートーベン）のエリアに到着した！ クイズに挑戦だ！");
      startBossQuiz();
    }, 300);
  } else {
    let earned = Math.floor(Math.random() * 2) + 1;
    currentAccount.tokens = (currentAccount.tokens || 0) + earned;
    saveAccountsToLocal();
    updateQuestUI();
    alert("サイコロの目は " + adv + "！\nマスを進んだ！ 音のカケラを " + earned + "個ゲット！🪙");
  }
});

/* ===== ボスバトル（曲あて3択クイズ） ===== */
function startBossQuiz(){
  show("sQuiz");
  const listEl = document.getElementById("quizOptionsList");
  
  const options = [
    { text: "交響曲第5番「運命」", isCorrect: true },
    { text: "トルコ行進曲 (モーツァルト)", isCorrect: false },
    { text: "アイネ・クライネ・ナハトミュジーク", isCorrect: false }
  ];
  options.sort(() => Math.random() - 0.5);

  listEl.innerHTML = options.map((opt, idx) => `
    <div class="quiz-option" data-correct="${opt.isCorrect}">
      <span>${idx+1}. ${opt.text}</span>
      <button class="play-audio-btn" style="font-size:14px;padding:6px 12px;--k1:#ffbc98;--k2:#fb9468;--k3:#df744a">📢 聴く</button>
    </div>
  `).join("");

  listEl.querySelectorAll(".quiz-option").forEach(card => {
    const playBtn = card.querySelector(".play-audio-btn");
    const isCorr = card.getAttribute("data-correct") === "true";

    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      playTestBuzzer(isCorr ? 'correct' : 'wrong');
    });

    card.addEventListener("click", () => {
      if(isCorr){
        playTestBuzzer('correct');
        alert("正解！ ベートーベンの曲だ！\n音のカケラ🪙 +10個ゲット！");
        currentAccount.tokens = (currentAccount.tokens || 0) + 10;
        currentAccount.position = 1;
        saveAccountsToLocal();
        show("sQuest");
        updateQuestUI();
      } else {
        playTestBuzzer('wrong');
        alert("ざんねん！ハズレ！ もう一度聴いて挑戦しよう！");
      }
    });
  });
}

/* ===== 共通の時間軸 ===== */
var BPM = 90, BEAT = 60 / BPM, TOTAL = 8;
function setBpm(v){ BPM = v; BEAT = 60 / v; }

/* ===== 問題（トークン） ===== */
var levels = [
  {name:"4分音符まで", pats:[
    [["q","q","q","q"],["q","q","q","q"]],
    [["q","Rq","q","q"],["q","q","Rq","q"]],
    [["q","q","q","q~"],["q","q","q","q"]],
    [["q","s","s","q"],["q","Rq","q","q"]],
    [["q","q~","q","Rq"],["q","q","q~","q"]],
    [["h","q","q"],["h","h"]],
    [["D","q"],["q","q","h"]],
    [["w"],["h","q","q"]],
    [["q","q","h"],["h","Rq","q"]],
    [["q","q","s","s"],["h~","h"]],
    [["Rq","q","h"],["s","q","s","q"]],
    [["h","q","q"],["q","q","q","Rq"]],
    [["q","q","q","q"],["s","s","q","q"]],
    [["Rq","q~","q","q"],["q","q","q","q"]],
    [["q","h","q"],["s","s","q","q"]],
    [["Rq","q","h"],["h","Rq","q"]],
    [["q","q","q","q"],["s","q~","s","q"]],
    [["q","Rq","q","q"],["s","s","q","q"]],
    [["q","Rq","q~","q"],["q","q","Rq","q"]],
    [["q","Rq","h"],["q","q","q","q"]],
    [["q","q","h"],["q","Rq","q","q"]],
    [["s","s","q","q"],["q","Rq","h"]],
    [["q","Rq","h~"],["D","q"]],
    [["q","q","q","Rq"],["q","q","Rq","q"]],
    [["h","h"],["q","Rq","q","q"]],
    [["q","Rq","q","q"],["q~","D"]],
    [["q","q","s","s"],["w"]]]},
  {name:"8分音符まで", pats:[
    [["e","e","e","e","e","e","e","e"],["e","e","e","e","e","e","e","e"]],
    [["q","e","e","q","q"],["e","e","q","e","e","q"]],
    [["q","e","e","q","Re","e"],["Re","e","e","e","q","q"]],
    [["q","e","e","q","q~"],["q","e","e","e","e","q"]],
    [["e","e~","e","e","q","q"],["q","Rq","e","e","q"]],
    [["e","Re","q","q","e","e"],["q~","e","e","e","e","Rq"]],
    [["e","e","q","e","e","q"],["q","e","e","e","e","Rq"]],
    [["e","e","e","e","e","Re","q"],["q","e","e","e","e","e","e"]],
    [["q","e","Re","e","e","e","e"],["e","e","e","e","e","Re","e","e"]],
    [["e","e","q","Re","e","q"],["q","e","e","e","e","e","e"]],
    [["e","e","Re","e","q","e","e~"],["q","Re","e","q","e","e"]],
    [["e","e","e","e","e","e","Re","e"],["e","e","q","e","e","q"]],
    [["e","e","q","e","Re","e","e"],["q","e","e","q","e","e"]],
    [["e","e","q","q","e","e"],["e","e","e","Re","e","e","e","e"]],
    [["e","e","q","q","q"],["Re","e","e","e~","e","e","q"]]]},
  {name:"16分音符まで", pats:[
    [["x","x","x","x","q","q","q"],["x","x","x","x","q","q","q"]],
    [["q","x","x","e","q","q"],["e","x","x","q","x","x","e","q"]],
    [["x","x","e","q","x","x","e","q"],["q","q","x","x","x","x","q"]],
    [["q","Rq","x","x","x","x","q"],["e","x","x","e","e","q","q"]],
    [["x","x","x","x","e","e","q","q~"],["q","e","x","x","q","q"]],
    [["d","x","d","x","q","q"],["q","d","x","e","e","q"]],
    [["q","d","x","q","Rq"],["d","x","d","x","q","q"]],
    [["d","x","e","e","q","q"],["x","d","d","x","q","q"]],
    [["e","e","x","x","e","e","x","x","e","Re"],["Rq","d","x","x","d","d","x"]],
    [["q","d","x","x","x","e","d","x"],["e","x","x","x","d","x","x","e","e~","e"]],
    [["x","d","d","x","e","x","x","d","x"],["e","x","x","e","Re","d","x","e","x","x"]],
    [["x","d","e","x","x","d","x","x","d"],["Rq","x","x","e","x","x","e","x","d"]],
    [["x","x","e","Rq","q","e","x","x"],["x","x","e","x","x","x","x","x","x","e~","q"]],
    [["e","e~","d","x","q","d","x"],["d","x","x","x","x","x","e","Re","q"]],
    [["x","x","x","x","q","e","x","x","e","Re"],["d","x","d","x","Rq","d","x"]],
    [["d","x","Rq","x","x","e","x","x","e~"],["x","d","x","d","q","x","x","e"]],
    [["e","e","e","e~","x","x","x","x","q"],["d","x","d","x","x","x","x","x","x","x","x","x"]],
    [["x","x","x","x","q~","x","x","e","q"],["x","x","x","x","x","x","x","x","x","d","x","x","x","x"]],
    [["x","x","x","x","x","x","e~","e","e","d","x"],["x","x","x","x","e","Re","d","x","x","d"]],
    [["d","x","q","e","x","x","q"],["x","x","x","x","d","x","e~","x","x","x","x","x","x"]],
    [["q","x","x","e","q","q~"],["x","x","e","q","e","Re","d","x"]],
    [["x","x","e","d","x","Rq","q"],["d","x","x","x","x","x","x","x","e","x","d"]],
    [["e","Re","x","d","x","d","d","x"],["q","q","e","x","x","x","x","x","x"]],
    [["e","Re","x","d","x","x","e","q"],["d","x","q","d","x","e~","e"]]]}
];
var LEN = {q:1, e:0.5, x:0.25, s:1, d:0.75, h:2, D:3, w:4};   
var SOUND_LEN = {q:0.9, e:0.45, x:0.22, s:0.15, d:0.68, h:1.9, D:2.9, w:3.9};

function buildNotes(bars){
  var notes = [], t = 0, prevTie = false;
  bars.forEach(function(bar){
    bar.forEach(function(tok){
      var rest = tok.charAt(0) === "R";
      var tie = tok.slice(-1) === "~";
      var k = rest ? tok.charAt(1) : (tie ? tok.slice(0,-1) : tok);
      notes.push({start:t, duration:LEN[k], type:k, rest:rest, tie:tie, tiedFrom:prevTie});
      prevTie = tie; t += LEN[k];
    });
  });
  for(var i=0;i<notes.length;i++){
    var n = notes[i];
    if(n.rest || n.tiedFrom) continue;
    var tot = n.duration, j = i, last = n;
    while(notes[j].tie && notes[j+1]){ j++; tot += notes[j].duration; last = notes[j]; }
    n.chain = tot;
    n.sound = tot - (LEN[last.type] - SOUND_LEN[last.type]);
  }
  return notes;
}

/* ===== 楽譜描画 ===== */
var X0 = 10, X1 = 790, TS_W = 56, PAD = 14;
var PB = (X1 - X0 - TS_W - 30) / TOTAL;
function xb(b){ return X0 + TS_W + b * PB; }
function xOf(start){ return xb(start) + PAD; }
var svg = document.getElementById("svg");
var NS = "http://www.w3.org/2000/svg";
function el(n, a){ var e = document.createElementNS(NS, n); for(var k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; }
function beam(xa, xz, y, th){ el("polygon",{points:xa+","+y+" "+xz+","+y+" "+xz+","+(y+th)+" "+xa+","+(y+th),fill:"#222"}); }

function drawScore(notes, res, extras, marks){
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  var top = 40, bot = 140, HY = 105, STEM = 50, TOPY = HY - STEM;
  el("rect",{x:X0,y:top,width:X1-X0,height:bot-top,fill:"none",stroke:"#333","stroke-width":3});
  el("line",{x1:xb(4),y1:top,x2:xb(4),y2:bot,stroke:"#333","stroke-width":3});
  el("line",{x1:X0+TS_W,y1:100,x2:X1,y2:100,stroke:"#ccc","stroke-width":1});
  el("rect",{x:X0+TS_W,y:148,width:X1-X0-TS_W,height:10,rx:5,fill:"#eee"});   
  for(var b=1;b<TOTAL;b++){ if(b===4) continue; el("line",{x1:xb(b),y1:bot-4,x2:xb(b),y2:bot,stroke:"#ccc"}); }
  var f = {x:X0+TS_W/2,"text-anchor":"middle","font-size":34,"font-weight":"bold",fill:"#333"};
  f.y = 83; el("text",f).textContent = "4";
  f.y = 119; el("text",f).textContent = "4";

  var groups = [], cur = null, inBeam = {};
  notes.forEach(function(n, i){
    if(!n.rest && (n.type==="e" || n.type==="x" || n.type==="d")){
      var bt = Math.floor(n.start + 1e-9);
      if(cur && cur.b===bt && cur.last===i-1){ cur.idx.push(i); cur.last = i; }
      else { cur = {b:bt, idx:[i], last:i}; groups.push(cur); }
    }
  });
  groups.forEach(function(g){ if(g.idx.length>=2) g.idx.forEach(function(i){ inBeam[i] = true; }); });

  notes.forEach(function(n, i){
    var x = xOf(n.start);
    if(n.rest){
      var rc = res ? (res[i] ? "#2eaa5a" : "#e2574c") : "#222";
      var st = {fill:"none",stroke:rc,"stroke-width":3,"stroke-linejoin":"round","stroke-linecap":"round"};
      if(n.type==="e"){
        el("circle",{cx:x-3,cy:88,r:3.5,fill:rc});
        st["stroke-width"] = 2.5;
        st.d = "M"+(x-3)+" 91 Q"+(x+3)+" 91 "+(x+5)+" 84 L"+(x-3)+" 112"; el("path",st);
      } else {
        st.d = "M"+(x-3)+" 72 L"+(x+4)+" 84 L"+(x-4)+" 96 L"+(x+3)+" 106 Q"+(x-6)+" 106 "+(x-1)+" 116"; el("path",st);
      }
      return;
    }
    if(n.tiedFrom){
      var px = xOf(notes[i-1].start);
      el("path",{d:"M"+px+" 118 Q"+((px+x)/2)+" 138 "+x+" 118",fill:"none",stroke:"#222","stroke-width":2.5});
    }
    var col = res ? (res[i] ? "#2eaa5a" : "#e2574c") : "#222";
    var open = (n.type==="h" || n.type==="D" || n.type==="w");
    el("ellipse",{cx:x,cy:HY,rx:(n.type==="w"?12:9.5),ry:7.5,fill:(open?"#fff":col),stroke:(open?col:"none"),"stroke-width":2.5,transform:"rotate(-20 "+x+" "+HY+")"});
    if(n.type!=="w") el("line",{x1:x+8.5,y1:HY-2,x2:x+8.5,y2:TOPY,stroke:"#222","stroke-width":2.5});
    if(n.type==="s") el("circle",{cx:x,cy:HY+18,r:3.5,fill:"#222"});
    if(n.type==="d" || n.type==="D") el("circle",{cx:x+17,cy:HY-4,r:3.5,fill:"#222"});
    if(!inBeam[i] && (n.type==="e" || n.type==="x" || n.type==="d")){
      var nf = n.type==="x" ? 2 : 1;
      for(var k=0;k<nf;k++) el("path",{d:"M"+(x+8.5)+" "+(TOPY+k*8)+" q12 10 8 22",fill:"none",stroke:"#222","stroke-width":3});
    }
  });
  groups.forEach(function(g){
    if(g.idx.length<2) return;
    var a = xOf(notes[g.idx[0]].start) + 8.5, z = xOf(notes[g.idx[g.idx.length-1]].start) + 8.5;
    beam(a, z, TOPY, 6);
    var p = 0;
    while(p < g.idx.length){
      if(notes[g.idx[p]].type!=="x"){ p++; continue; }
      var q = p;
      while(q+1 < g.idx.length && notes[g.idx[q+1]].type==="x") q++;
      var xa = xOf(notes[g.idx[p]].start) + 8.5, xz = xOf(notes[g.idx[q]].start) + 8.5;
      if(q > p) beam(xa, xz, TOPY+9, 5);
      else if(p > 0) beam(xa-10, xa, TOPY+9, 5);
      else beam(xa, xa+10, TOPY+9, 5);
      p = q + 1;
    }
  });
  (extras || []).forEach(function(t){
    var bx = Math.min(X1 - 10, Math.max(X0 + TS_W + 6, xb(t.s / BEAT) + PAD));
    var st = {stroke:"#e2574c","stroke-width":5,"stroke-linecap":"round"};
    st.x1 = bx-8; st.y1 = 14; st.x2 = bx+8; st.y2 = 30; el("line", st);
    st.x1 = bx+8; st.y1 = 14; st.x2 = bx-8; st.y2 = 30; el("line", st);
    el("line",{x1:bx,y1:32,x2:bx,y2:40,stroke:"#e2574c","stroke-width":2});
  });
  (marks || []).forEach(function(t){ addMarker(t); });
}

function setMarker(m, t){
  var x = Math.min(X1 - 14, xb(t.s / BEAT) + PAD);          
  var w = Math.max(0, t.d / BEAT * PB);
  m.b.setAttribute("x", x - 5);
  m.b.setAttribute("width", Math.min(X1 - 4 - (x - 5), w + 10));
  m.h.setAttribute("cx", x);
}
function addMarker(t){
  var b = el("rect",{y:148,height:10,rx:5,fill:"#9bdcb0"});                 
  var h = el("circle",{cy:153,r:6.5,fill:"#157a3c",stroke:"#fff","stroke-width":1.5});   
  var m = {b:b, h:h};
  setMarker(m, t);
  return m;
}

/* ===== 状態 ===== */
var $ = function(id){ return document.getElementById(id); };
var notes = [], curPat = null, lvl = 3, demoOn = true;
var state = "idle", useDemo = true, canTap = false;
var t0, countStart, recStart, recEnd;
var taps = [], active = {}, rafId = 0, busyUntil = 0;
var calLag = 0, cal = null, calTimer = 0;
var COUNT_WORDS = ["いち","に","さん","はい！"];

function show(id){
  ["sTop","sSet","sPrac","sGame","sQuest","sQuiz","sCharSelect","sNewCharIcon","sNewCharName"].forEach(function(s){ $(s).classList.toggle("on", s===id); });
  $("back").style.display = id==="sTop" ? "none" : "block";
}
function goTop(){
  state = "idle"; canTap = false;
  cancelAnimationFrame(rafId);
  clearTimeout(calTimer);
  $("popup").style.display = "none";
  releaseAll();
  stopAll();
  show("sTop");
}

function newProblem(){
  var pool = [];
  if(lvl < 3) pool = levels[lvl].pats; else levels.forEach(function(l){ pool = pool.concat(l.pats); });
  var p;
  do { p = pool[Math.floor(Math.random()*pool.length)]; } while(p===curPat && pool.length>1);
  curPat = p;
  notes = buildNotes(p);
  drawScore(notes);
}
function scheduleDemo(base){
  notes.forEach(function(n){
    if(n.rest || n.tiedFrom) return;
    piano(base + n.start*BEAT, n.sound*BEAT);
  });
}
function startRun(){
  ensureAudio();
  stopAll();
  taps = []; active = {}; canTap = false;
  $("score").style.display = "block";
  drawScore(notes);
  $("playBtns").style.display = "none";
  $("nextBtns").style.display = "none";
  $("tapArea").style.display = "block";
  $("result").style.display = "none"; $("msg").style.display = "block"; $("count").style.display = "block";
  $("tap").classList.add("off");
  useDemo = demoOn;
  t0 = ctx.currentTime + 0.4;
  if(useDemo){ scheduleDemo(t0); metro(t0); countStart = t0 + TOTAL*BEAT + 0.6; }
  else countStart = t0 + 0.3;
  recStart = countStart + 4*BEAT;       
  recEnd = recStart + TOTAL*BEAT;
  for(var i=0;i<12;i++) click(countStart + i*BEAT, i%4===0);
  state = "run";
  cancelAnimationFrame(rafId);
  tick();
}
function tick(){
  if(state !== "run") return;
  var now = ctx.currentTime;
  var vnow = now - latSec();      
  canTap = now >= countStart;
  $("tap").classList.toggle("off", !canTap);
  for(var id in active){
    var ac = active[id];
    if(ac.tap && ac.rect){ ac.tap.d = Math.max(0.05, (now - recStart - latSec()) - ac.tap.s); setMarker(ac.rect, ac.tap); }
  }
  if(vnow < t0){ $("msg").textContent = "じゅんびしてね"; $("count").textContent = ""; }
  else if(vnow < countStart){ $("msg").textContent = useDemo ? "お手本を再生中…（よく聴いてね）" : "じゅんびしてね"; $("count").textContent = ""; }
  else if(vnow < recStart){
    var c = Math.min(4, Math.floor((vnow - countStart)/BEAT) + 1);
    $("msg").textContent = "つぎは あなたの番"; $("count").textContent = COUNT_WORDS[c-1];
  } else if(vnow < recEnd){ $("msg").textContent = "たたこう！"; $("count").textContent = ""; }
  else { finish(); return; }
  rafId = requestAnimationFrame(tick);
}
function finish(){
  state = "done"; canTap = false;
  releaseAll();
  $("msg").textContent = taps.length ? "録音終了" : "録音終了（タップなし）";
  $("count").textContent = "";
  $("tapArea").style.display = "none";
  $("count").style.display = "none";
  $("playBtns").style.display = "flex";
  $("nextBtns").style.display = "flex";
  if($("judgeOpt").checked) judge();
}

/* ===== タイミング調整 ===== */
function startCal(){
  ensureAudio();
  clearTimeout(calTimer); cancelAnimationFrame(rafId);
  state = "cal"; canTap = true; taps = []; active = {}; cal = null;
  $("score").style.display = "none";
  $("result").style.display = "none";
  $("playBtns").style.display = "none"; $("nextBtns").style.display = "none";
  $("msg").style.display = "block"; $("count").style.display = "block";
  $("tapArea").style.display = "block"; $("tap").classList.remove("off");
  $("msg").textContent = "タイミングをあわせるよ！\nメトロノームに合わせて好きなタイミングで\n4回つづけてタップしてね";
  $("count").textContent = "○ ○ ○ ○";
  var go = function(){
    if(state !== "cal" || cal) return;
    stopAll(); refreshOffset();
    cal = {t0: ctx.currentTime + 0.5, beat: 60 / 75, lags: [], ks: []};
    for(var i=0;i<90;i++) click(cal.t0 + i*cal.beat, false);   
  };
  var r = null;
  try{ r = ctx.resume(); }catch(e){}
  if(ctx.state === "running") go();
  else if(r && r.then) r.then(function(){ setTimeout(go, 150); }, go);
  calTimer = setTimeout(go, 1500);   
}
function calTap(at){
  if(!cal) return;
  var k = Math.round((at - cal.t0) / cal.beat);               
  if(k < 0) return;
  cal.ks.push(k);
  cal.lags.push(at - (cal.t0 + k*cal.beat));                    
  var n = cal.lags.length, d = "";
  for(var i=0;i<4;i++) d += (i < n ? "●" : "○") + " ";
  $("count").textContent = d;
  if(n >= 4) finishCal();
}
function finishCal(){
  var L = cal.lags.slice().sort(function(a, b){ return a - b; });
  state = "caldone"; canTap = false;
  stopAll();   
  if(L[3] - L[0] > 0.25){                                       
    $("msg").textContent = "タップがばらついたよ\nもう一度やってみよう";
    $("count").textContent = "";
    calTimer = setTimeout(startCal, 1500);
    return;
  }
  calLag = Math.max(-0.3, Math.min(0.5, (L[1] + L[2]) / 2));    
   // ▼ 30ミリ秒ほど早めに補正します
  calLag -= 0.03; 
   
  var ms = Math.round(calLag*1000);
  $("msg").textContent = "調整できたよ！（ずれ " + ms + "ミリ秒）";
  $("count").textContent = "OK";
  calTimer = setTimeout(function(){
    if(state !== "caldone") return;
    state = "popup";
    $("popSub").textContent = "タイミング調整ずみ（ずれ " + ms + "ミリ秒）";
    $("popup").style.display = "flex";                        
  }, 700);
}

/* ===== 正答率判定 ===== */
function judge(){
  var has16 = notes.some(function(n){ return n.type==="x" || n.type==="d"; });
  var tolBase = (has16 ? 0.18 : 0.3) * BEAT, tolLong = 0.4 * BEAT;
  var PENALTY = 5;                 
  var used = [], res = [], pairs = [], done = {};
  var U = 0, hitU = 0, missU = 0, usedN = 0, hitN = 0, sum = 0;
  var warnQ = false, warnS = false, warnTie = false, longShort = false;
  
  notes.forEach(function(n, i){
    if(n.rest || n.tiedFrom) return;
    n.units = n.chain >= 2 ? Math.floor(n.chain + 1e-6) : 1;   
    U += n.units;
    var tolN = tolBase;
    if(n.units >= 2 || (n.start === 0 && !has16)) tolN = Math.max(tolBase, tolLong);
    taps.forEach(function(t, j){
      var d = Math.abs(t.s - n.start*BEAT);
      if(d <= tolN) pairs.push({i:i, j:j, d:d});
    });
  });
  pairs.sort(function(a, b){ return a.d - b.d; });     
  pairs.forEach(function(p){
    if(done[p.i] || used[p.j]) return;
    done[p.i] = true; used[p.j] = true; usedN++; hitN++;
    var n = notes[p.i], t = taps[p.j], hold = t.d / BEAT;   
    sum += t.s - n.start*BEAT;
    var covered = n.units;
    if(n.units >= 2){
      covered = Math.min(n.units, Math.max(1, Math.floor(hold + 0.5)));   
    } else if(n.tie){
      if(hold < 0.5 * n.chain) warnTie = true;
    } else if(n.type === "q"){
      if(hold < 0.5) warnQ = true;
    } else if(n.type === "s"){
      if(hold > 0.45) warnS = true;
    }
    hitU += covered; missU += n.units - covered;
    res[p.i] = (covered === n.units);
    if(covered < n.units) longShort = true;
  });
  notes.forEach(function(n, i){
    if(n.rest || n.tiedFrom) return;
    if(!done[i]){ res[i] = false; missU += n.units; }
  });
  notes.forEach(function(n, i){ if(n.tiedFrom) res[i] = res[i-1]; });

  var restViolationCount = 0;
  notes.forEach(function(n, i){
    if(!n.rest) return;
    U += 1;
    var rStart = n.start * BEAT;
    var rEnd = (n.start + n.duration) * BEAT;
    
    var violated = false;
    taps.forEach(function(t){
      if(t.s < rEnd - 0.02 && (t.s + t.d) > rStart + 0.02){ violated = true; }
    });

    if(violated){ res[i] = false; restViolationCount++; }
    else { res[i] = true; hitU += 1; }
  });

  var extra = 0;
  taps.forEach(function(t, j){
    if(used[j]) return;
    var inAnyRest = false;
    notes.forEach(function(n){
      if(n.rest){
        var rStart = n.start * BEAT;
        var rEnd = (n.start + n.duration) * BEAT;
        if(t.s < rEnd - 0.02 && (t.s + t.d) > rStart + 0.02) inAnyRest = true;
      }
    });
    if(!inAnyRest) extra++;
  });

  var score = Math.max(0, Math.round(hitU / U * 100 - extra * PENALTY));

  var lines = [];
  if(missU > 0) lines.push("たりない音があったよ（未タップ数：" + missU + "）");
  if(extra > 0) lines.push("よけいな音があったよ（余計なタップ数：" + extra + "）");
  if(restViolationCount > 0) {
    lines.push("休符のところで音が鳴っていたよ（休符でのミス：" + restViolationCount + "箇所）");
  }
  if(warnS) lines.push("スタッカートはもっと短くタップしよう");
  if(warnQ) lines.push("４分音符はもうすこし長めにタップしよう");
  if(warnTie) lines.push("タイの音はもうすこし長めにタップしよう");
  if(longShort) lines.push("長い音は、さいごまで押したままにしよう");
  if(hitN > 0){
    var avg = sum / hitN;
    if(avg < -0.04) lines.push("すこしタイミングが早いよ");
    else if(avg > 0.04) lines.push("すこしタイミングが遅いよ");
  }
  if(!lines.length) lines.push("ぜんぶばっちり！");

  var col = score >= 80 ? "#2eaa5a" : (score >= 50 ? "#e08a00" : "#e2574c");
  $("bigScore").innerHTML = '<span class="lbl">得点</span> <span class="num" style="color:' + col + '">' + score + '</span><span class="lbl">点</span>';
  $("detail").innerHTML = lines.map(function(l){ return "<div>◇" + l + "</div>"; }).join("");
  $("msg").style.display = "none";
  $("result").style.display = "block";
  
  drawScore(notes, res, taps.filter(function(t, j){
    if(used[j]) return false;
    var inRest = false;
    notes.forEach(function(n){
      if(n.rest && t.s < (n.start+n.duration)*BEAT - 0.02 && (t.s+t.d) > n.start*BEAT + 0.02) inRest = true;
    });
    return !inRest;
  }), taps);
}

/* ===== TAP処理 ===== */
var tapBtn = $("tap");
var STAR_COLORS = ["#ffd84a","#ffffff","#ff9ec5","#8fd3ff","#ffb04a"];
function tapFx(e){
  tapBtn.classList.remove("pulse"); void tapBtn.offsetWidth; tapBtn.classList.add("pulse");   
  var box = $("fx");
  if(box.childNodes.length > 70) return;                                                    
  var r = $("tapArea").getBoundingClientRect();
  var x = e.clientX - r.left, y = e.clientY - r.top;
  var made = [];
  function put(cls, nx, ny){
    var d = document.createElement("div");
    d.className = cls; d.style.left = nx + "px"; d.style.top = ny + "px";
    box.appendChild(d); made.push(d); return d;
  }
  put("flash", x, y);
  function fly(d, dist){
    var a = Math.random() * Math.PI * 2, dd = dist * (0.5 + Math.random() * 0.7);
    d.style.setProperty("--dx", (Math.cos(a) * dd) + "px");
    d.style.setProperty("--dy", (Math.sin(a) * dd - 12) + "px");
    d.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
    d.style.setProperty("--sc", STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]);
  }
  for(var i=0;i<8;i++){
    var st = put("star", x, y);
    st.style.setProperty("--sz", (9 + Math.random() * 11) + "px");
    fly(st, 80);
  }
  for(var j=0;j<3;j++) fly(put("spark", x, y), 60);
  setTimeout(function(){ made.forEach(function(d){ if(d.parentNode) d.parentNode.removeChild(d); }); }, 700);
}
tapBtn.addEventListener("animationend", function(){ tapBtn.classList.remove("pulse"); });
function latSec(){ return calLag + timingOfs / 1000; }
function relTime(ts){ return (ts/1000 + perfOffset) - recStart - latSec(); }
function releaseAll(){
  for(var id in active){
    var a = active[id];
    if(a.v && ctx) a.v(ctx.currentTime);
    if(a.tap){ a.tap.d = Math.max(0.05, TOTAL*BEAT - a.tap.s); if(a.rect) setMarker(a.rect, a.tap); }
  }
  active = {};
  tapBtn.classList.remove("down");
}
tapBtn.addEventListener("pointerdown", function(e){
  e.preventDefault();
  if(!canTap || active[e.pointerId]) return;      
  if(ctx && ctx.state !== "running"){ try{ ctx.resume(); }catch(x){} }
  try{ tapBtn.setPointerCapture(e.pointerId); }catch(x){}
  tapBtn.classList.add("down");
  try{ tapFx(e); }catch(x){}
  var a = {v: null, tap: null, rect: null};   
  active[e.pointerId] = a;
  if(state === "cal") calTap(e.timeStamp/1000 + perfOffset);
  if(state === "run"){
    var r = relTime(e.timeStamp);
    if(r > -0.25 && r < TOTAL*BEAT){
      if(r < 0) r = 0;
      a.tap = {s:r, d:0.1};
      taps.push(a.tap);
      a.rect = addMarker(a.tap);
    }
  }
});
function release(e){
  var a = active[e.pointerId];
  if(!a) return;
  if(a.v) a.v(ctx.currentTime);
  if(a.tap){ a.tap.d = Math.max(0.05, relTime(e.timeStamp) - a.tap.s); if(a.rect) setMarker(a.rect, a.tap); }
  delete active[e.pointerId];
  if(!Object.keys(active).length) tapBtn.classList.remove("down");
}
tapBtn.addEventListener("pointerup", release);
tapBtn.addEventListener("pointercancel", release);
tapBtn.addEventListener("lostpointercapture", release);
tapBtn.addEventListener("contextmenu", function(e){ e.preventDefault(); });

/* ===== ボタン・画面遷移 ===== */
function guard(){ var n = performance.now(); if(n < busyUntil) return false; busyUntil = n + 300; return true; }
$("demoBtn").addEventListener("click", function(){
  if(!guard()) return; ensureAudio(); stopAll();
  var b = ctx.currentTime + 0.15;
  scheduleDemo(b); metro(b);
});
$("mineBtn").addEventListener("click", function(){
  if(!guard()) return; ensureAudio(); stopAll();
  var b = ctx.currentTime + 0.15;
  metro(b);
  taps.forEach(function(t){ piano(b + t.s, Math.min(Math.max(t.d, 0.05), 2)); });
});
$("againBtn").addEventListener("click", function(){ if(guard()) startRun(); });
$("nextBtn").addEventListener("click", function(){
  if(!guard()) return;
  newProblem(); startRun();
});
$("back").addEventListener("click", goTop);
$("popBtn").addEventListener("click", function(){
  if(state !== "popup") return;
  $("popup").style.display = "none";
  newProblem(); startRun();
});

/* クエストモードクリック時の挙動 */
$("goQuest").addEventListener("click", function(){
  ensureAudio();
  loadAccounts();
  if(accounts.length === 0){
    selectedNewIcon = ICONS[0];
    renderIconGrid();
    show("sNewCharIcon");
  } else {
    renderAccountList();
    show("sCharSelect");
  }
});

$("goPrac").addEventListener("click", function(){
  ensureAudio(); show("sPrac");
});
$("goSet").addEventListener("click", function(){ show("sSet"); });
$("profileBtn").addEventListener("click", function(){
  loadAccounts();
  if(accounts.length === 0){
    selectedNewIcon = ICONS[0];
    renderIconGrid();
    show("sNewCharIcon");
  } else {
    renderAccountList();
    show("sCharSelect");
  }
});

/* 練習モードのスタートボタン設定 */
$("goBtn").addEventListener("click", function(){
  ensureAudio();
  show("sGame");
  newProblem();
  startCal();
});

/* ===== キャラクター・アイコン選択画面の構築 ===== */
function renderIconGrid(){
  const grid = $("iconGrid");
  grid.innerHTML = ICONS.map(iconPath => `
    <div class="icon-item ${iconPath === selectedNewIcon ? 'selected' : ''}" data-icon="${iconPath}">
      <img src="${iconPath}">
    </div>
  `).join("");

  grid.querySelectorAll(".icon-item").forEach(el => {
    el.addEventListener("click", function(){
      selectedNewIcon = this.getAttribute("data-icon");
      renderIconGrid();
    });
  });
}

function renderAccountList(){
  const list = $("accountList");
  list.innerHTML = accounts.map(acc => `
    <div class="account-card ${currentAccount && currentAccount.id === acc.id ? 'active' : ''}" data-id="${acc.id}">
      <div style="display:flex;align-items:center;gap:12px;font-size:18px">
        <img src="${acc.icon}" style="width:40px;height:40px;object-fit:contain">
        <span style="font-weight:bold">${acc.nickname}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;color:#777">🪙${acc.tokens || 0}</span>
        <button class="del-acc-btn" data-id="${acc.id}" style="font-size:12px;padding:6px 10px;background:#e2574c;box-shadow:0 2px 0 #b33;border-radius:8px">削除</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".account-card").forEach(card => {
    card.addEventListener("click", function(e){
      if(e.target.classList.contains("del-acc-btn")) return;
      const id = this.getAttribute("data-id");
      currentAccount = accounts.find(a => a.id === id);
      saveAccountsToLocal();
      show("sQuest");
      updateQuestUI();
    });
  });

  list.querySelectorAll(".del-acc-btn").forEach(btn => {
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      const id = this.getAttribute("data-id");
      if(confirm("このキャラクターを削除しますか？")){
        accounts = accounts.filter(a => a.id !== id);
        if(currentAccount && currentAccount.id === id){
          currentAccount = accounts.length > 0 ? accounts[0] : null;
        }
        saveAccountsToLocal();
        renderAccountList();
      }
    });
  });
}

/* 既存キャラ選択画面から新規作成へ */
$("toNewCharBtn").addEventListener("click", function(){
  selectedNewIcon = ICONS[0];
  renderIconGrid();
  show("sNewCharIcon");
});

/* アイコン選択完了 → ニックネーム入力画面へ */
$("nextToNameBtn").addEventListener("click", function(){
  $("selectedIconPreview").src = selectedNewIcon;
  $("newNickname").value = "";
  show("sNewCharName");
});

/* ニックネーム登録＆クエストへ出発 */
$("createAccBtn").addEventListener("click", function(){
  const nick = $("newNickname").value.trim();
  if(!nick){ alert("なまえを入力してね！"); return; }
  
  const newAcc = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    secret_code: 'rc-' + Math.floor(1000 + Math.random() * 9000),
    icon: selectedNewIcon,
    nickname: nick,
    tokens: 0,
    position: 1
  };
  accounts.push(newAcc);
  currentAccount = newAcc;
  saveAccountsToLocal();
  if(supabaseClient){
    supabaseClient.from('profiles').upsert({
      id: newAcc.id, secret_code: newAcc.secret_code, nickname: newAcc.nickname, icon: newAcc.icon
    }).then(()=>{});
  }
  
  show("sQuest");
  updateQuestUI();
});

/* トグル・設定関連 */
function makeToggle(boxId, labels, init, onPick){
  var box = $(boxId), btns = [];
  if(!box) return;
  labels.forEach(function(lb, i){
    var b = document.createElement("button");
    b.className = "tg" + (i===init ? " on" : ""); b.textContent = lb;
    b.addEventListener("click", function(){
      btns.forEach(function(x){ x.classList.remove("on"); });
      b.classList.add("on"); onPick(i);
    });
    box.appendChild(b); btns.push(b);
  });
}
makeToggle("lvBtns", ["4分音符まで","8分音符まで","16分音符まで","ランダム"], 3, function(i){ lvl = i; });
makeToggle("demoTg", ["お手本あり","お手本なし"], 0, function(i){ demoOn = (i===0); });

var saved = {};
try{ saved = JSON.parse(localStorage.getItem("rhythmSettings") || "{}"); }catch(e){}
if(saved.m != null) volMetro = saved.m;
if(saved.t != null) volTap = saved.t;
if(saved.o != null) timingOfs = saved.o;
if(saved.th != null) themeIdx = saved.th;
try{ document.body.setAttribute("data-theme", String(themeIdx + 1)); }catch(e){}
if(saved.b) setBpm(saved.b);
function saveSet(){ try{ localStorage.setItem("rhythmSettings", JSON.stringify({m:volMetro, t:volTap, b:BPM, o:timingOfs, th:themeIdx})); }catch(e){} }
function setTheme(i){
  themeIdx = i;
  try{ document.body.setAttribute("data-theme", String(i + 1)); }catch(e){}
  saveSet();
}
makeToggle("themeTg", ["パステル","トロピカル","オーシャン"], themeIdx, setTheme);

$("volM").value = volMetro; $("volMv").textContent = volMetro;
$("volT").value = volTap;   $("volTv").textContent = volTap;
$("volM").addEventListener("input", function(){ volMetro = parseInt(this.value,10); $("volMv").textContent = volMetro; saveSet(); });
$("volT").addEventListener("input", function(){ volTap = parseInt(this.value,10); $("volTv").textContent = volTap; saveSet(); });
$("ofsS").value = timingOfs; $("ofsV").textContent = timingOfs;
$("ofsS").addEventListener("input", function(){ timingOfs = parseInt(this.value,10); $("ofsV").textContent = timingOfs; saveSet(); });

[60,75,90,105,120].forEach(function(v){
  var o = document.createElement("option"); o.value = v; o.textContent = v; if(v===BPM) o.selected = true;
  $("bpmSel").appendChild(o);
});
$("bpmSel").addEventListener("change", function(){ setBpm(parseInt(this.value,10)); saveSet(); });

// 初期ロード実行
loadAccounts();
})();

