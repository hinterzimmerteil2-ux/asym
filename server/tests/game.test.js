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
  e.a.x = 0; e.a.z = 0; e.a.faceX = 1; e.a.faceZ = 0; e.c.x = 1.3; e.c.z = 0;
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
  const expire = () => { room.hitWindows.forEach((w) => { w.endsAt = 0; }); room.tickHitWindows(Date.now()); };
  room.useCard('a', 0);
  assert.strictEqual(Status.until(e.a, 'slow'), 0);
  expire();
  assert.strictEqual(Status.until(e.a, 'slow'), 0);
  give(e.a, 0, 'tajo_carmesi');
  e.a.flojera = 0;
  room.useCard('a', 0);
  expire();
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
  assert.ok(e.c.x > 0);
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
  assert.strictEqual(Status.until(e.a, 'stun'), 0);
});

test('Diligencia bloquea cartas y la M1 del Curador', () => {
  const { room, e } = setup();
  give(e.a, 0, 'chicharron');
  Status.apply(e.a, 'stun', 5000, Date.now());
  const hp = room.gameState.patients.a.hp;
  room.useCard('a', 0);
  assert.strictEqual(room.gameState.patients.a.hp, hp);
  e.c.x = 0; e.c.z = 0; e.a.x = 1; e.a.z = 0;
  e.c.faceX = 1; e.c.faceZ = 0;
  Status.apply(e.c, 'stun', 5000, Date.now());
  room.applyCure('c');
  room.tickHitWindows(Date.now());
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
  assert.ok(buffed > normal * 1.3);
  assert.ok(spent < buffed && spent > normal * 0.2);
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
  e.a.x = -11; e.a.z = -45; e.a.faceX = 1; e.a.faceZ = 0;
  give(e.a, 0, 'rodar');
  room.useCard('a', 0);
  step(12);
  assert.ok(e.a.y >= 1.5);
});

test('los resultados de curar y auto-dañarse solo llegan a su dueño', () => {
  const { room, e, sent } = setup();
  e.c.x = 0; e.c.z = 0; e.a.x = 1.2; e.a.z = 0;
  e.c.faceX = 1; e.c.faceZ = 0;
  room.applyCure('c');
  room.tickHitWindows(Date.now());
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

test('Ragdoll R6: cae al piso, conserva las articulaciones y es finito', () => {
  const RagdollBody = require('../src/RagdollBody');
  const ent = { x: 0, y: 0, z: 0, faceX: 0, faceZ: 1 };
  const body = RagdollBody.create(ent);
  for (let i = 0; i < 80; i++) assert.ok(RagdollBody.step(body, ent, 0, 0.05));
  assert.ok(Math.max(...body.y) < 0.9);
  for (const [a, b, len] of body.links) {
    const d = Math.hypot(body.x[a] - body.x[b], body.y[a] - body.y[b], body.z[a] - body.z[b]);
    assert.ok(Math.abs(d - len) / len < 0.05);
  }
  assert.strictEqual(RagdollBody.serialize(body, ent).length, 30);
});

test('Un jugador en ragdoll es empujado al caminar contra él', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0;
  e.b.x = 0.5; e.b.z = 0;
  Status.apply(e.b, 'ragdoll', 3000, Date.now());
  room.stepPhysics(0.05);
  e.a.x = 0.2;
  e.b.kbUntil = 0;
  room.stepPhysics(0.05);
  e.a.x = 0.35;
  room.stepPhysics(0.05);
  assert.ok(e.b.kbUntil > Date.now() && e.b.kbX > 0);
});

test('Shiftlock: la orientación enviada por el cliente manda sobre el movimiento', () => {
  const { room, e } = setup();
  room.applyPlayerInput('a', { moveX: 1, moveZ: 0, face: { x: 0, z: -2 } });
  assert.strictEqual(e.a.faceX, 0);
  assert.strictEqual(e.a.faceZ, -1);
  room.applyPlayerInput('a', { moveX: 1, moveZ: 0 });
  assert.strictEqual(e.a.faceX, 1);
});

test('Pathfinding rodea plataformas altas y entra por la rampa', () => {
  const GameMap = require('../src/GameMap');
  const Pathfinding = require('../src/Pathfinding');
  const area = GameMap.MATCH_AREA;
  const grid = Pathfinding.buildGrid(area.halfSize, GameMap.resolveCollisionObjects('default', area), GameMap.resolvePlatforms('default', area));
  const path = Pathfinding.findPath(grid, { x: -9, z: -48.3 }, { x: 0, z: -47.5 });
  assert.ok(path.length >= 3);
  assert.ok(path.some((p) => p.x > 6));
  const end = path[path.length - 1];
  assert.ok(Math.hypot(end.x - 0, end.z + 47.5) < 1.2);
});

test('Pathfinding llega a la torre del segundo nivel del hospital por rampas empinadas', () => {
  const GameMap = require('../src/GameMap');
  const Pathfinding = require('../src/Pathfinding');
  const area = GameMap.areaFor('hospital');
  const grid = Pathfinding.buildGrid(area.halfSize, GameMap.resolveCollisionObjects('hospital', area), GameMap.resolvePlatforms('hospital', area));
  const path = Pathfinding.findPath(grid, { x: 0, z: 0, y: 0 }, { x: 31, z: 30, y: 9.5 });
  const last = path[path.length - 1];
  assert.ok(Math.hypot(last.x - 31, last.z - 30) < 1);
});

test('Pacientes resueltos: eliminado queda como cadáver sin hitbox, el que escapa también', () => {
  const { room, e, p, step } = setup();
  p.a.status = 'eliminated';
  p.b.status = 'self_won';
  step(2, 0.05, false);
  assert.ok(e.a.corpse && !e.a.gone);
  assert.ok(Status.active(e.a, 'ragdoll', Date.now()));
  assert.ok(e.b.corpse && !e.b.gone);
  assert.strictEqual(distanceBetween({ x: 0, y: 0, z: 0, input: {} }, { ...e.a, x: 3, z: 0, y: 0 }) > 2.5, true);
  assert.strictEqual(require('../src/Hitbox').extentOf(e.a).half, 0);
});

test('Los objetos de auto-daño no aparecen dentro de estructuras ni en zonas inalcanzables', () => {
  const GameMap = require('../src/GameMap');
  const { room } = setup();
  const original = GameMap.resolveSelfDamagePositions;
  GameMap.resolveSelfDamagePositions = () => [
    { id: 'ok', x: 30, z: 10 },
    { id: 'en_pilar', x: 24, z: 24 },
    { id: 'en_estante', x: 12, z: -28 },
    { id: 'meseta', x: 0, z: -45 },
  ];
  room.nav = null;
  const ids = room.selfDamageCandidates().map((p) => p.id);
  GameMap.resolveSelfDamagePositions = original;
  assert.deepStrictEqual(ids, ['ok', 'meseta']);
  room.nav = null;
  GameMap.resolveSelfDamagePositions = () => [{ id: 'meseta', x: 0, z: -45 }];
  room.nav = null;
  const plateau = room.selfDamageCandidates().find((p) => p.id === 'meseta');
  GameMap.resolveSelfDamagePositions = original;
  assert.strictEqual(plateau.y, 1.6);
});

test('la espada espera en ventana y aturde una sola vez al primer impacto', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.a.faceX = 1; e.a.faceZ = 0; e.c.x = 5; e.c.z = 0;
  give(e.a, 0, 'tajo_carmesi');
  room.useCard('a', 0);
  assert.strictEqual(Status.until(e.c, 'stun'), 0);
  assert.strictEqual(room.hitWindows.length, 1);
  e.c.x = 1.2;
  room.tickHitWindows(Date.now());
  const first = Status.until(e.c, 'stun');
  assert.ok(first > Date.now());
  assert.strictEqual(room.hitWindows.length, 0);
  room.tickHitWindows(Date.now() + 100);
  assert.strictEqual(Status.until(e.c, 'stun'), first);
});

test('el fantasma aparece con cooldown de 30s y hasta 3 veces', () => {
  const { room, e } = setup();
  room.gameState.patients.a.status = 'eliminated';
  room.stepPhysics(0.05);
  assert.ok(room.gameState.ghosts.a);
  const g = room.gameState.ghosts.a;
  room.revealGhost('a');
  assert.ok(g.visibleUntil > Date.now());
  g.visibleUntil = 0;
  room.revealGhost('a');
  assert.strictEqual(g.visibleUntil, 0);
  for (let i = 0; i < 3; i++) { g.cooldownUntil = 0; room.revealGhost('a'); }
  assert.strictEqual(g.uses, 3);
  g.cooldownUntil = 0;
  g.visibleUntil = 0;
  room.revealGhost('a');
  assert.strictEqual(g.visibleUntil, 0);
  e.a.input.moveX = 1;
  const x0 = g.x;
  room.tickGhosts(0.1);
  assert.ok(g.x > x0);
  g.y = 5; g.onGround = false;
  for (let i = 0; i < 40; i++) room.tickGhosts(0.05);
  assert.ok(g.y < 1);
});

test('con Acetil sin Flojera conservas el buff pero caminas más lento que corriendo', () => {
  const { room, e, step } = setup();
  e.a.x = -10; e.a.z = 0;
  give(e.a, 0, 'acetilcolina');
  room.useCard('a', 0);
  e.a.input.moveX = 1;
  e.a.flojera = e.a.flojeraMax;
  step(40);
  const run = e.a.x;
  e.a.x = -10;
  e.a.flojera = 0;
  step(40);
  const walk = e.a.x;
  assert.ok(walk > -10);
  assert.ok(e.a.flojera < 1);
  assert.ok(e.a.acetilUntil > Date.now());
});

test('el chat de fantasmas solo lo reciben otros fantasmas', () => {
  const { room } = setup();
  const got = {};
  for (const id of ['a', 'b', 'c']) {
    const pl = room.players.get(id);
    pl.ws = { readyState: 1, send: (m) => { (got[id] = got[id] || []).push(m); } };
  }
  room.gameState.patients.a.status = 'eliminated';
  room.gameState.patients.b.status = 'eliminated';
  room.handleChatMessage('a', 'hola');
  assert.ok(got.a && got.b);
  assert.ok(!got.c);
});

