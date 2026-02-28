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

- 酒吧夜班叙事节奏：点单 / 对话 / 情报交换 / 三方张力（企业、黑客、执法）。
- 三维倾向系统（整数区间 -5..+5）：Rational↔Emotional、Cooperate↔Confront、Explore↔Conserve（实时进度条）。
- 终章前会进行路线锁定（Route Lock），并在 UI 显示当前更接近的路线。
- 3 条强主题结局：A【玻璃停火】/ B【霓虹燃烧】/ C【磁带群星】。
- 结局页支持关键选择回顾，并可从结局返回标题。
- 存档系统：3 个手动槽（Slot1/2/3）+ 1 个自动存档（Auto），介质为 `localStorage`。
- 磁带风格存档面板：支持保存/读取、导出到 JSON（同步写入文本框并复制剪贴板）与从文本框导入。
- 存档字段与兼容：`sceneId`、三维倾向值、日志数组、已解锁结局列表、`bgmEnabled`、`bgmVolume`，并带 `schemaVersion` 兼容旧版本。
- BGM 使用 WebAudio 合成，可开关，并处理用户交互后播放限制。

## 自检

在仓库根目录执行：

```bash
python scripts/selfcheck.py
```

脚本会检查：

- 关键字符串存在
- 场景数量阈值（>=13，含路线终章）
- 多结局存在（A/B/C）
- 路线锁定与分路线终章存在
- 存档键、手动存档槽、导入导出控件与 schemaVersion 字段存在
