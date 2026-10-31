const ROLES = [
  {
    id: 'loquito',
    name: 'Loquito de la Esquina',
    tagline: 'Botellazos y trampas',
    card: 'agua_rimac',
    pool: ['cascara_platano', 'tropiezo', 'rodar', 'chicharron'],
  },
  {
    id: 'hincha',
    name: 'Hincha Cantarín del Barrio',
    tagline: 'Gritos y carrera en grupo',
    card: 'grito_animo',
    pool: ['acetilcolina', 'chicharron', 'rodar', 'cascara_platano'],
  },
  {
    id: 'cobrador',
    name: 'Cobrador de Combi',
    tagline: 'Tajos y escapes',
    card: 'tajo_carmesi',
    pool: ['tropiezo', 'rodar', 'acetilcolina', 'red_mist'],
  },
];

function getRole(id) {
  return ROLES.find((r) => r.id === id) || null;
}

function list(Cards) {
  return ROLES.map((r) => ({
    id: r.id,
    name: r.name,
    tagline: r.tagline,
    card: Cards.getCard(r.card),
    pool: r.pool.map((c) => Cards.getCard(c)).filter(Boolean).map((c) => c.displayName),
  }));
}

function secondOptions(role, count) {
  return role.pool.slice().sort(() => Math.random() - 0.5).slice(0, count);
}

module.exports = { ROLES, getRole, list, secondOptions };
