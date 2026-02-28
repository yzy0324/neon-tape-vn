#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const files = {
  html: path.join(ROOT, 'index.html'),
  main: path.join(ROOT, 'js', 'main.js'),
  story: path.join(ROOT, 'data', 'story.js'),
  drinks: path.join(ROOT, 'data', 'drinks.js'),
  state: path.join(ROOT, 'js', 'state.js'),
  validator: path.join(ROOT, 'tools', 'validate_story.js')
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
const story = read(files.story);
const drinks = read(files.drinks);
const state = read(files.state);
read(files.validator);

const sceneCount = (story.match(/\bs\d{2}[A-C]?\s*:\s*{/g) || []).length;
if (sceneCount < 12) fail(`scene count ${sceneCount} < 12`);
ok(`scene count: ${sceneCount}`);

const endings = ['结局A【', '结局B【', '结局C【'];
if (!endings.every((item) => main.includes(item))) fail('A/B/C endings missing');
ok('A/B/C endings exist');

const schemaMatch = main.match(/const\s+SAVE_SCHEMA_VERSION\s*=\s*(\d+)/);
if (!schemaMatch || Number(schemaMatch[1]) < 1) fail('invalid SAVE_SCHEMA_VERSION');
ok(`schemaVersion: ${schemaMatch[1]}`);

const drinkCount = (drinks.split('export const EXTRAS')[0].match(/id:\s*'[^']+'/g) || []).length;
if (drinkCount < 8) fail(`drink definitions ${drinkCount} < 8`);
ok(`drink definitions: ${drinkCount}`);

const importantFlagMatch = story.match(/const\s+importantFlags\s*=\s*\[([\s\S]*?)\]/);
const fallbackFlags = ['corpDeal', 'hackerTrust', 'policeWarrant', 'memoryTape', 'barShielded', 'truthLeakDraft'];
const flags = importantFlagMatch
  ? [...importantFlagMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  : fallbackFlags.filter((f) => story.includes(f));
if (flags.length < 6) fail(`important flags ${flags.length} < 6`);
ok(`important flags: ${flags.length}`);

const requiredKeys = ['sceneId', 'tendencies', 'flags', 'dialogueHistory', 'audioSettings', 'orderHistory'];
for (const key of requiredKeys) {
  if (!main.includes(key)) fail(`missing save key token: ${key}`);
}
ok('save payload tokens exist');

const keyboardTokens = ["event.key === 'Enter'", "['1', '2', '3']", "event.key.toLowerCase() === 's'", "event.key.toLowerCase() === 'l'"];
for (const token of keyboardTokens) {
  if (!main.includes(token)) fail(`missing keyboard token: ${token}`);
}
ok('keyboard shortcuts exist');

if (!html.includes('aria-label')) fail('aria-label not found in index.html');
ok('aria-label exists');

if (!state.includes('hasCondition')) fail('state condition checker missing');
ok('state condition checker exists');

if (!story.includes('STORY_SCHEMA') || !story.includes('STORY_FLAG_WHITELIST')) fail('story schema exports missing');
ok('story schema exports exist');

console.log('\nSelf-check passed.');
