import { PORTRAIT_SIZE, cast } from './data.js';
import { scenes } from '../data/story.js';
import { BgmSynth } from './audio.js';
import { renderDrinkPanel } from './drink.js';

const SAVE_PREFIX = 'neonTape_';
const SAVE_SCHEMA_VERSION = 3;
const AUTO_SLOT = 'auto';
const TITLE_SCENE = '__TITLE__';
const ROUTE_SCENE_MAP = { A: 's10A', B: 's10B', C: 's10C' };

const state = {
  current: TITLE_SCENE,
  tendency: { rational: 0, cooperate: 0, explore: 0 },
  flags: {},
  log: [],
  routeLock: null,
  choiceHistory: [],
  orderHistory: [],
  orderDrafts: {},
  unlockedEndings: [],
  bgmEnabled: false,
  bgmVolume: 0.5
};

const bgStyles = {
  bar: 'radial-gradient(circle at 20% 20%, rgba(255,130,170,.25), transparent 45%), linear-gradient(135deg, rgba(68,31,110,.25), rgba(11,6,30,.65))',
  corp: 'linear-gradient(135deg, rgba(80,220,255,.22), rgba(24,30,76,.62))',
  alley: 'linear-gradient(135deg, rgba(122,82,255,.22), rgba(15,9,40,.7))',
  street: 'linear-gradient(135deg, rgba(255,156,88,.2), rgba(8,7,28,.7))',
  backroom: 'linear-gradient(135deg, rgba(140,255,211,.2), rgba(15,8,34,.72))',
  dawn: 'linear-gradient(135deg, rgba(255,190,110,.25), rgba(70,30,80,.65))'
};

const ROUTES = {
  A: { name: 'A【玻璃停火】', hint: '理性 + 合作 + 保守：你正靠近“信息中介停火线”。', target: { rational: 4, cooperate: 4, explore: -3 } },
  B: { name: 'B【霓虹燃烧】', hint: '感性 + 对抗 + 探索：你正靠近“引爆信息战”路线。', target: { rational: -4, cooperate: -4, explore: 4 } },
  C: { name: 'C【磁带群星】', hint: '理性感性均衡 + 温和探索：你正靠近“匿名互助节点”路线。', target: { rational: 0, cooperate: 1, explore: 2 } }
};

const storyEl = document.getElementById('story');
const choiceEl = document.getElementById('choices');
const titleEl = document.getElementById('sceneTitle');
const portraitEl = document.getElementById('portrait');
const charInfoEl = document.getElementById('charInfo');
const logPanelEl = document.getElementById('logPanel');
const bgLayerEl = document.getElementById('bgLayer');
const bgmBtn = document.getElementById('bgmBtn');
const routeHintEl = document.getElementById('routeHint');
const savePanelEl = document.getElementById('savePanel');
const saveStatusEl = document.getElementById('saveStatus');
const saveTextEl = document.getElementById('saveTransferText');
const volumeSlider = document.getElementById('bgmVolume');
const volumeLabel = document.getElementById('bgmVolumeLabel');
const synth = new BgmSynth();

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

function tendencyPairs() {
  return {
    rational: state.tendency.rational,
    emotional: -state.tendency.rational,
    cooperate: state.tendency.cooperate,
    confront: -state.tendency.cooperate,
    explore: state.tendency.explore,
    conserve: -state.tendency.explore
  };
}

function addLog(text) {
  state.log.push(text);
  if (state.log.length > 140) state.log.shift();
}

function renderLog() {
  logPanelEl.textContent = state.log.join('\n\n');
  logPanelEl.scrollTop = logPanelEl.scrollHeight;
}

function toPercent(v) {
  return `${((v + 5) / 10) * 100}%`;
}

function routeDistance(routeKey) {
  const target = ROUTES[routeKey].target;
  const cur = state.tendency;
  return Math.abs(cur.rational - target.rational) + Math.abs(cur.cooperate - target.cooperate) + Math.abs(cur.explore - target.explore);
}

function nearestRoute() {
  return Object.keys(ROUTES).map((key) => ({ key, distance: routeDistance(key) })).sort((a, b) => a.distance - b.distance)[0].key;
}

function renderBars() {
  document.getElementById('barLogic').style.width = toPercent(state.tendency.rational);
  document.getElementById('barCoop').style.width = toPercent(state.tendency.cooperate);
  document.getElementById('barExplore').style.width = toPercent(state.tendency.explore);
  routeHintEl.textContent = state.routeLock ? `路线已锁定：${ROUTES[state.routeLock].name}。` : `路线趋近提示：${ROUTES[nearestRoute()].hint}`;
}

