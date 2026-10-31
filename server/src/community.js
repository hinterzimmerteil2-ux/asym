const GameMap = require('./GameMap');
const { verifyToken } = require('./auth/jwt');

const MAX_BODY = 400 * 1024;
const MAX_PER_AUTHOR = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIX = 'c_';

function pool() {
  if (!process.env.DATABASE_URL) return null;
  return require('./auth/db').pool;
}

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req, res, cb) {
  let body = '';
  let over = false;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY && !over) {
      over = true;
      send(res, 413, { error: 'El mapa es demasiado grande.' });
      req.destroy();
    }
  });
  req.on('end', () => {
    if (over) return;
    let parsed;
    try {
      parsed = JSON.parse(body || '{}');
    } catch {
      send(res, 400, { error: 'JSON inválido.' });
      return;
    }
    cb(parsed);
  });
}

function account(token) {
  const s = verifyToken(token);
  return s && s.kind === 'account' ? s : null;
}

async function listMaps(req, res, url) {
  const db = pool();
  if (!db) return send(res, 503, { error: 'La comunidad no está disponible en este servidor.' });
  const sort = url.searchParams.get('sort') === 'new' ? 'new' : 'top';
  const me = account((req.headers.authorization || '').replace(/^Bearer /, ''));
  const order = sort === 'new' ? 'm.created_at DESC' : 'votes DESC, m.created_at DESC';
  const { rows } = await db.query(
    `SELECT m.id, m.name, m.author_name, m.created_at, m.author_id,
            (SELECT COUNT(*) FROM community_votes v WHERE v.map_id = m.id)::int AS votes,
            EXISTS (SELECT 1 FROM community_votes v WHERE v.map_id = m.id AND v.user_id = $1) AS voted
     FROM community_maps m ORDER BY ${order} LIMIT 60`,
    [me ? me.userId : '']
  );
  send(res, 200, {
    maps: rows.map((r) => ({ id: PREFIX + r.id, name: r.name, author: r.author_name, votes: r.votes, voted: r.voted, mine: Boolean(me) && r.author_id === me.userId, createdAt: r.created_at })),
  });
}

async function publish(body, res) {
  const db = pool();
  if (!db) return send(res, 503, { error: 'La comunidad no está disponible en este servidor.' });
  const me = account(body.token);
  if (!me) return send(res, 401, { error: 'Inicia sesión con tu cuenta para publicar.' });
  let norm;
  try {
    norm = GameMap.registerMap({ ...body.layout, id: 'tmp' }, true);
  } catch (err) {
    return send(res, 400, { error: err.message });
  }
  if (norm.selfDamageObjects.length === 0) return send(res, 400, { error: 'El mapa necesita al menos un objeto de auto-daño.' });
  const name = String(body.name || norm.name || '').trim().slice(0, 40);
  if (!name) return send(res, 400, { error: 'Ponle un nombre al mapa.' });
  const count = await db.query('SELECT COUNT(*)::int AS n FROM community_maps WHERE author_id = $1', [me.userId]);
  if (count.rows[0].n >= MAX_PER_AUTHOR) return send(res, 429, { error: `Máximo ${MAX_PER_AUTHOR} mapas publicados. Borra alguno.` });
  const { id: _id, custom: _c, ...layout } = norm;
  const { rows } = await db.query(
    'INSERT INTO community_maps (author_id, author_name, name, layout) VALUES ($1, $2, $3, $4) RETURNING id',
    [me.userId, String(me.displayName || 'Anónimo').slice(0, 40), name, JSON.stringify({ ...layout, name })]
  );
  send(res, 201, { id: PREFIX + rows[0].id });
}

async function vote(body, res) {
  const db = pool();
  if (!db) return send(res, 503, { error: 'La comunidad no está disponible en este servidor.' });
  const me = account(body.token);
  if (!me) return send(res, 401, { error: 'Inicia sesión con tu cuenta para votar.' });
  const id = String(body.id || '').replace(PREFIX, '');
  if (!UUID.test(id)) return send(res, 400, { error: 'Mapa inválido.' });
  const del = await db.query('DELETE FROM community_votes WHERE map_id = $1 AND user_id = $2', [id, me.userId]);
  let voted = false;
  if (del.rowCount === 0) {
    await db.query('INSERT INTO community_votes (map_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, me.userId]);
    voted = true;
  }
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM community_votes WHERE map_id = $1', [id]);
  send(res, 200, { voted, votes: rows[0].n });
}

async function remove(body, res) {
  const db = pool();
  if (!db) return send(res, 503, { error: 'La comunidad no está disponible en este servidor.' });
  const me = account(body.token);
  if (!me) return send(res, 401, { error: 'Inicia sesión.' });
  const id = String(body.id || '').replace(PREFIX, '');
  if (!UUID.test(id)) return send(res, 400, { error: 'Mapa inválido.' });
  const r = await db.query('DELETE FROM community_maps WHERE id = $1 AND author_id = $2', [id, me.userId]);
  delete GameMap.MAPS[PREFIX + id];
  send(res, r.rowCount ? 200 : 404, r.rowCount ? { ok: true } : { error: 'No es tu mapa.' });
}

async function ensureMap(mapId) {
  if (GameMap.MAPS[mapId]) return true;
  if (typeof mapId !== 'string' || !mapId.startsWith(PREFIX)) return false;
  const id = mapId.slice(PREFIX.length);
  const db = pool();
  if (!db || !UUID.test(id)) return false;
  const { rows } = await db.query('SELECT name, layout FROM community_maps WHERE id = $1', [id]);
  if (!rows[0]) return false;
  GameMap.registerMap({ ...rows[0].layout, id: mapId, name: rows[0].name });
  return true;
}

function wrap(fn) {
  return (req, res, url) => {
    if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido.' });
    return readBody(req, res, (body) => fn(body, res, url).catch(() => { if (!res.headersSent) send(res, 500, { error: 'Error del servidor.' }); }));
  };
}

function registerCommunityRoutes(routes) {
  routes.set('/community/maps', (req, res, url) => {
    if (req.method === 'GET') return listMaps(req, res, url).catch(() => send(res, 500, { error: 'Error del servidor.' }));
    return wrap(publish)(req, res, url);
  });
  routes.set('/community/vote', wrap(vote));
  routes.set('/community/delete', wrap(remove));
}

module.exports = { registerCommunityRoutes, ensureMap, PREFIX };
