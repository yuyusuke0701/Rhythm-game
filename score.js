(function(global){
"use strict";

var TOTAL = 8;
var X0 = 10, X1 = 790, TS_W = 56, PAD = 14;
var PB = (X1 - X0 - TS_W - 30) / TOTAL;
var NS = "http://www.w3.org/2000/svg";
var svg = document.getElementById("svg");

function xb(b){ return X0 + TS_W + b * PB; }
function xOf(start){ return xb(start) + PAD; }
function el(n, a){
  var e = document.createElementNS(NS, n);
  for(var k in a) e.setAttribute(k, a[k]);
  if(svg) svg.appendChild(e);
  return e;
}
function beam(xa, xz, y, th){
  el("polygon",{points:xa+","+y+" "+xz+","+y+" "+xz+","+(y+th)+" "+xa+","+(y+th),fill:"#222"});
}

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

function drawScoreToSvg(targetSvg, notes, res, extras, marks){
  if(!targetSvg) return;
  while(targetSvg.firstChild) targetSvg.removeChild(targetSvg.firstChild);
  var top = 40, bot = 140, HY = 105, STEM = 50, TOPY = HY - STEM;
  var oldSvg = svg;
  svg = targetSvg;
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
  svg = oldSvg;
}

function drawScore(notes, res, extras, marks){
  var mainSvg = document.getElementById("svg");
  if(mainSvg) drawScoreToSvg(mainSvg, notes, res, extras, marks);
}

function setMarker(m, t, beatSec){
  var x = Math.min(X1 - 14, xb(t.s / beatSec) + PAD);
  var w = Math.max(0, t.d / beatSec * PB);
  m.b.setAttribute("x", x - 5);
  m.b.setAttribute("width", Math.min(X1 - 4 - (x - 5), w + 10));
  m.h.setAttribute("cx", x);
}

function addMarker(t, beatSec){
  var oldSvg = svg;
  svg = document.getElementById("svg");
  var b = el("rect",{y:148,height:10,rx:5,fill:"#9bdcb0"});
  var h = el("circle",{cy:153,r:6.5,fill:"#157a3c",stroke:"#fff","stroke-width":1.5});
  svg = oldSvg;
  var m = {b:b, h:h};
  setMarker(m, t, beatSec);
  return m;
}

function evaluateRhythm(notes, taps, beatSec){
  var has16 = notes.some(function(n){ return n.type==="x" || n.type==="d"; });
  var tolBase = (has16 ? 0.18 : 0.3) * beatSec, tolLong = 0.4 * beatSec;
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
      var d = Math.abs(t.s - n.start*beatSec);
      if(d <= tolN) pairs.push({i:i, j:j, d:d});
    });
  });
  pairs.sort(function(a, b){ return a.d - b.d; });
  pairs.forEach(function(p){
    if(done[p.i] || used[p.j]) return;
    done[p.i] = true; used[p.j] = true; usedN++; hitN++;
    var n = notes[p.i], t = taps[p.j], hold = t.d / beatSec;
    sum += t.s - n.start*beatSec;
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
    var rStart = n.start * beatSec;
    var rEnd = (n.start + n.duration) * beatSec;

    var violated = false;
    taps.forEach(function(t){
      if(t.s < rEnd - 0.08 && (t.s + t.d) > rStart + 0.08){ violated = true; }
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
        var rStart = n.start * beatSec;
        var rEnd = (n.start + n.duration) * beatSec;
        if(t.s < rEnd - 0.08 && (t.s + t.d) > rStart + 0.08) inAnyRest = true;
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

  var extras = taps.filter(function(t, j){
    if(used[j]) return false;
    var inRest = false;
    notes.forEach(function(n){
      if(n.rest && t.s < (n.start+n.duration)*beatSec - 0.08 && (t.s+t.d) > n.start*beatSec + 0.08) inRest = true;
    });
    return !inRest;
  });

  return { score: score, lines: lines, res: res, extras: extras };
}

global.SVG_NS = NS;
global.SCORE_TOTAL_BEATS = TOTAL;
global.buildNotes = buildNotes;
global.drawScoreToSvg = drawScoreToSvg;
global.drawScore = drawScore;
global.setMarker = setMarker;
global.addMarker = addMarker;
global.evaluateRhythm = evaluateRhythm;
})(window);
