
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

// =============================================================
// 日志
// =============================================================
const debugEl = document.getElementById('debug');
function log(msg, color = '#0f0') {
  console.log(msg);
  debugEl.textContent = msg;   /* ★ 字幕式：只保留最新一条 */
  debugEl.style.color = color;
}
const logOK = m => log(m, '#7f7');
const logErr = m => log(m, '#f88');
const logInfo = m => log(m, 'rgba(255,255,255,.6)');

// =============================================================
// UI 引用
// =============================================================
const nameEnEl = document.querySelector('#buddhaName .en');
const nameZhEl = document.querySelector('#buddhaName .zh');
const hintEnEl = document.querySelector('#hint .en');
const hintZhEl = document.querySelector('#hint .zh');
const holdLabelEnEl = document.querySelector('#holdRing .label .en');
const holdLabelZhEl = document.querySelector('#holdRing .label .zh');
const wipeProgressEl = document.getElementById('wipeProgress');
const wipeProgressFill = wipeProgressEl.querySelector('.fill');

function setName(en, zh) { nameEnEl.innerHTML = en; nameZhEl.textContent = zh; }
function setHint(en, zh) { hintEnEl.innerHTML = en; hintZhEl.innerHTML = zh; }
function setHoldLabel(en, zh) { holdLabelEnEl.textContent = en; holdLabelZhEl.textContent = zh; }

// =============================================================
// 祝福语（阶段三）：文言文正文 + 解读，随机出现
// =============================================================
const BLESSINGS = [
  { text: '佛光普照，福慧双增。',
    enText: 'May the Buddha\'s light shine upon thee, and may thy blessing and wisdom grow as one.',
    en: 'May the Buddha-light shine upon all; may wisdom and merit grow together.',
    zh: '愿佛陀的光明遍照世间，智慧与福德一同增长。' },
  { text: '一花一世界，一叶一菩提。',
    enText: 'Within a single flower lieth a world; within a single leaf, enlightenment.',
    en: 'In a single flower, a whole world; in a single leaf, awakening.',
    zh: '一花之中见世界，一叶之间悟菩提；微尘里亦有圆满。' },
  { text: '心净则国土净。',
    enText: 'When the heart is pure, the land is pure.',
    en: '"When the mind is pure, the land is pure." — Vimalakirti Sutra',
    zh: '《维摩诘经》语。心若清净，所见世界亦清净。' },
  { text: '拈花微笑，不立文字。',
    enText: 'A flower raised, a smile returned — beyond all words.',
    en: 'The Buddha held up a flower; Mahakasyapa smiled. True understanding needs no words.',
    zh: '世尊拈花，迦叶微笑。真正的领悟，无需言语。' },
  { text: '明珠蒙尘，拂之即明。',
    enText: 'Though the bright pearl be veiled in dust, one wipe restoreth its light.',
    en: 'A pearl gathers dust, yet one wipe restores its shine — so too the Buddha-nature within you.',
    zh: '明珠虽蒙尘，一拂便复光明；人人本具佛性，拭去尘埃即现。' },
  { text: '慈悲喜舍，福泽绵长。',
    enText: 'Through loving-kindness, compassion, joy and equanimity shall thy blessings flow ever onward.',
    en: 'Loving-kindness, compassion, joy, equanimity — may your blessings flow long and far.',
    zh: '以慈悲喜舍四无量心待人接物，福泽自然绵长。' },
  { text: '云开见月，静水流深。',
    enText: 'The clouds part and the moon appeareth; the stillest waters run deepest.',
    en: 'Clouds part and the moon appears; still waters run deep.',
    zh: '拨开迷雾，心月自明；愿你沉静之中，自有力量。' },
  { text: '种善因，得善果。',
    enText: 'Sow thou seeds of goodness, and goodness shall be thy harvest.',
    en: 'Sow wholesome causes, reap wholesome fruits — what you plant, you will harvest.',
    zh: '因果不虚；愿你所种之善，皆开花结果。' },
  { text: '身安不如心安，心安即是归处。',
    enText: 'Bodily ease is naught beside a tranquil mind; the settled heart is home.',
    en: 'Ease of body is less than ease of mind; a peaceful heart is home.',
    zh: '外境易变，唯有心安，才是真正的归宿。' },
  { text: '善念一起，福至心灵。',
    enText: 'Let one wholesome thought arise, and blessing shall touch thy heart.',
    en: 'A single wholesome thought plants a field of merit.',
    zh: '一念之善，便是福田；愿你常存善念，福至心灵。' },
  { text: '佛以一音演说法，众生随类各得解。',
    enText: 'With a single voice the Buddha teacheth, and each soul heareth in its own tongue.',
    en: '"The Buddha speaks with one voice; each being understands in their own way." — Lotus Sutra',
    zh: '《法华经》语。同一祝福，愿你自得其解，各取所需。' },
  { text: '愿昼吉祥夜吉祥，昼夜六时恒吉祥。',
    enText: 'Blessed be the day, blessed be the night — blessed every hour, for evermore.',
    en: 'May every hour, day and night, be auspicious — now and always.',
    zh: '愿你昼夜六时，时时吉祥，处处安康。' },
];
let lastBlessIdx = -1, blessingShown = false;
const blessCard = document.getElementById('blessCard');
function showBlessing() {
  let i;
  do { i = Math.floor(Math.random() * BLESSINGS.length); }
  while (i === lastBlessIdx && BLESSINGS.length > 1);
  lastBlessIdx = i;
  const b = BLESSINGS[i];
  blessCard.querySelector('.bless-text .en').textContent = b.enText;
  blessCard.querySelector('.bless-text .zh').textContent = b.text;
  blessCard.querySelector('.bless-note .en').textContent = b.en;
  blessCard.querySelector('.bless-note .zh').textContent = b.zh;
  blessingShown = true;
  blessCard.classList.add('show');
  AudioSys.playBlessing();   // ★ 祝福音乐
  logOK(`[phase 3] blessing ${i + 1}/${BLESSINGS.length} shown`);
}
function hideBlessing() {
  blessingShown = false;
  blessCard.classList.remove('show');
}

// ============================================================
// 阶段一模型微调（叙事句下方滑轨）：大小 / 上下位置，只在阶段一显示
// ============================================================
let modelYOffset = 0;
function applyModelYOffset() {
  if (goldGroup) goldGroup.position.y = modelYOffset;   // 粒子模型（含阶段三金身）
  buddhas.forEach(b => { if (b && b.solidWrapper) b.solidWrapper.position.y = modelYOffset; });  // 贴图模型
}
function updateTweaksPanel() {
  const p = document.getElementById('modelTweaks');
  if (p) p.classList.toggle('show', currentPhase === PHASE.PHASE1);
}
(function setupTweaks() {
  const sizeS = document.getElementById('tweakSize');
  const sizeV = document.getElementById('tweakSizeVal');
  const yS = document.getElementById('tweakY');
  const yV = document.getElementById('tweakYVal');
  if (sizeS) sizeS.addEventListener('input', () => {
    const s = parseFloat(sizeS.value);
    RENDER_PARAMS.scale = s;
    PHASE1_PARAMS.scale = s;   // 记住：进阶段二不跳变
    PHASE2_PARAMS.scale = s;
    applyAllRenderParams();
    if (sizeV) sizeV.textContent = s.toFixed(2);
  });
  if (yS) yS.addEventListener('input', () => {
    modelYOffset = parseFloat(yS.value);
    applyModelYOffset();
    if (yV) yV.textContent = modelYOffset.toFixed(2);
  });
})();

// ============================================================
// 背景音乐
//   ambient.mp3  全阶段环境底（循环；阶段二擦拭时压低）
//   wipe.mp3     阶段二擦拭声（循环）
//   blessing.mp3 祝福卡片弹出时播放一次
// 浏览器自动播放策略：首次用户交互（点击/按键/触摸）后解锁
// ============================================================
const AUDIO_URLS = {
  ambient:  'https://raw.githubusercontent.com/CoolEli/dunhuang-gesture-buddha/main/public/audio/ambient.mp3',
  wipe:     'https://raw.githubusercontent.com/CoolEli/dunhuang-gesture-buddha/main/public/audio/wipe.mp3',
  blessing: 'https://raw.githubusercontent.com/CoolEli/dunhuang-gesture-buddha/main/public/audio/blessing.mp3'
};
const AudioSys = {
  enabled: true,
  unlocked: false,
  el: {},
  init() {
    for (const [k, url] of Object.entries(AUDIO_URLS)) {
      const a = new Audio();
      a.src = url;
      a.preload = 'auto';
      a.loop = (k !== 'blessing');
      a.volume = 0;
      this.el[k] = a;
    }
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      this.applyPhase(currentPhase);
      logOK('[audio] unlocked, ambient on');
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    const btn = document.getElementById('soundToggle');
    if (btn) btn.addEventListener('click', () => this.toggle());
  },
  fade(a, to, ms = 900) {
    if (!a) return;
    if (a._fadeTimer) { clearInterval(a._fadeTimer); a._fadeTimer = null; }
    const from = a.volume;
    if (Math.abs(from - to) < 0.001) {
      if (to > 0 && a.paused) a.play().catch(() => {});
      else if (to === 0 && !a.paused) a.pause();
      return;
    }
    if (to > 0 && a.paused) { try { a.currentTime = (a.loop ? a.currentTime : 0); } catch (e) {} a.play().catch(() => {}); }
    const steps = Math.max(1, Math.round(ms / 50));
    let i = 0;
    a._fadeTimer = setInterval(() => {
      i++;
      a.volume = from + (to - from) * Math.min(1, i / steps);
      if (i >= steps) {
        clearInterval(a._fadeTimer); a._fadeTimer = null;
        a.volume = to;
        if (to === 0) a.pause();
      }
    }, 50);
  },
  applyPhase(phase) {
    if (!this.unlocked || !this.enabled) return;
    if (phase === PHASE.PHASE2) {
      this.fade(this.el.ambient, 0.15);   // 擦拭时环境底压低
      this.fade(this.el.wipe, 0.65);     // 擦拭声起
    } else {
      this.fade(this.el.wipe, 0);
      this.fade(this.el.ambient, 0.45);   // 阶段一/三环境底
    }
  },
  playBlessing() {
    if (!this.unlocked || !this.enabled) return;
    const a = this.el.blessing;
    if (!a) return;
    if (a._fadeTimer) { clearInterval(a._fadeTimer); a._fadeTimer = null; }
    try { a.currentTime = 0; } catch (e) {}
    a.volume = 0.85;
    a.play().catch(() => {});
  },
  toggle() {
    this.enabled = !this.enabled;
    const btn = document.getElementById('soundToggle');
    if (btn) {
      btn.classList.toggle('muted', !this.enabled);
      btn.querySelector('.en').textContent = this.enabled ? '🔊 SOUND' : '🔇 MUTED';
      btn.querySelector('.zh').textContent = this.enabled ? '🔊 声音' : '🔇 静音';
    }
    if (!this.enabled) {
      for (const a of Object.values(this.el)) this.fade(a, 0, 400);
    } else {
      this.applyPhase(currentPhase);
    }
    logOK(`[audio] ${this.enabled ? 'on' : 'muted'}`);
  }
};
AudioSys.init();

// ============================================================
// 语言切换
// =============================================================
let currentLang = 'en';
function setLang(lang) {
  currentLang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  document.querySelectorAll('#langSwitch button').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  startNarrative();
  renderCards();
}
document.querySelectorAll('#langSwitch button').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

// =============================================================
// 叙述打字机
// =============================================================
const NARRATIVE_EN = 'As it loses its devotees, the Buddha-light gradually grows dim.';
const NARRATIVE_ZH = '信众渐离，佛光渐暗。';
let narrativeTimerEn = null, narrativeTimerZh = null;

function startNarrative() {
  const enEl = document.querySelector('#narrative .en');
  const zhEl = document.querySelector('#narrative .zh');
  if (narrativeTimerEn) { clearTimeout(narrativeTimerEn); narrativeTimerEn = null; }
  if (narrativeTimerZh) { clearTimeout(narrativeTimerZh); narrativeTimerZh = null; }
  enEl.innerHTML = ''; zhEl.innerHTML = '';

  const enCursor = document.createElement('span');
  enCursor.className = 'cursor'; enCursor.textContent = '▎'; enEl.appendChild(enCursor);
  const zhCursor = document.createElement('span');
  zhCursor.className = 'cursor'; zhCursor.textContent = '▎'; zhEl.appendChild(zhCursor);

  let i = 0;
  function typeEn() {
    if (i < NARRATIVE_EN.length) {
      enCursor.insertAdjacentText('beforebegin', NARRATIVE_EN.charAt(i));
      i++;
      const ch = NARRATIVE_EN.charAt(i - 1);
      narrativeTimerEn = setTimeout(typeEn, (ch === ',' || ch === '.') ? 240 : 38);
    }
  }
  typeEn();
  setTimeout(() => {
    let j = 0;
    function typeZh() {
      if (j < NARRATIVE_ZH.length) {
        zhCursor.insertAdjacentText('beforebegin', NARRATIVE_ZH.charAt(j));
        j++;
        const ch = NARRATIVE_ZH.charAt(j - 1);
        narrativeTimerZh = setTimeout(typeZh, (ch === '，' || ch === '。') ? 260 : 130);
      }
    }
    typeZh();
  }, 500);
}

// 佛像信息
// =============================================================
const BUDDHA_INFO = [
  { id: 'beida-buddha', en: 'BEIDA BUDDHA', zh: '北大像',
    tags: { en: ['Cave 96', 'Early Tang', '35.5m', 'Maitreya'],
            zh: ['第96窟', '初唐', '35.5米', '弥勒佛'] },
    desc: { en: 'Housed in Cave 96, the "Nine-Storey Temple", this colossal Maitreya was carved in 695 CE. At 35.5 meters it is the largest statue in the Mogao Caves — serene, monumental, the definitive image of Early Tang sculpture.',
            zh: '北大像位于莫高窟第96窟"九层楼"内，建于初唐武周延载二年（695年），通高35.5米，是莫高窟中最大的塑像。像为弥勒佛，结跏趺坐，面相丰润，是初唐塑像的杰出代表。' },
    facts: { en: [['Date', 'Early Tang · 695 CE'], ['Location', 'Cave 96 · Nine-Storey Temple'], ['Height', '35.5 m · largest in Mogao']],
             zh: [['年代', '初唐 · 延载二年（695年）'], ['位置', '第96窟 · 九层楼'], ['通高', '35.5米 · 莫高窟最大']] } },
  { id: 'feitian-apsaras', en: 'FEITIAN APSARAS', zh: '飞天像',
    tags: { en: ['Mogao Caves', 'Tang Dynasty'], zh: ['莫高窟', '唐代'] },
    desc: { en: 'Apsaras are celestial beings in Buddhist art — dancers of the sky. In Mogao they drift with flowing sashes, playing music or scattering blossoms: the most poetic embodiment of Tang vitality.',
            zh: '飞天是佛教艺术中的天人形象，唐人以"神飞行空"咏之。莫高窟飞天衣袂飘然、迎风起舞，或奏乐、或散花，是盛唐气象最富诗意的化身。' },
    facts: { en: [['Date', 'Tang Dynasty'], ['Location', 'Mogao Caves'], ['Motif', 'Celestials · music & blossoms']],
             zh: [['年代', '唐代'], ['位置', '莫高窟'], ['形象', '天人 · 奏乐散花']] } },
  { id: 'smiling-king', en: 'SMILING KING', zh: '含笑天王',
    tags: { en: ['Cave 194', 'High Tang'], zh: ['第194窟', '盛唐'] },
    desc: { en: 'The guardian king on the south side of Cave 194 is the only smiling Heavenly King in Dunhuang. Unlike the usual wrathful guardians, he smiles gently — a rare, human touch of High Tang sculpture.',
            zh: '第194窟南侧天王，是敦煌彩塑中仅有的含笑天王。与常见的怒目天王不同，他嘴角含笑、神态和蔼，是盛唐塑工写实精神的珍贵见证。' },
    facts: { en: [['Date', 'High Tang'], ['Location', 'Cave 194 · south side'], ['Note', 'The only smiling king in Dunhuang']],
             zh: [['年代', '盛唐'], ['位置', '第194窟 · 南侧'], ['特点', '敦煌唯一的含笑天王']] } },
  { id: 'ruyi-guanyin', en: 'RUYI GUANYIN', zh: '如意轮观音',
    tags: { en: ['Mogao Caves', 'Tang Dynasty'], zh: ['莫高窟', '唐代'] },
    desc: { en: 'Ruyi Guanyin — "Wish-Fulfilling Wheel" — is one of the six manifestations of Avalokitesvara in Esoteric Buddhism. Holding the cintamani jewel and the dharma wheel, she embodies compassion that grants every wish.',
            zh: '如意轮观音是密宗所传六观音之一，因手持如意宝珠与法轮得名，象征以慈悲与智慧满众生愿。造像仪态优雅，是唐代观音信仰的典型样式。' },
    facts: { en: [['Date', 'Tang Dynasty'], ['Location', 'Mogao Caves'], ['Attributes', 'Cintamani jewel · dharma wheel']],
             zh: [['年代', '唐代'], ['位置', '莫高窟'], ['持物', '如意宝珠 · 法轮']] } }
];

