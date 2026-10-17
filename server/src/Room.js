const { MessageType, encode } = require('./protocol');
const GameMap = require('./GameMap');
const Characters = require('./Characters');
const Cards = require('./Cards');

const MAX_PLAYERS = 10;
const TICK_RATE_MS = 1000 / 20;

// --- Constantes de la mecánica Curador/Paciente ---
const PATIENT_HP_START = 60;
const PATIENT_HP_MAX = 120;
const PATIENT_HP_MIN = 0;
const CURE_AMOUNT = 15;
const SELF_DAMAGE_AMOUNT = 15;

const GAME_DURATION_MS = 4 * 60 * 1000;
const TIME_BONUS_MAX_MS = 60 * 1000;
const LMS_TIMER_RESET_MS = 90 * 1000;

// --- Constantes de chat ---
const CHAT_MAX_LENGTH = 300;
const CHAT_HISTORY_LIMIT = 100;
const CHAT_RATE_LIMIT_MS = 500;

// --- Constantes de movimiento ---
const MOVE_SPEED = 5;
const JUMP_VELOCITY = 4.5;
const STEP_UP = 0.5;
const STEP_DOWN = 0.7;
const FALL_ENDLAG_MIN = 1.2;
const FALL_ENDLAG_MS = 1800;
const GRAVITY = -18;
const GROUND_Y = 0;
const PLAYER_COLLISION_RADIUS = 0.4;

// Radio de interacción para M1/auto-daño — esto es lo que se había
// perdido y se pidió reconstruir: validación de distancia puntual en el
// instante del click, no una zona de colisión continua.
const INTERACTION_RADIUS = 1.8;

// --- Habilidad especial del Curador: "Pulso de Curación" ---
// Un dash de persecución no tenía sentido temático acá — este es un
// juego donde TODO está invertido respecto al slop genérico que parodia
// (el "killer" cura, las "víctimas" se autodañan para escapar), así que
// la habilidad especial del Curador tiene que reforzar esa premisa, no
// romperla con una herramienta de caza. El Pulso cura a todos los
// Pacientes vivos dentro de un radio a la vez (menos que un click
// directo cada uno, para no volverlo estrictamente mejor que curar uno
// por uno), premiando que el Curador juegue alrededor del grupo en vez
// de perseguir a un Paciente aislado.
const FAST_MULTIPLIER = 1.4;
const SPRINT_CARD_MULTIPLIER = 1.5;
const ROLL_DISTANCE = 7;
const SEGUNDO_ALIENTO_AMOUNT = 60;
const HUMO_RADIUS = 7;
const GOLPE_DOBLE_FACTOR = 2;
const TROPIEZO_RADIUS = 3;
const RELOCATE_INTERVAL_MS = 25000;
const CURATOR_HP_START = 800;
const CURATOR_HP_MAX = 1500;
const PUDDLE_CURATOR_PER_SEC = 3;
const REGALO_RADIUS = 8;
const REGALO_HP = 40;
const CHICHARRON_DAMAGE = 25;
const CHICHARRON_FLOOR = 40;
const GOYSLOP_DAMAGE = 45;
const GOYSLOP_FLOOR = 15;
const MAX_HP_MINIMUM = 60;
const RED_MIST_RADIUS = 6;
const RED_MIST_HEAL = 35;
const TRAP_RADIUS = 1.5;
const TRAP_ARM_MS = 800;
const TRAP_LIFETIME_MS = 30000;
const RIMAC_CURADOR_FLOJERA_DRAIN_PER_SEC = 18;

const ROLL_PUSH = 10;
const CHANNEL_MS = 8300;
const CHANNEL_BEAT_MS = 1000;
const CHANNEL_BEATS = 8;
const CHANNEL_TOLERANCE_MS = 150;
const CHANNEL_SLOW = 0.5;
const CHANNEL_HIT_PEREZA_MS = 900;
const INTERACTION_SCALE = 1;
const ROLL_HIT_WIDTH = 1.5;
const ROLL_FLOJERA_COST = 25;
const PEREZA_SPEED_PER_LEVEL = 0.5;
const EXACERBACION_MAX_LEVEL = 3;
const EXACERBACION_MS = 8000;
const EXACERBACION_STEP = 0.2;
const ACETIL_FACTOR = 2.2;
const ACETIL_ALLY_RADIUS = 1.5;
const ACETIL_ALLY_STEP = 0.25;
const ALLY_BOOST_MAX_LEVEL = 3;
const SLOW_BY_LEVEL = [1, 0.5, 0.35, 0.25];
const ACETIL_REGEN_DELAY_MS = 1000;
const ACETIL_FATIGUE_MS = 4000;
const ACETIL_FATIGUE_FACTOR = 0.7;
const CURATOR_SPAWN_DELAY_MS = 15000;
const ENDLAG_MIN_MS = 0;
const CURATOR_FLOJERA_BONUS = 8;
const ENDLAG_MAX_MS = 1800;
const FLOJERA_MAX = 100;
const FLOJERA_MAX_MINIMUM = 40;
const FLOJERA_DRAIN_PER_SEC = 20;
const FLOJERA_REGEN_PER_SEC = 12;
const FLOJERA_SLOW_MULTIPLIER = 1;
const FLOJERA_EXHAUST_LOCKOUT_MS = 3000;

function clampUnit(value) {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return Math.max(-1, Math.min(1, n));
}

