const { MessageType, encode } = require('./protocol');
const GameMap = require('./GameMap');
const Characters = require('./Characters');

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
      input: { moveX: 0, moveZ: 0, jump: false },
    };

    this.startTickLoop();
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    delete this.gameState.entities[playerId];
    delete this.gameState.patients[playerId];
    this.lastChatAt.delete(playerId);
    if (this.hostId === playerId) {
      const next = this.players.keys().next();
      this.hostId = next.done ? null : next.value;
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
        character: characterData
          ? { displayName: characterData.displayName, weaponName: characterData.weaponName }
          : null,
      };
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
        this.gameState.patients[playerId] = { hp: PATIENT_HP_START, status: 'alive' };
      }
      entity.y = GROUND_Y;
      entity.velocityY = 0;
      entity.onGround = true;
    }

    this.gameState.patientsInitialCount = patientIds.length;
    this.gameState.timeRemainingMs = GAME_DURATION_MS;
    this.gameState.gameOver = false;

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

    this.broadcast(MessageType.STATE_SNAPSHOT, {
      tick: this.tickCount,
      entities: this.gameState.entities,
      timeRemainingMs: this.gameState.timeRemainingMs,
      patients: this.gameState.patients,
      selfDamageObjects: this.gameState.selfDamageObjectPositions,
    });
  }

  stepPhysics(dt) {
    const area = this.getCurrentArea();
    const collisionObjects =
      this.phase === 'action' ? GameMap.resolveCollisionObjects(this.mapId, GameMap.MATCH_AREA) : [];

    for (const entity of Object.values(this.gameState.entities)) {
      const { input } = entity;

      entity.x += input.moveX * MOVE_SPEED * dt;
      entity.z += input.moveZ * MOVE_SPEED * dt;

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

      if (input.jump && entity.onGround) {
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
      this.sendTo(curadorId, MessageType.ERROR, { message: 'Estás muy lejos para curar a ese Paciente' });
      return;
    }

    patient.hp = Math.min(PATIENT_HP_MAX, patient.hp + CURE_AMOUNT);
    if (patient.hp >= PATIENT_HP_MAX) {
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
      this.sendTo(playerId, MessageType.ERROR, { message: 'No sos un Paciente activo' });
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
      this.sendTo(playerId, MessageType.ERROR, { message: 'Estás muy lejos de ese objeto' });
      return;
    }

    patient.hp = Math.max(PATIENT_HP_MIN, patient.hp - SELF_DAMAGE_AMOUNT);
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
    this.stopTickLoop();

    const patientResults = {};
    let eliminatedCount = 0;
    for (const [playerId, patient] of Object.entries(this.gameState.patients)) {
      let finalStatus = patient.status;
      if (finalStatus === 'alive') {
        finalStatus = patient.hp > PATIENT_HP_MAX / 2 ? 'eliminated' : 'timeout';
      }
      patientResults[playerId] = { hp: patient.hp, status: finalStatus };
      if (finalStatus === 'eliminated') eliminatedCount++;
    }

    const majorityThreshold = Math.ceil(this.gameState.patientsInitialCount / 2);
    const curatorWon = eliminatedCount >= majorityThreshold;

    this.broadcast(MessageType.GAME_OVER, { curatorWon, patientResults, reason });
  }

  switchPhase(newPhase, reason = '') {
    this.phase = newPhase;
    if (newPhase === 'action') {
      this.initGameState();
    }
    this.broadcast(MessageType.PHASE_CHANGE, { newPhase, reason });
  }
}

module.exports = { Room, MAX_PLAYERS };
