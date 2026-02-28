export const DRINKS = [
  { id: 'sunless-zero', name: '无糖极昼', desc: '冷萃咖啡 + 柑橘精油，直线提神。', alcohol: 0, sweet: 1, bitter: 4, stim: 5, cost: 32, tags: ['focus', 'corp', 'dry'] },
  { id: 'neon-velvet', name: '霓虹天鹅绒', desc: '莓果利口 + 豆蔻糖浆，入口柔和。', alcohol: 3, sweet: 5, bitter: 1, stim: 2, cost: 45, tags: ['comfort', 'social', 'sweet'] },
  { id: 'proxy-smoke', name: '代理烟雾', desc: '黑麦威士忌 + 烟熏盐，层次偏硬。', alcohol: 5, sweet: 1, bitter: 4, stim: 3, cost: 52, tags: ['rebel', 'bold', 'dry'] },
  { id: 'cipher-tonic', name: '密钥汤力', desc: '杜松子 + 汤力水，干净且带苦。', alcohol: 4, sweet: 2, bitter: 3, stim: 4, cost: 48, tags: ['logic', 'focus', 'clean'] },
  { id: 'rain-loop', name: '雨回路', desc: '梅子乌龙高球，酸甜轻盈。', alcohol: 2, sweet: 3, bitter: 2, stim: 2, cost: 38, tags: ['balance', 'memory', 'soft'] },
  { id: 'mirror-protocol', name: '镜像协议', desc: '无酒精蓝柑薄荷，清凉醒脑。', alcohol: 0, sweet: 3, bitter: 1, stim: 3, cost: 28, tags: ['safe', 'cooperate', 'clean'] },
  { id: 'deep-trace', name: '深潜追踪', desc: '高浓咖啡马天尼，苦感锐利。', alcohol: 4, sweet: 2, bitter: 5, stim: 5, cost: 56, tags: ['explore', 'focus', 'risk'] },
  { id: 'warm-shield', name: '暖盾姜啤', desc: '姜汁汽饮 + 蜂蜜，低刺激护喉。', alcohol: 1, sweet: 4, bitter: 1, stim: 1, cost: 30, tags: ['safe', 'comfort', 'cooperate'] }
];

export const EXTRAS = [
  { id: 'extra-citrus', name: '柑橘皮', desc: '增强清晰度与提神感。', delta: { stim: 1, bitter: 1 }, tags: ['focus'] },
  { id: 'extra-syrup', name: '糖浆加倍', desc: '提升甜度，缓和紧张气氛。', delta: { sweet: 2, stim: -1 }, tags: ['comfort'] },
  { id: 'extra-ice', name: '碎冰', desc: '冷却酒精冲击，更稳妥。', delta: { alcohol: -1, bitter: -1 }, tags: ['safe'] },
  { id: 'extra-spice', name: '辛香滴剂', desc: '强化刺激，推进冒险倾向。', delta: { stim: 2, alcohol: 1 }, tags: ['risk'] }
];
