import { cast, scenes } from './data.js';
import { BgmSynth } from './audio.js';

const SAVE_PREFIX = 'neonTape_';
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
  bgmOn: false,
  routeLock: null,
  choiceHistory: []
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
}

function showEnding(route) {
  const endings = {
    A: {
      title: '结局A【玻璃停火】',
      text: '黎明前 03:17，你把“回声井”证据与审计密钥拆成三方共签版本：企业法务、街区诊所联盟、执法监察处必须同屏确认后才能解封。\n\n此前被你留在日志里的“常温水订单 #A-17”终于派上用场——那是韩铬在巡逻线外留下的生命线清单。你优先释放医院与供电修复权限，避免了停摆连锁。与此同时，绫濑雾音兑现了她在点单时承诺的豁免窗口，亲自把谈判桌搬回酒吧。\n\n烬线没有离开。他作为最尖锐的反对者，反而成为停火协议的实时监督节点。三方都不信任彼此，却勉强信任你这个“只转发可核验真相”的中介。城市迎来脆弱停火，而你的私人频道永远失去匿名性——你把情感与关系压成代价，换来清晨没有燃烧的天际线。'
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
  addLog(`[结局] ${end.title}`);
  titleEl.textContent = '结局回放';
  const historyHtml = state.choiceHistory
    .slice(-8)
    .map((item, idx) => `<li>${idx + 1}. <strong>${item.scene}</strong>：${item.choice}</li>`)
    .join('');
  storyEl.innerHTML = `<div style="color:#ffe38b;font-size:24px;margin-bottom:12px;">${end.title}</div><div>${end.text}</div><hr style="border-color:rgba(255,225,170,.4);margin:18px 0;"><div style="font-size:14px;color:#ffdca7;">关键选择回顾：</div><ol>${historyHtml || '<li>暂无可回顾选择。</li>'}</ol>`;
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

function save(slot) {
  const payload = { ...state, bgmOn: synth.on };
  localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(payload));
}

function autoSave(isEnd) {
  save(AUTO_SLOT);
  if (isEnd) save('ending');
}

function normalizeLegacyScore(score = {}) {
  const rational = clamp((score.logic || 0) - (score.emotion || 0), -5, 5);
  const cooperate = clamp((score.coop || 0) - (score.oppose || 0), -5, 5);
  const explore = clamp((score.explore || 0) - (score.preserve || 0), -5, 5);
  return { rational, cooperate, explore };
}

function load(slot) {
  const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`) || localStorage.getItem(`${SAVE_PREFIX}${AUTO_SLOT}`);
  if (!raw) return alert('没有可读取的存档，将从开头开始。');
  const data = JSON.parse(raw);
  state.current = data.current || 's00';
  state.tendency = data.tendency || normalizeLegacyScore(data.score);
  state.log = data.log || [];
  state.bgmOn = !!data.bgmOn;
  state.routeLock = data.routeLock || null;
  state.choiceHistory = data.choiceHistory || [];
  bgmBtn.textContent = state.bgmOn ? '关闭 BGM（需点击恢复）' : '开启 BGM';
  renderScene();
}

function resetGame() {
  state.current = 's00';
  state.tendency = { rational: 0, cooperate: 0, explore: 0 };
  state.log = ['[系统] 新的一卷磁带开始转动。'];
  state.routeLock = null;
  state.choiceHistory = [];
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

showTitle();
