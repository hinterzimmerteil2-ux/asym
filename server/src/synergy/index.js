const fs = require('fs');
const path = require('path');
const { predict } = require('./mlp');
const { buildVocab, pairVector } = require('./features');

const BETA = Number(process.env.SYNERGY_BETA || 1.5);
let model = null;

function load(allCards) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'weights.json'), 'utf8'));
    const current = buildVocab(allCards);
    const sameVocab = JSON.stringify(raw.vocab) === JSON.stringify(current);
    if (!sameVocab) {
      console.warn('synergy: el catálogo cambió desde el entrenamiento, ejecuta node src/synergy/train.js. Sin sesgo por ahora.');
      model = null;
      return;
    }
    model = raw;
  } catch {
    model = null;
  }
}

function synergyScore(candidate, chosenCards) {
  if (!model || chosenCards.length === 0) return 0;
  let total = 0;
  for (const chosen of chosenCards) total += predict(model.net, pairVector(candidate, chosen, model.vocab));
  return total / chosenCards.length;
}

function synergyMultiplier(candidate, chosenCards) {
  return Math.exp(BETA * synergyScore(candidate, chosenCards));
}

module.exports = { load, synergyScore, synergyMultiplier };
