(function(global){
"use strict";

var ctx = null, master = null, bus = null, pw = null, perfOffset = null;
var volMetro = 50, volTap = 50;
var PIANO_F = 392, TAIL = 0.08, PV = 0.55;

function newBus(){
  if(!ctx || !master) return;
  bus = ctx.createGain();
  bus.connect(master);
}
function refreshOffset(){
  if(!ctx) return;
  perfOffset = ctx.currentTime - performance.now() / 1000;
}
function getPerfOffset(){ return perfOffset; }
function getAudioTime(){ return ctx ? ctx.currentTime : 0; }
function getAudioState(){ return ctx ? ctx.state : "closed"; }
function resumeAudio(){
  if(!ctx) return null;
  try { return ctx.resume(); } catch(e){ return null; }
}

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
  if(!ctx || !bus) return;
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
function metro(base, totalBeats, beatSec){
  for(var i = 0; i < totalBeats; i++) click(base + i * beatSec, i % 4 === 0);
}

var topBgm = new Audio("Sound/BGM/ちょっと優雅なひとときを.mp3");
topBgm.loop = true;
topBgm.preload = "auto";
topBgm.volume = 0.45;

var storyBgm = new Audio("Sound/BGM/二人だけの悲劇.mp3");
storyBgm.loop = true;
storyBgm.preload = "auto";
storyBgm.volume = 0.45;

var pracBgm = new Audio("Sound/BGM/手作りスコーン.mp3");
pracBgm.loop = true;
pracBgm.preload = "auto";
pracBgm.volume = 0.45;

var startTapSound = new Audio("Sound/BGM/システム決定音_6.mp3");
startTapSound.preload = "auto";
startTapSound.volume = 0.8;

var quizCorrectSound = new Audio("Sound/BGM/正解音.mp3");
quizCorrectSound.preload = "auto";
quizCorrectSound.volume = 0.85;

var quizWrongSound = new Audio("Sound/BGM/ピアノの和音.mp3");
quizWrongSound.preload = "auto";
quizWrongSound.volume = 0.85;

function playBgmTrack(audioObj){
  [topBgm, storyBgm, pracBgm].forEach(function(trk){
    if(trk !== audioObj && !trk.paused){
      trk.pause();
      trk.currentTime = 0;
    }
  });
  if(!audioObj) return;
  if(audioObj.paused){
    audioObj.currentTime = 0;
    var p = audioObj.play();
    if(p && p.catch) p.catch(function(){});
  }
}

function stopAllScreenBgm(){
  [topBgm, storyBgm, pracBgm].forEach(function(trk){
    trk.pause();
    trk.currentTime = 0;
  });
}

function playNavSound(){
  try {
    startTapSound.currentTime = 0;
    var p = startTapSound.play();
    if(p && p.catch) p.catch(function(){});
  } catch(e) {}
}

function playEffectAudio(audioObj){
  try {
    audioObj.currentTime = 0;
    var p = audioObj.play();
    if(p && p.catch) p.catch(function(){});
  } catch(e) {}
}

function setAudioVolumes(mVol, tVol){
  volMetro = mVol;
  volTap = tVol;
}

global.ensureAudio = ensureAudio;
global.stopAll = stopAll;
global.refreshOffset = refreshOffset;
global.getPerfOffset = getPerfOffset;
global.getAudioTime = getAudioTime;
global.getAudioState = getAudioState;
global.resumeAudio = resumeAudio;
global.piano = piano;
global.click = click;
global.metro = metro;
global.playTestBuzzer = playTestBuzzer;
global.playBgmTrack = playBgmTrack;
global.stopAllScreenBgm = stopAllScreenBgm;
global.playNavSound = playNavSound;
global.playEffectAudio = playEffectAudio;
global.topBgm = topBgm;
global.storyBgm = storyBgm;
global.pracBgm = pracBgm;
global.quizCorrectSound = quizCorrectSound;
global.quizWrongSound = quizWrongSound;
global.setAudioVolumes = setAudioVolumes;
})(window);