function euclid(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function platformTop(p, x, z) {
  if (Math.abs(x - p.x) > p.hx || Math.abs(z - p.z) > p.hz) return null;
  if (!p.ramp) return p.h;
  const t = p.ramp === '-x' ? (p.x + p.hx - x) / (2 * p.hx) : (x - (p.x - p.hx)) / (2 * p.hx);
  return Math.max(0, Math.min(1, t)) * p.h;
}

const PLAYER_HALF = 0.4;
const PLAYER_HEIGHT = 1.8;
const FOOTPRINT = [[0, 0], [PLAYER_HALF, PLAYER_HALF], [PLAYER_HALF, -PLAYER_HALF], [-PLAYER_HALF, PLAYER_HALF], [-PLAYER_HALF, -PLAYER_HALF]];

function groundAt(platforms, x, z, y) {
  let g = GROUND_Y;
  for (const p of platforms) {
    for (const [ox, oz] of FOOTPRINT) {
      const top = platformTop(p, x + ox, z + oz);
      if (top !== null && top <= y + STEP_UP && top > g) g = top;
    }
  }
  return g;
}

function blockedAt(platforms, x, z, y) {
  for (const p of platforms) {
    for (const [ox, oz] of FOOTPRINT) {
      const top = platformTop(p, x + ox, z + oz);
      if (top !== null && top > y + STEP_UP) return true;
    }
  }
  return false;
}

function extentOf(o) {
  return o.input ? { half: PLAYER_HALF, height: PLAYER_HEIGHT } : { half: 0, height: 0 };
}

function distanceBetween(a, b) {
  const ea = extentOf(a);
  const eb = extentOf(b);
  const reach = ea.half + eb.half;
  const ay = a.y || 0;
  const by = b.y || 0;
  return Math.max(
    Math.max(0, Math.abs(a.x - b.x) - reach),
    Math.max(0, Math.abs(a.z - b.z) - reach),
    Math.max(0, ay - (by + eb.height), by - (ay + ea.height))
  );
}

class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.hostId = null;
    this.phase = 'lobby';
    this.tickInterval = null;
    this.tickCount = 0;
    this.mapId = GameMap.DEFAULT_MAP_ID; // qué mapa usa esta sala — hoy siempre 'default', preparado para elegir otro cuando exista el creador

    this.chatHistory = [];
    this.lastChatAt = new Map();

    this.gameState = {
      entities: {},
      patients: {},
      patientsInitialCount: 0,
      timeRemainingMs: GAME_DURATION_MS,
      gameOver: false,
      selfDamageObjectPositions: {},
      zones: [],
      curator: { hp: CURATOR_HP_START, max: CURATOR_HP_MAX },
    };
  }

  addBot(requesterId) {
    if (this.phase !== 'lobby' || requesterId !== this.hostId || this.isFull()) return;
    this.botCounter = (this.botCounter || 0) + 1;
    const botId = `bot-${this.botCounter}`;
    this.addPlayer(botId, { readyState: 0, send() {} }, `Bot ${this.botCounter}`);
    this.players.get(botId).isBot = true;
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId });
  }

  removeBot(requesterId) {
    if (this.phase !== 'lobby' || requesterId !== this.hostId) return;
    const botIds = [...this.players.entries()].filter(([, p]) => p.isBot).map(([id]) => id);
    if (!botIds.length) return;
    this.removePlayer(botIds[botIds.length - 1]);
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId });
  }

  botCurator(botId, player, now) {
    const entity = this.gameState.entities[botId];
    if (!entity) return;
    let target = null;
    let targetDist = Infinity;
    for (const [patientId, patient] of Object.entries(this.gameState.patients)) {
      if (patient.status !== 'alive') continue;
      const other = this.gameState.entities[patientId];
      if (!other) continue;
      const d = distanceBetween(entity, other);
      if (d < targetDist) { targetDist = d; target = { id: patientId, entity: other }; }
    }
    if (!target) {
      entity.input.moveX = 0;
      entity.input.moveZ = 0;
      return;
    }
    if (targetDist > INTERACTION_RADIUS - 0.5) {
      const reach = euclid(entity, target.entity) || 1;
      entity.input.moveX = (target.entity.x - entity.x) / reach;
      entity.input.moveZ = (target.entity.z - entity.z) / reach;
    } else {
      entity.input.moveX = 0;
      entity.input.moveZ = 0;
    }
    if (now > (player.nextBotAct || 0) && targetDist <= INTERACTION_RADIUS) {
      this.applyCure(botId, target.id);
      player.nextBotAct = now + 550;
    }
    if (now > (player.nextBotCard || 0)) {
      player.nextBotCard = now + 1200 + Math.random() * 1500;
      const skillIndex = targetDist <= 2.5 && Math.random() < 0.4 ? 'melee' : Math.floor(Math.random() * 4);
      this.applyCuratorPulse(botId, skillIndex);
    }
  }

  botThink(now) {
    for (const [botId, player] of this.players) {
      if (!player.isBot) continue;
      if (player.isAsymRole) {
        this.botCurator(botId, player, now);
        continue;
      }
      const entity = this.gameState.entities[botId];
      const patient = this.gameState.patients[botId];
      if (!entity || !patient || patient.status !== 'alive') {
        if (entity) { entity.input.moveX = 0; entity.input.moveZ = 0; }
        continue;
      }
      entity.hand.forEach((slot, index) => {
        if (!slot.chosen && slot.options.length && now > (player.nextBotPick || 0)) {
          const option = slot.options[Math.floor(Math.random() * slot.options.length)];
          this.chooseCard(botId, index, option);
          player.nextBotPick = now + 800;
        }
      });
      let best = null;
      let bestDist = Infinity;
      for (const [objectId, pos] of Object.entries(this.gameState.selfDamageObjectPositions)) {
        const d = distanceBetween(entity, pos);
        if (d < bestDist) { bestDist = d; best = { objectId, pos }; }
      }
      if (!best) continue;
      if (bestDist <= INTERACTION_RADIUS - 0.3) {
        entity.input.moveX = 0;
        entity.input.moveZ = 0;
        if (now > (player.nextBotAct || 0)) {
          this.applySelfDamage(botId, best.objectId);
          player.nextBotAct = now + 700;
        }
      } else {
        const reach = euclid(entity, best.pos) || 1;
        entity.input.moveX = (best.pos.x - entity.x) / reach;
        entity.input.moveZ = (best.pos.z - entity.z) / reach;
      }
      if (now > (player.nextBotCard || 0)) {
        player.nextBotCard = now + 3000 + Math.random() * 4000;
        const slotIndex = Math.floor(Math.random() * entity.hand.length);
        if (entity.hand[slotIndex]?.chosen) this.useCard(botId, slotIndex);
      }
    }
  }

  isFull() {
    return this.players.size >= MAX_PLAYERS;
  }

  isEmpty() {
    return this.players.size === 0;
  }

  addPlayer(playerId, ws, name) {
    const isFirst = this.players.size === 0;
    this.players.set(playerId, {
      ws,
      name,
      isAsymRole: isFirst,
      characterId: isFirst ? Characters.DEFAULT_CHARACTER_ID : null,
    });
    if (isFirst) this.hostId = playerId;

    const spawnIndex = this.players.size - 1;
    const spawnAngle = (spawnIndex * (2 * Math.PI)) / MAX_PLAYERS;
    const spawnRadius = GameMap.LOBBY_AREA.spawnRadius;
    this.gameState.entities[playerId] = {
      x: Math.cos(spawnAngle) * spawnRadius,
      y: GROUND_Y,
      z: Math.sin(spawnAngle) * spawnRadius,
      velocityY: 0,
      onGround: true,
      input: { moveX: 0, moveZ: 0, jump: false, slow: false },
      skillCooldowns: {},
      stunnedUntil: 0,
      noDrainUntil: 0,
      cureBoostUntil: 0,
      cureBoostFactor: 1,
      flojera: FLOJERA_MAX,
      flojeraMax: FLOJERA_MAX,
      flojeraLockedUntil: 0,
      hand: [],
      draftEndsAt: 0,
      cardCooldowns: {},
      sprintUntil: 0,
      exacerbacionLevel: 0,
      exacerbacionUntil: 0,
      perezaUntil: 0,
      ragdollUntil: 0,
      channel: null,
      faceX: 0,
      faceZ: 1,
      perezaLevel: 0,
      acetilUntil: 0,
      regenBlockedUntil: 0,
      fatigueUntil: 0,
      allyBoostUntil: 0,
      allyBoostLevel: 0,
      slowedLevel: 1,
      endlagUntil: 0,
      baseCooldownUntil: 0,
      slowedUntil: 0,
      doubleSelfDamage: false,
    };

    this.startTickLoop();
  }

  removePlayer(playerId) {
    const wasAsymRole = this.players.get(playerId)?.isAsymRole;
    this.players.delete(playerId);
    delete this.gameState.entities[playerId];
    delete this.gameState.patients[playerId];
    this.lastChatAt.delete(playerId);
    if (this.hostId === playerId) {
      const next = this.players.keys().next();
      this.hostId = next.done ? null : next.value;
    }
    // Si el Curador se desconecta en el lobby, la sala se queda sin nadie
    // en ese rol. Se lo reasignamos a otro jugador para que la partida
    // siga siendo iniciable — igual que pasa al entrar el primer jugador.
    if (wasAsymRole && this.phase === 'lobby' && this.players.size > 0) {
      const next = this.players.keys().next().value;
      const nextPlayer = this.players.get(next);
      nextPlayer.isAsymRole = true;
      if (!nextPlayer.characterId) nextPlayer.characterId = Characters.DEFAULT_CHARACTER_ID;
    }
    const humansLeft = [...this.players.values()].some((p) => !p.isBot);
    if (!humansLeft) {
      for (const id of [...this.players.keys()]) {
        this.players.delete(id);
        delete this.gameState.entities[id];
        delete this.gameState.patients[id];
      }
    }
    if (this.isEmpty()) this.stopTickLoop();
  }

  getPlayersSummary() {
    return Array.from(this.players.entries()).map(([id, p]) => {
      const characterData = p.isAsymRole ? Characters.getCharacter(p.characterId) : null;
      return {
        id,
        name: p.name,
        isAsymRole: p.isAsymRole,
        isBot: Boolean(p.isBot),
        characterId: p.isAsymRole ? (p.characterId || Characters.DEFAULT_CHARACTER_ID) : null,
        character: characterData
          ? { displayName: characterData.displayName, weaponName: characterData.weaponName, skills: Characters.publicSkills(characterData) }
          : null,
      };
    });
  }

  /**
   * Cambia el nombre visible del jugador dentro de esta sala (chat,
   * lista de jugadores, cartel de fin de partida). El nombre "real" de
   * la cuenta/invitado vive en el JWT y se actualiza aparte vía HTTP
   * (/auth/update-name) — esto solo mantiene en sincro lo que ya se
   * está mostrando en una sala sin forzar una reconexión.
   */
  setDisplayName(playerId, displayName) {
    const player = this.players.get(playerId);
    if (!player) return;
    const trimmed = typeof displayName === 'string' ? displayName.trim().slice(0, 30) : '';
    if (!trimmed) return;
    player.name = trimmed;
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId });
  }

  /**
   * El host elige manualmente quién es el Curador, en vez de que siempre
   * sea el primero en entrar. Solo tiene efecto en el lobby, antes de
   * iniciar la partida.
   */
  setAsymRole(requesterId, targetPlayerId) {
    if (this.phase !== 'lobby') {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Solo se puede cambiar el rol antes de iniciar la partida' });
      return;
    }
    if (requesterId !== this.hostId) {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Solo el host puede asignar quién es el Curador' });
      return;
    }
    const target = this.players.get(targetPlayerId);
    if (!target) {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Ese jugador ya no está en la sala' });
      return;
    }
    for (const [id, p] of this.players) {
      const wasAsym = p.isAsymRole;
      p.isAsymRole = id === targetPlayerId;
      if (p.isAsymRole && !wasAsym && !p.characterId) {
        p.characterId = Characters.DEFAULT_CHARACTER_ID;
      }
    }
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId });
  }

  /**
   * El Curador elige entre los personajes disponibles (mismas stats,
   * solo cambia nombre/arma). Solo en el lobby.
   */
  selectCharacter(playerId, characterId) {
    if (this.phase !== 'lobby') {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Solo se puede elegir personaje antes de iniciar la partida' });
      return;
    }
    const player = this.players.get(playerId);
    if (!player || !player.isAsymRole) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Solo el Curador elige personaje' });
      return;
    }
    const validIds = Characters.getUnlockedCharacterIds();
    if (!validIds.includes(characterId)) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Ese personaje no existe' });
      return;
    }
    player.characterId = characterId;
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId });
  }

  /**
   * El host elige qué mapa se juega la próxima partida — solo en el
   * lobby. mapId debe existir en el catálogo de GameMap (incluye los
   * mapas guardados desde el editor visual).
   */
  setMap(requesterId, mapId) {
    if (this.phase !== 'lobby') {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Solo se puede cambiar el mapa antes de iniciar la partida' });
      return;
    }
    if (requesterId !== this.hostId) {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Solo el host puede elegir el mapa' });
      return;
    }
    if (!GameMap.MAPS[mapId]) {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Ese mapa no existe' });
      return;
    }
    this.mapId = mapId;
    this.broadcast(MessageType.ROOM_UPDATE, {
      players: this.getPlayersSummary(),
      hostId: this.hostId,
      mapId: this.mapId,
    });
  }

  handleChatMessage(playerId, rawText) {
    const player = this.players.get(playerId);
    if (!player) return;
    if (typeof rawText !== 'string' || rawText.trim().length === 0) return;

    const now = Date.now();
    const lastSent = this.lastChatAt.get(playerId) || 0;
    if (now - lastSent < CHAT_RATE_LIMIT_MS) return;
    this.lastChatAt.set(playerId, now);

    const text = rawText.slice(0, CHAT_MAX_LENGTH);
    const entry = { playerId, playerName: player.name, text, timestamp: now };

    this.chatHistory.push(entry);
    if (this.chatHistory.length > CHAT_HISTORY_LIMIT) this.chatHistory.shift();

    this.broadcast(MessageType.CHAT_BROADCAST, entry);
  }

  broadcast(type, payload, excludePlayerId = null) {
    const msg = encode(type, payload);
    for (const [id, p] of this.players) {
      if (id === excludePlayerId) continue;
      if (p.ws.readyState === 1) p.ws.send(msg);
    }
  }

  sendTo(playerId, type, payload) {
    const p = this.players.get(playerId);
    if (p && p.ws.readyState === 1) p.ws.send(encode(type, payload));
  }

  getCurrentArea() {
    return this.phase === 'action' ? GameMap.MATCH_AREA : GameMap.LOBBY_AREA;
  }

  startTickLoop() {
    if (this.tickInterval) return;
    this.lastTickAt = Date.now();
    this.tickInterval = setInterval(() => this.tick(), TICK_RATE_MS);
  }

  stopTickLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  initGameState() {
    this.gameState.patients = {};
    this.gameState.curatorReleaseAt = Date.now() + CURATOR_SPAWN_DELAY_MS;
    this.gameState.gameOver = false;
    this.gameState.frozen = false;

    const patientIds = [];
    for (const [playerId, player] of this.players) {
      if (!player.isAsymRole) patientIds.push(playerId);
    }
    const patientSpawns = GameMap.getPatientSpawnPositions(patientIds.length, GameMap.MATCH_AREA);
    const curatorSpawn = GameMap.getCuratorSpawn();

    let patientIndex = 0;
    for (const [playerId, player] of this.players) {
      const entity = this.gameState.entities[playerId];
      if (!entity) continue;

      if (player.isAsymRole) {
        entity.x = curatorSpawn.x;
        entity.z = curatorSpawn.z;
      } else {
        const spawn = patientSpawns[patientIndex];
        entity.x = spawn.x;
        entity.z = spawn.z;
        patientIndex++;
        this.gameState.patients[playerId] = { hp: PATIENT_HP_START, status: 'alive', maxHp: PATIENT_HP_MAX };
      }
      entity.y = GROUND_Y;
      entity.velocityY = 0;
      entity.onGround = true;
      entity.skillCooldowns = {};
      entity.stunnedUntil = 0;
      entity.noDrainUntil = 0;
      entity.cureBoostUntil = 0;
      entity.cureBoostFactor = 1;
      entity.flojeraMax = FLOJERA_MAX + (player.isAsymRole ? CURATOR_FLOJERA_BONUS : 0);
      entity.flojera = entity.flojeraMax;
      entity.sprintFactor = SPRINT_CARD_MULTIPLIER;
      entity.flojeraLockedUntil = 0;
      entity.cardCooldowns = {};
      entity.sprintUntil = 0;
      entity.exacerbacionLevel = 0;
      entity.exacerbacionUntil = 0;
      entity.perezaUntil = 0;
      entity.ragdollUntil = 0;
      entity.channel = null;
      entity.perezaLevel = 0;
      entity.acetilUntil = 0;
      entity.regenBlockedUntil = 0;
      entity.fatigueUntil = 0;
      entity.allyBoostUntil = 0;
      entity.allyBoostLevel = 0;
      entity.slowedLevel = 1;
      entity.endlagUntil = 0;
      entity.slowedUntil = 0;
      entity.doubleSelfDamage = false;
      entity.hand = player.isAsymRole ? [] : Cards.dealSlots();
      entity.draftEndsAt = player.isAsymRole ? 0 : Date.now() + Cards.DRAFT_DURATION_MS;
    }

    this.gameState.patientsInitialCount = patientIds.length;
    this.gameState.timeRemainingMs = GAME_DURATION_MS;
    this.gameState.gameOver = false;

    this.lastRelocateAt = Date.now();
    this.gameState.zones = [];
    this.gameState.curator = { hp: CURATOR_HP_START, max: CURATOR_HP_MAX };
    this.gameState.selfDamageObjectPositions = {};
    const selfDamagePositions = GameMap.resolveSelfDamagePositions(this.mapId, GameMap.MATCH_AREA);
    for (const obj of selfDamagePositions) {
      this.gameState.selfDamageObjectPositions[obj.id] = { x: obj.x, y: GROUND_Y, z: obj.z };
    }
  }

  tick() {
    this.tickCount++;
    const now = Date.now();
    const elapsedMs = now - (this.lastTickAt || now);
    const dt = Math.min(elapsedMs, 100) / 1000;
    this.lastTickAt = now;

    if (this.phase === 'action' && !this.gameState.gameOver) {
      this.gameState.timeRemainingMs = Math.max(0, this.gameState.timeRemainingMs - elapsedMs);
      if (this.gameState.timeRemainingMs === 0) this.endGame('timeout');
    }

    this.stepPhysics(dt);
    this.tickPereza(now, dt);
    if (this.phase === 'action' && !this.gameState.gameOver) {
      this.botThink(now);
      this.autoPickExpiredDrafts(now);
      this.tickZones(now, dt);
      if (now - this.lastRelocateAt >= RELOCATE_INTERVAL_MS) this.relocateSelfDamageObjects(now);
    }

    const publicEntities = {};
    for (const [entityPlayerId, entity] of Object.entries(this.gameState.entities)) {
      publicEntities[entityPlayerId] = { x: entity.x, y: entity.y, z: entity.z };
    }
    const zones = this.gameState.zones.map((z) => ({ id: z.id, kind: z.kind, cardId: z.cardId || null, x: z.x, z: z.z, radius: z.radius, armed: z.armedAt === undefined || now >= z.armedAt }));

    for (const [playerId, player] of this.players) {
      if (player.isBot || player.ws.readyState !== 1) continue;
      const own = this.gameState.entities[playerId];
      const flojera = {};
      for (const [entityPlayerId, entity] of Object.entries(this.gameState.entities)) {
        flojera[entityPlayerId] = { stunned: entity.stunnedUntil > now, ragdoll: entity.ragdollUntil > now };
      }
      if (own) {
        flojera[playerId] = {
          value: own.flojera,
          max: own.flojeraMax,
          locked: own.flojeraLockedUntil > now,
          sprinting: own.sprintUntil > now,
          stunned: own.stunnedUntil > now,
          statuses: this.buildStatuses(own, now),
          channel: own.channel ? { elapsed: now - own.channel.startedAt, total: CHANNEL_MS, beatMs: CHANNEL_BEAT_MS, beats: CHANNEL_BEATS, hits: own.channel.hits, scored: Object.keys(own.channel.scored).map(Number), slot: own.channel.slot } : null,
          cooldowns: { cards: own.cardCooldowns, skills: own.skillCooldowns },
        };
      }
      this.sendTo(playerId, MessageType.STATE_SNAPSHOT, {
        flojera,
        tick: this.tickCount,
        entities: publicEntities,
        timeRemainingMs: this.gameState.timeRemainingMs,
        patients: this.visiblePatients(playerId),
        selfDamageObjects: this.gameState.selfDamageObjectPositions,
        curator: player.isAsymRole ? this.gameState.curator : null,
        spawnMs: player.isAsymRole ? Math.max(0, (this.gameState.curatorReleaseAt || 0) - now) : 0,
        zones,
      });
    }
  }

  visiblePatients(playerId) {
    const player = this.players.get(playerId);
    if (player && player.isAsymRole) return this.gameState.patients;
    const own = this.gameState.patients[playerId];
    return own ? { [playerId]: own } : {};
  }

  tickPereza(now, dt) {
    for (const entity of Object.values(this.gameState.entities)) {
      if (entity.perezaUntil <= now) continue;
      const extra = dt * 1000 * PEREZA_SPEED_PER_LEVEL * (entity.perezaLevel || 1);
      for (const key of Object.keys(entity.cardCooldowns)) if (entity.cardCooldowns[key] > now) entity.cardCooldowns[key] -= extra;
      for (const key of Object.keys(entity.skillCooldowns)) if (entity.skillCooldowns[key] > now) entity.skillCooldowns[key] -= extra;
    }
  }

  buildStatuses(entity, now) {
    const list = [];
    const add = (id, level, until) => { if (until > now) list.push({ id, level, ms: until - now }); };
    if (entity.exacerbacionLevel) add('exacerbacion', entity.exacerbacionLevel, entity.exacerbacionUntil);
    add('pereza', entity.perezaLevel || 1, entity.perezaUntil);
    add('acetilcolina', 1, entity.acetilUntil);
    if (entity.acetilUntil <= now) add('fatiga', 1, entity.fatigueUntil);
    add('impulso', entity.allyBoostLevel || 1, entity.allyBoostUntil);
    if (entity.acetilUntil > now || entity.regenBlockedUntil > now) add('ayuno', 1, Math.max(entity.acetilUntil, entity.regenBlockedUntil));
    add('endlag', 1, entity.endlagUntil);
    add('ragdoll', 1, entity.ragdollUntil);
    if (entity.endlagUntil <= now) add('aturdido', 1, entity.stunnedUntil);
    add('ralentizado', entity.slowedLevel || 1, entity.slowedUntil);
    return list;
  }

  stepPhysics(dt) {
    if (this.gameState.frozen) return;
    const area = this.getCurrentArea();
    const collisionObjects =
      this.phase === 'action' ? GameMap.resolveCollisionObjects(this.mapId, GameMap.MATCH_AREA) : [];
    const platforms =
      this.phase === 'action' ? GameMap.resolvePlatforms(this.mapId, GameMap.MATCH_AREA) : [];

    const now = Date.now();
    const allyCounts = {};
    for (const [sourceId, source] of Object.entries(this.gameState.entities)) {
      if (source.acetilUntil <= now) continue;
      for (const [otherId, patient] of Object.entries(this.gameState.patients)) {
        const other = this.gameState.entities[otherId];
        if (otherId === sourceId || patient.status !== 'alive' || !other) continue;
        if (distanceBetween(source, other) <= ACETIL_ALLY_RADIUS) allyCounts[otherId] = (allyCounts[otherId] || 0) + 1;
      }
    }
    for (const [entityPlayerId, entity] of Object.entries(this.gameState.entities)) {
      const { input } = entity;
      const inAction = this.phase === 'action';
      const resolved = this.gameState.patients[entityPlayerId] && this.gameState.patients[entityPlayerId].status !== 'alive';
      const heldAtSpawn = this.players.get(entityPlayerId)?.isAsymRole && inAction && now < (this.gameState.curatorReleaseAt || 0);
      if (entity.channel && entity.channel.endsAt <= now) entity.channel = null;
      const stunned = entity.stunnedUntil > now || entity.ragdollUntil > now || Boolean(resolved) || Boolean(heldAtSpawn);
      const isMoving = !stunned && (input.moveX !== 0 || input.moveZ !== 0);
      const sprinting = entity.sprintUntil > now;
      const locked = entity.flojeraLockedUntil > now;
      const wantsSlow = !sprinting && (Boolean(input.slow) || (inAction && locked));

      let speedMultiplier = FAST_MULTIPLIER;
      if (sprinting) {
        speedMultiplier = FAST_MULTIPLIER * (entity.sprintFactor || SPRINT_CARD_MULTIPLIER);
      } else if (wantsSlow) {
        speedMultiplier = FLOJERA_SLOW_MULTIPLIER;
      }
      if (entity.slowedUntil > now) speedMultiplier *= SLOW_BY_LEVEL[Math.min(3, entity.slowedLevel || 1)];
      if (entity.channel) speedMultiplier *= CHANNEL_SLOW;
      if (entity.acetilUntil <= now && entity.fatigueUntil > now) speedMultiplier *= ACETIL_FATIGUE_FACTOR;
      if (allyCounts[entityPlayerId]) {
        entity.allyBoostUntil = now + 2000;
        entity.allyBoostLevel = Math.min(ALLY_BOOST_MAX_LEVEL, allyCounts[entityPlayerId]);
      }
      if (entity.allyBoostUntil > now) speedMultiplier *= 1 + ACETIL_ALLY_STEP * (entity.allyBoostLevel || 1);
      if (stunned) speedMultiplier = 0;

      if (inAction && entity.acetilUntil > now) {
        if (isMoving) {
          const before = entity.flojera;
          entity.flojera = Math.max(0, entity.flojera - FLOJERA_DRAIN_PER_SEC * dt);
          if (entity.flojera <= 0) {
            entity.flojeraLockedUntil = now + FLOJERA_EXHAUST_LOCKOUT_MS;
            if (before > 0) this.endlag(entityPlayerId, entity, now);
          }
        }
      } else if (inAction) {
        if (sprinting || wantsSlow || !isMoving) {
          if (!sprinting && entity.regenBlockedUntil <= now) {
            entity.flojera = Math.min(entity.flojeraMax, entity.flojera + FLOJERA_REGEN_PER_SEC * dt);
          }
        } else if (entity.noDrainUntil <= now) {
          const before = entity.flojera;
          entity.flojera = Math.max(0, entity.flojera - FLOJERA_DRAIN_PER_SEC * dt);
          if (entity.flojera <= 0) {
            entity.flojeraLockedUntil = now + FLOJERA_EXHAUST_LOCKOUT_MS;
            if (before > 0) this.endlag(entityPlayerId, entity, now);
          }
        }
      }

      const prevX = entity.x;
      const prevZ = entity.z;
      const nextX = entity.x + input.moveX * MOVE_SPEED * speedMultiplier * dt;
      const nextZ = entity.z + input.moveZ * MOVE_SPEED * speedMultiplier * dt;
      if (!blockedAt(platforms, nextX, nextZ, entity.y) || blockedAt(platforms, prevX, prevZ, entity.y)) {
        entity.x = nextX;
        entity.z = nextZ;
      } else if (!blockedAt(platforms, nextX, prevZ, entity.y)) {
        entity.x = nextX;
      } else if (!blockedAt(platforms, prevX, nextZ, entity.y)) {
        entity.z = nextZ;
      }

      for (const obj of collisionObjects) {
        if (entity.y >= obj.height) continue;
        const reach = obj.radius + PLAYER_HALF;
        const dx = entity.x - obj.x;
        const dz = entity.z - obj.z;
        const overX = reach - Math.abs(dx);
        const overZ = reach - Math.abs(dz);
        if (overX <= 0 || overZ <= 0) continue;
        if (overX < overZ) entity.x = obj.x + (dx < 0 ? -reach : reach);
        else entity.z = obj.z + (dz < 0 ? -reach : reach);
      }

      entity.x = Math.max(-area.halfSize, Math.min(area.halfSize, entity.x));
      entity.z = Math.max(-area.halfSize, Math.min(area.halfSize, entity.z));

      if (input.jump && entity.onGround && !stunned) {
        entity.velocityY = JUMP_VELOCITY;
        entity.onGround = false;
        entity.peakY = entity.y;
      }
      let ground = groundAt(platforms, entity.x, entity.z, entity.y);
      if (entity.onGround && entity.y > ground && entity.y - ground <= STEP_DOWN) entity.y = ground;
      if (entity.onGround && entity.y - ground > STEP_DOWN) {
        entity.onGround = false;
        entity.peakY = entity.y;
      }
      if (entity.onGround) {
        entity.velocityY = 0;
        entity.y = Math.max(entity.y, ground);
      } else {
        entity.velocityY += GRAVITY * dt;
        entity.y += entity.velocityY * dt;
        entity.peakY = Math.max(entity.peakY || entity.y, entity.y);
        ground = groundAt(platforms, entity.x, entity.z, entity.y - entity.velocityY * dt);
        if (entity.y <= ground) {
          const fall = (entity.peakY || ground) - ground;
          entity.y = ground;
          entity.velocityY = 0;
          entity.onGround = true;
          const fallingPlayer = this.players.get(entityPlayerId);
          if (fallingPlayer && !fallingPlayer.isAsymRole && fall > FALL_ENDLAG_MIN && inAction) {
            this.endlag(entityPlayerId, entity, now, FALL_ENDLAG_MS);
          }
        }
      }
    }
  }

  applyPlayerInput(playerId, input) {
    const entity = this.gameState.entities[playerId];
    if (!entity) return;
    entity.input.moveX = clampUnit(input.moveX);
    entity.input.moveZ = clampUnit(input.moveZ);
    entity.input.jump = Boolean(input.jump);
    entity.input.slow = Boolean(input.slow);
    const len = Math.hypot(entity.input.moveX, entity.input.moveZ);
    if (len > 0) {
      entity.faceX = entity.input.moveX / len;
      entity.faceZ = entity.input.moveZ / len;
    }
  }

  ragdoll(playerId, entity, ms, now) {
    entity.ragdollUntil = Math.max(entity.ragdollUntil || 0, now + ms);
  }

  channelBeat(playerId, entity, now) {
    const ch = entity.channel;
    const index = Math.round((now - ch.startedAt) / CHANNEL_BEAT_MS);
    if (index < 1 || index > CHANNEL_BEATS || ch.scored[index]) return;
    if (Math.abs(now - (ch.startedAt + index * CHANNEL_BEAT_MS)) > CHANNEL_TOLERANCE_MS) return;
    ch.scored[index] = true;
    ch.hits += 1;
    const allies = this.alliesNear(playerId, entity, 8);
    const targets = allies.length ? allies : [playerId];
    for (const id of targets) {
      const target = this.gameState.entities[id];
      if (!target) continue;
      target.perezaUntil = Math.min(now + 8000, Math.max(target.perezaUntil, now) + CHANNEL_HIT_PEREZA_MS);
      target.perezaLevel = allies.length ? 1 : 2;
    }
  }

  applyCuratorPulse(playerId, skillIndex) {
    if (this.gameState.gameOver || this.gameState.frozen) return;

    const curador = this.players.get(playerId);
    if (!curador || !curador.isAsymRole) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Solo el Curador puede usar habilidades' });
      return;
    }

    const curadorEntity = this.gameState.entities[playerId];
    if (!curadorEntity) return;

    const now = Date.now();
    if (now < (this.gameState.curatorReleaseAt || 0)) return;
    if (curadorEntity.stunnedUntil > now) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Estás en Diligencia' });
      return;
    }

    const skills = Characters.getCharacter(curador.characterId).skills;
    const index = skillIndex === 'melee' ? 'melee' : Number.isInteger(skillIndex) ? skillIndex : 0;
    const skill = index === 'melee' ? Characters.GENERIC_MELEE : skills[index];
    if (!skill) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Esa habilidad no existe' });
      return;
    }

    const cooldownUntil = curadorEntity.skillCooldowns[index] || 0;
    if (cooldownUntil > now) {
      this.sendTo(playerId, MessageType.ERROR, {
        message: `${skill.name} en recarga (${Math.ceil((cooldownUntil - now) / 1000)}s)`,
      });
      return;
    }
    curadorEntity.skillCooldowns[index] = now + skill.cooldownMs;

    const affectedPlayerIds = [];
    let healedAny = false;

    if (skill.type === 'boost') {
      curadorEntity.cureBoostUntil = now + skill.durationMs;
      curadorEntity.cureBoostFactor = skill.factor;
      if (skill.selfHeal) this.adjustCuratorHp(skill.selfHeal);
    } else if (skill.type === 'melee_stun') {
      let nearestId = null;
      let nearestDist = skill.radius;
      for (const [targetPlayerId, patient] of Object.entries(this.gameState.patients)) {
        if (patient.status !== 'alive') continue;
        const targetEntity = this.gameState.entities[targetPlayerId];
        if (!targetEntity) continue;
        const dist = distanceBetween(curadorEntity, targetEntity);
        if (dist <= nearestDist) {
          nearestDist = dist;
          nearestId = targetPlayerId;
        }
      }
      if (nearestId) {
        this.gameState.entities[nearestId].stunnedUntil = now + skill.durationMs;
        affectedPlayerIds.push(nearestId);
      }
    } else {
      for (const [targetPlayerId, patient] of Object.entries(this.gameState.patients)) {
        if (patient.status !== 'alive') continue;
        const targetEntity = this.gameState.entities[targetPlayerId];
        if (!targetEntity) continue;
        const dist = distanceBetween(curadorEntity, targetEntity);
        if (dist > skill.radius) continue;

        if (skill.type === 'pulse') {
          patient.hp = Math.min(patient.maxHp, patient.hp + this.scaleCure(targetEntity, skill.cureAmount, now));
          if (patient.hp >= patient.maxHp) {
            patient.status = 'eliminated';
            this.onPatientFullyCured();
          }
          healedAny = true;
        } else if (skill.type === 'stun') {
          targetEntity.stunnedUntil = now + skill.durationMs;
        } else if (skill.type === 'pull') {
          const flat = euclid(curadorEntity, targetEntity);
          const travel = Math.min(skill.strength, Math.max(0, flat - 1));
          if (flat > 0) {
            targetEntity.x += ((curadorEntity.x - targetEntity.x) / flat) * travel;
            targetEntity.z += ((curadorEntity.z - targetEntity.z) / flat) * travel;
          }
        } else if (skill.type === 'purge') {
          targetEntity.sprintUntil = 0;
          targetEntity.exacerbacionLevel = 0;
          targetEntity.noDrainUntil = 0;
          targetEntity.slowedUntil = 0;
          targetEntity.doubleSelfDamage = false;
          targetEntity.flojera = Math.max(0, targetEntity.flojera - skill.flojeraDrain);
        }
        affectedPlayerIds.push(targetPlayerId);
      }
    }

    if (skill.type !== 'boost' && affectedPlayerIds.length === 0) this.endlag(playerId, curadorEntity, now);

    if (skill.type === 'pulse' && skill.selfHeal) this.adjustCuratorHp(skill.selfHeal * affectedPlayerIds.length);

    const pulseResult = {
      playerId,
      skillIndex: index,
      skillId: skill.id,
      skillName: skill.name,
      skillType: skill.type,
      radius: skill.radius || 0,
      cooldownUntil: curadorEntity.skillCooldowns[index],
      healedPlayerIds: healedAny ? affectedPlayerIds : [],
      affectedPlayerIds,
    };
    const onlyFor = (ids, viewerId) => (this.players.get(viewerId)?.isAsymRole ? ids : ids.filter((id) => id === viewerId));
    for (const targetId of this.players.keys()) {
      this.sendTo(targetId, MessageType.CURATOR_PULSE_RESULT, {
        ...pulseResult,
        healedPlayerIds: onlyFor(pulseResult.healedPlayerIds, targetId),
        affectedPlayerIds: onlyFor(pulseResult.affectedPlayerIds, targetId),
        patients: this.visiblePatients(targetId),
      });
    }
    if (healedAny) this.checkGameEndConditions();
  }

  stun(playerId, entity, ms, now, hpLoss = 0) {
    entity.stunnedUntil = Math.max(entity.stunnedUntil, now + ms);
    const player = this.players.get(playerId);
    if (player && player.isAsymRole && hpLoss > 0) this.adjustCuratorHp(-hpLoss);
  }

  adjustCuratorHp(delta) {
    const curator = this.gameState.curator;
    if (!curator || this.gameState.gameOver) return;
    curator.hp = Math.max(0, Math.min(curator.max, curator.hp + delta));
    if (curator.hp <= 0) this.endGame('curator_depleted', true);
    else if (curator.hp >= curator.max) this.endGame('curator_overhealed', true);
  }

  damagePatient(playerId, amount, floor = 0) {
    const patient = this.gameState.patients[playerId];
    if (!patient || patient.status !== 'alive') return false;
    const target = Math.max(floor, patient.hp - amount);
    if (target >= patient.hp) return false;
    patient.hp = target;
    if (patient.hp <= PATIENT_HP_MIN) {
      patient.hp = PATIENT_HP_MIN;
      patient.status = 'self_won';
    }
    return true;
  }

  healPatient(playerId, amount) {
    const patient = this.gameState.patients[playerId];
    if (!patient || patient.status !== 'alive') return false;
    patient.hp = Math.min(patient.maxHp, patient.hp + amount);
    if (patient.hp >= patient.maxHp) {
      patient.status = 'eliminated';
      this.onPatientFullyCured();
    }
    return true;
  }

  addZone(zone) {
    this.gameState.zones.push({ id: `z${this.zoneCounter = (this.zoneCounter || 0) + 1}`, ...zone });
  }

  tickZones(now, dt) {
    let statusChanged = false;
    const remaining = [];
    for (const zone of this.gameState.zones) {
      if (now >= zone.until) {
        if (zone.onExpire) zone.onExpire(zone);
        continue;
      }
      remaining.push(zone);

      if (zone.kind === 'rimac' || zone.kind === 'puddle') {
        for (const [playerId, patient] of Object.entries(this.gameState.patients)) {
          if (patient.status !== 'alive') continue;
          const entity = this.gameState.entities[playerId];
          if (!entity || distanceBetween(entity, zone) > zone.radius) continue;
          const before = patient.status;
          if (zone.kind === 'rimac') this.damagePatient(playerId, zone.perSecond * dt);
          else this.healPatient(playerId, zone.perSecond * dt);
          if (patient.status !== before) statusChanged = true;
        }
        if (zone.kind === 'puddle') {
          for (const [playerId, player] of this.players) {
            if (!player.isAsymRole) continue;
            const entity = this.gameState.entities[playerId];
            if (entity && distanceBetween(entity, zone) <= zone.radius) {
              this.adjustCuratorHp(PUDDLE_CURATOR_PER_SEC * dt);
            }
          }
        }
        if (zone.kind === 'rimac') {
          for (const [playerId, player] of this.players) {
            if (!player.isAsymRole) continue;
            const entity = this.gameState.entities[playerId];
            if (!entity || distanceBetween(entity, zone) > zone.radius) continue;
            entity.flojera = Math.max(0, entity.flojera - RIMAC_CURADOR_FLOJERA_DRAIN_PER_SEC * dt);
            entity.slowedUntil = Math.max(entity.slowedUntil, now + 300);
            entity.slowedLevel = Math.max(entity.slowedUntil > now + 300 ? entity.slowedLevel : 0, 1);
          }
        }
      } else if (zone.kind === 'trap' && now >= zone.armedAt) {
        let triggered = false;
        for (const [playerId, player] of this.players) {
          const entity = this.gameState.entities[playerId];
          if (!entity || distanceBetween(entity, zone) > TRAP_RADIUS) continue;
          if (!player.isAsymRole) continue;
          this.ragdoll(playerId, entity, zone.stunMs, now);
          if (zone.hpLoss) this.adjustCuratorHp(-zone.hpLoss);
          triggered = true;
        }
        if (triggered) remaining.pop();
      }
    }
    this.gameState.zones = remaining;
    if (statusChanged) this.checkGameEndConditions();
  }

  relocateSelfDamageObjects(now) {
    this.lastRelocateAt = now;
    const allPositions = GameMap.resolveSelfDamagePositions(this.mapId, GameMap.MATCH_AREA);
    for (const objectId of Object.keys(this.gameState.selfDamageObjectPositions)) {
      const others = allPositions.filter((p) => p.id !== objectId);
      if (others.length === 0) continue;
      const newPos = others[Math.floor(Math.random() * others.length)];
      this.gameState.selfDamageObjectPositions[objectId] = { x: newPos.x, y: GROUND_Y, z: newPos.z };
    }
  }

  scaleCure(targetEntity, amount, now) {
    if (targetEntity.exacerbacionUntil <= now || !targetEntity.exacerbacionLevel) return amount;
    return amount * Math.max(0.4, 1 - EXACERBACION_STEP * targetEntity.exacerbacionLevel);
  }

  advanceDraft(playerId, entity) {
    const next = entity.hand.findIndex((slot) => !slot.chosen);
    if (next === -1) {
      entity.draftEndsAt = 0;
      return;
    }
    if (entity.hand[next].options.length === 0) {
      const chosenIds = entity.hand.filter((slot) => slot.chosen).map((slot) => slot.chosen);
      entity.hand[next] = Cards.dealSlot(chosenIds);
      entity.draftEndsAt = Date.now() + Cards.DRAFT_DURATION_MS;
      this.sendCardOffer(playerId, entity);
    }
  }

  sendCardOffer(playerId, entity) {
    this.sendTo(playerId, MessageType.CARD_OFFER, {
      slots: entity.hand.map((slot) => ({
        options: slot.options.map((id) => Cards.getCard(id)),
        chosen: slot.chosen ? Cards.getCard(slot.chosen) : null,
      })),
      draftEndsAt: entity.draftEndsAt,
    });
  }

  autoPickExpiredDrafts(now) {
    for (const [playerId, entity] of Object.entries(this.gameState.entities)) {
      if (!entity.hand.length || entity.draftEndsAt === 0 || now < entity.draftEndsAt) continue;
      for (let guard = 0; guard < entity.hand.length; guard++) {
        const index = entity.hand.findIndex((slot) => !slot.chosen);
        if (index === -1) break;
        if (entity.hand[index].options.length === 0) {
          const chosenIds = entity.hand.filter((slot) => slot.chosen).map((slot) => slot.chosen);
          entity.hand[index] = Cards.dealSlot(chosenIds);
        }
        this.finalizeChoice(playerId, index, entity.hand[index].options[0]);
      }
      entity.draftEndsAt = 0;
    }
  }

  finalizeChoice(playerId, slotIndex, cardId) {
    const entity = this.gameState.entities[playerId];
    const slot = entity.hand[slotIndex];
    slot.chosen = cardId;
    const chosenCard = Cards.getCard(cardId);
    if (chosenCard && chosenCard.maxMode !== 'use') this.applyMaxCosts(playerId, entity, chosenCard, false);
    this.sendTo(playerId, MessageType.CARD_CHOSEN, { slot: slotIndex, card: Cards.getCard(cardId) });
  }

  chooseCard(playerId, slotIndex, cardId) {
    if (this.phase !== 'action' || this.gameState.gameOver) return;
    const player = this.players.get(playerId);
    const entity = this.gameState.entities[playerId];
    if (!player || player.isAsymRole || !entity) return;
    if (this.gameState.patients[playerId]?.status !== 'alive') return;

    const slot = entity.hand[slotIndex];
    if (!slot) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Ese slot no existe' });
      return;
    }
    if (slot.chosen) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Ya elegiste carta para ese slot' });
      return;
    }
    if (!slot.options.includes(cardId)) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Esa carta no está entre tus opciones' });
      return;
    }
    this.finalizeChoice(playerId, slotIndex, cardId);
    this.advanceDraft(playerId, entity);
  }

  useCard(playerId, slotIndex) {
    if (this.gameState.gameOver || this.gameState.frozen) return;

    const player = this.players.get(playerId);
    if (!player || player.isAsymRole) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Solo los Pacientes pueden usar cartas' });
      return;
    }
    if (this.gameState.patients[playerId]?.status !== 'alive') return;

    const entity = this.gameState.entities[playerId];
    if (!entity) return;
    if (entity.stunnedUntil > Date.now()) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Estás en Diligencia' });
      return;
    }

    const slot = entity.hand[slotIndex];
    if (!slot || !slot.chosen) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Primero elige una carta para ese slot' });
      return;
    }

    const card = Cards.getCard(slot.chosen);
    const now = Date.now();
    if (entity.channel && entity.channel.cardId === card.id && entity.channel.endsAt > now) {
      this.channelBeat(playerId, entity, now);
      return;
    }
    const cooldownUntil = entity.cardCooldowns[slotIndex] || 0;
    if (cooldownUntil > now) {
      this.sendTo(playerId, MessageType.ERROR, {
        message: `${card.displayName} en recarga (${Math.ceil((cooldownUntil - now) / 1000)}s)`,
      });
      return;
    }

    entity.cardCooldowns[slotIndex] = now + card.cooldownMs;
    this.applyCardEffect(playerId, entity, card, now);

    this.broadcast(MessageType.CARD_RESULT, {
      playerId,
      slot: slotIndex,
      cardId: card.id,
      cooldownUntil: entity.cardCooldowns[slotIndex],
    });
  }

  alliesNear(playerId, entity, radius) {
    const result = [];
    for (const [otherId, patient] of Object.entries(this.gameState.patients)) {
      if (otherId === playerId || patient.status !== 'alive') continue;
      const other = this.gameState.entities[otherId];
      if (other && distanceBetween(entity, other) <= radius) result.push(otherId);
    }
    return result;
  }

  curatorInRange(entity, radius) {
    for (const [otherId, other] of this.players) {
      if (!other.isAsymRole) continue;
      const otherEntity = this.gameState.entities[otherId];
      if (otherEntity && distanceBetween(entity, otherEntity) <= radius) return true;
    }
    return false;
  }

  gainExacerbacion(entity, now) {
    const active = entity.exacerbacionUntil > now;
    entity.exacerbacionLevel = Math.min(EXACERBACION_MAX_LEVEL, (active ? entity.exacerbacionLevel : 0) + 1);
    entity.exacerbacionUntil = now + EXACERBACION_MS;
  }

  endlag(playerId, entity, now, fixedMs) {
    const missing = 1 - Math.max(0, Math.min(1, entity.flojera / entity.flojeraMax));
    const ms = fixedMs || ENDLAG_MIN_MS + (ENDLAG_MAX_MS - ENDLAG_MIN_MS) * missing;
    if (ms <= 0) return;
    const start = Math.max(now, entity.endlagUntil || 0);
    this.stun(playerId, entity, start + ms - now, now, 0);
    entity.endlagUntil = start + ms;
  }

  applyCardEffect(playerId, entity, card, now) {
    const hit = card.hitRadius ? this.curatorInRange(entity, card.hitRadius) : null;
    switch (card.id) {
      case 'rodar': {
        const inputLength = Math.hypot(entity.input.moveX, entity.input.moveZ);
        {
          const area = this.getCurrentArea();
          const dirX = inputLength > 0 ? entity.input.moveX / inputLength : entity.faceX;
          const dirZ = inputLength > 0 ? entity.input.moveZ / inputLength : entity.faceZ;
          const startX = entity.x;
          const startZ = entity.z;
          const clamp = (v) => Math.max(-area.halfSize, Math.min(area.halfSize, v));
          entity.x = clamp(startX + dirX * ROLL_DISTANCE);
          entity.z = clamp(startZ + dirZ * ROLL_DISTANCE);
          for (const [otherId, other] of this.players) {
            if (!other.isAsymRole) continue;
            const otherEntity = this.gameState.entities[otherId];
            if (!otherEntity) continue;
            const along = (otherEntity.x - startX) * dirX + (otherEntity.z - startZ) * dirZ;
            if (along < 0 || along > ROLL_DISTANCE + 1) continue;
            const sideways = Math.abs((otherEntity.x - startX) * dirZ - (otherEntity.z - startZ) * dirX);
            if (sideways > ROLL_HIT_WIDTH) continue;
            otherEntity.x = clamp(otherEntity.x + dirX * ROLL_PUSH);
            otherEntity.z = clamp(otherEntity.z + dirZ * ROLL_PUSH);
          }
        }
        entity.flojera = Math.max(0, entity.flojera - ROLL_FLOJERA_COST);
        if (entity.flojera === 0) {
          entity.flojeraLockedUntil = now + FLOJERA_EXHAUST_LOCKOUT_MS;
          this.ragdoll(playerId, entity, ENDLAG_MAX_MS, now);
        }
        break;
      }
      case 'chicharron':
        this.damagePatient(playerId, CHICHARRON_DAMAGE, CHICHARRON_FLOOR);
        this.checkGameEndConditions();
        break;
      case 'goyslop':
        this.damagePatient(playerId, GOYSLOP_DAMAGE, GOYSLOP_FLOOR);
        this.checkGameEndConditions();
        break;
      case 'cascara_platano':
      case 'platano_podrido':
        this.addZone({
          kind: 'trap',
          x: entity.x,
          z: entity.z,
          radius: TRAP_RADIUS,
          ownerId: playerId,
          armedAt: now + TRAP_ARM_MS,
          until: now + TRAP_LIFETIME_MS,
          cardId: card.id,
          stunMs: card.id === 'platano_podrido' ? 3500 : 2000,
          hpLoss: card.curatorHpLoss || 0,
        });
        break;
      case 'agua_rimac':
        this.addZone({ kind: 'rimac', cardId: card.id, x: entity.x, z: entity.z, radius: 4, perSecond: 4, ownerId: playerId, until: now + 5000 });
        break;
      case 'rimac_sin_filtrar': {
        const { x, z } = entity;
        this.addZone({
          kind: 'rimac',
          cardId: card.id,
          x,
          z,
          radius: 6,
          perSecond: 8,
          ownerId: playerId,
          until: now + 6000,
          onExpire: () => {
            this.addZone({ kind: 'puddle', cardId: card.id, x, z, radius: 6, perSecond: 7, ownerId: playerId, until: Date.now() + 8000 });
          },
        });
        break;
      }
      case 'receta_falsa':
        for (const [otherId, other] of this.players) {
          if (!other.isAsymRole) continue;
          const otherEntity = this.gameState.entities[otherId];
          if (!otherEntity || distanceBetween(entity, otherEntity) > 8) continue;
          for (const key of [0, 1, 2, 3, 'melee']) {
            otherEntity.skillCooldowns[key] = Math.max(otherEntity.skillCooldowns[key] || 0, now) + 6000;
            otherEntity.perezaUntil = now + 8000;
          }
        }
        break;
      case 'acetilcolina':
        entity.sprintUntil = now + card.durationMs;
        entity.sprintFactor = ACETIL_FACTOR;
        entity.acetilUntil = now + card.durationMs;
        entity.regenBlockedUntil = entity.acetilUntil + ACETIL_REGEN_DELAY_MS;
        entity.fatigueUntil = entity.acetilUntil + ACETIL_FATIGUE_MS;
        break;
      case 'grito_animo': {
        const slotIndex = entity.hand.findIndex((s) => s && s.chosen === card.id);
        entity.channel = { cardId: card.id, slot: slotIndex, startedAt: now, endsAt: now + CHANNEL_MS, hits: 0, scored: {} };
        break;
      }
      case 'racion_compartida': {
        const allies = this.alliesNear(playerId, entity, 8);
        if (allies.length) {
          for (const id of allies) this.damagePatient(id, 15, 20);
        } else {
          entity.doubleSelfDamage = true;
        }
        this.checkGameEndConditions();
        break;
      }
      case 'sobredosis':
        for (const [otherId, other] of this.players) {
          if (!other.isAsymRole) continue;
          const otherEntity = this.gameState.entities[otherId];
          if (!otherEntity || distanceBetween(entity, otherEntity) > 8) continue;
          for (const key of [0, 1, 2, 3, 'melee']) {
            otherEntity.skillCooldowns[key] = Math.max(otherEntity.skillCooldowns[key] || 0, now) + 10000;
            otherEntity.perezaUntil = now + 12000;
          }
        }
        break;
      case 'tajo_carmesi':
        for (const [otherId, other] of this.players) {
          if (!other.isAsymRole) continue;
          const otherEntity = this.gameState.entities[otherId];
          if (otherEntity && distanceBetween(entity, otherEntity) <= 3.5) {
            this.ragdoll(otherId, otherEntity, card.durationMs, now);
            this.adjustCuratorHp(-(card.curatorHpLoss || 0));
          }
        }
        break;
      case 'red_mist':
        for (const [otherId, other] of this.players) {
          if (!other.isAsymRole) continue;
          const otherEntity = this.gameState.entities[otherId];
          if (otherEntity && distanceBetween(entity, otherEntity) <= RED_MIST_RADIUS) {
            this.stun(otherId, otherEntity, card.durationMs, now, card.curatorHpLoss || 0);
          }
        }
        this.healPatient(playerId, RED_MIST_HEAL);
        this.checkGameEndConditions();
        break;
      case 'tropiezo':
        for (const [otherId, other] of this.players) {
          if (!other.isAsymRole) continue;
          const otherEntity = this.gameState.entities[otherId];
          if (otherEntity && distanceBetween(entity, otherEntity) <= TROPIEZO_RADIUS) {
            this.stun(otherId, otherEntity, card.durationMs, now, card.curatorHpLoss || 0);
          }
        }
        break;
      case 'regalo_envenenado':
        for (const [otherId, other] of this.players) {
          if (!other.isAsymRole) continue;
          const otherEntity = this.gameState.entities[otherId];
          if (otherEntity && distanceBetween(entity, otherEntity) <= REGALO_RADIUS) this.adjustCuratorHp(REGALO_HP);
        }
        break;
      default:
        break;
    }
    if (hit === true) {
      this.gainExacerbacion(entity, now);
      if (card.id === 'receta_falsa') entity.doubleSelfDamage = true;
      if (card.id === 'tajo_carmesi') entity.flojera = Math.min(entity.flojeraMax, entity.flojera + 25);
    } else if (hit === false) {
      this.endlag(playerId, entity, now);
    }
    if (card.maxMode === 'use') this.applyMaxCosts(playerId, entity, card, true);
  }

  applyMaxCosts(playerId, entity, card, perUse) {
    const patient = this.gameState.patients[playerId];
    if (patient && patient.status === 'alive' && (card.maxHpSet || card.maxHpDelta)) {
      const target = card.maxHpSet || patient.maxHp + card.maxHpDelta;
      if (perUse) {
        patient.maxHp = Math.max(1, target);
        if (patient.hp >= patient.maxHp) {
          patient.hp = patient.maxHp;
          patient.status = 'eliminated';
          this.onPatientFullyCured();
        }
      } else {
        patient.maxHp = Math.max(MAX_HP_MINIMUM, target);
        patient.hp = Math.min(patient.hp, patient.maxHp - 1);
      }
    }
    if (card.flojeraMaxDelta) {
      entity.flojeraMax = Math.max(FLOJERA_MAX_MINIMUM, entity.flojeraMax + card.flojeraMaxDelta);
      entity.flojera = Math.min(entity.flojera, entity.flojeraMax);
    }
  }

  /**
   * M1 del Curador. Reconstruido tras la pérdida del sandbox — esta es
   * la "hitbox de interacción" que se pidió: no es una zona de colisión
   * continua, es una validación de distancia puntual en el instante del
   * click (confirmado explícitamente que es lo que se quería, no algo
   * nuevo tipo trigger automático).
   */
  applyCure(curadorId, targetPlayerId) {
    if (this.gameState.gameOver) return;

    const curador = this.players.get(curadorId);
    if (!curador || !curador.isAsymRole) {
      this.sendTo(curadorId, MessageType.ERROR, { message: 'Solo el Curador puede curar' });
      return;
    }
    if (Date.now() < (this.gameState.curatorReleaseAt || 0)) return;
    const baseEntity = this.gameState.entities[curadorId];
    if (!baseEntity || baseEntity.baseCooldownUntil > Date.now() || baseEntity.stunnedUntil > Date.now()) return;

    const patient = this.gameState.patients[targetPlayerId];
    if (!patient || patient.status !== 'alive') {
      this.sendTo(curadorId, MessageType.ERROR, { message: 'Ese Paciente no es un objetivo válido' });
      return;
    }

    const curadorEntity = this.gameState.entities[curadorId];
    const targetEntity = this.gameState.entities[targetPlayerId];
    if (!curadorEntity || !targetEntity) {
      this.sendTo(curadorId, MessageType.ERROR, { message: 'No se pudo validar la posición' });
      return;
    }
    if (distanceBetween(curadorEntity, targetEntity) > INTERACTION_RADIUS) {
      this.sendTo(curadorId, MessageType.ERROR, { message: 'Estás demasiado lejos para curar a ese Paciente' });
      return;
    }

    curadorEntity.baseCooldownUntil = Date.now() + (Characters.getCharacter(curador.characterId).baseCooldownMs || 900);
    const boost = curadorEntity.cureBoostUntil > Date.now() ? curadorEntity.cureBoostFactor : 1;
    patient.hp = Math.min(patient.maxHp, patient.hp + this.scaleCure(targetEntity, CURE_AMOUNT * boost, Date.now()));
    if (patient.hp >= patient.maxHp) {
      patient.status = 'eliminated';
      this.onPatientFullyCured();
    }

    this.broadcast(MessageType.CURE_RESULT, {
      targetPlayerId,
      newHp: patient.hp,
      status: patient.status,
    });
    this.checkGameEndConditions();
  }

  /**
   * Uso de objeto de auto-daño. Misma naturaleza de hitbox que applyCure:
   * validación de distancia puntual contra la posición REAL del objeto
   * (this.gameState.selfDamageObjectPositions, que sí cambia — a
   * diferencia de los objetos de colisión, que son estáticos).
   */
  applySelfDamage(playerId, objectId) {
    if (this.gameState.gameOver) return;

    const patient = this.gameState.patients[playerId];
    if (!patient || patient.status !== 'alive') {
      this.sendTo(playerId, MessageType.ERROR, { message: 'No eres un Paciente activo' });
      return;
    }

    const objectPos = this.gameState.selfDamageObjectPositions[objectId];
    if (!objectPos) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Ese objeto no existe' });
      return;
    }

    const playerEntity = this.gameState.entities[playerId];
    if (!playerEntity) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'No se pudo validar la posición' });
      return;
    }
    if (distanceBetween(playerEntity, objectPos) > INTERACTION_RADIUS) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Estás demasiado lejos de ese objeto' });
      return;
    }

    const damageFactor = playerEntity.doubleSelfDamage ? GOLPE_DOBLE_FACTOR : 1;
    playerEntity.doubleSelfDamage = false;
    patient.hp = Math.max(PATIENT_HP_MIN, patient.hp - SELF_DAMAGE_AMOUNT * damageFactor);
    if (patient.hp <= PATIENT_HP_MIN) patient.status = 'self_won';

    const allPositions = GameMap.resolveSelfDamagePositions(this.mapId, GameMap.MATCH_AREA);
    const otherPositions = allPositions.filter((p) => p.id !== objectId);
    const newPos = otherPositions[Math.floor(Math.random() * otherPositions.length)];
    this.gameState.selfDamageObjectPositions[objectId] = { x: newPos.x, y: GROUND_Y, z: newPos.z };

    this.broadcast(MessageType.SELF_DAMAGE_RESULT, {
      playerId,
      newHp: patient.hp,
      status: patient.status,
      objectId,
      objectNewPosition: this.gameState.selfDamageObjectPositions[objectId],
    });
    this.checkGameEndConditions();
  }

  onPatientFullyCured() {
    const patientsAlive = Object.values(this.gameState.patients).filter((p) => p.status === 'alive').length;
    const factor = (1 - (10 * patientsAlive) / 100) / 3;
    const rawBonusMs = this.gameState.patientsInitialCount * factor * 60 * 1000;
    const clampedBonusMs = Math.max(0, Math.min(TIME_BONUS_MAX_MS, rawBonusMs));
    this.gameState.timeRemainingMs += clampedBonusMs;
    if (patientsAlive === 1) this.gameState.timeRemainingMs = LMS_TIMER_RESET_MS;
  }

  checkGameEndConditions() {
    if (this.gameState.gameOver) return;
    const allResolved = Object.values(this.gameState.patients).every((p) => p.status !== 'alive');
    if (allResolved) this.endGame('all_resolved');
  }

  endGame(reason, curatorLost = false) {
    if (this.gameState.gameOver) return;
    this.gameState.gameOver = true;
    // OJO: antes esto dejaba this.phase === 'action' para siempre (el tick
    // loop se paraba pero la fase nunca volvía a 'lobby'), así que la sala
    // quedaba trabada: nadie podía iniciar una partida nueva, y con
    // gameOver=true pero phase='action' el estado era incoherente. No
    // tocamos this.phase acá — seguimos en 'action' mientras se muestra el
    // resultado — pero dejamos de simular movimiento/física mientras se ve
    // el cartel de fin de partida, ya que seguir corriendo por el mapa
    // después de terminado no tenía sentido.
    this.gameState.frozen = true;

    const patientResults = {};
    let eliminatedCount = 0;
    for (const [playerId, patient] of Object.entries(this.gameState.patients)) {
      let finalStatus = patient.status;
      if (finalStatus === 'alive') {
        finalStatus = patient.hp > patient.maxHp / 2 ? 'eliminated' : 'timeout';
      }
      patientResults[playerId] = { hp: patient.hp, status: finalStatus };
      if (finalStatus === 'eliminated') eliminatedCount++;
    }

    const majorityThreshold = Math.ceil(this.gameState.patientsInitialCount / 2);
    const curatorWon = curatorLost ? false : eliminatedCount >= majorityThreshold;

    this.broadcast(MessageType.GAME_OVER, { curatorWon, patientResults, reason });
  }

  /**
   * Vuelve la sala al lobby después de terminar una partida (o si el host
   * quiere cancelarla a mitad de camino). Esto es lo que faltaba: antes no
   * existía ningún camino de vuelta a 'lobby' una vez que se entraba a
   * 'action', por eso "se podía seguir jugando" después del game over —
   * en realidad era que la sala nunca salía de ese estado.
   */
  returnToLobby(requesterId) {
    if (requesterId !== this.hostId) {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Solo el host puede volver al lobby' });
      return;
    }
    this.gameState.gameOver = false;
    this.gameState.frozen = false;
    this.gameState.patients = {};
    this.gameState.zones = [];
    this.switchPhase('lobby', 'vuelta al lobby');
  }

  switchPhase(newPhase, reason = '') {
    this.phase = newPhase;
    if (newPhase === 'action') {
      this.initGameState();
      for (const [playerId, player] of this.players) {
        if (player.isAsymRole) continue;
        const entity = this.gameState.entities[playerId];
        if (!entity) continue;
        this.sendCardOffer(playerId, entity);
      }
    }
    this.broadcast(MessageType.PHASE_CHANGE, { newPhase, reason });
  }
}

module.exports = { Room, MAX_PLAYERS };
