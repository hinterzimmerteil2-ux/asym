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
    tagline: 'Gritos, comida y carrera en grupo',
    card: 'grito_animo',
    pool: ['acetilcolina', 'goyslop', 'chicharron', 'rodar'],
  },
  {
    id: 'cobrador',
    name: 'Cobrador de Combi',
    tagline: 'Tajos y escapes',
    card: 'tajo_carmesi',
    pool: ['red_mist', 'tropiezo', 'rodar', 'acetilcolina'],
  },
  {
    id: 'quijote',
    name: 'Gerente Quijote del Paradero',
    tagline: 'Lanzas, garras y trucos raros',
    card: 'lanza_quijote',
    pool: ['astral_claw', 'paraguayizador', 'cascara_platano', 'red_mist'],
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
