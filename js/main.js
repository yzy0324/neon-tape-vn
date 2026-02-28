import { PORTRAIT_SIZE, cast } from './data.js';
import { scenes } from '../data/story.js';
import { BgmSynth } from './audio.js';
import { renderDrinkPanel } from './drink.js';
import { IMPORTANT_FLAG_META, applyStateDelta, createInitialState, hasCondition, normalizeState } from './state.js';

const SAVE_PREFIX = 'neonTape_';
const SAVE_SCHEMA_VERSION = 8;
const AUTO_SLOT = 'auto';
const TITLE_SCENE = '__TITLE__';
const META_ARCHIVE_KEY = `${SAVE_PREFIX}endingArchive`;
const AUDIO_SETTINGS_KEY = `${SAVE_PREFIX}audioSettings`;
const REPLAY_SLOT = 'slot3';
const ROUTE_SCENE_MAP = { A: 's10A', B: 's10B', C: 's10C' };
const TYPEWRITER_SPEED = 24;
const AUTO_ADVANCE_DELAY = 850;
const SKIP_ADVANCE_DELAY = 120;
const HISTORY_LIMIT = 60;
const HISTORY_PANEL_LIMIT = 40;
const ROUTE_DIAG_LIMIT = 8;
const PRE_END_SCENE_ID = 's09';

const state = createInitialState();

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
const routeForecastEl = document.getElementById('routeForecast');
const routeDiagnosisListEl = document.getElementById('routeDiagnosisList');
const savePanelEl = document.getElementById('savePanel');
const saveStatusEl = document.getElementById('saveStatus');
const saveTextEl = document.getElementById('saveTransferText');
const volumeSlider = document.getElementById('bgmVolume');
const volumeLabel = document.getElementById('bgmVolumeLabel');
const masterVolumeSlider = document.getElementById('masterVolume');
const masterVolumeLabel = document.getElementById('masterVolumeLabel');
const musicVolumeSlider = document.getElementById('musicVolume');
const musicVolumeLabel = document.getElementById('musicVolumeLabel');
const ambienceVolumeSlider = document.getElementById('ambienceVolume');
const ambienceVolumeLabel = document.getElementById('ambienceVolumeLabel');
const sfxVolumeSlider = document.getElementById('sfxVolume');
const sfxVolumeLabel = document.getElementById('sfxVolumeLabel');
const musicToggle = document.getElementById('musicToggle');
const ambienceToggle = document.getElementById('ambienceToggle');
const sfxToggle = document.getElementById('sfxToggle');
const audioUnlockHint = document.getElementById('audioUnlockHint');
const audioUnlockBtn = document.getElementById('audioUnlockBtn');
const archivePanelEl = document.getElementById('archivePanel');
const archiveBodyEl = document.getElementById('archiveBody');
const endingPanelEl = document.getElementById('endingPanel');
const endingBodyEl = document.getElementById('endingBody');
const showAllBtn = document.getElementById('showAllBtn');
const autoBtn = document.getElementById('autoBtn');
const skipBtn = document.getElementById('skipBtn');
const historyBtn = document.getElementById('historyBtn');
const historyPanelEl = document.getElementById('historyPanel');
const historyBodyEl = document.getElementById('historyBody');
const historyCloseBtn = document.getElementById('historyClose');
const hidePortraitToggle = document.getElementById('hidePortraitToggle');
const compactUiToggle = document.getElementById('compactUiToggle');
const synth = new BgmSynth();

const endingMeta = loadEndingMeta();
const UI_PREFS_KEY = `${SAVE_PREFIX}uiPrefs`;
const replay = { active: false, record: null, index: 0 };
const playback = {
  timer: null,
  fullText: '',
  shownText: '',
  sceneId: null,
  textHash: null,
  typingDone: true,
  auto: false,
  skip: false,
  autoTimer: null
};


function loadEndingMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_ARCHIVE_KEY) || '{}');
    return {
      unlockedEndings: Array.isArray(parsed.unlockedEndings) ? parsed.unlockedEndings.filter((route) => ROUTES[route]) : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : []
    };
  } catch (_err) {
    return { unlockedEndings: [], runs: [] };
  }
}

function persistEndingMeta() {
  localStorage.setItem(META_ARCHIVE_KEY, JSON.stringify(endingMeta));
}

function summarizeEffect(effect = {}) {
  const labels = {
    logic: '理性+', emotion: '感性+', coop: '合作+', oppose: '对抗+', explore: '探索+', preserve: '保守+'
  };
  const parts = Object.entries(effect).map(([k, v]) => `${labels[k] || k}${v}`);
  return parts.length ? parts.join(' / ') : '无倾向变化';
}

function normalizeEffectVector(effect = {}) {
  const safe = effect && typeof effect === 'object' ? effect : {};
  const rational = (Number(safe.logic) || 0) - (Number(safe.emotion) || 0);
  const cooperate = (Number(safe.coop) || 0) - (Number(safe.oppose) || 0);
  const explore = (Number(safe.explore) || 0) - (Number(safe.preserve) || 0);
  return { rational, cooperate, explore };
}

function signedText(value) {
  return value > 0 ? `+${value}` : String(value);
}

