function buildVocab(cards) {
  const decks = new Set();
  const keywords = new Set();
  for (const card of cards) {
    if (card.deck) decks.add(card.deck);
    for (const keyword of card.keywords || []) keywords.add(keyword);
  }
  return { decks: [...decks].sort(), keywords: [...keywords].sort() };
}

function cardVector(card, vocab) {
  const vector = [];
  for (const deck of vocab.decks) vector.push(card.deck === deck ? 1 : 0);
  for (const keyword of vocab.keywords) vector.push((card.keywords || []).includes(keyword) ? 1 : 0);
  vector.push(card.corrupt ? 1 : 0);
  vector.push(card.maxHpSet || card.maxHpDelta || card.flojeraMaxDelta ? 1 : 0);
  vector.push(card.rarity === 'common' ? 1 : 0, card.rarity === 'uncommon' ? 1 : 0, card.rarity === 'rare' ? 1 : 0);
  return vector;
}

function pairVector(candidate, context, vocab) {
  return cardVector(candidate, vocab).concat(cardVector(context, vocab));
}

module.exports = { buildVocab, cardVector, pairVector };
