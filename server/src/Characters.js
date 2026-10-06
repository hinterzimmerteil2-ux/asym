const CHARACTERS = {
  vorhees_jason: {
    id: 'vorhees_jason',
    displayName: 'Vorhees Jason',
    weaponName: 'Vara de hierbas medicinales',
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

module.exports = { CHARACTERS, DEFAULT_CHARACTER_ID, getCharacter, getUnlockedCharacterIds };
