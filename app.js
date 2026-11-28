(function(){
"use strict";

var SUPABASE_URL = 'https://cluingpqudgjhyjhegiy.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWluZ3BxdWRnamh5amhlZ2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzg0NTMsImV4cCI6MjEwNjk1NDQ1M30.6TyaxqKQwP-0c3sUbtlbUVX3XgQLg1nABvPoB26a9co';
var supabaseClient = (SUPABASE_URL.includes('xxxx') || !window.supabase) ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

var accounts = [];
var currentAccount = null;
var selectedNewIcon = ICONS[0];

var $ = function(id){ return document.getElementById(id); };

function bindImageLoadingStates(root){
  var scope = root || document;
  scope.querySelectorAll("img").forEach(function(img){
    var frame = img.closest(".img-load-frame");
    var markLoaded = function(){
      img.classList.add("is-loaded");
      if(frame) frame.classList.add("is-loaded");
    };
    var markError = function(){
      img.classList.add("is-loaded");
      if(frame){
        frame.classList.add("is-loaded");
        var badge = frame.querySelector(".img-loading-text");
        if(badge) badge.textContent = "表示エラー";
      }
    };

    if(img.complete && img.naturalWidth > 0){
      markLoaded();
    } else {
      img.classList.remove("is-loaded");
      if(frame){
        frame.classList.remove("is-loaded");
        var badge = frame.querySelector(".img-loading-text");
        if(badge) badge.textContent = "読み込み中…";
      }
      img.addEventListener("load", markLoaded, { once: true });
      img.addEventListener("error", markError, { once: true });
    }
  });
}

function setImgSrcWithLoading(imgEl, src){
  if(!imgEl) return;
  var frame = imgEl.closest(".img-load-frame");
  imgEl.classList.remove("is-loaded");
  if(frame){
    frame.classList.remove("is-loaded");
    var badge = frame.querySelector(".img-loading-text");
    if(badge) badge.textContent = "読み込み中…";
  }
  imgEl.onload = function(){
    imgEl.classList.add("is-loaded");
    if(frame) frame.classList.add("is-loaded");
  };
  imgEl.onerror = function(){
    imgEl.classList.add("is-loaded");
    if(frame){
      frame.classList.add("is-loaded");
      var badge = frame.querySelector(".img-loading-text");
      if(badge) badge.textContent = "表示エラー";
    }
  };
  imgEl.src = src;
  if(imgEl.complete && imgEl.naturalWidth > 0){
    imgEl.onload();
  }
}

function loadAccounts(){
  try {
    accounts = JSON.parse(localStorage.getItem("rhythm_accounts") || "[]");
    if(!Array.isArray(accounts)) accounts = [];
    var curId = localStorage.getItem("rhythm_current_id");
    if(accounts.length > 0 && curId){
      currentAccount = accounts.find(function(a){ return a.id === curId; }) || null;
    } else {
      currentAccount = null;
    }
  } catch(e){
    accounts = [];
    currentAccount = null;
  }
  updateProfileBtnUI();
}

function saveAccountsToLocal(){
  localStorage.setItem("rhythm_accounts", JSON.stringify(accounts));
  if(currentAccount){
    localStorage.setItem("rhythm_current_id", currentAccount.id);
  } else {
    localStorage.removeItem("rhythm_current_id");
  }
  updateProfileBtnUI();
}

function updateProfileBtnUI(){
  var btn = $("profileBtn");
  var topCard = $("topPlayerDisplay");
  var topDisplayImg = $("topPlayerIconImg");
  var topDisplayName = $("topPlayerNameTxt");
  var topBadge = $("topPlayerStatusBadge");
  var topHint = $("topPlayerHintTxt");

  if(currentAccount){
    var iconSrc = currentAccount.icon || ICONS[0];
    var nameTxt = currentAccount.nickname || "プレーヤー";
    if(btn) btn.innerHTML = '<img src="' + iconSrc + '" style="width:20px;height:20px;vertical-align:middle;object-fit:contain"> ' + nameTxt;
    if(topDisplayImg) setImgSrcWithLoading(topDisplayImg, iconSrc);
    if(topDisplayName) topDisplayName.textContent = nameTxt;
    if(topBadge) topBadge.textContent = "選択中のプレイヤー（タップで変更）";
    if(topHint) topHint.textContent = "プレイヤーの切り替えや新規作成ができます";
    if(topCard) topCard.classList.remove("unselected");
  } else {
    if(btn) btn.innerHTML = "👤 プレイヤー未選択";
    if(topDisplayImg) setImgSrcWithLoading(topDisplayImg, ICONS[0]);
    if(topDisplayName) topDisplayName.textContent = "プレイヤー未選択";
    if(topBadge) topBadge.textContent = "！まだえらばれていません";
    if(topHint) topHint.textContent = "ここをタップしてプレイヤーをえらんでね";
    if(topCard) topCard.classList.add("unselected");
  }
}

function openPlayerSelectScreen(){
  loadAccounts();
  if(accounts.length === 0){
    selectedNewIcon = ICONS[0];
    renderIconGrid();
    show("sNewCharIcon");
  } else {
    renderAccountList();
    show("sCharSelect");
  }
}

function ensurePlayerSelected(modeLabel){
  loadAccounts();
  if(currentAccount) return true;
  alert(modeLabel + "を遊ぶには、先にプレイヤーをえらんでね！\nプレイヤー選択画面へすすみます。");
  openPlayerSelectScreen();
  return false;
}

var volMetro = 50, volTap = 50, timingOfs = 0, themeIdx = 1;
var currentChapterIdx = 0;
var currentStoryStage = 0;
var previewAudioObj = null;
var isQuizTransitioning = false;
var isChapterIntroRunning = false;

var BPM = 90, BEAT = 60 / BPM, TOTAL = SCORE_TOTAL_BEATS;
function setBpm(v){ BPM = v; BEAT = 60 / v; }

var notes = [], curPat = null, currentLevelIndex = 0, currentProblemIndex = 0, demoOn = true;
var isStoryPlay = false;
var state = "idle", useDemo = true, canTap = false;
var t0, countStart, recStart, recEnd;
var taps = [], active = {}, rafId = 0, busyUntil = 0;
var calLag = 0, cal = null, calTimer = 0;

function getHighScore(lvlIdx, probIdx){
  if(!currentAccount) return 0;
  if(!currentAccount.highScores) currentAccount.highScores = {};
  return currentAccount.highScores[lvlIdx + "_" + probIdx] || 0;
}
function setHighScore(lvlIdx, probIdx, score){
  if(!currentAccount) return;
  if(!currentAccount.highScores) currentAccount.highScores = {};
  var key = lvlIdx + "_" + probIdx;
  if(score > (currentAccount.highScores[key] || 0)){
    currentAccount.highScores[key] = score;
    saveAccountsToLocal();
  }
}

function getStoryScore(chapterIdx, stageNum){
  if(!currentAccount) return 0;
  if(!currentAccount.storyScores) currentAccount.storyScores = {};
  return currentAccount.storyScores[chapterIdx + "_" + stageNum] || 0;
}
function setStoryScore(chapterIdx, stageNum, score){
  if(!currentAccount) return;
  if(!currentAccount.storyScores) currentAccount.storyScores = {};
  var key = chapterIdx + "_" + stageNum;
  if(score > (currentAccount.storyScores[key] || 0)){
    currentAccount.storyScores[key] = score;
    saveAccountsToLocal();
  }
}

function syncBgmForScreen(screenId){
  if(screenId === "sTop"){
    playBgmTrack(topBgm);
  } else if(screenId === "sStoryChapters" || screenId === "sStoryMap"){
    playBgmTrack(storyBgm);
  } else if(screenId === "sPrac"){
    playBgmTrack(pracBgm);
  } else {
    stopAllScreenBgm();
  }
}

function enterFromStart(){
  var startScreen = $("sStart");
  if(!startScreen || startScreen.dataset.leaving === "1") return;
  startScreen.dataset.leaving = "1";
  playNavSound();
  startScreen.classList.add("leaving");
  setTimeout(function(){
    show("sTop");
    startScreen.dataset.leaving = "0";
    startScreen.classList.remove("leaving");
  }, 550);
}

function show(id){
  ["sStart","sTop","sSet","sPrac","sGame","sStoryChapters","sStoryMap","sQuiz","sCharSelect","sNewCharIcon","sNewCharName"].forEach(function(s){
    var elScreen = $(s);
    if(elScreen) elScreen.classList.toggle("on", s === id);
  });

  var backBtn = $("back");
  if(backBtn){
    if(id === "sTop" || id === "sStart"){
      backBtn.style.display = "none";
    } else if(id === "sGame"){
      backBtn.style.display = "block";
      backBtn.textContent = isStoryPlay ? "← マップへ" : "← もんだいへ";
    } else if(id === "sStoryMap"){
      backBtn.style.display = "block";
      backBtn.textContent = "← 章の選択へ";
    } else if(id === "sQuiz"){
      backBtn.style.display = "block";
      backBtn.textContent = "← 章へ戻る";
    } else {
      backBtn.style.display = "block";
      backBtn.textContent = "← トップへ";
    }
  }

  syncBgmForScreen(id);
}

function goBackAction(){
  if(isChapterIntroRunning || isQuizTransitioning) return;
  playNavSound();
  if(previewAudioObj){ previewAudioObj.pause(); previewAudioObj = null; }
  if($("sGame") && $("sGame").classList.contains("on")){
    state = "idle"; canTap = false;
    cancelAnimationFrame(rafId);
    clearTimeout(calTimer);
    if($("popup")) $("popup").style.display = "none";
    releaseAll();
    stopAll();
    if(isStoryPlay){
      openStoryMap(currentChapterIdx, false);
    } else {
      renderProblemList(selectedPracLevel);
      show("sPrac");
    }
  } else if($("sQuiz") && $("sQuiz").classList.contains("on")){
    openStoryMap(currentChapterIdx, false);
  } else if($("sStoryMap") && $("sStoryMap").classList.contains("on")){
    openStoryChapters();
  } else {
    goTop();
  }
}

function goTop(){
  if(previewAudioObj){ previewAudioObj.pause(); previewAudioObj = null; }
  state = "idle"; canTap = false;
  cancelAnimationFrame(rafId);
  clearTimeout(calTimer);
  if($("popup")) $("popup").style.display = "none";
  releaseAll();
  stopAll();
  loadAccounts();
  show("sTop");
}

function loadSelectedProblem(lvlIdx, probIdx){
  currentLevelIndex = lvlIdx;
  currentProblemIndex = probIdx;
  var levelObj = levels[lvlIdx];
  curPat = levelObj.pats[probIdx];
  notes = buildNotes(curPat);
  drawScore(notes);
}

function scheduleDemo(base){
  notes.forEach(function(n){
    if(n.rest || n.tiedFrom) return;
    piano(base + n.start * BEAT, n.sound * BEAT);
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
  t0 = getAudioTime() + 0.4;
  if(useDemo){ scheduleDemo(t0); metro(t0, TOTAL, BEAT); countStart = t0 + TOTAL * BEAT + 0.6; }
  else countStart = t0 + 0.3;
  recStart = countStart + 4 * BEAT;
  recEnd = recStart + TOTAL * BEAT;
  for(var i = 0; i < 12; i++) click(countStart + i * BEAT, i % 4 === 0);
  state = "run";
  cancelAnimationFrame(rafId);
  tick();
}

function tick(){
  if(state !== "run") return;
  var now = getAudioTime();
  var vnow = now - latSec();
  canTap = now >= countStart;
  $("tap").classList.toggle("off", !canTap);
  for(var id in active){
    var ac = active[id];
    if(ac.tap && ac.rect){
      ac.tap.d = Math.max(0.05, (now - recStart - latSec()) - ac.tap.s);
      setMarker(ac.rect, ac.tap, BEAT);
    }
  }
  if(vnow < t0){ $("msg").textContent = "じゅんびしてね"; $("count").textContent = ""; }
  else if(vnow < countStart){ $("msg").textContent = useDemo ? "お手本を再生中…（よく聴いてね）" : "じゅんびしてね"; $("count").textContent = ""; }
  else if(vnow < recStart){
    var c = Math.min(4, Math.floor((vnow - countStart) / BEAT) + 1);
    $("msg").textContent = "つぎは あなたの番"; $("count").textContent = COUNT_WORDS[c - 1];
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
    cal = {t0: getAudioTime() + 0.5, beat: 60 / 75, lags: [], ks: []};
    for(var i = 0; i < 90; i++) click(cal.t0 + i * cal.beat, false);
  };
  var r = resumeAudio();
  if(getAudioState() === "running") go();
  else if(r && r.then) r.then(function(){ setTimeout(go, 150); }, go);
  calTimer = setTimeout(go, 1500);
}

function calTap(at){
  if(!cal) return;
  var k = Math.round((at - cal.t0) / cal.beat);
  if(k < 0) return;
  cal.ks.push(k);
  cal.lags.push(at - (cal.t0 + k * cal.beat));
  var n = cal.lags.length, d = "";
  for(var i = 0; i < 4; i++) d += (i < n ? "●" : "○") + " ";
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
  var ms = Math.round(calLag * 1000);
  $("msg").textContent = "調整できたよ！（ずれ " + ms + "ミリ秒）";
  $("count").textContent = "OK";
  calTimer = setTimeout(function(){
    if(state !== "caldone") return;
    state = "popup";
    $("popSub").textContent = "タイミング調整ずみ（ずれ " + ms + "ミリ秒）";
    $("popup").style.display = "flex";
  }, 700);
}

function judge(){
  var outcome = evaluateRhythm(notes, taps, BEAT);
  var score = outcome.score;
  var lines = outcome.lines.slice();

  if(isStoryPlay){
    setStoryScore(currentChapterIdx, currentStoryStage, score);
  } else {
    setHighScore(currentLevelIndex, currentProblemIndex, score);
  }

  if(isStoryPlay && score >= 80){
    lines.push("🎉 80点以上クリア！ お見事！");
  } else if(isStoryPlay){
    lines.push("💡 80点以上でクリア！ もう一度挑戦しよう！");
  }

  var col = score >= 80 ? "#2eaa5a" : (score >= 50 ? "#e08a00" : "#e2574c");
  $("bigScore").innerHTML = '<span class="lbl">得点</span> <span class="num" style="color:' + col + '">' + score + '</span><span class="lbl">点</span>';
  $("detail").innerHTML = lines.map(function(l){ return "<div>◇" + l + "</div>"; }).join("");
  $("msg").style.display = "none";
  $("result").style.display = "block";

  if(isStoryPlay){
    $("nextBtn").textContent = "ステージマップへ";
  } else {
    $("nextBtn").textContent = "つぎのもんだい";
  }

  drawScore(notes, outcome.res, outcome.extras, taps);
}

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
  for(var i = 0; i < 8; i++){
    var st = put("star", x, y);
    st.style.setProperty("--sz", (9 + Math.random() * 11) + "px");
    fly(st, 80);
  }
  for(var j = 0; j < 3; j++) fly(put("spark", x, y), 60);
  setTimeout(function(){ made.forEach(function(d){ if(d.parentNode) d.parentNode.removeChild(d); }); }, 700);
}
if(tapBtn){
  tapBtn.addEventListener("animationend", function(){ tapBtn.classList.remove("pulse"); });
}
function latSec(){ return calLag + 0.05 + timingOfs / 1000; }
function relTime(ts){ return (ts / 1000 + getPerfOffset()) - recStart - latSec(); }
function releaseAll(){
  var nowSec = getAudioTime();
  for(var id in active){
    var a = active[id];
    if(a.v && nowSec) a.v(nowSec);
    if(a.tap){ a.tap.d = Math.max(0.05, TOTAL * BEAT - a.tap.s); if(a.rect) setMarker(a.rect, a.tap, BEAT); }
  }
  active = {};
  if(tapBtn) tapBtn.classList.remove("down");
}
if(tapBtn){
  tapBtn.addEventListener("pointerdown", function(e){
    e.preventDefault();
    if(!canTap || active[e.pointerId]) return;
    if(getAudioState() !== "running") resumeAudio();
    try{ tapBtn.setPointerCapture(e.pointerId); }catch(x){}
    tapBtn.classList.add("down");
    try{ tapFx(e); }catch(x){}
    var a = {v: null, tap: null, rect: null};
    active[e.pointerId] = a;
    if(state === "cal") calTap(e.timeStamp / 1000 + getPerfOffset());
    if(state === "run"){
      var r = relTime(e.timeStamp);
      if(r > -0.25 && r < TOTAL * BEAT){
        if(r < 0) r = 0;
        a.tap = {s: r, d: 0.1};
        taps.push(a.tap);
        a.rect = addMarker(a.tap, BEAT);
      }
    }
  });
}
function release(e){
  var a = active[e.pointerId];
  if(!a) return;
  if(a.v) a.v(getAudioTime());
  if(a.tap){ a.tap.d = Math.max(0.05, relTime(e.timeStamp) - a.tap.s); if(a.rect) setMarker(a.rect, a.tap, BEAT); }
  delete active[e.pointerId];
  if(tapBtn && !Object.keys(active).length) tapBtn.classList.remove("down");
}
if(tapBtn){
  tapBtn.addEventListener("pointerup", release);
  tapBtn.addEventListener("pointercancel", release);
  tapBtn.addEventListener("lostpointercapture", release);
  tapBtn.addEventListener("contextmenu", function(e){ e.preventDefault(); });
}

function guard(){ var n = performance.now(); if(n < busyUntil) return false; busyUntil = n + 300; return true; }
if($("demoBtn")){
  $("demoBtn").addEventListener("click", function(){
    if(!guard()) return; ensureAudio(); stopAll();
    var b = getAudioTime() + 0.15;
    scheduleDemo(b); metro(b, TOTAL, BEAT);
  });
}
if($("mineBtn")){
  $("mineBtn").addEventListener("click", function(){
    if(!guard()) return; ensureAudio(); stopAll();
    var b = getAudioTime() + 0.15;
    metro(b, TOTAL, BEAT);
    taps.forEach(function(t){ piano(b + t.s, Math.min(Math.max(t.d, 0.05), 2)); });
  });
}
if($("againBtn")){
  $("againBtn").addEventListener("click", function(){ if(guard()){ playNavSound(); startRun(); } });
}
if($("nextBtn")){
  $("nextBtn").addEventListener("click", function(){
    if(!guard()) return;
    playNavSound();
    if(isStoryPlay){
      openStoryMap(currentChapterIdx, false);
    } else {
      var lvlObj = levels[currentLevelIndex];
      var nextProbIdx = currentProblemIndex + 1;
      if(nextProbIdx >= lvlObj.pats.length){
        nextProbIdx = 0;
        currentLevelIndex = (currentLevelIndex + 1) % levels.length;
      }
      loadSelectedProblem(currentLevelIndex, nextProbIdx);
      startRun();
    }
  });
}
if($("sStart")){
  $("sStart").addEventListener("click", enterFromStart);
  $("sStart").addEventListener("keydown", function(e){
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      enterFromStart();
    }
  });
}

if($("back")) $("back").addEventListener("click", goBackAction);
if($("popBtn")){
  $("popBtn").addEventListener("click", function(){
    if(state !== "popup") return;
    playNavSound();
    $("popup").style.display = "none";
    startRun();
  });
}

if($("goQuest")){
  $("goQuest").addEventListener("click", function(){
    playNavSound();
    ensureAudio();
    if(!ensurePlayerSelected("ストーリーモード")) return;
    openStoryChapters();
  });
}

function openStoryChapters(){
  show("sStoryChapters");
  var listEl = $("chapterList");
  listEl.scrollTop = 0;
  listEl.innerHTML = STORY_CHAPTERS.map(function(ch){
    var s0 = getStoryScore(ch.id, 0);
    var s1 = getStoryScore(ch.id, 1);
    var s2 = getStoryScore(ch.id, 2);
    var clearedCount = (s0 >= 80 ? 1 : 0) + (s1 >= 80 ? 1 : 0) + (s2 >= 80 ? 1 : 0);
    return (
      '<div class="chapter-card" data-chapter="' + ch.id + '">' +
        '<div class="img-load-frame chapter-card-img-wrap">' +
          '<span class="img-loading-text">読み込み中…</span>' +
          '<img class="chapter-card-img" src="' + ch.icon + '" alt="' + ch.composer + '">' +
        '</div>' +
        '<div class="chapter-card-body">' +
          '<div class="chapter-card-title">' +
            '<span class="chap-num-badge">' + ch.chapNum + '</span>' +
            '<span class="chap-composer-name">〜' + ch.composer + '〜</span>' +
          '</div>' +
          '<div class="chapter-card-sub">クリア: ' + clearedCount + '/3</div>' +
        '</div>' +
        '<button class="chapter-card-btn">挑戦 →</button>' +
      '</div>'
    );
  }).join("");

  bindImageLoadingStates(listEl);

  listEl.querySelectorAll(".chapter-card").forEach(function(card){
    card.addEventListener("click", function(){
      if(isChapterIntroRunning) return;
      playNavSound();
      var chId = parseInt(this.getAttribute("data-chapter"), 10);
      playChapterIntroAndOpenMap(chId);
    });
  });
}

function playChapterIntroAndOpenMap(chapterIdx){
  var chapter = STORY_CHAPTERS[chapterIdx];
  var overlay = $("chapterIntroOverlay");
  var content = $("chapterIntroContent");
  var titleEl = $("chapterIntroTitle");
  var imgEl = $("chapterIntroImg");
  var yearsEl = $("chapterIntroYears");

  if(!overlay || !content || !titleEl || !imgEl || !yearsEl){
    openStoryMap(chapterIdx, true);
    return;
  }

  isChapterIntroRunning = true;
  stopAllScreenBgm();

  titleEl.textContent = chapter.chapNum + "　〜" + chapter.composer + "〜";
  yearsEl.textContent = chapter.years || "";
  content.classList.remove("shown");
  setImgSrcWithLoading(imgEl, chapter.icon);

  overlay.style.display = "flex";
  void overlay.offsetWidth;
  overlay.classList.add("visible");

  setTimeout(function(){
    content.classList.add("shown");
  }, 550);

  setTimeout(function(){
    content.classList.remove("shown");
  }, 2450);

  setTimeout(function(){
    overlay.classList.remove("visible");
    openStoryMap(chapterIdx, true);
    setTimeout(function(){
      overlay.style.display = "none";
      isChapterIntroRunning = false;
    }, 750);
  }, 3200);
}

function openStoryMap(chapterIdx, resumeBgm){
  currentChapterIdx = chapterIdx;
  var chapter = STORY_CHAPTERS[chapterIdx];

  show("sStoryMap");
  if(resumeBgm !== false){
    playBgmTrack(storyBgm);
  }
  $("mapChapterTitle").textContent = chapter.title;

  var scores = [
    getStoryScore(chapterIdx, 0),
    getStoryScore(chapterIdx, 1),
    getStoryScore(chapterIdx, 2)
  ];

  scores.forEach(function(sc, idx){
    var badgeNum = $("starScore" + idx);
    if(badgeNum) badgeNum.textContent = sc;
    var nodeEl = document.querySelector('.map-stage-node[data-stage="' + idx + '"]');
    if(nodeEl){
      nodeEl.classList.toggle("cleared", sc >= 80);
    }
  });

  var bossNode = $("bossNode");
  var bossIcon = $("mapBossIcon");
  setImgSrcWithLoading(bossIcon, chapter.icon);

  var canChallengeBoss = true;
  bossNode.classList.remove("locked");
  bossNode.classList.add("unlocked");
  $("bossNodeLabel").textContent = "⚔️ ボスバトルに挑戦する！（テスト開放中）";

  document.querySelectorAll(".map-stage-node").forEach(function(node){
    node.onclick = function(){
      if(isChapterIntroRunning) return;
      playNavSound();
      var stageNum = parseInt(this.getAttribute("data-stage"), 10);
      startStoryStage(chapterIdx, stageNum);
    };
  });

  bossNode.onclick = function(){
    if(isChapterIntroRunning) return;
    if(!canChallengeBoss){
      alert("ステージ1〜3をすべて80点以上でクリアすると挑戦できるよ！");
      return;
    }
    playNavSound();
    startComposerQuiz(chapterIdx);
  };
}

function startStoryStage(chapterIdx, stageNum){
  isStoryPlay = true;
  currentStoryStage = stageNum;

  var patPool = levels[stageNum].pats;
  var randomPat = patPool[Math.floor(Math.random() * patPool.length)];
  curPat = randomPat;
  notes = buildNotes(curPat);

  show("sGame");
  startCal();
}

function showQuizResultAndMove(isCorrect, badgeText, messageText, onComplete){
  var overlay = $("quizResultOverlay");
  var card = $("quizResultCard");
  var badgeEl = $("quizResultBadge");
  var textEl = $("quizResultText");

  if(!overlay || !card || !badgeEl || !textEl){
    if(onComplete) onComplete();
    return;
  }

  isQuizTransitioning = true;
  card.classList.remove("correct", "wrong");
  card.classList.add(isCorrect ? "correct" : "wrong");
  badgeEl.textContent = badgeText;
  textEl.textContent = messageText;

  overlay.style.display = "flex";
  void overlay.offsetWidth;
  overlay.classList.add("visible");

  setTimeout(function(){
    overlay.classList.remove("visible");
    setTimeout(function(){
      overlay.style.display = "none";
      isQuizTransitioning = false;
      if(onComplete) onComplete();
    }, 550);
  }, 2300);
}

function startComposerQuiz(chapterIdx){
  var chapter = STORY_CHAPTERS[chapterIdx];
  isQuizTransitioning = false;
  show("sQuiz");
  stopAllScreenBgm();

  setImgSrcWithLoading($("quizPlayerIcon"), currentAccount ? currentAccount.icon : ICONS[0]);
  if($("quizPlayerName")) $("quizPlayerName").textContent = currentAccount ? currentAccount.nickname : "あなた";
  setImgSrcWithLoading($("quizComposerIcon"), chapter.icon);
  $("quizComposerName").textContent = chapter.composer;
  $("composerMessage").textContent = chapter.prompt;

  var listEl = $("quizOptionsList");

  var correctTrack = chapter.tracks[Math.floor(Math.random() * chapter.tracks.length)];
  var wrongTracks = MUSIC_DATABASE.filter(function(t){ return t.file !== correctTrack.file; });
  wrongTracks.sort(function(){ return Math.random() - 0.5; });
  var options = [
    { track: correctTrack, isCorrect: true },
    { track: wrongTracks[0], isCorrect: false },
    { track: wrongTracks[1], isCorrect: false }
  ];
  options.sort(function(){ return Math.random() - 0.5; });

  listEl.innerHTML = options.map(function(opt, idx){
    return (
      '<div class="quiz-option" data-correct="' + opt.isCorrect + '" data-file="' + opt.track.file + '">' +
        '<div class="quiz-option-title"><b>' + (idx + 1) + '.</b> ' + opt.track.title + '</div>' +
        '<button class="preview-audio-btn">📢 きく</button>' +
      '</div>'
    );
  }).join("");

  listEl.querySelectorAll(".quiz-option").forEach(function(card){
    var previewBtn = card.querySelector(".preview-audio-btn");
    var filePath = card.getAttribute("data-file");
    var isCorr = card.getAttribute("data-correct") === "true";

    previewBtn.addEventListener("click", function(e){
      e.stopPropagation();
      if(isQuizTransitioning) return;
      if(previewAudioObj){ previewAudioObj.pause(); }
      previewAudioObj = new Audio(filePath);
      previewAudioObj.volume = 0.6;
      previewAudioObj.play().catch(function(){
        alert("音源ファイルが見つかりませんでした。\n※実際の音声ファイルを配置すると再生されます。");
      });
    });

    card.addEventListener("click", function(){
      if(isQuizTransitioning) return;
      if(previewAudioObj){ previewAudioObj.pause(); previewAudioObj = null; }

      if(isCorr){
        playEffectAudio(quizCorrectSound);
        showQuizResultAndMove(
          true,
          "⭕ 正解！",
          chapter.composer + "\n" + chapter.correctMsg,
          function(){
            openStoryChapters();
          }
        );
      } else {
        playEffectAudio(quizWrongSound);
        showQuizResultAndMove(
          false,
          "❌ 不正解…",
          chapter.composer + "\n" + chapter.wrongMsg,
          function(){
            openStoryMap(chapterIdx, true);
          }
        );
      }
    });
  });
}

var selectedPracLevel = 0;
function renderProblemList(lvlIdx){
  selectedPracLevel = lvlIdx;
  var container = $("problemListContainer");
  if(!container) return;
  container.scrollTop = 0;
  container.innerHTML = "";
  var pats = levels[lvlIdx].pats;

  pats.forEach(function(pat, idx){
    var notesTmp = buildNotes(pat);
    var hiScore = getHighScore(lvlIdx, idx);

    var card = document.createElement("div");
    card.className = "prac-problem-card";

    var topRow = document.createElement("div");
    topRow.className = "prac-problem-top";

    var titleWrap = document.createElement("div");
    titleWrap.className = "prac-problem-title";
    titleWrap.innerHTML = '<span>No.' + (idx + 1) + '</span><span class="prac-problem-score">最高: ' + hiScore + '点</span>';
    topRow.appendChild(titleWrap);

    var playBtn = document.createElement("button");
    playBtn.className = "prac-select-btn";
    playBtn.textContent = "えらぶ →";
    playBtn.addEventListener("click", function(e){
      e.stopPropagation();
      playNavSound();
      ensureAudio();
      isStoryPlay = false;
      loadSelectedProblem(lvlIdx, idx);
      show("sGame");
      startCal();
    });
    topRow.appendChild(playBtn);
    card.appendChild(topRow);

    var svgWrap = document.createElement("div");
    svgWrap.className = "prac-problem-score-box";
    var miniSvg = document.createElementNS(SVG_NS, "svg");
    miniSvg.setAttribute("viewBox", "0 0 800 172");
    drawScoreToSvg(miniSvg, notesTmp);
    svgWrap.appendChild(miniSvg);
    card.appendChild(svgWrap);

    card.addEventListener("click", function(){
      playNavSound();
      ensureAudio();
      isStoryPlay = false;
      loadSelectedProblem(lvlIdx, idx);
      show("sGame");
      startCal();
    });

    container.appendChild(card);
  });
}

function makePracticeLevelToggles(){
  var box = $("lvBtns");
  if(!box || box.children.length > 0) return;
  levels.forEach(function(lvl, i){
    var b = document.createElement("button");
    b.className = "tg" + (i === 0 ? " on" : "");
    b.textContent = lvl.name;
    b.addEventListener("click", function(){
      Array.from(box.children).forEach(function(x){ x.classList.remove("on"); });
      b.classList.add("on");
      renderProblemList(i);
    });
    box.appendChild(b);
  });
}
makePracticeLevelToggles();

function renderIconGrid(){
  var grid = $("iconGrid");
  if(!grid) return;
  grid.innerHTML = ICONS.map(function(iconPath){
    return (
      '<div class="icon-item ' + (iconPath === selectedNewIcon ? 'selected' : '') + '" data-icon="' + iconPath + '">' +
        '<div class="img-load-frame full-frame">' +
          '<span class="img-loading-text">読み込み中…</span>' +
          '<img src="' + iconPath + '">' +
        '</div>' +
      '</div>'
    );
  }).join("");

  bindImageLoadingStates(grid);

  grid.querySelectorAll(".icon-item").forEach(function(el){
    el.addEventListener("click", function(){
      selectedNewIcon = this.getAttribute("data-icon");
      renderIconGrid();
    });
  });
}

function renderAccountList(){
  var list = $("accountList");
  if(!list) return;
  list.innerHTML = accounts.map(function(acc){
    return (
      '<div class="account-card ' + (currentAccount && currentAccount.id === acc.id ? 'active' : '') + '" data-id="' + acc.id + '">' +
        '<div style="display:flex;align-items:center;gap:12px;font-size:18px">' +
          '<div class="img-load-frame mini-icon-frame">' +
            '<span class="img-loading-text">読込中…</span>' +
            '<img src="' + acc.icon + '" style="width:48px;height:48px;object-fit:contain">' +
          '</div>' +
          '<span style="font-weight:bold">' + acc.nickname + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<button class="del-acc-btn" data-id="' + acc.id + '" style="font-size:12px;padding:6px 10px;background:#e2574c;box-shadow:0 2px 0 #b33;border-radius:8px">削除</button>' +
        '</div>' +
      '</div>'
    );
  }).join("");

  bindImageLoadingStates(list);

  list.querySelectorAll(".account-card").forEach(function(card){
    card.addEventListener("click", function(e){
      if(e.target.classList.contains("del-acc-btn")) return;
      playNavSound();
      var id = this.getAttribute("data-id");
      currentAccount = accounts.find(function(a){ return a.id === id; }) || null;
      saveAccountsToLocal();
      goTop();
    });
  });

  list.querySelectorAll(".del-acc-btn").forEach(function(btn){
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      var id = this.getAttribute("data-id");
      if(confirm("このキャラクターを削除しますか？")){
        accounts = accounts.filter(function(a){ return a.id !== id; });
        if(currentAccount && currentAccount.id === id){
          currentAccount = null;
        }
        saveAccountsToLocal();
        updateProfileBtnUI();
        renderAccountList();
      }
    });
  });
}