function routeDistanceByVector(routeKey, vector) {
  const target = ROUTES[routeKey].target;
  return Math.abs(vector.rational - target.rational) + Math.abs(vector.cooperate - target.cooperate) + Math.abs(vector.explore - target.explore);
}

function buildRouteForecast() {
  const entries = Object.keys(ROUTES).map((key) => ({
    key,
    distance: routeDistanceByVector(key, state.tendencies)
  })).sort((a, b) => a.distance - b.distance);
  const [first, second] = entries;
  const confidence = Math.max(8, Math.min(95, 100 - first.distance * 9));
  return {
    routeCode: first.key,
    confidence,
    spread: second ? second.distance - first.distance : 0
  };
}

function markSceneVisit(sceneId) {
  if (replay.active) return;
  const prev = state.pathHistory[state.pathHistory.length - 1];
  if (prev !== sceneId) state.pathHistory.push(sceneId);
}

function buildRunRecord(route) {
  const keyChoices = state.choiceHistory.slice(-6).map((item) => ({
    sceneId: item.sceneId,
    scene: item.scene,
    choice: item.choice,
    effect: item.effectSummary
  }));
  return {
    route,
    endingName: ROUTES[route].name,
    path: [...state.pathHistory, 'END'],
    keyChoices,
    finishedAt: new Date().toISOString(),
    snapshot: makeSavePayload()
  };
}

function ensureArchiveSync() {
  state.unlockedEndings = [...new Set([...(state.unlockedEndings || []), ...(endingMeta.unlockedEndings || [])])];
  if (!Array.isArray(state.clearedRuns) || state.clearedRuns.length === 0) {
    state.clearedRuns = [...endingMeta.runs];
  }
}

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

