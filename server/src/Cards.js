const Synergy = require('./synergy');
const { ASTRAL } = require('./Constants');

const RARITY_WEIGHTS = { common: 50, uncommon: 25, rare: 10 };

const CARDS = {
  acetilcolina: {
    id: 'acetilcolina',
    keywords: ['bonificadora'],
    displayName: 'Acetilcolina',
    description: 'Velocidad masiva por 5s. Correr gasta el doble de Flojera y no se regenera; si llegas a 0 el boost sigue hasta que acabe. Los Pacientes que te pasen por encima ganan un poco de velocidad. Al terminar, 1s sin regenerar y luego vas lento un rato.',
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
    description: 'Comes (1.5s quieto, sin que te curen): pierdes 28 de HP, hasta un mínimo de 55, y recuperas algo de Flojera. Si estás a 3 HP o menos del mínimo, no pierdes HP y recuperas Flojera equivalente y corres 3s más rápido. Tu hitbox crece 0.5%. Si te interrumpen, no se consume.',
    eat: { ms: 1500, moveLimit: 1 },
    rarity: 'common',
    cooldownMs: 20000,
  },
  goyslop: {
    id: 'goyslop',
    corrupt: true,
    keywords: ['bonificadora'],
    displayName: 'Goyslop',
    description: 'Comes (1.8s quieto, sin que te curen): pierdes 50 de HP, hasta un mínimo de 35, recuperas algo de Flojera y corres 4s mucho más rápido. Si estás a 3 HP o menos del mínimo, recuperas Flojera equivalente en vez de perder HP. Cada uso: HP máximo −20, sin límite. Si te interrumpen, no se consume.',
    eat: { ms: 1800, moveLimit: 1 },
    maxHpDelta: -20,
    maxMode: 'use',
    rarity: 'rare',
    cooldownMs: 30000,
  },
  lanza_quijote: {
    id: 'lanza_quijote',
    keywords: ['defensiva'],
    displayName: 'Poking Don Quixote Cube',
    description: 'MANAGER ESQUIRE',
    rarity: 'uncommon',
    cooldownMs: 18000,
    spear: { max: 4, maxHp: 91, regenPerSec: 2, levelScale: [0, 0.4, 0.7, 1], radius: 1.7, toggleRadius: 3.5, tickMs: 700, steal: 0.7, nerf: 0.35 },
  },
  cascara_platano: {
    id: 'cascara_platano',
    keywords: ['defensiva'],
    displayName: 'Cáscara de Plátano',
    description: 'Lanzas una cáscara 3 de distancia con 2 usos; al lanzarla quedas ralentizado 1.6s. Dura 1 minuto: empieza con 1 de vida y se cura 1 por segundo hasta 61, donde desaparece. Con 31 y 61 de vida pierde un nivel: el Curador que la pisa cae 1.5, 2.2 o 3s y se cura 8, 14 o 20. Tú también puedes tropezar con ella pasados 2.5s.',
    rarity: 'uncommon',
    cooldownMs: 25000,
  },
  agua_rimac: {
    id: 'agua_rimac',
    corrupt: true,
    keywords: ['defensiva'],
    displayName: 'Agua del Río Rímac',
    description: 'Lanzas la botella: golpe en área pequeña a tu alrededor, a los otros Pacientes (4 de daño y 2/s durante 3s) y ganas +2 de Flojera. Deja un charco pequeño 3s que se debilita en 3 fases: hace hasta 12 de daño en total a cada Paciente. El Curador pierde Flojera y, si tiene menos de la mitad de HP, recibe daño; si tiene más, se cura. Al elegirla (una vez por partida): HP máximo −18, Flojera máxima +8.',
    maxHpDelta: -18,
    flojeraMaxDelta: 8,
    rarity: 'uncommon',
    cooldownMs: 30000,
  },
  red_mist: {
    id: 'red_mist',
    window: 300,
    hitRadius: 0.85,
    reach: 1.2,
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
    hitRadius: 0.85,
    reach: 1.2,
    keywords: ['ofensiva'],
    displayName: 'Espada del UTTVM al (10^-30)%',
    description: 'Un tajo normal: aturde 1.8s al Curador frente a ti (cubo corto desde la mano). Sin efectos secundarios.',
    rarity: 'uncommon',
    durationMs: 1800,
    cooldownMs: 26000,
  },
  paraguayizador: {
    id: 'paraguayizador',
    keywords: ['escapista'],
    displayName: 'Paraguayizador',
    description: 'Endlag al empezar y luego 8s invisible: el Curador no te ve y las habilidades de detección no te revelan. Gastas el doble de Flojera y no se regenera. Si el Curador te golpea, se cancela y quedas en endlag más largo. Al terminar, endlag.',
    rarity: 'rare',
    durationMs: 8000,
    cooldownMs: 40000,
  },
  astral_claw: {
    id: 'astral_claw',
    keywords: ['ofensiva'],
    displayName: 'Detaining Astral Claw de 30 céntimos',
    description: 'Empuñas la garra: endlag masivo 5s y se carga hasta 5s (100%). Si te curan, se cancela. Sales saltando o yendo rápido más de 1.2s y queda cargada al % alcanzado. Tras 1.2s puedes volver a usarla: lanzas una esfera amarilla pálida en línea recta hacia donde miras (muy largo alcance, no teledirigida). Si choca con el Curador lo aturde hasta 4s según la carga. Lanzarla también da endlag.',
    rarity: 'rare',
    cooldownMs: 52000,
    stunMs: ASTRAL.MAX_STUN_MS,
    astral: { chargeMs: ASTRAL.CHARGE_MS, holdMs: ASTRAL.ENDLAG_MS, fireDelayMs: ASTRAL.FIRE_DELAY_MS, throwEndlagMs: ASTRAL.THROW_ENDLAG_MS, speed: ASTRAL.SPEED, radius: 0.8, hit: ASTRAL.HIT, flyMs: ASTRAL.FLY_MS },
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
  return CARDS[cardId] || require('./CustomCards').get(cardId) || null;
}

function dealSlot(chosenIds = [], extra = []) {
  const chosenCards = chosenIds.map((id) => getCard(id)).filter(Boolean);
  const pool = [...Object.values(CARDS), ...extra].filter((card) => !chosenIds.includes(card.id));
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

function dealSlots(extra = []) {
  const slots = [dealSlot([], extra)];
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
