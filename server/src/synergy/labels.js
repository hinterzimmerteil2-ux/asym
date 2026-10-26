const GENERIC = new Set();
const COMPLEMENTS = [
  ['ofensiva', 'bonificadora', 0.3],
  ['escapista', 'defensiva', 0.3],
  ['ofensiva', 'escapista', 0.2],
  ['bonificadora', 'defensiva', 0.2],
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