if($("topPlayerDisplay")){
  $("topPlayerDisplay").addEventListener("click", function(){
    playNavSound();
    openPlayerSelectScreen();
  });
  $("topPlayerDisplay").addEventListener("keydown", function(e){
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      playNavSound();
      openPlayerSelectScreen();
    }
  });
}

if($("toNewCharBtn")){
  $("toNewCharBtn").addEventListener("click", function(){
    playNavSound();
    selectedNewIcon = ICONS[0];
    renderIconGrid();
    show("sNewCharIcon");
  });
}

if($("nextToNameBtn")){
  $("nextToNameBtn").addEventListener("click", function(){
    playNavSound();
    setImgSrcWithLoading($("selectedIconPreview"), selectedNewIcon);
    $("newNickname").value = "";
    show("sNewCharName");
  });
}

if($("createAccBtn")){
  $("createAccBtn").addEventListener("click", function(){
    var nick = $("newNickname").value.trim();
    if(!nick){ alert("なまえを入力してね！"); return; }
    playNavSound();

    var newAcc = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      secret_code: 'rc-' + Math.floor(1000 + Math.random() * 9000),
      icon: selectedNewIcon,
      nickname: nick,
      tokens: 0,
      position: 1,
      highScores: {},
      storyScores: {}
    };
    accounts.push(newAcc);
    currentAccount = newAcc;
    saveAccountsToLocal();
    if(supabaseClient){
      supabaseClient.from('profiles').upsert({
        id: newAcc.id, secret_code: newAcc.secret_code, nickname: newAcc.nickname, icon: newAcc.icon
      }).then(function(){});
    }

    goTop();
  });
}

