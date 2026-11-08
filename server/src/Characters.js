const CHARACTERS = {
  vorhees_jason: {
    id: 'vorhees_jason',
    displayName: 'Vorhees Jason',
    weaponName: 'Vara de hierbas medicinales',
    unlockedByDefault: true,
    baseCooldownMs: 1000,
    skills: [
      {
        id: 'pulso_hierbas',
        type: 'zone',
        zoneKind: 'herbs',
        name: 'Pulso de Hierbas',
        description: 'Plantas un círculo de hierbas a tus pies durante 6s. Los Pacientes que estén dentro se curan poco a poco y quedan revelados.',
        keywords: ['bonificadora'],
        radius: 5,
        durationMs: 6000,
        perSecond: 2.6,
        cooldownMs: 30000,
      },
      {
        id: 'somnifero_valeriana',
        type: 'gas',
        name: 'Somnífero de Valeriana',
        description: 'Lanzas un frasco 6 de distancia. Deja una nube 4.5s que ralentiza; quien respire casi 1s queda dormido 1.5s.',
        keywords: ['ofensiva'],
        reach: 6,
        radius: 3,
        durationMs: 4500,
        sleepAfterMs: 900,
        stunMs: 1500,
        cooldownMs: 45000,
      },
      {
        id: 'raiz_atrayente',
        type: 'root',
        name: 'Raíz Atrayente',
        description: 'Una raíz sale en línea recta. El primer Paciente que toque es arrastrado hacia ti y queda atrapado 1s.',
        keywords: ['ofensiva'],
        speed: 18,
        range: 13,
        radius: 0.7,
        pullStrength: 6,
        stunMs: 1000,
        cooldownMs: 30000,
      },
      {
        id: 'tonico_reforzado',
        type: 'boost',
        name: 'Tónico Reforzado',
        description: 'Tus curaciones por click valen el doble por 5s y te curas 20 HP, pero te mueves más lento mientras dure.',
        keywords: ['bonificadora'],
        factor: 2,
        selfHeal: 20,
        slowMs: 5000,
        slowLevel: 1,
        durationMs: 5000,
        cooldownMs: 40000,
      },
    ],
  },
  enfermera_buenaventura: {
    id: 'enfermera_buenaventura',
    displayName: 'Enfermera Buenaventura',
    weaponName: 'Jeringa de suero milagroso',
    unlockedByDefault: true,
    baseCooldownMs: 800,
    skills: [
      {
        id: 'ronda_suero',
        type: 'zone',
        zoneKind: 'drip',
        name: 'Ronda de Suero',
        description: 'Clavas un gotero a tus pies 8s. Cura de golpe a los Pacientes muy cercanos, y quien pase cerca del gotero queda revelado.',
        keywords: ['bonificadora'],
        radius: 3.5,
        burstRadius: 4,
        cureAmount: 12,
        durationMs: 8000,
        cooldownMs: 30000,
      },
      {
        id: 'anestesia',
        type: 'dart',
        name: 'Anestesia',
        description: 'Disparas un dardo en línea recta. El Paciente que lo reciba se ralentiza y a los 1.8s se desmaya 2s.',
        keywords: ['ofensiva'],
        speed: 28,
        range: 22,
        radius: 0.55,
        slowMs: 1800,
        sleepMs: 1800,
        stunMs: 2000,
        cooldownMs: 50000,
      },
      {
        id: 'camilla_magnetica',
        type: 'gurney',
        name: 'Camilla Magnética',
        description: 'Lanzas una camilla que cruza el mapa en línea recta y se lleva consigo a todos los Pacientes que toque.',
        keywords: ['ofensiva'],
        speed: 11,
        range: 15,
        radius: 1.4,
        cooldownMs: 40000,
      },
      {
        id: 'desinfectante',
        type: 'purge',
        name: 'Desinfectante',
        description: 'Anula las cartas activas y drena 40 de Flojera. Además, los Módulos cercanos no se pueden usar durante 6s.',
        keywords: ['defensiva'],
        radius: 7,
        flojeraDrain: 40,
        lockMs: 6000,
        cooldownMs: 45000,
      },
    ],
  },
};

const GENERIC_MELEE = {
  id: 'golpe_aturdidor',
  type: 'melee_stun',
  name: 'Atún Medicinal',
  description: 'Sostenido por cierta chica caballo',
  keywords: ['ofensiva'],
  radius: 1.1,
  reach: 1.3,
  windowMs: 450,
  durationMs: 500,
  cooldownMs: 1800,
  missEndlagMs: 250,
  hitBoostMs: 700,
  hitBoostFactor: 1.06,
};

const DEFAULT_CHARACTER_ID = 'vorhees_jason';

function getCharacter(characterId) {
  return CHARACTERS[characterId] || CHARACTERS[DEFAULT_CHARACTER_ID];
}

function getUnlockedCharacterIds() {
  return Object.values(CHARACTERS)
    .filter((c) => c.unlockedByDefault)
    .map((c) => c.id);
}

function withOverride(character, override) {
  if (!override || !override.length) return character.skills;
  return character.skills.map((s, i) => override[i] || s);
}

function publicSkills(character, override) {
  return withOverride(character, override).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    keywords: s.keywords,
    cooldownMs: s.cooldownMs,
  }));
}

function listCharacters() {
  return Object.values(CHARACTERS).map((c) => ({
    id: c.id,
    displayName: c.displayName,
    weaponName: c.weaponName,
    skills: publicSkills(c),
  }));
}

module.exports = {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  GENERIC_MELEE,
  getCharacter,
  getUnlockedCharacterIds,
  listCharacters,
  publicSkills,
  withOverride,
};
