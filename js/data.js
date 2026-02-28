export const PORTRAIT_SIZE = Object.freeze({ width: 96, height: 144, pixel: 4 });
export const PORTRAIT_PALETTE = Object.freeze({
  dark: '#12071f',
  dark2: '#21103a',
  skin: '#f5b58f',
  skinShadow: '#d98d77',
  neonPurple: '#b56cff',
  neonCyan: '#49f7ff',
  neonPink: '#ff4db6',
  visor: '#9af5ff',
  eye: '#160c29',
  metal: '#5f6796',
  glow: '#fdf16e'
});

function mkPortraitSprite(config) {
  const w = 24;
  const h = 36;
  let rects = '';
  const px = (x, y, color) => {
    rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
  };
  const box = (x, y, rw, rh, color) => {
    for (let yy = 0; yy < rh; yy += 1) {
      for (let xx = 0; xx < rw; xx += 1) px(x + xx, y + yy, color);
    }
  };

  box(0, 0, w, h, PORTRAIT_PALETTE.dark);
  box(2, 3, 20, 30, PORTRAIT_PALETTE.dark2);
  box(6, 6, 12, 7, config.hair);
  box(8, 13, 8, 8, PORTRAIT_PALETTE.skin);
  box(8, 19, 8, 2, PORTRAIT_PALETTE.skinShadow);
  box(8, 14, 2, 2, config.eyeGlow);
  box(14, 14, 2, 2, config.eyeGlow);
  box(10, 14, 4, 2, config.visor ? PORTRAIT_PALETTE.visor : PORTRAIT_PALETTE.eye);
  box(10, 18, 4, 1, config.mouth);
  box(7, 21, 10, 2, config.neckwear);
  box(5, 23, 14, 9, config.coat);
  box(6, 26, 12, 1, config.accent);
  box(6, 29, 12, 1, config.accentAlt || config.accent);
  box(4, 24, 1, 7, PORTRAIT_PALETTE.metal);
  box(19, 24, 1, 7, PORTRAIT_PALETTE.metal);
  box(10, 23, 4, 2, PORTRAIT_PALETTE.glow);

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${PORTRAIT_SIZE.width}' height='${PORTRAIT_SIZE.height}' shape-rendering='crispEdges'>${rects}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function mkExpressions(base) {
  return {
    neutral: mkPortraitSprite({ ...base, mouth: PORTRAIT_PALETTE.eye }),
    smile: mkPortraitSprite({ ...base, mouth: PORTRAIT_PALETTE.neonCyan, accentAlt: PORTRAIT_PALETTE.neonPink }),
    angry: mkPortraitSprite({ ...base, mouth: PORTRAIT_PALETTE.neonPink, eyeGlow: PORTRAIT_PALETTE.neonPink })
  };
}

export const cast = {
  zero: {
    name: '零磁（你）',
    desc: '夜班调酒师，中立情报站维护员。',
    portraits: mkExpressions({ hair: PORTRAIT_PALETTE.neonPurple, coat: '#2d1a4f', accent: PORTRAIT_PALETTE.neonCyan, neckwear: PORTRAIT_PALETTE.neonPink, eyeGlow: PORTRAIT_PALETTE.neonCyan, visor: false })
  },
  liaison: {
    name: '绫濑雾音｜企业联络官',
    desc: '云穹生物的对外联络官，强调“合作才有明天”。',
    portraits: mkExpressions({ hair: PORTRAIT_PALETTE.neonPink, coat: '#301242', accent: PORTRAIT_PALETTE.neonPurple, neckwear: PORTRAIT_PALETTE.neonCyan, eyeGlow: PORTRAIT_PALETTE.neonCyan, visor: true })
  },
  hacker: {
    name: '烬线｜街头黑客',
    desc: '从排风管和旧网格里捞真相的人。',
    portraits: mkExpressions({ hair: PORTRAIT_PALETTE.neonCyan, coat: '#18234a', accent: PORTRAIT_PALETTE.neonPink, neckwear: PORTRAIT_PALETTE.neonPurple, eyeGlow: PORTRAIT_PALETTE.neonPurple, visor: false })
  },
  detective: {
    name: '韩铬｜义体警探',
    desc: '城市执法组的义体侦缉官，偏好可执行方案。',
    portraits: mkExpressions({ hair: '#7381bf', coat: '#2a3154', accent: PORTRAIT_PALETTE.neonCyan, neckwear: PORTRAIT_PALETTE.neonPurple, eyeGlow: PORTRAIT_PALETTE.neonPink, visor: true })
  }
};