const infoPanel = document.getElementById('infoPanel');
const cardRefs = [];

function renderCards() {
  infoPanel.innerHTML = '';
  cardRefs.length = 0;
  BUDDHA_INFO.forEach((info, i) => {
    const card = document.createElement('div');
    card.className = 'info-card';
    card.dataset.index = i;
    const tagList = currentLang === 'zh' ? info.tags.zh : info.tags.en;
    const tagsHtml = tagList.map(t => `<span class="tag">${t}</span>`).join('');
    const descText = currentLang === 'zh' ? info.desc.zh : info.desc.en;
    const factList = currentLang === 'zh' ? info.facts.zh : info.facts.en;
    const factsHtml = factList.map(([k, v]) =>
      `<div class="fact-row"><span class="fact-k">${k}</span><span class="fact-v">${v}</span></div>`).join('');
    const nameHtml = currentLang === 'zh'
      ? `<div class="card-name zh">${info.zh}</div><div class="card-name-sub en">${info.en}</div>`
      : `<div class="card-name en">${info.en}</div><div class="card-name-sub zh">${info.zh}</div>`;
    card.innerHTML = `${nameHtml}<div class="card-meta">${tagsHtml}</div>` +
      `<div class="card-body"><div class="card-divider"></div>` +
      `<div class="card-desc">${descText}</div><div class="card-facts">${factsHtml}</div></div>`;
    card.addEventListener('click', () => {
      if (currentPhase !== PHASE.PHASE1) return;
      if (i !== currentIndex) switchTo(i);
    });
    infoPanel.appendChild(card);
    cardRefs.push(card);
  });
  updateCardHighlight(currentIndex);
}
function updateCardHighlight(idx) {
  const others = [];
  cardRefs.forEach((card, i) => {
    card.classList.toggle('active', i === idx);
    if (i !== idx) others.push(card);
  });
  // ★ 展开的卡片始终排在四张中间（第2位），其余保持原有相对顺序
  cardRefs[idx].style.order = 1;
  others.forEach((card, k) => { card.style.order = k === 0 ? 0 : k + 1; });
}

// =============================================================
// 阶段定义
// =============================================================
const PHASE = {
  PHASE1: 'PHASE1',
  PHASE2: 'PHASE2',
  PHASE3: 'PHASE3'
};
let currentPhase = PHASE.PHASE1;

// =============================================================
// 配置
// =============================================================
const CDN_BASES = [
  'https://cdn.jsdelivr.net/gh/CoolEli/dunhuang-gesture-buddha@main',
  'https://fastly.jsdelivr.net/gh/CoolEli/dunhuang-gesture-buddha@main',
  'https://raw.githubusercontent.com/CoolEli/dunhuang-gesture-buddha/main'
];

const BUDDHAS = [
  { id:'beida-buddha',   name:'北大像',     nameEn:'BEIDA<br>BUDDHA',    file:'public/models/beida-buddha.glb',   color:0xffd700 },
  { id:'feitian-apsaras',name:'飞天像',     nameEn:'FEITIAN<br>APSARAS', file:'public/models/feitian-apsaras.glb',color:0xffe4b5 },
  { id:'smiling-king',   name:'含笑天王',   nameEn:'SMILING<br>KING',    file:'public/models/smiling-king.glb',   color:0xff6347 },
  { id:'ruyi-guanyin',   name:'如意轮观音', nameEn:'RUYI<br>GUANYIN',    file:'public/models/ruyi-guanyin.glb',   color:0x9fd8ff }
];

const WIDTH = 320;
const COUNT = WIDTH * WIDTH;

const AMBIENT_WIDTH = 160;
const AMBIENT_COUNT = AMBIENT_WIDTH * AMBIENT_WIDTH;
const AMBIENT_BOX = new THREE.Vector3(22, 16, 18);

const AMBIENT_FORCE = {
  radius: 10.0, swirl: 0.0, drag: 20.0, attract: 0.0,
  damping: 0.915, noise: 2.00, maxSpeed: 1.0,
  glowDecay: 0.990, speedBoost: 3.00
};

const BASE_CAMERA_Z = 8.0;
const FIXED_MODEL_SCALE = 1.15;
const PHASE2_CAMERA_ZOOM = 0.78;

const NORMALIZED_SIZE = 4.86;
const PIXEL_RATIO = Math.min(devicePixelRatio, 2);
const HOLD_DURATION_MS = 500;

const WIPE_MASK_SIZE = 1024;
const WIPE_RADIUS_UV = 0.07;   /* ★ 笔刷缩小：擦拭更从容，不能一下全擦完 */
const WIPE_COMPLETE_THRESHOLD = 0.55;
const WIPE_CHECK_INTERVAL = 0.4;

const WIPE_TOTAL_DURATION = 5.0;

const FORCE = { gather: 0.78, leakRadius: 0.30, glowRadius: 0.28 };
const REVEAL_RADIUS = 0.5;
const ENTITY_ALPHA_START = 0.45;
const ENTITY_ALPHA_END = 1.15;
const BRIGHTNESS_FALLOFF_POW = 2.0;
const GOLD_RADIUS = 0.9;
const DETAIL = { areaExponent: 0.65 };

// =============================================================
// 两套参数
// =============================================================
const PHASE1_PARAMS = {
  scale: 1.00,
  particleRatio: 1.00,
  brightness: 1.00,
  reveal: 0.00,
  transparent: false,
  alphaTest: 0.25,
  depthWrite: true,
  side: 'DoubleSide',
  renderOrder: 0,
  softLow: 0.00,
  softHigh: 0.01,
  haloXY: 1.05,
  haloZ: 1.00,
  haloBack: 1.50,
  densityMul: 1.00
};

const PHASE2_PARAMS = {
  scale: 1.00,
  particleRatio: 1.00,
  brightness: 1.00,
  reveal: 0.00,
  transparent: false,
  alphaTest: 0.25,
  depthWrite: true,
  side: 'DoubleSide',
  renderOrder: 0,
  softLow: 0.00,
  softHigh: 0.01,
  haloXY: 1.05,
  haloZ: 1.00,
  haloBack: 1.50,
  densityMul: 1.00
};

const RENDER_PARAMS = { ...PHASE1_PARAMS };

const solidMaterials = [];

// =============================================================
// 场景
// =============================================================
const app = document.getElementById('app');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.025);

const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 500);
camera.position.set(0, 0, BASE_CAMERA_Z / FIXED_MODEL_SCALE);   // ★ 相机调平（y=0）：模型上下对称，始终居于屏幕中心
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance'
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(PIXEL_RATIO);
renderer.setClearColor(0x000000, 0);
renderer.setClearAlpha(0);
renderer.autoClear = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffd9a0, 1.8));
const keyLight = new THREE.DirectionalLight(0xfff2d0, 2.5);
keyLight.position.set(4, 8, 6); scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x88aaff, 1.2);
rimLight.position.set(-5, 2, -4); scene.add(rimLight);
const fillLight = new THREE.DirectionalLight(0xffc080, 0.9);
fillLight.position.set(0, -3, 3); scene.add(fillLight);
const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
frontLight.position.set(0, 3, 10); scene.add(frontLight);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// =============================================================
// GLTFLoader
// =============================================================
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
try {
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
  loader.setDRACOLoader(draco);
} catch (e) {}
try {
  const ktx2 = new KTX2Loader();
  ktx2.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/');
  ktx2.detectSupport(renderer);
  loader.setKTX2Loader(ktx2);
} catch (e) {}

// =============================================================
// 进度 UI
// =============================================================
const rowsEl = document.getElementById('rows');
const rowRefs = BUDDHAS.map(cfg => {
  const row = document.createElement('div');
  row.className = 'row';
  const nameEnSingle = cfg.nameEn.replace(/<br>/g, ' ');
  row.innerHTML = `
    <div class="name"><div class="en">${nameEnSingle}</div><div class="zh">${cfg.name}</div></div>
    <div class="bar"><div class="fill"></div></div>
    <div class="stat"><span class="en">WAITING</span><span class="zh">等待</span></div>
  `;
  rowsEl.appendChild(row);
  return {
    row,
    fill: row.querySelector('.fill'),
    statEn: row.querySelector('.stat .en'),
    statZh: row.querySelector('.stat .zh')
  };
});
function setRowProgress(i, pct) {
  rowRefs[i].fill.style.width = (pct * 100).toFixed(0) + '%';
  if (pct < 1) {
    const p = (pct * 100).toFixed(0);
    rowRefs[i].statEn.textContent = 'DL ' + p + '%';
    rowRefs[i].statZh.textContent = '下载 ' + p + '%';
  }
}
function setRowStatus(i, en, zh, cls = '') {
  rowRefs[i].statEn.textContent = en;
  rowRefs[i].statZh.textContent = zh;
  rowRefs[i].row.className = 'row ' + cls;
}
function hideLoader() { document.getElementById('loader').classList.add('hide'); }

// =============================================================
// 纹理采样
// =============================================================
function getImageDataFromTexture(texture) {
  if (!texture || !texture.image) return null;
  const img = texture.image;
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  if (!w || !h) return null;
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
  } catch (e) { return null; }
}
function sampleColorFromImageData(uv, imageData) {
  if (!imageData) return null;
  const { data, width, height } = imageData;
  let x = Math.floor(uv.x * width);
  let y = Math.floor((1 - uv.y) * height);
  if (x < 0) x = 0; else if (x >= width) x = width - 1;
  if (y < 0) y = 0; else if (y >= height) y = height - 1;
  const idx = (y * width + x) * 4;
  let r = data[idx] / 255, g = data[idx + 1] / 255, b = data[idx + 2] / 255;
  const lum = r * 0.299 + g * 0.587 + b * 0.114;
  if (lum < 0.35) {
    const boost = 0.35 / Math.max(lum, 0.02);
    r = Math.min(r * boost, 1.0); g = Math.min(g * boost, 1.0); b = Math.min(b * boost, 1.0);
  }
  const gray = (r + g + b) / 3;
  r = Math.min(gray + (r - gray) * 1.25, 1.0);
  g = Math.min(gray + (g - gray) * 1.25, 1.0);
  b = Math.min(gray + (b - gray) * 1.25, 1.0);
  return [r, g, b];
}