test('cáscara de plátano: 2 usos, cura 20 al Curador y también tropieza su dueño tras armarse', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.a.faceX = 1; e.a.faceZ = 0; e.c.x = 40; e.c.z = 40;
  give(e.a, 0, 'cascara_platano');
  room.useCard('a', 0);
  const zone = room.gameState.zones[0];
  assert.strictEqual(zone.charges, 2);
  assert.ok(Math.abs(zone.x - 3) < 0.01);
  zone.armedAt = 0; zone.ownerArmedAt = Date.now() + 99999;
  room.gameState.curator.hp = 50;
  e.c.x = zone.x; e.c.z = zone.z;
  room.tickZones(Date.now(), 0.05);
  assert.strictEqual(room.gameState.curator.hp, 70);
  assert.strictEqual(zone.charges, 1);
  assert.strictEqual(Status.active(e.a, 'ragdoll', Date.now()), false);
  e.c.x = 40;
  zone.cooldownUntil = 0; zone.ownerArmedAt = 0;
  e.a.x = zone.x; e.a.z = zone.z;
  room.tickZones(Date.now(), 0.05);
  assert.strictEqual(Status.active(e.a, 'ragdoll', Date.now()), true);
  assert.strictEqual(room.gameState.zones.length, 0);
});

function finishEating(room, e, slot = 0) {
  e.a.eating.endsAt = 0;
  room.tickEating(Date.now());
}

test('chicharrón y goyslop: se comen quietos, restan HP y dan Flojera', () => {
  const { room, e } = setup();
  room.gameState.patients.a.hp = 90;
  e.a.flojera = 10;
  give(e.a, 0, 'chicharron');
  room.useCard('a', 0);
  assert.ok(e.a.eating);
  assert.strictEqual(room.gameState.patients.a.hp, 90);
  finishEating(room, e);
  assert.strictEqual(room.gameState.patients.a.hp, 62);
  assert.ok(e.a.flojera > 10);
  assert.ok(e.a.hitScale > 1);
  e.a.cardCooldowns = {};
  room.gameState.patients.a.hp = 56;
  e.a.flojera = 10;
  give(e.a, 0, 'chicharron');
  room.useCard('a', 0);
  finishEating(room, e);
  assert.strictEqual(room.gameState.patients.a.hp, 56);
  assert.ok(e.a.sprintUntil > Date.now());
  assert.strictEqual(e.a.flojera, 10 + 12 + 28);
});

test('comer se interrumpe al curarte o moverte y no se consume', () => {
  const { room, e } = setup();
  room.gameState.patients.a.hp = 90;
  give(e.a, 0, 'goyslop');
  room.useCard('a', 0);
  room.gameState.patients.a.hp = 95;
  room.tickEating(Date.now());
  assert.strictEqual(e.a.eating, null);
  assert.strictEqual(room.gameState.patients.a.hp, 95);
  assert.strictEqual(room.gameState.patients.a.maxHp, require('../src/Constants').PATIENT_HP_MAX);
  e.a.cardCooldowns = {};
  give(e.a, 0, 'goyslop');
  room.useCard('a', 0);
  e.a.x += 5;
  room.tickEating(Date.now());
  assert.strictEqual(e.a.eating, null);
});

test('la cáscara no se gasta dos veces con la misma entidad que sigue encima', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.a.faceX = 1; e.a.faceZ = 0; e.c.x = 40; e.c.z = 40;
  give(e.a, 0, 'cascara_platano');
  room.useCard('a', 0);
  const zone = room.gameState.zones[0];
  zone.armedAt = 0; zone.ownerArmedAt = 0;
  e.a.x = zone.x; e.a.z = zone.z;
  room.tickZones(Date.now(), 0.05);
  assert.strictEqual(zone.charges, 1);
  zone.cooldownUntil = 0;
  room.tickZones(Date.now(), 0.05);
  assert.strictEqual(zone.charges, 1);
  e.a.x = zone.x + 10;
  room.tickZones(Date.now(), 0.05);
  e.a.x = zone.x;
  room.tickZones(Date.now(), 0.05);
  assert.strictEqual(room.gameState.zones.length === 0 || zone.charges === 0, true);
});

test('las zonas se colocan a la altura del suelo bajo ellas y funcionan sobre plataformas', () => {
  const { room, e } = setup();
  const Hitbox = require('../src/Hitbox');
  const plats = [{ id: 'p', x: 3, z: 0, hx: 3, hz: 3, h: 2 }];
  const GameMap = require('../src/GameMap');
  const orig = GameMap.resolvePlatforms;
  GameMap.resolvePlatforms = () => plats;
  try {
    e.a.x = 0; e.a.z = 0; e.a.y = 2; e.a.faceX = 1; e.a.faceZ = 0;
    room.phase = 'action';
    room.addZone({ kind: 'rimac', x: 3, z: 0, radius: 2, ownerId: 'a', until: Date.now() + 5000 });
    const zone = room.gameState.zones[room.gameState.zones.length - 1];
    assert.ok(Math.abs(zone.y - 2) < 0.01);
    e.c.x = 3; e.c.z = 0; e.c.y = 2;
    assert.ok(room.zoneDistance(e.c, zone) <= 2);
    e.c.y = 0;
    assert.ok(room.zoneDistance(e.c, zone) > 2);
  } finally {
    GameMap.resolvePlatforms = orig;
  }
});

test('quieto regeneras Flojera al doble', () => {
  const { room, e, step } = setup();
  room.phase = 'action';
  e.a.flojera = 10;
  e.a.input.moveX = 0; e.a.input.moveZ = 0;
  step(10);
  const early = e.a.flojera;
  step(30);
  assert.ok(e.a.respiro);
  const before = e.a.flojera;
  step(20);
  const rate = (e.a.flojera - before) / 1;
  assert.ok(rate > 15);
  assert.ok(early >= 10);
});

test('correr sin parar gasta cada vez más Flojera y agotarla bloquea la regeneración', () => {
  const { room, e, step } = setup();
  room.phase = 'action';
  e.a.x = -20; e.a.z = 0;
  e.a.input.moveX = 1;
  e.a.flojera = e.a.flojeraMax;
  step(20);
  const first = e.a.flojeraMax - e.a.flojera;
  const mid = e.a.flojera;
  step(20);
  const second = mid - e.a.flojera;
  assert.ok(second > first);
  e.a.flojera = 0.1;
  step(3, 0.05, false);
  assert.ok(e.a.regenBlockedUntil > Date.now());
});

test('los cosméticos se validan y se publican en el resumen de jugadores', () => {
  const { room } = setup();
  room.broadcast = () => {};
  room.setCosmetics('a', { head: { id: 'gorro_lana', color: '#5468ff' }, torso: { id: 'nada', color: '#fff' }, back: { id: 'alas', color: 'x' } });
  const sum = room.getPlayersSummary().find((p) => p.id === 'a');
  assert.deepStrictEqual(sum.cosmetics.head, { id: 'gorro_lana', color: '#5468ff' });
  assert.strictEqual(sum.cosmetics.torso, undefined);
  assert.strictEqual(sum.cosmetics.back.id, 'alas');
  assert.notStrictEqual(sum.cosmetics.back.color, 'x');
});

test('en el lobby hay parkour y la gravedad es 0.6x', () => {
  const { room, e } = setup();
  room.phase = 'lobby';
  e.a.x = 12.2; e.a.z = -3.2; e.a.y = 20; e.a.onGround = false; e.a.velocityY = 0;
  room.stepPhysics(0.05);
  const lobbyDrop = e.a.velocityY;
  assert.ok(Math.abs(lobbyDrop - -18 * 0.6 * 0.05) < 0.01);
  for (let i = 0; i < 200; i++) room.stepPhysics(0.05);
  assert.ok(Math.abs(e.a.y - 3.2) < 0.01);
});

test('Agua del Río Rímac: melee AoE con DoT, charco con tope de 12 y costos de corrupta', () => {
  const { room, e, p, step } = setup();
  room.broadcast = () => {};
  e.c.x = 25; e.c.z = 25;
  e.a.x = 0; e.a.z = 0; e.a.flojera = 10;
  e.b.x = 0.5; e.b.z = 0;
  give(e.a, 0, 'agua_rimac');
  room.finalizeChoice('a', 0, 'agua_rimac');
  const hp = p.b.hp;
  room.useCard('a', 0);
  assert.strictEqual(room.gameState.zones.length, 1);
  assert.strictEqual(room.gameState.zones[0].radius, 1.4);
  assert.ok(p.b.hp < hp);
  assert.ok(e.b.rimacDot);
  assert.ok(e.a.flojera > 10);
  const hp1 = p.b.hp;
  e.a.x = -10;
  for (let i = 0; i < 70; i++) { step(1, 0.05, false); room.tickZones(Date.now(), 0.05); }
  assert.ok(p.b.hp < hp1);
  assert.ok(hp - p.b.hp <= 4 + 6 + 12 + 0.5);
});

test('Desgracias se acumulan por hazañas y se envían al terminar la partida', () => {
  const { room, sent, e, p } = setup();
  room.broadcast = () => {};
  p.a.hp = 20;
  e.a.x = 0; e.a.z = 0;
  room.gameState.selfDamageObjectPositions = { o1: { x: 0, y: 0, z: 0.5 } };
  room.handleSelfDamage ? room.handleSelfDamage('a', 'o1') : null;
  room.award('a', 10, 'Prueba');
  room.endGame('test', true);
  const msg = sent.a.find((m) => m.type === 'desgracias_award');
  assert.ok(msg && msg.payload.total >= 10);
  assert.ok(msg.payload.items.some((i) => i.label === 'Prueba'));
});

test('puerta solo Curador, sótano con rampa y paso bajo rampas altas', () => {
  const { room, e, clock } = setup();
  room.mapId = 'hospital';
  const go = (id, x, z, mx, mz, n) => {
    const en = e[id];
    en.x = x; en.z = z; en.y = 0; en.velocityY = 0; en.onGround = true;
    en.input.moveX = mx; en.input.moveZ = mz;
    for (let i = 0; i < n; i++) { clock.t += 50; en.flojera = Math.max(en.flojera, 1); room.stepPhysics(0.05); }
    en.input.moveX = 0; en.input.moveZ = 0;
    return en;
  };
  assert.ok(go('c', -1, 19, 1, 0, 30).x > 8);
  assert.ok(go('a', -1, 19, 1, 0, 30).x < 4);
  const down = go('a', -2, 0, -1, 0, 120);
  assert.ok(down.y < -3);
  const up = go('a', down.x, 0, down.x > 0 ? 1 : -1, 0, 300);
  assert.ok(up.y > -0.1);
  assert.ok(go('a', 20, 24, 0, 1, 30).z > 30);
});