function textHash(input = '') {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

function stopTyping() {
  if (playback.timer) clearTimeout(playback.timer);
  playback.timer = null;
  playback.typingDone = true;
}

function stopAutoAdvance() {
  if (playback.autoTimer) clearTimeout(playback.autoTimer);
  playback.autoTimer = null;
}

function isCurrentTextRead() {
  if (!playback.sceneId || !playback.textHash) return false;
  return !!state.readTextHashes[`${playback.sceneId}:${playback.textHash}`];
}

function markCurrentTextRead() {
  if (!playback.sceneId || !playback.textHash) return;
  state.readTextHashes[`${playback.sceneId}:${playback.textHash}`] = true;
}

function appendDialogueHistory(scene, text) {
  if (!scene || !text) return;
  const speaker = cast[scene.speaker]?.name || '旁白';
  const entry = { sceneId: state.current, title: scene.title, speaker, text, at: Date.now() };
  state.dialogueHistory.push(entry);
  if (state.dialogueHistory.length > HISTORY_LIMIT) {
    state.dialogueHistory = state.dialogueHistory.slice(-HISTORY_LIMIT);
  }
}

function renderHistoryPanel() {
  const rows = state.dialogueHistory.slice(-HISTORY_PANEL_LIMIT).reverse();
  historyBodyEl.innerHTML = rows.length
    ? rows.map((item) => `<div class="history-item"><div class="meta">${item.title} · ${item.speaker}</div><div>${item.text}</div></div>`).join('')
    : '<div class="tiny">暂无历史记录</div>';
}

function updatePlaybackButtons() {
  autoBtn.classList.toggle('active', playback.auto);
  skipBtn.classList.toggle('active', playback.skip);
  autoBtn.textContent = playback.auto ? 'Auto: ON' : 'Auto';
  skipBtn.textContent = playback.skip ? 'Skip: ON' : 'Skip';
}

function showFullText() {
  if (!playback.fullText) return;
  stopTyping();
  playback.shownText = playback.fullText;
  storyEl.textContent = playback.fullText;
  markCurrentTextRead();
}

function queueAutoAdvance() {
  stopAutoAdvance();
  if (state.current === TITLE_SCENE || state.current === 'END' || replay.active) return;
  const shouldSkip = playback.skip && isCurrentTextRead();
  if (!playback.auto && !shouldSkip) return;
  if (playback.skip && !isCurrentTextRead()) return;
  const firstButton = choiceEl.querySelector('button');
  if (!firstButton) return;
  playback.autoTimer = setTimeout(() => firstButton.click(), shouldSkip ? SKIP_ADVANCE_DELAY : AUTO_ADVANCE_DELAY);
}

function runTypewriter(scene, text) {
  stopTyping();
  stopAutoAdvance();
  playback.fullText = text || '';
  playback.shownText = '';
  playback.sceneId = state.current;
  playback.textHash = textHash(playback.fullText);
  playback.typingDone = playback.fullText.length === 0;
  const alreadyRead = isCurrentTextRead();

  const instant = playback.skip && alreadyRead;
  if (instant) {
    showFullText();
    queueAutoAdvance();
    return;
  }

  if (!playback.fullText) {
    storyEl.textContent = '';
    markCurrentTextRead();
    queueAutoAdvance();
    return;
  }

  const speed = Math.max(8, TYPEWRITER_SPEED);
  const step = () => {
    if (playback.shownText.length >= playback.fullText.length) {
      stopTyping();
      markCurrentTextRead();
      queueAutoAdvance();
      return;
    }
    playback.shownText = playback.fullText.slice(0, playback.shownText.length + 1);
    storyEl.textContent = playback.shownText;
    playback.timer = setTimeout(step, speed);
  };
  step();
}

function tendencyPairs() {
  return {
    rational: state.tendencies.rational,
    emotional: -state.tendencies.rational,
    cooperate: state.tendencies.cooperate,
    confront: -state.tendencies.cooperate,
    explore: state.tendencies.explore,
    conserve: -state.tendencies.explore
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
  const cur = state.tendencies;
  return Math.abs(cur.rational - target.rational) + Math.abs(cur.cooperate - target.cooperate) + Math.abs(cur.explore - target.explore);
}

function nearestRoute() {
  return Object.keys(ROUTES).map((key) => ({ key, distance: routeDistance(key) })).sort((a, b) => a.distance - b.distance)[0].key;
}

function renderRouteDiagnosis() {
  const recentChoices = (state.choiceHistory || []).slice(-ROUTE_DIAG_LIMIT).reverse();
  if (!recentChoices.length) {
    routeDiagnosisListEl.innerHTML = '<div class="tiny">尚无可诊断路径，做出选择后会显示每一步如何推高/拉低三维倾向。</div>';
    return;
  }
  const html = recentChoices.map((entry, idx) => {
    const delta = entry.tendencyDelta || normalizeEffectVector(entry.effect || {});
    const rows = [
      ['理性', delta.rational],
      ['合作', delta.cooperate],
      ['探索', delta.explore]
    ].map(([label, value]) => {
      const width = `${Math.min(100, Math.max(0, Math.abs(Number(value) || 0) * 24))}%`;
      return `<div class="diag-bar-row"><span>${label}</span><div class="diag-mini"><span style="width:${width}"></span></div><em>${signedText(Number(value) || 0)}</em></div>`;
    }).join('');
    return `<article class="diag-item"><div class="diag-meta">#${idx + 1} ${entry.scene || entry.sceneId || '未知场景'} · ${entry.choice || '未知选项'}</div><div class="diag-bars">${rows}</div></article>`;
  }).join('');
  routeDiagnosisListEl.innerHTML = html;
}

function renderBars() {
  document.getElementById('barLogic').style.width = toPercent(state.tendencies.rational);
  document.getElementById('barCoop').style.width = toPercent(state.tendencies.cooperate);
  document.getElementById('barExplore').style.width = toPercent(state.tendencies.explore);
  const forecast = buildRouteForecast();
  routeHintEl.textContent = state.routeLock ? `路线已锁定：${ROUTES[state.routeLock].name}。` : `路线趋近提示：${ROUTES[forecast.routeCode].hint}`;
  if (state.routeLock) {
    routeForecastEl.textContent = `终章预测：已锁定为代号 ${state.routeLock}。`;
  } else if (state.current === PRE_END_SCENE_ID) {
    routeForecastEl.textContent = `终章预测：代号 ${forecast.routeCode}（置信 ${forecast.confidence}% / 差距 ${forecast.spread}）。提示仅反映倾向分布，不揭示结局名。`;
  } else {
    routeForecastEl.textContent = `终章预测：当前最接近代号 ${forecast.routeCode}（置信 ${forecast.confidence}%）。`;
  }
  renderRouteDiagnosis();
}

function renderArchive() {
  const clues = state.inventory.length ? state.inventory.map((item) => `<li>${item}</li>`).join('') : '<li>暂无线索物品</li>';
  const relRows = Object.entries(state.relations).map(([name, value]) => `<div class="archive-rel"><span>${cast[name]?.name || name}</span><div class="bar"><span style="width:${toPercent(clamp(value, -5, 5))}"></span></div><em>${value}</em></div>`).join('');
  const flagRows = Object.keys(IMPORTANT_FLAG_META)
    .filter((flag) => state.flags[flag])
    .map((flag) => `<li>${IMPORTANT_FLAG_META[flag]}</li>`)
    .join('') || '<li>暂无已解锁关键状态</li>';
  archiveBodyEl.innerHTML = `<div class="tiny">线索 / 物品</div><ul>${clues}</ul><div class="tiny">关键人物关系</div>${relRows}<div class="tiny">已解锁关键状态</div><ul>${flagRows}</ul>`;
}


function renderFlowchart(path = [], runIndex = 0) {
  const card = document.createElement('div');
  card.className = 'flow-card';
  card.innerHTML = '<div class="tiny">流程图（仅展示该次通关路径，点击节点进入回放模式）</div>';
  const width = 680;
  const nodeGap = 52;
  const cols = 6;
  const rows = Math.ceil(path.length / cols) || 1;
  const height = rows * nodeGap + 36;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.classList.add('flow-svg');
  path.forEach((sceneId, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = 40 + col * 105;
    const y = 26 + row * nodeGap;
    if (idx > 0) {
      const prevCol = (idx - 1) % cols;
      const prevRow = Math.floor((idx - 1) / cols);
      const px = 40 + prevCol * 105;
      const py = 26 + prevRow * nodeGap;
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(px));
      line.setAttribute('y1', String(py));
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', 'rgba(255,225,170,.65)');
      line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
    }
    const group = document.createElementNS(svgNS, 'g');
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(x));
    circle.setAttribute('cy', String(y));
    circle.setAttribute('r', '13');
    circle.setAttribute('fill', sceneId === 'END' ? '#ff8a5b' : '#2ff3e0');
    circle.setAttribute('stroke', '#fff2c9');
    circle.setAttribute('stroke-width', '1.5');
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y + 4));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '10');
    text.setAttribute('fill', '#1f0d3b');
    text.textContent = String(idx + 1);
    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', String(x));
    label.setAttribute('y', String(y + 24));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '10');
    label.setAttribute('fill', '#ffe9f3');
    label.textContent = sceneId;
    group.append(circle, text, label);
    group.style.cursor = 'pointer';
    group.addEventListener('click', () => enterReplay(runIndex, idx));
    svg.appendChild(group);
  });
  card.appendChild(svg);
  return card;
}

