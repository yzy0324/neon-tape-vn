import { cast, scenes } from './data.js';
import { BgmSynth } from './audio.js';

const SAVE_PREFIX = 'neonTape_';
const SAVE_SCHEMA_VERSION = 2;
const AUTO_SLOT = 'auto';
const TITLE_SCENE = '__TITLE__';
const ROUTE_SCENE_MAP = {
  A: 's10A',
  B: 's10B',
  C: 's10C'
};

const state = {
  current: TITLE_SCENE,
  tendency: { rational: 0, cooperate: 0, explore: 0 },
  log: [],
  routeLock: null,
  choiceHistory: [],
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
  A: {
    name: 'A【玻璃停火】',
    hint: '理性 + 合作 + 保守：你正靠近“信息中介停火线”。',
    target: { rational: 4, cooperate: 4, explore: -3 }
  },
  B: {
    name: 'B【霓虹燃烧】',
    hint: '感性 + 对抗 + 探索：你正靠近“引爆信息战”路线。',
    target: { rational: -4, cooperate: -4, explore: 4 }
  },
  C: {
    name: 'C【磁带群星】',
    hint: '理性感性均衡 + 温和探索：你正靠近“匿名互助节点”路线。',
    target: { rational: 0, cooperate: 1, explore: 2 }
  }
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

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

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

function getSceneText(scene) {
  return typeof scene.text === 'function' ? scene.text({ ...state, score: tendencyPairs() }) : scene.text;
}

function addLog(text) {
  state.log.push(text);
  if (state.log.length > 120) state.log.shift();
}

function toPercent(v) {
  return `${((v + 5) / 10) * 100}%`;
}

function routeDistance(routeKey) {
  const target = ROUTES[routeKey].target;
  const cur = state.tendency;
  const dist = Math.abs(cur.rational - target.rational) + Math.abs(cur.cooperate - target.cooperate) + Math.abs(cur.explore - target.explore);
  if (routeKey === 'C') {
    const balanceBonus = Math.min(2, Math.abs(cur.rational));
    return dist + balanceBonus;
  }
  return dist;
}

function nearestRoute() {
  return Object.keys(ROUTES)
    .map((key) => ({ key, distance: routeDistance(key) }))
    .sort((a, b) => a.distance - b.distance)[0].key;
}

function renderBars() {
  document.getElementById('barLogic').style.width = toPercent(state.tendency.rational);
  document.getElementById('barCoop').style.width = toPercent(state.tendency.cooperate);
  document.getElementById('barExplore').style.width = toPercent(state.tendency.explore);

  if (state.routeLock) {
    routeHintEl.textContent = `路线已锁定：${ROUTES[state.routeLock].name}。`;
  } else {
    const route = nearestRoute();
    routeHintEl.textContent = `路线趋近提示：${ROUTES[route].hint}`;
  }
}

function renderLog() {
  logPanelEl.textContent = state.log.join('\n\n');
  logPanelEl.scrollTop = logPanelEl.scrollHeight;
}

function setSaveStatus(text) {
  saveStatusEl.textContent = text;
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

function lockRoute() {
  state.routeLock = nearestRoute();
  addLog(`[系统] 终章路线锁定：${ROUTES[state.routeLock].name}`);
}

function makeSavePayload() {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    sceneId: state.current,
    tendency: state.tendency,
    log: state.log,
    unlockedEndings: state.unlockedEndings,
    bgmEnabled: state.bgmEnabled,
    bgmVolume: state.bgmVolume,
    routeLock: state.routeLock,
    choiceHistory: state.choiceHistory,
    savedAt: new Date().toISOString()
  };
}

function normalizeLegacyScore(score = {}) {
  const rational = clamp((score.logic || 0) - (score.emotion || 0), -5, 5);
  const cooperate = clamp((score.coop || 0) - (score.oppose || 0), -5, 5);
  const explore = clamp((score.explore || 0) - (score.preserve || 0), -5, 5);
  return { rational, cooperate, explore };
}

function parseSaveData(rawData) {
  const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  if (!data || typeof data !== 'object') throw new Error('存档格式无效');

  const normalized = {
    schemaVersion: Number.isInteger(data.schemaVersion) ? data.schemaVersion : 1,
    sceneId: typeof data.sceneId === 'string' ? data.sceneId : (data.current || 's00'),
    tendency: data.tendency || normalizeLegacyScore(data.score),
    log: Array.isArray(data.log) ? data.log : [],
    unlockedEndings: Array.isArray(data.unlockedEndings) ? data.unlockedEndings.filter((r) => ROUTES[r]) : [],
    bgmEnabled: typeof data.bgmEnabled === 'boolean' ? data.bgmEnabled : !!data.bgmOn,
    bgmVolume: clamp(typeof data.bgmVolume === 'number' ? data.bgmVolume : 0.5, 0, 1),
    routeLock: data.routeLock && ROUTES[data.routeLock] ? data.routeLock : null,
    choiceHistory: Array.isArray(data.choiceHistory) ? data.choiceHistory : []
  };

  normalized.tendency = {
    rational: clamp(Number(normalized.tendency.rational) || 0, -5, 5),
    cooperate: clamp(Number(normalized.tendency.cooperate) || 0, -5, 5),
    explore: clamp(Number(normalized.tendency.explore) || 0, -5, 5)
  };

  if (normalized.schemaVersion > SAVE_SCHEMA_VERSION) {
    addLog('[系统] 检测到更高版本存档，已按兼容模式读取。');
  }

  return normalized;
}

function applySaveData(data) {
  state.current = data.sceneId;
  state.tendency = data.tendency;
  state.log = data.log;
  state.unlockedEndings = data.unlockedEndings;
  state.bgmEnabled = data.bgmEnabled;
  state.bgmVolume = data.bgmVolume;
  state.routeLock = data.routeLock;
  state.choiceHistory = data.choiceHistory;
  synth.setVolume(state.bgmVolume);
  updateBgmUI();
}

function save(slot) {
  localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(makeSavePayload()));
}