// =============================================================
// 模型处理
// =============================================================
function processModel(model, count, fallbackColor) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = NORMALIZED_SIZE / maxDim;

  logInfo(`[${fallbackColor.toString(16)}] scale ${scale.toFixed(4)} particles ${count}`);

  const meshes = [];
  model.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position) meshes.push(o); });
  logInfo(`found ${meshes.length} meshes`);

  const fallR = ((fallbackColor >> 16) & 0xff) / 255;
  const fallG = ((fallbackColor >> 8) & 0xff) / 255;
  const fallB = (fallbackColor & 0xff) / 255;

  const allTris = [];
  const meshInfoList = [];
  let totalArea = 0;

  for (let mi = 0; mi < meshes.length; mi++) {
    const mesh = meshes[mi];
    const geom = mesh.geometry;
    const posAttr = geom.attributes.position;
    const uvAttr = geom.attributes.uv;
    const idxAttr = geom.index;
    let triIndices;
    if (idxAttr) triIndices = idxAttr.array;
    else {
      triIndices = new Uint32Array(posAttr.count);
      for (let i = 0; i < posAttr.count; i++) triIndices[i] = i;
    }
    const triCount = Math.floor(triIndices.length / 3);
    const worldMat = mesh.matrixWorld.clone();
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), cr = new THREE.Vector3();
    let meshArea = 0;
    const startIdx = allTris.length;
    for (let t = 0; t < triCount; t++) {
      const i0 = triIndices[t*3], i1 = triIndices[t*3+1], i2 = triIndices[t*3+2];
      vA.fromBufferAttribute(posAttr, i0).applyMatrix4(worldMat);
      vB.fromBufferAttribute(posAttr, i1).applyMatrix4(worldMat);
      vC.fromBufferAttribute(posAttr, i2).applyMatrix4(worldMat);
      e1.subVectors(vB, vA); e2.subVectors(vC, vA);
      cr.crossVectors(e1, e2);
      const a = cr.length() * 0.5;
      if (a < 1e-10) continue;
      meshArea += a;
      let uvA = null, uvB = null, uvC = null;
      if (uvAttr) {
        uvA = [uvAttr.getX(i0), uvAttr.getY(i0)];
        uvB = [uvAttr.getX(i1), uvAttr.getY(i1)];
        uvC = [uvAttr.getX(i2), uvAttr.getY(i2)];
      }
      allTris.push({ A: vA.clone(), B: vB.clone(), C: vC.clone(), uvA, uvB, uvC, area: a, meshIdx: mi });
    }
    const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    let imageData = null;
    if (srcMat && srcMat.map) imageData = getImageDataFromTexture(srcMat.map);
    meshInfoList.push({ meshIdx: mi, start: startIdx, count: allTris.length - startIdx, area: meshArea, imageData });
    totalArea += meshArea;
  }
  if (totalArea === 0) throw new Error('total mesh area is 0');
  const totalTriCount = allTris.length;

  const exponent = DETAIL.areaExponent;
  const triWeights = new Float64Array(totalTriCount);
  let totalWeight = 0;
  for (let i = 0; i < totalTriCount; i++) {
    const w = Math.pow(allTris[i].area, exponent);
    triWeights[i] = w;
    totalWeight += w;
  }
  const minPerTri = 1;
  const reservedParticles = totalTriCount * minPerTri;
  const remainingParticles = Math.max(0, count - reservedParticles);
  const triAssign = new Int32Array(totalTriCount);
  for (let i = 0; i < totalTriCount; i++) triAssign[i] = minPerTri;
  if (remainingParticles > 0) {
    const rawShares = new Float64Array(totalTriCount);
    for (let i = 0; i < totalTriCount; i++) {
      rawShares[i] = (triWeights[i] / totalWeight) * remainingParticles;
    }
    let assigned = 0;
    const fractional = [];
    for (let i = 0; i < totalTriCount; i++) {
      const intPart = Math.floor(rawShares[i]);
      triAssign[i] += intPart;
      assigned += intPart;
      fractional.push({ idx: i, frac: rawShares[i] - intPart });
    }
    let remaining = remainingParticles - assigned;
    if (remaining > 0) {
      fractional.sort((a, b) => b.frac - a.frac);
      for (let k = 0; k < remaining && k < fractional.length; k++) {
        triAssign[fractional[k].idx] += 1;
      }
    }
  }

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const particleUvs = new Float32Array(count * 2);
  const particleHalo = new Float32Array(count * 3);
  let pIdx = 0;

  function computeHaloPos(px, py, pz, out, oi) {
    out[oi]   = px * RENDER_PARAMS.haloXY;
    out[oi+1] = py * RENDER_PARAMS.haloXY;
    out[oi+2] = pz * RENDER_PARAMS.haloZ - RENDER_PARAMS.haloBack;
  }

  for (let ti = 0; ti < totalTriCount; ti++) {
    const tri = allTris[ti];
    const assignCount = triAssign[ti];
    const info = meshInfoList[tri.meshIdx];
    for (let p = 0; p < assignCount && pIdx < count; p++) {
      const r1 = Math.random(), r2 = Math.random();
      const s = Math.sqrt(r1);
      const w0 = 1 - s, w1 = s * (1 - r2), w2 = s * r2;
      positions[pIdx*3]   = (tri.A.x * w0 + tri.B.x * w1 + tri.C.x * w2 - center.x) * scale;
      positions[pIdx*3+1] = (tri.A.y * w0 + tri.B.y * w1 + tri.C.y * w2 - center.y) * scale;
      positions[pIdx*3+2] = (tri.A.z * w0 + tri.B.z * w1 + tri.C.z * w2 - center.z) * scale;
      computeHaloPos(positions[pIdx*3], positions[pIdx*3+1], positions[pIdx*3+2], particleHalo, pIdx*3);

      let cr = fallR, cg = fallG, cb = fallB;
      let uvX = 0, uvY = 0;
      if (info.imageData && tri.uvA) {
        uvX = tri.uvA[0] * w0 + tri.uvB[0] * w1 + tri.uvC[0] * w2;
        uvY = tri.uvA[1] * w0 + tri.uvB[1] * w1 + tri.uvC[1] * w2;
        const sampled = sampleColorFromImageData({ x: uvX, y: uvY }, info.imageData);
        if (sampled) { cr = sampled[0]; cg = sampled[1]; cb = sampled[2]; }
      } else if (tri.uvA) {
        uvX = tri.uvA[0] * w0 + tri.uvB[0] * w1 + tri.uvC[0] * w2;
        uvY = tri.uvA[1] * w0 + tri.uvB[1] * w1 + tri.uvC[1] * w2;
      }
      particleUvs[pIdx*2]   = uvX;
      particleUvs[pIdx*2+1] = uvY;
      const jit = (Math.random() - 0.5) * 0.08;
      colors[pIdx*3]   = Math.max(0, Math.min(1, cr + jit));
      colors[pIdx*3+1] = Math.max(0, Math.min(1, cg + jit));
      colors[pIdx*3+2] = Math.max(0, Math.min(1, cb + jit));
      pIdx++;
    }
  }
  while (pIdx < count) {
    const ti = Math.floor(Math.random() * totalTriCount);
    const tri = allTris[ti];
    const r1 = Math.random(), r2 = Math.random();
    const s = Math.sqrt(r1);
    const w0 = 1 - s, w1 = s * (1 - r2), w2 = s * r2;
    positions[pIdx*3]   = (tri.A.x * w0 + tri.B.x * w1 + tri.C.x * w2 - center.x) * scale;
    positions[pIdx*3+1] = (tri.A.y * w0 + tri.B.y * w1 + tri.C.y * w2 - center.y) * scale;
    positions[pIdx*3+2] = (tri.A.z * w0 + tri.B.z * w1 + tri.C.z * w2 - center.z) * scale;
    computeHaloPos(positions[pIdx*3], positions[pIdx*3+1], positions[pIdx*3+2], particleHalo, pIdx*3);
    let uvX = 0, uvY = 0;
    if (tri.uvA) {
      uvX = tri.uvA[0] * w0 + tri.uvB[0] * w1 + tri.uvC[0] * w2;
      uvY = tri.uvA[1] * w0 + tri.uvB[1] * w1 + tri.uvC[1] * w2;
    }
    particleUvs[pIdx*2]   = uvX;
    particleUvs[pIdx*2+1] = uvY;
    colors[pIdx*3] = fallR; colors[pIdx*3+1] = fallG; colors[pIdx*3+2] = fallB;
    pIdx++;
  }

  logOK(`sampling done: ${pIdx} particles`);

  const wipeMaskCanvas = document.createElement('canvas');
  wipeMaskCanvas.width = wipeMaskCanvas.height = WIPE_MASK_SIZE;
  const wipeMaskCtx = wipeMaskCanvas.getContext('2d', { willReadFrequently: true });
  wipeMaskCtx.fillStyle = '#000';
  wipeMaskCtx.fillRect(0, 0, WIPE_MASK_SIZE, WIPE_MASK_SIZE);
  const wipeMaskTexture = new THREE.CanvasTexture(wipeMaskCanvas);
  wipeMaskTexture.minFilter = THREE.LinearFilter;
  wipeMaskTexture.magFilter = THREE.LinearFilter;
  wipeMaskTexture.generateMipmaps = false;
  wipeMaskTexture.wrapS = THREE.ClampToEdgeWrapping;
  wipeMaskTexture.wrapT = THREE.ClampToEdgeWrapping;

  const clonedScene = model.clone();
  const solidInner = new THREE.Group();
  solidInner.add(clonedScene);
  solidInner.scale.setScalar(scale);
  solidInner.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  const solidWrapper = new THREE.Group();
  solidWrapper.add(solidInner);
  solidWrapper.visible = true;
  solidWrapper.position.y = modelYOffset;   // ★ 继承用户调过的上下偏移
  scene.add(solidWrapper);

  clonedScene.traverse(child => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      child.material.transparent = RENDER_PARAMS.transparent;
      child.material.alphaTest = RENDER_PARAMS.alphaTest;
      child.material.depthWrite = RENDER_PARAMS.depthWrite;
      child.material.depthTest = true;
      child.material.envMapIntensity = 1.5;
      child.material.side = THREE[RENDER_PARAMS.side];
      child.renderOrder = RENDER_PARAMS.renderOrder;

      child.material.onBeforeCompile = (shader) => {
        shader.uniforms.uMousePos = { value: new THREE.Vector3(9999, 9999, 9999) };
        shader.uniforms.uTextureBrightness = { value: RENDER_PARAMS.brightness };
        shader.uniforms.uLeakRadius = { value: 0.0 };
        shader.uniforms.uStateBlend = { value: 0.0 };
        shader.uniforms.uTransitionAlpha = { value: 1.0 };
        shader.uniforms.uBrighten = { value: RENDER_PARAMS.reveal };
        shader.uniforms.uAlphaStart = { value: ENTITY_ALPHA_START };
        shader.uniforms.uAlphaEnd = { value: ENTITY_ALPHA_END };
        shader.uniforms.uBrightPow = { value: BRIGHTNESS_FALLOFF_POW };
        shader.uniforms.uWipeMask = { value: wipeMaskTexture };
        shader.uniforms.uSoftLow = { value: RENDER_PARAMS.softLow };
        shader.uniforms.uSoftHigh = { value: RENDER_PARAMS.softHigh };

        child.material.userData.shader = shader;
        solidShaders.push(shader);
        solidMaterials.push(child.material);

        shader.vertexShader = `
          varying vec3 vWorldPos_custom;
          varying vec2 vWipeUv;
          ${shader.vertexShader}
        `.replace(
          `#include <worldpos_vertex>`,
          `#include <worldpos_vertex>
           vWorldPos_custom = (modelMatrix * vec4(transformed, 1.0)).xyz;
           vWipeUv = uv;
          `
        );

        shader.fragmentShader = `
          uniform vec3 uMousePos; uniform float uLeakRadius;
          uniform float uStateBlend; uniform float uTransitionAlpha;
          uniform float uBrighten; uniform float uAlphaStart;
          uniform float uAlphaEnd; uniform float uBrightPow;
          uniform float uTextureBrightness;
          uniform float uSoftLow; uniform float uSoftHigh;
          uniform sampler2D uWipeMask;
          varying vec3 vWorldPos_custom;
          varying vec2 vWipeUv;
          ${shader.fragmentShader}
        `.replace(
          `#include <dithering_fragment>`,
          `#include <dithering_fragment>
           // ★ 关键修复：丢弃所有背向相机的面，杜绝扫描模型内层几何导致的破面
           if (!gl_FrontFacing) discard;

           gl_FragColor.rgb *= uTextureBrightness;

           vec2 safeUv = clamp(vWipeUv, vec2(0.001), vec2(0.999));
           float wipeMaskValue = texture2D(uWipeMask, safeUv).r;

           float instantReveal = 0.0;
           float instantBright = 0.0;
           if (uLeakRadius > 0.001) {
             float dist = length(vWorldPos_custom - uMousePos);
             float tt = dist / uLeakRadius;
             instantReveal = 1.0 - smoothstep(uAlphaStart, uAlphaEnd, tt);
             float falloff = max(0.0, 1.0 - tt / uAlphaEnd);
             instantBright = pow(falloff, uBrightPow);
           }

           float localReveal = max(wipeMaskValue, instantReveal);
           float localBright = max(wipeMaskValue, instantBright);
           vec3 baseCol = gl_FragColor.rgb;
           float brightenFactor = 1.0 + uBrighten * localBright;
           vec3 brightenCol = baseCol * brightenFactor;
           brightenCol += vec3(0.10, 0.06, 0.02) * localBright * (uBrighten / 1.3);
           gl_FragColor.rgb = mix(baseCol, brightenCol, localReveal);

           if (uTransitionAlpha < 0.01) discard;

           float solidModeAlpha = uStateBlend;
           float finalAlpha = max(localReveal, solidModeAlpha) * uTransitionAlpha;

           float sLow = min(uSoftLow, uSoftHigh);
           float sHigh = max(uSoftLow, uSoftHigh);

           if (sHigh - sLow < 0.001) {
             if (finalAlpha < sLow) discard;
             gl_FragColor.a = 1.0;
           } else {
             float alphaSoft = smoothstep(sLow, sHigh, finalAlpha);
             if (alphaSoft < 0.01) discard;
             gl_FragColor.a = alphaSoft;
           }
          `
        );
      };
    }
  });

  return {
    positions, colors, particleUvs, particleHalo,
    solidWrapper,
    wipeMaskCanvas, wipeMaskCtx, wipeMaskTexture,
    wipeProgress: 0, lastWipeCheckAt: 0,
    wipeMaskFilled: false
  };
}

// =============================================================
// 背景粒子 GPGPU
// =============================================================
let ambientGpuCompute = null;
let ambientPosVar = null;
let ambientVelVar = null;
let ambientMaterial = null;
let ambientPoints = null;

const AMBIENT_POS_FRAG = /* glsl */`
  precision highp float;
  uniform float uDelta;
  uniform vec3 uHalfBox;
  uniform vec3 uBoxSize;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);
    vec3 pos = posData.xyz + velData.xyz * uDelta;
    pos.x = mod(pos.x + uHalfBox.x, uBoxSize.x) - uHalfBox.x;
    pos.y = mod(pos.y + uHalfBox.y, uBoxSize.y) - uHalfBox.y;
    pos.z = mod(pos.z + uHalfBox.z, uBoxSize.z) - uHalfBox.z;
    gl_FragColor = vec4(pos, posData.w);
  }
`;

const AMBIENT_VEL_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uDelta;
  uniform vec3  uMousePos;
  uniform vec3  uMouseVel;
  uniform float uMouseActive;
  uniform float uMouseRadius;
  uniform float uSwirl;
  uniform float uDrag;
  uniform float uAttract;
  uniform float uDamping;
  uniform float uNoise;
  uniform float uMaxSpeed;
  uniform float uGlowDecay;
  uniform float uSpeedBoost;
  uniform vec3  uGoldCenter;
  uniform float uGoldAttract;
  uniform float uHaloBase;
  uniform float uHaloSpacing;
  uniform float uRelease;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);
    vec3 pos = posData.xyz;
    float seed = posData.w;
    vec3 vel = velData.xyz;
    float glow = velData.w;

    vec3 p = pos * 0.42 + seed * 20.0;
    float t = uTime * 0.35;
    vec3 noise = vec3(
      sin(p.x * 1.7 + t) * cos(p.y * 1.3 + t * 0.7),
      sin(p.y * 1.5 + t * 0.8) * cos(p.z * 1.1 + t * 1.1),
      sin(p.z * 1.9 + t * 0.6) * cos(p.x * 1.4 + t * 0.9)
    );
    vec3 noiseForce = noise * (uNoise + uRelease * 2.0);   // ★ 释放期柔和散开，不再狂暴乱跑

    vec3 mouseForce = vec3(0.0);
    float newGlow = glow;

    if (uMouseActive > 0.001) {
      vec3 delta = pos - uMousePos;
      float dist = length(delta);
      if (dist < uMouseRadius) {
        float falloff = 1.0 - dist / uMouseRadius;
        falloff = falloff * falloff;
        vec3 dir = normalize(delta + vec3(0.0001));
        vec3 tangent = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
        vec3 swirl = tangent * falloff * uSwirl;
        vec3 drag = uMouseVel * falloff * uDrag;
        vec3 attract = -dir * falloff * uAttract;
        float speedBoost = 1.0 + min(length(uMouseVel), 12.0) * uSpeedBoost;
        mouseForce = (swirl + drag + attract) * speedBoost * uMouseActive;
        float glowTarget = falloff * uMouseActive;
        newGlow = max(newGlow, glowTarget);
      }
    }

    // ★ 金身显现时，背景粒子向金身汇聚（引力 + 环绕 + 微光）
    vec3 goldForce = vec3(0.0);
    if (uGoldAttract > 0.001) {
      vec3 toGold = uGoldCenter - pos;
      float gDist = length(toGold) + 0.0001;
      vec3 gDir = toGold / gDist;
      float gPull = uGoldAttract * (1.0 - smoothstep(2.0, 9.0, gDist)) * smoothstep(0.4, 1.6, gDist);
      vec3 gTangent = normalize(cross(gDir, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
      goldForce = (gDir * gPull + gTangent * gPull * 0.45) * 6.0;
      // ★ 圈轮塑形：尘埃被拉到光轮平面，并吸附到最近的同心环带上
      vec3 hRel = pos - uGoldCenter;
      float pr = length(hRel.xy) + 0.0001;
      float bestR = uHaloBase;
      float bestD = abs(pr - uHaloBase);
      for (int i = 1; i < 4; i++) {
        float rr = uHaloBase + float(i) * uHaloSpacing;
        float dd = abs(pr - rr);
        if (dd < bestD) { bestD = dd; bestR = rr; }
      }
      vec3 ringTarget = uGoldCenter + vec3(hRel.xy / pr * bestR, 0.0);
      goldForce += (ringTarget - pos) * (uGoldAttract * 2.2);
      newGlow = max(newGlow, clamp(gPull * 0.9, 0.0, 1.0));
    }

    vel += (noiseForce + mouseForce + goldForce) * uDelta;
    vel *= pow(uDamping, uDelta * 60.0);
    float sp = length(vel);
    float maxSp = uMaxSpeed + uGoldAttract * 3.0;
    if (sp > maxSp) vel = vel / sp * maxSp;
    newGlow *= pow(uGlowDecay, uDelta * 60.0);
    newGlow = clamp(newGlow, 0.0, 1.0);

    gl_FragColor = vec4(vel, newGlow);
  }
`;

const AMBIENT_RENDER_VERT = /* glsl */`
  precision highp float;
  uniform sampler2D uTexturePosition;
  uniform sampler2D uTextureVelocity;
  uniform float uPixelRatio;
  uniform float uDustSize;
  attribute vec2 reference;
  attribute float aRandom;
  varying float vIntensity;

  void main() {
    vec3 pos = texture2D(uTexturePosition, reference).xyz;
    vec4 velData = texture2D(uTextureVelocity, reference);
    vec3 vel = velData.xyz;
    float glow = velData.w;
    float speed = length(vel);
    float speedIntensity = min(speed * 0.6, 1.0);
    vIntensity = max(speedIntensity, glow);
    float flicker = 0.85 + sin(glow * 20.0) * 0.15;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float baseSize = 0.55 + aRandom * 0.35;
    float glowMul = 1.0 + vIntensity * 3.5;
    gl_PointSize = baseSize * glowMul * uPixelRatio * (32.0 / max(-mv.z, 0.1)) * flicker * uDustSize;
  }
`;

const AMBIENT_RENDER_FRAG = /* glsl */`
  precision highp float;
  uniform vec3 uColorCold;
  uniform vec3 uColorMid;
  uniform vec3 uColorHot;
  uniform float uDustBright;
  varying float vIntensity;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.28, 0.0, d);
    float halo = smoothstep(0.5, 0.05, d);
    float shape = core * 0.7 + halo * 0.5;
    vec3 col;
    if (vIntensity < 0.5) {
      col = mix(uColorCold, uColorMid, vIntensity * 2.0);
    } else {
      col = mix(uColorMid, uColorHot, (vIntensity - 0.5) * 2.0);
    }
    col += col * core * 0.9;
    col *= uDustBright;
    float alpha = 0.12 + vIntensity * 0.88;
    alpha *= mix(0.7, 1.0, core);
    gl_FragColor = vec4(col, shape * alpha);
  }
