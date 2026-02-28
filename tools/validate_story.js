#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const STORY_FILE = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.join(ROOT, 'data', 'story.js');

function lineOfIndex(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

function extractStringArrayFromExport(source, exportName) {
  const re = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const match = source.match(re);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function findSceneKeys(source) {
  const sceneKeyRegex = /^\s*(s\d{2}[A-C]?)\s*:\s*{/gm;
  const keys = [];
  let match;
  while ((match = sceneKeyRegex.exec(source))) {
    keys.push({
      id: match[1],
      index: match.index,
      line: lineOfIndex(source, match.index)
    });
  }
  return keys;
}

function captureBalancedObject(source, startIndex) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = startIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === '\'' || ch === '`') {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;

    if (depth === 0) {
      return source.slice(startIndex, i + 1);
    }
  }
  return null;
}

function loadStoryModule(source) {
  const transformed = source
    .replace(/export\s+const\s+/g, 'const ')
    .concat('\nmodule.exports = { scenes, STORY_FLAG_WHITELIST, STORY_ITEM_WHITELIST, STORY_RELATION_WHITELIST };\n');

  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Object,
    Array
  };
  vm.createContext(context);
  vm.runInContext(transformed, context, { filename: 'data/story.js' });
  return context.module.exports;
}

function pushError(errors, sceneId, line, message) {
  errors.push(`[scene:${sceneId} line:${line}] ${message}`);
}

function main() {
  if (!fs.existsSync(STORY_FILE)) {
    console.error(`Story file not found: ${STORY_FILE}`);
    process.exit(1);
  }
  const source = fs.readFileSync(STORY_FILE, 'utf8');
  const sceneKeys = findSceneKeys(source);

  const errors = [];
  const sceneSeen = new Map();
  for (const info of sceneKeys) {
    if (sceneSeen.has(info.id)) {
      pushError(errors, info.id, info.line, `duplicate sceneId, first defined at line ${sceneSeen.get(info.id)}`);
    } else {
      sceneSeen.set(info.id, info.line);
    }
  }

  const { scenes, STORY_FLAG_WHITELIST, STORY_ITEM_WHITELIST, STORY_RELATION_WHITELIST } = loadStoryModule(source);
  const sceneIds = new Set(Object.keys(scenes));
  const flagWhitelist = new Set(STORY_FLAG_WHITELIST?.length ? STORY_FLAG_WHITELIST : extractStringArrayFromExport(source, 'STORY_FLAG_WHITELIST'));
  const itemWhitelist = new Set(STORY_ITEM_WHITELIST?.length ? STORY_ITEM_WHITELIST : extractStringArrayFromExport(source, 'STORY_ITEM_WHITELIST'));
  const relationWhitelist = new Set(STORY_RELATION_WHITELIST?.length ? STORY_RELATION_WHITELIST : extractStringArrayFromExport(source, 'STORY_RELATION_WHITELIST'));

  const allowedConditionKeys = new Set(['flagsAll', 'flagsAny', 'itemAny', 'relAtLeast']);
  const locationByScene = new Map(sceneKeys.map((item) => [item.id, item]));

  for (const [sceneId, scene] of Object.entries(scenes)) {
    const sceneLine = locationByScene.get(sceneId)?.line || 1;
    const transitions = [];
    if (typeof scene.next === 'string') transitions.push({ next: scene.next, line: sceneLine });

    const choices = Array.isArray(scene.choices) ? scene.choices : [];
    choices.forEach((choice, idx) => {
      const label = typeof choice.text === 'string' ? choice.text : `choice#${idx + 1}`;
      if (typeof choice.next === 'string') {
        transitions.push({ next: choice.next, line: sceneLine, fromChoice: label });
      }

      const condition = choice.if || choice.requires;
      if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
        for (const key of Object.keys(condition)) {
          if (!allowedConditionKeys.has(key)) {
            pushError(errors, sceneId, sceneLine, `choice "${label}" has unsupported condition key: ${key}`);
          }
        }
        for (const flag of [...(condition.flagsAll || []), ...(condition.flagsAny || [])]) {
          if (!flagWhitelist.has(flag)) {
            pushError(errors, sceneId, sceneLine, `choice "${label}" references undefined flag in condition: ${flag}`);
          }
        }
        for (const item of condition.itemAny || []) {
          if (!itemWhitelist.has(item)) {
            pushError(errors, sceneId, sceneLine, `choice "${label}" references undefined item in condition: ${item}`);
          }
        }
        if (condition.relAtLeast?.name && !relationWhitelist.has(condition.relAtLeast.name)) {
          pushError(errors, sceneId, sceneLine, `choice "${label}" references undefined relation: ${condition.relAtLeast.name}`);
        }
      }

      for (const flag of [...(choice.setFlags || []), ...(choice.clearFlags || [])]) {
        if (!flagWhitelist.has(flag)) {
          pushError(errors, sceneId, sceneLine, `choice "${label}" uses undefined flag: ${flag}`);
        }
      }
      for (const item of [...(choice.addItem || []), ...(choice.removeItem || [])]) {
        if (!itemWhitelist.has(item)) {
          pushError(errors, sceneId, sceneLine, `choice "${label}" uses undefined item: ${item}`);
        }
      }
      if (choice.rel?.name && !relationWhitelist.has(choice.rel.name)) {
        pushError(errors, sceneId, sceneLine, `choice "${label}" uses undefined relation: ${choice.rel.name}`);
      }
    });

    (scene.effects || []).forEach((rule, index) => {
      const targetFlags = rule?.setFlags && typeof rule.setFlags === 'object' ? Object.keys(rule.setFlags) : [];
      targetFlags.forEach((flag) => {
        if (!flagWhitelist.has(flag)) {
          pushError(errors, sceneId, sceneLine, `effects[${index}] writes undefined flag: ${flag}`);
        }
      });
    });

    transitions.forEach((jump) => {
      if (jump.next !== 'END' && !sceneIds.has(jump.next)) {
        pushError(errors, sceneId, jump.line, `goto target not found: ${jump.next}${jump.fromChoice ? ` (from "${jump.fromChoice}")` : ''}`);
      }
    });
  }

  const inlineIfRegex = /if\s*:\s*{/g;
  let inlineMatch;
  while ((inlineMatch = inlineIfRegex.exec(source))) {
    const objectText = captureBalancedObject(source, inlineMatch.index + inlineMatch[0].length - 1);
    if (!objectText) continue;
    const keys = [...objectText.matchAll(/([a-zA-Z_][\w]*)\s*:/g)].map((m) => m[1]);
    const line = lineOfIndex(source, inlineMatch.index);
    for (const key of keys) {
      if (key === 'name' || key === 'val') continue;
      if (!allowedConditionKeys.has(key)) {
        errors.push(`[line:${line}] unknown condition key in inline object: ${key}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Story validation failed:');
    errors.forEach((err) => console.error(`- ${err}`));
    process.exit(1);
  }

  console.log(`Story validation passed. scenes=${sceneIds.size}, flags=${flagWhitelist.size}, items=${itemWhitelist.size}`);
}

main();
