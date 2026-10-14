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
const JUMP_VELOCITY = 6;
const GRAVITY = -18;
const GROUND_Y = 0;
const PLAYER_COLLISION_RADIUS = 0.4;

// Radio de interacción para M1/auto-daño — esto es lo que se había
// perdido y se pidió reconstruir: validación de distancia puntual en el
// instante del click, no una zona de colisión continua.
const INTERACTION_RADIUS = 2.5;

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
const ROLL_DISTANCE = 4;
const SEGUNDO_ALIENTO_AMOUNT = 60;
const JERINGA_ROTA_CURE_FACTOR = 0.4;
const HUMO_RADIUS = 7;
const HUMO_SLOW_MULTIPLIER = 0.5;
const GOLPE_DOBLE_FACTOR = 2;
const TROPIEZO_RADIUS = 3;
const RELOCATE_INTERVAL_MS = 25000;
const CHICHARRON_DAMAGE = 25;
const CHICHARRON_FLOOR = 40;
const GOYSLOP_DAMAGE = 45;
const GOYSLOP_FLOOR = 15;
const GOYSLOP_MAX_HP_LOSS = 30;
const MAX_HP_MINIMUM = 60;
const RED_MIST_RADIUS = 6;
const RED_MIST_HEAL = 35;
const TRAP_RADIUS = 1.5;
const TRAP_ARM_MS = 800;
const TRAP_LIFETIME_MS = 30000;
const RIMAC_CURADOR_FLOJERA_DRAIN_PER_SEC = 18;

const FLOJERA_MAX = 100;
const FLOJERA_DRAIN_PER_SEC = 20;
const FLOJERA_REGEN_PER_SEC = 12;
const FLOJERA_SLOW_MULTIPLIER = 1;
const FLOJERA_EXHAUST_LOCKOUT_MS = 3000;

function clampUnit(value) {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return Math.max(-1, Math.min(1, n));
}

