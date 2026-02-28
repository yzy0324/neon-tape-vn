export const chapter2Scenes = {
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
      { text: '优先保障真相完整，接受短时冲击。', effect: { oppose: 1, explore: 1 }, next: 's09' },
      { text: '触发灰匣支线：核对三方共同签名。', if: { flagsAll: ['corpDeal', 'truthLeakDraft'], relAtLeast: { name: 'hacker', val: 1 } }, effect: { logic: 1, coop: 1 }, next: 's11' }
    ]
  },
  s11: {
    title: '支线｜灰匣协议：入口',
    speaker: 'zero',
    expression: 'neutral',
    bg: 'backroom',
    text: '你拉下备用卷帘门，调出企业、暗网、执法三端签名片段。只要能拼出共同指纹，终章就有机会少流一点血。',
    choices: [
      { text: '继续：按时间戳重排签名序列。', effect: { logic: 1 }, next: 's12' },
      { text: '放弃支线，直接进入终章。', effect: { preserve: 1 }, next: 's09' }
    ]
  },
  s12: {
    title: '支线｜灰匣协议：企业片段',
    speaker: 'liaison',
    expression: 'neutral',
    bg: 'corp',
    text: '雾音把私钥校验窗短暂开放 90 秒："我不会替你公开，但我可以证明这份审计链没被伪造。"',
    choices: [
      { text: '接受协作片段，保留审计时间戳。', effect: { coop: 1, logic: 1 }, rel: { name: 'liaison', value: 1 }, next: 's13' },
      { text: '只拷贝摘要，避免企业反向追踪。', effect: { preserve: 1, explore: 1 }, next: 's13' }
    ]
  },
  s13: {
    title: '支线｜灰匣协议：暗网片段',
    speaker: 'hacker',
    expression: 'angry',
    bg: 'alley',
    text: '烬线把噪声混进语音频道："签名要成立，得把我这段离线校验也写进去。你敢不敢把我的名字匿名化，而不是抹掉？"',
    choices: [
      { text: '保留黑客证词并匿名化来源。', effect: { explore: 1, coop: 1 }, rel: { name: 'hacker', value: 1 }, next: 's14' },
      { text: '仅保留哈希，不留证词正文。', effect: { logic: 1, preserve: 1 }, rel: { name: 'hacker', value: -1 }, next: 's14' }
    ]
  },
  s14: {
    title: '支线｜灰匣协议：执法片段',
    speaker: 'detective',
    expression: 'smile',
    bg: 'street',
    text: (st) => st.flags.policeWarrant
      ? '韩铬看着仍在倒计时的搜查令："我不能撤令，但能给你一份链路完整性证明。"'
      : '韩铬把执法封存章盖在你终端："你现在有足够材料写一个不会立刻崩盘的公开方案。"',
    choices: [
      { text: '完成灰匣协议并写入终章注释。', setFlags: ['ghostHandshake'], effect: { logic: 1, coop: 1 }, rel: { name: 'detective', value: 1 }, next: 's15' }
    ]
  },
  s15: {
    title: '支线｜灰匣协议：归并',
    speaker: 'zero',
    expression: 'smile',
    bg: 'dawn',
    text: '你把三端签名拼成一枚“灰匣”指纹。它不能决定你走哪条结局路由，但会让最终声明多一段可核验的共同证词。',
    choices: [
      { text: '携带灰匣注释进入终章。', effect: { preserve: 1 }, next: 's09' }
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
    text: (st) => `你以“低风险先行 + 公开审计”达成停火。${st.flags.policeWarrant ? '但警方搜查令仍悬而未决，协议执行十分脆弱。' : '搜查令被撤回，三方首次签下可追责条款。'}${st.flags.ghostHandshake ? '\n\n【灰匣注释】你附上三端共同签名，停火声明首次具备跨阵营可核验段落。' : ''}`,
    choices: [{ text: '执行停火流程。', effect: { coop: 1, preserve: 1 }, next: 'END' }]
  },
  s10B: {
    title: '终章B线：霓虹燃烧广播',
    speaker: 'hacker',
    expression: 'angry',
    bg: 'street',
    text: (st) => `你把整夜证据打包广播。${st.flags.truthLeakDraft && st.inventory.includes('memoryTape') ? '完整记忆磁带让公众看见不可抵赖的原始链路。' : '证据仍有断层，城市在半真相里爆燃。'}${st.flags.ghostHandshake ? '\n\n【灰匣注释】共同签名段落让广播内容多了一条可交叉验证的索引。' : ''}`,
    choices: [{ text: '点燃全城广播。', effect: { oppose: 1, explore: 1 }, next: 'END' }]
  },
  s10C: {
    title: '终章C线：磁带群星网络',
    speaker: 'zero',
    expression: 'smile',
    bg: 'bar',
    text: (st) => `你把酒吧点单系统改造成匿名记忆网络。${st.flags.barShielded ? '早先部署的屏障让节点成功熬过第一轮清洗。' : '由于缺少屏障，首批节点损失惨重但火种仍在。'}${st.flags.ghostHandshake ? '\n\n【灰匣注释】共同签名成为群星网络的首条“跨阵营信标”。' : ''}`,
    choices: [{ text: '启动群星节点。', effect: { logic: 1, explore: 1 }, next: 'END' }]
  }
};