function renderEndingVault() {
  const unlocked = [...new Set([...(state.unlockedEndings || []), ...(endingMeta.unlockedEndings || [])])];
  const statusHtml = ['A', 'B', 'C'].map((route) => `<li>${route}：${unlocked.includes(route) ? '✅ 已解锁' : '🔒 未解锁'}</li>`).join('');
  const runs = (endingMeta.runs || []).slice().reverse();
  const runsHtml = runs.length
    ? runs.map((run, idx) => {
      const keyRows = (run.keyChoices || []).slice(0, 6).map((item, keyIdx) => `<li>${keyIdx + 1}. <strong>${item.sceneId || item.scene}</strong> · ${item.choice}<br><em>${item.effect || '无倾向变化'}</em></li>`).join('');
      return `<article class="ending-run"><h4>${run.endingName} <span class="tiny">${new Date(run.finishedAt).toLocaleString()}</span></h4><div class="tiny">路径节点：${(run.path || []).length}（需≥12）</div><ol>${keyRows}</ol><button data-replay="${runs.length - 1 - idx}" class="replay-btn">从首节点回放</button></article>`;
    }).join('')
    : '<div class="tiny">尚无通关记录，完成任一结局后将自动归档。</div>';
  endingBodyEl.innerHTML = `<div class="tiny">已解锁结局</div><ul>${statusHtml}</ul><div class="tiny">结局关键选择（每条至少展示 6 个节点）</div>${runsHtml}`;
  runs.forEach((_run, idx) => {
    const btn = endingBodyEl.querySelector(`[data-replay="${runs.length - 1 - idx}"]`);
    if (btn) btn.onclick = () => enterReplay(runs.length - 1 - idx, 0);
  });
  if (endingMeta.runs.length) {
    const latestIndex = endingMeta.runs.length - 1;
    endingBodyEl.appendChild(renderFlowchart(endingMeta.runs[latestIndex].path || [], latestIndex));
  }
}

function enterReplay(runIndex, nodeIndex) {
  const run = endingMeta.runs[runIndex];
  if (!run || !Array.isArray(run.path) || !run.path[nodeIndex]) return;
  replay.active = true;
  replay.record = run;
  replay.index = nodeIndex;
  renderScene();
}

function exitReplay() {
  replay.active = false;
  replay.record = null;
  replay.index = 0;
  renderScene();
}

function createReplayBranchSave() {
  if (!replay.active || !replay.record) return;
  const snapshot = parseSaveData(replay.record.snapshot || {});
  snapshot.current = replay.record.path[replay.index] === 'END' ? 's10A' : replay.record.path[replay.index];
  snapshot.pathHistory = replay.record.path.slice(0, replay.index + 1).filter((id) => id !== 'END');
  localStorage.setItem(`${SAVE_PREFIX}${REPLAY_SLOT}`, JSON.stringify({ ...snapshot, schemaVersion: SAVE_SCHEMA_VERSION }));
  saveStatusEl.textContent = `已创建分支存档：${REPLAY_SLOT.toUpperCase()}（节点 ${snapshot.current}）。`;
}

function renderReplayScene() {
  if (!replay.record) return;
  const sceneId = replay.record.path[replay.index];
  titleEl.textContent = `回放模式 · ${sceneId}`;
  if (sceneId === 'END') {
    storyEl.innerHTML = `<div style="color:#ffe38b;font-size:22px;">回放终点：${replay.record.endingName}</div><div class="tiny">只读回放中，不会写入当前存档。</div>`;
    setPortrait(cast.zero, 'neutral');
    charInfoEl.textContent = '系统｜回放终点';
    bgLayerEl.style.background = bgStyles.dawn;
  } else {
    const scene = scenes[sceneId];
    if (!scene) return;
    const c = cast[scene.speaker];
    const tempState = { ...state, ...(replay.record.snapshot || {}), score: tendencyPairs() };
    storyEl.innerHTML = `<div class="tiny">只读回放，不会改变当前存档。</div>${typeof scene.text === 'function' ? scene.text(tempState) : scene.text}`;
    bgLayerEl.style.background = bgStyles[scene.bg] || bgStyles.bar;
  synth.setAmbienceForScene(scene);
    setPortrait(c, scene.expression || 'neutral');
    charInfoEl.textContent = `${c.name}｜${c.desc}`;
  }
  choiceEl.innerHTML = '';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '上一节点';
  prevBtn.disabled = replay.index <= 0;
  prevBtn.onclick = () => { replay.index -= 1; renderScene(); };
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '下一节点';
  nextBtn.disabled = replay.index >= replay.record.path.length - 1;
  nextBtn.onclick = () => { replay.index += 1; renderScene(); };
  const branchBtn = document.createElement('button');
  branchBtn.textContent = '创建分支存档到 Slot3';
  branchBtn.onclick = createReplayBranchSave;
  const exitBtn = document.createElement('button');
  exitBtn.textContent = '退出回放';
  exitBtn.onclick = exitReplay;
  choiceEl.append(prevBtn, nextBtn, branchBtn, exitBtn);
}