function makeToggle(boxId, labels, init, onPick){
  var box = $(boxId), btns = [];
  if(!box) return;
  box.innerHTML = "";
  labels.forEach(function(lb, i){
    var b = document.createElement("button");
    b.className = "tg" + (i === init ? " on" : ""); b.textContent = lb;
    b.addEventListener("click", function(){
      btns.forEach(function(x){ x.classList.remove("on"); });
      b.classList.add("on"); onPick(i);
    });
    box.appendChild(b); btns.push(b);
  });
}
makeToggle("demoTg", ["お手本あり","お手本なし"], 0, function(i){ demoOn = (i === 0); });

var saved = {};
try{ saved = JSON.parse(localStorage.getItem("rhythmSettings") || "{}"); }catch(e){}
if(saved.m != null) volMetro = saved.m;
if(saved.t != null) volTap = saved.t;
setAudioVolumes(volMetro, volTap);
if(saved.o != null) timingOfs = saved.o;
if(saved.th != null) themeIdx = saved.th;
try{ document.body.setAttribute("data-theme", String(themeIdx + 1)); }catch(e){}
if(saved.b) setBpm(saved.b);

function saveSet(){
  try{ localStorage.setItem("rhythmSettings", JSON.stringify({m:volMetro, t:volTap, b:BPM, o:timingOfs, th:themeIdx})); }catch(e){}
}
function setTheme(i){
  themeIdx = i;
  try{ document.body.setAttribute("data-theme", String(i + 1)); }catch(e){}
  saveSet();
}
makeToggle("themeTg", ["パステル","トロピカル","オーシャン"], themeIdx, setTheme);

