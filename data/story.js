export const scenes = {
  s00: {
    title: '开场：太阳雨夜班',
    speaker: 'zero',
    expression: 'neutral',
    bg: 'bar',
    text: '22:11，酸雨沿着酒吧霓虹玻璃流成一条条发光裂缝。匿名点单连续跳了三次：同一串前缀来自企业网、街区暗网、执法内网。你闻到今晚不是普通夜班。',
    choices: [
      { text: '先启动吧台电磁屏障。', effect: { logic: 1, preserve: 1 }, setFlags: ['barShielded'], next: 's01' },
      { text: '保持酒吧开放，便于观察来客。', effect: { emotion: 1, explore: 1 }, clearFlags: ['barShielded'], next: 's01' }
    ]
  },
  s01: {
    type: 'order',
    title: '点单事件①：企业联络官',
    speaker: 'liaison',
    expression: 'smile',
    bg: 'corp',
    request: '绫濑雾音："我只要能让我保持清醒的杯子。别太甜，别失控。"',
    note: '点单目标：偏理性、偏稳妥会更容易建立企业窗口。',
    npcKey: 'liaison',
    next: 's02',
    effects: [
      {
        id: 'corp-focus',
        when: ({ profile, tags }) => profile.stim >= 4 && profile.sweet <= 2 && (tags.includes('focus') || tags.includes('logic')),
        effect: { logic: 1, coop: 1 },
        setFlags: { corpTrust: true },
        reply: '雾音轻敲杯壁："很好，冷静且可执行。我们可以谈审计窗口。"'
      },
      {
        id: 'corp-default',
        when: () => true,
        effect: { logic: 1 },
        setFlags: { corpTrust: false },
        reply: '雾音收下配方，但仍保持公关口径。'
      }
    ]
  },
  s02: {
    title: '企业窗口',
    speaker: 'liaison',
    expression: 'neutral',
    bg: 'corp',
    text: (st) => st.flags.corpTrust
      ? '雾音把“回声井”调度日志的一段校验码推到你终端。'
      : '雾音只给公开版本资料，更深层密钥仍在她手里。',
    choices: [
      { text: '签一份对赌式披露草案。', effect: { logic: 1 }, setFlags: ['corpDeal'], addItem: ['corpMemo'], rel: { name: 'liaison', value: 1 }, next: 's03' },
      { text: '拒绝企业交易，保持中立。', effect: { oppose: 1 }, clearFlags: ['corpDeal'], rel: { name: 'liaison', value: -1 }, next: 's03' }
    ]
  },
  s03: {
    type: 'order',
    title: '点单事件②：街头黑客',
    speaker: 'hacker',
    expression: 'angry',
    bg: 'alley',
    request: '烬线把湿掉的芯片袋拍在吧台："给我一杯能盯完三百页日志的，别端企业味。"',
    note: '点单目标：偏探索/对抗会激发黑客的真实情报。',
    npcKey: 'hacker',
    next: 's04',
    effects: [
      {
        id: 'hack-rebel',
        when: ({ tags, profile }) => (tags.includes('rebel') || tags.includes('explore') || tags.includes('risk')) && profile.bitter >= 3,
        effect: { oppose: 1, explore: 2 },
        setFlags: { hackerTrust: true },
        reply: '烬线一口闷下半杯："行，我把原始链路也给你。"'
      },
      {
        id: 'hack-default',
        when: () => true,
        effect: { explore: 1 },
        setFlags: { hackerTrust: false },
        reply: '烬线只留了一个临时节点地址。'
      }
    ]
  },
  s04: {
    title: '暗网提案',
    speaker: 'hacker',
    expression: 'neutral',
    bg: 'alley',
    text: (st) => st.flags.hackerTrust
      ? '烬线推来一卷加密磁带："里面有离线备份，你敢不敢带走？"'
      : '烬线盯着你："你先证明不是企业代言人。"',
    choices: [
      { text: '收下记忆磁带并承诺公开真相。', if: { flagsAll: ['hackerTrust'] }, addItem: ['memoryTape'], setFlags: ['memoryTape', 'truthLeakDraft'], rel: { name: 'hacker', value: 2 }, effect: { explore: 1 }, next: 's05' },
      { text: '要求分段验证后再谈公开。', addItem: ['checksumSheet'], effect: { logic: 1, preserve: 1 }, rel: { name: 'hacker', value: -1 }, next: 's05' }
    ]
  },
  s05: {
    type: 'order',
    title: '点单事件③：义体警探',
    speaker: 'detective',
    expression: 'neutral',
    bg: 'street',
    request: '韩铬摘下雨披："我要还能开车回巡逻线。给我稳一点，但别让我犯困。"',
    note: '点单目标：低酒精 + 中刺激更利于合作路线。',
    npcKey: 'detective',
    next: 's06',
    effects: [
      {
        id: 'cop-safe',
        when: ({ profile, tags }) => profile.alcohol <= 1 && profile.stim >= 2 && (tags.includes('safe') || tags.includes('focus')),
        effect: { coop: 2, preserve: 1 },
        setFlags: { detectiveTrust: true },
        reply: '韩铬点头："我给你开临时通行。"'
      },
      {
        id: 'cop-default',
        when: () => true,
        effect: { logic: 1 },
        setFlags: { detectiveTrust: false },
        reply: '韩铬记住你的态度，但仍按章办事。'
      }
    ]
  },
  s06: {
    title: '执法窗口',
    speaker: 'detective',
    expression: 'smile',
    bg: 'street',
    text: (st) => st.flags.detectiveTrust
      ? '韩铬压低声音："你若配合，我可以先压住搜查令。"'
      : '韩铬公事公办："缺少证据链的话，我会申请搜查令。"',
    choices: [
      { text: '交出部分证据，换取执法缓冲。', if: { itemAny: ['checksumSheet', 'corpMemo'] }, clearFlags: ['policeWarrant'], rel: { name: 'detective', value: 1 }, effect: { coop: 1 }, next: 's07' },
      { text: '拒绝移交数据，准备硬扛搜查。', setFlags: ['policeWarrant'], rel: { name: 'detective', value: -2 }, effect: { oppose: 1 }, next: 's07' }
    ]
  },
  s07: {
    title: '终段前夜：路由复盘',
    speaker: 'zero',
    expression: 'angry',
    bg: 'bar',
    text: (st) => `你回看整夜档案：\n- Rational↔Emotional：${st.score.rational}\n- Cooperate↔Confront：${st.score.cooperate}\n- Explore↔Conserve：${st.score.explore}\n\n线索是否完整，将决定终章落点。`,
    choices: [
      { text: '先把线索分层，做一次应急彩排。', effect: { logic: 1, preserve: 1 }, next: 's08' },
      { text: '不等了，边行动边修正。', effect: { emotion: 1, explore: 1 }, next: 's08' }
    ]
  },
  s08: {
    title: '路由彩排：0:47 紧急会签',
    speaker: 'zero',
    expression: 'neutral',
    bg: 'backroom',
    text: (st) => st.flags.policeWarrant
      ? '你把搜查倒计时投到墙上，所有人都明白：下一步必须兼顾速度与可追责。'
      : '你把三方反馈整成一张“最小可执行路线图”，距离天亮还剩 43 分钟。',
    choices: [
      { text: '优先保障民生系统，压缩公开范围。', effect: { coop: 1, preserve: 1 }, next: 's09' },
      { text: '优先保障真相完整，接受短时冲击。', effect: { oppose: 1, explore: 1 }, next: 's09' }
    ]
  },
  s09: {
    title: '终段抉择：最终路由选择',
    speaker: 'zero',
    expression: 'angry',
    bg: 'bar',
    text: '所有磁带开始同步转动。你必须在停火、爆燃、群星三条路由中做最终签名。',
    choices: [
      { text: '补全泄露稿，准备城市级公开。', if: { flagsAll: ['truthLeakDraft'], itemAny: ['memoryTape'] }, effect: { explore: 1, oppose: 1 }, setFlags: ['truthLeakDraft'], routeLock: true, next: 's10B' },
      { text: '走审计停火线，优先保住电网。', if: { flagsAll: ['corpDeal'], flagsAny: ['barShielded'], relAtLeast: { name: 'liaison', val: 1 } }, effect: { logic: 1, coop: 1 }, routeLock: true, next: 's10A' },
      { text: '将三方证词写入匿名网络。', if: { itemAny: ['memoryTape', 'checksumSheet'], relAtLeast: { name: 'hacker', val: 1 } }, effect: { logic: 1, explore: 1 }, routeLock: true, next: 's10C' },
      { text: '在混乱中硬选一条路。', effect: { emotion: 1 }, routeLock: true, next: 's10A' }
    ]
  },
  s10A: {
    title: '终章A线：玻璃停火协议',
    speaker: 'liaison',
    expression: 'neutral',
    bg: 'corp',
    text: (st) => `你以“低风险先行 + 公开审计”达成停火。${st.flags.policeWarrant ? '但警方搜查令仍悬而未决，协议执行十分脆弱。' : '搜查令被撤回，三方首次签下可追责条款。'}`,
    choices: [{ text: '执行停火流程。', effect: { coop: 1, preserve: 1 }, next: 'END' }]
  },
  s10B: {
    title: '终章B线：霓虹燃烧广播',
    speaker: 'hacker',
    expression: 'angry',
    bg: 'street',
    text: (st) => `你把整夜证据打包广播。${st.flags.truthLeakDraft && st.inventory.includes('memoryTape') ? '完整记忆磁带让公众看见不可抵赖的原始链路。' : '证据仍有断层，城市在半真相里爆燃。'}`,
    choices: [{ text: '点燃全城广播。', effect: { oppose: 1, explore: 1 }, next: 'END' }]
  },
  s10C: {
    title: '终章C线：磁带群星网络',
    speaker: 'zero',
    expression: 'smile',
    bg: 'bar',
    text: (st) => `你把酒吧点单系统改造成匿名记忆网络。${st.flags.barShielded ? '早先部署的屏障让节点成功熬过第一轮清洗。' : '由于缺少屏障，首批节点损失惨重但火种仍在。'}`,
    choices: [{ text: '启动群星节点。', effect: { logic: 1, explore: 1 }, next: 'END' }]
  }
};