`;

function createAmbientGPGPU() {
  ambientGpuCompute = new GPUComputationRenderer(AMBIENT_WIDTH, AMBIENT_WIDTH, renderer);
  if (renderer.capabilities.isWebGL2) ambientGpuCompute.setDataType(THREE.FloatType);

  const posTex = ambientGpuCompute.createTexture();
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    posTex.image.data[i*4]   = (Math.random() - 0.5) * AMBIENT_BOX.x;
    posTex.image.data[i*4+1] = (Math.random() - 0.5) * AMBIENT_BOX.y;
    posTex.image.data[i*4+2] = (Math.random() - 0.5) * AMBIENT_BOX.z;
    posTex.image.data[i*4+3] = Math.random();
  }

  const velTex = ambientGpuCompute.createTexture();
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    velTex.image.data[i*4]   = (Math.random() - 0.5) * 0.2;
    velTex.image.data[i*4+1] = (Math.random() - 0.5) * 0.2;
    velTex.image.data[i*4+2] = (Math.random() - 0.5) * 0.2;
    velTex.image.data[i*4+3] = 0;
  }

  ambientPosVar = ambientGpuCompute.addVariable('texturePosition', AMBIENT_POS_FRAG, posTex);
  ambientVelVar = ambientGpuCompute.addVariable('textureVelocity', AMBIENT_VEL_FRAG, velTex);

  ambientGpuCompute.setVariableDependencies(ambientPosVar, [ambientPosVar, ambientVelVar]);
  ambientGpuCompute.setVariableDependencies(ambientVelVar, [ambientPosVar, ambientVelVar]);

  ambientPosVar.material.uniforms.uDelta   = { value: 0.016 };
  ambientPosVar.material.uniforms.uHalfBox = { value: AMBIENT_BOX.clone().multiplyScalar(0.5) };
  ambientPosVar.material.uniforms.uBoxSize = { value: AMBIENT_BOX.clone() };

  ambientVelVar.material.uniforms = {
    uTime:          { value: 0 },
    uDelta:         { value: 0.016 },
    uMousePos:      { value: new THREE.Vector3() },
    uMouseVel:      { value: new THREE.Vector3() },
    uMouseActive:   { value: 0 },
    uMouseRadius:   { value: AMBIENT_FORCE.radius },
    uSwirl:         { value: AMBIENT_FORCE.swirl },
    uDrag:          { value: AMBIENT_FORCE.drag },
    uAttract:       { value: AMBIENT_FORCE.attract },
    uDamping:       { value: AMBIENT_FORCE.damping },
    uNoise:         { value: AMBIENT_FORCE.noise },
    uMaxSpeed:      { value: AMBIENT_FORCE.maxSpeed },
    uGlowDecay:     { value: AMBIENT_FORCE.glowDecay },
    uSpeedBoost:    { value: AMBIENT_FORCE.speedBoost },
    uGoldCenter:    { value: new THREE.Vector3(0, 0.4, -6) },
    uGoldAttract:   { value: 0 },
    uRelease:       { value: 0 },   // ★ 汇聚脉冲结束后的释放（噪声增强，让尘埃散开、鼠标可接管）
    uHaloBase:      { value: 1.0 },
    uHaloSpacing:   { value: 0.3 }
  };

  const err = ambientGpuCompute.init();
  if (err) throw new Error(err);

  const geo = new THREE.BufferGeometry();
  const refs = new Float32Array(AMBIENT_COUNT * 2);
  const randoms = new Float32Array(AMBIENT_COUNT);
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    refs[i*2]   = (i % AMBIENT_WIDTH) / AMBIENT_WIDTH;
    refs[i*2+1] = Math.floor(i / AMBIENT_WIDTH) / AMBIENT_WIDTH;
    randoms[i]  = Math.random();
  }
  geo.setAttribute('reference', new THREE.BufferAttribute(refs, 2));
  geo.setAttribute('aRandom',   new THREE.BufferAttribute(randoms, 1));
  geo.setAttribute('position',  new THREE.BufferAttribute(new Float32Array(AMBIENT_COUNT * 3), 3));

  ambientMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexturePosition: { value: null },
      uTextureVelocity: { value: null },
      uPixelRatio:      { value: PIXEL_RATIO },
      uColorCold:       { value: new THREE.Color(0.55, 0.62, 0.78) },
      uColorMid:        { value: new THREE.Color(1.0, 0.82, 0.45) },
      uColorHot:        { value: new THREE.Color(1.0, 0.98, 0.85) },
      uDustBright:      { value: 0.5 },
      uDustSize:        { value: 0.5 }
    },
    vertexShader:   AMBIENT_RENDER_VERT,
    fragmentShader: AMBIENT_RENDER_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  ambientPoints = new THREE.Points(geo, ambientMaterial);
  ambientPoints.frustumCulled = false;
  ambientPoints.renderOrder = 1;
  scene.add(ambientPoints);

  logOK(`ambient GPGPU particles created: ${AMBIENT_COUNT}`);
}

function updateAmbientGPGPU(dt, t, mouseWorldPos, mouseWorldVel, mouseActive, overrides) {
  if (!ambientGpuCompute) return;
  ambientPosVar.material.uniforms.uDelta.value = dt;
  const vu = ambientVelVar.material.uniforms;
  vu.uDelta.value = dt;
  vu.uTime.value = t;
  vu.uMousePos.value.copy(mouseWorldPos);
  vu.uMouseVel.value.copy(mouseWorldVel);
  vu.uMouseActive.value = mouseActive;
  // ★ 金身显现时背景粒子向金身汇聚（一次性脉冲；汇聚完成后自动关闭，鼠标重新主导尘埃）
  //   引力中心 = 贴图模型头顶背面的光轮中心（归一化单位），尘埃在光轮平面塑形成同心圈轮
  vu.uGoldAttract.value = goldAttract;
  // ★ 释放：脉冲结束后的数秒内噪声增强，尘埃散开、鼠标可接管
  vu.uRelease.value = (dustReleaseT > 0) ? Math.exp(-Math.max(0, t - dustReleaseT) / 1.5) : 0;
  vu.uGoldCenter.value.set(0, haloLocalY + modelYOffset, -0.6);
  vu.uHaloBase.value = HALO_R0;
  vu.uHaloSpacing.value = HALO_DR;
  if (overrides) {
    if (overrides.radius  !== undefined) vu.uMouseRadius.value = overrides.radius;
    if (overrides.swirl   !== undefined) vu.uSwirl.value = overrides.swirl;
    if (overrides.drag    !== undefined) vu.uDrag.value = overrides.drag;
    if (overrides.attract !== undefined) vu.uAttract.value = overrides.attract;
    if (overrides.damping !== undefined) vu.uDamping.value = overrides.damping;
  }
  ambientGpuCompute.compute();
  ambientMaterial.uniforms.uTexturePosition.value =
    ambientGpuCompute.getCurrentRenderTarget(ambientPosVar).texture;
  ambientMaterial.uniforms.uTextureVelocity.value =
    ambientGpuCompute.getCurrentRenderTarget(ambientVelVar).texture;
}

// =============================================================
// 模型粒子 GPGPU 着色器
// =============================================================
const POSITION_FRAG = /* glsl */`
  precision highp float;
  uniform float uDelta;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    gl_FragColor = vec4(
      texture2D(texturePosition, uv).xyz + texture2D(textureVelocity, uv).xyz * uDelta,
      1.0
    );
  }
`;

const VELOCITY_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime; uniform float uDelta;
  uniform float uGather; uniform float uExplosion;
  uniform vec3 uMousePos; uniform vec3 uMouseVel;
  uniform float uMouseActive; uniform float uLeakRadius; uniform float uGlowRadius;
  uniform float uRise;
  uniform sampler2D uTargetA; uniform sampler2D uTargetB;
  uniform float uTransition; uniform sampler2D uTextureTrail;

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yxx) * p3.zyx);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos = texture2D(texturePosition, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;
    vec3 target = mix(texture2D(uTargetA, uv).xyz, texture2D(uTargetB, uv).xyz, uTransition);
    float trail = texture2D(uTextureTrail, uv).r;
    float distToMouse = length(pos - uMousePos);
    float pushRadius = max(uLeakRadius, 0.55);
    float leakFactor = 1.0 - smoothstep(0.0, pushRadius, distToMouse);
    leakFactor *= uMouseActive;
    float structureStrength = uGather * (1.0 - uExplosion) * (1.0 - leakFactor);
    vec3 toTarget = target - pos;
    vec3 springForce = toTarget * 28.0 * structureStrength;
    vec3 orbitDir = normalize(cross(pos, vec3(0.0, 1.0, 0.0)) + vec3(0.001));
    vec3 orbitForce = orbitDir * 25.0 * (1.0 - uGather);
    vec3 explodeForce = vec3(0.0);
    if (uExplosion > 0.0) {
      vec3 randDir = hash33(pos * 10.0) * 2.0 - 1.0;
      explodeForce = normalize(pos + randDir) * 75.0 * uExplosion / (length(pos) + 0.1);
    }
    vec3 sparkForce = vec3(0.0);
    if (leakFactor > 0.001) {
      vec3 randDir = hash33(pos * 5.0) * 2.0 - 1.0;
      vec3 outwardDir = normalize(pos - uMousePos + randDir * 0.5);
      float strength = leakFactor;
      sparkForce = outwardDir * 160.0 * strength + vec3(0.0, 10.0, 0.0) * strength + uMouseVel * 1.8 * strength;
    }
    float freeFactor = 1.0 - structureStrength;
    vec3 gravity = vec3(0.0, -8.0, 0.0) * freeFactor;
    // ★ 法相"上升"动效：粒子按各自相位向上涌动，弹簧力将其拉回，形成火焰升腾感
    float risePhase = fract(hash33(pos * 3.1).x + uTime * 0.13) * 6.2831;
    vec3 riseForce = vec3(0.0, 1.0, 0.0) * uRise * (0.55 + 0.45 * sin(risePhase));
    vel += (springForce + orbitForce + explodeForce + sparkForce + gravity + riseForce) * uDelta;
    vel *= mix(0.98, 0.72, structureStrength);
    if (length(vel) > 60.0) vel = normalize(vel) * 60.0;
    gl_FragColor = vec4(vel, 1.0);
  }
`;

const TRAIL_FRAG = /* glsl */`
  precision highp float;
  uniform float uDelta;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    float trail = texture2D(textureTrail, uv).r * pow(0.85, uDelta * 60.0);
    float speed = length(texture2D(textureVelocity, uv).xyz);
    float speedTrail = smoothstep(1.5, 12.0, speed) * uDelta * 3.0;
    gl_FragColor = vec4(clamp(trail + speedTrail, 0.0, 1.2), 0.0, 0.0, 1.0);
  }
`;

const PARTICLE_VERT = /* glsl */`
  precision highp float;
  uniform sampler2D uTexturePosition; uniform sampler2D uTextureVelocity;
  uniform sampler2D uTextureTrail;
  uniform sampler2D uWipeMask;
  uniform float uPixelRatio; uniform float uRefDist;
  uniform vec3 uMouseLocal; uniform float uMouseActive; uniform float uGoldRadius;
  uniform float uPhase2Active;
  uniform float uGoldPhase;
  uniform float uGoldSizeMul;
  uniform float uTime;
  uniform float uMotionKind;
  uniform float uDensityMul;
  uniform float uSoftLow;
  uniform float uSoftHigh;
  attribute vec2 reference; attribute float aRandom;
  attribute vec3 aColor; attribute vec3 aHomePos;
  attribute vec2 aUv;
  attribute vec3 aHaloPos;
  varying float vSpeed; varying float vTrail; varying float vRandom;
  varying float vGold; varying vec3 vColor;
  varying float vWipeAmount;
  varying float vPhase2;
  varying float vKeep;
  varying float vGoldPhase;

  void main() {
    vec3 gpuPos = texture2D(uTexturePosition, reference).xyz;
    vec3 vel = texture2D(uTextureVelocity, reference).xyz;
    float trail = texture2D(uTextureTrail, reference).r;
    float speed = length(vel);
    vSpeed = speed; vTrail = trail; vRandom = aRandom; vColor = aColor;
    vPhase2 = uPhase2Active;
    vGoldPhase = uGoldPhase;

    vec2 safeUv = clamp(aUv, vec2(0.001), vec2(0.999));
    float wipeVal = texture2D(uWipeMask, safeUv).r * uPhase2Active;
    vWipeAmount = wipeVal;

    float t = smoothstep(0.10, 0.75, wipeVal) * (1.0 - uPhase2Active);

    vec3 finalPos = mix(gpuPos, aHaloPos, t);

    // ★ 金身粒子动效：单体/群体级别（非整个金身），随金身显现强度生效
    // uMotionKind: 0静止 1涟漪 2萤火虫 3星尘 4脉冲 5涌动(走速度场uRise) 6闪烁(走片元亮度)
    float mPh = vGoldPhase;
    if (mPh > 0.001) {
      float mk = uMotionKind;
      if (mk > 0.5 && mk < 1.5) {
        // 涟漪：一列波浪自下而上传过金身
        finalPos.y += sin(finalPos.y * 3.5 - uTime * 2.2) * 0.06 * mPh;
        finalPos.x += sin(finalPos.y * 2.0 - uTime * 1.7 + 1.3) * 0.035 * mPh;
      } else if (mk > 1.5 && mk < 2.5) {
        // 萤火虫：约 18% 粒子脱离本体、在背景中游荡（与背景互动）
        float sel = step(vRandom, 0.18);
        float t1 = uTime * 0.55 + vRandom * 39.0;
        vec3 drift = vec3(sin(t1 * 1.1), sin(t1 * 0.9 + 2.0) * 0.6, cos(t1 * 1.3)) * (0.6 + 0.9 * vRandom);
        finalPos += drift * sel * mPh;
      } else if (mk > 2.5 && mk < 3.5) {
        // 星尘：约 30% 粒子缓缓沉降又升腾
        float sel = step(0.7, vRandom);
        float bob = sin(uTime * (0.25 + vRandom * 0.35) + vRandom * 40.0);
        finalPos.y -= (0.5 + 0.5 * bob) * 0.55 * sel * mPh;
        finalPos.x += sin(uTime * 0.5 + vRandom * 20.0) * 0.06 * sel * mPh;
      } else if (mk > 3.5 && mk < 4.5) {
        // 脉冲：同心波自中心向外扩散
        vec3 pc = finalPos - vec3(0.0, 0.6, 0.0);
        float pd = length(pc) + 0.001;
        float w = sin(pd * 4.5 - uTime * 3.5);
        finalPos += (pc / pd) * w * 0.09 * mPh;
      }
    }

    float dGold = distance(aHomePos, uMouseLocal);
    float goldT = 1.0 - smoothstep(0.0, uGoldRadius, dGold);
    goldT = goldT * goldT;
    vGold = max(goldT * uMouseActive, t) * (1.0 - uPhase2Active);

    float sLow = min(uSoftLow, uSoftHigh);
    float sHigh = max(uSoftLow, uSoftHigh);
    if (sHigh - sLow < 0.001) {
      vKeep = (wipeVal < sLow) ? 1.0 : 0.0;
    } else {
      vKeep = 1.0 - smoothstep(sLow, sHigh, wipeVal);
    }

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float depthScale = clamp(uRefDist / max(-mvPosition.z, 0.1), 0.4, 2.5);
    float sizeMul = mix(1.0, 1.8, t);
    float baseSize = (0.9 + trail * 1.4 + vGold * 2.0) * (1.0 / (1.0 + speed * 0.03)) * sizeMul * (1.0 + uGoldPhase * 0.5) * mix(1.0, uGoldSizeMul, uGoldPhase);
    gl_PointSize = clamp(baseSize * uPixelRatio * uDensityMul * depthScale * (13.0 / max(-mvPosition.z, 0.1)), 0.4, 20.0);
  }
`;

const PARTICLE_FRAG = /* glsl */`
  precision highp float;
  uniform float uGoldGlow;
  uniform float uGoldBright;
  uniform vec3 uGoldColor;
  uniform float uTime;
  uniform float uMotionKind;
  uniform float uColorMode;
  varying float vSpeed; varying float vTrail; varying float vRandom;
  varying float vGold; varying vec3 vColor;
  varying float vWipeAmount;
  varying float vPhase2;
  varying float vKeep;
  varying float vGoldPhase;
  vec3 hsv2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
  }
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.32, 0.0, d);
    float halo = smoothstep(0.5, 0.1, d);
    float shape = core + halo * mix(0.35, 0.15, vGoldPhase);   // ★ 金身阶段点更锐利

    vec3 baseCol = vColor * 1.35;
    vec3 goldCol = vec3(1.0, 0.72, 0.15);
    vec3 col = mix(baseCol, goldCol, vGold);
    col += goldCol * vGold * 0.7;
    float spark = step(0.95, vRandom);
    col += spark * vGold * vec3(1.0, 0.8, 0.4);
    col += vec3(1.0, 0.85, 0.5) * vTrail * vGold * 1.4;
    col += col * core * 0.4;
    // ★ 法相金身：阶段三后期粒子重绘（颜色模式/单体动效由调试面板控制）
    // uColorMode: 0金色 1贴图色 2随机 3杂色 4霓彩
    vec3 dharmaGold;
    float cmode = uColorMode;
    if (cmode < 0.5) {
      dharmaGold = uGoldColor * 1.75;                                        // 金色（提亮）
    } else if (cmode < 1.5) {
      dharmaGold = baseCol;                                                 // 贴图色：保留原色
    } else if (cmode < 2.5) {
      dharmaGold = hsv2rgb(vec3(vRandom, 0.72, 1.0)) * 1.35;               // 随机
    } else if (cmode < 3.5) {                                               // 杂色：斑斓矿物
      float nz = fract(vRandom * 7.13);
      vec3 varicol = mix(vec3(1.0, 0.42, 0.62), vec3(0.32, 0.72, 1.0), smoothstep(0.30, 0.65, nz));
      varicol = mix(varicol, vec3(1.0, 0.78, 0.32), smoothstep(0.65, 0.95, fract(vRandom * 3.7)));
      dharmaGold = varicol * 1.3;
    } else {                                                                // 霓彩流光
      dharmaGold = hsv2rgb(vec3(fract(vRandom + uTime * 0.045), 0.7, 1.0)) * 1.35;
    }
    // ★ 法相金身：贴图色目标享受与阶段一相同的核心增亮，并整体提亮 1.2 倍，
    //   保证至少跟阶段一粒子一样亮、一样清晰（之前 mix 直接丢掉了 core 增亮，所以暗淡）
    vec3 dharmaTarget = dharmaGold * uGoldGlow;
    dharmaTarget += dharmaTarget * core * 0.4;
    dharmaTarget *= uGoldBright;
    // ★ 贴图色保护：亮度再高也只按比例压缩，色相（RGB 比例）始终不变，不冲成死白
    float dhMax = max(dharmaTarget.r, max(dharmaTarget.g, dharmaTarget.b));
    if (dhMax > 1.0) dharmaTarget /= dhMax;
    col = mix(col, dharmaTarget, vGoldPhase);
    vec3 glowTint = mix(dharmaGold * 0.667, vec3(1.0), 0.35);
    col += glowTint * uGoldGlow * vGoldPhase * (0.5 + 0.4 * core + 0.2 * halo) * 0.5;
    if (uMotionKind > 5.5) {                                                // 闪烁：单体随机明灭
      float tw = 0.45 + 0.85 * (0.5 + 0.5 * sin(uTime * (2.5 + vRandom * 5.0) + vRandom * 43.0));
      col *= mix(1.0, tw, vGoldPhase);
    }

    float baseAlpha = 0.72 + min(vSpeed * 0.05, 0.22);
    float finalAlpha;

    if (vPhase2 > 0.5) {
      finalAlpha = baseAlpha * max(vKeep, vGoldPhase);
    } else {
      float alphaG = mix(baseAlpha, 1.0, vGold);
      float keep = 1.0 - smoothstep(0.0, 0.4, vWipeAmount * (1.0 - vGold));
      finalAlpha = alphaG * max(keep, vGold);
    }

    finalAlpha = clamp(finalAlpha, 0.0, 0.98);
    if (finalAlpha < 0.03) discard;
    gl_FragColor = vec4(col, shape * finalAlpha);
  }
`;

