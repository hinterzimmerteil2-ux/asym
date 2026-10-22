const test = require('node:test');
const assert = require('node:assert');
const { Room } = require('../src/Room');
const Status = require('../src/Status');
const { distanceBetween } = require('../src/Hitbox');

function setup() {
  const room = new Room('t');
  const sent = { c: [], a: [], b: [] };
  const sock = (id) => ({ readyState: 1, send: (m) => sent[id].push(JSON.parse(m)) });
  room.addPlayer('c', sock('c'), 'C');
  room.addPlayer('a', sock('a'), 'A');
  room.addPlayer('b', sock('b'), 'B');
  room.switchPhase('action', 'test');
  room.gameState.curatorReleaseAt = 0;
  const clock = { t: Date.now() };
  Date.now = () => clock.t;
  const step = (n, dt = 0.05, keepFlojera = true) => {
    for (let i = 0; i < n; i++) {
      clock.t += dt * 1000;
      if (keepFlojera) for (const e of Object.values(room.gameState.entities)) e.flojera = Math.max(e.flojera, 1);
      room.stepPhysics(dt);
    }
  };
  return { room, sent, clock, step, e: room.gameState.entities, p: room.gameState.patients };
}

function give(entity, slot, id) {
  entity.hand[slot] = { chosen: id };
  entity.cardCooldowns = {};
}

test('el rango de ataque es un cubo entre cajas', () => {
  const a = { x: 0, y: 0, z: 0, input: {} };
  const b = { x: 2, y: 3, z: 1, input: {} };
  assert.ok(distanceBetween(a, b) > 1);
  assert.strictEqual(distanceBetween(a, { x: 0.5, y: 0, z: 0.5, input: {} }), 0);
});

test('Espada del UTTVM solo aturde, sin daño ni efectos', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.c.x = 1; e.c.z = 0;
  give(e.a, 0, 'tajo_carmesi');
  const hp = room.gameState.curator.hp;
  room.useCard('a', 0);
  assert.ok(Status.until(e.c, 'stun') > Date.now());
  assert.strictEqual(room.gameState.curator.hp, hp);
});

test('Tropiezo derriba 3s, empuja y deja endlag al usuario', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.c.x = 1.5; e.c.z = 0;
  give(e.a, 0, 'tropiezo');
  room.useCard('a', 0);
  assert.strictEqual(Status.until(e.c, 'ragdoll') - Date.now(), 3000);
  assert.ok(e.c.kbX > 0);
  assert.strictEqual(Status.until(e.a, 'slow') - Date.now(), 1200);
  assert.strictEqual(Status.until(e.c, 'stun'), 0);
});

test('un golpe que falla da endlag solo proporcional a la Flojera', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.c.x = 25; e.c.z = 25;
  give(e.a, 0, 'tajo_carmesi');
  e.a.flojera = e.a.flojeraMax;
  room.useCard('a', 0);
  assert.strictEqual(Status.until(e.a, 'slow'), 0);
  give(e.a, 0, 'tajo_carmesi');
  e.a.flojera = 0;
  room.useCard('a', 0);
  assert.ok(Status.until(e.a, 'slow') > Date.now());
  assert.strictEqual(Status.until(e.a, 'stun'), 0);
  assert.ok(Status.until(e.a, 'slow') > Date.now());
});

test('Rodar hace dropkick al Curador y se detiene donde estaba', () => {
  const { room, e, step } = setup();
  e.a.x = -5; e.a.z = 0; e.a.faceX = 1; e.a.faceZ = 0; e.c.x = -2; e.c.z = 0;
  give(e.a, 0, 'rodar');
  room.useCard('a', 0);
  step(12);
  assert.ok(Math.abs(e.a.x - -2) < 0.8);
  assert.ok(e.c.x > 3);
  assert.ok(e.c.rag || Status.until(e.c, 'ragdoll') > 0);
});

test('Rodar sin moverte usa la orientación', () => {
  const { room, e, step } = setup();
  e.c.x = -25; e.c.z = -25;
  e.a.x = 0; e.a.z = 0; e.a.faceX = 0; e.a.faceZ = 1;
  give(e.a, 0, 'rodar');
  room.useCard('a', 0);
  step(10);
  assert.ok(e.a.z > 4);
});

test('Rodar agotando la Flojera deja ragdoll al terminar', () => {
  const { room, e, step } = setup();
  e.c.x = -25; e.c.z = -25;
  e.a.x = 0; e.a.z = 0; e.a.faceX = 1; e.a.faceZ = 0; e.a.flojera = 10;
  give(e.a, 0, 'rodar');
  room.useCard('a', 0);
  step(10, 0.05, false);
  assert.ok(Status.until(e.a, 'ragdoll') > Date.now());
});

test('Diligencia bloquea cartas y la M1 del Curador', () => {
  const { room, e } = setup();
  give(e.a, 0, 'chicharron');
  Status.apply(e.a, 'stun', 5000, Date.now());
  const hp = room.gameState.patients.a.hp;
  room.useCard('a', 0);
  assert.strictEqual(room.gameState.patients.a.hp, hp);
  e.c.x = 0; e.c.z = 0; e.a.x = 1; e.a.z = 0;
  Status.apply(e.c, 'stun', 5000, Date.now());
  room.applyCure('c', 'a');
  assert.strictEqual(room.gameState.patients.a.hp, hp);
});

