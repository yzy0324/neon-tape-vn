import { DRINKS, EXTRAS } from '../data/drinks.js';

function sumProfile(drink, extras) {
  const profile = {
    alcohol: drink.alcohol,
    sweet: drink.sweet,
    bitter: drink.bitter,
    stim: drink.stim
  };
  extras.forEach((extra) => {
    Object.entries(extra.delta || {}).forEach(([k, v]) => {
      profile[k] = Math.max(0, (profile[k] || 0) + v);
    });
  });
  return profile;
}

export function buildOrderPayload(draft) {
  const drink = DRINKS.find((item) => item.id === draft.drinkId) || DRINKS[0];
  const extras = EXTRAS.filter((item) => draft.extraIds?.includes(item.id));
  const profile = sumProfile(drink, extras);
  const tags = [...drink.tags, ...extras.flatMap((item) => item.tags || [])];
  return { drink, extras, profile, tags };
}

export function renderDrinkPanel(container, scene, draft, onChange, onServe) {
  container.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'drink-panel';
  shell.innerHTML = `
    <div class="drink-head">${scene.request}</div>
    <div class="drink-note">${scene.note || ''}</div>
    <label>基底饮品</label>
    <select id="drinkSelect"></select>
    <div class="drink-extras"></div>
    <div class="drink-preview"></div>
    <button class="serve-btn">出杯</button>
  `;

  const select = shell.querySelector('#drinkSelect');
  const extrasWrap = shell.querySelector('.drink-extras');
  const preview = shell.querySelector('.drink-preview');
  const serveBtn = shell.querySelector('.serve-btn');

  DRINKS.forEach((drink) => {
    const option = document.createElement('option');
    option.value = drink.id;
    option.textContent = `${drink.name}（甜${drink.sweet}/苦${drink.bitter}/刺激${drink.stim}）`;
    if (draft.drinkId === drink.id) option.selected = true;
    select.appendChild(option);
  });

  EXTRAS.forEach((extra) => {
    const id = `extra_${extra.id}`;
    const item = document.createElement('label');
    item.className = 'extra-item';
    item.innerHTML = `<input type="checkbox" id="${id}" value="${extra.id}" ${draft.extraIds?.includes(extra.id) ? 'checked' : ''}/> ${extra.name}`;
    extrasWrap.appendChild(item);
  });

  const refresh = () => {
    const selectedExtraIds = [...extrasWrap.querySelectorAll('input:checked')]
      .slice(0, 2)
      .map((node) => node.value);
    const nextDraft = { drinkId: select.value, extraIds: selectedExtraIds };
    const payload = buildOrderPayload(nextDraft);
    preview.textContent = `配方：${payload.drink.name}${payload.extras.length ? ` + ${payload.extras.map((item) => item.name).join(' / ')}` : ''} ｜ 酒精${payload.profile.alcohol} 甜${payload.profile.sweet} 苦${payload.profile.bitter} 刺激${payload.profile.stim}`;
    onChange(nextDraft, payload);
    return payload;
  };

  select.onchange = refresh;
  extrasWrap.onchange = refresh;
  serveBtn.onclick = () => {
    const payload = refresh();
    onServe(payload);
  };

  refresh();
  container.appendChild(shell);
}