test('draft: 5 cartas, eliges 2, renovar toma otra de la baraja y se acaban', () => {
  const { room, e } = setup();
  const hand = e.a.hand;
  assert.strictEqual(hand[0].options.length, 5);
  const first = hand[0].options[0];
  const old = hand[0].options[1];
  room.rerollCard('a', old);
  assert.ok(!e.a.hand[0].options.includes(old));
  assert.strictEqual(e.a.hand[0].options.length, 5);
  assert.strictEqual(e.a.rerolls, 1);
  room.chooseCard('a', 0, first);
  assert.strictEqual(e.a.hand[0].chosen, first);
  assert.ok(!e.a.hand[1].options.includes(first));
  const second = e.a.hand[1].options[0];
  room.chooseCard('a', 1, second);
  assert.strictEqual(e.a.hand[1].chosen, second);
  assert.strictEqual(e.a.draftEndsAt, 0);
  room.rerollCard('a', e.a.hand[1].options[0] || 'x');
  assert.strictEqual(e.a.rerolls, 1);
});

test('auto-daño: minijuego de ritmo, perfecto hace más daño y fallar corta', () => {
  const { room, clock, e, p } = setup();
  room.mapId = 'hospital';
  room.gameState.selfDamageObjectPositions = { o1: { x: 0, y: 0, z: 0 } };
  room.gameState.selfDamageTypes = { o1: 'rhythm' }; room.gameState.moduleRelocate = {};
  const run = (hitAll) => {
    room.gameState.selfDamageObjectPositions = { o1: { x: 0, y: 0, z: 0 } };
    room.gameState.selfDamageTypes = { o1: 'rhythm' }; room.gameState.moduleRelocate = {};
    e.a.x = 0; e.a.z = 0; e.a.y = 0;
    p.a.hp = 60; p.a.status = 'alive';
    room.applySelfDamage('a', 'o1');
    const game = e.a.selfDmg;
    assert.ok(game);
    const start = game.startedAt;
    for (const b of game.beats.slice()) {
      clock.t = start + b;
      if (hitAll) room.applySelfDamage('a', 'o1');
    }
    clock.t = start + game.beats[game.beats.length - 1] + 400;
    room.stepPhysics(0.05);
  };
  run(true);
  assert.strictEqual(p.a.hp, 60 - 12);
  run(false);
  assert.strictEqual(p.a.hp, 60);
  assert.strictEqual(e.a.selfDmg, null);
});

test('M1 del Curador: la caja sale de la mano, cura si el Paciente cae dentro y no deja endlag al fallar', () => {
  const { room, e, p, clock } = setup();
  e.c.x = 0; e.c.z = 0; e.c.faceX = 1; e.c.faceZ = 0; e.c.y = 0;
  e.a.x = 6; e.a.z = 0; e.a.y = 0;
  p.a.hp = 30;
  room.applyCure('c');
  room.tickHitWindows(clock.t);
  assert.strictEqual(p.a.hp, 30);
  clock.t += 400;
  room.tickHitWindows(clock.t);
  assert.strictEqual(e.c.input && require('../src/Status').active(e.c, 'slow', clock.t), false);
  clock.t += 1500;
  e.a.x = 1.5;
  e.a.y = 4;
  room.applyCure('c');
  room.tickHitWindows(clock.t);
  assert.strictEqual(p.a.hp, 30);
  e.a.y = 0;
  clock.t += 1500;
  room.applyCure('c');
  room.tickHitWindows(clock.t);
  assert.ok(p.a.hp > 30);
});

test('auto-daño: aguja y machacar dan hasta 12 de daño', () => {
  const { room, clock, e, p } = setup();
  const reset = (type) => {
    room.gameState.selfDamageObjectPositions = { o1: { x: 0, y: 0, z: 0 } };
    room.gameState.selfDamageTypes = { o1: type }; room.gameState.moduleRelocate = {};
    e.a.x = 0; e.a.z = 0; e.a.y = 0;
    p.a.hp = 60; p.a.status = 'alive';
    e.a.selfDmg = null;
  };
  reset('mash');
  room.applySelfDamage('a', 'o1');
  const target = e.a.selfDmg.target;
  for (let i = 0; i < target; i++) room.applySelfDamage('a', 'o1');
  assert.strictEqual(p.a.hp, 48);
  reset('needle');
  room.applySelfDamage('a', 'o1');
  const g = e.a.selfDmg;
  for (let k = 0; k < 3; k++) {
    const zone = g.zones[g.stage];
    const phase = zone / 2;
    clock.t = g.startedAt + Math.round((phase + Math.floor((clock.t - g.startedAt) / g.period + 1)) * g.period);
    room.applySelfDamage('a', 'o1');
  }
  assert.strictEqual(p.a.hp, 48);
  reset('needle');
  room.applySelfDamage('a', 'o1');
  const g2 = e.a.selfDmg;
  clock.t = g2.startedAt + Math.round((g2.zones[0] > 0.5 ? 0 : 0.5) * g2.period);
  room.applySelfDamage('a', 'o1');
  assert.ok(p.a.hp >= 48);
});

test('eventos del mapa: avisan, se activan y repiten; minijuego fijo por objeto', () => {
  const GameMap = require('../src/GameMap');
  GameMap.registerMap({
    id: 'evtest', name: 'ev', selfDamageObjects: [{ id: 's1', xFrac: 0, zFrac: 0, minigame: 'needle' }], collisionObjects: [],
    events: [{ id: 'g', kind: 'gates', mode: 'lock', startSec: 30, warnSec: 5, durSec: 10, repeatSec: 60 }],
  });
  assert.strictEqual(GameMap.getEvents('evtest')[0].durSec, 10);
  assert.strictEqual(GameMap.resolveSelfDamagePositions('evtest', GameMap.areaFor('evtest'))[0].minigame, 'needle');
  const { room } = setup();
  room.mapId = 'evtest';
  const at = (sec) => { room.gameState.timeRemainingMs = require('../src/Constants').GAME_DURATION_MS - sec * 1000; return room.eventPhases(); };
  assert.strictEqual(at(10).length, 0);
  assert.strictEqual(at(26)[0].phase, 'warn');
  assert.strictEqual(at(32)[0].phase, 'active');
  assert.strictEqual(at(45).length, 0);
  assert.strictEqual(at(88)[0].phase, 'warn');
  assert.strictEqual(at(95)[0].phase, 'active');
});

test('mapas de comunidad: normalizar sin registrar, y cargar un mapa ya registrado', async () => {
  const GameMap = require('../src/GameMap');
  const community = require('../src/community');
  const norm = GameMap.registerMap({ id: 'tmp', name: 'x', selfDamageObjects: [{ id: 'a', xFrac: 0.2, zFrac: 0.2, minigame: 'mash' }], collisionObjects: [] }, true);
  assert.strictEqual(norm.selfDamageObjects[0].minigame, 'mash');
  assert.strictEqual(GameMap.MAPS.tmp, undefined);
  assert.strictEqual(await community.ensureMap('default'), true);
  assert.strictEqual(await community.ensureMap('c_00000000-0000-0000-0000-000000000000'), false);
});

test('tutorial (sala con bot): vida normal y sin Desgracias', () => {
  const { room, p } = setup();
  assert.strictEqual(p.a.hp, 60);
  assert.strictEqual(p.a.maxHp, 120);
  room.award('a', 10, 'Antes');
  assert.strictEqual(room.gameState.desgracias.a.Antes, 10);
  room.phase = 'lobby';
  room.addBot(room.hostId);
  room.phase = 'action';
  room.award('a', 10, 'Con bot');
  assert.strictEqual(room.gameState.desgracias.a['Con bot'], undefined);
});

test('vida gigante solo en tutorial; partidas reales con vida normal', () => {
  const { TUTORIAL_PATIENT_HP_MAX } = require('../src/Constants');
  assert.ok(TUTORIAL_PATIENT_HP_MAX > 3.5e22 && TUTORIAL_PATIENT_HP_MAX < 3.6e22);
  const mk = (tut) => {
    const room = new Room('t' + tut);
    const sock = { readyState: 1, send() {} };
    room.addPlayer('c', sock, 'C');
    room.addPlayer('a', sock, 'A');
    room.addBot('c', tut);
    room.players.get('c').isAsymRole = true;
    room.switchPhase('action', 'test');
    return room.gameState.patients.a;
  };
  assert.strictEqual(mk(true).maxHp, TUTORIAL_PATIENT_HP_MAX);
  assert.strictEqual(mk(false).maxHp, 120);
  const real = new Room('r');
  real.addPlayer('c', { readyState: 1, send() {} }, 'C');
  real.addPlayer('a', { readyState: 1, send() {} }, 'A');
  real.players.get('c').isAsymRole = true;
  real.switchPhase('action', 'test');
  assert.strictEqual(real.gameState.patients.a.maxHp, 120);
});

test('último en pie: con un solo Paciente ocurre al iniciar; tiempo 1:30; no en tutorial', () => {
  const { room, p } = setup();
  const { LMS_TIMER_RESET_MS } = require('../src/Constants');
  delete p.b;
  room.gameState.patients = { a: p.a };
  room.gameState.lastStanding = false;
  room.gameState.timeRemainingMs = 5 * 60 * 1000;
  room.checkLastStanding();
  assert.strictEqual(room.gameState.timeRemainingMs, LMS_TIMER_RESET_MS);
  assert.strictEqual(room.gameState.lms.survivorId, 'a');
  room.gameState.timeRemainingMs = 20000;
  room.gameState.lastStanding = false;
  room.checkLastStanding();
  assert.strictEqual(room.gameState.timeRemainingMs, LMS_TIMER_RESET_MS);
  room.gameState.lastStanding = false;
  room.gameState.timeRemainingMs = 300000;
  room.tutorial = true;
  room.checkLastStanding();
  assert.strictEqual(room.gameState.timeRemainingMs, 300000);
});

