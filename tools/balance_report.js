#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const STORY_FILE = path.join(ROOT, 'data', 'story.js');

function loadStory() {
  const source = fs.readFileSync(STORY_FILE, 'utf8');
  const transformed = source
    .replace(/export\s+const\s+/g, 'const ')
    .concat('\nmodule.exports = { scenes };\n');
  const context = { module: { exports: {} }, exports: {}, console, Object, Array };
  vm.createContext(context);
  vm.runInContext(transformed, context, { filename: 'data/story.js' });
  return context.module.exports.scenes;
}

function toVector(effect = {}) {
  const safe = effect && typeof effect === 'object' ? effect : {};
  return {
    rational: (Number(safe.logic) || 0) - (Number(safe.emotion) || 0),
    cooperate: (Number(safe.coop) || 0) - (Number(safe.oppose) || 0),
    explore: (Number(safe.explore) || 0) - (Number(safe.preserve) || 0)
  };
}

function summarize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const mean = values.length ? total / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const positive = values.filter((v) => v > 0).length;
  const negative = values.filter((v) => v < 0).length;
  const zero = values.length - positive - negative;
  return { total, mean, min, max, positive, negative, zero };
}

function fmt(n) {
  return n > 0 ? `+${n}` : String(n);
}

function warn(axis, stat) {
  const warnings = [];
  if (Math.abs(stat.mean) >= 0.35) warnings.push(`均值偏移(${stat.mean.toFixed(2)})`);
  if (Math.abs(stat.total) >= 4) warnings.push(`总和偏移(${fmt(stat.total)})`);
  if (Math.abs(stat.min) >= 2 || Math.abs(stat.max) >= 2) warnings.push(`存在极端项[min=${fmt(stat.min)}, max=${fmt(stat.max)}]`);
  const swing = Math.max(stat.positive, stat.negative) / Math.max(1, Math.min(stat.positive, stat.negative));
  if (swing >= 2.5 && stat.positive + stat.negative >= 4) warnings.push(`正负数量失衡(${stat.positive}:${stat.negative})`);
  return warnings.length ? `⚠ ${axis}: ${warnings.join('；')}` : `✓ ${axis}: 分布基本均衡`;
}

function main() {
  const scenes = loadStory();
  const vectors = [];

  Object.entries(scenes).forEach(([sceneId, scene]) => {
    (scene.choices || []).forEach((choice, idx) => {
      const vector = toVector(choice.effect);
      vectors.push({ sceneId, idx: idx + 1, text: choice.text, ...vector });
    });
  });

  const axes = {
    rational: summarize(vectors.map((v) => v.rational)),
    cooperate: summarize(vectors.map((v) => v.cooperate)),
    explore: summarize(vectors.map((v) => v.explore))
  };

  console.log('== neon-tape-vn choice balance report ==');
  console.log(`choices: ${vectors.length}`);

  Object.entries(axes).forEach(([axis, stat]) => {
    console.log(`\n[${axis}] total=${fmt(stat.total)} mean=${stat.mean.toFixed(2)} min=${fmt(stat.min)} max=${fmt(stat.max)} pos=${stat.positive} neg=${stat.negative} zero=${stat.zero}`);
  });

  console.log('\n-- imbalance hints --');
  console.log(warn('理性/感性', axes.rational));
  console.log(warn('合作/对抗', axes.cooperate));
  console.log(warn('探索/保守', axes.explore));

  const topExtremes = vectors
    .map((item) => ({ item, magnitude: Math.abs(item.rational) + Math.abs(item.cooperate) + Math.abs(item.explore) }))
    .filter((row) => row.magnitude > 0)
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 5);

  if (topExtremes.length) {
    console.log('\n-- top extreme choices --');
    topExtremes.forEach(({ item, magnitude }) => {
      console.log(`- ${item.sceneId}#${item.idx} ${item.text} :: rational=${fmt(item.rational)} cooperate=${fmt(item.cooperate)} explore=${fmt(item.explore)} | magnitude=${magnitude}`);
    });
  }
}

main();
