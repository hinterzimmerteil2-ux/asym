const { randomUUID } = require('crypto');
const { getAuthorizationUrl, exchangeCodeForProfile } = require('./oauth');
const { findOrCreateUser, updateDisplayName } = require('./db');
const { signAccountToken, signGuestToken, verifyToken } = require('./jwt');

const DISPLAY_NAME_MAX_LENGTH = 30;

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

const pendingStates = new Map();
const STATE_TTL_MS = 5 * 60 * 1000;

function createState() {
  const state = randomUUID();
  pendingStates.set(state, Date.now());
  return state;
}

function consumeState(state) {
  const timestamp = pendingStates.get(state);
  pendingStates.delete(state);
  if (!timestamp) return false;
  return Date.now() - timestamp < STATE_TTL_MS;
}

setInterval(() => {
  const now = Date.now();
  for (const [state, ts] of pendingStates) {
    if (now - ts > STATE_TTL_MS) pendingStates.delete(state);
  }
}, 60 * 1000);

function registerAuthRoutes(routes) {
  routes.set('/auth/google', (req, res) => startOAuthLogin('google', res));
  routes.set('/auth/discord', (req, res) => startOAuthLogin('discord', res));
  routes.set('/auth/callback/google', (req, res, url) => handleOAuthCallback('google', req, res, url));
  routes.set('/auth/callback/discord', (req, res, url) => handleOAuthCallback('discord', req, res, url));
  routes.set('/auth/guest', (req, res) => handleGuestLogin(req, res));
  routes.set('/auth/update-name', (req, res) => handleUpdateDisplayName(req, res));
}

function startOAuthLogin(provider, res) {
  try {
    const state = createState();
    const redirectUri = `${SERVER_URL}/auth/callback/${provider}`;
    const authUrl = getAuthorizationUrl(provider, redirectUri, state);
    res.writeHead(302, { Location: authUrl });
    res.end();
  } catch (err) {
    respondError(res, 500, err.message);
  }
}

async function handleOAuthCallback(provider, req, res, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || !consumeState(state)) {
    respondError(res, 400, 'Solicitud de login inválida o expirada. Intentá de nuevo.');
    return;
  }
  try {
    const redirectUri = `${SERVER_URL}/auth/callback/${provider}`;
    const { providerUserId, email, displayName } = await exchangeCodeForProfile(provider, code, redirectUri);
    const user = await findOrCreateUser(provider, providerUserId, email, displayName);
    const token = signAccountToken(user.id, user.display_name);
    res.writeHead(302, { Location: `${CLIENT_URL}/auth/success#token=${token}` });
    res.end();
  } catch (err) {
    console.error(`Error en callback de ${provider}:`, err.message);
    res.writeHead(302, { Location: `${CLIENT_URL}/auth/error?message=${encodeURIComponent(err.message)}` });
    res.end();
  }
}

function handleGuestLogin(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let displayName = 'Invitado';
    try {
      const parsed = JSON.parse(body || '{}');
      if (parsed.displayName && typeof parsed.displayName === 'string') {
        displayName = parsed.displayName.slice(0, 30);
      }
    } catch {
      // body inválido, se usa el nombre por defecto
    }
    const guestId = `guest_${randomUUID()}`;
    const token = signGuestToken(guestId, displayName);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token, displayName, kind: 'guest' }));
  });
}

/**
 * El nombre viaja embebido en el JWT (payload.name), así que cambiarlo no
 * alcanza con tocar la fila en la DB: el token viejo seguiría firmando el
 * nombre anterior. Por eso esta ruta devuelve un token NUEVO ya con el
 * nombre actualizado, y el cliente lo reemplaza en localStorage. Para
 * invitados (sin fila en users) no hay nada que persistir, solo se
 * re-firma el token con el nombre nuevo.
 */
function handleUpdateDisplayName(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const session = verifyToken(parsed.token);
      if (!session) {
        respondError(res, 401, 'Sesión inválida o expirada. Inicia sesión de nuevo.');
        return;
      }
      const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
      if (!displayName) {
        respondError(res, 400, 'El nombre no puede estar vacío.');
        return;
      }
      if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
        respondError(res, 400, `El nombre no puede superar los ${DISPLAY_NAME_MAX_LENGTH} caracteres.`);
        return;
      }

      let token;
      if (session.kind === 'account') {
        await updateDisplayName(session.userId, displayName);
        token = signAccountToken(session.userId, displayName);
      } else {
        token = signGuestToken(session.userId, displayName);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, displayName }));
    } catch (err) {
      console.error('Error actualizando nombre:', err.message);
      respondError(res, 500, 'No se pudo actualizar el nombre.');
    }
  });
}

function respondError(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

module.exports = { registerAuthRoutes };
