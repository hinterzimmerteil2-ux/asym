const CHARACTERS = {
  vorhees_jason: {
    id: 'vorhees_jason',
    displayName: 'Vorhees Jason',
    weaponName: 'Vara de hierbas medicinales',
    unlockedByDefault: true,
    pulse: {
      name: 'Pulso de Hierbas',
      radius: 6,
      cureAmount: 8,
      cooldownMs: 10000,
    },
  },
  enfermera_buenaventura: {
    id: 'enfermera_buenaventura',
    displayName: 'Enfermera Buenaventura',
    weaponName: 'Jeringa de suero milagroso',
    unlockedByDefault: true,
    pulse: {
      name: 'Ronda de Suero',
      radius: 4,
      cureAmount: 15,
      cooldownMs: 14000,
    },
  },
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

function listCharacters() {
  return Object.values(CHARACTERS).map((c) => ({
    id: c.id,
    displayName: c.displayName,
    weaponName: c.weaponName,
    pulseName: c.pulse.name,
    pulseRadius: c.pulse.radius,
    pulseCureAmount: c.pulse.cureAmount,
    pulseCooldownMs: c.pulse.cooldownMs,
  }));
}

module.exports = {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacter,
  getUnlockedCharacterIds,
  listCharacters,
};