function applyUiPrefs(prefs = {}) {
  const hidePortrait = !!prefs.hidePortrait;
  const compactUi = !!prefs.compactUi;
  document.body.classList.toggle('portrait-hidden', hidePortrait);
  document.body.classList.toggle('ui-compact', compactUi);
  if (hidePortraitToggle) hidePortraitToggle.checked = hidePortrait;
  if (compactUiToggle) compactUiToggle.checked = compactUi;
}

function loadUiPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(UI_PREFS_KEY) || '{}');
    applyUiPrefs(parsed);
  } catch (_err) {
    applyUiPrefs({});
  }
}

function persistUiPrefs() {
  const prefs = {
    hidePortrait: !!hidePortraitToggle?.checked,
    compactUi: !!compactUiToggle?.checked
  };
  localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  applyUiPrefs(prefs);
}

function loadStoredAudioSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) || '{}');
    if (parsed && typeof parsed === 'object') state.audioSettings = normalizeState({ audioSettings: parsed }).audioSettings;
  } catch (_err) {
    state.audioSettings = normalizeState({}).audioSettings;
  }
  synth.applySettings(state.audioSettings);
}

function persistAudioSettings() {
  localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(state.audioSettings));
}

function updateAudioUnlockHint() {
  const shouldShow = state.bgmEnabled && !synth.unlocked;
  audioUnlockHint.classList.toggle('show', shouldShow);
}

function applyAudioSettingsAndPersist() {
  state.audioSettings.music.volume = state.bgmVolume;
  synth.applySettings(state.audioSettings);
  persistAudioSettings();
  autoSave(false);
}

function updateBgmUI() {
  bgmBtn.textContent = state.bgmEnabled ? '关闭音频总线' : '开启音频总线';
  volumeSlider.value = String(Math.round(state.bgmVolume * 100));
  volumeLabel.textContent = `${Math.round(state.bgmVolume * 100)}%`;

  masterVolumeSlider.value = String(Math.round(state.audioSettings.master * 100));
  masterVolumeLabel.textContent = `${Math.round(state.audioSettings.master * 100)}%`;
  musicVolumeSlider.value = String(Math.round(state.audioSettings.music.volume * 100));
  musicVolumeLabel.textContent = `${Math.round(state.audioSettings.music.volume * 100)}%`;
  ambienceVolumeSlider.value = String(Math.round(state.audioSettings.ambience.volume * 100));
  ambienceVolumeLabel.textContent = `${Math.round(state.audioSettings.ambience.volume * 100)}%`;
  sfxVolumeSlider.value = String(Math.round(state.audioSettings.sfx.volume * 100));
  sfxVolumeLabel.textContent = `${Math.round(state.audioSettings.sfx.volume * 100)}%`;

  musicToggle.checked = state.audioSettings.music.enabled;
  ambienceToggle.checked = state.audioSettings.ambience.enabled;
  sfxToggle.checked = state.audioSettings.sfx.enabled;
  updateAudioUnlockHint();
}

function applyEffect(effect = {}) {
  Object.entries(effect).forEach(([k, v]) => {
    if (k === 'logic') state.tendencies.rational = clamp(state.tendencies.rational + v, -5, 5);
    if (k === 'emotion') state.tendencies.rational = clamp(state.tendencies.rational - v, -5, 5);
    if (k === 'coop') state.tendencies.cooperate = clamp(state.tendencies.cooperate + v, -5, 5);
    if (k === 'oppose') state.tendencies.cooperate = clamp(state.tendencies.cooperate - v, -5, 5);
    if (k === 'explore') state.tendencies.explore = clamp(state.tendencies.explore + v, -5, 5);
    if (k === 'preserve') state.tendencies.explore = clamp(state.tendencies.explore - v, -5, 5);
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
    tendency: state.tendencies,
    tendencies: state.tendencies,
    flags: state.flags,
    inventory: state.inventory,
    relations: state.relations,
    log: state.log,
    unlockedEndings: state.unlockedEndings,
    bgmEnabled: state.bgmEnabled,
    bgmVolume: state.bgmVolume,
    audioSettings: state.audioSettings,
    routeLock: state.routeLock,
    choiceHistory: state.choiceHistory,
    orderHistory: state.orderHistory,
    orderDrafts: state.orderDrafts,
    pathHistory: state.pathHistory,
    dialogueHistory: state.dialogueHistory,
    readTextHashes: state.readTextHashes,
    clearedRuns: state.clearedRuns,
    savedAt: new Date().toISOString()
  };
}

function parseSaveData(rawData) {
  const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  const normalized = normalizeState({
    current: typeof data.sceneId === 'string' ? data.sceneId : data.current,
    tendencies: data.tendencies || data.tendency,
    flags: data.flags,
    inventory: data.inventory,
    relations: data.relations,
    log: data.log,
    unlockedEndings: Array.isArray(data.unlockedEndings) ? data.unlockedEndings.filter((r) => ROUTES[r]) : [],
    bgmEnabled: typeof data.bgmEnabled === 'boolean' ? data.bgmEnabled : !!data.bgmOn,
    bgmVolume: clamp(typeof data.bgmVolume === 'number' ? data.bgmVolume : 0.5, 0, 1),
    audioSettings: data.audioSettings,
    routeLock: data.routeLock && ROUTES[data.routeLock] ? data.routeLock : null,
    choiceHistory: data.choiceHistory,
    orderHistory: data.orderHistory,
    orderDrafts: data.orderDrafts,
    pathHistory: data.pathHistory,
    dialogueHistory: data.dialogueHistory,
    readTextHashes: data.readTextHashes,
    clearedRuns: data.clearedRuns
  });
  return { ...normalized, schemaVersion: Number.isInteger(data.schemaVersion) ? data.schemaVersion : 1 };
}

function applySaveData(data) {
  stopTyping();
  stopAutoAdvance();
  Object.assign(state, normalizeState(data));
  state.audioSettings.music.volume = state.bgmVolume;
  synth.applySettings(state.audioSettings);
  persistAudioSettings();
  updateBgmUI();
  ensureArchiveSync();
  renderArchive();
  renderEndingVault();
  renderHistoryPanel();
  updatePlaybackButtons();
}

function save(slot) { localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(makeSavePayload())); }
function autoSave(isEnd) { save(AUTO_SLOT); if (isEnd) save('ending'); }

