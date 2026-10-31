const { MessageType, encode } = require('./protocol');
const GameMap = require('./GameMap');
const Cosmetics = require('./Cosmetics');
const Characters = require('./Characters');
const Cards = require('./Cards');
const Roles = require('./Roles');
const CardEffects = require('./CardEffects');
const Hitbox = require('./Hitbox');
const { groundAt, blockedAt, distanceBetween, euclid, reachPoint, handBox, handHit } = Hitbox;
const {
  MAX_PLAYERS,
  TICK_RATE_MS,
  PATIENT_HP_START,
  PATIENT_HP_MAX,
  PATIENT_HP_MIN,
  CURE_AMOUNT,
  SELF_DAMAGE_AMOUNT,
  M1_REACH,
  M1_RADIUS,
  M1_WINDOW_MS,
  SD_MAX_DAMAGE,
  SD_BEATS,
  SD_HIT_DAMAGE,
  SD_PERFECT_BONUS,
  SD_TOLERANCE_MS,
  SD_FUMBLE_ENDLAG_MS,
  GAME_DURATION_MS,
  TIME_BONUS_MAX_MS,
  LMS_TIMER_RESET_MS,
  CHAT_MAX_LENGTH,
  CHAT_HISTORY_LIMIT,
  CHAT_RATE_LIMIT_MS,
  MOVE_SPEED,
  CURATOR_SPEED_BONUS,
  CURATOR_DRAIN_FACTOR,
  JUMP_VELOCITY,
  STEP_UP,
  DASH_STEP_UP,
  STEP_DOWN,
  FALL_ENDLAG_MIN,
  FALL_ENDLAG_MS,
  GRAVITY,
  LOBBY_GRAVITY_FACTOR,
  GROUND_Y,
  PLAYER_COLLISION_RADIUS,
  INTERACTION_RADIUS,
  FAST_MULTIPLIER,
  SPRINT_CARD_MULTIPLIER,
  ROLL_DISTANCE,
  TROPIEZO_RADIUS,
  RELOCATE_INTERVAL_MS,
  CURATOR_HP_START,
  CURATOR_HP_MAX,
  CHICHARRON_DAMAGE,
  CHICHARRON_FLOOR,
  GOYSLOP_DAMAGE,
  GOYSLOP_FLOOR,
  MAX_HP_MINIMUM,
  TRAP_RADIUS,
  TRAP_ARM_MS,
  TRAP_PEAK_LIFE,
  TRAP_LIFETIME_MS,
  RIMAC_CURADOR_FLOJERA_DRAIN_PER_SEC,
  ROLL_DASH_MS,
  ROLL_PUSH_SPEED,
  ROLL_PUSH_MS,
  ROLL_KNOCKBACK_SPEED,
  ROLL_KNOCKBACK_MS,
  ROLL_RAGDOLL_MS,
  CHANNEL_MS,
  CHANNEL_BEAT_MS,
  CHANNEL_BEATS,
  CHANNEL_TOLERANCE_MS,
  CHANNEL_SLOW,
  CHANNEL_HIT_PEREZA_MS,
  ROLL_HIT_WIDTH,
  ROLL_FLOJERA_COST,
  PEREZA_SPEED_PER_LEVEL,
  EXACERBACION_MAX_LEVEL,
  EXACERBACION_MS,
  EXACERBACION_STEP,
  ACETIL_FACTOR,
  ACETIL_ALLY_RADIUS,
  ACETIL_ALLY_STEP,
  ALLY_BOOST_MAX_LEVEL,
  SLOW_BY_LEVEL,
  ACETIL_REGEN_DELAY_MS,
  ACETIL_FATIGUE_MS,
  ACETIL_FATIGUE_FACTOR,
  CURATOR_SPAWN_DELAY_MS,
  ENDLAG_MIN_MS,
  CURATOR_FLOJERA_BONUS,
  ENDLAG_MAX_MS,
  ROLL_EXHAUST_RAGDOLL_MS,
  HIT_WINDOW_MS,
  GHOST_REVEAL_MS,
  GHOST_REVEAL_COOLDOWN_MS,
  GHOST_REVEAL_MAX_USES,
  FLOJERA_MAX,
  FLOJERA_MAX_MINIMUM,
  FLOJERA_DRAIN_PER_SEC,
  FLOJERA_REGEN_PER_SEC,
  REST_DELAY_MS,
  REST_REGEN_FACTOR,
  RUN_STREAK_RAMP,
  RUN_STREAK_MAX,
  EXHAUST_REGEN_BLOCK_MS,
  FLOJERA_SLOW_MULTIPLIER,
  RIMAC_PUDDLE_RATES,
  RIMAC_PUDDLE_CAP,
  RIMAC_DOT_PER_SEC,
  FLOJERA_EXHAUST_LOCKOUT_MS,
  PLAYER_HALF,
  PLAYER_HEIGHT,
  FOOTPRINT
} = require('./Constants');
const Status = require('./Status');

function ownHidden(playerId, player, publicEntities, room, now) {
  if (player.isAsymRole || now >= (room.gameState.curatorReleaseAt || 0)) return publicEntities;
  const out = { ...publicEntities };
  for (const [id, p] of room.players) {
    if (p.isAsymRole && out[id]) out[id] = { ...out[id], gone: true };
  }
  return out;
}
const RagdollBody = require('./RagdollBody');
const Pathfinding = require('./Pathfinding');

function clampUnit(value) {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return Math.max(-1, Math.min(1, n));
}

const DESGRACIA_AXES = {
  'Partida jugada': 'r', 'Sobreviviste': 'r', 'Tropezaste': 'r',
  'Golpe al Curador': 'i', 'Botellazo': 'i', 'Cáscara de plátano': 'i',
  'Cura': 'j', 'Auto-daño': 'j',
  'Escapaste': 'k', 'Victoria del Curador': 'k',
};