function updateBgmUI() {
  bgmBtn.textContent = state.bgmEnabled ? '关闭 BGM' : '开启 BGM';
  volumeSlider.value = String(Math.round(state.bgmVolume * 100));
  volumeLabel.textContent = `${Math.round(state.bgmVolume * 100)}%`;
}

function applyEffect(effect = {}) {
  Object.entries(effect).forEach(([k, v]) => {
    if (k === 'logic') state.tendency.rational = clamp(state.tendency.rational + v, -5, 5);
    if (k === 'emotion') state.tendency.rational = clamp(state.tendency.rational - v, -5, 5);
    if (k === 'coop') state.tendency.cooperate = clamp(state.tendency.cooperate + v, -5, 5);
    if (k === 'oppose') state.tendency.cooperate = clamp(state.tendency.cooperate - v, -5, 5);
    if (k === 'explore') state.tendency.explore = clamp(state.tendency.explore + v, -5, 5);
    if (k === 'preserve') state.tendency.explore = clamp(state.tendency.explore - v, -5, 5);
  });
}

function setPortrait(character, expression = 'neutral') {
  const nextSrc = character?.portraits?.[expression] || character?.portraits?.neutral;
  if (!nextSrc || portraitEl.dataset.srcCache === nextSrc) return;
  portraitEl.style.width = `${PORTRAIT_SIZE.width}px`;
  portraitEl.style.height = `${PORTRAIT_SIZE.height}px`;
  portraitEl.classList.add('portrait-switching');
  const preloader = new Image();
  preloader.src = nextSrc;
  preloader.onload = () => {
    portraitEl.src = nextSrc;
    portraitEl.dataset.srcCache = nextSrc;
    requestAnimationFrame(() => portraitEl.classList.remove('portrait-switching'));
  };
}

function lockRoute() {
  state.routeLock = nearestRoute();
  addLog(`[系统] 终章路线锁定：${ROUTES[state.routeLock].name}`);
}

function makeSavePayload() {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    sceneId: state.current,
    tendency: state.tendency,
    flags: state.flags,
    log: state.log,
    unlockedEndings: state.unlockedEndings,
    bgmEnabled: state.bgmEnabled,
    bgmVolume: state.bgmVolume,
    routeLock: state.routeLock,
    choiceHistory: state.choiceHistory,
    orderHistory: state.orderHistory,
    orderDrafts: state.orderDrafts,
    savedAt: new Date().toISOString()
  };
}

function normalizeLegacyScore(score = {}) {
  return {
    rational: clamp((score.logic || 0) - (score.emotion || 0), -5, 5),
    cooperate: clamp((score.coop || 0) - (score.oppose || 0), -5, 5),
    explore: clamp((score.explore || 0) - (score.preserve || 0), -5, 5)
  };
}

function parseSaveData(rawData) {
  const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  const normalized = {
    schemaVersion: Number.isInteger(data.schemaVersion) ? data.schemaVersion : 1,
    sceneId: typeof data.sceneId === 'string' ? data.sceneId : (data.current || 's00'),
    tendency: data.tendency || normalizeLegacyScore(data.score),
    flags: data.flags && typeof data.flags === 'object' ? data.flags : {},
    log: Array.isArray(data.log) ? data.log : [],
    unlockedEndings: Array.isArray(data.unlockedEndings) ? data.unlockedEndings.filter((r) => ROUTES[r]) : [],
    bgmEnabled: typeof data.bgmEnabled === 'boolean' ? data.bgmEnabled : !!data.bgmOn,
    bgmVolume: clamp(typeof data.bgmVolume === 'number' ? data.bgmVolume : 0.5, 0, 1),
    routeLock: data.routeLock && ROUTES[data.routeLock] ? data.routeLock : null,
    choiceHistory: Array.isArray(data.choiceHistory) ? data.choiceHistory : [],
    orderHistory: Array.isArray(data.orderHistory) ? data.orderHistory : [],
    orderDrafts: data.orderDrafts && typeof data.orderDrafts === 'object' ? data.orderDrafts : {}
  };
  normalized.tendency = {
    rational: clamp(Number(normalized.tendency.rational) || 0, -5, 5),
    cooperate: clamp(Number(normalized.tendency.cooperate) || 0, -5, 5),
    explore: clamp(Number(normalized.tendency.explore) || 0, -5, 5)
  };
  return normalized;
}

function applySaveData(data) {
  state.current = data.sceneId;
  state.tendency = data.tendency;
  state.flags = data.flags;
  state.log = data.log;
  state.unlockedEndings = data.unlockedEndings;
  state.bgmEnabled = data.bgmEnabled;
  state.bgmVolume = data.bgmVolume;
  state.routeLock = data.routeLock;
  state.choiceHistory = data.choiceHistory;
  state.orderHistory = data.orderHistory;
  state.orderDrafts = data.orderDrafts;
  synth.setVolume(state.bgmVolume);
  updateBgmUI();
}

