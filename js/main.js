import { cast, scenes } from './data.js';
import { BgmSynth } from './audio.js';

const SAVE_PREFIX = 'neonTape_';
const AUTO_SLOT = 'auto';

const state = {
  current: 's00',
  score: { logic: 0, emotion: 0, coop: 0, oppose: 0, explore: 0, preserve: 0 },
  log: [],
  bgmOn: false
};

const bgStyles = {
  bar: 'radial-gradient(circle at 20% 20%, rgba(255,130,170,.25), transparent 45%), linear-gradient(135deg, rgba(68,31,110,.25), rgba(11,6,30,.65))',
  corp: 'linear-gradient(135deg, rgba(80,220,255,.22), rgba(24,30,76,.62))',
  alley: 'linear-gradient(135deg, rgba(122,82,255,.22), rgba(15,9,40,.7))',
  street: 'linear-gradient(135deg, rgba(255,156,88,.2), rgba(8,7,28,.7))',
  backroom: 'linear-gradient(135deg, rgba(140,255,211,.2), rgba(15,8,34,.72))',
  dawn: 'linear-gradient(135deg, rgba(255,190,110,.25), rgba(70,30,80,.65))'
};

const storyEl = document.getElementById('story');
const choiceEl = document.getElementById('choices');
const titleEl = document.getElementById('sceneTitle');
const portraitEl = document.getElementById('portrait');
const charInfoEl = document.getElementById('charInfo');
const logPanelEl = document.getElementById('logPanel');
const bgLayerEl = document.getElementById('bgLayer');
const bgmBtn = document.getElementById('bgmBtn');
const synth = new BgmSynth();

function getSceneText(scene) {
  return typeof scene.text === 'function' ? scene.text(state) : scene.text;
}

function addLog(text) {
  state.log.push(text);
  if (state.log.length > 120) state.log.shift();
}

function renderBars() {
  const meter = (a, b) => `${(a / Math.max(a + b, 1)) * 100}%`;
  document.getElementById('barLogic').style.width = meter(state.score.logic, state.score.emotion);
  document.getElementById('barCoop').style.width = meter(state.score.coop, state.score.oppose);
  document.getElementById('barExplore').style.width = meter(state.score.explore, state.score.preserve);
}

function renderLog() {
  logPanelEl.textContent = state.log.join('\n\n');
  logPanelEl.scrollTop = logPanelEl.scrollHeight;
}

function applyEffect(effect) {
  Object.entries(effect).forEach(([k, v]) => { state.score[k] += v; });
}

function endingByScore() {
  const { logic, emotion, coop, oppose, explore, preserve } = state.score;
  if (coop >= oppose && logic >= emotion && preserve >= explore) {
    return {
      title: '结局A｜《停火协议·晨曦版》',
      text: '你让证据在三方见证下分级公开：医院与民生系统先获得修复补丁，企业被迫接受持续审计，黑客社群保留监督节点。没有人完全胜利，但没有街区被火光吞掉。你继续守着吧台，成为夜城最昂贵也最可信的中立频道。'
    };
  }
  if (oppose > coop && emotion >= logic && explore >= preserve) {
    return {
      title: '结局B｜《自由过载》',
      text: '你把全量记录和密钥广播到每一面广告墙。真相在黎明前引爆，封锁线被人潮撕开。公司系统坍塌、执法调度失序、地下节点迅速接管。城市得到短促而炽热的自由，也付出漫长而真实的伤口。'
    };
  }
  return {
    title: '结局C｜《分布式夜航》',
    text: '你拒绝单点权威，把关键协议切成多方共管磁带：公司、街区、执法、媒体各持一段。任何决策都必须被交叉签名。夜城从“中心城市”变成“协商城市”，缓慢、麻烦，却更难被一次性劫持。'
  };
}

function showEnding() {
  const end = endingByScore();
  addLog(`[结局] ${end.title}`);
  titleEl.textContent = '结局回放';
  storyEl.innerHTML = `<div style="color:#ffe38b;font-size:24px;margin-bottom:12px;">${end.title}</div>${end.text}`;
  choiceEl.innerHTML = '';
  const btn = document.createElement('button');
  btn.textContent = '再来一局';
  btn.onclick = resetGame;
  choiceEl.appendChild(btn);
  renderLog();
  autoSave(true);
}

function renderScene() {
  if (state.current === 'END') return showEnding();
  const scene = scenes[state.current];
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
    if (ch.condition && !ch.condition(state)) return;
    const btn = document.createElement('button');
    btn.textContent = ch.text;
    btn.onclick = () => {
      applyEffect(ch.effect);
      addLog(`▶ ${ch.text}`);
      state.current = ch.next;
      renderScene();
    };
    choiceEl.appendChild(btn);
  });

  autoSave(false);
}

function save(slot) {
  const payload = { ...state, bgmOn: synth.on };
  localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(payload));
}

function autoSave(isEnd) {
  save(AUTO_SLOT);
  if (isEnd) save('ending');
}

function load(slot) {
  const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`) || localStorage.getItem(`${SAVE_PREFIX}${AUTO_SLOT}`);
  if (!raw) return alert('没有可读取的存档，将从开头开始。');
  const data = JSON.parse(raw);
  state.current = data.current;
  state.score = data.score;
  state.log = data.log || [];
  state.bgmOn = !!data.bgmOn;
  bgmBtn.textContent = state.bgmOn ? '关闭 BGM（需点击恢复）' : '开启 BGM';
  renderScene();
}

function resetGame() {
  state.current = 's00';
  state.score = { logic: 0, emotion: 0, coop: 0, oppose: 0, explore: 0, preserve: 0 };
  state.log = ['[系统] 新的一卷磁带开始转动。'];
  renderScene();
}

document.querySelectorAll('[data-save]').forEach((btn) => {
  btn.onclick = () => { save(btn.dataset.save); alert(`已保存到 ${btn.dataset.save}`); };
});
document.querySelectorAll('[data-load]').forEach((btn) => {
  btn.onclick = () => load(btn.dataset.load);
});
document.getElementById('resetBtn').onclick = resetGame;
bgmBtn.onclick = async () => {
  if (!synth.on) {
    await synth.start();
    state.bgmOn = true;
    bgmBtn.textContent = '关闭 BGM';
  } else {
    synth.stop();
    state.bgmOn = false;
    bgmBtn.textContent = '开启 BGM';
  }
  autoSave(false);
};

resetGame();
