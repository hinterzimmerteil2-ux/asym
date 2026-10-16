const GENERIC = new Set(['area', 'corrupto']);
const COMPLEMENTS = [
  ['flojera', 'sabotaje', 0.3],
  ['daño', 'comida', 0.4],
  ['aliado', 'veloz', 0.3],
  ['impulso', 'sabotaje', 0.4],
  ['zona', 'trampa', 0.4],
  ['exacerbacion', 'sabotaje', 0.3],
  ['pereza', 'aliado', 0.3],
];

function has(card, keyword) {
  return (card.keywords || []).includes(keyword);
}

function synergyLabel(a, b) {
  let score = 0;
  if (a.deck && a.deck === b.deck) score += 0.6;
  for (const keyword of a.keywords || []) {
    if (!GENERIC.has(keyword) && has(b, keyword)) score += 0.25;
  }
  for (const [x, y, weight] of COMPLEMENTS) {
    if ((has(a, x) && has(b, y)) || (has(a, y) && has(b, x))) score += weight;
  }
  const costly = (card) => Boolean(card.maxHpSet || card.maxHpDelta || card.flojeraMaxDelta);
  if (a.corrupt && b.corrupt) score -= 0.4;
  if (costly(a) && costly(b)) score -= 0.3;
  return Math.max(-1, Math.min(1, score));
}

module.exports = { synergyLabel };
