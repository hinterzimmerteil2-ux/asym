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

const GREEK = { a: 'Α', b: 'Β', c: 'Κ', d: 'Δ', e: 'Ε', f: 'Φ', g: 'Γ', h: 'Η', i: 'Ι', j: 'Ι', k: 'Κ', l: 'Λ', m: 'Μ', n: 'Ν', o: 'Ο', p: 'Π', q: 'Κ', r: 'Ρ', s: 'Σ', t: 'Τ', u: 'Υ', v: 'Β', w: 'Ω', x: 'Ξ', y: 'Υ', z: 'Ζ' };

export function toGreek(text) {
  return text.replace(/[A-Za-z\u00C0-\u00FF]/g, (ch) => {
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return GREEK[base] || ch;
  });
}