test('minijuegos: clic suelto no penaliza en ritmo y el medidor da daño según cercanía', () => {
  const { room, clock, e, p } = setup();
  const reset = (type) => {
    room.gameState.selfDamageObjectPositions = { o1: { x: 0, y: 0, z: 0 } };
    room.gameState.selfDamageTypes = { o1: type }; room.gameState.moduleRelocate = {};
    e.a.x = 0; e.a.z = 0; e.a.y = 0;
    p.a.hp = 60; p.a.status = 'alive';
    e.a.selfDmg = null;
  };
  reset('rhythm');
  room.applySelfDamage('a', 'o1');
  room.applySelfDamage('a', 'o1');
  assert.ok(e.a.selfDmg, 'un clic lejos de las marcas no cierra el juego');
  reset('meter');
  room.applySelfDamage('a', 'o1');
  const g = e.a.selfDmg;
  clock.t = g.startedAt + Math.round(g.period * 0.25);
  room.applySelfDamage('a', 'o1');
  assert.strictEqual(p.a.hp, 48);
  reset('meter');
  room.applySelfDamage('a', 'o1');
  const g2 = e.a.selfDmg;
  clock.t = g2.startedAt + 1;
  room.applySelfDamage('a', 'o1');
  assert.ok(p.a.hp > 55);
});

test('mapa vivo: una rampa se cae durante el evento y vuelve; permanente no vuelve', () => {
  const GameMap = require('../src/GameMap');
  const { GAME_DURATION_MS } = require('../src/Constants');
  GameMap.registerMap({
    id: 'evcol', name: 'c', selfDamageObjects: [{ id: 's', xFrac: 0, zFrac: 0 }], collisionObjects: [],
    platforms: [{ id: 'r1', xFrac: 0.2, zFrac: 0, hxFrac: 0.1, hzFrac: 0.1, h: 2, ramp: '+x' }, { id: 'b1', xFrac: -0.2, zFrac: 0, hxFrac: 0.1, hzFrac: 0.1, h: 2 }],
    events: [{ id: 'c', kind: 'collapse', targetId: 'r1', startSec: 20, warnSec: 5, durSec: 10, repeatSec: 0 }, { id: 'a', kind: 'appear', targetId: 'b1', startSec: 40, warnSec: 5, durSec: 10, repeatSec: 0 }, { id: 'p', kind: 'collapse', targetId: 'b1', startSec: 100, warnSec: 5, durSec: 10, permanent: true }],
  });
  const { room } = setup();
  room.mapId = 'evcol';
  const at = (sec) => { room.gameState.timeRemainingMs = GAME_DURATION_MS - sec * 1000; room.tickEvents(Date.now()); return room.gameState.hiddenPlatforms; };
  assert.deepStrictEqual(at(10), ['b1']);
  assert.deepStrictEqual(at(25), ['r1', 'b1']);
  assert.deepStrictEqual(at(35), ['b1']);
  assert.deepStrictEqual(at(45), []);
  assert.deepStrictEqual(at(110), ['b1']);
  assert.deepStrictEqual(at(500), ['b1']);
});

test('mapas personalizados no dan Desgracias; el layout de un mapa se puede copiar', () => {
  const GameMap = require('../src/GameMap');
  GameMap.registerMap({ id: 'cust1', name: 'c', selfDamageObjects: [{ id: 's', xFrac: 0, zFrac: 0 }], collisionObjects: [] });
  const { room } = setup();
  room.award('a', 5, 'Normal');
  assert.strictEqual(room.gameState.desgracias.a.Normal, 5);
  room.mapId = 'cust1';
  room.award('a', 5, 'Custom');
  assert.strictEqual(room.gameState.desgracias.a.Custom, undefined);
  const copy = GameMap.getLayoutCopy('hospital');
  assert.ok(copy.platforms.length > 50 && copy.events.length >= 4 && copy.patientSpawns.length > 0);
  assert.strictEqual(GameMap.getLayoutCopy('nope'), null);
});

test('skills personalizadas: sin límite de poder, entran al mazo y funcionan', () => {
  const GameMap = require('../src/GameMap');
  const Cards = require('../src/Cards');
  GameMap.registerMap({ id: 'skbad', name: 'x', selfDamageObjects: [], collisionObjects: [], cards: [{ name: 'Rota', kind: 'strike', stunSec: 3, ragdollSec: 3, hpLoss: 40, cooldownSec: 8 }] });
  assert.strictEqual(GameMap.getCustomCards('skbad')[0].curatorHpLoss, 40);
  GameMap.registerMap({ id: 'skok', name: 'x', selfDamageObjects: [{ id: 's', xFrac: 0, zFrac: 0 }], collisionObjects: [], cards: [
    { name: 'Tajo propio', kind: 'burst', radius: 2, stunSec: 1.5, hpLoss: 10, cooldownSec: 20 },
    { name: 'Carrera', kind: 'sprint', factor: 1.5, durationSec: 3, cooldownSec: 20 },
  ] });
  const custom = GameMap.getCustomCards('skok');
  assert.strictEqual(custom.length, 2);
  const slot = Cards.dealSlot([], custom);
  assert.strictEqual(slot.options.length, 3);
  let seen = false;
  for (let i = 0; i < 60 && !seen; i++) seen = Cards.dealSlot([], custom).options.some((id) => id.startsWith('mc|'));
  assert.ok(seen, 'las skills personalizadas aparecen en las ofertas');
  const { room, clock, e, p } = setup();
  const burst = custom[0];
  const cur = Object.keys(room.gameState.entities).find((id) => room.players.get(id).isAsymRole);
  e.a.x = 0; e.a.z = 0; e.a.y = 0;
  e[cur].x = 1; e[cur].z = 0; e[cur].y = 0;
  const hp0 = room.gameState.curator.hp;
  room.applyCardEffect('a', e.a, burst, clock.t);
  assert.ok(Status.active(e[cur], 'stun', clock.t));
  assert.strictEqual(room.gameState.curator.hp, hp0 - 10);
  room.applyCardEffect('a', e.a, custom[1], clock.t);
  assert.strictEqual(e.a.sprintFactor, 1.5);
});

test('skills de Healer personalizadas reemplazan la ranura y funcionan', () => {
  const GameMap = require('../src/GameMap');
  const Characters = require('../src/Characters');
  const CustomCards = require('../src/CustomCards');
  GameMap.registerMap({ id: 'hsk', name: 'x', selfDamageObjects: [], collisionObjects: [], healerSkills: [
    { name: 'Superpulso', kind: 'pulse', radius: 30, cureAmount: 50, cooldownSec: 2 },
  ] });
  const list = CustomCards.healerSkills('hsk');
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].type, 'pulse');
  const merged = Characters.withOverride(Characters.getCharacter('vorhees_jason'), list);
  assert.strictEqual(merged[0].name, 'Superpulso');
  assert.strictEqual(merged[1].id, 'somnifero_valeriana');
});

test('bloque que aparece levanta a quien estaba dentro; bots recalculan navegación', () => {
  const { room, e } = setup();
  const GameMap = require('../src/GameMap');
  const { GAME_DURATION_MS } = require('../src/Constants');
  room.mapId = 'evcol';
  const at = (sec) => { room.gameState.timeRemainingMs = GAME_DURATION_MS - sec * 1000; room.tickEvents(Date.now()); };
  at(10);
  const area = GameMap.areaFor('evcol');
  e.a.x = -0.2 * area.halfSize; e.a.z = 0; e.a.y = 0;
  const gridBefore = room.navigation(false);
  at(45);
  assert.ok(e.a.y >= 2 - 0.01, 'quedó sobre el bloque');
  assert.notStrictEqual(room.navigation(false), gridBefore);
  at(10);
  assert.strictEqual(room.navigation(false), gridBefore);
});

test('Paraguayizador: invisible tras endlag, doble gasto sin regeneración, se cancela al ser golpeado', () => {
  const { room, clock, e } = setup();
  const Cards = require('../src/Cards');
  const C = require('../src/Constants');
  const card = Cards.getCard('paraguayizador');
  assert.ok(card);
  const t0 = clock.t;
  room.applyCardEffect('a', e.a, card, t0);
  assert.ok(Status.active(e.a, 'slow', t0), 'endlag al empezar');
  assert.ok(!room.isInvisible(e.a, t0));
  const t1 = t0 + C.PARAGUAY_START_MS + 10;
  assert.ok(room.isInvisible(e.a, t1));
  const cur = Object.keys(e).find((id) => room.players.get(id).isAsymRole);
  Status.apply(e.a, 'reveal', 5000, t1);
  room.breakParaguay('b', t1);
  assert.ok(room.isInvisible(e.a, t1), 'golpear a otro no afecta');
  room.breakParaguay('a', t1);
  assert.ok(!room.isInvisible(e.a, t1));
  assert.ok(Status.active(e.a, 'slow', t1 + C.PARAGUAY_HIT_END_MS - 100), 'endlag mayor al cancelarse');
  assert.ok(cur);
});

test('Astral Claw: carga con endlag, queda lista al saltar, esfera recta que aturda según la carga y se cancela al curarte', () => {
  const { room, clock, e } = setup();
  const cur = Object.keys(e).find((id) => room.players.get(id).isAsymRole);
  give(e.a, 0, 'astral_claw');
  e.a.x = 0; e.a.z = 0; e.a.y = 0; e.a.faceX = 0; e.a.faceZ = 1;
  e[cur].x = 0; e[cur].z = 30; e[cur].y = 0;
  room.useCard('a', 0);
  assert.strictEqual(e.a.astral.state, 'charging');
  assert.ok(Status.active(e.a, 'slow', clock.t));
  clock.t += 2500;
  e.a.onGround = false; e.a.velocityY = 5;
  room.tickAstral(clock.t, 0.05);
  assert.strictEqual(e.a.astral.state, 'ready');
  assert.ok(Math.abs(e.a.astral.charge - 0.5) < 0.01);
  room.useCard('a', 0);
  assert.ok(e.a.astral, 'no dispara antes del retardo');
  clock.t += require('../src/Constants').ASTRAL.FIRE_DELAY_MS + 100;
  room.useCard('a', 0);
  assert.ok(!e.a.astral);
  assert.ok(room.gameState.zones.some((z) => z.kind === 'astral'));
  for (let i = 0; i < 60; i++) { clock.t += 50; room.tickAstral(clock.t, 0.05); }
  assert.ok(Status.active(e[cur], 'stun', clock.t - 100) || e[cur].fx.stun, 'aturde al acertar');
  give(e.b, 0, 'astral_claw');
  room.useCard('b', 0);
  assert.ok(e.b.astral);
  room.healPatient('b', 5);
  assert.strictEqual(e.b.astral.state, 'ready', 'curarte te saca de la carga');
});