function save(slot) { localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(makeSavePayload())); }
function autoSave(isEnd) { save(AUTO_SLOT); if (isEnd) save('ending'); }

function showTitle() {
  state.current = TITLE_SCENE;
  state.routeLock = null;
  titleEl.textContent = '标题：NEON TAPE_017';
  storyEl.textContent = '雨夜、磁带、三方倒计时。\n\n你是酒吧“太阳雨”的夜班调酒师，也是匿名情报中继点。\n请选择开始新卷，或读取旧存档继续。';
  choiceEl.innerHTML = '';
  const startBtn = document.createElement('button');
  startBtn.textContent = '开始新卷';
  startBtn.onclick = resetGame;
  choiceEl.appendChild(startBtn);
  bgLayerEl.style.background = bgStyles.bar;
  setPortrait(cast.zero, 'neutral');
  charInfoEl.textContent = `${cast.zero.name}｜${cast.zero.desc}`;
  renderBars();
  renderLog();
}

function showEnding(route) {
  const endings = {
    A: { title: '结局A【玻璃停火】', text: '你让“可审计饮品日志 + 证据链”成为停火凭据。城市在脆弱平衡里撑过黎明。' },
    B: { title: '结局B【霓虹燃烧】', text: '你把整夜订单和证据同时公开，真相照亮街区，也烧穿旧秩序。' },
    C: { title: '结局C【磁带群星】', text: '你把吧台变成去中心化记忆节点，每一次点单都能写入可验证证词。' }
  };
  const end = endings[route];
  if (!state.unlockedEndings.includes(route)) state.unlockedEndings.push(route);
  addLog(`[结局] ${end.title}`);
  titleEl.textContent = '结局回放';
  const historyHtml = state.choiceHistory.slice(-8).map((item, idx) => `<li>${idx + 1}. <strong>${item.scene}</strong>：${item.choice}</li>`).join('');
  storyEl.innerHTML = `<div style="color:#ffe38b;font-size:24px;margin-bottom:12px;">${end.title}</div><div>${end.text}</div><hr style="border-color:rgba(255,225,170,.4);margin:18px 0;"><div style="font-size:14px;color:#ffdca7;">关键选择回顾：</div><ol>${historyHtml || '<li>暂无可回顾选择。</li>'}</ol><div style="margin-top:8px;color:#9df3df;font-size:13px;">已解锁结局：${state.unlockedEndings.join(' / ') || '无'}</div>`;
  choiceEl.innerHTML = '';
  const titleBtn = document.createElement('button');
  titleBtn.textContent = '返回标题';
  titleBtn.onclick = showTitle;
  choiceEl.appendChild(titleBtn);
  renderLog();
  autoSave(true);
}

function getSceneText(scene) {
  return typeof scene.text === 'function' ? scene.text({ ...state, score: tendencyPairs() }) : scene.text;
}

function resolveOrderEffect(scene, payload) {
  const match = (scene.effects || []).find((item) => item.when({ ...payload, state, score: tendencyPairs() }));
  if (!match) return;
  applyEffect(match.effect);
  state.flags = { ...state.flags, ...(match.setFlags || {}) };
  addLog(`↳ 反馈：${match.reply}`);
}

function renderOrderScene(scene) {
  const draft = state.orderDrafts[state.current] || { drinkId: 'sunless-zero', extraIds: [] };
  renderDrinkPanel(choiceEl, scene, draft, (nextDraft) => {
    state.orderDrafts[state.current] = nextDraft;
    autoSave(false);
  }, (payload) => {
    resolveOrderEffect(scene, payload);
    state.orderHistory.push({ npc: scene.npcKey || scene.speaker, drink: payload.drink.name, extras: payload.extras.map((item) => item.name) });
    state.choiceHistory.push({ scene: scene.title, choice: `给 ${cast[scene.speaker].name}：${payload.drink.name}` });
    addLog(`🍸 给了${cast[scene.speaker].name}：${payload.drink.name}${payload.extras.length ? ` + ${payload.extras.map((item) => item.name).join(' / ')}` : ''}`);
    state.current = scene.next;
    renderScene();
  });
}

function renderChoiceScene(scene, text) {
  choiceEl.innerHTML = '';
  scene.choices.forEach((ch) => {
    if (ch.condition && !ch.condition({ ...state, score: tendencyPairs() })) return;
    const btn = document.createElement('button');
    btn.textContent = ch.text;
    btn.onclick = () => {
      applyEffect(ch.effect);
      state.choiceHistory.push({ scene: scene.title, choice: ch.text });
      addLog(`▶ ${ch.text}`);
      if (ch.routeLock) {
        lockRoute();
        state.current = ROUTE_SCENE_MAP[state.routeLock];
      } else {
        state.current = ch.next;
      }
      renderScene();
    };
    choiceEl.appendChild(btn);
  });
}

