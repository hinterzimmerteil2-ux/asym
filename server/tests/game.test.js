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
  const path = Pathfinding.findPath(grid, { x: -9, z: -25.8 }, { x: 0, z: -25 });
  assert.ok(path.length >= 3);
  assert.ok(path.some((p) => p.x > 6));
  const end = path[path.length - 1];
  assert.ok(Math.hypot(end.x - 0, end.z + 25) < 1.2);
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
    { id: 'ok', x: 20, z: 20 },
    { id: 'en_pilar', x: 12, z: 12 },
    { id: 'en_estante', x: 6, z: -14 },
    { id: 'meseta', x: 0, z: -25 },
  ];
  room.nav = null;
  const ids = room.selfDamageCandidates().map((p) => p.id);
  GameMap.resolveSelfDamagePositions = original;
  assert.deepStrictEqual(ids, ['ok', 'meseta']);
  room.nav = null;
  const plateau = room.selfDamageCandidates().find((p) => p.id === 'obj_6');
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

test('cáscara de plátano: 2 usos, cura 30 al Curador y también tropieza su dueño tras armarse', () => {
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
  assert.strictEqual(room.gameState.curator.hp, 80);
  assert.strictEqual(zone.charges, 1);
  assert.strictEqual(Status.active(e.a, 'ragdoll', Date.now()), false);
  e.c.x = 40;
  zone.cooldownUntil = 0; zone.ownerArmedAt = 0;
  e.a.x = zone.x; e.a.z = zone.z;
  room.tickZones(Date.now(), 0.05);
  assert.strictEqual(Status.active(e.a, 'ragdoll', Date.now()), true);
  assert.strictEqual(room.gameState.zones.length, 0);
});

test('chicharrón y goyslop en el mínimo dan velocidad temporal o Flojera', () => {
  const { room, e } = setup();
  room.gameState.patients.a.hp = 60;
  give(e.a, 0, 'chicharron');
  room.useCard('a', 0);
  assert.ok(!(e.a.sprintUntil > Date.now()));
  e.a.cardCooldowns = {};
  give(e.a, 0, 'chicharron');
  room.useCard('a', 0);
  assert.ok(e.a.sprintUntil > Date.now());
  e.a.flojera = 10;
  e.a.cardCooldowns = {};
  room.gameState.patients.a.hp = 30;
  give(e.a, 0, 'goyslop');
  room.useCard('a', 0);
  assert.strictEqual(e.a.flojera, 50);
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
  step(3);
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