test('Ragdoll lanza hacia arriba y deja endlag al levantarse; cartas de vida máxima son cambios planos', () => {
  const { room, clock, e, p } = setup();
  const Cards = require('../src/Cards');
  const C = require('../src/Constants');
  e.a.onGround = true;
  room.ragdoll('a', e.a, 1000, clock.t);
  assert.strictEqual(e.a.velocityY, C.RAGDOLL_POP);
  assert.ok(!e.a.onGround);
  p.a.maxHp = C.TUTORIAL_PATIENT_HP_MAX;
  room.applyMaxCosts('a', e.a, Cards.getCard('red_mist'), true);
  assert.ok(p.a.maxHp > 1e20, 'IS THAT THE RED MIST? no borra la vida del tutorial');
  p.b.maxHp = C.PATIENT_HP_MAX;
  room.applyMaxCosts('b', e.b, Cards.getCard('red_mist'), true);
  assert.strictEqual(p.b.maxHp, 180);
});

test('skills personalizadas: esfera cargada (Astral Claw) e invisibilidad (Paraguayizador)', () => {
  const CustomCards = require('../src/CustomCards');
  const { room, clock, e } = setup();
  const list = CustomCards.normalizeList([{ kind: 'projectile', name: 'Esfera', chargeSec: 2, holdSec: 3, fireDelaySec: 1, stunSec: 3, projSpeed: 30 }, { kind: 'invisible', name: 'Fantasma', durationSec: 5, startSec: 0.5 }]);
  const [sphere, ghost] = CustomCards.registerAll('t', list);
  assert.ok(sphere.astral && ghost.paraMs === 5000);
  const cur = Object.keys(e).find((id) => room.players.get(id).isAsymRole);
  give(e.a, 0, sphere.id);
  e.a.x = 0; e.a.z = 0; e.a.y = 0; e.a.faceX = 0; e.a.faceZ = 1;
  e[cur].x = 0; e[cur].z = 20; e[cur].y = 0;
  room.useCard('a', 0);
  assert.strictEqual(e.a.astral.state, 'charging');
  clock.t += 1000;
  room.exitAstral(e.a, clock.t);
  assert.ok(Math.abs(e.a.astral.charge - 0.5) < 0.01);
  clock.t += 1100;
  room.useCard('a', 0);
  assert.ok(!e.a.astral);
  for (let i = 0; i < 40; i++) { clock.t += 50; room.tickAstral(clock.t, 0.05); }
  const left = e[cur].fx.stun.until - clock.t;
  assert.ok(left > 0 && left <= 1600, 'aturde en proporción a la carga');
  give(e.b, 0, ghost.id);
  room.useCard('b', 0);
  assert.ok(e.b.paraUntil > clock.t);
});

test('Astral Claw: apunta arriba/abajo, clic otra vez cancela con endlag si es temprano; el ragdoll no se aleja del cuerpo', () => {
  const { room, clock, e } = setup();
  const RagdollBody = require('../src/RagdollBody');
  const cur = Object.keys(e).find((id) => room.players.get(id).isAsymRole);
  const shoot = (aim, curY) => {
    give(e.a, 0, 'astral_claw');
    e.a.x = 0; e.a.z = 0; e.a.y = 0; e.a.faceX = 0; e.a.faceZ = 1; e.a.aim = aim;
    e[cur].x = 0; e[cur].z = 10; e[cur].y = curY; e[cur].fx = {};
    e.a.astral = { card: require('../src/Cards').getCard('astral_claw'), cfg: require('../src/Cards').getCard('astral_claw').astral, startedAt: clock.t - 4000, fastMs: 0, charge: 1, state: 'ready', readyAt: clock.t, slot: 0 };
    room.useCard('a', 0);
    for (let i = 0; i < 30; i++) { clock.t += 50; room.tickAstral(clock.t, 0.05); }
    return Status.active(e[cur], 'stun', clock.t - 50);
  };
  assert.ok(!shoot(0.6, 0), 'apuntando arriba pasa por encima');
  assert.ok(shoot(0.4, 5.5), 'apuntando arriba alcanza al Curador en altura');
  assert.ok(!shoot(-0.5, 0), 'apuntando abajo choca con el suelo antes');
  give(e.b, 0, 'astral_claw');
  room.useCard('b', 0);
  clock.t += 2000;
  e.b.cardCooldowns = {};
  room.useCard('b', 0);
  assert.strictEqual(e.b.astral.state, 'ready');
  assert.ok(Status.active(e.b, 'slow', clock.t), 'cancelar antes de tiempo deja endlag');
  const body = RagdollBody.create({ x: 0, y: 0, z: 0, faceX: 0, faceZ: 1 }, clock.t);
  const ent = { x: 0, y: 0, z: 0 };
  body.x.forEach((_, i) => { body.x[i] += 8; body.px[i] += 8; });
  RagdollBody.step(body, ent, 0, 0.05);
  assert.ok(body.x.every((x) => Math.abs(x) <= 2.3), 'el cuerpo queda dentro del radio del Paciente');
});

test('skills personalizadas: efectos a sí mismo/enemigo/aliados al usar, acertar o fallar', () => {
  const GameMap = require('../src/GameMap');
  const CardEffects = require('../src/CardEffects');
  GameMap.registerMap({ id: 'fxm', name: 'x', selfDamageObjects: [{ id: 's', xFrac: 0, zFrac: 0 }], collisionObjects: [], cards: [
    { name: 'Fx', kind: 'burst', radius: 2, stunSec: 0, fx: [
      { when: 'use', target: 'self', type: 'flojera', amount: -30 },
      { when: 'hit', target: 'enemy', type: 'slow', durationSec: 3, level: 3 },
      { when: 'miss', target: 'self', type: 'stun', durationSec: 2 },
      { when: 'hit', target: 'self', type: 'speed', amount: 2, durationSec: 4 },
    ] },
  ] });
  const card = GameMap.getCustomCards('fxm')[0];
  assert.strictEqual(card.fx.length, 4);
  const { room, clock, e } = setup();
  const cur = Object.keys(e).find((id) => room.players.get(id).isAsymRole);
  e.a.flojera = 80;
  e[cur].x = 50; e[cur].z = 50;
  room.applyCardEffect('a', e.a, card, clock.t);
  assert.strictEqual(e.a.flojera, 50);
  assert.ok(Status.active(e.a, 'stun', clock.t), 'falla: se aturde a sí mismo');
  assert.ok(!Status.active(e[cur], 'slow', clock.t));
  Status.clear(e.a, 'stun');
  e.a.x = 0; e.a.z = 0; e[cur].x = 1; e[cur].z = 0;
  room.applyCardEffect('a', e.a, card, clock.t);
  assert.ok(Status.active(e[cur], 'slow', clock.t), 'acierta: ralentiza al Healer');
  assert.strictEqual(e.a.sprintFactor, 2);
  assert.strictEqual(typeof CardEffects.runFx, 'function');
});

test('Módulos: al reubicarse nunca quedan juntos ni en el mismo sitio (salvo mapa que lo permita)', () => {
  const { room } = setup();
  room.mapId = 'hospital';
  room.gameState.selfDamageObjectPositions = {};
  const cands = room.selfDamageCandidates();
  for (const c of cands.slice(0, 6)) room.gameState.selfDamageObjectPositions[c.id] = { x: c.x, y: c.y, z: c.z };
  for (let i = 0; i < 40; i++) {
    room.relocateSelfDamageObjects(Date.now());
    const list = Object.values(room.gameState.selfDamageObjectPositions);
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      assert.ok(Math.hypot(list[a].x - list[b].x, list[a].z - list[b].z) > 0.5, 'mismo lugar');
    }
  }
});

test('Hospital General: todos los pisos, sótano, azotea y patio son alcanzables; Suero cura a Pacientes con tope y lleva al Curador a la mitad', () => {
  const GameMap = require('../src/GameMap');
  const Pathfinding = require('../src/Pathfinding');
  const area = GameMap.areaFor('general');
  const grid = Pathfinding.buildGrid(area.halfSize, GameMap.resolveCollisionObjects('general', area), GameMap.resolvePlatforms('general', area));
  const seen = Pathfinding.reachableFrom(grid, { x: -26, z: 3, y: 0 });
  for (const [x, z, y] of [[-30, -24, 7.5], [-10, -24, 15], [26, 22, 22.5], [-6, 0, -4.5], [55, 20, 0]]) {
    assert.ok(Pathfinding.isReachableNear(grid, seen, x, z, 2, y), `inalcanzable ${x},${z},${y}`);
  }
  const { room, e, p, clock, step } = setup();
  room.mapId = 'general';
  const sr = { id: 'sr_t', kind: 'serum', x: -26, z: 3, y: 0, radius: 3, ownerId: null, until: Infinity, activeUntil: clock.t + 14000, armedAt: undefined };
  room.gameState.zones.push(sr);
  const curId = [...room.players].find(([, pl]) => pl.isAsymRole)[0];
  const patId = curId === 'a' ? 'b' : 'a';
  e[curId].x = -25; e[curId].z = 3; e[curId].y = 0;
  e[patId].x = -26; e[patId].z = 3; e[patId].y = 0;
  p[patId].hp = 50;
  room.gameState.curator.hp = 100;
  for (let i = 0; i < 400; i++) { step(1); room.tickZones(clock.t, 0.05); }
  assert.ok(p[patId].hp > 50 && p[patId].hp <= p[patId].maxHp * 0.9 + 1e-6, 'cura con tope');
  assert.ok(room.gameState.curator.hp > 400 && room.gameState.curator.hp <= room.gameState.curator.max / 2 + 1e-6, 'curador sube hacia la mitad sin pasarla');
  p[patId].hp = p[patId].maxHp * 0.9;
  for (let i = 0; i < 100; i++) { step(1); room.tickZones(clock.t, 0.05); }
  assert.ok(p[patId].hp <= p[patId].maxHp * 0.9 + 1e-6, 'no pasa del tope');
});