// =============================================================
// 模型 GPGPU 初始化
// =============================================================
let gpuCompute, positionVar, velocityVar, trailVar;
let particleMaterial, points, goldGroup;
let targetA, targetB;

let wipeTimeAccum = 0;

// ★ 法相金身状态：贴图显现后，粒子以金色 2 倍形态重绘
let goldPhase = 0;          // 0→1 金身显现进度
let goldPhaseDelay = 0;     // 显现前延迟（秒）
let goldAttract = 0;        // 背景尘埃汇聚引力（一次性脉冲：汇聚完成后自动关闭，鼠标重新主导尘埃）
let dustReleaseT = -1;      // ★ 汇聚脉冲结束时刻；之后数秒内噪声增强，释放尘埃
let goldConvergeT = -1;     // goldPhase 首次达到 1 的时刻
let haloPhase = 0;          // 粒子光轮显现进度（比金身慢，慢慢出像）
let haloLocalY = 1.98;      // 光轮中心高度（归一化单位 ≈ 真身头顶下方；按模型实际头顶校准）
let goldScale = 1;          // 粒子整体缩放 1→2
let goldHintShown = false;
// ★ 法相调试面板状态（大小 3.0 / 距离 -6.0 已定版，不再开放调节）
let goldSizeTarget = 3.0;    // 金身大小（定版）
let goldDistZ = -6.0;        // 金身距离（定版，负=贴图后方）
let goldMotion = 'firefly';   // 面板：单体/群体动效 still/ripple/firefly/stardust/pulse/surge/twinkle
const MOTION_KIND = { still: 0, ripple: 1, firefly: 2, stardust: 3, pulse: 4, surge: 5, twinkle: 6 };
const MOTION_LABEL = { still: '静止', ripple: '涟漪', firefly: '萤火虫', stardust: '星尘', pulse: '脉冲', surge: '涌动', twinkle: '闪烁' };
let goldColorMode = 1;       // 面板：颜色模式 0金色/1贴图色/2随机/3杂色/4霓彩
const COLOR_MODE_LABEL = ['金色', '贴图色', '随机', '杂色', '霓彩'];
function applyPointsScale() {
  if (points) points.scale.setScalar(RENDER_PARAMS.scale * RENDER_PARAMS.particleRatio * goldScale);
}
let lastWipeUv = null; // 上一帧擦拭命中 UV，用于帧间插值补画笔触

function makeDataTexture(data) {
  const tex = new THREE.DataTexture(data, WIDTH, WIDTH, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
function writeTargetTexture(tex, positions) {
  const data = tex.image.data;
  const n = positions.length / 3;
  for (let i = 0; i < n; i++) {
    data[i*4]   = positions[i*3];
    data[i*4+1] = positions[i*3+1];
    data[i*4+2] = positions[i*3+2];
    data[i*4+3] = 1;
  }
  tex.needsUpdate = true;
}

function initGPU(initialPositions, initialColors, initialUvs, initialHalo) {
  gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);
  if (renderer.capabilities.isWebGL2) gpuCompute.setDataType(THREE.FloatType);

  const pos0 = gpuCompute.createTexture();
  for (let i = 0; i < COUNT; i++) {
    const r = 20.0 + Math.random() * 40.0;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos0.image.data[i*4]   = r * Math.sin(ph) * Math.cos(th);
    pos0.image.data[i*4+1] = r * Math.cos(ph);
    pos0.image.data[i*4+2] = r * Math.sin(ph) * Math.sin(th);
    pos0.image.data[i*4+3] = 1;
  }
  const vel0 = gpuCompute.createTexture(); vel0.image.data.fill(0);
  const trail0 = gpuCompute.createTexture(); trail0.image.data.fill(0);

  targetA = makeDataTexture(new Float32Array(COUNT * 4));
  targetB = makeDataTexture(new Float32Array(COUNT * 4));
  writeTargetTexture(targetA, initialPositions);
  writeTargetTexture(targetB, initialPositions);

  positionVar = gpuCompute.addVariable('texturePosition', POSITION_FRAG, pos0);
  velocityVar = gpuCompute.addVariable('textureVelocity', VELOCITY_FRAG, vel0);
  trailVar = gpuCompute.addVariable('textureTrail', TRAIL_FRAG, trail0);

  gpuCompute.setVariableDependencies(positionVar, [positionVar, velocityVar]);
  gpuCompute.setVariableDependencies(velocityVar, [positionVar, velocityVar, trailVar]);
  gpuCompute.setVariableDependencies(trailVar, [positionVar, velocityVar, trailVar]);

  velocityVar.material.uniforms = {
    uTime: { value: 0 }, uDelta: { value: 0.016 },
    uGather: { value: FORCE.gather }, uExplosion: { value: 0 },
    uRise: { value: 0 },
    uMousePos: { value: new THREE.Vector3() },
    uMouseVel: { value: new THREE.Vector3() },
    uMouseActive: { value: 0 }, uLeakRadius: { value: 0 },
    uGlowRadius: { value: FORCE.glowRadius },
    uTargetA: { value: targetA }, uTargetB: { value: targetB },
    uTransition: { value: 1 }, uTextureTrail: { value: null }
  };
  positionVar.material.uniforms = { uDelta: { value: 0.016 } };
  trailVar.material.uniforms = { uDelta: { value: 0.016 } };

  const err = gpuCompute.init();
  if (err) throw new Error(err);

  const geometry = new THREE.BufferGeometry();
  const refs = new Float32Array(COUNT * 2);
  const randoms = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    refs[i*2] = (i % WIDTH) / WIDTH;
    refs[i*2+1] = Math.floor(i / WIDTH) / WIDTH;
    randoms[i] = Math.random();
  }
  geometry.setAttribute('reference', new THREE.BufferAttribute(refs, 2));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(initialColors.slice(), 3));
  geometry.setAttribute('aHomePos', new THREE.BufferAttribute(initialPositions.slice(), 3));
  geometry.setAttribute('aUv', new THREE.BufferAttribute(initialUvs.slice(), 2));
  geometry.setAttribute('aHaloPos', new THREE.BufferAttribute(initialHalo.slice(), 3));
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));

  const phase2Active = { value: 0 };

  particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexturePosition: { value: null }, uTextureVelocity: { value: null },
      uTextureTrail: { value: null }, uPixelRatio: { value: PIXEL_RATIO },
      uRefDist: { value: BASE_CAMERA_Z },
      uMouseLocal: { value: new THREE.Vector3(9999, 9999, 9999) },
      uMouseActive: { value: 0 }, uGoldRadius: { value: GOLD_RADIUS },
      uWipeMask: { value: null },
      uPhase2Active: phase2Active,
      uGoldPhase: { value: 0 },
      uGoldBright: { value: 3.50 },
      uGoldSizeMul: { value: 3.00 },
      uGoldGlow: { value: 1 },
      uGoldColor: { value: new THREE.Color(1.0, 0.76, 0.28) },
      uTime: { value: 0 },
      uMotionKind: { value: MOTION_KIND[goldMotion] ?? 2 },   // ★ 定版：萤火虫（2）；曾硬编码为 1（涟漪）导致水波晃动，已修复
      uColorMode: { value: 1 },
      uDensityMul: { value: RENDER_PARAMS.densityMul },
      uSoftLow: { value: RENDER_PARAMS.softLow },
      uSoftHigh: { value: RENDER_PARAMS.softHigh }
    },
    vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });

  points = new THREE.Points(geometry, particleMaterial);
  points.frustumCulled = false;
  points.renderOrder = 10;
  applyPointsScale();
  // 金身粒子包一层 group：拖拽旋转走 group，面板旋转/动效旋转走内层，互不打架
  goldGroup = new THREE.Group();
  goldGroup.name = 'goldGroup';
  scene.add(goldGroup);
  goldGroup.add(points);

  createHalo();  // ★ 粒子光轮（圈轮）：属于贴图模型，每帧转挂到当前 solidWrapper 下

  return { phase2Active };
}

// =============================================================
// ★ 粒子光轮（圈轮）：贴图模型（真身）头顶背面的同心金色光环
//   4 层圆环 + 中心柔光盘，粒子化；随金身显现慢慢出像（haloPhase）。
//   双群体：约 62% 粒子留守环上（圆环清晰）＋约 38% 从圆环向四面八方散射（无旋转），
//   散射粒子起点亮、飞散渐隐后回到环上；光盘柔光不散射。
//   挂在当前模型的 solidWrapper 下，与真身同旋转；位置用归一化单位（与真身一致）。
// =============================================================
const HALO_RINGS = 4;
const HALO_R0 = 1.04;         // 首环半径（归一化单位；用户要求放大到两倍）
const HALO_DR = 0.30;         // 环间距（×2）
const HALO_DISC_R = 0.90;     // 中心柔光盘半径（×2）
const HALO_PER_RING = 1000;
const HALO_DISC = 900;
let haloPoints = null, haloMaterial = null;

const HALO_VERT = /* glsl */`
  precision highp float;
  attribute float aSeed;
  attribute float aRing;
  uniform float uTime;
  uniform float uHaloPhase;
  uniform float uPixelRatio;
  uniform float uScatterSpeed;   // 散射周期速度（约几秒一轮）
  uniform float uScatterDist;    // 粒子向外飞散的最大距离
  varying float vBright;
  varying float vRing;
  void main() {
    float isDisc = step(3.5, aRing);
    // ★ 双群体：约 62% 粒子留守环上（圆环清晰）+ 约 38% 从圆环向四面八方散射（无旋转）
    float isScatterer = step(0.62, aSeed) * (1.0 - isDisc);   // 光盘不散射
    float ang = atan(position.y, position.x);
    float rr0 = length(position.xy);
    float cyc = fract(uTime * uScatterSpeed + aSeed * 3.7);    // 散射周期 0→1
    float nr = rr0 + cyc * uScatterDist * isScatterer;
    vec2 xy = vec2(cos(ang) * nr, sin(ang) * nr);
    float fadeS = smoothstep(0.0, 0.08, cyc) * (1.0 - cyc * 0.85);  // 首尾衔接无跳变
    float fade = mix(1.0, fadeS, isScatterer);                 // 留守粒子持续明亮
    // 径向呼吸
    float breathe = 1.0 + sin(uTime * 0.7 + aSeed * 6.2831 + aRing * 1.7) * 0.035 * (1.0 - isDisc * 0.5);
    xy *= breathe;
    // 单体闪烁 + 环向明暗起伏；散射粒子起点亮、飞散渐隐；留守粒子持续明亮
    float tw = 0.6 + 0.4 * sin(uTime * (1.2 + aSeed * 2.2) + aSeed * 43.0);
    float wave = 0.7 + 0.3 * sin(uTime * 1.1 - aRing * 1.3);
    vBright = tw * wave * (0.35 + 0.65 * fade) * uHaloPhase;
    vRing = aRing;
    vec4 mv = modelViewMatrix * vec4(xy, position.z, 1.0);
    gl_Position = projectionMatrix * mv;
    float baseSize = mix(3.4 + aRing * 0.6, 4.2, isDisc);
    gl_PointSize = baseSize * uPixelRatio * (14.0 / max(-mv.z, 0.1));
  }
`;

const HALO_FRAG = /* glsl */`
  precision highp float;
  uniform vec3 uHaloColor;
  varying float vBright;
  varying float vRing;
  void main() {
    if (vBright < 0.003) discard;
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 2.2);
    float isDisc = step(3.5, vRing);
    vec3 col = uHaloColor * (0.55 + 1.7 * glow) * vBright;
    float alpha = mix(0.28 + 0.72 * glow, 0.10 + 0.30 * glow, isDisc) * vBright;
    gl_FragColor = vec4(col, alpha);
  }
`;

// 按当前模型的实际头顶位置校准光轮中心（头部中心 ≈ 头顶 - 0.45）
function updateHaloHead() {
  if (!points) return;
  const attr = points.geometry.getAttribute('aHomePos');
  if (!attr) return;
  let maxY = -1e9;
  for (let i = 0; i < attr.count; i++) {
    const y = attr.getY(i);
    if (y > maxY) maxY = y;
  }
  haloLocalY = maxY - 0.40;
  if (haloPoints) haloPoints.position.set(0, haloLocalY, -0.6);  // 真身头顶背面（归一化单位）
}

function createHalo() {
  const total = HALO_RINGS * HALO_PER_RING + HALO_DISC;
  const pos = new Float32Array(total * 3);
  const seed = new Float32Array(total);
  const ring = new Float32Array(total);
  let k = 0;
  for (let r = 0; r < HALO_RINGS; r++) {
    const rad = HALO_R0 + r * HALO_DR;
    for (let i = 0; i < HALO_PER_RING; i++) {
      const a = (i / HALO_PER_RING) * Math.PI * 2 + (Math.random() - 0.5) * 0.02;
      const rr = rad + (Math.random() - 0.5) * 0.14;
      pos[k*3]   = Math.cos(a) * rr;
      pos[k*3+1] = Math.sin(a) * rr;
      pos[k*3+2] = (Math.random() - 0.5) * 0.12;
      seed[k] = Math.random();
      ring[k] = r;
      k++;
    }
  }
  for (let i = 0; i < HALO_DISC; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * HALO_DISC_R;
    pos[k*3]   = Math.cos(a) * rr;
    pos[k*3+1] = Math.sin(a) * rr;
    pos[k*3+2] = (Math.random() - 0.5) * 0.1;
    seed[k] = Math.random();
    ring[k] = 4;
    k++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aRing', new THREE.BufferAttribute(ring, 1));
  haloMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime:       { value: 0 },
      uHaloPhase:   { value: 0 },
      uPixelRatio:   { value: PIXEL_RATIO },
      uHaloColor:    { value: new THREE.Color(1.0, 0.80, 0.38) },
      uScatterSpeed: { value: 0.22 },   // 约 4.5 秒散射一轮
      uScatterDist:  { value: 0.6 }     // 散射粒子向外飞散距离（归一化单位；过大则圆环涣散）
    },
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  haloPoints = new THREE.Points(g, haloMaterial);
  haloPoints.frustumCulled = false;
  haloPoints.renderOrder = 9;
  haloPoints.visible = false;
  // ★ 光轮属于"贴图模型"（真身）：先挂 scene，每帧转挂到当前模型的 solidWrapper 下，
  //   与真身同旋转，位置贴真身头顶背面（z≈-0.6，归一化单位）
  scene.add(haloPoints);
  updateHaloHead();
  logOK(`halo created (${total} particles, center norm Y=${haloLocalY.toFixed(2)})`);
}

// =============================================================
// 加载
// =============================================================
const buddhas = new Array(BUDDHAS.length).fill(null);
const solidShaders = [];
let currentIndex = 0, prevIndex = 0;
let transition = 1.0, explosion = 0.0;
let stateBlend = 0.0, targetStateBlend = 0.0;
let autoRotateAngle = 0;
let userRotX = 0, userRotY = 0;
let phase2ActiveUniform = null;

let targetCameraZ = BASE_CAMERA_Z / FIXED_MODEL_SCALE;

