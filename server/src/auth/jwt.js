const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado.');
}

const GUEST_TOKEN_EXPIRY = '7d';
const ACCOUNT_TOKEN_EXPIRY = '30d';

function signAccountToken(userId, displayName) {
  return jwt.sign({ sub: userId, name: displayName, kind: 'account' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCOUNT_TOKEN_EXPIRY,
  });
}

function signGuestToken(guestId, displayName) {
  return jwt.sign({ sub: guestId, name: displayName, kind: 'guest' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: GUEST_TOKEN_EXPIRY,
  });
}

function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || (payload.kind !== 'account' && payload.kind !== 'guest')) return null;
    return { userId: payload.sub, displayName: typeof payload.name === 'string' ? payload.name.slice(0, 30) : 'Jugador', kind: payload.kind };
  } catch {
    return null;
  }
}

module.exports = { signAccountToken, signGuestToken, verifyToken };