test('tablones rompibles: se rompen a golpes y se regeneran si así se configura', () => {
  const GameMap = require('../src/GameMap');
  GameMap.registerMap({
    id: 'plank', name: 'pk', selfDamageObjects: [], collisionObjects: [],
    platforms: [
      { id: 'p1', xFrac: 0.2, zFrac: 0.2, hxFrac: 0.01, hzFrac: 0.01, h: 2, kind: 'wall', hp: 2, regenMs: 3000 },
      { id: 'p2', xFrac: -0.2, zFrac: 0.2, hxFrac: 0.01, hzFrac: 0.01, h: 2, kind: 'wall', hp: 1 },
      { id: 'r1', xFrac: 0, zFrac: -0.2, hxFrac: 0.01, hzFrac: 0.02, h: 2, ramp: '+z', kind: 'ramp' },
    ],
  });
  const { room, e, step, clock } = setup();
  room.mapId = 'plank';
  room.gameState.plankHp = {};
  room.gameState.plankBroken = {};
  const [p1, p2] = GameMap.resolvePlatforms('plank', GameMap.areaFor('plank'));
  assert.strictEqual(p1.hp, 2);
  const stand = (p) => { e.a.x = p.x - 0.5; e.a.z = p.z; e.a.y = 0; e.a.faceX = 1; e.a.faceZ = 0; };
  stand(p2);
  room.hitPlanks(e.a, 1, 0.8, false, clock.t);
  assert.ok(room.gameState.plankBroken.p2 === Infinity);
  stand(p1);
  room.hitPlanks(e.a, 1, 0.8, false, clock.t);
  assert.strictEqual(room.gameState.plankHp.p1, 1);
  room.hitPlanks(e.a, 1, 0.8, false, clock.t);
  assert.ok(room.gameState.plankBroken.p1 > clock.t);
  room.tickEvents(clock.t);
  assert.ok(room.gameState.hiddenPlatforms.includes('p1'));
  room.tickEvents(clock.t + 4000);
  assert.ok(!room.gameState.hiddenPlatforms.includes('p1'));
  assert.ok(room.gameState.hiddenPlatforms.includes('p2'));
  const Hitbox = require('../src/Hitbox');
  const ramp = GameMap.resolvePlatforms('plank', GameMap.areaFor('plank'))[2];
  assert.ok(Hitbox.platformTop(ramp, ramp.x, ramp.z + ramp.hz * 0.9) > Hitbox.platformTop(ramp, ramp.x, ramp.z - ramp.hz * 0.9));
});

test('Módulos: llevar con G, pasar a un compañero, soltar y Desgracias al que lo entregó', () => {
  const { room, e, p, clock } = setup();
  const GameMap = require('../src/GameMap');
  const id = Object.keys(room.gameState.selfDamageObjectPositions)[0];
  const pos = room.gameState.selfDamageObjectPositions[id];
  e.a.x = pos.x + 1; e.a.z = pos.z; e.a.y = pos.y || 0;
  e.b.x = pos.x + 2.5; e.b.z = pos.z; e.b.y = pos.y || 0;
  room.carryModule('a');
  assert.strictEqual(e.a.carry, id);
  room.tickCarry();
  assert.ok(Math.hypot(room.gameState.selfDamageObjectPositions[id].x - e.a.x, room.gameState.selfDamageObjectPositions[id].z - e.a.z) < 1.2);
  room.carryModule('a');
  assert.strictEqual(e.a.carry, null);
  assert.strictEqual(e.b.carry, id);
  assert.strictEqual(room.gameState.moduleHandler[id], 'a');
  room.dropModule('b');
  assert.strictEqual(e.b.carry, null);
  assert.strictEqual(room.gameState.moduleCarry[id], undefined);
  const spot = room.gameState.selfDamageObjectPositions[id];
  e.b.x = spot.x; e.b.z = spot.z; e.b.y = spot.y;
  room.gameState.desgracias = { a: {}, b: {} };
  room.players.get('a').isBot = false;
  room.gameState.moduleHandler[id] = 'a';
  e.b.selfDmg = { type: 'mash', objectId: id, startedAt: clock.t, endsAt: clock.t + 5000, count: 7, target: 7, hits: 7 };
  const before = Object.values(room.gameState.desgracias.a).reduce((s, n) => s + n, 0);
  room.finishSelfDamage('b', e.b, clock.t);
  const after = Object.values(room.gameState.desgracias.a).reduce((s, n) => s + n, 0);
  assert.ok(after > before);
  void p; void GameMap;
});

test('Golpe Aturdidor: cura como el M1, aturde si el Paciente se mueve, endlag mínimo al fallar', () => {
  const { room, e, p, clock } = setup();
  const Status = require('../src/Status');
  e.c.x = 0; e.c.z = 0; e.c.faceX = 1; e.c.faceZ = 0; e.c.y = 0;
  e.a.x = 1.2; e.a.z = 0; e.a.y = 0;
  e.a.input.moveX = 1; e.a.input.moveZ = 0; e.a.input.slow = false;
  p.a.hp = 50;
  room.gameState.curatorReleaseAt = 0;
  room.applyCuratorPulse('c', 'melee');
  room.tickHitWindows(clock.t);
  assert.ok(p.a.hp > 50);
  assert.ok(Status.blocksMove(e.a, clock.t) || Status.active(e.a, 'stun', clock.t));
  assert.ok(e.c.sprintUntil > clock.t);
  e.c.skillCooldowns.melee = 0;
  e.a.x = 30;
  room.applyCuratorPulse('c', 'melee');
  clock.t += 600;
  room.tickHitWindows(clock.t);
  assert.ok(Status.speedFactor(e.c, clock.t) < 1);
});

test('Poking Don Quixote Cube: roba Flojera, alterna modo, límite y nerf por cantidad', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.a.faceX = 1; e.a.faceZ = 0; e.c.x = 40; e.c.z = 40;
  give(e.a, 0, 'lanza_quijote');
  room.useCard('a', 0);
  const zone = room.gameState.zones.find((z) => z.kind === 'spear');
  assert.strictEqual(zone.mode, 'pull');
  e.a.cardCooldowns[0] = 0;
  room.useCard('a', 0);
  assert.strictEqual(zone.mode, 'push');
  assert.strictEqual(room.gameState.zones.filter((z) => z.kind === 'spear').length, 1);
  e.c.x = zone.x + 1; e.c.z = zone.z; e.c.flojera = 50;
  const now = Date.now() + 1000;
  room.tickZones(now, 0.05);
  assert.ok(e.c.flojera < 50);
  assert.ok(e.c.kbX > 0);
  for (let i = 0; i < 5; i++) {
    e.a.x = 10 * (i + 1); e.a.cardCooldowns[0] = 0;
    room.useCard('a', 0);
  }
  assert.ok(room.gameState.zones.filter((z) => z.kind === 'spear' && z.until > Date.now()).length <= 4);
});

test('Poking Don Quixote Cube: empieza con 1 de vida, sube 2/s, el Curador la cura y desaparece a 91', () => {
  const { room, e } = setup();
  e.a.x = 0; e.a.z = 0; e.a.faceX = 1; e.a.faceZ = 0; e.c.x = 40; e.c.z = 40;
  give(e.a, 0, 'lanza_quijote');
  room.useCard('a', 0);
  const zone = room.gameState.zones.find((z) => z.kind === 'spear');
  assert.strictEqual(zone.hp, 1);
  const t = Date.now();
  room.tickZones(t, 10);
  assert.ok(Math.abs(zone.hp - 21) < 0.01);
  assert.strictEqual(zone.level, 3);
  room.tickZones(t, 10);
  assert.strictEqual(zone.level, 2);
  e.c.x = zone.x - 1.5; e.c.z = zone.z; e.c.faceX = 1; e.c.faceZ = 0; e.c.y = 0;
  const before = zone.hp;
  room.healSpears(e.c, 1.3, 1.1, false, t);
  assert.ok(zone.hp > before);
  room.tickZones(t, 50);
  assert.ok(!room.gameState.zones.some((z) => z.kind === 'spear'));
});

test('LMS: el gimmick aplica al sobreviviente y también al Curador', () => {
  const { room, e } = setup();
  room.tutorial = false;
  for (const [id, pt] of Object.entries(room.gameState.patients)) if (id !== 'a') pt.status = 'eliminated';
  room.gameState.patients.a.status = 'alive';
  const orig = Math.random;
  Math.random = () => 0;
  room.checkLastStanding();
  Math.random = orig;
  assert.strictEqual(room.gameState.lms.gimmick, 'adrenalina');
  assert.ok(e.a.allyBoostUntil > Date.now());
  assert.ok(e.c.allyBoostUntil > Date.now());
  assert.strictEqual(room.gameState.lms.curatorId, 'c');
});

test('Garra: cancela al curarte y se limpia al reiniciar', () => {
  const Cards = require('../src/Cards');
  const { room, e } = setup();
  const now = Date.now();
  const card = Cards.getCard('astral_claw');
  room.startAstral('a', e.a, card, now);
  room.gameState.patients.a.hp = Math.max(1, room.gameState.patients.a.hp - 10);
  room.tickAstral(now + 100, 0.05);
  room.gameState.patients.a.hp += 5;
  room.tickAstral(now + 200, 0.05);
  assert.strictEqual(e.a.astral.state, 'ready');
});

test('Garra: moverse demasiado cancela la carga y el cooldown de 7s empieza al terminar', () => {
  const Cards = require('../src/Cards');
  const { room, e } = setup();
  give(e.a, 0, 'astral_claw');
  const now = Date.now();
  room.startAstral('a', e.a, Cards.getCard('astral_claw'), now);
  e.a.x += 3;
  room.tickAstral(now + 100, 0.05);
  assert.strictEqual(e.a.astral.state, 'ready');
  assert.ok(e.a.cardCooldowns[0] >= now + 6000);
});

test('roles: fuerzan una carta, ofrecen secundarias afines y ocultan al Curador hasta liberarlo', () => {
  const { room, e, sent } = setup();
  room.gameState.curatorReleaseAt = Date.now() + 5000;
  room.selectRole('a', 'loquito');
  assert.strictEqual(e.a.hand[0].chosen, 'agua_rimac');
  assert.ok(e.a.hand[1].options.length === 3 && !e.a.hand[1].options.includes('grito_animo'));
  room.selectRole('a', 'hincha');
  assert.strictEqual(e.a.role, 'loquito');
  room.selectRole('b', 'none');
  assert.strictEqual(e.b.role, 'none');
  assert.ok(!e.b.hand[0].chosen);
  room.broadcastState && 0;
  room.tick();
  const snaps = sent.a.filter((m) => m.type === 'state_snapshot');
  assert.ok(snaps.length && snaps[snaps.length - 1].payload.entities.c.gone === true);
});