class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.hostId = null;
    this.phase = 'lobby';
    this.hitWindows = [];
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
      ghosts: {},
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

  navigation(curator = false) {
    if (!this.nav || this.nav.key !== this.mapId) {
      const area = GameMap.areaFor(this.mapId);
      const objects = GameMap.resolveCollisionObjects(this.mapId, area);
      const platforms = GameMap.resolvePlatforms(this.mapId, area);
      this.nav = {
        key: this.mapId,
        grid: Pathfinding.buildGrid(area.halfSize, objects, platforms),
        gridCur: Pathfinding.buildGrid(area.halfSize, objects, platforms.filter((p) => p.kind !== 'gate')),
      };
    }
    return curator ? this.nav.gridCur : this.nav.grid;
  }

  selfDamageCandidates() {
    const area = GameMap.areaFor(this.mapId);
    const all = GameMap.resolveSelfDamagePositions(this.mapId, area);
    const grid = this.navigation();
    if (!this.nav.seen) this.nav.seen = Pathfinding.reachableFrom(grid, GameMap.getCuratorSpawn(this.mapId, 0));
    const objects = GameMap.resolveCollisionObjects(this.mapId, area);
    const platforms = GameMap.resolvePlatforms(this.mapId, area);
    const ok = all
      .filter((p) => !objects.some((o) => o.height > 0.5 && Math.abs(p.x - o.x) <= o.radius + 0.6 && Math.abs(p.z - o.z) <= o.radius + 0.6))
      .filter((p) => Pathfinding.isReachableNear(grid, this.nav.seen, p.x, p.z, 2))
      .map((p) => {
        let top = Hitbox.baseAt(platforms, p.x, p.z);
        for (const pl of platforms) {
          const t = Hitbox.platformTop(pl, p.x, p.z);
          if (t !== null && t > top) top = t;
        }
        return { ...p, y: top };
      });
    return ok.length ? ok : all.map((p) => ({ ...p, y: GROUND_Y }));
  }

  botSteer(player, entity, goal, now, stopDist = 0.3) {
    const st = player.nav || (player.nav = { path: [], goal: null, repathAt: 0, lastX: entity.x, lastZ: entity.z, lastCheck: now, stuck: 0 });
    const grid = this.navigation(Boolean(player.isAsymRole));
    if (now - st.lastCheck > 700) {
      const moved = Math.hypot(entity.x - st.lastX, entity.z - st.lastZ);
      st.stuck = moved < 0.15 && (entity.input.moveX || entity.input.moveZ) ? st.stuck + 1 : 0;
      st.lastX = entity.x;
      st.lastZ = entity.z;
      st.lastCheck = now;
      if (st.stuck >= 1) st.repathAt = 0;
    }
    const goalMoved = !st.goal || Math.hypot(goal.x - st.goal.x, goal.z - st.goal.z) > 1.5;
    if (goalMoved || now >= st.repathAt || !st.path.length) {
      const jitter = st.stuck >= 2 ? { x: (Math.random() - 0.5) * 3, z: (Math.random() - 0.5) * 3 } : { x: 0, z: 0 };
      st.path = Pathfinding.findPath(grid, { x: entity.x + jitter.x, z: entity.z + jitter.z }, goal);
      st.goal = { x: goal.x, z: goal.z };
      st.repathAt = now + 500 + Math.random() * 300;
    }
    while (st.path.length > 1 && Math.hypot(st.path[0].x - entity.x, st.path[0].z - entity.z) < 0.6) st.path.shift();
    const wp = st.path[0] || goal;
    const dx = wp.x - entity.x;
    const dz = wp.z - entity.z;
    const len = Math.hypot(dx, dz);
    if (len < stopDist) {
      entity.input.moveX = 0;
      entity.input.moveZ = 0;
      return false;
    }
    entity.input.moveX = dx / len;
    entity.input.moveZ = dz / len;
    return true;
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
      const lead = target.entity.input ? 0.4 * MOVE_SPEED : 0;
      const goal = {
        x: target.entity.x + (target.entity.input?.moveX || 0) * lead,
        z: target.entity.z + (target.entity.input?.moveZ || 0) * lead,
      };
      this.botSteer(player, entity, goal, now, 0.15);
      entity.input.slow = entity.flojera < 12;
    } else {
      entity.input.moveX = 0;
      entity.input.moveZ = 0;
    }
    if (now > (player.nextBotAct || 0) && targetDist <= INTERACTION_RADIUS) {
      const fl = Math.hypot(target.entity.x - entity.x, target.entity.z - entity.z) || 1;
      entity.faceX = (target.entity.x - entity.x) / fl;
      entity.faceZ = (target.entity.z - entity.z) / fl;
      this.applyCure(botId);
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
      if (!entity.role && entity.hand[0] && !entity.hand[0].chosen && now > (player.nextBotPick || 0)) {
        const picks = ['none', 'loquito', 'hincha', 'cobrador'];
        this.selectRole(botId, picks[Math.floor(Math.random() * picks.length)]);
        player.nextBotPick = now + 800;
      }
      entity.hand.forEach((slot, index) => {
        if (!slot.chosen && slot.options.length && now > (player.nextBotPick || 0)) {
          const option = slot.options[Math.floor(Math.random() * slot.options.length)];
          this.chooseCard(botId, index, option);
          player.nextBotPick = now + 800;
        }
      });
      let curatorEntity = null;
      let curatorDist = Infinity;
      for (const [otherId, other] of this.players) {
        if (!other.isAsymRole) continue;
        const ce = this.gameState.entities[otherId];
        if (ce) { curatorEntity = ce; curatorDist = euclid(entity, ce); }
      }
      let best = null;
      let bestDist = Infinity;
      let bestScore = Infinity;
      for (const [objectId, pos] of Object.entries(this.gameState.selfDamageObjectPositions)) {
        const d = distanceBetween(entity, pos);
        const danger = curatorEntity ? Math.max(0, 14 - euclid(curatorEntity, pos)) : 0;
        const score = d + danger * 1.5;
        if (score < bestScore) { bestScore = score; bestDist = d; best = { objectId, pos }; }
      }
      if (!best) continue;
      if (bestDist <= INTERACTION_RADIUS - 0.3) {
        entity.input.moveX = 0;
        entity.input.moveZ = 0;
        const sg = entity.selfDmg;
        if (sg) {
          const t = now - sg.startedAt;
          if (sg.type === 'rhythm') {
            if (sg.beats.some((b, i) => !sg.scored.includes(i) && Math.abs(t - b) <= 60) && Math.random() < 0.92) this.applySelfDamage(botId, best.objectId);
          } else if (sg.type === 'needle') {
            if (Math.abs(this.needlePos(sg, now) - sg.zones[sg.stage]) <= 0.12 && Math.random() < 0.6) this.applySelfDamage(botId, best.objectId);
          } else if (now > (player.nextBotAct || 0)) {
            this.applySelfDamage(botId, best.objectId);
            player.nextBotAct = now + 200;
          }
        } else if (now > (player.nextBotAct || 0)) {
          this.applySelfDamage(botId, best.objectId);
          player.nextBotAct = now + 700;
        }
      } else {
        this.botSteer(player, entity, best.pos, now, 0.15);
        if (curatorEntity && curatorDist < 6) {
          const ax = entity.x - curatorEntity.x;
          const az = entity.z - curatorEntity.z;
          const al = Math.hypot(ax, az) || 1;
          const w = 1.4 * (1 - curatorDist / 6);
          const mx = entity.input.moveX + (ax / al) * w;
          const mz = entity.input.moveZ + (az / al) * w;
          const ml = Math.hypot(mx, mz) || 1;
          entity.input.moveX = mx / ml;
          entity.input.moveZ = mz / ml;
        }
        entity.input.slow = curatorDist > 9 && (entity.flojera < 20 || entity.flojeraLockedUntil > now);
      }
      if (curatorEntity && curatorDist < 3.2) {
        const rollSlot = entity.hand.findIndex((sl) => sl && sl.chosen === 'rodar');
        if (rollSlot >= 0) this.useCard(botId, rollSlot);
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
      rag: null,
      dashUntil: 0,
      dashVX: 0,
      dashVZ: 0,
      dashExhausted: false,
      kbUntil: 0,
      fx: {},
      kbX: 0,
      kbZ: 0,
      channel: null,
      selfDmg: null,
      faceX: 0,
      faceZ: 1,
      perezaLevel: 0,
      acetilUntil: 0,
      regenBlockedUntil: 0,
      fatigueUntil: 0,
      allyBoostUntil: 0,
      allyBoostLevel: 0,
      baseCooldownUntil: 0,
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
        cosmetics: p.cosmetics || {},
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
  setCosmetics(playerId, selection) {
    const player = this.players.get(playerId);
    if (!player) return;
    player.cosmetics = Cosmetics.sanitize(selection);
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId });
  }

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

    if (this.isGhost(playerId)) {
      const ghostEntry = { ...entry, ghost: true };
      for (const id of this.players.keys()) if (this.isGhost(id)) this.sendTo(id, MessageType.CHAT_BROADCAST, ghostEntry);
      return;
    }

    this.chatHistory.push(entry);
    if (this.chatHistory.length > CHAT_HISTORY_LIMIT) this.chatHistory.shift();

    this.broadcast(MessageType.CHAT_BROADCAST, entry);
  }

  isGhost(playerId) {
    if (this.phase !== 'action') return false;
    const patient = this.gameState.patients[playerId];
    return Boolean(patient) && patient.status !== 'alive';
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
    return this.phase === 'action' ? GameMap.areaFor(this.mapId) : GameMap.LOBBY_AREA;
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
    const patientSpawns = GameMap.getPatientSpawnPositions(patientIds.length, GameMap.areaFor(this.mapId), this.mapId);
    const curatorSpawn = GameMap.getCuratorSpawn(this.mapId);

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
      entity.dashUntil = 0;
      entity.kbUntil = 0;
      entity.channel = null;
      entity.selfDmg = null;
      entity.perezaLevel = 0;
      entity.acetilUntil = 0;
      entity.regenBlockedUntil = 0;
      entity.fatigueUntil = 0;
      entity.allyBoostUntil = 0;
      entity.allyBoostLevel = 0;
      entity.fx = {};
      entity.corpse = false;
      entity.gone = false;
      this.gameState.ghosts = {};
      entity.hand = player.isAsymRole ? [] : Cards.dealSlots();
      entity.role = null;
      entity.draftEndsAt = player.isAsymRole ? 0 : Date.now() + Cards.DRAFT_DURATION_MS;
    }

    this.gameState.patientsInitialCount = patientIds.length;
    this.gameState.timeRemainingMs = GAME_DURATION_MS;
    this.gameState.gameOver = false;
    this.gameState.desgracias = {};

    this.lastRelocateAt = Date.now();
    this.gameState.zones = [];
    this.gameState.curator = { hp: CURATOR_HP_START, max: CURATOR_HP_MAX };
    this.gameState.selfDamageObjectPositions = {};
    this.gameState.selfDamageTypes = {};
    const selfDamagePositions = this.selfDamageCandidates();
    this.fixedMinigames = {};
    for (const o of GameMap.resolveSelfDamagePositions(this.mapId, GameMap.areaFor(this.mapId))) if (o.minigame) this.fixedMinigames[o.id] = o.minigame;
    this.gameState.eventsFired = {};
    this.gameState.eventsView = [];
    for (const obj of selfDamagePositions) {
      this.gameState.selfDamageObjectPositions[obj.id] = { x: obj.x, y: obj.y, z: obj.z };
      this.gameState.selfDamageTypes[obj.id] = this.randomMinigame(obj.id);
    }
  }

  eventPhases() {
    const elapsed = GAME_DURATION_MS - this.gameState.timeRemainingMs;
    const out = [];
    for (const ev of GameMap.getEvents(this.mapId)) {
      let n = 0;
      if (ev.repeatSec > 0 && elapsed > ev.startSec * 1000 + ev.durSec * 1000) {
        n = Math.floor((elapsed - ev.startSec * 1000) / (ev.repeatSec * 1000));
      }
      let found = null;
      for (const k of [n, n + 1]) {
        if (k > 0 && ev.repeatSec <= 0) continue;
        const t0 = ev.startSec * 1000 + k * ev.repeatSec * 1000;
        if (elapsed >= t0 && elapsed < t0 + ev.durSec * 1000) found = { ev, phase: 'active', k, msLeft: t0 + ev.durSec * 1000 - elapsed };
        else if (elapsed < t0 && elapsed >= t0 - ev.warnSec * 1000) found = found || { ev, phase: 'warn', k, msTo: t0 - elapsed };
      }
      if (found) out.push(found);
    }
    return out;
  }

  tickEvents(now) {
    const phases = this.eventPhases();
    this.gameState.eventsView = phases;
    this.gameState.eventsFired = this.gameState.eventsFired || {};
    for (const p of phases) {
      if (p.phase !== 'active') continue;
      const key = `${p.ev.id}:${p.k}`;
      if (p.ev.kind === 'alarm') {
        for (const [id, patient] of Object.entries(this.gameState.patients)) {
          const ent = this.gameState.entities[id];
          if (patient.status === 'alive' && ent) Status.apply(ent, 'reveal', 400, now);
        }
      }
      if (p.ev.kind === 'shuffle' && !this.gameState.eventsFired[key]) {
        this.gameState.eventsFired[key] = true;
        this.relocateSelfDamageObjects(now);
        for (const id of Object.keys(this.gameState.selfDamageObjectPositions)) this.gameState.selfDamageTypes[id] = this.randomMinigame(id);
      }
    }
  }

  gatesState() {
    let mode = null;
    for (const p of this.gameState.eventsView || []) {
      if (p.phase === 'active' && p.ev.kind === 'gates') mode = p.ev.mode;
    }
    return mode;
  }

  eventsFor() {
    return (this.gameState.eventsView || []).map((p) => ({
      id: p.ev.id,
      kind: p.ev.kind,
      mode: p.ev.mode,
      phase: p.phase,
      ms: p.phase === 'warn' ? p.msTo : p.msLeft,
      x: p.ev.xFrac * GameMap.areaFor(this.mapId).halfSize,
      z: p.ev.zFrac * GameMap.areaFor(this.mapId).halfSize,
      r: p.ev.rFrac * GameMap.areaFor(this.mapId).halfSize,
      yMin: p.ev.yMin,
      yMax: p.ev.yMax,
    }));
  }

  randomMinigame(objectId) {
    const fixed = objectId && this.fixedMinigames && this.fixedMinigames[objectId];
    if (fixed) return fixed;
    const kinds = ['rhythm', 'needle', 'mash'];
    return kinds[Math.floor(Math.random() * kinds.length)];
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

    if (this.phase === 'action' && !this.gameState.gameOver) this.tickEvents(now);
    this.stepPhysics(dt);
    this.tickGhosts(dt);
    this.tickPereza(now, dt);
    if (this.phase === 'action' && !this.gameState.gameOver) {
      this.botThink(now);
      this.autoPickExpiredDrafts(now);
      this.tickZones(now, dt);
      if (now - this.lastRelocateAt >= RELOCATE_INTERVAL_MS) this.relocateSelfDamageObjects(now);
    }

    const publicEntities = {};
    for (const [entityPlayerId, entity] of Object.entries(this.gameState.entities)) {
      publicEntities[entityPlayerId] = {
        x: Math.round(entity.x * 100) / 100,
        y: Math.round(entity.y * 100) / 100,
        z: Math.round(entity.z * 100) / 100,
        corpse: Boolean(entity.corpse),
        gone: Boolean(entity.gone),
        rag: entity.rag ? { p: RagdollBody.serialize(entity.rag, entity) } : null,
      };
    }
    const ghostsFor = (viewerId) => {
      const out = {};
      for (const [ghostId, ghost] of Object.entries(this.gameState.ghosts)) {
        const own = ghostId === viewerId;
        const visible = ghost.visibleUntil > now;
        if (!own && !visible) continue;
        out[ghostId] = { x: Math.round(ghost.x * 100) / 100, y: Math.round(ghost.y * 100) / 100, z: Math.round(ghost.z * 100) / 100, faceX: Math.round(ghost.faceX * 100) / 100, faceZ: Math.round(ghost.faceZ * 100) / 100, own, visible, uses: ghost.uses, maxUses: GHOST_REVEAL_MAX_USES, visibleMs: visible ? ghost.visibleUntil - now : 0, cooldownMs: Math.max(0, ghost.cooldownUntil - now) };
      }
      return out;
    };
    const zones = this.gameState.zones.map((z) => ({ id: z.id, kind: z.kind, y: z.y || 0, level: z.level || 0, cardId: z.cardId || null, x: z.x, z: z.z, radius: z.radius, armed: z.armedAt === undefined || now >= z.armedAt }));

    for (const [playerId, player] of this.players) {
      if (player.isBot || player.ws.readyState !== 1) continue;
      const own = this.gameState.entities[playerId];
      const flojera = {};
      for (const [entityPlayerId, entity] of Object.entries(this.gameState.entities)) {
        flojera[entityPlayerId] = { stunned: Status.active(entity, 'stun', now), ragdoll: Status.active(entity, 'ragdoll', now) };
      }
      if (own) {
        flojera[playerId] = {
          value: own.flojera,
          max: own.flojeraMax,
          locked: own.flojeraLockedUntil > now,
          mode: own.acetilUntil > now ? (own.flojera <= 0 ? 'acetil_walk' : 'acetil') : (own.input.slow || own.flojeraLockedUntil > now ? 'walk' : 'run'),
          sprinting: own.sprintUntil > now,
          stunned: Status.active(own, 'stun', now),
          ragdoll: Status.active(own, 'ragdoll', now),
          statuses: this.buildStatuses(own, now),
          channel: own.channel ? { elapsed: now - own.channel.startedAt, total: CHANNEL_MS, beatMs: CHANNEL_BEAT_MS, beats: CHANNEL_BEATS, hits: own.channel.hits, scored: Object.keys(own.channel.scored).map(Number), slot: own.channel.slot } : null,
          sdGame: own.selfDmg ? this.sdView(own.selfDmg, now) : null,
          cooldowns: { cards: own.cardCooldowns, skills: own.skillCooldowns },
        };
      }
      this.sendTo(playerId, MessageType.STATE_SNAPSHOT, {
        flojera,
        tick: this.tickCount,
        entities: ownHidden(playerId, player, publicEntities, this, now),
        ghosts: ghostsFor(playerId),
        timeRemainingMs: this.gameState.timeRemainingMs,
        patients: this.visiblePatients(playerId),
        selfDamageObjects: this.gameState.selfDamageObjectPositions,
        selfDamageTypes: this.gameState.selfDamageTypes,
        curator: player.isAsymRole ? this.gameState.curator : null,
        events: this.eventsFor(),
        spawnMs: player.isAsymRole ? Math.max(0, (this.gameState.curatorReleaseAt || 0) - now) : 0,
        zones,
        revealed: player.isAsymRole ? Object.entries(this.gameState.entities).filter(([, e]) => Status.active(e, 'reveal', now)).map(([id]) => id) : [],
      });
    }
  }

  tickGhosts(dt) {
    const half = this.getCurrentArea().halfSize;
    const platforms = this.phase === 'action' ? GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId)) : [];
    for (const [ghostId, ghost] of Object.entries(this.gameState.ghosts)) {
      const owner = this.gameState.entities[ghostId];
      if (!owner) continue;
      const { moveX, moveZ } = owner.input;
      if (owner.input.jump && ghost.onGround) {
        ghost.vy = JUMP_VELOCITY;
        ghost.onGround = false;
      }
      let ground = groundAt(platforms, ghost.x, ghost.z, ghost.y, STEP_UP);
      if (ghost.onGround && ghost.y - ground > STEP_DOWN) ghost.onGround = false;
      if (ghost.onGround) {
        ghost.y = ground;
        ghost.vy = 0;
      } else {
        ghost.vy += GRAVITY * dt;
        ghost.y += ghost.vy * dt;
        ground = groundAt(platforms, ghost.x, ghost.z, ghost.y - ghost.vy * dt);
        if (ghost.y <= ground) {
          ghost.y = ground;
          ghost.vy = 0;
          ghost.onGround = true;
        }
      }
      const len = Math.hypot(moveX, moveZ);
      if (len > 0) {
        const speed = MOVE_SPEED * FAST_MULTIPLIER * Math.min(1, len);
        ghost.x = Math.max(-half, Math.min(half, ghost.x + (moveX / len) * speed * dt));
        ghost.z = Math.max(-half, Math.min(half, ghost.z + (moveZ / len) * speed * dt));
        ghost.faceX = moveX / len;
        ghost.faceZ = moveZ / len;
      }
    }
  }

  revealGhost(playerId) {
    const ghost = this.gameState.ghosts[playerId];
    const now = Date.now();
    if (!ghost || ghost.uses >= GHOST_REVEAL_MAX_USES || now < ghost.cooldownUntil) return;
    ghost.uses += 1;
    ghost.visibleUntil = now + GHOST_REVEAL_MS;
    ghost.cooldownUntil = now + GHOST_REVEAL_COOLDOWN_MS;
  }

  visiblePatients(playerId) {
    const player = this.players.get(playerId);
    if (player && player.isAsymRole) return this.gameState.patients;
    const own = this.gameState.patients[playerId];
    return own ? { [playerId]: own } : {};
  }

  tickPereza(now, dt) {
    for (const [entityId, entity] of Object.entries(this.gameState.entities)) {
      let extra = 0;
      if (entity.perezaUntil > now) extra += dt * 1000 * PEREZA_SPEED_PER_LEVEL * (entity.perezaLevel || 1);
      if (extra <= 0) continue;
      for (const key of Object.keys(entity.cardCooldowns)) if (entity.cardCooldowns[key] > now) entity.cardCooldowns[key] -= extra;
      for (const key of Object.keys(entity.skillCooldowns)) if (entity.skillCooldowns[key] > now) entity.skillCooldowns[key] -= extra;
    }
  }

  buildStatuses(entity, now) {
    const list = [];
    const add = (id, level, until) => { if (until > now) list.push({ id, level, ms: until - now }); };
    if (entity.exacerbacionLevel) add('exacerbacion', entity.exacerbacionLevel, entity.exacerbacionUntil);
    add('pereza', entity.perezaLevel || 1, entity.perezaUntil);
    if (entity.respiro) add('respiro', 1, now + 300);
    add('acetilcolina', 1, entity.acetilUntil);
    if (entity.acetilUntil <= now) add('fatiga', 1, entity.fatigueUntil);
    add('impulso', entity.allyBoostLevel || 1, entity.allyBoostUntil);
    if (entity.acetilUntil > now || entity.regenBlockedUntil > now) add('ayuno', 1, Math.max(entity.acetilUntil, entity.regenBlockedUntil));
    list.push(...Status.list(entity, now));
    return list;
  }

  stepPhysics(dt) {
    if (this.gameState.frozen) return;
    this.tickHitWindows(Date.now());
    const area = this.getCurrentArea();
    const collisionObjects =
      this.phase === 'action' ? GameMap.resolveCollisionObjects(this.mapId, GameMap.areaFor(this.mapId)) : [];
    const allPlatforms =
      this.phase === 'action' ? GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId)) : this.phase === 'lobby' ? GameMap.LOBBY_PLATFORMS : [];
    const gates = this.gatesState();
    const curPlatforms = gates === 'lock' ? allPlatforms : allPlatforms.filter((p) => p.kind !== 'gate');
    const patPlatforms = gates === 'open' ? curPlatforms : allPlatforms;

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
    const bodies = Object.entries(this.gameState.entities);
    for (const [, entity] of bodies) {
      entity.speedNow = entity.prevX === undefined ? 0 : Math.hypot(entity.x - entity.prevX, entity.z - entity.prevZ) / dt;
      entity.prevX = entity.x;
      entity.prevZ = entity.z;
    }
    for (const [rid, ragEntity] of bodies) {
      if (!Status.active(ragEntity, 'ragdoll', now) || !ragEntity.rag || ragEntity.corpse) continue;
      for (const [oid, other] of bodies) {
        if (oid === rid || Status.blocksMove(other, now) || other.speedNow < 0.5) continue;
        const patient = this.gameState.patients[oid];
        if (patient && patient.status !== 'alive') continue;
        if (distanceBetween(other, ragEntity) > 0.2) continue;
        const dx = ragEntity.x - other.x;
        const dz = ragEntity.z - other.z;
        const len = Math.hypot(dx, dz) || 1;
        const speed = Math.min(14, other.speedNow * 0.9 + 2);
        Status.push(ragEntity, dx / len, dz / len, speed, 300, now);
        RagdollBody.impulse(ragEntity.rag, dx / len, dz / len, speed * 0.5);
      }
    }
    for (const [entityPlayerId, entity] of Object.entries(this.gameState.entities)) {
      const { input } = entity;
      const platforms = this.players.get(entityPlayerId)?.isAsymRole ? curPlatforms : patPlatforms;
      const inAction = this.phase === 'action';
      const resolved = this.gameState.patients[entityPlayerId] && this.gameState.patients[entityPlayerId].status !== 'alive';
      const heldAtSpawn = this.players.get(entityPlayerId)?.isAsymRole && inAction && now < (this.gameState.curatorReleaseAt || 0);
      if (resolved && !entity.corpse) {
        entity.corpse = true;
        entity.gone = false;
        Status.apply(entity, 'ragdoll', 3600000, now);
        this.gameState.ghosts[entityPlayerId] = { x: entity.x, y: entity.y || 0, z: entity.z, faceX: entity.faceX || 0, faceZ: entity.faceZ || 1, visibleUntil: 0, uses: 0, cooldownUntil: 0, vy: 0, onGround: true };
      }
      if (entity.channel && entity.channel.endsAt <= now) entity.channel = null;
      if (entity.selfDmg) this.tickSelfDamage(entityPlayerId, entity, now);
      if (Status.active(entity, 'ragdoll', now)) {
        if (!entity.rag) entity.rag = RagdollBody.create(entity, now);
        if (!RagdollBody.step(entity.rag, entity, entity.y || 0, dt)) entity.rag = RagdollBody.create(entity, now);
      } else {
        entity.rag = null;
      }
      if (entity.acetilUntil > now) entity.acetilOn = true;
      else if (entity.acetilOn) {
        entity.acetilOn = false;
        if (entity.flojera <= 0) this.endlag(entityPlayerId, entity, now);
      }
      const rolling = entity.dashUntil > now;
      const stunned = Status.blocksMove(entity, now) || Boolean(resolved) || Boolean(heldAtSpawn);
      const isMoving = !stunned && (input.moveX !== 0 || input.moveZ !== 0);
      const sprinting = entity.sprintUntil > now;
      const locked = entity.flojeraLockedUntil > now;
      const wantsSlow = !sprinting && (Boolean(input.slow) || (inAction && locked));

      let speedMultiplier = FAST_MULTIPLIER;
      if (sprinting) {
        const walkingNow = entity.flojera <= 0 || Boolean(input.slow) || (inAction && locked);
        const base = walkingNow ? FLOJERA_SLOW_MULTIPLIER : FAST_MULTIPLIER;
        speedMultiplier = base * (entity.sprintFactor || SPRINT_CARD_MULTIPLIER);
      } else if (wantsSlow) {
        speedMultiplier = FLOJERA_SLOW_MULTIPLIER;
      }
      speedMultiplier *= Status.speedFactor(entity, now);
      if (entity.channel || entity.selfDmg) speedMultiplier *= CHANNEL_SLOW;
      if (entity.acetilUntil <= now && entity.fatigueUntil > now) speedMultiplier *= ACETIL_FATIGUE_FACTOR;
      if (allyCounts[entityPlayerId]) {
        entity.allyBoostUntil = now + 2000;
        entity.allyBoostLevel = Math.min(ALLY_BOOST_MAX_LEVEL, allyCounts[entityPlayerId]);
      }
      if (entity.allyBoostUntil > now) speedMultiplier *= 1 + ACETIL_ALLY_STEP * (entity.allyBoostLevel || 1);
      if (this.players.get(entityPlayerId)?.isAsymRole) speedMultiplier *= CURATOR_SPEED_BONUS;
      if (stunned) speedMultiplier = 0;
      if (!isMoving && !rolling) entity.curMult = Math.min(entity.curMult || 1, FLOJERA_SLOW_MULTIPLIER);
      const prevMult = entity.curMult ?? speedMultiplier;
      entity.curMult = speedMultiplier > prevMult ? prevMult + (speedMultiplier - prevMult) * Math.min(1, dt * 6) : speedMultiplier;
      speedMultiplier = entity.curMult;

      const resting = inAction && !isMoving && !stunned && !entity.channel && !rolling;
      if (resting) {
        if (!entity.idleSince) entity.idleSince = now;
      } else {
        entity.idleSince = 0;
      }
      entity.respiro = resting && now - entity.idleSince >= REST_DELAY_MS;
      if (entity.respiro && entity.flojeraLockedUntil > now) entity.flojeraLockedUntil -= dt * 1000;

      if (inAction && entity.acetilUntil > now) {
        if (isMoving && entity.flojera > 0 && !input.slow) {
          entity.flojera = Math.max(0, entity.flojera - FLOJERA_DRAIN_PER_SEC * dt);
          if (entity.flojera <= 0) entity.flojeraLockedUntil = now + FLOJERA_EXHAUST_LOCKOUT_MS;
        }
      } else if (inAction && !rolling) {
        if (sprinting || wantsSlow || !isMoving) {
          entity.runStreak = Math.max(0, (entity.runStreak || 0) - dt * 1.5);
          if (!sprinting && entity.regenBlockedUntil <= now) {
            entity.flojera = Math.min(entity.flojeraMax, entity.flojera + FLOJERA_REGEN_PER_SEC * (entity.respiro ? REST_REGEN_FACTOR : 1) * dt);
          }
        } else if (entity.noDrainUntil <= now) {
          const before = entity.flojera;
          entity.runStreak = (entity.runStreak || 0) + dt;
          const drainFactor = (1 + Math.min(RUN_STREAK_MAX, entity.runStreak * RUN_STREAK_RAMP)) * (this.players.get(entityPlayerId)?.isAsymRole ? CURATOR_DRAIN_FACTOR : 1);
          entity.flojera = Math.max(0, entity.flojera - FLOJERA_DRAIN_PER_SEC * drainFactor * dt);
          if (entity.flojera <= 0) {
            entity.flojeraLockedUntil = now + FLOJERA_EXHAUST_LOCKOUT_MS;
            entity.regenBlockedUntil = Math.max(entity.regenBlockedUntil || 0, now + EXHAUST_REGEN_BLOCK_MS);
            entity.runStreak = 0;
            if (before > 0) this.endlag(entityPlayerId, entity, now);
          }
        }
      }

      const prevX = entity.x;
      const prevZ = entity.z;
      const dashing = entity.dashUntil > now;
      const stepUp = dashing ? DASH_STEP_UP : STEP_UP;
      if (!dashing && entity.dashUntil) {
        entity.dashUntil = 0;
        if (entity.dashExhausted) this.ragdoll(entityPlayerId, entity, ROLL_EXHAUST_RAGDOLL_MS, now);
        entity.dashExhausted = false;
      }
      let velX = dashing ? entity.dashVX : input.moveX * MOVE_SPEED * speedMultiplier;
      let velZ = dashing ? entity.dashVZ : input.moveZ * MOVE_SPEED * speedMultiplier;
      if (entity.kbUntil > now) {
        velX += entity.kbX;
        velZ += entity.kbZ;
        const decay = Math.pow(0.05, dt);
        entity.kbX *= decay;
        entity.kbZ *= decay;
      }
      if (dashing) {
        const speed = Math.hypot(entity.dashVX, entity.dashVZ) || 1;
        const dx = entity.dashVX / speed;
        const dz = entity.dashVZ / speed;
        for (const [otherId, other] of this.players) {
          const isAlly = !other.isAsymRole;
          if (isAlly && (otherId === entityPlayerId || this.gameState.patients[otherId]?.status !== 'alive')) continue;
          const target = this.gameState.entities[otherId];
          if (!target) continue;
          const relX = target.x - entity.x;
          const relZ = target.z - entity.z;
          const along = relX * dx + relZ * dz;
          const sideways = Math.abs(relX * dz - relZ * dx);
          if (along < -0.6 || along > 1.8 || sideways > ROLL_HIT_WIDTH || Math.abs(target.y - entity.y) > 1.8) continue;
          if (isAlly) {
            Status.push(target, dx, dz, ROLL_PUSH_SPEED * 0.6, ROLL_PUSH_MS, now);
            continue;
          }
          Status.push(target, dx, dz, ROLL_KNOCKBACK_SPEED, ROLL_KNOCKBACK_MS, now);
          this.ragdoll(otherId, target, ROLL_RAGDOLL_MS, now);
          entity.x = target.x;
          entity.z = target.z;
          entity.dashUntil = now - 1;
          velX = 0;
          velZ = 0;
          break;
        }
      }
      const nextX = entity.x + velX * dt;
      const nextZ = entity.z + velZ * dt;
      if (!blockedAt(platforms, nextX, nextZ, entity.y, stepUp) || blockedAt(platforms, prevX, prevZ, entity.y, stepUp)) {
        entity.x = nextX;
        entity.z = nextZ;
      } else if (!blockedAt(platforms, nextX, prevZ, entity.y, stepUp)) {
        entity.x = nextX;
      } else if (!blockedAt(platforms, prevX, nextZ, entity.y, stepUp)) {
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
      let ground = groundAt(platforms, entity.x, entity.z, entity.y, stepUp);
      if (entity.onGround && entity.y > ground && entity.y - ground <= STEP_DOWN) entity.y = ground;
      if (entity.onGround && entity.y - ground > STEP_DOWN) {
        entity.onGround = false;
        entity.peakY = entity.y;
      }
      if (entity.onGround) {
        entity.velocityY = 0;
        entity.y = Math.max(entity.y, ground);
      } else {
        entity.velocityY += GRAVITY * (this.phase === 'lobby' ? LOBBY_GRAVITY_FACTOR : 1) * dt;
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
            this.endlagSlow(entity, now, FALL_ENDLAG_MS);
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
    const face = input.face;
    if (face && Number.isFinite(face.x) && Number.isFinite(face.z)) {
      const fl = Math.hypot(face.x, face.z);
      if (fl > 0.01) {
        entity.faceX = face.x / fl;
        entity.faceZ = face.z / fl;
      }
    }
  }

  endlagSlow(entity, now, ms) {
    Status.apply(entity, 'slow', ms, now, { tag: 'endlag' });
  }

  ragdoll(playerId, entity, ms, now) {
    Status.apply(entity, 'ragdoll', ms, now);
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
      if (target.perezaUntil <= now) target.perezaStacks = 0;
      target.perezaStacks = (target.perezaStacks || 0) + 1;
      target.perezaUntil = Math.min(now + 8000, Math.max(target.perezaUntil, now) + CHANNEL_HIT_PEREZA_MS);
      target.perezaLevel = Math.min(3, 1 + Math.floor(target.perezaStacks / 3) + (allies.length ? 0 : 1));
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
    if (Status.blocksSkills(curadorEntity, now)) {
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
    } else if (skill.type === 'stun' || skill.type === 'pull') {
      this.hitWindows.push({ kind: 'area', playerId, skill, index, endsAt: now + (skill.windowMs || HIT_WINDOW_MS) });
    } else if (skill.type === 'melee_stun') {
      this.hitWindows.push({ kind: 'melee', playerId, skill, index, endsAt: now + (skill.windowMs || HIT_WINDOW_MS) });
      this.broadcast(MessageType.HIT_FX, { playerId, boxes: [handBox(curadorEntity, skill.reach || 0, skill.radius)] });
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
        } else if (skill.type === 'purge') {
          targetEntity.sprintUntil = 0;
          targetEntity.exacerbacionLevel = 0;
          targetEntity.noDrainUntil = 0;
          Status.clear(targetEntity, 'slow');
          targetEntity.flojera = Math.max(0, targetEntity.flojera - skill.flojeraDrain);
        }
        affectedPlayerIds.push(targetPlayerId);
      }
    }

    if (affectedPlayerIds.length >= 2) this.award(playerId, 4, 'Pulso certero');
    else if (affectedPlayerIds.length === 1) this.award(playerId, 2, 'Habilidad certera');
    if (skill.revealMs) {
      for (const [targetPlayerId, patient] of Object.entries(this.gameState.patients)) {
        const targetEntity = this.gameState.entities[targetPlayerId];
        if (patient.status === 'alive' && targetEntity) Status.apply(targetEntity, 'reveal', skill.revealMs, now);
      }
    }

    if (skill.type !== 'boost' && skill.type !== 'melee_stun' && skill.type !== 'stun' && skill.type !== 'pull' && affectedPlayerIds.length === 0) this.endlag(playerId, curadorEntity, now);

    if (skill.type === 'pulse' && skill.selfHeal) this.adjustCuratorHp(skill.selfHeal * affectedPlayerIds.length);

    const pulseResult = {
      playerId,
      skillIndex: index,
      skillId: skill.id,
      skillName: skill.name,
      skillType: skill.type,
      radius: skill.radius || 0,
      center: skill.reach ? (({ x, z }) => ({ x, z }))(reachPoint(curadorEntity, skill.reach)) : null,
      cooldownUntil: curadorEntity.skillCooldowns[index],
      healedPlayerIds: healedAny ? affectedPlayerIds : [],
      affectedPlayerIds,
    };
    this.broadcastPulse(pulseResult);
    if (healedAny) this.checkGameEndConditions();
    if (skill.type === 'melee_stun' || skill.type === 'stun' || skill.type === 'pull') this.tickHitWindows(now);
  }

  broadcastPulse(pulseResult) {
    const onlyFor = (ids, viewerId) => (this.players.get(viewerId)?.isAsymRole ? ids : ids.filter((id) => id === viewerId));
    for (const targetId of this.players.keys()) {
      this.sendTo(targetId, MessageType.CURATOR_PULSE_RESULT, {
        ...pulseResult,
        healedPlayerIds: onlyFor(pulseResult.healedPlayerIds, targetId),
        affectedPlayerIds: onlyFor(pulseResult.affectedPlayerIds, targetId),
        patients: this.visiblePatients(targetId),
      });
    }
  }

  tickHitWindows(now) {
    if (!this.hitWindows.length) return;
    const keep = [];
    for (const win of this.hitWindows) {
      const owner = this.gameState.entities[win.playerId];
      if (!owner || this.phase !== 'action' || this.gameState.gameOver || Status.blocksSkills(owner, now)) continue;
      if (win.kind === 'm1') {
        let hitId = null;
        let hitDist = Infinity;
        for (const [targetPlayerId, patient] of Object.entries(this.gameState.patients)) {
          if (patient.status !== 'alive') continue;
          const targetEntity = this.gameState.entities[targetPlayerId];
          if (!targetEntity || !handHit(owner, targetEntity, M1_REACH, M1_RADIUS)) continue;
          const dist = euclid(owner, targetEntity);
          if (dist < hitDist) { hitDist = dist; hitId = targetPlayerId; }
        }
        if (hitId) {
          this.resolveCure(win.playerId, owner, hitId, now);
          continue;
        }
        if (win.endsAt <= now) continue;
      } else if (win.kind === 'area') {
        const skill = win.skill;
        const ids = [];
        for (const [targetPlayerId, patient] of Object.entries(this.gameState.patients)) {
          if (patient.status !== 'alive') continue;
          const targetEntity = this.gameState.entities[targetPlayerId];
          if (!targetEntity || distanceBetween(owner, targetEntity) > skill.radius) continue;
          this.award(win.playerId, skill.type === 'stun' ? 3 : 2, 'Habilidad certera');
          if (skill.type === 'stun') {
            Status.apply(targetEntity, 'stun', skill.durationMs, now);
          } else {
            const flat = euclid(owner, targetEntity);
            const travel = Math.min(skill.strength, Math.max(0, flat - 1));
            if (flat > 0) {
              targetEntity.x += ((owner.x - targetEntity.x) / flat) * travel;
              targetEntity.z += ((owner.z - targetEntity.z) / flat) * travel;
            }
          }
          ids.push(targetPlayerId);
        }
        if (ids.length) {
          this.broadcastPulse({
            playerId: win.playerId,
            skillIndex: win.index,
            skillId: skill.id,
            skillName: skill.name,
            skillType: skill.type,
            radius: skill.radius || 0,
            center: null,
            cooldownUntil: owner.skillCooldowns[win.index],
            healedPlayerIds: [],
            affectedPlayerIds: ids,
          });
          continue;
        }
        if (win.endsAt <= now) {
          this.endlag(win.playerId, owner, now);
          continue;
        }
      } else if (win.kind === 'melee') {
        const skill = win.skill;
        let nearestId = null;
        let nearestDist = Infinity;
        for (const [targetPlayerId, patient] of Object.entries(this.gameState.patients)) {
          if (patient.status !== 'alive') continue;
          const targetEntity = this.gameState.entities[targetPlayerId];
          if (!targetEntity || !handHit(owner, targetEntity, skill.reach || 0, skill.radius)) continue;
          const dist = euclid(owner, targetEntity);
          if (dist <= nearestDist) {
            nearestDist = dist;
            nearestId = targetPlayerId;
          }
        }
        if (nearestId) {
          this.award(win.playerId, 3, 'Aturdiste a un Paciente');
          Status.apply(this.gameState.entities[nearestId], 'stun', skill.durationMs, now);
          this.broadcastPulse({
            playerId: win.playerId,
            skillIndex: win.index,
            skillId: skill.id,
            skillName: skill.name,
            skillType: skill.type,
            radius: skill.radius || 0,
            center: null,
            cooldownUntil: owner.skillCooldowns[win.index],
            healedPlayerIds: [],
            affectedPlayerIds: [nearestId],
          });
          continue;
        }
        if (win.endsAt <= now) {
          this.endlag(win.playerId, owner, now);
          continue;
        }
      } else {
        const card = win.card;
        if (this.curatorInRange(owner, card.hitRadius, card.reach || 0)) {
          CardEffects.apply(this, win.playerId, owner, card, now);
          this.gainExacerbacion(owner, now);
          continue;
        }
        if (win.endsAt <= now) {
          this.endlag(win.playerId, owner, now);
          continue;
        }
      }
      keep.push(win);
    }
    this.hitWindows = keep;
  }

  stun(playerId, entity, ms, now, hpLoss = 0) {
    Status.apply(entity, 'stun', ms, now);
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

  zoneDistance(entity, zone) {
    if (Math.abs((entity.y || 0) - (zone.y || 0)) > 1.6) return Infinity;
    return distanceBetween({ ...entity, y: 0 }, { x: zone.x, z: zone.z, y: 0 });
  }

  addZone(zone) {
    const owner = this.gameState.entities[zone.ownerId];
    const platforms = this.phase === 'action' ? GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId)) : [];
    zone.y = groundAt(platforms, zone.x, zone.z, owner ? owner.y || 0 : 0, 2);
    this.gameState.zones.push({ id: `z${this.zoneCounter = (this.zoneCounter || 0) + 1}`, ...zone });
  }

  tickZones(now, dt) {
    let statusChanged = false;
    for (const [playerId, entity] of Object.entries(this.gameState.entities)) {
      const dot = entity.rimacDot;
      if (!dot) continue;
      const patient = this.gameState.patients[playerId];
      if (now >= dot.until || !patient || patient.status !== 'alive') { entity.rimacDot = null; continue; }
      const before = patient.status;
      this.damagePatient(playerId, RIMAC_DOT_PER_SEC * dt);
      if (patient.status !== before) statusChanged = true;
    }
    const remaining = [];
    for (const zone of this.gameState.zones) {
      if (now >= zone.until) {
        if (zone.onExpire) zone.onExpire(zone);
        continue;
      }
      remaining.push(zone);

      if (zone.kind === 'rimac') {
        const frac = Math.min(1, (now - zone.placedAt) / (zone.until - zone.placedAt));
        zone.level = frac < 1 / 3 ? 3 : frac < 2 / 3 ? 2 : 1;
      }
      if (zone.kind === 'rimac' || zone.kind === 'puddle') {
        for (const [playerId, patient] of Object.entries(this.gameState.patients)) {
          if (patient.status !== 'alive') continue;
          const entity = this.gameState.entities[playerId];
          if (!entity || this.zoneDistance(entity, zone) > zone.radius) continue;
          const before = patient.status;
          if (zone.kind === 'rimac') {
            zone.inside = zone.inside || {};
            zone.inside[playerId] = (zone.inside[playerId] || 0) + dt;
            zone.dealt = zone.dealt || {};
            const rate = RIMAC_PUDDLE_RATES[zone.level || 3];
            const left = Math.max(0, RIMAC_PUDDLE_CAP - (zone.dealt[playerId] || 0));
            const amount = Math.min(rate * dt, left);
            if (amount > 0) {
              zone.dealt[playerId] = (zone.dealt[playerId] || 0) + amount;
              this.damagePatient(playerId, amount);
            }
          }
          else this.healPatient(playerId, zone.perSecond * dt);
          if (patient.status !== before) statusChanged = true;
        }
        if (zone.kind === 'puddle') {
          for (const [playerId, player] of this.players) {
            if (!player.isAsymRole) continue;
            const entity = this.gameState.entities[playerId];
            if (entity && this.zoneDistance(entity, zone) <= zone.radius) {
              this.adjustCuratorHp(PUDDLE_CURATOR_PER_SEC * dt);
            }
          }
        }
        if (zone.kind === 'rimac') {
          for (const [playerId, player] of this.players) {
            if (!player.isAsymRole) continue;
            const entity = this.gameState.entities[playerId];
            if (!entity || this.zoneDistance(entity, zone) > zone.radius) continue;
            entity.flojera = Math.max(0, entity.flojera - RIMAC_CURADOR_FLOJERA_DRAIN_PER_SEC * dt);
            const curator = this.gameState.curator;
            this.adjustCuratorHp((curator.hp < curator.max / 2 ? -1 : 1) * zone.perSecond * dt);
            Status.apply(entity, 'slow', 300, now);
          }
        }
      } else if (zone.kind === 'trap' && now >= zone.armedAt) {
        const age = (now - zone.placedAt) / 1000;
        const life = 1 + age;
        zone.level = life >= TRAP_PEAK_LIFE ? 1 : life >= 31 ? 2 : 3;
        if (life >= TRAP_PEAK_LIFE) zone.charges = 0;
        if (zone.charges > 0 && now >= zone.cooldownUntil) {
          const stunMs = [0, 1000, 1500, 2000][zone.level];
          const heal = [0, 8, 14, 20][zone.level];
          zone.spent = zone.spent || {};
          for (const [playerId, player] of this.players) {
            if (zone.charges <= 0) break;
            const entity = this.gameState.entities[playerId];
            if (!entity) continue;
            if (this.zoneDistance(entity, zone) > TRAP_RADIUS) {
              delete zone.spent[playerId];
              continue;
            }
            if (zone.spent[playerId]) continue;
            const isOwner = playerId === zone.ownerId && !player.isAsymRole;
            if (!player.isAsymRole && !(isOwner && now >= zone.ownerArmedAt && this.gameState.patients[playerId]?.status === 'alive')) continue;
            this.ragdoll(playerId, entity, stunMs, now);
            if (player.isAsymRole) this.adjustCuratorHp(heal);
            else if (isOwner) this.award(playerId, 1, 'Tropezaste');
            if (player.isAsymRole) this.award(zone.ownerId, 8, 'Cáscara de plátano');
            zone.charges -= 1;
            zone.spent[playerId] = true;
            zone.cooldownUntil = now + 1500;
          }
        }
        if (zone.charges <= 0) remaining.pop();
      }
    }
    this.gameState.zones = remaining;
    if (statusChanged) this.checkGameEndConditions();
  }

  relocateSelfDamageObjects(now) {
    this.lastRelocateAt = now;
    const allPositions = this.selfDamageCandidates();
    for (const objectId of Object.keys(this.gameState.selfDamageObjectPositions)) {
      const others = allPositions.filter((p) => p.id !== objectId);
      if (others.length === 0) continue;
      const newPos = others[Math.floor(Math.random() * others.length)];
      this.gameState.selfDamageObjectPositions[objectId] = { x: newPos.x, y: newPos.y, z: newPos.z };
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

  selectRole(playerId, roleId) {
    if (this.phase !== 'action' || this.gameState.gameOver) return;
    const player = this.players.get(playerId);
    const entity = this.gameState.entities[playerId];
    if (!player || player.isAsymRole || !entity || entity.role) return;
    if (this.gameState.patients[playerId]?.status !== 'alive') return;
    if (!entity.hand[0] || entity.hand[0].chosen) return;
    if (roleId === 'none') {
      entity.role = 'none';
      this.sendTo(playerId, MessageType.ROLE_SELECTED, { roleId: 'none' });
      return;
    }
    const role = Roles.getRole(roleId);
    if (!role) return;
    entity.role = role.id;
    entity.hand[0] = { options: [role.card], chosen: null };
    this.finalizeChoice(playerId, 0, role.card);
    entity.hand[1] = { options: Roles.secondOptions(role, Cards.OPTIONS_PER_SLOT), chosen: null };
    entity.draftEndsAt = Date.now() + Cards.DRAFT_DURATION_MS;
    this.sendTo(playerId, MessageType.ROLE_SELECTED, { roleId: role.id });
    this.sendCardOffer(playerId, entity);
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
    if (Status.blocksSkills(entity, Date.now())) {
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
      hitRadius: card.hitRadius || null,
      center: card.reach ? (({ x, z }) => ({ x, z }))(reachPoint(entity, card.reach)) : null,
      boxes: card.reach ? [handBox(entity, card.reach, card.hitRadius)] : CardEffects.areaOf(card, entity),
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

  curatorInRange(entity, radius, reach = 0) {
    for (const [otherId, other] of this.players) {
      if (!other.isAsymRole) continue;
      const otherEntity = this.gameState.entities[otherId];
      if (!otherEntity) continue;
      if (reach ? handHit(entity, otherEntity, reach, radius) : distanceBetween(entity, otherEntity) <= radius) return true;
    }
    return false;
  }

  award(playerId, amount, reason) {
    const player = this.players.get(playerId);
    if (!player || player.isBot || !this.gameState.desgracias) return;
    const book = this.gameState.desgracias[playerId] || (this.gameState.desgracias[playerId] = {});
    book[reason] = (book[reason] || 0) + amount;
  }

  gainExacerbacion(entity, now) {
    for (const [id, e] of Object.entries(this.gameState.entities)) if (e === entity) this.award(id, 5, 'Golpe al Curador');
    const active = entity.exacerbacionUntil > now;
    entity.exacerbacionLevel = Math.min(EXACERBACION_MAX_LEVEL, (active ? entity.exacerbacionLevel : 0) + 1);
    entity.exacerbacionUntil = now + EXACERBACION_MS;
  }

  endlag(playerId, entity, now, fixedMs, forcedLevel) {
    const missing = 1 - Math.max(0, Math.min(1, entity.flojera / entity.flojeraMax));
    const ms = fixedMs || ENDLAG_MIN_MS + (ENDLAG_MAX_MS - ENDLAG_MIN_MS) * missing;
    if (ms <= 0) return;
    Status.apply(entity, 'slow', ms, now, { chain: true, tag: 'endlag', level: forcedLevel || 1 + Math.min(2, Math.floor(missing * 3)) });
  }

  applyCardEffect(playerId, entity, card, now) {
    if (card.window) {
      this.hitWindows.push({ kind: 'card', playerId, card, endsAt: now + card.window });
      if (card.maxMode === 'use') this.applyMaxCosts(playerId, entity, card, true);
      this.tickHitWindows(now);
      return;
    }
    const hit = card.hitRadius ? this.curatorInRange(entity, card.hitRadius, card.reach || 0) : null;
    CardEffects.apply(this, playerId, entity, card, now);
    if (hit === true) {
      this.gainExacerbacion(entity, now);
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
  applyCure(curadorId) {
    if (this.gameState.gameOver) return;
    const curador = this.players.get(curadorId);
    if (!curador || !curador.isAsymRole) {
      this.sendTo(curadorId, MessageType.ERROR, { message: 'Solo el Curador puede curar' });
      return;
    }
    const now = Date.now();
    if (now < (this.gameState.curatorReleaseAt || 0)) return;
    const entity = this.gameState.entities[curadorId];
    if (!entity || entity.baseCooldownUntil > now || Status.blocksSkills(entity, now)) return;
    entity.baseCooldownUntil = now + (Characters.getCharacter(curador.characterId).baseCooldownMs || 900);
    let near = null;
    let nearDist = 2.6;
    for (const [pid, pat] of Object.entries(this.gameState.patients)) {
      const pe = this.gameState.entities[pid];
      if (pat.status !== 'alive' || !pe) continue;
      const d = euclid(entity, pe);
      if (d < nearDist) { nearDist = d; near = pe; }
    }
    if (near && nearDist > 0.05) {
      entity.faceX = (near.x - entity.x) / nearDist;
      entity.faceZ = (near.z - entity.z) / nearDist;
    }
    this.hitWindows.push({ kind: 'm1', playerId: curadorId, endsAt: now + M1_WINDOW_MS });
    this.broadcast(MessageType.HIT_FX, { playerId: curadorId, boxes: [handBox(entity, M1_REACH, M1_RADIUS)] });
  }

  resolveCure(curadorId, curadorEntity, targetPlayerId, now) {
    const patient = this.gameState.patients[targetPlayerId];
    const targetEntity = this.gameState.entities[targetPlayerId];
    const boost = curadorEntity.cureBoostUntil > now ? curadorEntity.cureBoostFactor : 1;
    patient.hp = Math.min(patient.maxHp, patient.hp + this.scaleCure(targetEntity, CURE_AMOUNT * boost, now));
    this.award(curadorId, 3, 'Cura');
    if (patient.hp >= patient.maxHp) {
      patient.status = 'eliminated';
      this.onPatientFullyCured();
    }
    this.sendTo(curadorId, MessageType.CURE_RESULT, { targetPlayerId, newHp: patient.hp, status: patient.status });
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
    const playerEntity = this.gameState.entities[playerId];
    if (!playerEntity) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'No se pudo validar la posición' });
      return;
    }
    const now = Date.now();
    const game = playerEntity.selfDmg;
    if (game) {
      this.pressSelfDamage(playerId, playerEntity, patient, game, now);
      return;
    }

    const objectPos = this.gameState.selfDamageObjectPositions[objectId];
    if (!objectPos) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Ese objeto no existe' });
      return;
    }
    if (distanceBetween(playerEntity, objectPos) > INTERACTION_RADIUS) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Estás demasiado lejos de ese objeto' });
      return;
    }
    if (Status.blocksSkills(playerEntity, now)) return;
    const type = this.gameState.selfDamageTypes[objectId] || 'rhythm';
    if (type === 'rhythm') {
      const beats = [];
      let at = 1000 + Math.random() * 200;
      for (let i = 0; i < SD_BEATS; i++) {
        beats.push(Math.round(at));
        at += 850 + Math.random() * 400;
      }
      playerEntity.selfDmg = { type, objectId, startedAt: now, endsAt: now + beats[beats.length - 1] + SD_TOLERANCE_MS + 150, beats, scored: [], hits: 0 };
    } else if (type === 'needle') {
      playerEntity.selfDmg = { type, objectId, startedAt: now, endsAt: now + 10000, period: 2600, stage: 0, hits: 0, zones: [0, 1, 2].map(() => 0.2 + Math.random() * 0.6), width: 0.27 };
    } else {
      playerEntity.selfDmg = { type: 'mash', objectId, startedAt: now, endsAt: now + 3600, count: 0, target: 6, hits: 0 };
    }
  }

  needlePos(game, now) {
    const ph = (((now - game.startedAt) / game.period) % 1 + 1) % 1;
    return ph < 0.5 ? ph * 2 : 2 - ph * 2;
  }

  sdView(game, now) {
    const base = { type: game.type, objectId: game.objectId, elapsed: now - game.startedAt, total: game.endsAt - game.startedAt };
    if (game.type === 'rhythm') return { ...base, beats: game.beats, scored: game.scored, tolerance: SD_TOLERANCE_MS };
    if (game.type === 'needle') return { ...base, period: game.period, zone: game.zones[game.stage], width: game.width, stage: game.stage, stages: game.zones.length };
    return { ...base, count: game.count, target: game.target };
  }

  pressSelfDamage(playerId, entity, patient, game, now) {
    if (game.type === 'mash') {
      game.count += 1;
      game.hits = game.count;
      this.award(playerId, 0, 'Auto-daño');
      if (game.count >= game.target) this.finishSelfDamage(playerId, entity, now);
      return;
    }
    if (game.type === 'needle') {
      const pos = this.needlePos(game, now);
      if (Math.abs(pos - game.zones[game.stage]) <= game.width) {
        game.hits += 1;
        game.stage += 1;
        this.award(playerId, 1, 'Auto-daño');
        if (game.stage >= game.zones.length) this.finishSelfDamage(playerId, entity, now);
      } else {
        this.finishSelfDamage(playerId, entity, now, true);
      }
      return;
    }
    const t = now - game.startedAt;
    let bestIdx = -1;
    let bestGap = Infinity;
    game.beats.forEach((b, i) => {
      if (game.scored.includes(i)) return;
      const gap = Math.abs(t - b);
      if (gap < bestGap) { bestGap = gap; bestIdx = i; }
    });
    if (bestIdx >= 0 && bestGap <= SD_TOLERANCE_MS) {
      game.scored.push(bestIdx);
      game.hits += 1;
      this.award(playerId, 1, 'Auto-daño');
      if (game.hits >= game.beats.length) this.finishSelfDamage(playerId, entity, now);
    } else {
      entity.selfDmg = null;
      this.endlag(playerId, entity, now, SD_FUMBLE_ENDLAG_MS);
      this.sendTo(playerId, MessageType.SELF_DAMAGE_RESULT, { playerId, newHp: patient.hp, status: patient.status, objectId: game.objectId, damage: 0, hits: game.hits, failed: true });
    }
  }

  tickSelfDamage(playerId, entity, now) {
    const game = entity.selfDmg;
    const pos = this.gameState.selfDamageObjectPositions[game.objectId];
    const patient = this.gameState.patients[playerId];
    if (!pos || !patient || patient.status !== 'alive' || Status.blocksMove(entity, now) || distanceBetween(entity, pos) > INTERACTION_RADIUS + 0.4) {
      entity.selfDmg = null;
      return;
    }
    if (game.type === 'rhythm') {
      const t = now - game.startedAt;
      const missed = game.beats.some((b, i) => !game.scored.includes(i) && t > b + SD_TOLERANCE_MS);
      if (missed || now >= game.endsAt) this.finishSelfDamage(playerId, entity, now);
    } else if (now >= game.endsAt) {
      this.finishSelfDamage(playerId, entity, now);
    }
  }

  sdDamage(game) {
    if (game.type === 'mash') return Math.min(SD_MAX_DAMAGE, Math.round((game.count / game.target) * SD_MAX_DAMAGE));
    if (game.type === 'needle') return Math.round((game.hits / game.zones.length) * SD_MAX_DAMAGE);
    return game.hits * SD_HIT_DAMAGE + (game.hits >= game.beats.length ? SD_PERFECT_BONUS : 0);
  }

  finishSelfDamage(playerId, entity, now, failed = false) {
    const game = entity.selfDmg;
    entity.selfDmg = null;
    const patient = this.gameState.patients[playerId];
    if (!game || !patient || patient.status !== 'alive') return;
    const damage = this.sdDamage(game);
    const perfect = damage >= SD_MAX_DAMAGE;
    if (perfect) this.award(playerId, 4, 'Auto-daño perfecto');
    if (damage > 0) {
      patient.hp = Math.max(PATIENT_HP_MIN, patient.hp - damage);
      if (patient.hp <= PATIENT_HP_MIN) patient.status = 'self_won';
      const allPositions = this.selfDamageCandidates();
      const otherPositions = allPositions.filter((p) => p.id !== game.objectId);
      const pool = otherPositions.length ? otherPositions : allPositions;
      const newPos = pool[Math.floor(Math.random() * pool.length)];
      this.gameState.selfDamageObjectPositions[game.objectId] = { x: newPos.x, y: newPos.y, z: newPos.z };
      this.gameState.selfDamageTypes[game.objectId] = this.randomMinigame(game.objectId);
    }
    this.sendTo(playerId, MessageType.SELF_DAMAGE_RESULT, {
      playerId,
      newHp: patient.hp,
      status: patient.status,
      objectId: game.objectId,
      objectNewPosition: this.gameState.selfDamageObjectPositions[game.objectId],
      damage,
      hits: game.hits,
      perfect,
      failed: failed && damage === 0,
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

    for (const [playerId, player] of this.players) {
      if (player.isBot) continue;
      if (player.isAsymRole) {
        this.award(playerId, 5, 'Partida jugada');
        if (curatorWon) this.award(playerId, 40, 'Victoria del Curador');
      } else {
        this.award(playerId, 5, 'Partida jugada');
        const status = patientResults[playerId]?.status;
        if (status === 'self_won') this.award(playerId, 40, 'Escapaste');
        else if (status === 'timeout') this.award(playerId, 15, 'Sobreviviste');
      }
    }
    this.broadcast(MessageType.GAME_OVER, { curatorWon, patientResults, reason });
    for (const [playerId, book] of Object.entries(this.gameState.desgracias || {})) {
      const items = Object.entries(book).map(([label, amount]) => ({ label, amount, axis: DESGRACIA_AXES[label] || 'r' }));
      const total = items.reduce((sum, i) => sum + i.amount, 0);
      if (total > 0) this.sendTo(playerId, MessageType.DESGRACIAS_AWARD, { total, items });
    }
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
