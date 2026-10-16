const fs = require('fs');
const path = require('path');
const { CARDS } = require('../Cards');
const { createMlp, predict, trainStep, mulberry32 } = require('./mlp');
const { buildVocab, pairVector } = require('./features');
const { synergyLabel } = require('./labels');

const HIDDEN = 12;
const EPOCHS = 600;
const LEARNING_RATE = 0.03;

const cards = Object.values(CARDS);
const vocab = buildVocab(cards);
const samples = [];
for (const a of cards) {
  for (const b of cards) {
    if (a.id === b.id) continue;
    samples.push({ input: pairVector(a, b, vocab), target: synergyLabel(a, b) });
  }
}

const net = createMlp(samples[0].input.length, HIDDEN);
const rand = mulberry32(11);
for (let epoch = 0; epoch < EPOCHS; epoch++) {
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }
  let loss = 0;
  for (const sample of samples) loss += trainStep(net, sample.input, sample.target, LEARNING_RATE);
  if (epoch % 100 === 0 || epoch === EPOCHS - 1) console.log(`epoch ${epoch} mse ${(loss / samples.length).toFixed(4)}`);
}

const file = path.join(__dirname, 'weights.json');
fs.writeFileSync(file, JSON.stringify({ vocab, net }));
console.log(`pesos guardados en ${file} (${samples.length} pares)`);