async function fetchArrayBuffer(path, onProgress) {
  for (let attempt = 0; attempt < CDN_BASES.length; attempt++) {
    const base = CDN_BASES[attempt];
    const url = `${base}/${path}`;
    logInfo(`[${attempt+1}/${CDN_BASES.length}] ${base.split('/')[2]}`);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort('timeout'), 25000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) { logErr(`HTTP ${res.status}`); clearTimeout(tid); continue; }
      const total = +res.headers.get('Content-Length') || 0;
      if (!res.body || !total) {
        const buf = await res.arrayBuffer();
        clearTimeout(tid);
        return buf;
      }
      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0, lastLog = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (onProgress) onProgress(loaded / total);
        const now = Date.now();
        if (now - lastLog > 500) { lastLog = now; logInfo(`DL ${(loaded/1024/1024).toFixed(1)}/${(total/1024/1024).toFixed(1)} MB`); }
      }
      clearTimeout(tid);
      const out = new Uint8Array(loaded);
      let off = 0;
      for (const c of chunks) { out.set(c, off); off += c.length; }
      logOK(`✅ download complete ${(loaded/1024/1024).toFixed(1)} MB`);
      return out.buffer;
    } catch (e) {
      clearTimeout(tid);
      logErr(`failed: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    }
  }
  throw new Error(`all CDNs failed: ${path}`);
}

async function loadBuddha(config, index) {
  const t0 = Date.now();
  setRowStatus(index, 'DOWNLOAD', '下载中');
  try {
    const buf = await fetchArrayBuffer(config.file, p => setRowProgress(index, p));
    setRowStatus(index, 'PARSING', '解析中');
    setRowProgress(index, 1);
    const gltf = await new Promise((res, rej) => loader.parse(buf, '', res, rej));
    setRowStatus(index, 'SAMPLING', '采样中');
    const processed = processModel(gltf.scene, COUNT, config.color);
    setRowStatus(index, 'DONE', '完成', 'done');
    logOK(`✅ [${config.id}] done in ${Date.now() - t0}ms`);
    return { ...processed, config, index };
  } catch (e) {
    setRowStatus(index, 'FAILED', '失败', 'err');
    logErr(`❌ [${config.id}] ${e.message}`);
    console.error(e);
    return null;
  }
}

async function loadAll() {
  logInfo('=== loading 4 models in parallel ===');
  const t0 = Date.now();
  await Promise.all(BUDDHAS.map((cfg, i) => loadBuddha(cfg, i).then(b => { buddhas[i] = b; })));
  const ok = buddhas.filter(b => b).length;
  logInfo(`=== done ${ok}/${BUDDHAS.length}, ${Date.now() - t0}ms ===`);
  return ok;
}

function switchTo(index) {
  if (index === currentIndex || !buddhas[index] || !targetA || !targetB) return;
  targetA.image.data.set(targetB.image.data);
  writeTargetTexture(targetB, buddhas[index].positions);
  const colors = buddhas[index].colors;
  const cAttr = points.geometry.attributes.aColor;
  cAttr.array.set(colors); cAttr.needsUpdate = true;
  const hAttr = points.geometry.attributes.aHomePos;
  hAttr.array.set(buddhas[index].positions); hAttr.needsUpdate = true;
  const uvAttr = points.geometry.attributes.aUv;
  uvAttr.array.set(buddhas[index].particleUvs);
  uvAttr.needsUpdate = true;
  const haloAttr = points.geometry.attributes.aHaloPos;
  haloAttr.array.set(buddhas[index].particleHalo);
  haloAttr.needsUpdate = true;
  updateHaloHead();  // ★ 换模型后重新校准光轮中心
  particleMaterial.uniforms.uWipeMask.value = buddhas[index].wipeMaskTexture;

  prevIndex = currentIndex;
  transition = 0;
  currentIndex = index;
  updateUI(index);
  updateCardHighlight(index);
  logInfo(`[switch] ${BUDDHAS[index].id}`);
}

function updateUI(i) { setName(BUDDHAS[i].nameEn, BUDDHAS[i].name); }

// =============================================================
// 阶段参数切换
// =============================================================
function applyParams(params) {
  Object.assign(RENDER_PARAMS, params);
  applyAllRenderParams();
  syncSliderUI();
}

function switchToPhase1Params() {
  applyParams(PHASE1_PARAMS);
  logInfo('[params] phase 1');
}

const PHASE2_SCALE_FACTOR = 0.9;   // ★ 阶段二模型为阶段一尺寸的 0.9 倍
function switchToPhase2Params() {
  applyParams(PHASE2_PARAMS);
  RENDER_PARAMS.scale = PHASE1_PARAMS.scale * PHASE2_SCALE_FACTOR;
  applyAllRenderParams();
  logInfo('[params] phase 2');
}

function syncSliderUI() {
  SLIDER_DEFS.forEach(def => {
    const input = document.getElementById(def.id);
    const valSpan = document.getElementById(def.valId);
    if (!input || !valSpan) return;
    const storeVal = RENDER_PARAMS[def.key];
    let sliderVal = def.fromStore ? def.fromStore(storeVal) : storeVal;
    input.value = sliderVal;
    valSpan.textContent = def.format ? def.format(sliderVal) : sliderVal.toFixed(def.decimals);
  });
}

function fillWipeMask(buddha) {
  if (buddha.wipeMaskFilled) return;
  const ctx = buddha.wipeMaskCtx;
  const S = buddha.wipeMaskCanvas.width;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, S, S);
  buddha.wipeMaskTexture.needsUpdate = true;
  buddha.wipeMaskFilled = true;
  logOK('[phase 2] wipe complete, texture fully revealed');
}

// ★ 回到阶段一循环：清空擦拭遮罩，模型回到粒子状态
function clearWipeMask(buddha) {
  if (!buddha || !buddha.wipeMaskCtx) return;
  const ctx = buddha.wipeMaskCtx;
  const S = buddha.wipeMaskCanvas.width;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  buddha.wipeMaskTexture.needsUpdate = true;
  buddha.wipeMaskFilled = false;
}

// =============================================================
// 阶段切换
// =============================================================
function enterPhase2() {
  if (currentPhase !== PHASE.PHASE1) return;
  currentPhase = PHASE.PHASE2;
  targetCameraZ = (BASE_CAMERA_Z / FIXED_MODEL_SCALE) * PHASE2_CAMERA_ZOOM;
  const b = buddhas[currentIndex];
  if (b) {
    b.wipeProgress = 0;
    b.lastWipeCheckAt = 0;
    b.wipeMaskFilled = false;
    const S = b.wipeMaskCanvas.width;
    b.wipeMaskCtx.fillStyle = '#000';
    b.wipeMaskCtx.fillRect(0, 0, S, S);
    b.wipeMaskTexture.needsUpdate = true;
  }
  wipeTimeAccum = 0;
  lastWipeUv = null;
  if (phase2ActiveUniform) phase2ActiveUniform.value = 1.0;

  switchToPhase2Params();

  setHint('Wipe away the dust, reveal the Buddha whole — with devout faith, light the radiance anew', '拭去尘埃，佛身完整重现；心怀虔诚，佛光重新点亮');
  setHoldLabel('WIPE', '擦拭');
  infoPanel.classList.add('hidden');
  wipeProgressEl.classList.add('show');
  wipeProgressFill.style.width = '0%';
  updateTweaksPanel();   // ★ 阶段一微调滑轨只在阶段一显示
  AudioSys.applyPhase(PHASE.PHASE2);   // ★ 擦拭声起、环境底压低
  logOK(`[phase 2] wiping: ${BUDDHAS[currentIndex].id}`);
}

function enterPhase3() {
  if (currentPhase !== PHASE.PHASE2) return;
  currentPhase = PHASE.PHASE3;
  // ★ 核心修复：无论哪条路径进入阶段三（55% 进度提前触发，或 5 秒自动补齐），
  //   都先把 wipeMask 补满为全白。之前 55% 进度直接进阶段三时，未擦拭区域的
  //   粒子（vKeep=1）会残留在已全显的贴图上，且 5 秒的 fillWipeMask 再无机会
  //   执行——这就是"残留粒子区域贴图无法正常显示"的根因。
  //   注：粒子与贴图共用 wipeMask、反向取值的交叉淡化逻辑本身是对称正确的，
  //   不是病因，故不改动。
  const b3 = buddhas[currentIndex];
  if (b3) fillWipeMask(b3);
  targetStateBlend = 1.0;
  explosion = 0.6;
  // ★ 法相金身：贴图显现后延迟显现粒子金身（金色、2 倍、放光）
  goldPhase = 0; goldScale = 1; goldPhaseDelay = 1.2; goldHintShown = false; haloPhase = 0;
  goldAttract = 0; goldConvergeT = -1; dustReleaseT = -1;
  if (particleMaterial) particleMaterial.uniforms.uGoldPhase.value = 0;
  applyPointsScale();
  document.body.classList.add('phase3');   // ★ 阶段三：左侧只显示赐福句
  setHint(...hintBlessing('REVEALED', '真身已现'));
  setHoldLabel('BLESS', '祈福');
  wipeProgressEl.classList.remove('show');
  updateTweaksPanel();   // ★ 阶段一微调滑轨只在阶段一显示
  AudioSys.applyPhase(PHASE.PHASE3);   // ★ 擦拭声停、环境底恢复
  logOK(`[phase 3] true form revealed`);
}

// ★ 阶段三 → 阶段一：祝福已领，回到起点重新循环
function exitPhase3() {
  if (currentPhase !== PHASE.PHASE3) return;
  hideBlessing();
  document.body.classList.remove('phase3');
  currentPhase = PHASE.PHASE1;
  targetCameraZ = BASE_CAMERA_Z / FIXED_MODEL_SCALE;
  targetStateBlend = 0;   // 贴图淡回粒子
  if (phase2ActiveUniform) phase2ActiveUniform.value = 0.0;
  clearWipeMask(buddhas[currentIndex]);   // ★ 清空擦拭遮罩：直接回到粒子状态，不必切换模型
  goldPhase = 0; goldScale = 1; goldPhaseDelay = 0; goldHintShown = false; haloPhase = 0;
  goldAttract = 0; goldConvergeT = -1; dustReleaseT = -1;
  if (goldGroup) goldGroup.position.z = 0;   // ★ 金身的 -6 后方位移必须归零，否则粒子模型错位
  if (velocityVar) velocityVar.material.uniforms.uRise.value = 0;
  if (particleMaterial) particleMaterial.uniforms.uGoldPhase.value = 0;
  if (haloMaterial) haloMaterial.uniforms.uHaloPhase.value = 0;
  if (haloPoints) haloPoints.visible = false;
  applyPointsScale();
  switchToPhase1Params();
  setHint(...hintSwitchSelect());
  setHoldLabel(...holdLabelText());
  infoPanel.classList.remove('hidden');
  updateTweaksPanel();
  AudioSys.applyPhase(PHASE.PHASE1);
  logOK(`[phase 3] blessing received, back to phase 1`);
}

function exitPhase2() {
  if (currentPhase !== PHASE.PHASE2) return;
  currentPhase = PHASE.PHASE1;
  targetCameraZ = BASE_CAMERA_Z / FIXED_MODEL_SCALE;
  if (phase2ActiveUniform) phase2ActiveUniform.value = 0.0;
  wipeTimeAccum = 0;

  switchToPhase1Params();

  setHint(...hintSwitchSelect());
  setHoldLabel(...holdLabelText());
  infoPanel.classList.remove('hidden');
  wipeProgressEl.classList.remove('show');
  updateTweaksPanel();   // ★ 回到阶段一，恢复微调滑轨
  AudioSys.applyPhase(PHASE.PHASE1);
  logInfo(`[phase 1] back`);
}

// =============================================================
// 键盘
// =============================================================
const holdRing = document.getElementById('holdRing');
const holdProgress = holdRing.querySelector('.progress');
const CIRCUMFERENCE = 2 * Math.PI * 44;
let spaceDownTime = 0, holdRAF = null;

function startHoldProgress() {
  spaceDownTime = performance.now();
  holdRing.classList.add('show');
  setHoldLabel(...holdLabelText());
  holdProgress.style.strokeDashoffset = CIRCUMFERENCE;
  function tick() {
    const p = Math.min((performance.now() - spaceDownTime) / HOLD_DURATION_MS, 1);
    holdProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - p);
    if (p >= 1) setHoldLabel('RELEASE', '松开');
    if (spaceDownTime > 0 && p < 1) holdRAF = requestAnimationFrame(tick);
  }
  tick();
}
function stopHoldProgress() {
  spaceDownTime = 0;
  if (holdRAF) cancelAnimationFrame(holdRAF);
  holdRAF = null;
  holdRing.classList.remove('show');
  holdProgress.style.strokeDashoffset = CIRCUMFERENCE;
  setHoldLabel(...holdLabelText());
}
addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    if (currentPhase === PHASE.PHASE2) exitPhase2();
    return;
  }
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (e.repeat) return;
  if (spaceDownTime > 0) return;
  if (currentPhase === PHASE.PHASE3) {
    if (blessingShown) { exitPhase3(); return; }   // ★ 祝福卡已现：按空格回阶段一
    startHoldProgress();                            // ★ 长按空格祈福
    setHoldLabel('BLESS', '祈福');
    return;
  }
  if (currentPhase !== PHASE.PHASE1) return;
  startHoldProgress();
});
addEventListener('keyup', e => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (currentPhase === PHASE.PHASE3) {
    if (spaceDownTime === 0) return;
    const held = performance.now() - spaceDownTime;
    stopHoldProgress();
    if (!blessingShown && held >= HOLD_DURATION_MS) showBlessing();  // ★ 长按满 → 祝福卡
    return;
  }
  if (currentPhase !== PHASE.PHASE1) return;
  if (spaceDownTime === 0) return;
  const held = performance.now() - spaceDownTime;
  stopHoldProgress();
  if (held >= HOLD_DURATION_MS) {
    enterPhase2();
  } else {
    switchTo((currentIndex + 1) % BUDDHAS.length);
  }
});
addEventListener('blur', () => { if (spaceDownTime > 0) stopHoldProgress(); });

// =============================================================
// 鼠标
// =============================================================
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(0, 0);
// ★ 手势阶段二：3D 擦拭光标——金色圆环＋中心点，实时显示手指在模型上的位置
//   命中模型 = 金色亮环；未命中 = 灰色暗环（悬在模型深度平面），手离开则隐藏
const wipeCursorRingMat = new THREE.MeshBasicMaterial({
  color: 0xffd98a, transparent: true, opacity: 0.95,
  blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  side: THREE.DoubleSide
});
const wipeCursor = new THREE.Group();
{
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.17, 48), wipeCursorRingMat);
  ring.renderOrder = 999;
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), wipeCursorRingMat);
  dot.renderOrder = 999;
  wipeCursor.add(ring, dot);
  wipeCursor.visible = false;
  scene.add(wipeCursor);
}
const mousePlane = new THREE.Plane();
const planeNormal = new THREE.Vector3();
const currentMouseWorld = new THREE.Vector3(9999, 9999, 0);
const prevMouseWorld = new THREE.Vector3(9999, 9999, 0);
const mouseWorldVel = new THREE.Vector3(0, 0, 0);
let mouseForceActive = 0;
let mouseDragging = false;

renderer.domElement.addEventListener('pointermove', e => {
  const r = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  mouseForceActive = 1.0;
});
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  mouseDragging = true;
});
renderer.domElement.addEventListener('pointerup', e => {
  if (e.button !== 0) return;
  mouseDragging = false;
});
renderer.domElement.addEventListener('pointerleave', () => {
  mouseForceActive = 0.0;
  mouseDragging = false;
});

// =============================================================
// 擦拭逻辑
// =============================================================
function paintWipeMark(buddha, uvX, uvY, deferUpdate) {
  const ctx = buddha.wipeMaskCtx;
  const S = buddha.wipeMaskCanvas.width;
  const px = uvX * S;
  const py = (1 - uvY) * S;
  const r = WIPE_RADIUS_UV * S;

  const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();

  if (!deferUpdate) buddha.wipeMaskTexture.needsUpdate = true;
}

function measureWipeProgress(buddha) {
  const ctx = buddha.wipeMaskCtx;
  const S = buddha.wipeMaskCanvas.width;
  const data = ctx.getImageData(0, 0, S, S).data;
  let sum = 0, n = 0;
  const step = 16 * 4;
  for (let i = 0; i < data.length; i += step) {
    sum += data[i];
    n++;
  }
  return sum / n / 255;
}

function updateWipeProgressUI(progress) {
  wipeProgressFill.style.width = (progress * 100).toFixed(1) + '%';
}

// =============================================================
// 渲染调试面板（面板 HTML 已按需求删除，仅保留参数体系；
// setupRenderPanel 在无面板时直接返回）
// =============================================================

const SLIDER_DEFS = [
  { id:'tScale',         valId:'vScale',         key:'scale',         decimals:2 },
  { id:'tBrightness',    valId:'vBrightness',    key:'brightness',    decimals:2 },
  { id:'tReveal',        valId:'vReveal',        key:'reveal',        decimals:2 },
  { id:'tTransparent',   valId:'vTransparent',   key:'transparent',   decimals:0, format:v => v > 0.5 ? 'ON' : 'OFF' },
  { id:'tAlphaTest',     valId:'vAlphaTest',     key:'alphaTest',     decimals:2 },
  { id:'tDepthWrite',    valId:'vDepthWrite',    key:'depthWrite',    decimals:0, format:v => v > 0.5 ? 'ON' : 'OFF' },
  { id:'tSide',          valId:'vSide',          key:'side',          decimals:0,
    format:v => v === 0 ? 'FRONT' : (v === 1 ? 'DOUBLE' : 'BACK'),
    toStore:v => v === 0 ? 'FrontSide' : (v === 1 ? 'DoubleSide' : 'BackSide'),
    fromStore:s => s === 'FrontSide' ? 0 : (s === 'DoubleSide' ? 1 : 2) },
  { id:'tRenderOrder',   valId:'vRenderOrder',   key:'renderOrder',   decimals:0 },
  { id:'tSoftLow',       valId:'vSoftLow',       key:'softLow',       decimals:2 },
  { id:'tSoftHigh',      valId:'vSoftHigh',      key:'softHigh',      decimals:2 },
  { id:'tParticleRatio', valId:'vParticleRatio', key:'particleRatio', decimals:2 },
  { id:'tDensityMul',    valId:'vDensityMul',    key:'densityMul',    decimals:2 },
  { id:'tHaloXY',        valId:'vHaloXY',        key:'haloXY',        decimals:2 },
  { id:'tHaloZ',         valId:'vHaloZ',         key:'haloZ',         decimals:2 },
  { id:'tHaloBack',      valId:'vHaloBack',      key:'haloBack',      decimals:2 }
];

function applyAllRenderParams() {
  const P = RENDER_PARAMS;

  solidMaterials.forEach(mat => {
    mat.transparent = P.transparent;
    mat.alphaTest = P.alphaTest;
    mat.depthWrite = P.depthWrite;
    mat.side = THREE[P.side];
    mat.needsUpdate = true;
  });

  if (points) applyPointsScale();
  buddhas.forEach(b => {
    if (b && b.solidWrapper) b.solidWrapper.scale.setScalar(P.scale);
  });

  solidShaders.forEach(sh => {
    if (sh.uniforms.uTextureBrightness) sh.uniforms.uTextureBrightness.value = P.brightness;
    if (sh.uniforms.uBrighten) sh.uniforms.uBrighten.value = P.reveal;
    if (sh.uniforms.uSoftLow) sh.uniforms.uSoftLow.value = P.softLow;
    if (sh.uniforms.uSoftHigh) sh.uniforms.uSoftHigh.value = P.softHigh;
  });

  if (particleMaterial && particleMaterial.uniforms.uDensityMul) {
    particleMaterial.uniforms.uDensityMul.value = P.densityMul;
  }

  if (particleMaterial) {
    if (particleMaterial.uniforms.uSoftLow) particleMaterial.uniforms.uSoftLow.value = P.softLow;
    if (particleMaterial.uniforms.uSoftHigh) particleMaterial.uniforms.uSoftHigh.value = P.softHigh;
  }
}

function setupRenderPanel() {
  // 面板 HTML 已删除：无滑轨可绑定，直接返回（保留参数体系不受影响）
  if (!document.getElementById('tScale')) return;
  SLIDER_DEFS.forEach(def => {
    const input = document.getElementById(def.id);
    const valSpan = document.getElementById(def.valId);
    if (!input || !valSpan) return;

    const storeVal = RENDER_PARAMS[def.key];
    let sliderVal = def.fromStore ? def.fromStore(storeVal) : storeVal;
    input.value = sliderVal;
    valSpan.textContent = def.format
      ? def.format(sliderVal)
      : sliderVal.toFixed(def.decimals);

    input.addEventListener('input', () => {
      const raw = parseFloat(input.value);
      let newVal = raw;
      if (def.toStore) newVal = def.toStore(raw);
      RENDER_PARAMS[def.key] = newVal;

      if (def.key === 'scale' || def.key === 'particleRatio' || def.key === 'densityMul') {
        PHASE1_PARAMS[def.key] = newVal;
        PHASE2_PARAMS[def.key] = newVal;
      } else {
        const snapshot = currentPhase === PHASE.PHASE1 ? PHASE1_PARAMS : PHASE2_PARAMS;
        snapshot[def.key] = newVal;
      }

      valSpan.textContent = def.format
        ? def.format(raw)
        : raw.toFixed(def.decimals);
      applyAllRenderParams();
      if (def.key === 'haloXY' || def.key === 'haloZ' || def.key === 'haloBack') {
        rebuildHaloPositions();
      }
      logInfo(`[Tuner] ${def.key} = ${def.toStore ? newVal : (def.format ? def.format(raw) : raw.toFixed(def.decimals))}`);
    });
  });

  document.getElementById('btnResetTuner').addEventListener('click', () => {
    if (currentPhase === PHASE.PHASE1) {
      Object.assign(PHASE1_PARAMS, DEFAULT_PHASE1);
    } else {
      Object.assign(PHASE2_PARAMS, DEFAULT_PHASE2);
    }
    applyParams(RENDER_PARAMS);
    rebuildHaloPositions();
    logOK('[Tuner] params reset');
  });

  document.getElementById('btnCopyTuner').addEventListener('click', () => {
    const lines = [
      `// ${currentPhase === PHASE.PHASE1 ? 'phase1' : 'phase2'} params`,
      `const MODEL_SIZE_DEFAULT = ${RENDER_PARAMS.scale.toFixed(2)};`,
      `const PARTICLE_SIZE_RATIO = ${RENDER_PARAMS.particleRatio.toFixed(2)};`,
      `const PARTICLE_DENSITY_MUL = ${RENDER_PARAMS.densityMul.toFixed(2)};`,
      `const TEXTURE_BRIGHTNESS = ${RENDER_PARAMS.brightness.toFixed(2)};`,
      `const REVEAL_BRIGHTEN = ${RENDER_PARAMS.reveal.toFixed(2)};`,
      `const RENDER_TRANSPARENT = ${RENDER_PARAMS.transparent ? 1 : 0};`,
      `const RENDER_ALPHATEST = ${RENDER_PARAMS.alphaTest.toFixed(2)};`,
      `const RENDER_DEPTHWRITE = ${RENDER_PARAMS.depthWrite ? 1 : 0};`,
      `const RENDER_SIDE = '${RENDER_PARAMS.side}';`,
      `const RENDER_ORDER = ${RENDER_PARAMS.renderOrder};`,
      `const DISCARD_SOFT_LOW = ${RENDER_PARAMS.softLow.toFixed(2)};`,
      `const DISCARD_SOFT_HIGH = ${RENDER_PARAMS.softHigh.toFixed(2)};`,
      `const HALO_SCALE_XY = ${RENDER_PARAMS.haloXY.toFixed(2)};`,
      `const HALO_SCALE_Z = ${RENDER_PARAMS.haloZ.toFixed(2)};`,
      `const HALO_BACK_OFFSET = ${RENDER_PARAMS.haloBack.toFixed(2)};`
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btnCopyTuner');
      btn.textContent = 'COPIED!';
      btn.classList.add('copied');
      logOK('[Tuner] params copied to clipboard');
      setTimeout(() => {
        btn.textContent = 'COPY VALUES';
        btn.classList.remove('copied');
      }, 1500);
    }).catch(() => {
      console.log(text);
      logInfo('[Tuner] dumped to console');
    });
  });
}