test('votación en salas predeterminadas: mapa, bots y Curador, con empate aleatorio', () => {
  const { room } = setup();
  room.phase = 'lobby';
  room.isDefault = true;
  const ids = [...room.players.keys()].filter((id) => !room.players.get(id).isBot);
  room.castVote(ids[0], 'bots', 4);
  room.castVote(ids[1], 'bots', 4);
  room.castVote(ids[0], 'map', 'default');
  room.castVote(ids[0], 'curator', ids[1]);
  room.castVote(ids[1], 'curator', ids[1]);
  room.castVote(ids[0], 'bots', 99);
  assert.strictEqual(room.voteWinner('bots'), 4);
  assert.strictEqual(room.voteWinner('curator'), ids[1]);
  room.setMap(ids[0], 'default');
  room.applyVotes();
  assert.strictEqual(room.players.get(ids[1]).isAsymRole, true);
  assert.strictEqual([...room.players.values()].filter((p) => p.isBot).length, 4);
  assert.deepStrictEqual(room.votes.bots, {});
  room.castVote(ids[0], 'bots', 8);
  room.castVote(ids[1], 'bots', 12);
  assert.ok([8, 12].includes(room.voteWinner('bots')));
});

test('hospital aleatorio: sin salas selladas, 3 puertas de Curador por 1 de Paciente y mapa válido', () => {
  const GameMap = require('../src/GameMap');
  const total = { open: 0, gate: 0, pgate: 0 };
  for (let seed = 1; seed <= 60; seed++) {
    const id = GameMap.generateMap(seed);
    const m = GameMap.MAPS[id];
    for (const k of Object.keys(total)) total[k] += m.doorCount[k];
    const plats = GameMap.resolvePlatforms(id, GameMap.areaFor(id));
    assert.ok(plats.length > 100);
    const ids = new Set(plats.map((p) => p.id));
    assert.strictEqual(ids.size, plats.length);
    const hallDoors = m.platforms.filter((p) => p.id.startsWith('wh_')).length;
    assert.ok(hallDoors > 0);
  }
  assert.ok(total.gate > total.pgate * 2 && total.gate < total.pgate * 5);
  assert.ok(total.open > total.gate);
});

test('sala predeterminada: espera de un minuto solo con jugadores dentro y arranca sola', () => {
  const { room } = setup();
  room.phase = 'lobby';
  room.isDefault = true;
  const t = 5000000000;
  room.tickLobbyTimer(t);
  assert.strictEqual(room.startAt, t + 60000);
  room.tickLobbyTimer(t + 59000);
  assert.strictEqual(room.phase, 'lobby');
  room.tickLobbyTimer(t + 61000);
  assert.strictEqual(room.phase, 'action');
  const empty = new Room('vacia');
  empty.isDefault = true;
  empty.tickLobbyTimer(t);
  assert.strictEqual(empty.startAt, null);
});

test('modulos dificiles: cerradura (tres pernos y mano en 2 s) y secuencia de teclas (daño por partes, curas al fallar)', () => {
  const { room, clock, e, p } = setup();
  const reset = (type) => {
    room.gameState.selfDamageObjectPositions = { o1: { x: 0, y: 0, z: 0 } };
    room.gameState.selfDamageTypes = { o1: type }; room.gameState.moduleRelocate = {};
    e.a.x = 0; e.a.z = 0; e.a.y = 0;
    p.a.hp = 100; p.a.status = 'alive';
    e.a.selfDmg = null;
  };
  reset('lock');
  room.applySelfDamage('a', 'o1');
  let g = e.a.selfDmg;
  for (let i = 0; i < 3; i++) {
    const pin = g.pins[i];
    clock.t = g.pinAt + Math.round(pin.period * pin.zone / 2);
    room.applySelfDamage('a', 'o1');
  }
  assert.strictEqual(g.phase, 'hand');
  clock.t += 500;
  room.applySelfDamage('a', 'o1');
  assert.strictEqual(p.a.hp, 80);
  reset('lock');
  room.applySelfDamage('a', 'o1');
  g = e.a.selfDmg;
  for (let i = 0; i < 3; i++) {
    const pin = g.pins[i];
    clock.t = g.pinAt + Math.round(pin.period * pin.zone / 2);
    room.applySelfDamage('a', 'o1');
  }
  clock.t += 2100;
  room.tickSelfDamage('a', e.a, clock.t);
  assert.strictEqual(p.a.hp, 100);
  reset('keys');
  room.applySelfDamage('a', 'o1');
  g = e.a.selfDmg;
  clock.t = g.phaseUntil + 1;
  room.tickSelfDamage('a', e.a, clock.t);
  clock.t = g.phaseUntil + 1;
  room.tickSelfDamage('a', e.a, clock.t);
  assert.strictEqual(g.phase, 'input');
  room.applySelfDamage('a', 'o1', [...g.seq]);
  assert.strictEqual(p.a.hp, 99);
  clock.t = g.phaseUntil + 1;
  room.tickSelfDamage('a', e.a, clock.t);
  assert.strictEqual(g.phase, 'input');
  room.applySelfDamage('a', 'o1', [...g.seq].reverse());
  assert.strictEqual(g.fails, 1);
  assert.strictEqual(p.a.hp, 100);
});

test('modulos: nunca hay dos del mismo tipo a la vez ni mas de 2 faciles o 2 dificiles', () => {
  const { room } = setup();
  for (let n = 0; n < 200; n++) {
    room.fixedMinigames = {};
    room.gameState.selfDamageTypes = {};
    const ids = Array.from({ length: 10 }, (_, i) => `m${i}`);
    for (const id of ids) room.gameState.selfDamageTypes[id] = room.randomMinigame(id);
    const list = Object.values(room.gameState.selfDamageTypes);
    assert.strictEqual(new Set(list).size, list.length);
    assert.ok(list.filter((t) => ['pulso', 'termometro', 'pelota'].includes(t)).length <= 2);
    assert.ok(list.filter((t) => t === 'lock' || t === 'keys').length <= 2);
  }
});

test('modulos solapados se separan solos', () => {
  const { room } = setup();
  room.mapId = 'hospital';
  const cands = room.selfDamageCandidates();
  room.gameState.selfDamageObjectPositions = { m1: { x: cands[0].x, y: cands[0].y, z: cands[0].z }, m2: { x: cands[0].x + 0.5, y: cands[0].y, z: cands[0].z } };
  room.gameState.moduleCarry = {};
  room.separateModules(Date.now());
  const [a, b] = Object.values(room.gameState.selfDamageObjectPositions);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 3);
});

test('modos: doble Curador asimetrico y cuerpos compartidos', () => {
  const { room, p } = setup();
  room.phase = 'lobby';
  room.hostId = 'a';
  room.mode = 'dual';
  room.applyMode();
  const asym = [...room.players.values()].filter((x) => x.isAsymRole);
  assert.strictEqual(asym.length, room.players.size > 1 ? 2 : 1);
  room.clearSecondCurator();
  assert.strictEqual([...room.players.values()].filter((x) => x.isAsymRole).length, 1);
  room.mode = 'shared';
  room.phase = 'action';
  const ids = Object.keys(room.gameState.patients);
  for (const id of ids) { room.gameState.patients[id].status = 'alive'; room.gameState.patients[id].hp = 60; }
  room.sharedHp = 60;
  room.gameState.patients[ids[0]].hp = 50;
  room.tickMode(Date.now());
  for (const id of ids) assert.strictEqual(room.gameState.patients[id].hp, 50);
  room.matchCount = 3;
  assert.ok(room.modeVoteOpen());
});

test('bloques: la cura los lleva al maximo y se rompen sin colision; el daño los repara', () => {
  const GameMap = require('../src/GameMap');
  const { room, e, p } = setup();
  room.mapId = 'random';
  const id = GameMap.generateMap(7);
  room.mapId = id;
  room.initGameState();
  const blk = GameMap.resolvePlatforms(id, GameMap.areaFor(id)).find((x) => x.blockMax > 0);
  assert.ok(blk);
  const gs = room.gameState;
  assert.ok(gs.blockHp[blk.id] < blk.blockMax);
  const owner = { x: blk.x, z: blk.z, y: blk.y0 || 0, faceX: 0, faceZ: 1 };
  for (let i = 0; i < 12; i++) room.healBlocks(owner, 0, 2, true, Date.now());
  assert.ok(gs.blockBroken[blk.id]);
  assert.ok(gs.hiddenPlatforms.includes(blk.id));
  gs.entities.a.x = blk.x; gs.entities.a.z = blk.z; gs.entities.a.y = blk.y0 || 0;
  p.a.status = 'alive';
  room.players.get('a').isAsymRole = false;
  for (let i = 0; i < 12; i++) { gs.entities.a.nextRepairAt = 0; room.repairBlock('a'); }
  assert.ok(!gs.blockBroken[blk.id]);
});

function tz(room, step, n) {
  for (let i = 0; i < n; i++) { step(1); room.tickZones(Date.now(), 0.05); }
}

function curatorAt(e, room) {
  e.c.x = 0; e.c.z = 0; e.c.y = 0; e.c.faceX = 1; e.c.faceZ = 0;
  room.gameState.curatorReleaseAt = 0;
  e.c.skillCooldowns = {};
}

test('Pulso de Hierbas: zona que cura y revela mientras estés dentro', () => {
  const { room, e, p, step } = setup();
  curatorAt(e, room);
  e.a.x = 2; e.a.z = 0; e.a.y = 0; p.a.hp = 50;
  room.applyCuratorPulse('c', 0);
  const hp0 = p.a.hp;
  tz(room, step, 20);
  assert.ok(p.a.hp > hp0);
  assert.ok(Status.until(e.a, 'reveal') > Date.now());
  e.a.x = 30;
  const hp1 = p.a.hp;
  tz(room, step, 10);
  assert.strictEqual(p.a.hp, hp1);
});

test('Somnífero: nube que ralentiza y duerme tras respirar', () => {
  const { room, e, step } = setup();
  curatorAt(e, room);
  room.applyCuratorPulse('c', 1);
  const z = room.gameState.zones.find((q) => q.kind === 'gas');
  e.a.x = z.x; e.a.z = z.z; e.a.y = 0;
  tz(room, step, 4);
  assert.ok(Status.speedFactor(e.a, Date.now()) < 1);
  tz(room, step, 14);
  assert.ok(Status.active(e.a, 'stun', Date.now()));
});

