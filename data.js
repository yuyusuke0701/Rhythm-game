(function(global){
"use strict";

var ICONS = [];
for(var i = 1; i <= 40; i++){
  var numStr = String(i).padStart(2, '0');
  ICONS.push("icon/char" + numStr + ".png");
}

var MUSIC_DATABASE = [
  { composer: "エリック・サティ", title: "ジムノペディ", file: "Sound/Music/サティ_ジムノペディ.mp3" },
  { composer: "エリック・サティ", title: "ジュ・トゥ・ヴ", file: "Sound/Music/サティ_ジュ・トゥ・ヴ.mp3" },
  { composer: "ロベルト・シューマン", title: "クライスレリアーナ", file: "Sound/Music/シューマン_クライスレリアーナ.mp3" },
  { composer: "ロベルト・シューマン", title: "トロイメライ(『子供の情景』より)", file: "Sound/Music/シューマン_トロイメライ.mp3" },
  { composer: "ロベルト・シューマン", title: "見知らぬ国と人々(『子供の情景』より)", file: "Sound/Music/シューマン_見知らぬ国.mp3" },
  { composer: "ロベルト・シューマン", title: "謝肉祭「前口上」", file: "Sound/Music/シューマン_謝肉祭「前口上」.mp3" },
  { composer: "フレデリック・ショパン", title: "ノクターン第2番 変ホ長調 作品9-2", file: "Sound/Music/ショパン_ノクターン.mp3" },
  { composer: "フレデリック・ショパン", title: "前奏曲(プレリュード集 作品28より)", file: "Sound/Music/ショパン_プレリュード.mp3" },
  { composer: "フレデリック・ショパン", title: "幻想即興曲 嬰ハ短調", file: "Sound/Music/ショパン_幻想即興曲.mp3" },
  { composer: "フレデリック・ショパン", title: "別れの曲", file: "Sound/Music/ショパン_別れの曲.mp3" },
  { composer: "アントニン・ドヴォルザーク", title: "ユーモレスク 第7番", file: "Sound/Music/ドヴォルザーグ_ユーモレスク.mp3" },
  { composer: "クロード・ドビュッシー", title: "アラベスク第1番", file: "Sound/Music/ドビュッシー_アラベスク.mp3" },
  { composer: "クロード・ドビュッシー", title: "月の光(『ベルガマスク組曲』より)", file: "Sound/Music/ドビュッシー_月の光.mp3" },
  { composer: "テクラ・バダチェフスカ", title: "乙女の祈り", file: "Sound/Music/バダジェフスカ_乙女の祈り.mp3" },
  { composer: "ヨハネス・ブラームス", title: "ハンガリー舞曲 第5番", file: "Sound/Music/ブラームス_ハンガリー舞曲.mp3" },
  { composer: "ルートヴィヒ・ヴァン・ベートーヴェン", title: "エリーゼのために", file: "Sound/Music/ベートーヴェン_エリーゼのために.mp3" },
  { composer: "ルートヴィヒ・ヴァン・ベートーヴェン", title: "ピアノソナタ第8番 ハ短調 作品13「悲愴」", file: "Sound/Music/ベートーヴェン_悲愴ソナタ.mp3" },
  { composer: "モデスト・ムソルグスキー", title: "組曲「展覧会の絵」", file: "Sound/Music/ムソルグスキー_展覧会の絵.mp3" },
  { composer: "フェリックス・メンデルスゾーン", title: "ロンド・カプリチオーソ 作品14", file: "Sound/Music/メンデルスゾーン ロンド_カプリチオーソ.mp3" },
  { composer: "フェリックス・メンデルスゾーン", title: "春の歌(『無言歌集』より)", file: "Sound/Music/メンデルスゾーン_春の歌.mp3" },
  { composer: "ヴォルフガング・アマデウス・モーツァルト", title: "きらきら星変奏曲", file: "Sound/Music/モーツァルトきらきら_星変奏曲.mp3" },
  { composer: "ヴォルフガング・アマデウス・モーツァルト", title: "幻想曲 ニ短調 K.397", file: "Sound/Music/モーツァルト_幻想曲二短調.mp3" },
  { composer: "フランツ・リスト", title: "コンソレーション (慰め) 第3番", file: "Sound/Music/リスト_コンソレーション (慰め).mp3" },
  { composer: "フランツ・リスト", title: "超絶技巧練習曲 第4番「マゼッパ」", file: "Sound/Music/リスト_マゼッパ.mp3" },
  { composer: "フランツ・リスト", title: "ラ・カンパネラ", file: "Sound/Music/リストラ・カンパネラ.mp3" },
  { composer: "フランツ・リスト", title: "リゴレット・パラフレーズ", file: "Sound/Music/リスト_リゴレット・パラフレーズ.mp3" },
  { composer: "フランツ・リスト", title: "愛の夢", file: "Sound/Music/リスト_愛の夢.mp3" },
  { composer: "フランツ・シューベルト", title: "幻想曲「さすらい人幻想曲」", file: "Sound/Music/シューベルト_幻想曲「さすらい人幻想曲」.mp3" },
  { composer: "フランツ・シューベルト", title: "楽興の時", file: "Sound/Music/シューベルト_楽興の時.mp3" }
];

var COMPOSER_ICON_MAP = {
  "エリック・サティ": "picture/01_サティ.png",
  "ヴォルフガング・アマデウス・モーツァルト": "picture/02_モーツァルト.png",
  "アントニン・ドヴォルザーク": "picture/03_ドヴォルザーク.png",
  "ルートヴィヒ・ヴァン・ベートーヴェン": "picture/04_ベートーヴェン.png",
  "モデスト・ムソルグスキー": "picture/05_ムソルグスキー.png",
  "ロベルト・シューマン": "picture/06_シューマン.png",
  "クロード・ドビュッシー": "picture/07_ドビュッシー.png",
  "テクラ・バダチェフスカ": "picture/08_バダジェフスカ.png",
  "フレデリック・ショパン": "picture/09_ショパン.png",
  "フランツ・リスト": "picture/10_リスト.png",
  "フランツ・シューベルト": "picture/11_シューベルト.png",
  "フェリックス・メンデルスゾーン": "picture/12_メンデルスゾーン.png",
  "ヨハネス・ブラームス": "picture/13_ブラームス.png"
};

var COMPOSER_META_MAP = {
  "エリック・サティ": {
    years: "1866年 – 1925年",
    prompt: "「ちょっとふしぎで、おちつくわしの曲、どれだかわかるかな？」",
    correctMsg: "ふふっ、よく耳をすませたね！サティの世界へようこそ。",
    wrongMsg: "おっと、ちがう曲みたいだね。家具のようにゆらゆら聴いてみて！"
  },
  "ヴォルフガング・アマデウス・モーツァルト": {
    years: "1756年 – 1791年",
    prompt: "「きらきら光るような、たのしいぼくの曲を当ててみてね！」",
    correctMsg: "やったね！ぼくのメロディがキミにとどいたよ！",
    wrongMsg: "うーん、おしいな！もういちどよく聴いてみよう！"
  },
  "アントニン・ドヴォルザーク": {
    years: "1841年 – 1904年",
    prompt: "「ふるさとを思うあたたかいメロディ、聴きわけられるかな？」",
    correctMsg: "すばらしい！心の奥までひびいたようだね。",
    wrongMsg: "ちょっぴりちがうよ。風や森のけしきを思い浮かべてみて！"
  },
  "ルートヴィヒ・ヴァン・ベートーヴェン": {
    years: "1770年 – 1827年",
    prompt: "「魂をゆさぶるわしの曲、しっかりと聴きわけてみよ！」",
    correctMsg: "見事だ！その集中力、本物だな！",
    wrongMsg: "まだだ！もっと音を研ぎ澄ませて聴き直すがよい！"
  },
  "モデスト・ムソルグスキー": {
    years: "1839年 – 1881年",
    prompt: "「絵のなかを歩くようなわしの曲、どれか見つけられるかな？」",
    correctMsg: "お見事！絵の情景が目の前に浮かんだようだね！",
    wrongMsg: "むむ、別の絵の曲のようだぞ。もう一度よく聴いてみよう！"
  },
  "ロベルト・シューマン": {
    years: "1810年 – 1856年",
    prompt: "「ゆめうつつや物語のようなぼくの曲、わかるかな？」",
    correctMsg: "すごいよ！ぼくの物語をちゃんと受けとめてくれたね！",
    wrongMsg: "あれれ、ちがうページをめくっちゃったかな？もういちど！"
  },
  "クロード・ドビュッシー": {
    years: "1862年 – 1918年",
    prompt: "「光や水のゆらめきのようなわしの曲、感じとれるかな？」",
    correctMsg: "とても繊細だね。光のしずくまで聴こえていたよ。",
    wrongMsg: "すこしちがう色のようだね。もういちど静かに聴いてみよう。"
  },
  "テクラ・バダチェフスカ": {
    years: "1834年 – 1861年",
    prompt: "「やさしい祈りをこめたわたしの曲、どれだかわかるかしら？」",
    correctMsg: "すてきです！やさしい気持ちがしっかり伝わりましたね。",
    wrongMsg: "あら、ちがう曲のようですわ。もう一度よく聴いてみてね。"
  },
  "フレデリック・ショパン": {
    years: "1810年 – 1849年",
    prompt: "「ピアノが歌うようなぼくの曲、どれか当てられるかな？」",
    correctMsg: "ブラボー！ピアノの歌声がキミにちゃんと聴こえたんだね！",
    wrongMsg: "うーん、ちがう旋律だね。もう一度よく耳を傾けてみて！"
  },
  "フランツ・リスト": {
    years: "1811年 – 1886年",
    prompt: "「あざやかでドラマチックなわしの曲、聴きわけられるか？」",
    correctMsg: "素晴らしい！華やかな響きをしっかりつかまえたな！",
    wrongMsg: "ほう、そこを間違えるとはな！もう一度よく聴いてみろ！"
  },
  "フランツ・シューベルト": {
    years: "1797年 – 1828年",
    prompt: "「うたうように流れるぼくの曲、どれだかわかるかな？」",
    correctMsg: "うれしいな！メロディがキミの心にすっと入ったね！",
    wrongMsg: "おっと、ちがう曲みたいだ。もう一度ゆっくり聴いてみよう！"
  },
  "フェリックス・メンデルスゾーン": {
    years: "1809年 – 1847年",
    prompt: "「さわやかでかろやかなぼくの曲、当てられるかな？」",
    correctMsg: "やったね！春風のようにさわやかな正解だよ！",
    wrongMsg: "ちょっとちがうみたいだ。もういちど軽やかに聴いてみよう！"
  },
  "ヨハネス・ブラームス": {
    years: "1833年 – 1897年",
    prompt: "「深みと情熱のあるわしの曲、しっかり聴きわけてみよ。」",
    correctMsg: "よくやった！音の重みまでしっかり受けとめたな。",
    wrongMsg: "ちがうぞ。焦らず、もう一度よく聴いてみるんだ。"
  }
};

function getComposerIcon(name){
  var raw = COMPOSER_ICON_MAP[name] || "icon/char01.png";
  return encodeURI(raw);
}

var composersMap = {};
MUSIC_DATABASE.forEach(function(item){
  if(!composersMap[item.composer]){
    composersMap[item.composer] = {
      name: item.composer,
      icon: getComposerIcon(item.composer),
      tracks: []
    };
  }
  composersMap[item.composer].tracks.push(item);
});

var STORY_CHAPTERS = Object.keys(composersMap).map(function(compName, idx){
  var meta = COMPOSER_META_MAP[compName] || {
    years: "",
    prompt: "「わし（" + compName + "）の曲を当ててみたまえ！」",
    correctMsg: "正解！よく聴いているね！",
    wrongMsg: "不正解…！もう一度よく聴いてみよう！"
  };
  return {
    id: idx,
    chapNum: "第" + (idx + 1) + "章",
    composer: compName,
    years: meta.years,
    prompt: meta.prompt,
    correctMsg: meta.correctMsg,
    wrongMsg: meta.wrongMsg,
    title: "第" + (idx + 1) + "章 〜" + compName + "〜",
    icon: composersMap[compName].icon,
    tracks: composersMap[compName].tracks
  };
});

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
var COUNT_WORDS = ["１","２","３","４"];

global.ICONS = ICONS;
global.MUSIC_DATABASE = MUSIC_DATABASE;
global.STORY_CHAPTERS = STORY_CHAPTERS;
global.levels = levels;
global.LEN = LEN;
global.SOUND_LEN = SOUND_LEN;
global.COUNT_WORDS = COUNT_WORDS;
})(window);
