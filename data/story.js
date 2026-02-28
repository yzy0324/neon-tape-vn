import { chapter1Scenes } from './chapters/chap1.js';
import { chapter2Scenes } from './chapters/chap2.js';

export const STORY_SCHEMA = {
  sceneRequiredFields: ['type', 'title', 'speaker', 'bg', 'text', 'choices'],
  sceneOptionalFields: ['expression', 'request', 'note', 'npcKey', 'next', 'tags', 'requires', 'effects'],
  choiceOptionalFields: ['if', 'requires', 'effect', 'setFlags', 'clearFlags', 'addItem', 'removeItem', 'rel', 'routeLock']
};

export const STORY_FLAG_WHITELIST = [
  'barShielded',
  'corpTrust',
  'corpDeal',
  'hackerTrust',
  'memoryTape',
  'truthLeakDraft',
  'detectiveTrust',
  'policeWarrant',
  'ghostHandshake'
];

export const STORY_ITEM_WHITELIST = ['corpMemo', 'memoryTape', 'checksumSheet'];
export const STORY_RELATION_WHITELIST = ['liaison', 'hacker', 'detective'];

const rawScenes = {
  ...chapter1Scenes,
  ...chapter2Scenes
};

const withSceneSchemaDefaults = (scene) => {
  const choices = Array.isArray(scene.choices)
    ? scene.choices.map((choice) => ({
      requires: choice.requires || choice.if || {},
      ...choice
    }))
    : [];

  return {
    type: scene.type || 'dialogue',
    tags: scene.tags || [],
    requires: scene.requires || {},
    effects: Array.isArray(scene.effects) ? scene.effects : [],
    ...scene,
    choices
  };
};

export const scenes = Object.fromEntries(
  Object.entries(rawScenes).map(([sceneId, scene]) => [sceneId, withSceneSchemaDefaults(scene)])
);