const DEFAULT_PHASE1 = { ...PHASE1_PARAMS };
const DEFAULT_PHASE2 = { ...PHASE2_PARAMS };

function rebuildHaloPositions() {
  const P = RENDER_PARAMS;
  buddhas.forEach(b => {
    if (!b) return;
    const pos = b.positions;
    const n = pos.length / 3;
    for (let i = 0; i < n; i++) {
      b.particleHalo[i*3]   = pos[i*3] * P.haloXY;
      b.particleHalo[i*3+1] = pos[i*3+1] * P.haloXY;
      b.particleHalo[i*3+2] = pos[i*3+2] * P.haloZ - P.haloBack;
    }
  });
  if (points && buddhas[currentIndex]) {
    const attr = points.geometry.attributes.aHaloPos;
    attr.array.set(buddhas[currentIndex].particleHalo);
    attr.needsUpdate = true;
  }
}

// =============================================================
// 主循环
// =============================================================
const clock = new THREE.Clock();
const _invMatrix = new THREE.Matrix4();
const _localMouse = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.03);
  const t = clock.elapsedTime;

  const isPhase1 = currentPhase === PHASE.PHASE1;
  const isPhase3 = currentPhase === PHASE.PHASE3;

  if (isPhase1) {
    autoRotateAngle += 0.002;
  } else {
    autoRotateAngle += (0 - autoRotateAngle) * Math.min(dt * 2.5, 1.0);
  }

  const curRotY = autoRotateAngle + userRotY;
  const curRotX = userRotX;

  camera.position.z += (targetCameraZ - camera.position.z) * Math.min(dt * 2.0, 1.0);

  if (goldGroup) {
    goldGroup.rotation.y = curRotY;
    goldGroup.rotation.x = curRotX;
    goldGroup.updateMatrixWorld(true);
  }

  const currentRevealRadius = isPhase1 ? REVEAL_RADIUS * mouseForceActive : 0;
  const currentLeakRadius = isPhase1 ? FORCE.leakRadius * mouseForceActive : 0;

  buddhas.forEach((b, i) => {
    if (!b) return;
    if (b.solidWrapper) {
      b.solidWrapper.rotation.y = curRotY;
      b.solidWrapper.rotation.x = curRotX;
      b.solidWrapper.updateMatrixWorld(true);
    }
    let entityAlpha = 0;
    if (i === currentIndex) entityAlpha = Math.max(0, transition * 2 - 1);
    else if (i === prevIndex) entityAlpha = Math.max(0, 1 - transition * 2);

    if (isPhase1 || currentPhase === PHASE.PHASE2) {
      b.solidWrapper.traverse(child => {
        if (child.isMesh && child.material && child.material.userData.shader) {
          const sh = child.material.userData.shader;
          sh.uniforms.uMousePos.value.copy(currentMouseWorld);
          sh.uniforms.uLeakRadius.value = currentRevealRadius;
          sh.uniforms.uStateBlend.value = stateBlend;
          sh.uniforms.uTransitionAlpha.value = entityAlpha;
        }
      });
    }
  });

  raycaster.setFromCamera(mouseNDC, camera);

  let hitWorld = null;
  const curBuddha = buddhas[currentIndex];
  if (curBuddha && curBuddha.solidWrapper) {
    const hits = raycaster.intersectObject(curBuddha.solidWrapper, true);
    if (hits.length > 0) hitWorld = hits[0].point.clone();
  }

  if (!hitWorld) {
    camera.getWorldDirection(planeNormal);
    mousePlane.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, 0, 0));
    if (!raycaster.ray.intersectPlane(mousePlane, currentMouseWorld)) {
      currentMouseWorld.set(9999, 9999, 9999);
    }
  } else {
    currentMouseWorld.copy(hitWorld);
  }

  // ★ 手势阶段二：3D 擦拭光标跟随手指（仅手势模式；鼠标模式已有系统光标）
  const wipeCursorOn = (currentPhase === PHASE.PHASE2) && (inputMode === 'gesture') && (mouseForceActive > 0.01);
  wipeCursor.visible = wipeCursorOn;
  if (wipeCursorOn) {
    wipeCursor.quaternion.copy(camera.quaternion);   // 公告牌：始终面向相机
    if (hitWorld) {
      wipeCursor.position.copy(hitWorld);            // 命中模型：落在模型表面
      wipeCursorRingMat.color.setHex(0xffd98a);
      wipeCursorRingMat.opacity = 0.95;
    } else {
      wipeCursor.position.copy(currentMouseWorld);   // 未命中：灰色环悬在模型深度平面
      wipeCursorRingMat.color.setHex(0x8a8a8a);
      wipeCursorRingMat.opacity = 0.30;
    }
    wipeCursor.scale.setScalar(1 + Math.sin(t * 6.0) * 0.07);   // 呼吸脉冲
  }

  if (mouseForceActive > 0.01 && prevMouseWorld.x < 9000 && currentMouseWorld.x < 9000) {
    mouseWorldVel.subVectors(currentMouseWorld, prevMouseWorld).divideScalar(dt);
    if (mouseWorldVel.length() > 50) mouseWorldVel.normalize().multiplyScalar(50);
  } else {
    mouseWorldVel.set(0, 0, 0);
  }
  prevMouseWorld.copy(currentMouseWorld);

  // ★ 尘埃鼠标：只在阶段一/三响应；阶段二擦拭时鼠标不搅动背景尘埃
  // ★ 阶段二删除尘埃背景：整个环境尘埃点云在阶段二不可见
  if (ambientPoints) ambientPoints.visible = (currentPhase !== PHASE.PHASE2);
  updateAmbientGPGPU(dt, t, currentMouseWorld, mouseWorldVel, (isPhase1 || isPhase3) ? mouseForceActive : 0);

  if (points) {
    _invMatrix.copy(points.matrixWorld).invert();
    _localMouse.copy(currentMouseWorld).applyMatrix4(_invMatrix);
  }

  if (currentPhase === PHASE.PHASE2 && curBuddha && mouseForceActive > 0.01) {
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObject(curBuddha.solidWrapper, true);
    if (hits.length > 0 && hits[0].uv) {
      // ★ 笔触插值：上一帧命中 UV 与当前命中 UV 之间按笔刷半径步长补画，
      //   避免快速拖动时 dabs 之间留下未擦除的间隙（之前每帧只画一个点，
      //   手速稍快就会擦出"虚线"，5 秒内不可能擦全）。
      const ux = hits[0].uv.x, uy = hits[0].uv.y;
      if (lastWipeUv) {
        const dx = ux - lastWipeUv.x, dy = uy - lastWipeUv.y;
        const dist = Math.hypot(dx, dy);
        const n = Math.min(Math.ceil(dist / (WIPE_RADIUS_UV * 0.5)), 24);
        for (let k = 1; k <= n; k++) {
          paintWipeMark(curBuddha, lastWipeUv.x + dx * k / n, lastWipeUv.y + dy * k / n, true);
        }
      } else {
        paintWipeMark(curBuddha, ux, uy, true);
      }
      curBuddha.wipeMaskTexture.needsUpdate = true;
      lastWipeUv = { x: ux, y: uy };
      wipeTimeAccum += dt;
      if (wipeTimeAccum >= WIPE_TOTAL_DURATION && !curBuddha.wipeMaskFilled) {
        fillWipeMask(curBuddha);
      }
    } else {
      lastWipeUv = null; // 射线未命中模型时断开笔触，避免下次命中时拉出长线
    }
  } else {
    lastWipeUv = null;
  }

  if (currentPhase === PHASE.PHASE2 && curBuddha) {
    if (t - curBuddha.lastWipeCheckAt > WIPE_CHECK_INTERVAL) {
      curBuddha.lastWipeCheckAt = t;
      const progress = measureWipeProgress(curBuddha);
      curBuddha.wipeProgress = progress;
      updateWipeProgressUI(progress);
      if (progress >= WIPE_COMPLETE_THRESHOLD && wipeTimeAccum >= WIPE_TOTAL_DURATION) {
        enterPhase3();   // ★ 擦拭至少 5 秒：55% 进度提前达标也要等擦满 5 秒
      }
    }
  }

  stateBlend += (targetStateBlend - stateBlend) * dt * 3.5;
  if (transition < 1) transition = Math.min(1, transition + dt * 1.2);
  if (explosion > 0) explosion = Math.max(0, explosion - dt * 4.0);

  // ★ 法相金身显现：贴图显现约 1.2 秒后，粒子以金色形态重新绘制，
  //   大小/距离（负=后方）随显现进度展开，机位同步取景，营造法相在真身后方显现的效果。
  //   大小/距离/动效/颜色/旋转由右下角调试面板控制。
  if (isPhase3) {
    if (goldPhaseDelay > 0) {
      goldPhaseDelay -= dt;
    } else {
      if (goldPhase < 1) {
        goldPhase = Math.min(1, goldPhase + dt * 0.4);
        if (particleMaterial) particleMaterial.uniforms.uGoldPhase.value = goldPhase;
        if (goldPhase >= 1 && !goldHintShown) {
          goldHintShown = true;
          setHint(...hintBlessing('DHARMA GOLD', '法相金身'));
        }
      }
      // ★ 背景尘埃汇聚引力：一次性脉冲（显现中随金身渐强 → 汇聚完成后保持 4 秒 → 3 秒淡出 → 关闭，鼠标重新主导尘埃）
      if (goldPhase < 1) {
        goldAttract = goldPhase;
        goldConvergeT = -1;
      } else {
        if (goldConvergeT < 0) goldConvergeT = t;
        const sinceConv = t - goldConvergeT;
        const HOLD_S = 4.0, FADE_S = 3.0;
        if (sinceConv < HOLD_S) goldAttract = 1;
        else if (sinceConv < HOLD_S + FADE_S) goldAttract = 1 - (sinceConv - HOLD_S) / FADE_S;
        else goldAttract = 0;
      }
      // ★ 脉冲结束 → 标记释放时刻（尘埃散开数秒，鼠标可接管）
      if (goldAttract < 0.001 && goldConvergeT > 0 && dustReleaseT < 0) dustReleaseT = t;
      // ★ 粒子光轮：金身显现过四分之一后慢慢出像（比金身慢，神圣感）
      //   光轮属于贴图模型（真身）：转挂到当前模型的 solidWrapper 下，与真身同旋转
      const cbHalo = buddhas[currentIndex];
      if (haloPoints && cbHalo && cbHalo.solidWrapper && haloPoints.parent !== cbHalo.solidWrapper) {
        cbHalo.solidWrapper.add(haloPoints);
      }
      if (goldPhase > 0.25 && haloPhase < 1) haloPhase = Math.min(1, haloPhase + dt * 0.22);
      if (haloMaterial) {
        haloMaterial.uniforms.uTime.value = t;
        haloMaterial.uniforms.uHaloPhase.value = haloPhase;
      }
      if (haloPoints) haloPoints.visible = haloPhase > 0.002;
      // ★ 法相动效（面板选择；单体/群体级别，整体动效已按用户要求移除）
      let rise = 0;
      if (goldMotion === 'surge') rise = 8.0;
      // ★ 金身位形：大小与有符号距离随显现进度展开（定版：大小 3.0，距离 -6.0，金身在贴图后方）
      const effSize = 1 + goldPhase * (goldSizeTarget - 1);
      const effZ = goldDistZ * goldPhase;
      goldScale = effSize;
      applyPointsScale();
      if (goldGroup) goldGroup.position.z = effZ;
      if (velocityVar) velocityVar.material.uniforms.uRise.value = rise * goldPhase;
      // 机位：金身包围球与贴图真身都完整入画（取两者所需的最大距离）
      const needZc = effZ + 4.6 * effSize;
      const minZc = (BASE_CAMERA_Z / FIXED_MODEL_SCALE) * PHASE2_CAMERA_ZOOM;
      targetCameraZ = Math.max(minZc, needZc);
    }
  }

  if (gpuCompute) {
    // 金身显现时把 gather 拉向 1，让粒子收拢成清晰的佛形（阶段一/二时 goldPhase=0，行为不变）
    const gather = Math.min(1, transition * (1 - stateBlend * 0.5) + goldPhase * 0.6);
    velocityVar.material.uniforms.uTextureTrail.value =
      gpuCompute.getCurrentRenderTarget(trailVar).texture;
    velocityVar.material.uniforms.uDelta.value = dt;
    velocityVar.material.uniforms.uTime.value = t;
    if (particleMaterial) particleMaterial.uniforms.uTime.value = t;
    velocityVar.material.uniforms.uGather.value = gather;
    velocityVar.material.uniforms.uExplosion.value = explosion;
    velocityVar.material.uniforms.uTransition.value = transition;
    velocityVar.material.uniforms.uMousePos.value.copy(_localMouse);
    velocityVar.material.uniforms.uMouseVel.value.copy(mouseWorldVel);
    velocityVar.material.uniforms.uMouseActive.value = isPhase1 ? mouseForceActive : 0;
    velocityVar.material.uniforms.uLeakRadius.value = currentLeakRadius;
    velocityVar.material.uniforms.uGlowRadius.value = FORCE.glowRadius;
    trailVar.material.uniforms.uDelta.value = dt;
    gpuCompute.compute();
    particleMaterial.uniforms.uTexturePosition.value =
      gpuCompute.getCurrentRenderTarget(positionVar).texture;
    particleMaterial.uniforms.uTextureVelocity.value =
      gpuCompute.getCurrentRenderTarget(velocityVar).texture;
    particleMaterial.uniforms.uTextureTrail.value =
      gpuCompute.getCurrentRenderTarget(trailVar).texture;
    particleMaterial.uniforms.uMouseLocal.value.copy(_localMouse);
    particleMaterial.uniforms.uMouseActive.value = isPhase1 ? mouseForceActive : 0;
    particleMaterial.uniforms.uGoldRadius.value = GOLD_RADIUS;
  }

  renderer.render(scene, camera);
}