function autoSave(isEnd) {
  save(AUTO_SLOT);
  if (isEnd) save('ending');
}

function showTitle() {
  state.current = TITLE_SCENE;
  state.routeLock = null;
  titleEl.textContent = '标题：NEON TAPE_017';
  storyEl.innerHTML = '雨夜、磁带、三方倒计时。\n\n你是酒吧“太阳雨”的夜班调酒师，也是匿名情报中继点。\n请选择开始新卷，或读取旧存档继续。';
  choiceEl.innerHTML = '';
  const startBtn = document.createElement('button');
  startBtn.textContent = '开始新卷';
  startBtn.onclick = resetGame;
  choiceEl.appendChild(startBtn);
  bgLayerEl.style.background = bgStyles.bar;
  const c = cast.zero;
  portraitEl.src = c.img;
  charInfoEl.textContent = `${c.name}｜${c.desc}`;
  renderBars();
  renderLog();
  updateBgmUI();
}

function showEnding(route) {
  const endings = {
    A: {
      title: '结局A【玻璃停火】',
      text: '黎明前 03:17，你把“回声井”证据与审计密钥拆成三方共签版本：企业法务、街区诊所联盟、执法监察处必须同屏确认后才能解封。\n\n此前被你留在日志里的“常温水订单 #A-17”终于派上用场——那是韩铬在巡逻线外留下的生命线清单。你优先释放医院与供电修复…核验真相”的中介。城市迎来脆弱停火，而你的私人频道永远失去匿名性——你把情感与关系压成代价，换来清晨没有燃烧的天际线。'
    },
    B: {
      title: '结局B【霓虹燃烧】',
      text: '你在 03:19 把全部镜像日志推上广告塔：订单、实验名单、封锁脚本、清洗指令一次性公开。\n\n曾在吧台前回头的 NPC——那位只点“无糖极昼”的静默快递员——把最后一段缺失密钥送了回来。你认出那正是 s04 后厨里缺掉的“订单追踪盐值”，补全后，整座城都能验证你没有伪造任何一行。\n\n信息战被瞬间点燃，街区在混乱中挣到短暂自由。公司主系统被迫熄火，执法链路切换到应急网，旧秩序像玻璃一样碎裂。你本人被标记为最高优先级异常体：肉身档案被系统抹除，而意识片段被上传到地下镜像。后来人只在涂鸦墙读到一句话——“零磁仍在转发”。'
    },
    C: {
      title: '结局C【磁带群星】',
      text: '你没有把密钥交给任何单一中心，也没有引爆全城。你把酒吧改造成“匿名互助节点”，让每位来客用一次点单换一次可验证记忆写入。\n\n最早在 s00 出现的那串匿名订单前缀，被你定义成档案索引规则；s05 里留存的受害者语音日志，成为第一批公开条目；而在 s08 高峰期回来的志愿者 NPC 们，则轮班担任节点校验员。\n\n理性与感性在这里不再互斥：证据要可验，叙述也要被听见。你把探索冲动压到“可持续冒险”的阈值内，避免再造一个新中心。数月后，“太阳雨”酒吧在地图上仍只是小点，但它连出的去中心化记忆网像磁带群星，照亮了许多原本会被抹去的名字。'
    }
  };
  const end = endings[route];
  if (!state.unlockedEndings.includes(route)) state.unlockedEndings.push(route);
  addLog(`[结局] ${end.title}`);
  titleEl.textContent = '结局回放';
  const historyHtml = state.choiceHistory
    .slice(-8)
    .map((item, idx) => `<li>${idx + 1}. <strong>${item.scene}</strong>：${item.choice}</li>`)
    .join('');
  storyEl.innerHTML = `<div style="color:#ffe38b;font-size:24px;margin-bottom:12px;">${end.title}</div><div>${end.text}</div><hr style="border-color:rgba(255,225,170,.4);margin:18px 0;"><div style="font-size:14px;color:#ffdca7;">关键选择回顾：</div><ol>${historyHtml || '<li>暂无可回顾选择。</li>'}</ol><div style="margin-top:8px;color:#9df3df;font-size:13px;">已解锁结局：${state.unlockedEndings.join(' / ') || '无'}</div>`;
  choiceEl.innerHTML = '';
  const titleBtn = document.createElement('button');
  titleBtn.textContent = '返回标题';
  titleBtn.onclick = showTitle;
  const restartBtn = document.createElement('button');
  restartBtn.textContent = '直接重开';
  restartBtn.onclick = resetGame;
  choiceEl.append(titleBtn, restartBtn);
  renderLog();
  autoSave(true);
}

