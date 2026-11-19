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

export const SKB_MARKS = [
  ['\u0300', 'trino faríngeo grave'],
  ['\u0301', 'chasquido agudo glandular'],
  ['\u0302', 'vibración de horizonte de eventos'],
  ['\u0303', 'nasal con eco doble'],
  ['\u0304', 'sostenido intergaláctico'],
  ['\u0306', 'cierre de glotis y branquia'],
  ['\u0307', 'pulso de la glándula dorsal'],
  ['\u0308', 'armónico partido'],
  ['\u030A', 'resonancia de órbita'],
  ['\u030B', 'grito comprimido'],
  ['\u030C', 'tono que dobla el espacio'],
  ['\u0323', 'sub-grave de 40 Hz'],
  ['\u0328', 'succión nasal inversa'],
  ['\u0331', 'silencio audible'],
  ['\u0345', 'eco del origen'],
];

const VOWELS = /[ΑΕΗΙΟΥΩ]/;

function marked(word, seed) {
  const chars = Array.from(word);
  const idx = [];
  chars.forEach((c, i) => { if (VOWELS.test(c)) idx.push(i); });
  if (!idx.length) return word;
  const rand = rng(hash(word + seed));
  const count = 1 + Math.floor(rand() * Math.min(3, idx.length));
  const out = chars.slice();
  for (let n = 0; n < count; n++) {
    const at = idx[Math.floor(rand() * idx.length)];
    out[at] += SKB_MARKS[Math.floor(rand() * SKB_MARKS.length)][0];
  }
  return out.join('');
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
      return marked(pick, w);
    });
}

export function skbWord(w) {
  const lower = w.toLowerCase();
  const pool = lower.length <= 3 ? SHORT : POOL;
  return marked(pool[hash(lower) % pool.length], lower);
}

const KEYS = new Set(['Ctrl', 'Shift', 'Alt', 'Tab', 'Esc', 'Enter', 'Space', 'WASD', 'Fn']);
const UNITS = new Set(['s', 'ms', 'm', 'x', 'k', 'px', 'hz']);
const PROTECT = /(\S+@\S+|https?:\/\/\S+|www\.\S+)/;
const LATIN = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]+/g;
let names = new Set();
let namesKey = '';

export function setSkbNames(list) {
  const clean = (Array.isArray(list) ? list : []).map((n) => String(n || '')).filter(Boolean);
  const key = clean.join('\u0001');
  if (key === namesKey) return false;
  namesKey = key;
  names = new Set();
  for (const n of clean) for (const w of n.toLowerCase().split(/[^\p{L}\p{N}_]+/u)) if (w) names.add(w);
  return true;
}

function segment(seg) {
  return seg.replace(LATIN, (w, at) => {
    const next = seg[at + w.length] || '';
    const prev = seg[at - 1] || '';
    if (/[\d_]/.test(next) || prev === '_') return w;
    if (KEYS.has(w)) return w;
    if (w.length === 1 && /[A-Z]/.test(w)) {
      const asWord = 'AYO'.includes(w) && /^\s[a-z\d¡¿]/.test(seg.slice(at + 1, at + 3)) && /(^|[.!?:]\s)$/.test(seg.slice(0, at));
      return asWord ? skbWord(w) : w;
    }
    if (UNITS.has(w) && /\d\s?$/.test(seg.slice(0, at))) return w;
    if (names.has(w.toLowerCase())) return w;
    return skbWord(w);
  });
}

export function skbLeftovers(text) {
  return text.split(PROTECT).map((part, i) => (i % 2 ? part : segment(part))).join('');
}