function showTitle() {
  state.current = TITLE_SCENE;
  state.routeLock = null;
  stopTyping();
  stopAutoAdvance();
  titleEl.textContent = '标题：NEON TAPE_017';
  playback.fullText = '雨夜、磁带、三方倒计时。\n\n你是酒吧“太阳雨”的夜班调酒师，也是匿名情报中继点。\n请选择开始新卷，或读取旧存档继续。';
  playback.shownText = playback.fullText;
  storyEl.textContent = playback.fullText;
  choiceEl.innerHTML = '';
  const startBtn = document.createElement('button');
  startBtn.textContent = '开始新卷';
  startBtn.onclick = resetGame;
  choiceEl.appendChild(startBtn);
  bgLayerEl.style.background = bgStyles.bar;
  synth.setAmbienceForScene({ bg: 'bar' });
  setPortrait(cast.zero, 'neutral');
  charInfoEl.textContent = `${cast.zero.name}｜${cast.zero.desc}`;
  renderBars();
  renderLog();
  ensureArchiveSync();
  renderArchive();
  renderEndingVault();
  renderHistoryPanel();
  updatePlaybackButtons();
}

function showEnding(route) {
  const endings = {
    A: { title: '结局A【玻璃停火】', text: '你让“可审计饮品日志 + 证据链”成为停火凭据。城市在脆弱平衡里撑过黎明。' },
    B: { title: '结局B【霓虹燃烧】', text: '你把整夜订单和证据同时公开，真相照亮街区，也烧穿旧秩序。' },
    C: { title: '结局C【磁带群星】', text: '你把吧台变成去中心化记忆节点，每一次点单都能写入可验证证词。' }
  };
  const end = endings[route];
  const sideQuestSuffix = state.flags.ghostHandshake
    ? '<p style="margin-top:10px;color:#c8ffe7;">【灰匣注释】你在终章前完成了三方共同签名校验，最终声明追加了可交叉验证段落。</p>'
    : '';
  if (!state.unlockedEndings.includes(route)) state.unlockedEndings.push(route);
  if (!endingMeta.unlockedEndings.includes(route)) endingMeta.unlockedEndings.push(route);
  const runRecord = buildRunRecord(route);
  state.clearedRuns.push(runRecord);
  endingMeta.runs.push(runRecord);
  if (endingMeta.runs.length > 12) endingMeta.runs.shift();
  persistEndingMeta();
  addLog(`[结局] ${end.title}`);
  stopTyping();
  stopAutoAdvance();
  titleEl.textContent = '结局回放';
  const historyHtml = state.choiceHistory.slice(-8).map((item, idx) => `<li>${idx + 1}. <strong>${item.scene}</strong>：${item.choice}</li>`).join('');
  storyEl.innerHTML = `<div style="color:#ffe38b;font-size:24px;margin-bottom:12px;">${end.title}</div><div>${end.text}</div>${sideQuestSuffix}<hr style="border-color:rgba(255,225,170,.4);margin:18px 0;"><div style="font-size:14px;color:#ffdca7;">关键选择回顾：</div><ol>${historyHtml || '<li>暂无可回顾选择。</li>'}</ol><div style="margin-top:8px;color:#9df3df;font-size:13px;">已解锁结局：${state.unlockedEndings.join(' / ') || '无'}</div>`;
  choiceEl.innerHTML = '';
  const titleBtn = document.createElement('button');
  titleBtn.textContent = '返回标题';
  titleBtn.setAttribute('aria-label', '返回标题画面');
  titleBtn.onclick = showTitle;
  choiceEl.appendChild(titleBtn);
  renderLog();
  renderArchive();
  renderEndingVault();
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
  }, (payload) => {
    resolveOrderEffect(scene, payload);
    const orderLine = `${cast[scene.npcKey]?.name || scene.npcKey} ← ${payload.drink.name}${payload.extras.length ? ` + ${payload.extras.map((item) => item.name).join(' / ')}` : ''}`;
    state.orderHistory.push(orderLine);
    addLog(`[点单] ${orderLine}`);
    synth.playSfx('confirm');
    state.current = scene.next;
    renderScene();
  });
}

