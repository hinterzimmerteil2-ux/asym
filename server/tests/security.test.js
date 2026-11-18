const test = require('node:test');
const assert = require('node:assert');
const Security = require('../src/security');
const jwtLib = require('jsonwebtoken');
const Jwt = require('../src/auth/jwt');
const GameMap = require('../src/GameMap');

test('cleanText quita controles, bidi y espacios raros', () => {
  assert.strictEqual(Security.cleanText('  hola\u0000  mundo‮ ', 50), 'hola mundo');
  assert.strictEqual(Security.cleanText('a​b﻿c', 50), 'abc');
  assert.strictEqual(Security.cleanText('x'.repeat(100), 10).length, 10);
  assert.strictEqual(Security.cleanText(42, 10), '');
  assert.strictEqual(Security.cleanText({ a: 1 }, 10), '');
  assert.strictEqual(Security.cleanText('a\n\n\tb', 10), 'a b');
});

test('rateLimit bloquea al pasar el maximo y reinicia con la ventana', () => {
  const key = `t:${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.strictEqual(Security.rateLimit(key, 3, 60000), true);
  assert.strictEqual(Security.rateLimit(key, 3, 60000), false);
  const other = `t:${Math.random()}`;
  assert.strictEqual(Security.rateLimit(other, 1, 60000), true);
  assert.strictEqual(Security.rateLimit(other, 1, 60000), false);
  const orig = Date.now;
  try {
    const t0 = orig();
    Date.now = () => t0 + 61000;
    assert.strictEqual(Security.rateLimit(key, 3, 60000), true);
  } finally {
    Date.now = orig;
  }
});

test('allowedOrigin acepta solo origenes conocidos', () => {
  const client = 'https://asym-game-client.vercel.app';
  assert.strictEqual(Security.allowedOrigin(client, client), true);
  assert.strictEqual(Security.allowedOrigin(`${client}/`.replace(/\/$/, ''), `${client}/`), true);
  assert.strictEqual(Security.allowedOrigin('https://asym-game-client-git-main-x.vercel.app', client), true);
  assert.strictEqual(Security.allowedOrigin('https://evil.example.com', client), false);
  assert.strictEqual(Security.allowedOrigin('https://asym-game-client.vercel.app.evil.com', client), false);
  assert.strictEqual(Security.allowedOrigin('', client), false);
  assert.strictEqual(Security.allowedOrigin(undefined, client), false);
});

test('clientIp usa el primer salto de x-forwarded-for', () => {
  assert.strictEqual(Security.clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, socket: {} }), '1.2.3.4');
  assert.strictEqual(Security.clientIp({ headers: {}, socket: { remoteAddress: '9.9.9.9' } }), '9.9.9.9');
});

test('verifyToken acepta HS256 propios y rechaza lo demas', () => {
  const good = Jwt.signGuestToken('g1', 'Ana');
  const v = Jwt.verifyToken(good);
  assert.ok(v);
  assert.strictEqual(v.userId, 'g1');
  assert.strictEqual(v.kind, 'guest');
  assert.strictEqual(Jwt.verifyToken('x'.repeat(3000)), null);
  assert.strictEqual(Jwt.verifyToken(null), null);
  assert.strictEqual(Jwt.verifyToken({}), null);
  assert.strictEqual(Jwt.verifyToken('abc.def.ghi'), null);
  const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"x","kind":"account"}').toString('base64url')}.`;
  assert.strictEqual(Jwt.verifyToken(none), null);
  const wrongSecret = jwtLib.sign({ sub: 'x', kind: 'account', name: 'N' }, 'otro-secreto', { algorithm: 'HS256' });
  assert.strictEqual(Jwt.verifyToken(wrongSecret), null);
  const wrongKind = jwtLib.sign({ sub: 'x', kind: 'admin', name: 'N' }, process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion', { algorithm: 'HS256' });
  assert.strictEqual(Jwt.verifyToken(wrongKind), null);
  const numericSub = jwtLib.sign({ sub: 5, kind: 'guest' }, process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion', { algorithm: 'HS256' });
  assert.strictEqual(Jwt.verifyToken(numericSub), null);
});

test('registerMap protege mapas del juego y limita los personalizados', () => {
  const base = { selfDamageObjects: [], collisionObjects: [] };
  assert.throws(() => GameMap.registerMap({ ...base, id: 'hospital' }), /reservado/);
  assert.throws(() => GameMap.registerMap({ ...base, id: 'default' }), /reservado/);
  assert.throws(() => GameMap.registerMap({ ...base, id: '' }));
  const big = GameMap.registerMap({ ...base, id: 'x'.repeat(200), name: 'n'.repeat(200) }, true);
  assert.strictEqual(big.id.length, 64);
  assert.strictEqual(big.name.length, 60);
  for (let i = 0; i < 320; i++) GameMap.registerMap({ ...base, id: `sec_${i}` });
  const customs = GameMap.listMaps().filter((m) => m.custom);
  assert.ok(customs.length <= 300);
  assert.ok(customs.some((m) => m.id === 'sec_319'));
  assert.ok(!customs.some((m) => m.id === 'sec_0'));
});
