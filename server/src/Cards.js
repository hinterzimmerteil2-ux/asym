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
    spear: { max: 4, maxHp: 91, regenPerSec: 2, levelScale: [0, 0.4, 0.7, 1], power: 2.25, radius: 1.7, toggleRadius: 3.5, tickMs: 700, steal: 0.7, nerf: 0.35 },
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
const POOL_SIZE = 5;
const REROLLS = 2;
const DRAFT_DURATION_MS = 24000;

for (const card of Object.values(CARDS)) card.weight = RARITY_WEIGHTS[card.rarity] || RARITY_WEIGHTS.common;

const SUPER_CARDS = {
  super_sunat_paperwork: {
    id: 'super_sunat_paperwork', super: true, superId: 'sunat_paperwork', keywords: ['súper'], rarity: 'rare', weight: 0,
    displayName: 'Sunat Paperwork',
    description: 'Súper-habilidad. Reemplaza tus dos cartas. Tres modos con 3 hojas: Notificación (cobranza coactiva: marca y revela a un enemigo a 26 unidades o menos durante 6 s; cada habilidad que use suma una deuda y al terminar el plazo sufre un embargo de 1,2 s más 0,5 s por deuda, hasta 3,6 s, sin habilidades y multado; no se puede evitar quedándose quieto), Vuelva mañana (lo rebobina 4,5 s y lo deja en cola 2 s sin habilidades) y Anulación (te rebobinas y limpias estados, con 2 s de lentitud). Pasivas: Ley para ti, no para mí (el notificado sufre estados 1,5 veces más largos y recargas más lentas, y tú sufres menos) y Impuestos (un número complejo: la parte real sube al completar módulos, esquivar ataques y multar, y al llegar a 118 te da una hoja; la parte imaginaria sube al usar modos y da velocidad y resistencia a estados) y Trámite de ventanilla (cada 18 s, hasta 10 veces, quedas 0,9 s con lag a cambio de 9 de parte real y 0,5 de imaginaria). Teclas 1, 2 y 3.',
  },
  super_town_level: {
    id: 'super_town_level', super: true, superId: 'town_level', keywords: ['súper'], rarity: 'rare', weight: 0,
    displayName: 'Town Level Verse Lol',
    description: 'Súper-habilidad. Reemplaza tus dos cartas. Bayoneta (estocada sin retroceso, o disparo de largo alcance con 8 balas: si fallas hay mucho retroceso, si aciertas poco retroceso y más aturdimiento, y ese efecto baja con la distancia; recarga real con Carga: tienes 2 cargadores; con balas aún en el arma es táctica (1,3 s y queda una bala en la recámara, 9 en total) y con el arma vacía tarda 1,9 s; mientras recargas vas más lento y no puedes disparar, y usar Barrera o Señuelo la cancela; además 1 bala por módulo, hasta 6 por minuto), Barrera (al usarla tienes 0,2 s para elegir con las teclas de movimiento hacia dónde te deslizas, unas 9 unidades, mientras la barrera te protege; parry: si te golpean en 1,2 s, anula el golpe y contraatacas; si falla, endlag y ganas un poco de escudo) y Señuelo (una copia de tu personaje que corre mientras te vuelves invisible). Pasivas: Demonio del Rin (peluca, 40 % más pequeño y maná que potencia empuje y aturdimiento) y Vuelo (doble salto muy alto por 4 de maná; mantén el salto en el aire para ascender hasta 14 unidades). Teclas 1, 2, 3 y 4.',
  },
  super_platinum_star: {
    id: 'super_platinum_star', super: true, superId: 'platinum_star', keywords: ['súper'], rarity: 'rare', weight: 0,
    displayName: 'Platinum Star',
    description: 'Súper-habilidad. Reemplaza tus dos cartas. Ráfaga (andanada de 1,1 s de golpes rapidísimos al frente, alcance 5, aturde más al final), Stellar Finger (dedo estelar de 20 unidades de alcance, 0,4 s de preparación, preciso y aturdidor), Lanzamiento (tu espíritu embiste 8 unidades en 0,3 s, agarra al primer enemigo y lo arroja hacia delante aturdido 1,8 s y en ragdoll: cuanta más vida tenga, menos lo arroja, y con poca vida sale disparado; si falla, quedas lento 0,5 s) y Pose Fabulosa (posas con todo el drama y deslumbras 1,5 s a todos los enemigos cercanos, cuesta 50 de Gay). Pasivas: Gay (cada golpe sube tu Gay hasta 100 y alarga tus aturdimientos hasta un 60 %) y Contragolpe (si te aturden y tienes 30 de Gay, aturdes 1,1 s a quien tengas a 7 unidades; recarga 8 s). Teclas 1, 2, 3 y 4.',
  },
  super_minceraft: {
    id: 'super_minceraft', super: true, superId: 'minceraft', keywords: ['súper'], rarity: 'rare', weight: 0,
    displayName: 'Minceraft',
    description: 'Súper-habilidad. Reemplaza tus dos cartas. Construyes con bloques cubo de 1 metro (un poco más de la mitad de un jugador) y un contador de Bloques (64). Eliges la pieza con 1 a 8 (un fantasma verde o rojo sigue el cursor, alcance máximo 7 bloques) y haces clic para colocarla: Andamio (1, como el de Minecraft: se atraviesa, se trepa saltando y su parte de arriba es piso), Telaraña (1, frena al Curador y al Jefe), Slime (2, rebota a quien lo pise), Bloque de redstone (2, al activarse emite un pulso que empuja y aturde 0,6 s), Pistón (3, cuando le llega la cadena de redstone empuja con fuerza todo lo que tenga delante), Polvo de redstone (1, solo se coloca sobre uno de tus bloques y se rompe si lo quitan; la cadena llega el doble de lejos y se activa si el Curador lo pisa), TNT (4, la enciende la cadena de redstone y a 1,4 s explota: empuja a todos, aturde al Curador 0,9 s y rompe tus piezas cercanas, sirve para impulsarte) y Miel (2, frena mucho al Curador y lo pega a la pared). Colocación rápida (0,3 s). Cada pieza dura 12 s, nace casi rota y se va pudriendo: a 1/3 y 2/3 de su vida pierde eficacia. Pasivas: Físicas de Minceraft (saltas 2,5 veces más alto, no recibes daño ni aturdimiento por caída, agacharte en el borde evita que te caigas y Pico, tecla 9: rompes un bloque tuyo en 0,4 s y recuperas su espacio) y Redstone (al activarse una pieza, las vecinas se activan en cadena cada 0,2 s).',
  },
  super_slot: { id: 'super_slot', super: true, keywords: ['súper'], rarity: 'common', weight: 0, displayName: 'Súper-habilidad activa', description: 'Tu Súper-habilidad ocupa este espacio.' },
};

function getCard(cardId) {
  return SUPER_CARDS[cardId] || CARDS[cardId] || require('./CustomCards').get(cardId) || null;
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

function dealPool(extra = [], exclude = []) {
  const pool = [...Object.values(CARDS), ...extra].filter((card) => !exclude.includes(card.id));
  const options = [];
  while (options.length < POOL_SIZE && pool.length > 0) {
    const total = pool.reduce((sum, card) => sum + card.weight, 0);
    let roll = Math.random() * total;
    let picked = pool[pool.length - 1];
    for (const card of pool) {
      roll -= card.weight;
      if (roll <= 0) { picked = card; break; }
    }
    options.push(picked.id);
    pool.splice(pool.indexOf(picked), 1);
  }
  return options;
}
function dealSlots(extra = []) {
  const options = dealPool(extra);
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) slots.push({ options: [...options], chosen: null });
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

module.exports = { SUPER_CARDS, listCards, CARDS, SLOT_COUNT, OPTIONS_PER_SLOT, POOL_SIZE, REROLLS, dealPool, DRAFT_DURATION_MS, getCard, dealSlot, dealSlots };
