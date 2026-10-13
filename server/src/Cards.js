const CARDS = {
  sprint_panico: {
    id: 'sprint_panico',
    displayName: 'Sprint de Pánico',
    description: 'Velocidad +60% por 4s, sin gastar Flojera.',
    durationMs: 4000,
    cooldownMs: 20000,
    speedMultiplier: 1.6,
  },
};

const DECK_POOL = ['sprint_panico'];

function getCard(cardId) {
  return CARDS[cardId] || null;
}

function dealHand(handSize = 2) {
  const hand = [];
  for (let i = 0; i < handSize; i++) {
    hand.push(DECK_POOL[Math.floor(Math.random() * DECK_POOL.length)]);
  }
  return hand;
}

module.exports = { CARDS, DECK_POOL, getCard, dealHand };
