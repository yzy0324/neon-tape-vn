export const scenes = {
  s00: {
    title: '开场：太阳雨夜班',
    speaker: 'zero',
    expression: 'neutral',
    bg: 'bar',
    text: () => '22:11，酸雨沿着酒吧霓虹玻璃流成一条条发光裂缝。匿名点单连续跳了三次：同一串前缀来自企业网、街区暗网、执法内网。\n\n你把这串前缀写进手账，标注“首个伏笔：订单索引”。一名从不说话的快递员在门口停了两秒。',
    choices: [
      { text: '先把后厨监控和通风管线全开，按流程准备。', effect: { logic: 1, preserve: 1 }, next: 's01' },
      { text: '调高音乐和霓虹，先稳住气氛再见客。', effect: { emotion: 1, coop: 1 }, next: 's01' }
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
        id: 'corp-risky',
        when: ({ profile }) => profile.alcohol >= 4 || profile.stim >= 6,
        effect: { oppose: 1, explore: 1 },
        setFlags: { corpTrust: false },
        reply: '雾音皱眉："这杯太激进。你是在测试我，还是测试系统？"'
      },
      {
        id: 'corp-default',
        when: () => true,
        effect: { logic: 1 },
        setFlags: { corpTrust: false },
        reply: '雾音记下了配方，但只给出模糊承诺。'
      }
    ]
  },
  s02: {
    title: '节点：企业会谈后的第一份情报',
    speaker: 'liaison',
    expression: 'neutral',
    bg: 'corp',
    text: (st) => st.flags.corpTrust
      ? '你刚递出的饮品让雾音放下戒备。她把“回声井”调度日志的一段校验码推到你终端。'
      : '雾音保持公关口径，只给你公开版本资料。你知道还有更深层的密钥没被交出。',
    choices: [
      { text: '继续追问数据边界，要求可审计条款。', effect: { logic: 1, oppose: 1 }, next: 's03' },
      { text: '先收下现有线索，准备和下一位来客交叉验证。', effect: { coop: 1, preserve: 1 }, next: 's03' }
    ]
  },
  s03: {
    type: 'order',
    title: '点单事件②：街头黑客',
    speaker: 'hacker',
    expression: 'angry',
    bg: 'alley',
    request: '烬线把湿掉的芯片袋拍在吧台："给我一杯能让我盯完三百页日志的，别端企业味。"',
    note: '点单目标：偏探索/对抗会激发黑客的真实情报。',
    npcKey: 'hacker',
    next: 's04',
    effects: [
      {
        id: 'hack-rebel',
        when: ({ tags, profile }) => (tags.includes('rebel') || tags.includes('explore') || tags.includes('risk')) && profile.bitter >= 3,
        effect: { oppose: 1, explore: 2 },
        setFlags: { hackerTrust: true },
        reply: '烬线一口闷下半杯："这才像今晚。好，我把原始链路也给你。"'
      },
      {
        id: 'hack-safe',
        when: ({ tags }) => tags.includes('safe') || tags.includes('cooperate'),
        effect: { coop: 1, preserve: 1 },
        setFlags: { hackerTrust: false },
        reply: '烬线挑眉："你在劝我收手？行，我先给你删减版。"'
      },
      {
        id: 'hack-default',
        when: () => true,
        effect: { explore: 1 },
        setFlags: { hackerTrust: false },
        reply: '烬线把杯垫翻过来，在背面写了个临时节点地址。'
      }
    ]
  },
  s04: {
    title: '中段：后厨拼图',
    speaker: 'zero',
    expression: 'neutral',
    bg: 'backroom',
    text: (st) => `你把企业和黑客线索并到离线终端，同一代号“回声井”浮现。\n\n${st.flags.hackerTrust ? '由于烬线给了你完整链路，时间线拼得更快。' : '链路存在断点，你得花更多时间补全证据。'}`,
    choices: [
      { text: '把证据拆成三份，通知三方对质。', effect: { coop: 1, logic: 1 }, next: 's05' },
      { text: '仅保留一份主密钥，由你单线推进。', effect: { oppose: 1, explore: 1 }, next: 's05' }
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
        reply: '韩铬点头："你考虑了执行风险。那我给你开临时通行。"'
      },
      {
        id: 'cop-hard',
        when: ({ profile }) => profile.alcohol >= 3,
        effect: { oppose: 1, emotion: 1 },
        setFlags: { detectiveTrust: false },
        reply: '韩铬把杯子推回一寸："这不该出现在执勤前。"'
      },
      {
        id: 'cop-default',
        when: () => true,
        effect: { logic: 1 },
        setFlags: { detectiveTrust: false },
        reply: '韩铬记住了你的态度，但仍按章办事。'
      }
    ]
  },
  s06: {
    title: '中段回扣：三方反应',
    speaker: 'detective',
    expression: 'smile',
    bg: 'street',
    text: (st) => {
      if (st.flags.detectiveTrust && st.flags.corpTrust) return '雾音与韩铬都同意先保住医疗电网，再推进公开审计。停火窗口第一次成形。';
      if (st.flags.hackerTrust && !st.flags.detectiveTrust) return '烬线催你立刻公开，韩铬却提高了封锁等级。你站在冲突正中央。';
      return '三方都在观望，你必须用下一轮选择证明自己。';
    },
    choices: [
      { text: '主张渐进公开，优先保证基础设施。', effect: { logic: 1, coop: 1 }, next: 's07' },
      { text: '主张一次性公开，强迫系统回应。', effect: { oppose: 1, explore: 1 }, next: 's07' }
    ]
  },
  s07: {
    title: '终段前夜：路由抉择',
    speaker: 'zero',
    expression: 'angry',
    bg: 'bar',
    text: (st) => `你回看整夜点单与选择。当前倾向：\n- Rational↔Emotional：${st.score.rational}\n- Cooperate↔Confront：${st.score.cooperate}\n- Explore↔Conserve：${st.score.explore}\n\n三位来客留下的杯垫排成一行，像是终章前的投票。`,
    choices: [
      { text: '确认路线锁定，进入终章。', effect: { logic: 1 }, routeLock: true, next: 's10A' }
    ]
  },
  s10A: { title:'终章A线：玻璃停火协议', speaker:'liaison', expression:'neutral', bg:'corp', text:'你以“低风险先行 + 公开审计”达成停火。酒吧的点单日志成为三方共同承认的时间轴。', choices:[{text:'执行停火流程。',effect:{coop:1,preserve:1},next:'END'}]},
  s10B: { title:'终章B线：霓虹燃烧广播', speaker:'hacker', expression:'angry', bg:'street', text:'你把整夜饮品订单与证据打包广播，城市在真相与混乱里同时苏醒。', choices:[{text:'点燃全城广播。',effect:{oppose:1,explore:1},next:'END'}]},
  s10C: { title:'终章C线：磁带群星网络', speaker:'zero', expression:'smile', bg:'bar', text:'你把酒吧点单系统改造成匿名记忆网络，任何人都能写入可验证证词。', choices:[{text:'启动群星节点。',effect:{logic:1,explore:1},next:'END'}]}
};
