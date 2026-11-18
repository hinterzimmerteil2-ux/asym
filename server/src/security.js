const CTRL = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFC').replace(CTRL, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

const buckets = new Map();

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start >= windowMs) {
    b = { start: now, n: 0, windowMs };
    buckets.set(key, b);
  }
  b.n += 1;
  return b.n <= max;
}

const sweep = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now - b.start >= b.windowMs) buckets.delete(k);
}, 60 * 1000);
if (sweep.unref) sweep.unref();

function allowedOrigin(origin, clientUrl) {
  if (!origin) return false;
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const list = [clientUrl, ...extra].filter(Boolean).map((u) => u.replace(/\/+$/, ''));
  if (list.includes(origin)) return true;
  if (/^https:\/\/asym-game-client[a-z0-9-]*\.vercel\.app$/.test(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

function readJsonBody(req, res, maxBytes, cb) {
  let size = 0;
  const chunks = [];
  let over = false;
  req.on('data', (chunk) => {
    if (over) return;
    size += chunk.length;
    if (size > maxBytes) {
      over = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'La solicitud es demasiado grande.' }));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    if (over) return;
    let parsed = {};
    const text = Buffer.concat(chunks).toString('utf8');
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido.' }));
        return;
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
    cb(parsed);
  });
}

function tooMany(res) {
  res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
  res.end(JSON.stringify({ error: 'Demasiadas solicitudes. Espera un momento.' }));
}

module.exports = { cleanText, clientIp, rateLimit, allowedOrigin, applySecurityHeaders, readJsonBody, tooMany };