function renderChoiceScene(scene) {
  choiceEl.innerHTML = '';
  scene.choices.forEach((ch) => {
    if (ch.condition && !ch.condition({ ...state, score: tendencyPairs() })) return;
    if (ch.if && !hasCondition(state, ch.if)) return;
    const btn = document.createElement('button');
    btn.textContent = ch.text;
    btn.setAttribute('aria-label', `选项 ${ch.text}`);
    btn.onclick = () => {
      const prevInventoryCount = state.inventory.length;
      const prevFlags = Object.keys(state.flags).length;
      applyEffect(ch.effect);
      applyStateDelta(state, ch);
      state.choiceHistory.push({
        sceneId: state.current,
        scene: scene.title,
        choice: ch.text,
        effect: ch.effect || {},
        tendencyDelta: normalizeEffectVector(ch.effect),
        effectSummary: summarizeEffect(ch.effect)
      });
      addLog(`▶ ${ch.text}`);
      if (state.inventory.length > prevInventoryCount || Object.keys(state.flags).length > prevFlags) synth.playSfx('clue');
      else synth.playSfx('confirm');
      if (ch.routeLock) {
        lockRoute();
        state.current = ch.next || ROUTE_SCENE_MAP[state.routeLock];
      } else {
        state.current = ch.next;
      }
      renderScene();
    };
    choiceEl.appendChild(btn);
  });
}

function renderScene() {
  if (replay.active) return renderReplayScene();
  if (state.current === TITLE_SCENE) return showTitle();
  if (state.current === 'END') return showEnding(state.routeLock || nearestRoute());
  const scene = scenes[state.current];
  if (!scene) return showTitle();

  stopAutoAdvance();
  markSceneVisit(state.current);
  titleEl.textContent = scene.title;
  const sceneText = getSceneText(scene) || '';
  bgLayerEl.style.background = bgStyles[scene.bg] || bgStyles.bar;
  synth.setAmbienceForScene(scene);
  const c = cast[scene.speaker];
  setPortrait(c, scene.expression || 'neutral');
  charInfoEl.textContent = `${c.name}｜${c.desc}`;

  addLog(`[${scene.title}]
${sceneText}`);
  appendDialogueHistory(scene, sceneText);
  renderLog();
  renderBars();
  renderArchive();
  renderHistoryPanel();

  if (scene.type === 'order') {
    stopTyping();
    playback.sceneId = state.current;
    playback.fullText = sceneText;
    playback.textHash = textHash(sceneText);
    storyEl.textContent = sceneText;
    markCurrentTextRead();
    renderOrderScene(scene);
  } else {
    renderChoiceScene(scene);
    runTypewriter(scene, sceneText);
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
    synth.playSfx('confirm');
  } catch (_err) {
    alert('存档损坏或格式不兼容。');
  }
}

function resetGame() {
  Object.assign(state, createInitialState());
  state.current = 's00';
  state.log = ['[系统] 新的一卷磁带开始转动。'];
  state.pathHistory = [];
  replay.active = false;
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
    .then(() => { saveStatusEl.textContent = `已导出 ${slot.toUpperCase()} 到文本框并复制剪贴板。`; synth.playSfx('confirm'); })
    .catch(() => (saveStatusEl.textContent = `已导出 ${slot.toUpperCase()} 到文本框，剪贴板复制失败。`));
}

function importSave(slot) {
  const raw = saveTextEl.value.trim();
  if (!raw) return (saveStatusEl.textContent = '请先在文本框粘贴存档 JSON。');
  try {
    const parsed = parseSaveData(raw);
    localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify({ ...parsed, schemaVersion: SAVE_SCHEMA_VERSION }));
    saveStatusEl.textContent = `导入成功：${slot.toUpperCase()}（已兼容为 schema v${SAVE_SCHEMA_VERSION}）`;
    synth.playSfx('confirm');
  } catch (_err) {
    saveStatusEl.textContent = '导入失败：JSON 格式错误或字段缺失。';
  }
}

document.getElementById('resetBtn').onclick = resetGame;
document.getElementById('savePanelBtn').onclick = () => savePanelEl.classList.toggle('open');
document.getElementById('savePanelClose').onclick = () => savePanelEl.classList.toggle('open');
document.getElementById('archivePanelBtn').onclick = () => archivePanelEl.classList.toggle('open');
document.getElementById('endingPanelBtn').onclick = () => { renderEndingVault(); endingPanelEl.classList.toggle('open'); };
document.getElementById('archivePanelClose').onclick = () => archivePanelEl.classList.remove('open');
document.getElementById('endingPanelClose').onclick = () => endingPanelEl.classList.remove('open');
volumeSlider.oninput = () => {
  state.bgmVolume = clamp(Number(volumeSlider.value) / 100, 0, 1);
  state.audioSettings.music.volume = state.bgmVolume;
  applyAudioSettingsAndPersist();
  updateBgmUI();
};

