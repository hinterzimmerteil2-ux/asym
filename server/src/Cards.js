const Synergy = require('./synergy');

const RARITY_WEIGHTS = { common: 50, uncommon: 25, rare: 10 };

const CARDS = {
  acetilcolina: {
    id: 'acetilcolina',
    keywords: ['bonificadora'],
    displayName: 'Acetilcolina',
    description: 'Velocidad masiva por 5s. Correr gasta Flojera y no se regenera; si llegas a 0 el boost sigue hasta que acabe. Los Pacientes que te pasen por encima ganan un poco de velocidad. Al terminar, 1s sin regenerar y luego vas lento un rato.',
    rarity: 'rare',
    durationMs: 5000,
    cooldownMs: 30000,
  },
  rodar: {
    id: 'rodar',
    keywords: ['escapista'],
    displayName: 'Rodar',
    description: 'Dash que, si golpea al Curador, lo lanza lejos (ragdoll) y te deja donde estaba él (dropkick); arrastra a tus aliados; sube plataformas de hasta 1.8 de alto. Gasta 25 de Flojera.',
    rarity: 'uncommon',
    cooldownMs: 32000,
  },
  tropiezo: {
    id: 'tropiezo',
    hitRadius: 2.5,
    keywords: ['ofensiva'],
    displayName: 'Tropiezo',
    description: 'Derriba (ragdoll) 3s al Curador dentro de un cubo de 2.5 alrededor tuyo y le quita 25 HP. Tú quedas en endlag 1.2s al usarla.',
    curatorHpLoss: 25,
    rarity: 'rare',
    durationMs: 3000,
    cooldownMs: 28000,
  },
  chicharron: {
    id: 'chicharron',
    keywords: ['bonificadora'],
    displayName: 'Chicharrón',
    description: 'Comes: pierdes 20 de HP, hasta un mínimo de 55. Si ya estás en el mínimo, correr 3s más rápido.',
    rarity: 'common',
    cooldownMs: 20000,
  },
  goyslop: {
    id: 'goyslop',
    corrupt: true,
    keywords: ['bonificadora'],
    displayName: 'Goyslop',
    description: 'Pierdes 38 de HP, hasta un mínimo de 35 y corres 4s mucho más rápido. Si ya estás en el mínimo, además recuperas 40 de Flojera. Cada uso: HP máximo −30, sin límite.',
    maxHpDelta: -30,
    maxMode: 'use',
    rarity: 'rare',
    cooldownMs: 30000,
  },
  cascara_platano: {
    id: 'cascara_platano',
    keywords: ['defensiva'],
    displayName: 'Cáscara de Plátano',
    description: 'Lanzas una cáscara 3 de distancia con 2 usos; al lanzarla quedas ralentizado 0.9s. Dura 1 minuto: empieza con 1 de vida y se cura 1 por segundo hasta 61, donde desaparece. Con 31 y 61 de vida pierde un nivel: el Curador que la pisa cae 1, 1.5 o 2s y se cura 8, 14 o 20. Tú también puedes tropezar con ella pasados 2.5s.',
    rarity: 'uncommon',
    cooldownMs: 25000,
  },
  agua_rimac: {
    id: 'agua_rimac',
    keywords: ['defensiva'],
    displayName: 'Agua del Río Rímac',
    description: 'Zona 5s: los Pacientes dentro reciben daño que sube 1 por cada 5s que permanecen. El Curador pierde Flojera y, si tiene menos de la mitad de HP, recibe daño; si tiene más, se cura.',
    rarity: 'uncommon',
    cooldownMs: 30000,
  },
  red_mist: {
    id: 'red_mist',
    window: 300,
    hitRadius: 0.7,
    reach: 1.0,
    corrupt: true,
    corruptOf: 'golpe_aturdidor',
    keywords: ['ofensiva'],
    displayName: 'IS THAT THE RED MIST?',
    description: 'Mimicry de Kali: tajo rápido al Curador frente a ti (cubo corto desde la mano): −25 HP y aturde 2s; 10% de tajo pesado (−90 HP, aturde 3s). Recuperas 25% del daño como HP. Al elegirla: HP máximo sube a 180.',
    maxHpSet: 180,
    rarity: 'rare',
    durationMs: 2000,
    cooldownMs: 36000,
  },
  tajo_carmesi: {
    id: 'tajo_carmesi',
    window: 420,
    hitRadius: 0.65,
    reach: 0.95,
    keywords: ['ofensiva'],
    displayName: 'Espada del UTTVM al (10^-30)%',
    description: 'Un tajo normal: aturde 1.8s al Curador frente a ti (cubo corto desde la mano). Sin efectos secundarios.',
    rarity: 'uncommon',
    durationMs: 1800,
    cooldownMs: 26000,
  },
  grito_animo: {
    id: 'grito_animo',
    keywords: ['bonificadora'],
    displayName: 'Grito de Ánimo',
    description: 'Minijuego de 8s: te mueves a la mitad y cada acierto (pulsa E al ritmo) da Pereza a los aliados a menos de 8, o a ti si no hay. Los fallos no suman. Pereza se acumula.',
    rarity: 'uncommon',
    cooldownMs: 24000,
  },
};

const SLOT_COUNT = 2;
const OPTIONS_PER_SLOT = 3;
const DRAFT_DURATION_MS = 12000;

for (const card of Object.values(CARDS)) card.weight = RARITY_WEIGHTS[card.rarity] || RARITY_WEIGHTS.common;

function getCard(cardId) {
  return CARDS[cardId] || null;
}

function dealSlot(chosenIds = []) {
  const chosenCards = chosenIds.map((id) => CARDS[id]).filter(Boolean);
  const pool = Object.values(CARDS).filter((card) => !chosenIds.includes(card.id));
  const options = [];
  while (options.length < OPTIONS_PER_SLOT && pool.length > 0) {
    const weighted = pool.map((card) => ({ card, weight: card.weight * Synergy.synergyMultiplier(card, chosenCards) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    let picked = weighted[weighted.length - 1];
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        picked = entry;
        break;
      }
    }
    options.push(picked.card.id);
    pool.splice(pool.indexOf(picked.card), 1);
  }
  return { options, chosen: null };
}

function dealSlots() {
  const slots = [dealSlot([])];
  for (let i = 1; i < SLOT_COUNT; i++) slots.push({ options: [], chosen: null });
  return slots;
}

Synergy.load(Object.values(CARDS));

function listCards() {
  return Object.values(CARDS).map((card) => ({
    id: card.id,
    displayName: card.displayName,
    description: card.description,
    deck: null,
    corrupt: Boolean(card.corrupt),
    corruptOf: card.corruptOf || null,
    maxMode: card.maxMode || 'pick',
    maxHpSet: card.maxHpSet || null,
    maxHpDelta: card.maxHpDelta || null,
    flojeraMaxDelta: card.flojeraMaxDelta || null,
    hitRadius: card.hitRadius || null,
    rarity: card.rarity,
    keywords: card.keywords,
  }));
}

module.exports = { listCards, CARDS, SLOT_COUNT, OPTIONS_PER_SLOT, DRAFT_DURATION_MS, getCard, dealSlot, dealSlots };