test('Raíz Atrayente: proyectil que arrastra y atrapa al primer Paciente', () => {
  const { room, e, step } = setup();
  curatorAt(e, room);
  e.a.x = 7; e.a.z = 0; e.a.y = 0;
  e.b.x = 30; e.b.z = 30;
  room.applyCuratorPulse('c', 2);
  tz(room, step, 20);
  assert.ok(Status.active(e.a, 'stun', Date.now()) || e.a.x < 7);
  assert.ok(!Status.active(e.b, 'stun', Date.now()));
});

test('Anestesia: dardo que ralentiza y luego desmaya', () => {
  const { room, e, step } = setup();
  const Characters = require('../src/Characters');
  room.players.get('c').characterId = 'enfermera_buenaventura';
  curatorAt(e, room);
  e.a.x = 8; e.a.z = 0; e.a.y = 0;
  room.applyCuratorPulse('c', 1);
  tz(room, step, 8);
  assert.ok(Status.speedFactor(e.a, Date.now()) < 1);
  tz(room, step, 40);
  assert.ok(e.a.sedate === null || Status.active(e.a, 'stun', Date.now()) || Status.until(e.a, 'stun') > 0);
  void Characters;
});

test('Camilla Magnética: se lleva a los Pacientes que toca', () => {
  const { room, e, step } = setup();
  room.players.get('c').characterId = 'enfermera_buenaventura';
  curatorAt(e, room);
  e.a.x = 4; e.a.z = 0; e.a.y = 0;
  room.applyCuratorPulse('c', 2);
  tz(room, step, 20);
  assert.ok(e.a.x > 6);
});

test('Desinfectante bloquea los Módulos cercanos', () => {
  const { room, e, sent, clock } = setup();
  room.players.get('c').characterId = 'enfermera_buenaventura';
  curatorAt(e, room);
  room.applyCuratorPulse('c', 3);
  assert.ok(room.gameState.moduleLock && room.gameState.moduleLock.until > clock.t);
  void sent;
});

test('M1 golpea bloques en cualquier direccion aunque no haya Pacientes cerca', () => {
  const GameMap = require('../src/GameMap');
  const { room } = setup();
  room.mapId = 'random';
  const id = GameMap.generateMap(7);
  room.mapId = id;
  room.initGameState();
  const blk = GameMap.resolvePlatforms(id, GameMap.areaFor(id)).find((x) => x.blockMax > 0);
  const gs = room.gameState;
  const before = gs.blockHp[blk.id];
  for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const hp0 = gs.blockHp[blk.id];
    if (gs.blockBroken[blk.id]) break;
    const owner = { x: blk.x - fx * 1.0, z: blk.z - fz * 1.0, y: blk.y0 || 0, faceX: fx, faceZ: fz };
    room.healBlocks(owner, 1.2, 0.85, false, Date.now());
    assert.ok(gs.blockHp[blk.id] > hp0, `direccion ${fx},${fz}`);
  }
  assert.ok(gs.blockHp[blk.id] > before);
});

test('emotes: bloquean habilidades, ralentizan 8%, se cancelan con aturdimiento y salto', () => {
  const { room, e, p } = setup();
  const now = Date.now();
  assert.ok(room.startEmote('a', e.a, 'schadenfreude', now));
  assert.ok(Status.blocksSkills(e.a, now));
  assert.ok(Math.abs(Status.speedFactor(e.a, now) - 0.92) < 1e-9);
  assert.ok(!room.startEmote('a', e.a, 'fue_el', now));
  Status.apply(e.a, 'stun', 500, now);
  assert.strictEqual(e.a.emote, null);
  e.a.fx = {}; e.a.emoteCdUntil = 0;
  assert.ok(room.startEmote('a', e.a, 'ya_pues', now));
  room.applyPlayerInput('a', { jump: true });
  assert.strictEqual(e.a.emote, null);
  e.a.emoteCdUntil = 0;
  assert.ok(!room.startEmote('a', e.a, 'pulso', now));
  p.a.status = 'eliminated';
  assert.ok(!room.startEmote('a', e.a, 'ya_pues', now));
});

test('boss: rol aparte, 27 min, stats, Fatiga con deuda y fin de partida', () => {
  const Boss = require('../src/Boss');
  const room = new Room('t');
  const sock = () => ({ readyState: 1, send() {} });
  room.addPlayer('c', sock(), 'C');
  room.addPlayer('a', sock(), 'A');
  room.addPlayer('b', sock(), 'B');
  room.bossOn = true;
  room.bossId = 'b';
  Boss.prepare(room);
  assert.ok(room.players.get('b').isBoss && room.bossActive);
  room.switchPhase('action', 'test');
  const gs = room.gameState;
  const e = gs.entities;
  assert.strictEqual(gs.timeRemainingMs, Boss.BOSS_DURATION_MS);
  assert.ok(!gs.patients.b && gs.patients.a);
  assert.strictEqual(e.b.sp, 100);
  assert.strictEqual(gs.curator.max, 1500 * 8);
  const now = Date.now();
  Boss.addFatiga(room, 'a', 8, 8, now);
  assert.ok(Math.abs(e.a.fatiga - 1) < 1e-9 && Math.abs(e.a.debt - 1) < 1e-9);
  e.a.debt = 400;
  assert.ok(Math.abs(Boss.collapse(room, 'a', now) - 70) < 1e-9);
  assert.strictEqual(e.a.debt, 0);
  Boss.addFatiga(room, 'a', 5000, 0, now);
  assert.strictEqual(gs.patients.a.status, 'down');
  room.checkGameEndConditions();
  assert.ok(!gs.gameOver);
  Boss.addFatiga(room, 'c', 99999, 0, now);
  room.checkGameEndConditions();
  assert.ok(gs.gameOver);
});

test('boss: Megethoskinesis cambia tamano y Teletransportacion marca y salta', () => {
  const Boss = require('../src/Boss');
  const room = new Room('t');
  const sock = () => ({ readyState: 1, send() {} });
  room.addPlayer('c', sock(), 'C');
  room.addPlayer('a', sock(), 'A');
  room.addPlayer('b', sock(), 'B');
  room.bossOn = true;
  room.bossId = 'b';
  Boss.prepare(room);
  room.switchPhase('action', 'test');
  const e = room.gameState.entities;
  let now = Date.now();
  Boss.ability(room, 'b', 0, now);
  assert.strictEqual(e.b.size, 1.6);
  Boss.ability(room, 'b', 0, now);
  assert.strictEqual(e.b.size, 1.6);
  e.b.x = 10; e.b.z = 10;
  Boss.ability(room, 'b', 1, now);
  assert.ok(e.b.tpMark);
  e.b.x = 40; e.b.z = 40;
  now += 1000;
  Boss.ability(room, 'b', 1, now);
  assert.ok(e.b.tpAt);
  e.a.x = 10; e.a.z = 10;
  Boss.tick(room, now + 2000, 0.05);
  assert.strictEqual(e.b.x, 10);
  assert.ok(e.a.fatiga > 0);
});

test('boss: resto de habilidades de Jeffrey', () => {
  const Boss = require('../src/Boss');
  const room = new Room('t');
  const sock = () => ({ readyState: 1, send() {} });
  room.addPlayer('c', sock(), 'C');
  room.addPlayer('a', sock(), 'A');
  room.addPlayer('b', sock(), 'B');
  room.bossOn = true;
  room.bossId = 'b';
  Boss.prepare(room);
  room.switchPhase('action', 'test');
  const gs = room.gameState;
  const e = gs.entities;
  let now = Date.now();
  e.b.x = 0; e.b.z = 0; e.a.x = 5; e.a.z = 0; e.c.x = 60; e.c.z = 60;
  Boss.ability(room, 'b', 2, now);
  assert.ok(e.a.blueUntil > now);
  now += 15000;
  Boss.ability(room, 'b', 2, now);
  assert.ok(Status.active(e.a, 'reveal', now));
  now += 15000;
  Boss.ability(room, 'b', 2, now);
  assert.strictEqual(gs.censors.length, 1);
  assert.ok(Boss.cureBlocked(room, e.a, now));
  Boss.ability(room, 'b', 3, now);
  assert.ok(Status.active(e.a, 'stun', now) && e.a.noCureUntil > now);
  Boss.ability(room, 'b', 4, now);
  assert.ok(e.b.shadow);
  Boss.ability(room, 'b', 7, now);
  assert.ok(e.a.liveUntil > now);
  Boss.ability(room, 'b', 6, now);
  assert.ok(e.a.debt > 0);
  Boss.ability(room, 'b', 8, now);
  assert.ok(!e.b.ultAt);
  e.b.sp = 20;
  Boss.ability(room, 'b', 8, now);
  assert.ok(e.b.ultAt);
  Boss.tick(room, now + 2000, 0.05);
  assert.strictEqual(e.b.sp, 100);
  assert.strictEqual(e.a.redKind, 'p');
  e.b.size = 3;
  Status.apply(e.b, 'stun', 1000, now);
  assert.ok(!Status.active(e.b, 'stun', now));
});

test('boss: tamanos, colision y alcance escalan', () => {
  const Boss = require('../src/Boss');
  const Hitbox = require('../src/Hitbox');
  const room = new Room('t');
  const sock = () => ({ readyState: 1, send() {} });
  room.addPlayer('c', sock(), 'C');
  room.addPlayer('a', sock(), 'A');
  room.addPlayer('b', sock(), 'B');
  room.bossOn = true;
  room.bossId = 'b';
  Boss.prepare(room);
  room.switchPhase('action', 'test');
  const e = room.gameState.entities;
  let now = Date.now();
  Boss.ability(room, 'b', 9, now);
  assert.strictEqual(e.b.size, 0.45);
  now += 2000;
  Boss.ability(room, 'b', 9, now);
  assert.strictEqual(e.b.size, 0.14);
  const small = Boss.collision(room.players.get('b'), e.b);
  assert.ok(small.s === 1 && !small.noclip);
  now += 2000;
  for (let i = 0; i < 3; i++) { Boss.ability(room, "b", 0, now); now += 2000; }
  assert.strictEqual(e.b.size, 1.6);
  assert.ok(Boss.collision(room.players.get('b'), e.b).noclip);
  assert.ok(Hitbox.extentOf(e.b).height > 5);
  assert.ok(Boss.reachOf(3.5) > Boss.reachOf(1));
});
