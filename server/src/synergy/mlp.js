function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createMlp(inputSize, hiddenSize, seed = 7) {
  const rand = mulberry32(seed);
  const scale = Math.sqrt(2 / inputSize);
  const w1 = Array.from({ length: hiddenSize }, () => Array.from({ length: inputSize }, () => (rand() * 2 - 1) * scale));
  const b1 = new Array(hiddenSize).fill(0);
  const w2 = Array.from({ length: hiddenSize }, () => (rand() * 2 - 1) * Math.sqrt(2 / hiddenSize));
  return { inputSize, hiddenSize, w1, b1, w2, b2: 0 };
}

function forward(net, input) {
  const hidden = new Array(net.hiddenSize);
  for (let h = 0; h < net.hiddenSize; h++) {
    let sum = net.b1[h];
    const row = net.w1[h];
    for (let i = 0; i < net.inputSize; i++) sum += row[i] * input[i];
    hidden[h] = Math.tanh(sum);
  }
  let out = net.b2;
  for (let h = 0; h < net.hiddenSize; h++) out += net.w2[h] * hidden[h];
  return { out, hidden };
}

function predict(net, input) {
  return forward(net, input).out;
}

function trainStep(net, input, target, lr) {
  const { out, hidden } = forward(net, input);
  const err = out - target;
  for (let h = 0; h < net.hiddenSize; h++) {
    const grad = err * net.w2[h] * (1 - hidden[h] * hidden[h]);
    net.w2[h] -= lr * err * hidden[h];
    net.b1[h] -= lr * grad;
    const row = net.w1[h];
    for (let i = 0; i < net.inputSize; i++) row[i] -= lr * grad * input[i];
  }
  net.b2 -= lr * err;
  return err * err;
}

module.exports = { mulberry32, createMlp, predict, trainStep };
