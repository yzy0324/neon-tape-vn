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
- 新增 `type: "order"` 场景：NPC 点单 → 玩家调制（饮品 + 最多 2 个加料）→ 根据属性与 tags 触发倾向变化与变量。
- 三维倾向系统（整数区间 -5..+5）：Rational↔Emotional、Cooperate↔Confront、Explore↔Conserve（实时进度条）。
- 点单日志会记录“给了谁什么饮品”，并影响后续台词与路线分支。
- 3 条结局：A【玻璃停火】/ B【霓虹燃烧】/ C【磁带群星】。
- 4 名主要角色使用 SVG 像素风赛博朋克立绘，固定渲染尺寸 96x144。
- 存档系统：3 个手动槽（Slot1/2/3）+ 1 个自动存档（Auto），介质为 `localStorage`。
- 存档字段包含 `sceneId`、倾向值、flags、剧情日志、点单历史/草稿、BGM 状态。
- BGM 使用 WebAudio 合成，支持开关与音量调节。

## 自检与测试

在仓库根目录执行：

```bash
python scripts/selfcheck.py
```

该脚本检查：

- 关键字符串存在
- 场景数量阈值（含至少 3 个 `type:"order"`）
- 多结局存在（A/B/C）
- 饮品数据与调酒面板关键代码存在
- 存档键、手动存档槽、`orderHistory/orderDrafts` 字段存在
