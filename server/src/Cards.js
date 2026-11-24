const Synergy = require('./synergy');
const { ASTRAL } = require('./Constants');

const RARITY_WEIGHTS = { common: 50, uncommon: 25, rare: 10, legendary: 4 };

const CARDS = {
  acetilcolina: {
    id: 'acetilcolina',
    keywords: ['bonificadora'],
    displayName: 'Acetilcolina',
    description: 'Una ráfaga de velocidad que se paga con el aliento. Quien te cruce se lleva algo de impulso, y al acabar vas más lento un rato.',
    rarity: 'rare',
    durationMs: 5000,
    cooldownMs: 30000,
  },
  rodar: {
    id: 'rodar',
    keywords: ['escapista'],
    displayName: 'Rodar',
    description: 'Un dash que arrastra a los tuyos. Si alcanza al Curador, lo manda lejos y te quedas en su lugar.',
    rarity: 'uncommon',
    cooldownMs: 32000,
  },
  tropiezo: {
    id: 'tropiezo',
    hitRadius: 2.5,
    keywords: ['ofensiva'],
    displayName: 'Tropiezo',
    description: 'Tiras al Curador que tengas cerca. Te deja un momento expuesto.',
    curatorHpLoss: 25,
    rarity: 'rare',
    durationMs: 3000,
    cooldownMs: 28000,
  },
  chicharron: {
    id: 'chicharron',
    keywords: ['bonificadora'],
    displayName: 'Chicharrón',
    description: 'Un snack que te cuesta salud pero te devuelve el aliento y las ganas de correr. Mientras comes no te pueden curar.',
    eat: { ms: 1500, moveLimit: 1 },
    rarity: 'common',
    cooldownMs: 20000,
  },
  goyslop: {
    id: 'goyslop',
    corrupt: true,
    keywords: ['bonificadora'],
    displayName: 'Goyslop',
    description: 'Comida de la peor. Te da alas un rato, pero cada bocado se lleva algo de ti para siempre.',
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
    description: 'Dejas una cáscara que se cura sola con el tiempo y cada vez hace caer más fuerte. Cuidado, tú también puedes resbalar.',
    rarity: 'uncommon',
    cooldownMs: 25000,
  },
  agua_rimac: {
    id: 'agua_rimac',
    corrupt: true,
    keywords: ['defensiva'],
    displayName: 'Agua del Río Rímac',
    description: 'Una botella del Rímac a medio beber. Moja a los Pacientes cercanos y deja un charco que al Curador puede curarlo o dañarlo, según cómo ande. Elegirla tiene un precio.',
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
    description: 'Una mímica de Kali. Tres tajos seguidos, el último el más cruel. Te cura lo que hiere.',
    maxHpSet: 180,
    rarity: 'rare',
    durationMs: 1500,
    cooldownMs: 36000,
    combo: { comboCooldownMs: 12000, resetMs: 14000, hits: 3, damage: 25, heavyDamageMult: 1.5, heavyStunMult: 1.2, heavyReachMult: 4, healFrac: 0.25, heavyHealFrac: 0.8 },
  },
  tajo_carmesi: {
    id: 'tajo_carmesi',
    window: 420,
    hitRadius: 0.85,
    reach: 1.2,
    keywords: ['ofensiva'],
    displayName: 'Espada del UTTVM al (10^-30)%',
    description: 'Un tajo normal que aturde al Curador. Sin sorpresas.',
    rarity: 'uncommon',
    durationMs: 1800,
    cooldownMs: 26000,
  },
  paraguayizador: {
    id: 'paraguayizador',
    keywords: ['escapista'],
    displayName: 'Paraguayizador',
    description: 'Desapareces de la vista del Curador un buen rato. Te cuesta el doble correr, y si te golpean, se acabó.',
    rarity: 'rare',
    durationMs: 8000,
    cooldownMs: 40000,
  },
  astral_claw: {
    id: 'astral_claw',
    keywords: ['ofensiva'],
    displayName: 'Detaining Astral Claw de 30 céntimos',
    description: 'Concentras una esfera pálida mientras te quedas quieto. Cuanto más esperes, más aturde al Curador cuando por fin la lances.',
    rarity: 'rare',
    cooldownMs: 52000,
    stunMs: ASTRAL.MAX_STUN_MS,
    astral: { chargeMs: ASTRAL.CHARGE_MS, holdMs: ASTRAL.ENDLAG_MS, fireDelayMs: ASTRAL.FIRE_DELAY_MS, throwEndlagMs: ASTRAL.THROW_ENDLAG_MS, speed: ASTRAL.SPEED, radius: 0.8, hit: ASTRAL.HIT, flyMs: ASTRAL.FLY_MS },
  },
  niche_tower: {
    id: 'niche_tower',
    keywords: ['defensiva'],
    displayName: 'niche tower defence game',
    description: 'Una torre que construyes con lo que sacas de los módulos. Láser o rifle, tú eliges. Cuídala y te cuidará.',
    rarity: 'legendary',
    cooldownMs: 6000,
    tower: { variants: ['laser', 'rifle'] },
  },
  oi_ojo: {
    id: 'oi_ojo',
    corrupt: true,
    keywords: ['escapista'],
    displayName: 'Oi, [][][][][]!',
    description: 'Un ojo metálico que ve antes de que ocurra. Pasiva y activa a la vez. Mientras vea, los golpes casi nunca te encuentran, pero cada vez que sí lo hacen algo se apaga, y con menos ojos todo cuesta más. Usarla te echa hacia atrás. Si se queda sin vista, el ojo se sobrecalienta y todo pesa un poco más.',
    rarity: 'rare',
    cooldownMs: 1800,
    oi: { eyes: 30 },
  },
  tigermark: {
    id: 'tigermark',
    keywords: ['escapista'],
    displayName: "Ya darn sure oughta've unsheathed that sword if ya really wanted to win!",
    description: 'Saltas con la espada en alto y caes sobre el Curador o el Jefe. Las balas se acaban, pero el daño que haces las repone.',
    rarity: 'uncommon',
    curatorHpLoss: 65,
    durationMs: 3000,
    cooldownMs: 18000,
    tiger: { mag: 6, start: 1, reloadMs: 3000, radius: 2.4, perReload: 60, gainEveryMs: 60000, speed: 15.6, vy: 11, bossDmg: 1300000 },
  },
  grito_animo: {
    id: 'grito_animo',
    keywords: ['bonificadora'],
    displayName: 'Pongan Torero',
    description: 'Un grito que le devuelve las cartas a los que tengas cerca. Cuantos menos te escuchen, más te toca a ti.',
    rarity: 'uncommon',
    radius: 8,
    selfRefund: 0.4,
    cooldownMs: 50000,
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
    description: 'Súper-habilidad. Tres modos con 3 hojas: Notificación (cobranza coactiva: marca y revela a un enemigo a 26 unidades o menos durante 6 s; cada habilidad que use suma una deuda y al terminar el plazo sufre un embargo de 1,2 s más 0,5 s por deuda, hasta 3,6 s, sin habilidades y multado; no se puede evitar quedándose quieto), Vuelva mañana (lo rebobina 4,5 s y lo deja en cola 2 s sin habilidades) y Anulación (te rebobinas y limpias estados, con 2 s de lentitud). Pasivas: Ley para ti, no para mí (el notificado sufre estados 1,5 veces más largos y recargas más lentas, y tú sufres menos) y Impuestos (un número complejo: la parte real sube al completar módulos, esquivar ataques y multar, y al llegar a 118 te da una hoja; la parte imaginaria sube al usar modos y da velocidad y resistencia a estados) y Trámite de ventanilla (cada 18 s, hasta 10 veces, quedas 0,9 s con lag a cambio de 9 de parte real y 0,5 de imaginaria). Teclas 1, 2 y 3.',
  },
  super_town_level: {
    id: 'super_town_level', super: true, superId: 'town_level', keywords: ['súper'], rarity: 'rare', weight: 0,
    displayName: 'Town Level Verse Lol',
    description: 'Súper-habilidad. Bayoneta (estocada sin retroceso, o disparo de largo alcance con 8 balas: si fallas hay mucho retroceso, si aciertas poco retroceso y más aturdimiento, y ese efecto baja con la distancia; recarga real con Carga: tienes 2 cargadores; con balas aún en el arma es táctica (1,3 s y queda una bala en la recámara, 9 en total) y con el arma vacía tarda 1,9 s; mientras recargas vas más lento y no puedes disparar, y usar Barrera o Señuelo la cancela; además 1 bala por módulo, hasta 6 por minuto), Barrera (al usarla tienes 0,2 s para elegir con las teclas de movimiento hacia dónde apuntas la barrera, y te deslizas en la dirección opuesta, unas 9 unidades, mientras la barrera te protege; parry: si te golpean en 1,2 s, anula el golpe y contraatacas; si falla, endlag y ganas un poco de escudo) y Señuelo (una copia de tu personaje que corre en dirección opuesta a la tuya mientras te vuelves invisible). Pasivas: Teufel des Rheins (peluca, 40 % más pequeño y maná que potencia empuje y aturdimiento) y Vuelo (doble salto muy alto por 4 de maná; mantén el salto en el aire para ascender hasta 14 unidades). Teclas 1, 2, 3 y 4.',
  },
  super_platinum_star: {
    id: 'super_platinum_star', super: true, superId: 'platinum_star', keywords: ['súper'], rarity: 'rare', weight: 0,
    displayName: 'Platinum Star',
    description: 'Súper-habilidad. Ráfaga (andanada de 1,1 s de golpes rapidísimos al frente, alcance 5, aturde más al final), Stellar Finger (dedo estelar de 20 unidades de alcance, 0,4 s de preparación, preciso y aturdidor), Lanzamiento (tu espíritu embiste 8 unidades en 0,3 s, agarra al primer enemigo y lo arroja hacia delante aturdido 1,8 s y en ragdoll: cuanta más vida tenga, menos lo arroja, y con poca vida sale disparado; si falla, quedas lento 0,5 s) y Pose Fabulosa (una pequeña transformación que no ataca; exige 40 de Gay y te deja 0,7 s en endlag al activarla; mientras dura, tus aturdimientos son 60 % más largos y tus empujes 50 % más fuertes, tus recargas de 1, 2 y 3 se reducen a la mitad, la Ráfaga dura y alcanza más y es más ancha, el Dedo estelar alcanza 50 % más y atraviesa a todos los enemigos de la línea, el Lanzamiento alcanza 30 % más, lanza 80 % más fuerte y no te deja lento si falla; pero el Gay se gasta 2 por segundo, fallar una habilidad gasta 8 más y tus aciertos solo dan 0,7 veces de Gay; se acaba al llegar a 0 de Gay o al volver a pulsarla; recarga 12 s al terminar). Pasivas: Gay (cada golpe sube tu Gay hasta 100, alarga tus aturdimientos hasta un 60 % y potencia las tres primeras habilidades: la Ráfaga dura hasta 40 % más y alcanza 30 % más, el Dedo estelar alcanza 25 % más y empuja 50 % más, y el Lanzamiento alcanza 30 % más y lanza 30 % más fuerte) y Contragolpe (si te aturden y tienes 30 de Gay, aturdes 1,1 s a quien tengas a 7 unidades; recarga 8 s). Teclas 1, 2, 3 y 4.',
  },
  super_minceraft: {
    id: 'super_minceraft', super: true, superId: 'minceraft', keywords: ['súper'], rarity: 'rare', weight: 0,
    displayName: 'Minceraft',
    description: 'Súper-habilidad. Construyes con bloques cubo de 1 metro (un poco más de la mitad de un jugador) y un contador de Bloques (64). Eliges la pieza con 1 a 8 (un fantasma verde o rojo sigue el cursor, alcance máximo 7 bloques) y haces clic para colocarla: Andamio (1, como el de Minecraft: se atraviesa, se trepa saltando y su parte de arriba es piso), Telaraña (1, frena al Curador y al Jefe), Slime (2, rebota a quien lo pise), Bloque de redstone (2, al activarse emite un pulso que empuja y aturde 0,6 s), Pistón (3, cuando le llega la cadena de redstone empuja con fuerza todo lo que tenga delante), Polvo de redstone (1, solo se coloca sobre uno de tus bloques y se rompe si lo quitan; la cadena llega el doble de lejos y se activa si el Curador lo pisa), TNT (4, la enciende la cadena de redstone y a 1,4 s explota: empuja a todos, aturde al Curador 0,9 s y rompe tus piezas cercanas, sirve para impulsarte) y Miel (2, frena mucho al Curador y lo pega a la pared). Colocación rápida (0,3 s). Cada pieza dura 12 s, nace casi rota y se va pudriendo: a 1/3 y 2/3 de su vida pierde eficacia. Pasivas: Físicas de Minceraft (saltas 2,5 veces más alto, no recibes daño ni aturdimiento por caída, agacharte en el borde evita que te caigas y Pico, tecla 9: rompes un bloque tuyo en 0,4 s y recuperas su espacio) y Redstone (al activarse una pieza, las vecinas se activan en cadena cada 0,2 s). Pistón pegajoso (variante del pistón con la tecla C, cuesta 4): como el pistón, pero al retraerse trae de vuelta los bloques que empujó. Un bloque de redstone junto a un pistón lo activa, y el pistón apunta hacia arriba si miras hacia arriba.',
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
