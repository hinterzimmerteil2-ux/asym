const Cards = require('./Cards');

function pips(id, name, cur, max, color, rest) {
  return { id, name, kind: 'pips', cur, max, color, ...rest };
}

function bar(id, name, cur, max, color, rest) {
  return { id, name, kind: 'bar', cur, max, color, ...rest };
}

function fromCards(entity, now) {
  const out = [];
  const hand = entity.hand || [];
  if (hand.some((sl) => sl && sl.chosen === 'tigermark')) {
    const card = Cards.getCard('tigermark');
    const st = entity.tiger || { mag: card.tiger.mag, reserve: card.tiger.start, reloadUntil: 0 };
    const reloading = st.reloadUntil > now;
    out.push(pips('tigermark', 'Savage Tigermark Round', st.mag, card.tiger.mag, '#ff4a4a', {
      extra: { label: 'Recargas', value: st.reserve },
      timer: reloading ? { pct: 1 - (st.reloadUntil - now) / card.tiger.reloadMs, label: 'Recargando' } : null,
      empty: st.mag <= 0 && !reloading,
    }));
  }
  return out;
}

function fromSuper(s) {
  if (!s) return [];
  if (s.id === 'town_level') {
    const out = [
      bar('mana', 'Maná', s.mana, s.manaMax, '#5aa9ff', {}),
      pips('balas', 'Balas', s.ammo, s.ammoMax, '#ffffff', {
        extra: { label: 'Cargadores', value: s.freeReloads },
        timer: s.reload > 0 ? { pct: 1 - s.reload / Math.max(1, s.reloadMax), label: 'Recargando' } : null,
        empty: s.ammo <= 0 && !(s.reload > 0),
      }),
      bar('escudo', 'Escudo', s.shield, s.shieldMax, '#7fd8ff', {}),
    ];
    if (s.charge > 0) out.push(bar('carga', 'Carga', s.charge, s.chargeMax, '#ffd86b', {}));
    return out;
  }
  if (s.id === 'minceraft') {
    return [bar('bloques', 'Bloques', s.used, s.max, '#b98a4e', { tags: s.mining > 0 ? [{ text: 'Picando', color: '#ffd86b' }] : [] })];
  }
  if (s.id === 'platinum_star') {
    const tags = [];
    if (s.form) tags.push({ text: 'Fabuloso', color: '#ffd24a' });
    if (s.ready) tags.push({ text: 'Contragolpe', color: '#ffd24a' });
    if (s.windUp) tags.push({ text: 'Apuntando', color: '#e6d8ff' });
    if (s.catching) tags.push({ text: 'Atrapando', color: '#7fd8ff' });
    return [bar('ritmo', 'Gay', s.rhythm, s.rhythmMax, s.rhythm >= s.pauseCost ? '#e6d8ff' : '#a98be8', { tags })];
  }
  return [];
}

function build(entity, supView, now) {
  return [...fromSuper(supView), ...fromCards(entity, now)];
}

module.exports = { build };
