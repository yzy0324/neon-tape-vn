export const IMPORTANT_FLAG_META = {
  corpDeal: '企业交易草案',
  hackerTrust: '黑客信任',
  policeWarrant: '警方搜查令',
  memoryTape: '记忆磁带',
  barShielded: '酒吧防护上线',
  truthLeakDraft: '真相泄露草案'
};

export const createInitialState = () => ({
  current: '__TITLE__',
  tendencies: { rational: 0, cooperate: 0, explore: 0 },
  flags: {},
  inventory: [],
  relations: { liaison: 0, hacker: 0, detective: 0 },
  log: [],
  routeLock: null,
  choiceHistory: [],
  orderHistory: [],
  orderDrafts: {},
  pathHistory: [],
  dialogueHistory: [],
  readTextHashes: {},
  clearedRuns: [],
  unlockedEndings: [],
  bgmEnabled: false,
  bgmVolume: 0.5,
  audioSettings: {
    master: 0.72,
    music: { enabled: true, volume: 0.55 },
    ambience: { enabled: true, volume: 0.48 },
    sfx: { enabled: true, volume: 0.65 }
  }
});

export function normalizeState(raw = {}) {
  const normalized = createInitialState();
  normalized.current = typeof raw.current === 'string' ? raw.current : normalized.current;
  const tendencies = raw.tendencies || raw.tendency || {};
  normalized.tendencies = {
    rational: Number(tendencies.rational) || 0,
    cooperate: Number(tendencies.cooperate) || 0,
    explore: Number(tendencies.explore) || 0
  };
  normalized.flags = raw.flags && typeof raw.flags === 'object' ? { ...raw.flags } : {};
  normalized.inventory = Array.isArray(raw.inventory) ? [...new Set(raw.inventory)] : [];
  normalized.relations = {
    liaison: Number(raw.relations?.liaison) || 0,
    hacker: Number(raw.relations?.hacker) || 0,
    detective: Number(raw.relations?.detective) || 0
  };
  normalized.log = Array.isArray(raw.log) ? raw.log : [];
  normalized.routeLock = typeof raw.routeLock === 'string' ? raw.routeLock : null;
  normalized.choiceHistory = Array.isArray(raw.choiceHistory) ? raw.choiceHistory : [];
  normalized.orderHistory = Array.isArray(raw.orderHistory) ? raw.orderHistory : [];
  normalized.orderDrafts = raw.orderDrafts && typeof raw.orderDrafts === 'object' ? raw.orderDrafts : {};
  normalized.pathHistory = Array.isArray(raw.pathHistory) ? raw.pathHistory : [];
  normalized.dialogueHistory = Array.isArray(raw.dialogueHistory) ? raw.dialogueHistory : [];
  normalized.readTextHashes = raw.readTextHashes && typeof raw.readTextHashes === 'object' ? raw.readTextHashes : {};
  normalized.clearedRuns = Array.isArray(raw.clearedRuns) ? raw.clearedRuns : [];
  normalized.unlockedEndings = Array.isArray(raw.unlockedEndings) ? raw.unlockedEndings : [];
  normalized.bgmEnabled = typeof raw.bgmEnabled === 'boolean' ? raw.bgmEnabled : false;
  normalized.bgmVolume = typeof raw.bgmVolume === 'number' ? raw.bgmVolume : 0.5;
  const audio = raw.audioSettings || {};
  normalized.audioSettings = {
    master: typeof audio.master === 'number' ? audio.master : normalized.audioSettings.master,
    music: {
      enabled: typeof audio.music?.enabled === 'boolean' ? audio.music.enabled : normalized.audioSettings.music.enabled,
      volume: typeof audio.music?.volume === 'number' ? audio.music.volume : normalized.audioSettings.music.volume
    },
    ambience: {
      enabled: typeof audio.ambience?.enabled === 'boolean' ? audio.ambience.enabled : normalized.audioSettings.ambience.enabled,
      volume: typeof audio.ambience?.volume === 'number' ? audio.ambience.volume : normalized.audioSettings.ambience.volume
    },
    sfx: {
      enabled: typeof audio.sfx?.enabled === 'boolean' ? audio.sfx.enabled : normalized.audioSettings.sfx.enabled,
      volume: typeof audio.sfx?.volume === 'number' ? audio.sfx.volume : normalized.audioSettings.sfx.volume
    }
  };
  return normalized;
}

export function hasCondition(state, condition = {}) {
  const flagsAllOk = (condition.flagsAll || []).every((flag) => !!state.flags[flag]);
  const flagsAny = condition.flagsAny || [];
  const flagsAnyOk = flagsAny.length === 0 || flagsAny.some((flag) => !!state.flags[flag]);
  const itemAny = condition.itemAny || [];
  const itemAnyOk = itemAny.length === 0 || itemAny.some((item) => state.inventory.includes(item));
  const relRule = condition.relAtLeast;
  const relOk = !relRule || (state.relations[relRule.name] || 0) >= relRule.val;
  return flagsAllOk && flagsAnyOk && itemAnyOk && relOk;
}

export function applyStateDelta(state, delta = {}) {
  (delta.setFlags || []).forEach((flag) => {
    state.flags[flag] = true;
  });
  (delta.clearFlags || []).forEach((flag) => {
    delete state.flags[flag];
  });
  (delta.addItem || []).forEach((item) => {
    if (!state.inventory.includes(item)) state.inventory.push(item);
  });
  (delta.removeItem || []).forEach((item) => {
    state.inventory = state.inventory.filter((owned) => owned !== item);
  });
  if (delta.rel?.name) {
    const cur = Number(state.relations[delta.rel.name]) || 0;
    state.relations[delta.rel.name] = cur + (Number(delta.rel.value) || 0);
  }
}
