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
  {
    id: 'cheff',
    name: 'Cocinero de Carretilla',
    tagline: 'Comida y aguante',
    card: 'goyslop',
    pool: ['chicharron', 'acetilcolina', 'rodar', 'cascara_platano'],
  },
  {
    id: 'quijote',
    name: 'Gerente Quijote del Paradero',
    tagline: 'Lanzas y estorbos',
    card: 'lanza_quijote',
    pool: ['tropiezo', 'rodar', 'grito_animo', 'red_mist'],
  },
  {
    id: 'paragua',
    name: 'Paragüero de Madrugada',
    tagline: 'Paraguas y sorpresas',
    card: 'paraguayizador',
    pool: ['agua_rimac', 'tropiezo', 'acetilcolina', 'rodar'],
  },
  {
    id: 'enfermero',
    name: 'Enfermero de la Garra',
    tagline: 'Garra y sigilo',
    card: 'astral_claw',
    pool: ['red_mist', 'tajo_carmesi', 'rodar', 'tropiezo'],
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
