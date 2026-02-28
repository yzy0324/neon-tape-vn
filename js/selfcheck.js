#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const files = {
  html: path.join(ROOT, 'index.html'),
  css: path.join(ROOT, 'css', 'ui.css'),
  main: path.join(ROOT, 'js', 'main.js'),
  story: path.join(ROOT, 'data', 'story.js'),
  chap1: path.join(ROOT, 'data', 'chapters', 'chap1.js'),
  chap2: path.join(ROOT, 'data', 'chapters', 'chap2.js'),
  drinks: path.join(ROOT, 'data', 'drinks.js'),
  state: path.join(ROOT, 'js', 'state.js'),
  validator: path.join(ROOT, 'tools', 'validate_story.js'),
  balanceReport: path.join(ROOT, 'tools', 'balance_report.js'),
  basicCheck: path.join(ROOT, 'tests', 'basic_check.js')
};

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

function read(file) {
  if (!fs.existsSync(file)) fail(`missing file: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

const html = read(files.html);
const main = read(files.main);
const css = read(files.css);
const story = read(files.story);
const chap1 = read(files.chap1);
const chap2 = read(files.chap2);
const chapterStory = `${chap1}\n${chap2}`;
const drinks = read(files.drinks);
const state = read(files.state);
read(files.validator);
const balanceReport = read(files.balanceReport);
const basicCheck = read(files.basicCheck);

const sceneCount = (chapterStory.match(/\bs\d{2}[A-C]?\s*:\s*{/g) || []).length;
if (sceneCount < 12) fail(`scene count ${sceneCount} < 12`);
ok(`scene count: ${sceneCount}`);

const endings = ['结局A【', '结局B【', '结局C【'];
if (!endings.every((item) => main.includes(item))) fail('A/B/C endings missing');
ok('A/B/C endings exist');

if (!story.includes('chapter1Scenes') || !story.includes('chapter2Scenes')) fail('chapter merge import missing in story.js');
if (!story.includes('...chapter1Scenes') || !story.includes('...chapter2Scenes')) fail('chapter spread merge missing in story.js');
ok('chapter merge structure exists');

const branchSceneCount = (chap2.match(/\bs1[1-5]\s*:\s*{/g) || []).length;
if (branchSceneCount < 4) fail(`side branch scenes ${branchSceneCount} < 4`);
ok(`side branch scenes: ${branchSceneCount}`);

for (const token of ["flagsAll: ['corpDeal', 'truthLeakDraft']", "relAtLeast: { name: 'hacker', val: 1 }", "setFlags: ['ghostHandshake']"]) {
  if (!chap2.includes(token)) fail(`missing side-branch token: ${token}`);
}
ok('side-branch trigger and completion tokens exist');

for (const token of ['st.flags.ghostHandshake', 'sideQuestSuffix', '灰匣注释']) {
  if (!(`${chap2}\n${main}`).includes(token)) fail(`missing ending variation token: ${token}`);
}
ok('ending variation tokens exist');

const schemaMatch = main.match(/const\s+SAVE_SCHEMA_VERSION\s*=\s*(\d+)/);
if (!schemaMatch || Number(schemaMatch[1]) < 1) fail('invalid SAVE_SCHEMA_VERSION');
ok(`schemaVersion: ${schemaMatch[1]}`);

const drinkCount = (drinks.split('export const EXTRAS')[0].match(/id:\s*'[^']+'/g) || []).length;
if (drinkCount < 8) fail(`drink definitions ${drinkCount} < 8`);
ok(`drink definitions: ${drinkCount}`);

const importantFlagMatch = chapterStory.match(/const\s+importantFlags\s*=\s*\[([\s\S]*?)\]/);
const fallbackFlags = ['corpDeal', 'hackerTrust', 'policeWarrant', 'memoryTape', 'barShielded', 'truthLeakDraft', 'ghostHandshake'];
const flags = importantFlagMatch
  ? [...importantFlagMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  : fallbackFlags.filter((f) => chapterStory.includes(f) || story.includes(f));
if (flags.length < 6) fail(`important flags ${flags.length} < 6`);
ok(`important flags: ${flags.length}`);

const requiredKeys = ['sceneId', 'tendencies', 'flags', 'dialogueHistory', 'audioSettings', 'orderHistory'];
for (const key of requiredKeys) {
  if (!main.includes(key)) fail(`missing save key token: ${key}`);
}
ok('save payload tokens exist');

for (const token of ['routeForecast', 'routeDiagnosisList', 'normalizeEffectVector', 'tendencyDelta', '终章预测：代号']) {
  if (!(`${html}\n${main}`).includes(token)) fail(`missing diagnosis token: ${token}`);
}
ok('route diagnosis + forecast tokens exist');

if (!balanceReport.includes('choice balance report') || !balanceReport.includes('imbalance hints')) fail('balance report script markers missing');
ok('balance report script markers exist');

const keyboardTokens = ["event.key === 'Enter'", "['1', '2', '3']", "event.key.toLowerCase() === 's'", "event.key.toLowerCase() === 'l'"];
for (const token of keyboardTokens) {
  if (!main.includes(token)) fail(`missing keyboard token: ${token}`);
}
ok('keyboard shortcuts exist');

if (!html.includes('aria-label')) fail('aria-label not found in index.html');
ok('aria-label exists');


const layoutTokens = [
  'overflow: hidden',
  'height: 100%',
  'height: calc(var(--vh) * 100 - 14px)',
  '.story.story-clamped',
  '.choices',
  '.story-modal',
  'max-height: calc(100dvh - 24px)'
];
for (const token of layoutTokens) {
  if (!css.includes(token)) fail(`missing responsive layout token in css/ui.css: ${token}`);
}
ok('responsive anti-overflow tokens exist in css/ui.css');

for (const token of ['updateViewportHeightVar', 'reportNoScroll', 'togglePanelWithLayoutCheck', 'expandStoryBtn', 'storyModal']) {
  if (!main.includes(token)) fail(`missing runtime layout check token: ${token}`);
}
ok('runtime layout self-check helpers exist');

for (const token of ['scrollHeight', 'scrollWidth', '390x844']) {
  if (!basicCheck.includes(token)) fail(`missing no-scroll test token: ${token}`);
}
ok('tests/basic_check.js no-scroll checks exist');

if (!state.includes('hasCondition')) fail('state condition checker missing');
ok('state condition checker exists');

if (!story.includes('STORY_SCHEMA') || !story.includes('STORY_FLAG_WHITELIST')) fail('story schema exports missing');
ok('story schema exports exist');

console.log('\nSelf-check passed.');