masterVolumeSlider.oninput = () => {
  state.audioSettings.master = clamp(Number(masterVolumeSlider.value) / 100, 0, 1);
  applyAudioSettingsAndPersist();
  updateBgmUI();
};

musicVolumeSlider.oninput = () => {
  state.audioSettings.music.volume = clamp(Number(musicVolumeSlider.value) / 100, 0, 1);
  state.bgmVolume = state.audioSettings.music.volume;
  applyAudioSettingsAndPersist();
  updateBgmUI();
};

ambienceVolumeSlider.oninput = () => {
  state.audioSettings.ambience.volume = clamp(Number(ambienceVolumeSlider.value) / 100, 0, 1);
  synth.applySettings(state.audioSettings);
  synth.setAmbienceForScene(scenes[state.current] || { bg: 'bar' });
  persistAudioSettings();
  autoSave(false);
  updateBgmUI();
};

sfxVolumeSlider.oninput = () => {
  state.audioSettings.sfx.volume = clamp(Number(sfxVolumeSlider.value) / 100, 0, 1);
  applyAudioSettingsAndPersist();
  updateBgmUI();
};

musicToggle.onchange = () => {
  state.audioSettings.music.enabled = musicToggle.checked;
  applyAudioSettingsAndPersist();
  updateBgmUI();
};

ambienceToggle.onchange = () => {
  state.audioSettings.ambience.enabled = ambienceToggle.checked;
  applyAudioSettingsAndPersist();
  updateBgmUI();
};

sfxToggle.onchange = () => {
  state.audioSettings.sfx.enabled = sfxToggle.checked;
  applyAudioSettingsAndPersist();
  updateBgmUI();
};

async function enableAudioFromUserGesture() {
  const started = await synth.start();
  if (started) {
    state.bgmEnabled = true;
    synth.applySettings(state.audioSettings);
    synth.setAmbienceForScene(scenes[state.current] || { bg: 'bar' });
    updateBgmUI();
    autoSave(false);
  }
}

bgmBtn.onclick = async () => {
  if (!synth.on) {
    await enableAudioFromUserGesture();
  } else {
    synth.stop();
    state.bgmEnabled = false;
    updateBgmUI();
    autoSave(false);
  }
};

audioUnlockBtn.onclick = async () => {
  await enableAudioFromUserGesture();
};

document.addEventListener('click', (event) => {
  if (event.target instanceof HTMLElement && event.target.closest('button')) {
    synth.playSfx('click');
  }
});

showAllBtn.onclick = () => {
  showFullText();
  queueAutoAdvance();
};
autoBtn.onclick = () => {
  playback.auto = !playback.auto;
  updatePlaybackButtons();
  queueAutoAdvance();
};
skipBtn.onclick = () => {
  playback.skip = !playback.skip;
  updatePlaybackButtons();
  if (playback.skip && isCurrentTextRead()) {
    showFullText();
  }
  queueAutoAdvance();
};
historyBtn.onclick = () => {
  historyPanelEl.classList.toggle('open');
  if (historyPanelEl.classList.contains('open')) renderHistoryPanel();
};
historyCloseBtn.onclick = () => historyPanelEl.classList.remove('open');

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing = target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  if (typing) return;

  if (event.key === 'Enter') {
    if (savePanelEl.classList.contains('open') || archivePanelEl.classList.contains('open') || endingPanelEl.classList.contains('open')) return;
    event.preventDefault();
    if (!playback.typingDone) {
      showFullText();
      queueAutoAdvance();
      return;
    }
    const firstChoice = choiceEl.querySelector('button');
    if (firstChoice) firstChoice.click();
    return;
  }

  if (['1', '2', '3'].includes(event.key)) {
    const idx = Number(event.key) - 1;
    const buttons = [...choiceEl.querySelectorAll('button')];
    if (!buttons[idx]) return;
    event.preventDefault();
    buttons[idx].click();
    return;
  }

  if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    savePanelEl.classList.toggle('open');
    return;
  }

  if (event.key.toLowerCase() === 'l') {
    event.preventDefault();
    archivePanelEl.classList.toggle('open');
  }
});

document.querySelectorAll('[data-save]').forEach((btn) => { btn.onclick = () => { save(btn.dataset.save); saveStatusEl.textContent = `已保存到 ${btn.dataset.save.toUpperCase()}`; synth.playSfx('save'); }; });
document.querySelectorAll('[data-load]').forEach((btn) => { btn.onclick = () => load(btn.dataset.load); });
document.querySelectorAll('[data-export]').forEach((btn) => { btn.onclick = () => exportSave(btn.dataset.export); });
document.querySelectorAll('[data-import]').forEach((btn) => { btn.onclick = () => importSave(btn.dataset.import); });

hidePortraitToggle?.addEventListener('change', persistUiPrefs);
compactUiToggle?.addEventListener('change', persistUiPrefs);

loadUiPrefs();
loadStoredAudioSettings();
updateBgmUI();
ensureArchiveSync();
renderArchive();
renderEndingVault();
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
