# neon-tape-vn

一个纯静态 Web 视觉小说项目（HTML/CSS/JS），可直接通过本地静态服务器运行。

## 运行方式

在仓库根目录执行：

```bash
python -m http.server 8000
```

随后在浏览器打开：

- <http://localhost:8000>

## 当前内容摘要

- 酒吧夜班叙事节奏：对话 + 选项 + 3 次点单/调酒事件（企业/黑客/警探）。
- `choice` 已支持系统化状态改动：`setFlags` / `clearFlags` / `addItem` / `removeItem` / `rel`。
- 统一状态由 `js/state.js` 管理：`flags`、`inventory`、`relations`、`tendencies`。
- 条件系统支持：`if: { flagsAll, flagsAny, itemAny, relAtLeast }`，多个关键分支由状态驱动。
- 新增线索板/档案面板：可查看已获线索、关键人物关系条、重要 flags（人类可读名）。
- 剧情中包含并使用 6 个关键 flags：`corpDeal`、`hackerTrust`、`policeWarrant`、`memoryTape`、`barShielded`、`truthLeakDraft`。
- 三维倾向系统（-5..+5）：Rational↔Emotional、Cooperate↔Confront、Explore↔Conserve（实时进度条）。
- 3 条结局：A【玻璃停火】/ B【霓虹燃烧】/ C【磁带群星】。
- 存档系统：3 个手动槽（Slot1/2/3）+ 1 个自动存档（Auto），介质为 `localStorage`。
- 存档字段包含 `sceneId`、`tendencies/tendency`、`flags`、`inventory`、`relations`、剧情日志、点单历史/草稿、BGM 状态，并新增 `pathHistory` 与 `clearedRuns`。
- 新增“结局档案馆”面板：展示 A/B/C 结局解锁状态、每次通关至少 6 条关键选择（含选项与效果）、以及可点击节点流程图。
- 支持回放模式（只读）：从流程图任意节点进入回放，不覆盖当前存档；可一键创建分支存档到 Slot3。
- BGM 使用 WebAudio 合成，支持开关与音量调节。
- 文本播放升级：支持打字机效果（可配置速度）、“全文”一键显示、`Auto` 自动推进、`Skip` 仅跳过已读、`History` 历史回放（最近 40 条，可滚动）。
- 已读判定按 `sceneId + text hash` 持久化到存档字段 `readTextHashes`，并记录 `dialogueHistory` 以便读档后保留回放。

## 自检与测试

在仓库根目录执行：

```bash
python scripts/selfcheck.py
```

该脚本检查：

- 关键字符串存在
- 场景数量阈值（当前要求 >=12，含至少 3 个 `type:"order"`）
- 多结局存在（A/B/C）
- 新状态系统关键字段与条件分支存在
- 6 个关键 flags 存在
- 存档键、手动存档槽、`orderHistory/orderDrafts/pathHistory/clearedRuns/dialogueHistory/readTextHashes` 字段存在