if($("volM")) $("volM").value = volMetro;
if($("volMv")) $("volMv").textContent = volMetro;
if($("volT")) $("volT").value = volTap;
if($("volTv")) $("volTv").textContent = volTap;
if($("volM")) $("volM").addEventListener("input", function(){
  volMetro = parseInt(this.value, 10);
  $("volMv").textContent = volMetro;
  setAudioVolumes(volMetro, volTap);
  saveSet();
});
if($("volT")) $("volT").addEventListener("input", function(){
  volTap = parseInt(this.value, 10);
  $("volTv").textContent = volTap;
  setAudioVolumes(volMetro, volTap);
  saveSet();
});
if($("ofsS")) $("ofsS").value = timingOfs;
if($("ofsV")) $("ofsV").textContent = timingOfs;
if($("ofsS")) $("ofsS").addEventListener("input", function(){
  timingOfs = parseInt(this.value, 10);
  $("ofsV").textContent = timingOfs;
  saveSet();
});

if($("bpmSel")){
  [60,75,90,105,120].forEach(function(v){
    var o = document.createElement("option"); o.value = v; o.textContent = v; if(v === BPM) o.selected = true;
    $("bpmSel").appendChild(o);
  });
  $("bpmSel").addEventListener("change", function(){ setBpm(parseInt(this.value, 10)); saveSet(); });
}

if($("goPrac")){
  $("goPrac").addEventListener("click", function(){
    playNavSound();
    ensureAudio();
    if(!ensurePlayerSelected("練習モード")) return;
    makePracticeLevelToggles();
    renderProblemList(0);
    show("sPrac");
  });
}

if($("goSet")){
  $("goSet").addEventListener("click", function(){
    playNavSound();
    ensureAudio();
    show("sSet");
  });
}

if($("profileBtn")){
  $("profileBtn").addEventListener("click", function(){
    playNavSound();
    openPlayerSelectScreen();
  });
}

function initStartScreen(){
  var hasActiveScreen = ["sTop","sSet","sPrac","sGame","sStoryChapters","sStoryMap","sQuiz","sCharSelect","sNewCharIcon","sNewCharName"].some(function(id){
    var elScreen = $(id);
    return elScreen && elScreen.classList.contains("on");
  });
  if(!hasActiveScreen && $("sStart")){
    $("sStart").classList.add("on");
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", function(){
    loadAccounts();
    bindImageLoadingStates(document);
    initStartScreen();
  });
} else {
  loadAccounts();
  bindImageLoadingStates(document);
  initStartScreen();
}
})();
