const LEX = [
  ['ΣΚΙΒΙΔΙ', 4],
  ['ΨΕΣ', 4],
  ['ΔΟΜ', 3],
  ['ΔΟΡ', 3],
  ['ΝΕΕΗ', 2],
  ['ΔΟΒ', 2],
  ['ΒΟΡ', 1],
  ['ΡΕΡΗ', 1],
];
const SHORT = ['ΔΟΜ', 'ΔΟΒ', 'ΔΟΡ', 'ΒΟΡ', 'ΨΕΣ'];
const POOL = [];
LEX.forEach(([w, n]) => { for (let i = 0; i < n; i++) POOL.push(w); });

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const WORD = /\p{L}[\p{L}'’]*/gu;

export function skb(text) {
  const rand = rng(hash(text));
  let prev = '';
  return text
    .replace(/[¿¡]/g, '')
    .replace(WORD, (w) => {
      if (w.length < 2) return w;
      const pool = w.length <= 3 ? SHORT : POOL;
      let pick = pool[Math.floor(rand() * pool.length)];
      if (pick === prev && rand() < 0.5) pick = pool[Math.floor(rand() * pool.length)];
      prev = pick;
      return pick;
    });
}