function renderScene() {
  if (state.current === TITLE_SCENE) return showTitle();
  if (state.current === 'END') return showEnding(state.routeLock || nearestRoute());
  const scene = scenes[state.current];
  if (!scene) return showTitle();

  titleEl.textContent = scene.title;
  storyEl.textContent = getSceneText(scene) || '';
  bgLayerEl.style.background = bgStyles[scene.bg] || bgStyles.bar;
  const c = cast[scene.speaker];
  setPortrait(c, scene.expression || 'neutral');
  charInfoEl.textContent = `${c.name}｜${c.desc}`;

  addLog(`[${scene.title}]\n${storyEl.textContent}`);
  renderLog();
  renderBars();

  if (scene.type === 'order') {
    renderOrderScene(scene);
  } else {
    renderChoiceScene(scene);
  }

  autoSave(false);
}

function load(slot) {
  const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`) || localStorage.getItem(`${SAVE_PREFIX}${AUTO_SLOT}`);
  if (!raw) return alert('没有可读取的存档，将从开头开始。');
  try {
    const parsed = parseSaveData(raw);
    applySaveData(parsed);
    renderScene();
    saveStatusEl.textContent = `已读取 ${slot.toUpperCase()}，schema v${parsed.schemaVersion}`;
  } catch (_err) {
    alert('存档损坏或格式不兼容。');
  }
}

function resetGame() {
  state.current = 's00';
  state.tendency = { rational: 0, cooperate: 0, explore: 0 };
  state.flags = {};
  state.log = ['[系统] 新的一卷磁带开始转动。'];
  state.routeLock = null;
  state.choiceHistory = [];
  state.orderHistory = [];
  state.orderDrafts = {};
  renderScene();
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  saveTextEl.value = text;
  saveTextEl.select();
  document.execCommand('copy');
}

function exportSave(slot) {
  const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`);
  if (!raw) return (saveStatusEl.textContent = `槽位 ${slot.toUpperCase()} 没有存档。`);
  saveTextEl.value = raw;
  copyToClipboard(raw)
    .then(() => (saveStatusEl.textContent = `已导出 ${slot.toUpperCase()} 到文本框并复制剪贴板。`))
    .catch(() => (saveStatusEl.textContent = `已导出 ${slot.toUpperCase()} 到文本框，剪贴板复制失败。`));
}

function importSave(slot) {
  const raw = saveTextEl.value.trim();
  if (!raw) return (saveStatusEl.textContent = '请先在文本框粘贴存档 JSON。');
  try {
    const parsed = parseSaveData(raw);
    localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify({ ...parsed, schemaVersion: SAVE_SCHEMA_VERSION }));
    saveStatusEl.textContent = `导入成功：${slot.toUpperCase()}（已兼容为 schema v${SAVE_SCHEMA_VERSION}）`;
  } catch (_err) {
    saveStatusEl.textContent = '导入失败：JSON 格式错误或字段缺失。';
  }
}

document.getElementById('resetBtn').onclick = resetGame;
document.getElementById('savePanelBtn').onclick = () => savePanelEl.classList.toggle('open');
document.getElementById('savePanelClose').onclick = () => savePanelEl.classList.toggle('open');
volumeSlider.oninput = () => {
  state.bgmVolume = clamp(Number(volumeSlider.value) / 100, 0, 1);
  synth.setVolume(state.bgmVolume);
  updateBgmUI();
  autoSave(false);
};
bgmBtn.onclick = async () => {
  if (!synth.on) {
    await synth.start();
    synth.setVolume(state.bgmVolume);
    state.bgmEnabled = true;
  } else {
    synth.stop();
    state.bgmEnabled = false;
  }
  updateBgmUI();
  autoSave(false);
};

document.querySelectorAll('[data-save]').forEach((btn) => { btn.onclick = () => { save(btn.dataset.save); saveStatusEl.textContent = `已保存到 ${btn.dataset.save.toUpperCase()}`; }; });
document.querySelectorAll('[data-load]').forEach((btn) => { btn.onclick = () => load(btn.dataset.load); });
document.querySelectorAll('[data-export]').forEach((btn) => { btn.onclick = () => exportSave(btn.dataset.export); });
document.querySelectorAll('[data-import]').forEach((btn) => { btn.onclick = () => importSave(btn.dataset.import); });

updateBgmUI();
const autoRaw = localStorage.getItem(`${SAVE_PREFIX}${AUTO_SLOT}`);
if (autoRaw) {
  try {
    applySaveData(parseSaveData(autoRaw));
    renderScene();
    saveStatusEl.textContent = '已自动恢复 AUTO。';
  } catch (_err) {
    showTitle();
  }
} else {
  showTitle();
}