test('Grito de Ánimo: los aciertos acumulan Pereza y los fallos no', () => {
  const { room, e, clock } = setup();
  e.a.x = 0; e.a.z = 0; e.b.x = 2; e.b.z = 0;
  give(e.a, 0, 'grito_animo');
  room.useCard('a', 0);
  const t0 = e.a.channel.startedAt;
  clock.t = t0 + 1050; room.useCard('a', 0);
  clock.t = t0 + 1500; room.useCard('a', 0);
  clock.t = t0 + 2000; room.useCard('a', 0);
  assert.strictEqual(e.a.channel.hits, 2);
  assert.ok(e.b.perezaUntil > clock.t);
});

test('Acetilcolina sin Flojera camina con buff y no genera endlag en uso', () => {
  const { room, e, step } = setup();
  e.c.x = -25; e.c.z = -25;
  const run = (flo) => {
    e.a.x = -20; e.a.z = -20; e.a.y = 0; e.a.curMult = 1;
    e.a.input.moveX = 1; e.a.input.moveZ = 0;
    const x0 = e.a.x;
    for (let i = 0; i < 20; i++) { step(1, 0.05, false); e.a.flojera = flo; }
    return e.a.x - x0;
  };
  const normal = run(100);
  give(e.a, 0, 'acetilcolina');
  room.useCard('a', 0);
  const buffed = run(100);
  const spent = run(0);
  assert.ok(buffed > normal * 1.5);
  assert.ok(spent < buffed && spent > normal);
  assert.strictEqual(Status.until(e.a, 'slow'), 0);
});

test('caer de una plataforma da ralentización a los Pacientes', () => {
  const { e, step } = setup();
  e.c.x = -25; e.c.z = -25;
  e.a.x = 22; e.a.y = 2.4; e.a.z = 7.5; e.a.onGround = true; e.a.input.moveX = 1;
  step(30);
  assert.ok(Status.until(e.a, 'slow') > 0 || Status.until(e.a, 'slow') > 0);
  assert.strictEqual(Status.until(e.a, 'stun'), 0);
});

test('Rodar sube hasta la plataforma baja', () => {
  const { room, e, step } = setup();
  e.c.x = -25; e.c.z = 25;
  e.a.x = -12; e.a.z = -22.5; e.a.faceX = 1; e.a.faceZ = 0;
  give(e.a, 0, 'rodar');
  room.useCard('a', 0);
  step(12);
  assert.ok(e.a.y >= 1.5);
});

test('los resultados de curar y auto-dañarse solo llegan a su dueño', () => {
  const { room, e, sent } = setup();
  e.c.x = 0; e.c.z = 0; e.a.x = 1; e.a.z = 0;
  room.applyCure('c', 'a');
  assert.ok(sent.c.some((m) => m.type === 'cure_result'));
  assert.ok(!sent.a.some((m) => m.type === 'cure_result'));
  assert.ok(!sent.b.some((m) => m.type === 'cure_result'));
});

test('el catálogo de cartas no tiene referencias rotas', () => {
  const { CARDS } = require('../src/Cards');
  const { handlers } = require('../src/CardEffects');
  for (const id of Object.keys(CARDS)) assert.ok(handlers[id], `falta el efecto de ${id}`);
});

test('Status: stun y ragdoll bloquean skills, slow escala nivel y se encadena', () => {
  const e = {};
  const now = 1000;
  Status.apply(e, 'ragdoll', 1000, now);
  assert.ok(Status.blocksMove(e, now));
  assert.ok(Status.blocksSkills(e, now));
  assert.ok(!Status.blocksSkills(e, now + 1100));
  Status.apply(e, 'stun', 500, now);
  assert.ok(Status.blocksSkills(e, now));
  Status.apply(e, 'slow', 1000, now, { level: 1, chain: true });
  Status.apply(e, 'slow', 1000, now, { level: 3, chain: true });
  assert.strictEqual(Status.level(e, 'slow', now), 3);
  assert.strictEqual(Status.until(e, 'slow'), now + 2000);
  assert.strictEqual(Status.speedFactor(e, now), 0.25);
  Status.clear(e, 'slow');
  assert.strictEqual(Status.speedFactor(e, now), 1);
  Status.push(e, 1, 0, 8, 500, now);
  assert.strictEqual(e.kbX, 8);
});

test('Espada del UTTVM golpea desde la mano: solo al frente y corto', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.a.faceX = 0; e.a.faceZ = 1;
  give(e.a, 0, 'tajo_carmesi');
  e.c.x = 0; e.c.z = -1.6;
  room.useCard('a', 0);
  assert.strictEqual(Status.until(e.c, 'stun'), 0);
  e.a.cardCooldowns = {};
  e.c.z = 4;
  room.useCard('a', 0);
  assert.strictEqual(Status.until(e.c, 'stun'), 0);
  e.a.cardCooldowns = {};
  e.c.z = 1.6;
  room.useCard('a', 0);
  assert.ok(Status.until(e.c, 'stun') > Date.now());
});
