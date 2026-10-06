const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado.');
}

const GUEST_TOKEN_EXPIRY = '24h';
const ACCOUNT_TOKEN_EXPIRY = '30d';

function signAccountToken(userId, displayName) {
  return jwt.sign({ sub: userId, name: displayName, kind: 'account' }, JWT_SECRET, {
    expiresIn: ACCOUNT_TOKEN_EXPIRY,
  });
}

function signGuestToken(guestId, displayName) {
  return jwt.sign({ sub: guestId, name: displayName, kind: 'guest' }, JWT_SECRET, {
    expiresIn: GUEST_TOKEN_EXPIRY,
  });
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { userId: payload.sub, displayName: payload.name, kind: payload.kind };
  } catch {
    return null;
  }
}

module.exports = { signAccountToken, signGuestToken, verifyToken };