function distanceBetween(a, b) {
  const dx = a.x - b.x;
  const dy = (a.y || 0) - (b.y || 0);
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
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
    };
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
      flojeraLockedUntil: 0,
      hand: [],
      draftEndsAt: 0,
      cardCooldowns: {},
      sprintUntil: 0,
      cureReductionUntil: 0,
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
    if (this.isEmpty()) this.stopTickLoop();
  }

  getPlayersSummary() {
    return Array.from(this.players.entries()).map(([id, p]) => {
      const characterData = p.isAsymRole ? Characters.getCharacter(p.characterId) : null;
      return {
        id,
        name: p.name,
        isAsymRole: p.isAsymRole,
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
      entity.flojera = FLOJERA_MAX;
      entity.flojeraLockedUntil = 0;
      entity.cardCooldowns = {};
      entity.sprintUntil = 0;
      entity.cureReductionUntil = 0;
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
    if (this.phase === 'action' && !this.gameState.gameOver) {
      this.autoPickExpiredDrafts(now);
      this.tickZones(now, dt);
      if (now - this.lastRelocateAt >= RELOCATE_INTERVAL_MS) this.relocateSelfDamageObjects(now);
    }

    const flojeraByPlayerId = {};
    for (const [entityPlayerId, entity] of Object.entries(this.gameState.entities)) {
      flojeraByPlayerId[entityPlayerId] = {
        value: entity.flojera,
        max: FLOJERA_MAX,
        locked: entity.flojeraLockedUntil > now,
        sprinting: entity.sprintUntil > now,
        stunned: entity.stunnedUntil > now,
      };
    }

    this.broadcast(MessageType.STATE_SNAPSHOT, {
      flojera: flojeraByPlayerId,
      tick: this.tickCount,
      entities: this.gameState.entities,
      timeRemainingMs: this.gameState.timeRemainingMs,
      patients: this.gameState.patients,
      selfDamageObjects: this.gameState.selfDamageObjectPositions,
      zones: this.gameState.zones.map((z) => ({ id: z.id, kind: z.kind, x: z.x, z: z.z, radius: z.radius, armed: z.armedAt === undefined || now >= z.armedAt })),
    });
  }

  stepPhysics(dt) {
    if (this.gameState.frozen) return;
    const area = this.getCurrentArea();
    const collisionObjects =
      this.phase === 'action' ? GameMap.resolveCollisionObjects(this.mapId, GameMap.MATCH_AREA) : [];

    const now = Date.now();
    for (const [entityPlayerId, entity] of Object.entries(this.gameState.entities)) {
      const { input } = entity;
      const inAction = this.phase === 'action';
      const stunned = entity.stunnedUntil > now;
      const isMoving = !stunned && (input.moveX !== 0 || input.moveZ !== 0);
      const sprinting = entity.sprintUntil > now;
      const locked = entity.flojeraLockedUntil > now;
      const wantsSlow = !sprinting && (Boolean(input.slow) || (inAction && locked));

      let speedMultiplier = FAST_MULTIPLIER;
      if (sprinting) {
        speedMultiplier = FAST_MULTIPLIER * SPRINT_CARD_MULTIPLIER;
      } else if (wantsSlow) {
        speedMultiplier = FLOJERA_SLOW_MULTIPLIER;
      }
      if (entity.slowedUntil > now) speedMultiplier *= HUMO_SLOW_MULTIPLIER;
      if (stunned) speedMultiplier = 0;

      if (inAction) {
        if (sprinting || wantsSlow || !isMoving) {
          if (!sprinting) {
            entity.flojera = Math.min(FLOJERA_MAX, entity.flojera + FLOJERA_REGEN_PER_SEC * dt);
          }
        } else if (entity.noDrainUntil <= now) {
          entity.flojera = Math.max(0, entity.flojera - FLOJERA_DRAIN_PER_SEC * dt);
          if (entity.flojera <= 0) {
            entity.flojeraLockedUntil = now + FLOJERA_EXHAUST_LOCKOUT_MS;
          }
        }
      }

      entity.x += input.moveX * MOVE_SPEED * speedMultiplier * dt;
      entity.z += input.moveZ * MOVE_SPEED * speedMultiplier * dt;

      for (const obj of collisionObjects) {
        const dx = entity.x - obj.x;
        const dz = entity.z - obj.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = obj.radius + PLAYER_COLLISION_RADIUS;
        if (dist < minDist && dist > 0) {
          const pushRatio = minDist / dist;
          entity.x = obj.x + dx * pushRatio;
          entity.z = obj.z + dz * pushRatio;
        } else if (dist === 0) {
          entity.x = obj.x + minDist;
        }
      }

      entity.x = Math.max(-area.halfSize, Math.min(area.halfSize, entity.x));
      entity.z = Math.max(-area.halfSize, Math.min(area.halfSize, entity.z));

      if (input.jump && entity.onGround && !stunned) {
        entity.velocityY = JUMP_VELOCITY;
        entity.onGround = false;
      }
      entity.velocityY += GRAVITY * dt;
      entity.y += entity.velocityY * dt;
      if (entity.y <= GROUND_Y) {
        entity.y = GROUND_Y;
        entity.velocityY = 0;
        entity.onGround = true;
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
    if (curadorEntity.stunnedUntil > now) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Estás aturdido' });
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
          const travel = Math.min(skill.strength, Math.max(0, dist - 1));
          if (dist > 0) {
            targetEntity.x += ((curadorEntity.x - targetEntity.x) / dist) * travel;
            targetEntity.z += ((curadorEntity.z - targetEntity.z) / dist) * travel;
          }
        } else if (skill.type === 'purge') {
          targetEntity.sprintUntil = 0;
          targetEntity.cureReductionUntil = 0;
          targetEntity.noDrainUntil = 0;
          targetEntity.slowedUntil = 0;
          targetEntity.doubleSelfDamage = false;
          targetEntity.flojera = Math.max(0, targetEntity.flojera - skill.flojeraDrain);
        }
        affectedPlayerIds.push(targetPlayerId);
      }
    }

    this.broadcast(MessageType.CURATOR_PULSE_RESULT, {
      playerId,
      skillIndex: index,
      skillName: skill.name,
      skillType: skill.type,
      cooldownUntil: curadorEntity.skillCooldowns[index],
      healedPlayerIds: healedAny ? affectedPlayerIds : [],
      affectedPlayerIds,
      patients: this.gameState.patients,
    });
    if (healedAny) this.checkGameEndConditions();
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
        if (zone.kind === 'rimac') {
          for (const [playerId, player] of this.players) {
            if (!player.isAsymRole) continue;
            const entity = this.gameState.entities[playerId];
            if (!entity || distanceBetween(entity, zone) > zone.radius) continue;
            entity.flojera = Math.max(0, entity.flojera - RIMAC_CURADOR_FLOJERA_DRAIN_PER_SEC * dt);
            entity.slowedUntil = Math.max(entity.slowedUntil, now + 300);
          }
        }
      } else if (zone.kind === 'trap' && now >= zone.armedAt) {
        let triggered = false;
        for (const [playerId, player] of this.players) {
          const entity = this.gameState.entities[playerId];
          if (!entity || distanceBetween(entity, zone) > TRAP_RADIUS) continue;
          const isOwner = playerId === zone.ownerId;
          if (isOwner && !zone.hitsOwner) continue;
          if (!player.isAsymRole && !isOwner) continue;
          entity.stunnedUntil = now + zone.stunMs;
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
    return targetEntity.cureReductionUntil > now ? amount * JERINGA_ROTA_CURE_FACTOR : amount;
  }

  autoPickExpiredDrafts(now) {
    for (const [playerId, entity] of Object.entries(this.gameState.entities)) {
      if (!entity.hand.length || entity.draftEndsAt === 0 || now < entity.draftEndsAt) continue;
      entity.hand.forEach((slot, index) => {
        if (!slot.chosen) this.finalizeChoice(playerId, index, slot.options[0]);
      });
      entity.draftEndsAt = 0;
    }
  }

  finalizeChoice(playerId, slotIndex, cardId) {
    const entity = this.gameState.entities[playerId];
    const slot = entity.hand[slotIndex];
    slot.chosen = cardId;
    this.sendTo(playerId, MessageType.CARD_CHOSEN, { slot: slotIndex, card: Cards.getCard(cardId) });
  }

  chooseCard(playerId, slotIndex, cardId) {
    if (this.phase !== 'action' || this.gameState.gameOver) return;
    const player = this.players.get(playerId);
    const entity = this.gameState.entities[playerId];
    if (!player || player.isAsymRole || !entity) return;

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
    if (entity.hand.every((s) => s.chosen)) entity.draftEndsAt = 0;
  }

  useCard(playerId, slotIndex) {
    if (this.gameState.gameOver || this.gameState.frozen) return;

    const player = this.players.get(playerId);
    if (!player || player.isAsymRole) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Solo los Pacientes pueden usar cartas' });
      return;
    }

    const entity = this.gameState.entities[playerId];
    if (!entity) return;

    const slot = entity.hand[slotIndex];
    if (!slot || !slot.chosen) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Primero elige una carta para ese slot' });
      return;
    }

    const card = Cards.getCard(slot.chosen);
    const now = Date.now();
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

  applyCardEffect(playerId, entity, card, now) {
    switch (card.id) {
      case 'sprint_panico':
        entity.sprintUntil = now + card.durationMs;
        break;
      case 'segundo_aliento':
        entity.flojera = Math.min(FLOJERA_MAX, entity.flojera + SEGUNDO_ALIENTO_AMOUNT);
        entity.flojeraLockedUntil = 0;
        break;
      case 'rodar': {
        const length = Math.sqrt(entity.input.moveX ** 2 + entity.input.moveZ ** 2);
        if (length > 0) {
          const area = this.getCurrentArea();
          entity.x = Math.max(-area.halfSize, Math.min(area.halfSize, entity.x + (entity.input.moveX / length) * ROLL_DISTANCE));
          entity.z = Math.max(-area.halfSize, Math.min(area.halfSize, entity.z + (entity.input.moveZ / length) * ROLL_DISTANCE));
        }
        break;
      }
      case 'jeringa_rota':
        entity.cureReductionUntil = now + card.durationMs;
        break;
      case 'humo_yodo':
        for (const [otherId, other] of this.players) {
          if (!other.isAsymRole) continue;
          const otherEntity = this.gameState.entities[otherId];
          if (otherEntity && distanceBetween(entity, otherEntity) <= HUMO_RADIUS) {
            otherEntity.slowedUntil = now + card.durationMs;
          }
        }
        break;
      case 'chicharron':
        this.damagePatient(playerId, CHICHARRON_DAMAGE, CHICHARRON_FLOOR);
        this.checkGameEndConditions();
        break;
      case 'goyslop': {
        const patient = this.gameState.patients[playerId];
        if (patient) {
          patient.maxHp = Math.max(MAX_HP_MINIMUM, patient.maxHp - GOYSLOP_MAX_HP_LOSS);
          patient.hp = Math.min(patient.hp, patient.maxHp - 1);
        }
        this.damagePatient(playerId, GOYSLOP_DAMAGE, GOYSLOP_FLOOR);
        this.checkGameEndConditions();
        break;
      }
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
          hitsOwner: card.id === 'platano_podrido',
          stunMs: card.id === 'platano_podrido' ? 3500 : 2000,
        });
        break;
      case 'agua_rimac':
        this.addZone({ kind: 'rimac', x: entity.x, z: entity.z, radius: 4, perSecond: 4, ownerId: playerId, until: now + 5000 });
        break;
      case 'rimac_sin_filtrar': {
        const { x, z } = entity;
        this.addZone({
          kind: 'rimac',
          x,
          z,
          radius: 6,
          perSecond: 8,
          ownerId: playerId,
          until: now + 6000,
          onExpire: () => {
            this.addZone({ kind: 'puddle', x, z, radius: 6, perSecond: 7, ownerId: playerId, until: Date.now() + 8000 });
          },
        });
        break;
      }
      case 'red_mist':
        for (const [otherId, other] of this.players) {
          if (!other.isAsymRole) continue;
          const otherEntity = this.gameState.entities[otherId];
          if (otherEntity && distanceBetween(entity, otherEntity) <= RED_MIST_RADIUS) {
            otherEntity.stunnedUntil = now + card.durationMs;
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
            otherEntity.stunnedUntil = now + card.durationMs;
          }
        }
        break;
      case 'adrenalina':
        entity.noDrainUntil = now + card.durationMs;
        break;
      case 'golpe_doble':
        entity.doubleSelfDamage = true;
        break;
      default:
        break;
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

  endGame(reason) {
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
    const curatorWon = eliminatedCount >= majorityThreshold;

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
        this.sendTo(playerId, MessageType.CARD_OFFER, {
          slots: entity.hand.map((slot) => ({ options: slot.options.map((id) => Cards.getCard(id)) })),
          draftEndsAt: entity.draftEndsAt,
        });
      }
    }
    this.broadcast(MessageType.PHASE_CHANGE, { newPhase, reason });
  }
}

module.exports = { Room, MAX_PLAYERS };
