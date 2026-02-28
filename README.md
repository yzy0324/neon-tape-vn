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
- 音频升级为 3 轨 WebAudio：`music`（BGM）/ `ambience`（雨声、低频轰鸣、霓虹嗡鸣）/ `sfx`（按钮、确认、存档、线索提示）；支持总开关、三轨开关、主音量与分轨音量。
- ambience 会根据场景 `bg/location` 自动切换，并做淡入淡出。
- 首次播放遵循浏览器限制：提供“点击开启音频”提示与按钮，用户交互后恢复 AudioContext。
- 音频设置会保存到 `localStorage`（同时写入存档），刷新后自动恢复。
- 文本播放升级：支持打字机效果（可配置速度）、“全文”一键显示、`Auto` 自动推进、`Skip` 仅跳过已读、`History` 历史回放（最近 40 条，可滚动）。
- 已读判定按 `sceneId + text hash` 持久化到存档字段 `readTextHashes`，并记录 `dialogueHistory` 以便读档后保留回放。
- 响应式移动端优化：≤768px 自动收缩布局，避免对话框、立绘、按钮溢出；新增“隐藏立绘 / 缩小UI”开关。
- 键盘快捷键：`Enter` 下一句、`1/2/3` 选项、`S` 存档面板、`L` 线索档案面板。
- A11y 基线增强：关键按钮添加 `aria-label`，默认字体与按钮字号上调以提升可读性。

## 自检与测试

在仓库根目录执行：

```bash
python scripts/selfcheck.py
node js/selfcheck.js
```

该脚本检查：

- 关键字符串存在
- 场景数量阈值（当前要求 >=12，含至少 3 个 `type:"order"`）
- 多结局存在（A/B/C）
- 新状态系统关键字段与条件分支存在
- 6 个关键 flags 存在
- 存档键、手动存档槽、`orderHistory/orderDrafts/pathHistory/clearedRuns/dialogueHistory/readTextHashes/audioSettings` 字段存在
- 3 轨音频关键实现标记存在（`setAmbienceForScene` / `playSfx`）
- 键盘快捷键与无障碍标签存在（Enter / 1,2,3 / S / L / aria-label）
- 新增 Node 自检：场景数、结局、schemaVersion、饮品数量、flags 数量、存档关键字段