function renderScene() {
  if (state.current === TITLE_SCENE) return showTitle();
  if (state.current === 'END') return showEnding(state.routeLock || nearestRoute());

  const scene = scenes[state.current];
  if (!scene) {
    addLog('[系统] 存档场景不存在，已回退到标题。');
    return showTitle();
  }
  const text = getSceneText(scene);

  titleEl.textContent = scene.title;
  storyEl.textContent = text;
  bgLayerEl.style.background = bgStyles[scene.bg] || bgStyles.bar;

  const c = cast[scene.speaker];
  portraitEl.src = c.img;
  charInfoEl.textContent = `${c.name}｜${c.desc}`;

  addLog(`[${scene.title}]\n${text}`);
  renderLog();
  renderBars();

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

  autoSave(false);
}

function load(slot) {
  const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`) || localStorage.getItem(`${SAVE_PREFIX}${AUTO_SLOT}`);
  if (!raw) {
    alert('没有可读取的存档，将从开头开始。');
    return;
  }
  try {
    const parsed = parseSaveData(raw);
    applySaveData(parsed);
    renderScene();
    setSaveStatus(`已读取 ${slot.toUpperCase()}，schema v${parsed.schemaVersion}`);
  } catch (_err) {
    alert('存档损坏或格式不兼容。');
  }
}

function resetGame() {
  state.current = 's00';
  state.tendency = { rational: 0, cooperate: 0, explore: 0 };
  state.log = ['[系统] 新的一卷磁带开始转动。'];
  state.routeLock = null;
  state.choiceHistory = [];
  renderScene();
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  saveTextEl.value = text;
  saveTextEl.select();
  document.execCommand('copy');
}

function exportSave(slot) {
  const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`);
  if (!raw) {
    setSaveStatus(`槽位 ${slot.toUpperCase()} 没有存档。`);
    return;
  }
  saveTextEl.value = raw;
  copyToClipboard(raw)
    .then(() => setSaveStatus(`已导出 ${slot.toUpperCase()} 到文本框并复制剪贴板。`))
    .catch(() => setSaveStatus(`已导出 ${slot.toUpperCase()} 到文本框，剪贴板复制失败。`));
}

function importSave(slot) {
  const raw = saveTextEl.value.trim();
  if (!raw) {
    setSaveStatus('请先在文本框粘贴存档 JSON。');
    return;
  }
  try {
    const parsed = parseSaveData(raw);
    localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify({ ...parsed, schemaVersion: SAVE_SCHEMA_VERSION }));
    setSaveStatus(`导入成功：${slot.toUpperCase()}（已兼容为 schema v${SAVE_SCHEMA_VERSION}）`);
  } catch (_err) {
    setSaveStatus('导入失败：JSON 格式错误或字段缺失。');
  }
}

function toggleSavePanel() {
  savePanelEl.classList.toggle('open');
}

function wireSaveControls() {
  document.querySelectorAll('[data-save]').forEach((btn) => {
    btn.onclick = () => {
      save(btn.dataset.save);
      setSaveStatus(`已保存到 ${btn.dataset.save.toUpperCase()}`);
    };
  });
  document.querySelectorAll('[data-load]').forEach((btn) => {
    btn.onclick = () => load(btn.dataset.load);
  });
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.onclick = () => exportSave(btn.dataset.export);
  });
  document.querySelectorAll('[data-import]').forEach((btn) => {
    btn.onclick = () => importSave(btn.dataset.import);
  });
}

function bootFromAutoSave() {
  const raw = localStorage.getItem(`${SAVE_PREFIX}${AUTO_SLOT}`);
  if (!raw) {
    showTitle();
    return;
  }
  try {
    const parsed = parseSaveData(raw);
    applySaveData(parsed);
    renderScene();
    setSaveStatus(`已自动恢复 AUTO（schema v${parsed.schemaVersion}）`);
  } catch (_err) {
    setSaveStatus('自动存档损坏，已回到标题页。');
    showTitle();
  }
}

document.getElementById('resetBtn').onclick = resetGame;
document.getElementById('savePanelBtn').onclick = toggleSavePanel;
document.getElementById('savePanelClose').onclick = toggleSavePanel;
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

wireSaveControls();
updateBgmUI();
bootFromAutoSave();