// =============================================================
// 启动
// =============================================================
(async function start() {
  startNarrative();
  renderCards();
  createAmbientGPGPU();
  setupRenderPanel();

  const ok = await loadAll();
  hideLoader();
  if (ok === 0) { logErr('model loading failed'); return; }

  for (let i = 0; i < BUDDHAS.length; i++) {
    if (buddhas[i]) { currentIndex = i; break; }
  }
  prevIndex = currentIndex;

  const first = buddhas[currentIndex];
  const gpuState = initGPU(first.positions, first.colors, first.particleUvs, first.particleHalo);
  phase2ActiveUniform = gpuState.phase2Active;
  particleMaterial.uniforms.uWipeMask.value = first.wipeMaskTexture;

  applyParams(PHASE1_PARAMS);

  updateUI(currentIndex);
  updateCardHighlight(currentIndex);
  setHint(...hintSwitchSelect());
  updateTweaksPanel();   // ★ 阶段一显示微调滑轨
  animate();
})();
// =============================================================
// 手势模式（MediaPipe Hands）
//   滑动切换  = 点击空格（单手左右滑动）
//   合十长按  = 长按空格（双手合十保持 1 秒）
//   双手捏合  = 缩放模型（只改大小，不动位置）
//   单手捏合  = 旋转模型
//   阶段二    = 食指指尖代替鼠标擦拭
// =============================================================
const MP_VERSION = '0.4.1675469240';
const MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@' + MP_VERSION;
let inputMode = 'keyboard';   // 'keyboard' | 'gesture'
let mpHands = null, mpStream = null, mpPumpOn = false;
let lastResultT = 0;

const modeSwitchEl = document.getElementById('modeSwitch');
const camPreviewEl = document.getElementById('camPreview');
const camVideoEl = document.getElementById('camVideo');
const camCanvasEl = document.getElementById('camCanvas');
const camCtx = camCanvasEl.getContext('2d');
const camStatusEl = document.getElementById('camStatus');

const HAND_CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

// ---- 模式相关的提示语（函数声明提升，供前面的调用点使用）----
function hintSwitchSelect() {
  return inputMode === 'gesture'
    ? ['SWIPE TO SWITCH · PRAY TO SELECT', '滑动切换 · 合十选中']
    : ['SPACE TO SWITCH · HOLD TO SELECT', '空格切换 · 长按选中'];
}
function hintBlessing(preEn, preZh) {
  return inputMode === 'gesture'
    ? [preEn + ' · PRAY FOR BLESSING', preZh + ' · 合十祈福']
    : [preEn + ' · HOLD SPACE FOR BLESSING', preZh + ' · 长按空格祈福'];
}
function holdLabelText() {
  return inputMode === 'gesture' ? ['PRAY', '合十'] : ['HOLD', '长按'];
}
function refreshHintsForMode() {
  if (currentPhase === PHASE.PHASE1) setHint(...hintSwitchSelect());
  else if (currentPhase === PHASE.PHASE3 && !blessingShown) {
    const done = goldPhase >= 1;
    setHint(...hintBlessing(done ? 'DHARMA GOLD' : 'REVEALED', done ? '法相金身' : '真身已现'));
  }
}
function syncModeButtons() {
  modeSwitchEl.querySelectorAll('button').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === inputMode));
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('script load failed: ' + src));
    document.head.appendChild(s);
  });
}

async function enableGestureMode() {
  if (inputMode === 'gesture') return;
  inputMode = 'gesture';
  syncModeButtons();
  refreshHintsForMode();
  camPreviewEl.classList.add('show');
  camStatusEl.style.display = 'flex';
  try {
    if (!window.Hands) await loadScript(MP_CDN + '/hands.js');
    if (!window.Hands) throw new Error('MediaPipe hands unavailable');
    if (mpHands) { try { mpHands.close(); } catch (e) {} mpHands = null; }
    mpHands = new window.Hands({ locateFile: (f) => MP_CDN + '/' + f });
    mpHands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
    mpHands.onResults(onHandsResults);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('camera API unavailable (needs HTTPS or localhost)');
    }
    mpStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false
    });
    camVideoEl.srcObject = mpStream;
    await camVideoEl.play();
    camStatusEl.style.display = 'none';
    pumpFrames();
    logOK('[gesture] camera on, tracking hands');
  } catch (err) {
    logError('[gesture] camera failed: ' + (err && err.message ? err.message : err));
    disableGestureMode();
  }
}

function disableGestureMode() {
  const wasActive = inputMode === 'gesture' || mpPumpOn || mpStream;
  inputMode = 'keyboard';
  mpPumpOn = false;
  if (mpStream) { mpStream.getTracks().forEach(tr => { try { tr.stop(); } catch (e) {} }); mpStream = null; }
  if (mpHands) { try { mpHands.close(); } catch (e) {} mpHands = null; }
  try { camVideoEl.srcObject = null; } catch (e) {}
  camPreviewEl.classList.remove('show');
  resetGestureState();
  try { stopHoldProgress(); } catch (e) {}
  syncModeButtons();
  if (wasActive) { refreshHintsForMode(); logOK('[gesture] off, keyboard mode'); }
}

async function pumpFrames() {
  if (mpPumpOn) return;
  mpPumpOn = true;
  while (mpPumpOn && inputMode === 'gesture' && mpHands) {
    const t0 = performance.now();
    try { await mpHands.send({ image: camVideoEl }); } catch (e) { /* skip frame */ }
    const wait = Math.max(0, 33 - (performance.now() - t0));
    await new Promise(r => setTimeout(r, wait));
  }
  mpPumpOn = false;
}

function drawCamPreview(res) {
  const w = camCanvasEl.width, h = camCanvasEl.height;
  camCtx.save();
  camCtx.clearRect(0, 0, w, h);
  camCtx.translate(w, 0); camCtx.scale(-1, 1);   // 镜像：与预览一致
  if (camVideoEl.readyState >= 2) camCtx.drawImage(camVideoEl, 0, 0, w, h);
  const list = res.multiHandLandmarks || [];
  camCtx.strokeStyle = 'rgba(255,210,140,.95)';
  camCtx.lineWidth = 2.5;
  camCtx.fillStyle = 'rgba(255,210,140,.95)';
  for (const lm of list) {
    camCtx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      camCtx.moveTo(lm[a].x * w, lm[a].y * h);
      camCtx.lineTo(lm[b].x * w, lm[b].y * h);
    }
    camCtx.stroke();
    for (const p of lm) {
      camCtx.beginPath();
      camCtx.arc(p.x * w, p.y * h, 3, 0, 6.3);
      camCtx.fill();
    }
  }
  camCtx.restore();
}

// ---- 手势识别状态 ----
const G = {
  prayerMs: 0, prayerGapMs: 0, ringOn: false,
  swipeX0: null, swipeT0: 0, swipeCoolUntil: 0,
  zooming: false, zoomD0: 0, zoomS0: 1,
};
const PRAY_HOLD_MS = 1000;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid2 = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const palmSize = (lm) => Math.max(1e-6, d2(lm[0], lm[9]));
const isPinch = (lm) => d2(lm[4], lm[8]) / palmSize(lm) < 0.45;
const isUpright = (lm) => lm[12].y < lm[0].y - 0.03;
function isPrayerPair(A, B) {
  if (!isUpright(A) || !isUpright(B)) return false;
  if (Math.abs(A[9].y - B[9].y) > 0.18) return false;
  if (d2(A[9], B[9]) > 0.30) return false;
  if (d2(A[8], B[8]) > 0.30) return false;
  return true;
}
function prayerReset() {
  G.prayerMs = 0; G.prayerGapMs = 0;
  if (G.ringOn) {
    G.ringOn = false;
    holdRing.classList.remove('show');
    holdProgress.style.strokeDashoffset = CIRCUMFERENCE;
    setHoldLabel(...holdLabelText());
  }
}
function prayerHold(dt) {
  G.prayerGapMs = 0;
  const active = (currentPhase === PHASE.PHASE1) ||
                 (currentPhase === PHASE.PHASE3 && !blessingShown);
  if (!active) return;
  G.prayerMs += dt * 1000;
  if (!G.ringOn) {
    G.ringOn = true;
    holdRing.classList.add('show');
    setHoldLabel(...holdLabelText());
    holdProgress.style.strokeDashoffset = CIRCUMFERENCE;
  }
  const p = Math.min(G.prayerMs / PRAY_HOLD_MS, 1);
  holdProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - p);
  if (p >= 1) {
    if (currentPhase === PHASE.PHASE1) enterPhase2();
    else showBlessing();
    prayerReset();
  }
}
function prayerNotHeld(dt) {
  G.prayerGapMs += dt * 1000;
  if (G.prayerGapMs > 180) prayerReset();
}
function resetGestureState() {
  G.prayerMs = 0; G.prayerGapMs = 0;
  G.swipeX0 = null; G.swipeCoolUntil = 0;
  G.zooming = false;
  if (G.ringOn) {
    G.ringOn = false;
    try {
      holdRing.classList.remove('show');
      holdProgress.style.strokeDashoffset = CIRCUMFERENCE;
    } catch (e) {}
  }
}
// 手的位置驱动鼠标（金色辉光 / 尘埃 / 擦拭），沿用现有管线
function driveMouseFromHand(pt, dt) {
  if (pt) {
    mouseNDC.x = pt.x * 2 - 1;
    mouseNDC.y = -(pt.y * 2 - 1);
    mouseForceActive = 1.0;
  } else {
    mouseForceActive = Math.max(0, mouseForceActive - dt * 4);
  }
}

function onHandsResults(res) {
  drawCamPreview(res);
  if (inputMode !== 'gesture') return;
  const now = performance.now();
  const dt = lastResultT ? Math.min(0.1, (now - lastResultT) / 1000) : 0.033;
  lastResultT = now;
  const list = res.multiHandLandmarks || [];
  // mx：镜像后的 x，+x = 用户右手方向
  const hands = list.map(lm => ({ lm, px: 1 - lm[9].x, py: lm[9].y }));

  if (hands.length >= 2) {
    const A = hands[0].lm, B = hands[1].lm;
    if (isPinch(A) && isPinch(B)) {
      // ★ 双手捏合 → 缩放模型（只改大小，不动位置）
      prayerReset();
      const d = d2(mid2(A[4], A[8]), mid2(B[4], B[8]));
      if (!G.zooming) { G.zooming = true; G.zoomD0 = d; G.zoomS0 = RENDER_PARAMS.scale; }
      else if (currentPhase === PHASE.PHASE1 && G.zoomD0 > 1e-6 && d > 1e-6) {
        const s = Math.min(1.5, Math.max(0.5, G.zoomS0 * d / G.zoomD0));
        RENDER_PARAMS.scale = s; PHASE1_PARAMS.scale = s; PHASE2_PARAMS.scale = s;
        applyAllRenderParams(); syncSliderUI();
      }
      G.swipeX0 = null;
      driveMouseFromHand(null, dt);
      return;
    }
    G.zooming = false;
    if (isPrayerPair(A, B)) prayerHold(dt);   // ★ 双手合十 → 长按
    else prayerReset();
    G.swipeX0 = null;
    driveMouseFromHand(null, dt);
    return;
  }

  G.zooming = false;
  if (hands.length === 1) {
    const lm = hands[0].lm;
    if (currentPhase === PHASE.PHASE2) {
      // ★ 阶段二：食指指尖代替鼠标擦拭
      prayerReset(); G.swipeX0 = null;
      driveMouseFromHand({ x: 1 - lm[8].x, y: lm[8].y }, dt);
      return;
    }
    // ★ 单手左右滑动：阶段一 = 切换模型（= 点击空格）；
    //   阶段三（祝福卡已现）= 回到阶段一（= 点击空格）
    const px = 1 - lm[9].x;
    const canSwipe = (currentPhase === PHASE.PHASE1) ||
                     (currentPhase === PHASE.PHASE3 && blessingShown);
    if (canSwipe) {
      if (G.swipeX0 === null) { G.swipeX0 = px; G.swipeT0 = now; }
      else {
        const dx = px - G.swipeX0, span = now - G.swipeT0;
        if (now >= G.swipeCoolUntil && span < 800 && Math.abs(dx) > 0.28) {
          if (currentPhase === PHASE.PHASE1) {
            switchTo((currentIndex + (dx > 0 ? 1 : BUDDHAS.length - 1)) % BUDDHAS.length);
          } else {
            exitPhase3();
          }
          G.swipeCoolUntil = now + 1000;
          G.swipeX0 = null;
        } else if (span >= 800) { G.swipeX0 = px; G.swipeT0 = now; }
      }
    } else {
      G.swipeX0 = null;
    }
    prayerNotHeld(dt);
    driveMouseFromHand({ x: 1 - lm[9].x, y: lm[9].y }, dt);
    return;
  }

  prayerNotHeld(dt);
  G.swipeX0 = null;
  driveMouseFromHand(null, dt);
}

modeSwitchEl.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === 'gesture') enableGestureMode();
    else disableGestureMode();
  });
});
