const CHARACTERS = {
  vorhees_jason: {
    id: 'vorhees_jason',
    displayName: 'Vorhees Jason',
    weaponName: 'Vara de hierbas medicinales',
    unlockedByDefault: true,
  },
  enfermera_buenaventura: {
    id: 'enfermera_buenaventura',
    displayName: 'Enfermera Buenaventura',
    weaponName: 'Jeringa de suero milagroso',
    // Mismas stats que Vorhees Jason — la diferencia es solo estética/flavor,
    // como se definió al agregar este segundo personaje.
    unlockedByDefault: true,
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
  }));
}

module.exports = {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacter,
  getUnlockedCharacterIds,
  listCharacters,
};
