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
  if(state !== "run") re
