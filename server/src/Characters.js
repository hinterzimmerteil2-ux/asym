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
        type: 'pulse',
        name: 'Pulso de Hierbas',
        description: 'Cura a todos los Pacientes cercanos.',
        keywords: ['curacion', 'area'],
        radius: 6,
        cureAmount: 8,
        cooldownMs: 30000,
      },
      {
        id: 'somnifero_valeriana',
        type: 'stun',
        name: 'Somnífero de Valeriana',
        description: 'Aturde a los Pacientes cercanos 1.5s.',
        keywords: ['aturdir', 'area'],
        radius: 5,
        durationMs: 1500,
        cooldownMs: 45000,
      },
      {
        id: 'raiz_atrayente',
        type: 'pull',
        name: 'Raíz Atrayente',
        description: 'Arrastra a los Pacientes hacia ti.',
        keywords: ['atraer', 'area'],
        radius: 9,
        strength: 4,
        cooldownMs: 35000,
      },
      {
        id: 'tonico_reforzado',
        type: 'boost',
        name: 'Tónico Reforzado',
        description: 'Tus curaciones por click valen el doble por 5s y te curas 20 HP.',
        keywords: ['curacion', 'potenciar'],
        factor: 2,
        selfHeal: 20,
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
        type: 'pulse',
        name: 'Ronda de Suero',
        description: 'Cura fuerte a los Pacientes muy cercanos.',
        keywords: ['curacion', 'area'],
        radius: 4,
        cureAmount: 15,
        cooldownMs: 30000,
      },
      {
        id: 'anestesia',
        type: 'stun',
        name: 'Anestesia',
        description: 'Aturde a los Pacientes muy cercanos 2.2s.',
        keywords: ['aturdir', 'area'],
        radius: 4,
        durationMs: 2200,
        cooldownMs: 55000,
      },
      {
        id: 'camilla_magnetica',
        type: 'pull',
        name: 'Camilla Magnética',
        description: 'Arrastra con fuerza a los Pacientes lejanos.',
        keywords: ['atraer', 'area'],
        radius: 11,
        strength: 6,
        cooldownMs: 40000,
      },
      {
        id: 'desinfectante',
        type: 'purge',
        name: 'Desinfectante',
        description: 'Anula las cartas activas y drena 40 de Flojera.',
        keywords: ['purga', 'flojera', 'area'],
        radius: 7,
        flojeraDrain: 40,
        cooldownMs: 45000,
      },
    ],
  },
};

const GENERIC_MELEE = {
  id: 'golpe_aturdidor',
  type: 'melee_stun',
  name: 'Golpe Aturdidor',
  description: 'Aturde 1.2s al Paciente más cercano a menos de 2.5.',
  keywords: ['aturdir'],
  radius: 2.5,
  durationMs: 1200,
  cooldownMs: 20000,
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

function publicSkills(character) {
  return character.skills.map((s) => ({
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
};
