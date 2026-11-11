const { MessageType, encode } = require('./protocol');
const Delta = require('./Delta');
const GameMap = require('./GameMap');
const Cosmetics = require('./Cosmetics');
const Characters = require('./Characters');
const CustomCards = require('./CustomCards');
const Cards = require('./Cards');
const Roles = require('./Roles');
const CardEffects = require('./CardEffects');
const Hitbox = require('./Hitbox');
const MODULE_MIN_DIST = 9;
const SERUM_RADIUS = 3;
const SERUM_ACTIVE_MS = 14000;
const SERUM_RECHARGE_MS = 28000;
const SERUM_PATIENT_PER_SEC = 1.5;
const SERUM_PATIENT_CAP = 0.9;
const SERUM_CURATOR_PER_SEC = 30;
const { groundAt, blockedAt, distanceBetween, euclid, reachPoint, handBox, handHit } = Hitbox;
const {
  MAX_PLAYERS,
  TICK_RATE_MS,
  PATIENT_HP_START,
  PATIENT_HP_MAX,
  PATIENT_HP_MIN,
  TUTORIAL_PATIENT_HP_MAX,
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
  ASTRAL,
  MUTATIONS,
  RAGDOLL_POP,
  GETUP_ENDLAG_MS,
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
  MODULE_CARRY_SLOW,
  MODULE_CARRY_RADIUS,
  MODULE_HANDOFF_RADIUS,
  MODULE_DROP_MIN_DIST,
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
  FOOTPRINT,
  PARAGUAY_HIT_END_MS,
  PARAGUAY_END_MS,
  PARAGUAY_DRAIN_FACTOR,
  ACETIL_DRAIN_FACTOR,
} = require('./Constants');
const LOBBY_WAIT_MS = Number(process.env.LOBBY_WAIT_MS) || 60000;
const BotBrain = require('./BotBrain');
const Status = require('./Status');
const EMOTES = {
  fue_el: 1800, schadenfreude: 2200, costenas: 2600, su_majestad: 1800,
  ya_pues: 2000, ni_me_mires: 2000, ni_idea: 1400, yo_me_encargo: 1800, pulso: 1800,
};
const EMOTE_COOLDOWN_MS = 7000;
const FIELD_KINDS = new Set(['herbs', 'drip', 'gas', 'rootshot', 'dart', 'gurney']);
const LMS_GIMMICKS = ['adrenalina', 'reflejos', 'escudo', 'codicia'];

function ownHidden(playerId, player, publicEntities, room, now) {
  let out = publicEntities;
  const edit = () => (out === publicEntities ? (out = { ...publicEntities }) : out);
  if (player.isAsymRole) {
    for (const [id, e] of Object.entries(publicEntities)) if (e.invis) edit()[id] = { ...e, gone: true };
  } else if (now < (room.gameState.curatorReleaseAt || 0)) {
    for (const [id, p] of room.players) {
      if (p.isAsymRole && publicEntities[id]) edit()[id] = { ...publicEntities[id], gone: true };
    }
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

const SD_VARIANTS = {
  pulso: { base: 'rhythm', tier: 'easy', beats: 1, tol: 1.3, scale: 0.5 },
  termometro: { base: 'meter', tier: 'easy', div: 0.36, scale: 0.5 },
  pelota: { base: 'mash', tier: 'easy', target: 4, ms: 4000, scale: 0.5 },
  rhythm: { base: 'rhythm', tier: 'normal' },
  needle: { base: 'needle', tier: 'normal' },
  mash: { base: 'mash', tier: 'normal' },
  meter: { base: 'meter', tier: 'normal' },
  ampolla: { base: 'needle', tier: 'normal', stages: 2, width: 0.2 },
  xilofono: { base: 'rhythm', tier: 'normal', beats: 4 },
  tambores: { base: 'rhythm', tier: 'normal', double: true },
  boton: { base: 'mash', tier: 'normal', target: 9, ms: 3000 },
  manometro: { base: 'meter', tier: 'normal', div: 0.2 },
  turbina: { base: 'meter', tier: 'normal', period: 1500 },
  lock: { base: 'lock', tier: 'hard' },
  keys: { base: 'keys', tier: 'hard' },
};
const SD_EASY = ['pulso', 'termometro', 'pelota'];
const SD_NORMAL = ['rhythm', 'needle', 'mash', 'meter', 'ampolla', 'xilofono', 'tambores', 'boton', 'manometro', 'turbina'];
const HEART_RANGE = 32;
const Boss = require('./Boss');
const AIR_DRAG = 0.012;
const MODES = ['normal', 'dual', 'shared', 'infection', 'lights', 'gravity'];
const MODULE_RELOCATE_MS = 2000;
const LOCK_DAMAGE = 20;
const KEYS_PARTS = [1, 2, 3, 4, 4, 4];
const KEYS_LEN = [3, 3, 4, 4, 5, 5];

class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.hostId = null;
    this.isDefault = false;
    this.startAt = null;
    this.votes = { bots: {}, map: {}, mutation: {}, curator: {}, mode: {} };
    this.phase = 'lobby';
    this.hitWindows = [];
    this.tickInterval = null;
    this.tickCount = 0;
    this.mutation = 'none';
    this.mode = 'normal';
    this.bossOn = false;
    this.bossId = null;
    this.bossActive = false;
    this.secondCuratorId = null;
    this.matchCount = 0;
    this.sharedHp = null;
    this.mapId = GameMap.DEFAULT_MAP_ID; // qué mapa usa esta sala, hoy siempre 'default', preparado para elegir otro cuando exista el creador

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

  addBot(requesterId, tutorial) {
    if (this.phase !== 'lobby' || requesterId !== this.hostId) return;
    if (this.isDefault && tutorial !== true) return;
    this.tutorial = tutorial === true;
    if (tutorial === true && [...this.players.values()].some((p) => p.isBot)) return;
    if (this.isFull()) return;
    this.botCounter = (this.botCounter || 0) + 1;
    const botId = `bot-${this.botCounter}`;
    this.addPlayer(botId, { readyState: 0, send() {} }, `Bot ${this.botCounter}`);
    this.players.get(botId).isBot = true;
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId });
  }

  removeBot(requesterId) {
    if (this.phase !== 'lobby' || requesterId !== this.hostId || this.isDefault) return;
    const botIds = [...this.players.entries()].filter(([, p]) => p.isBot).map(([id]) => id);
    if (!botIds.length) return;
    this.tutorial = false;
    this.removePlayer(botIds[botIds.length - 1]);
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId });
  }

  navigation(curator = false) {
    const glitch = this.gameState.glitchIds || {};
    const nowMs = Date.now();
    for (const id of Object.keys(glitch)) if (glitch[id] <= nowMs) delete glitch[id];
    const hidden = (this.gameState.hiddenPlatforms || []).filter((id) => !glitch[id]).sort();
    const gates = this.phase === 'action' ? this.gatesState() : null;
    const key = `${this.mapId}|${hidden.join(',')}|${gates || ''}`;
    if (!this.navCache) this.navCache = new Map();
    let entry = this.navCache.get(key);
    if (!entry) {
      if (this.navCache.size > 3) this.navCache.clear();
      const area = GameMap.areaFor(this.mapId);
      const objects = GameMap.resolveCollisionObjects(this.mapId, area);
      const all = GameMap.resolvePlatforms(this.mapId, area).filter((p) => !hidden.includes(p.id));
      const cur = gates === 'lock' ? all : all.filter((p) => p.kind !== 'gate');
      const pat = (gates === 'open' ? cur : all).filter((p) => p.kind !== 'pgate');
      const grid = Pathfinding.buildGrid(area.halfSize, objects, pat);
      const sameSides = !all.some((p) => p.kind === 'gate' || p.kind === 'pgate');
      entry = { grid, gridCur: sameSides ? grid : Pathfinding.buildGrid(area.halfSize, objects, cur) };
      this.navCache.set(key, entry);
    }
    this.nav = entry;
    return curator ? entry.gridCur : entry.grid;
  }

  selfDamageCandidates() {
    const area = GameMap.areaFor(this.mapId);
    const all = GameMap.resolveSelfDamagePositions(this.mapId, area);
    const grid = this.navigation();
    if (!this.nav.seen) this.nav.seen = Pathfinding.reachableFrom(grid, GameMap.getCuratorSpawn(this.mapId, 0));
    const objects = GameMap.resolveCollisionObjects(this.mapId, area);
    const platforms = GameMap.resolvePlatforms(this.mapId, area);
    const ok = all
      .filter((p) => !objects.some((o) => o.height > 0.5 && (typeof p.y !== 'number' || p.y < 0.5) && Math.abs(p.x - o.x) <= o.radius + 0.6 && Math.abs(p.z - o.z) <= o.radius + 0.6))
      .filter((p) => Pathfinding.isReachableNear(grid, this.nav.seen, p.x, p.z, 2, p.y))
      .map((p) => {
        let top = Hitbox.baseAt(platforms, p.x, p.z);
        for (const pl of platforms) {
          const t = Hitbox.platformTop(pl, p.x, p.z);
          if (t !== null && t > top) top = t;
        }
        return { ...p, y: typeof p.y === 'number' ? p.y : top };
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
    const goalMoved = !st.goal || Math.hypot(goal.x - st.goal.x, goal.z - st.goal.z) > 3 || Math.abs((goal.y || 0) - (st.goal.y || 0)) > 1;
    const wantPath = goalMoved || now >= st.repathAt || !st.path.length;
    if (wantPath && (this.pathBudget > 0 || !st.path.length && !st.everPathed)) {
      this.pathBudget -= 1;
      st.everPathed = true;
      const jitter = st.stuck >= 2 ? { x: (Math.random() - 0.5) * 3, z: (Math.random() - 0.5) * 3 } : { x: 0, z: 0 };
      st.path = Pathfinding.findPath(grid, { x: entity.x + jitter.x, z: entity.z + jitter.z, y: entity.y || 0 }, goal);
      st.goal = { x: goal.x, z: goal.z, y: goal.y };
      const calm = !goalMoved && st.stuck === 0 && st.path.length > 0;
      const farMs = Math.min(2500, Math.hypot(goal.x - entity.x, goal.z - entity.z) * 80);
      st.repathAt = now + (calm ? 5000 + Math.random() * 3000 : 1500 + farMs * 0.5 + Math.random() * 1000);
    }
    while (st.path.length > 1 && Math.hypot(st.path[0].x - entity.x, st.path[0].z - entity.z) < 0.6 && Math.abs((st.path[0].y ?? entity.y) - (entity.y || 0)) < 1.2) st.path.shift();
    if (!st.path.length) {
      entity.input.moveX = 0;
      entity.input.moveZ = 0;
      return false;
    }
    const wp = st.path[0];
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
    let kept = null;
    for (const [patientId, patient] of Object.entries(this.gameState.patients)) {
      if (patient.status !== 'alive') continue;
      const other = this.gameState.entities[patientId];
      if (!other || this.isInvisible(other, now)) continue;
      const d = distanceBetween(entity, other);
      if (patientId === player.curTarget) kept = { id: patientId, entity: other, d };
      if (d < targetDist) { targetDist = d; target = { id: patientId, entity: other }; }
    }
    const mind = player.mind || (player.mind = BotBrain.createMind());
    const prog = player.curProgress;
    if (kept && prog && prog.id === kept.id) {
      const hpNow = this.gameState.patients[kept.id].hp;
      if (hpNow > prog.hp + 0.5) { prog.hp = hpNow; prog.at = now; mind.confidence = Math.min(1, mind.confidence + 0.08); mind.frustration = Math.max(0, mind.frustration - 0.1); }
      else if (now - prog.at > 1800 + 2500 * mind.patience) { mind.frustration = Math.min(1, mind.frustration + 0.35); prog.at = now; kept = null; }
    }
    if (kept && kept.d <= targetDist * (1.1 + 0.6 * mind.patience) + 2) { target = { id: kept.id, entity: kept.entity }; targetDist = kept.d; }
    if (target && (!prog || prog.id !== target.id)) player.curProgress = { id: target.id, hp: this.gameState.patients[target.id].hp, at: now };
    mind.frustration = Math.max(0, mind.frustration - 0.004);
    player.curTarget = target ? target.id : null;
    this.botEmote(botId, player, entity, mind, now, targetDist, 'curator');
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
        y: target.entity.y || 0,
      };
      for (const z of this.gameState.zones) {
        if ((z.kind !== 'spear' && z.kind !== 'trap') || now >= z.until) continue;
        if (z.kind === 'trap' && (now < z.armedAt || !(z.charges > 0))) continue;
        const zr = z.kind === 'trap' ? (z.radius || 1) : z.radius;
        const sx = z.x - entity.x;
        const sz = z.z - entity.z;
        const sd = Math.hypot(sx, sz);
        if (Math.hypot(z.x - target.entity.x, z.z - target.entity.z) <= zr + 1) {
          if (sd > 1.6) { goal.x = z.x; goal.z = z.z; }
          if (sd <= zr && now > (player.nextBotHeal || 0)) {
            player.nextBotHeal = now + 550;
            this.healSpears(entity, 0, zr, true, now);
          }
          break;
        }
        if (sd > zr + 0.8 || sd < 0.01) continue;
        const gx = goal.x - entity.x;
        const gz = goal.z - entity.z;
        const side = sx * gz - sz * gx >= 0 ? 1 : -1;
        goal.x += (sz / sd) * side * 1.5;
        goal.z += (-sx / sd) * side * 1.5;
        break;
      }
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
      player.nextBotCard = now + 900 + 1300 * (1 - mind.bravery) + 600 * mind.frustration + Math.random() * 1500;
      const bl = Math.hypot(target.entity.x - entity.x, target.entity.z - entity.z) || 1;
      entity.faceX = (target.entity.x - entity.x) / bl;
      entity.faceZ = (target.entity.z - entity.z) / bl;
      const skillIndex = targetDist <= 2.5 && Math.random() < 0.2 + 0.4 * mind.bravery ? 'melee' : Math.floor(Math.random() * 4);
      this.applyCuratorPulse(botId, skillIndex);
    }
  }

  botBoss(botId, player, now) {
    const entity = this.gameState.entities[botId];
    if (!entity || entity.down || this.gameState.gameOver) return;
    let best = null;
    let bd = Infinity;
    for (const [id, e] of Object.entries(this.gameState.entities)) {
      if (id === botId || e.down || e.gone || e.corpse) continue;
      const d = Math.hypot(e.x - entity.x, e.z - entity.z);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) { entity.input.moveX = 0; entity.input.moveZ = 0; return; }
    this.botSteer(player, entity, { x: best.x, z: best.z }, now, 0.15);
    if (bd < Boss.reachOf(entity.size || 1) * 0.9) Boss.strike(this, botId, now);
    if (!entity.tpMark && bd < 10 && Math.random() < 0.03) Boss.ability(this, botId, 1, now);
    else if (entity.tpMark && Math.hypot(entity.tpMark.x - entity.x, entity.tpMark.z - entity.z) > 12 && Math.random() < 0.3) Boss.ability(this, botId, 1, now);
    if (bd < 14 && Math.random() < 0.03) Boss.ability(this, botId, 0, now);
    if (entity.sp <= Boss.SP_ULT) Boss.ability(this, botId, 8, now);
    else if (Math.random() < 0.05) Boss.ability(this, botId, 2 + Math.floor(Math.random() * 6), now);
  }

  fleeBoss(botId, player, entity, now) {
    let be = null;
    for (const [otherId, other] of this.players) {
      if (other.isBoss) be = this.gameState.entities[otherId];
    }
    if (!be || be.down || be.gone) return false;
    const bd = euclid(entity, be);
    const range = Math.min(48, 20 + 12 * (be.size || 1));
    if (bd > range) return false;
    if (now > (player.fightUntil || 0) && now > (player.fightRoll || 0)) {
      player.fightRoll = now + 9000;
      if (Math.random() < 0.35) player.fightUntil = now + 6000;
    }
    if (now < (player.fightUntil || 0) && bd > 9) return false;
    const half = this.getCurrentArea().halfSize - 3;
    const ax = entity.x - be.x;
    const az = entity.z - be.z;
    const al = Math.hypot(ax, az) || 1;
    const side = player.dodgeSide || (player.dodgeSide = Math.random() < 0.5 ? 1 : -1);
    const gx = Math.max(-half, Math.min(half, entity.x + (ax / al) * 14 + (-az / al) * side * 6));
    const gz = Math.max(-half, Math.min(half, entity.z + (az / al) * 14 + (ax / al) * side * 6));
    this.botSteer(player, entity, { x: gx, z: gz }, now, 0.5);
    if (!entity.input.moveX && !entity.input.moveZ) {
      entity.input.moveX = ax / al;
      entity.input.moveZ = az / al;
    }
    entity.input.slow = false;
    if (bd < 6) {
      const rollSlot = entity.hand.findIndex((sl) => sl && sl.chosen === 'rodar');
      if (rollSlot >= 0) this.useCard(botId, rollSlot);
    }
    player.nextThink = now + 120;
    return true;
  }

  botThink(now) {
    if (now - (this.lastBotThink || 0) < 100) return;
    this.lastBotThink = now;
    let humansOnline = false;
    for (const other of this.players.values()) {
      if (!other.isBot && other.ws && other.ws.readyState === 1) { humansOnline = true; break; }
    }
    if (!humansOnline) return;
    this.pathBudget = 1;
    for (const [botId, player] of this.players) {
      if (!player.isBot) continue;
      if (player.isBoss) {
        this.botBoss(botId, player, now);
        continue;
      }
      if (player.isAsymRole) {
        this.botCurator(botId, player, now);
        continue;
      }
      if (now < (player.nextThink || 0)) continue;
      player.nextThink = now + 160 + Math.random() * 120;
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
      const openSlot = entity.hand.find((slot) => !slot.chosen);
      if (openSlot && openSlot.options.length && now > (player.nextBotPick || 0)) {
        this.chooseCard(botId, 0, openSlot.options[Math.floor(Math.random() * openSlot.options.length)]);
        player.nextBotPick = now + 800;
      }
      let curatorEntity = null;
      let curatorDist = Infinity;
      for (const [otherId, other] of this.players) {
        if (!other.isAsymRole) continue;
        const ce = this.gameState.entities[otherId];
        if (ce) { curatorEntity = ce; curatorDist = euclid(entity, ce); }
      }
      let dodged = false;
      if (this.bossActive) {
        for (const [otherId, other] of this.players) {
          if (!other.isBoss) continue;
          const be = this.gameState.entities[otherId];
          if (!be) continue;
          const bd = euclid(entity, be);
          if (bd < curatorDist) { curatorEntity = be; curatorDist = bd; }
          const fx = be.bfx;
          if (fx && now - fx.t < 1100 && (fx.k === 2 || fx.k === 3 || fx.k === 8 || fx.k === 'm1') && bd < 40) {
            const ax = entity.x - be.x;
            const az = entity.z - be.z;
            const al = Math.hypot(ax, az) || 1;
            const side = (player.dodgeSide || (player.dodgeSide = Math.random() < 0.5 ? 1 : -1));
            entity.input.moveX = (-az / al) * side * 0.8 + (ax / al) * 0.4;
            entity.input.moveZ = (ax / al) * side * 0.8 + (az / al) * 0.4;
            player.nextThink = now + 120;
            dodged = true;
          }
        }
      }
      if (dodged) continue;
      if (this.bossActive && this.fleeBoss(botId, player, entity, now)) continue;
      const mind = player.mind || (player.mind = BotBrain.createMind());
      let fallen = 0;
      for (const pt of Object.values(this.gameState.patients)) if (pt.status !== 'alive') fallen++;
      BotBrain.feel(mind, { dist: curatorDist, hp: patient.hp, fallen }, now);
      this.botEmote(botId, player, entity, mind, now, curatorDist, 'patient');
      const [wantWork, wantEvade, wantRest] = BotBrain.think(mind, { dist: curatorDist, hpFrac: patient.hp / (patient.maxHp || 100), flo: entity.flojera / (entity.flojeraMax || 100) });
      let best = null;
      let bestDist = Infinity;
      let bestScore = Infinity;
      let keptTarget = null;
      for (const [objectId, pos] of Object.entries(this.gameState.selfDamageObjectPositions)) {
        const d = distanceBetween(entity, pos);
        const danger = curatorEntity ? Math.max(0, 14 - euclid(curatorEntity, pos)) : 0;
        const score = d + danger * (0.6 + 1.8 * mind.caution);
        if (objectId === player.sdTarget) keptTarget = { objectId, pos, d, score };
        if (score < bestScore) { bestScore = score; bestDist = d; best = { objectId, pos }; }
      }
      if (keptTarget && keptTarget.score <= bestScore * 1.3 + 2) {
        best = { objectId: keptTarget.objectId, pos: keptTarget.pos };
        bestDist = keptTarget.d;
      }
      if (!best) continue;
      player.sdTarget = best.objectId;
      if (wantRest > 0.55 && curatorDist > 8 && bestDist > INTERACTION_RADIUS) {
        entity.input.moveX = 0;
        entity.input.moveZ = 0;
        entity.input.slow = true;
        continue;
      }
      if (bestDist <= INTERACTION_RADIUS - 0.3 && !(wantEvade > 0.7 && curatorDist < 5 && !entity.selfDmg)) {
        entity.input.moveX = 0;
        entity.input.moveZ = 0;
        const sg = entity.selfDmg;
        if (sg) {
          const t = now - sg.startedAt;
          if (sg.type === 'rhythm') {
            if (sg.beats.some((b, i) => !sg.scored.includes(i) && Math.abs(t - b) <= 60) && Math.random() < 0.92) this.applySelfDamage(botId, best.objectId);
          } else if (sg.type === 'meter') {
            if (Math.abs(this.needlePos(sg, now) - 0.5) <= 0.1 && Math.random() < 0.5) this.applySelfDamage(botId, best.objectId);
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
        const fleeRange = 3 + 7 * wantEvade;
        if (curatorEntity && curatorDist < fleeRange) {
          const ax = entity.x - curatorEntity.x;
          const az = entity.z - curatorEntity.z;
          const al = Math.hypot(ax, az) || 1;
          const w = (0.6 + 1.6 * wantEvade) * (1 - curatorDist / fleeRange);
          const mx = entity.input.moveX + (ax / al) * w;
          const mz = entity.input.moveZ + (az / al) * w;
          const ml = Math.hypot(mx, mz) || 1;
          entity.input.moveX = mx / ml;
          entity.input.moveZ = mz / ml;
        }
        entity.input.slow = curatorDist > 9 && (entity.flojera < 20 || entity.flojeraLockedUntil > now);
      }
      if (curatorEntity && curatorDist < 2 + 2.5 * mind.fear) {
        const rollSlot = entity.hand.findIndex((sl) => sl && sl.chosen === 'rodar');
        if (rollSlot >= 0) this.useCard(botId, rollSlot);
      }
      if (now > (player.nextBotCard || 0)) {
        player.nextBotCard = now + (2200 + 2500 * (1 - mind.confidence)) + Math.random() * 3500;
        const slotIndex = Math.floor(Math.random() * entity.hand.length);
        if (entity.hand[slotIndex]?.chosen) this.useCard(botId, slotIndex);
      }
    }
  }

  isFull() {
    return this.players.size >= MAX_PLAYERS;
  }

  playerCount() {
    let n = 0;
    for (const pl of this.players.values()) if (!pl.isBot) n++;
    return n;
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
      paraFrom: 0,
      paraUntil: 0,
      paraOn: false,
      respiroUntil: 0,
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
    for (const kind of Object.keys(this.votes)) {
      delete this.votes[kind][playerId];
      for (const [voter, v] of Object.entries(this.votes[kind])) if (v === playerId) delete this.votes[kind][voter];
    }
    delete this.gameState.entities[playerId];
    delete this.gameState.patients[playerId];
    this.lastChatAt.delete(playerId);
    if (this.hostId === playerId) {
      const next = this.players.keys().next();
      this.hostId = next.done ? null : next.value;
    }
    // Si el Curador se desconecta en el lobby, la sala se queda sin nadie
    // en ese rol. Se lo reasignamos a otro jugador para que la partida
    // siga siendo iniciable, igual que pasa al entrar el primer jugador.
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
          ? { displayName: characterData.displayName, weaponName: characterData.weaponName, skills: Characters.publicSkills(characterData, CustomCards.healerSkills(this.mapId)) }
          : null,
      };
    });
  }

  /**
   * Cambia el nombre visible del jugador dentro de esta sala (chat,
   * lista de jugadores, cartel de fin de partida). El nombre "real" de
   * la cuenta/invitado vive en el JWT y se actualiza aparte vía HTTP
   * (/auth/update-name), esto solo mantiene en sincro lo que ya se
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
    if (requesterId !== this.hostId || this.isDefault) {
      this.sendTo(requesterId, MessageType.ERROR, { message: this.isDefault ? 'En las salas predeterminadas el Curador se vota' : 'Solo el host puede asignar quién es el Curador' });
      return;
    }
    if (targetPlayerId === 'random') {
      const hs = [...this.players.entries()].filter(([, p]) => !p.isBot).map(([id]) => id);
      if (hs.length) targetPlayerId = hs[Math.floor(Math.random() * hs.length)];
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
   * El host elige qué mapa se juega la próxima partida, solo en el
   * lobby. mapId debe existir en el catálogo de GameMap (incluye los
   * mapas guardados desde el editor visual).
   */
  castVote(playerId, kind, value) {
    if (!this.isDefault || this.phase !== 'lobby') return;
    const player = this.players.get(playerId);
    if (!player || player.isBot || !this.votes[kind]) return;
    if (kind === 'bots') {
      if (![0, 4, 8, 12, 16].includes(value)) return;
    } else if (kind === 'map') {
      if (!GameMap.MAPS[value] || String(value).startsWith('c_')) return;
    } else if (kind === 'mutation') {
      if (!MUTATIONS[value]) return;
    } else if (kind === 'mode') {
      if (!MODES.includes(value) || !this.modeVoteOpen()) return;
    } else if (kind === 'curator') {
      const target = this.players.get(value);
      if (value !== 'random' && (!target || target.isBot)) return;
    }
    if (this.votes[kind][playerId] === value) delete this.votes[kind][playerId];
    else this.votes[kind][playerId] = value;
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId, votes: this.votes, modeVoteOpen: this.modeVoteOpen() });
  }

  bossSize(playerId, size) {
    if (this.bossActive && this.players.get(playerId)?.isBoss) Boss.setSize(this, playerId, size, Date.now());
  }

  bossCrouch(playerId, on) {
    if (this.bossActive && this.players.get(playerId)?.isBoss) Boss.setCrouch(this, playerId, on);
  }

  setBoss(requesterId, on, bossId) {
    if (this.phase !== 'lobby' || requesterId !== this.hostId || this.isDefault) return;
    this.bossOn = Boolean(on);
    this.bossId = bossId && bossId !== 'random' && this.players.has(bossId) ? bossId : null;
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId, bossOn: this.bossOn, bossId: this.bossId });
  }

  modeVoteOpen() {
    return (this.matchCount + 1) % 4 === 0;
  }

  setMode(requesterId, mode, secondId) {
    if (this.phase !== 'lobby' || requesterId !== this.hostId || this.isDefault || !MODES.includes(mode)) return;
    this.mode = mode;
    this.secondCuratorId = mode === 'dual' && secondId && secondId !== 'random' && this.players.has(secondId) ? secondId : null;
    this.secondCuratorRandom = mode === 'dual' && (!secondId || secondId === 'random');
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId, mode: this.mode, secondCuratorId: this.secondCuratorId, secondCuratorRandom: Boolean(this.secondCuratorRandom) });
  }

  clearSecondCurator() {
    for (const p of this.players.values()) {
      if (p.isSecondCurator) { p.isAsymRole = false; p.isSecondCurator = false; }
      p.curatorMult = 1;
      p.curatorSpeed = 1;
    }
  }

  applyMode() {
    this.clearSecondCurator();
    this.sharedHp = null;
    this.modeStart = Date.now();
    this.infectionInit = false;
    this.infectionLms = false;
    this.lastGravityFactor = 1;
    if (this.mode !== 'dual') return;
    const main = [...this.players.entries()].find(([, p]) => p.isAsymRole);
    if (!main) return;
    let second = this.secondCuratorId && this.secondCuratorId !== main[0] && this.players.has(this.secondCuratorId) ? this.secondCuratorId : null;
    if (!second) {
      const cands = [...this.players.entries()].filter(([id, p]) => id !== main[0] && !p.isBot).map(([id]) => id);
      const bots = [...this.players.entries()].filter(([id, p]) => id !== main[0] && p.isBot).map(([id]) => id);
      const list = cands.length ? cands : bots;
      second = list.length ? list[Math.floor(Math.random() * list.length)] : null;
    }
    if (!second) { this.mode = 'normal'; return; }
    const sp = this.players.get(second);
    sp.isAsymRole = true;
    sp.isSecondCurator = true;
    if (!sp.characterId) sp.characterId = Characters.DEFAULT_CHARACTER_ID;
    main[1].curatorMult = 1.3; main[1].curatorSpeed = 0.88;
    sp.curatorMult = 0.7; sp.curatorSpeed = 1.12;
  }

  modeGravityFactor(now) {
    if (this.mode !== 'gravity' || this.phase !== 'action') return 1;
    if (this.gameState.lms) return 0.45;
    const t = (((now - (this.modeStart || now)) / 1000) % 60 + 60) % 60;
    return t < 25 ? 1 : t < 40 ? 0.45 : t < 45 ? 1 : 1.6;
  }

  tickGravityMode(now) {
    const f = this.modeGravityFactor(now);
    if (f === this.lastGravityFactor) return;
    this.lastGravityFactor = f;
    this.broadcast(MessageType.MODE_EVENT, { kind: 'gravity', factor: f });
  }

  tickInfection(now, dt) {
    const gs = this.gameState;
    const pats = Object.entries(gs.patients).filter(([, p]) => p.status === 'alive');
    if (!this.infectionInit && pats.length) {
      this.infectionInit = true;
      const [, first] = pats[Math.floor(Math.random() * pats.length)];
      first.infected = true;
    }
    if (gs.lms && !this.infectionLms) {
      this.infectionLms = true;
      for (const [, p] of pats) p.infected = true;
    }
    const infected = pats.filter(([, p]) => p.infected);
    for (const [, p] of infected) p.hp = Math.max(PATIENT_HP_MIN + 1, p.hp - 0.5 * dt);
    for (const [id, p] of pats) {
      if (p.infected) continue;
      const e = gs.entities[id];
      if (!e) continue;
      const near = infected.some(([iid]) => gs.entities[iid] && distanceBetween(e, gs.entities[iid]) < 2.5);
      p.contagion = near ? (p.contagion || 0) + dt : Math.max(0, (p.contagion || 0) - dt);
      if (p.contagion >= 4) { p.infected = true; p.contagion = 0; }
    }
  }

  sendHeartbeats() {
    const gs = this.gameState;
    const curators = [...this.players.entries()].filter(([, p]) => p.isAsymRole).map(([id]) => gs.entities[id]).filter(Boolean);
    for (const [id, p] of this.players) {
      if (p.isBot || p.isAsymRole) continue;
      const patient = gs.patients[id];
      const entity = gs.entities[id];
      if (!patient || patient.status !== 'alive' || !entity) continue;
      let d = Infinity;
      for (const c of curators) d = Math.min(d, distanceBetween(entity, c));
      const level = d >= HEART_RANGE ? 0 : Math.round((1 - d / HEART_RANGE) * 100) / 100;
      this.sendTo(id, MessageType.HEARTBEAT, { level });
    }
  }

  tickMode(now, dt = 0.05) {
    if (this.phase !== 'action') return;
    if (this.mode === 'infection') { this.tickInfection(now, dt); return; }
    if (this.mode === 'gravity') { this.tickGravityMode(now); return; }
    if (this.mode !== 'shared') return;
    const entries = Object.values(this.gameState.patients);
    const alive = entries.filter((p) => p.status === 'alive');
    if (!alive.length) return;
    const ended = entries.find((p) => p.status === 'eliminated' || p.status === 'self_won');
    if (ended) {
      for (const p of alive) {
        p.status = ended.status;
        p.hp = ended.hp;
        if (ended.status === 'eliminated') this.onPatientFullyCured();
      }
      this.checkGameEndConditions();
      return;
    }
    let shared = this.sharedHp == null ? alive[0].hp : this.sharedHp;
    let sum = 0;
    for (const p of alive) sum += p.hp - shared;
    shared = Math.max(PATIENT_HP_MIN, Math.min(alive[0].maxHp, shared + sum));
    for (const p of alive) p.hp = shared;
    this.sharedHp = shared;
    if (shared <= PATIENT_HP_MIN) for (const p of alive) p.status = 'self_won';
    else if (shared >= alive[0].maxHp) { for (const p of alive) { p.status = 'eliminated'; this.onPatientFullyCured(); } }
    else return;
    this.checkGameEndConditions();
  }

  voteWinner(kind) {
    const counts = new Map();
    for (const v of Object.values(this.votes[kind])) counts.set(v, (counts.get(v) || 0) + 1);
    if (!counts.size) return null;
    const top = Math.max(...counts.values());
    const tied = [...counts.entries()].filter(([, n]) => n === top).map(([v]) => v);
    return tied[Math.floor(Math.random() * tied.length)];
  }

  prepareMap() {
    this.mapChoice = this.mapId;
    if (this.mapId === 'random') {
      this.mapSeed = this.mapSeedWanted != null ? this.mapSeedWanted : Math.floor(Math.random() * 1000000000);
      this.mapId = GameMap.generateMap(this.mapSeed);
    }
  }

  restoreMap() {
    if (this.mapChoice) this.mapId = this.mapChoice;
    this.mapChoice = null;
  }

  applyVotes() {
    const map = this.voteWinner('map');
    if (map) this.mapId = map;
    const mutation = this.voteWinner('mutation');
    if (mutation) this.mutation = mutation;
    this.mode = this.modeVoteOpen() ? (this.voteWinner('mode') || 'normal') : 'normal';
    const bots = this.voteWinner('bots');
    if (bots !== null && !this.tutorial) {
      for (const [id, p] of [...this.players.entries()]) if (p.isBot) this.removePlayer(id);
      const humans = this.players.size;
      const target = Math.min(bots, 20 - humans);
      for (let i = 0; i < target; i++) {
        this.botCounter = (this.botCounter || 0) + 1;
        const botId = `bot-${this.botCounter}`;
        this.addPlayer(botId, { readyState: 0, send() {} }, `Bot ${this.botCounter}`);
        this.players.get(botId).isBot = true;
      }
    }
    let curator = this.voteWinner('curator');
    const humanIds = [...this.players.entries()].filter(([, p]) => !p.isBot).map(([id]) => id);
    if (curator === 'random' && humanIds.length) curator = humanIds[Math.floor(Math.random() * humanIds.length)];
    if (this.bossOn && this.bossId && curator === this.bossId) {
      const others = [...this.players.entries()].filter(([id]) => id !== this.bossId);
      const humansLeft = others.filter(([, p]) => !p.isBot);
      const pool = humansLeft.length ? humansLeft : others;
      if (pool.length) curator = pool[Math.floor(Math.random() * pool.length)][0];
    }
    if (curator && this.players.has(curator)) {
      for (const [id, p] of this.players) {
        const was = p.isAsymRole;
        p.isAsymRole = id === curator;
        if (p.isAsymRole && !was && !p.characterId) p.characterId = Characters.DEFAULT_CHARACTER_ID;
      }
    }
    this.votes = { bots: {}, map: {}, mutation: {}, curator: {}, mode: {} };
  }

  setMutation(requesterId, id) {
    if (this.phase !== 'lobby' || requesterId !== this.hostId || this.isDefault || !MUTATIONS[id]) return;
    this.mutation = id;
    this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId, mutation: this.mutation });
  }

  setMap(requesterId, mapId, loaded, seed) {
    if (!loaded && !GameMap.MAPS[mapId] && typeof mapId === 'string' && mapId.startsWith('c_')) {
      require('./community').ensureMap(mapId).then(() => this.setMap(requesterId, mapId, true)).catch(() => this.sendTo(requesterId, MessageType.ERROR, { message: 'Ese mapa no existe' }));
      return;
    }
    if (this.phase !== 'lobby') {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Solo se puede cambiar el mapa antes de iniciar la partida' });
      return;
    }
    if (requesterId !== this.hostId || this.isDefault) {
      this.sendTo(requesterId, MessageType.ERROR, { message: this.isDefault ? 'En las salas predeterminadas el mapa se vota' : 'Solo el host puede elegir el mapa' });
      return;
    }
    if (!GameMap.MAPS[mapId]) {
      this.sendTo(requesterId, MessageType.ERROR, { message: 'Ese mapa no existe' });
      return;
    }
    this.mapId = mapId;
    const n = Math.floor(Number(seed));
    this.mapSeedWanted = mapId === 'random' && Number.isFinite(n) && n >= 0 && n < 1e9 ? n : null;
    this.broadcast(MessageType.ROOM_UPDATE, {
      players: this.getPlayersSummary(),
      hostId: this.hostId,
      mapId: this.mapId,
      mapSeedWanted: this.mapSeedWanted,
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
      if (!player.isAsymRole && !player.isBoss) patientIds.push(playerId);
    }
    const patientSpawns = GameMap.getPatientSpawnPositions(patientIds.length, GameMap.areaFor(this.mapId), this.mapId);
    const curatorSpawn = GameMap.getCuratorSpawn(this.mapId);

    let patientIndex = 0;
    for (const [playerId, player] of this.players) {
      const entity = this.gameState.entities[playerId];
      if (!entity) continue;

      if (player.isBoss) {
        const half = GameMap.areaFor(this.mapId).halfSize * 0.95;
        let cx = 0;
        let cz = 0;
        for (const sp of patientSpawns) { cx += sp.x; cz += sp.z; }
        const n = Math.max(1, patientSpawns.length);
        cx = cx / n - curatorSpawn.x;
        cz = cz / n - curatorSpawn.z;
        let len = Math.hypot(cx, cz);
        if (len < 4) { cx = 0; cz = -1; len = 1; }
        const spot = Boss.freeSpot(this, curatorSpawn, -cx / len, -cz / len, half);
        entity.x = spot.x;
        entity.z = spot.z;
      } else if (player.isAsymRole) {
        entity.x = curatorSpawn.x;
        entity.z = curatorSpawn.z;
      } else {
        const spawn = patientSpawns[patientIndex];
        entity.x = spawn.x;
        entity.z = spawn.z;
        patientIndex++;
        this.gameState.patients[playerId] = this.tutorial
          ? { hp: PATIENT_HP_START, status: 'alive', maxHp: TUTORIAL_PATIENT_HP_MAX }
          : { hp: PATIENT_HP_START, status: 'alive', maxHp: PATIENT_HP_MAX };
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
      entity.astral = null;
      entity.eating = null;
      entity.selfDmg = null;
      entity.carry = null;
      entity.perezaLevel = 0;
      entity.acetilUntil = 0;
      entity.paraFrom = 0;
      entity.paraUntil = 0;
      entity.paraOn = false;
      entity.respiroUntil = 0;
      entity.regenBlockedUntil = 0;
      entity.fatigueUntil = 0;
      entity.allyBoostUntil = 0;
      entity.allyBoostLevel = 0;
      entity.fx = {};
      entity.corpse = false;
      entity.gone = false;
      this.gameState.ghosts = {};
      entity.hand = player.isAsymRole || player.isBoss ? [] : Cards.dealSlots(GameMap.getCustomCards(this.mapId));
      entity.role = null;
      entity.rerolls = Cards.REROLLS;
      entity.draftEndsAt = player.isAsymRole || player.isBoss ? 0 : Date.now() + Cards.DRAFT_DURATION_MS;
    }

    this.gameState.patientsInitialCount = patientIds.length;
    this.gameState.timeRemainingMs = GAME_DURATION_MS;
    this.gameState.gameOver = false;
    this.gameState.desgracias = {};
    this.gameState.lastStanding = false;
    this.gameState.lms = null;

    this.lastRelocateAt = Date.now();
    this.gameState.zones = [];
    for (const sr of GameMap.resolveSerums(this.mapId, GameMap.areaFor(this.mapId))) {
      this.gameState.zones.push({ id: `sr_${sr.id}`, kind: 'serum', x: sr.x, z: sr.z, y: sr.y, radius: SERUM_RADIUS, ownerId: null, until: Infinity, activeUntil: Date.now() + SERUM_ACTIVE_MS, armedAt: undefined });
    }
    this.gameState.curator = { hp: CURATOR_HP_START, max: CURATOR_HP_MAX };
    this.gameState.curatorDown = false;
    Boss.setup(this);
    this.gameState.selfDamageObjectPositions = {};
    this.gameState.selfDamageTypes = {};
    const selfDamagePositions = this.selfDamageCandidates();
    this.fixedMinigames = {};
    for (const o of GameMap.resolveSelfDamagePositions(this.mapId, GameMap.areaFor(this.mapId))) if (o.minigame) this.fixedMinigames[o.id] = o.minigame;
    this.gameState.eventsFired = {};
    this.gameState.eventsView = [];
    this.gameState.hiddenPlatforms = [];
    this.gameState.moduleCarry = {};
    this.gameState.moduleHandler = {};
    this.gameState.plankHp = {};
    this.gameState.plankBroken = {};
    this.gameState.blockHp = {};
    this.gameState.blockBroken = {};
    for (const bp of GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId))) {
      if (bp.blockMax > 0) this.gameState.blockHp[bp.id] = Math.round(bp.blockMax * 0.35);
    }
    for (const obj of selfDamagePositions) {
      this.gameState.selfDamageObjectPositions[obj.id] = { x: obj.x, y: obj.y, z: obj.z };
      this.gameState.selfDamageTypes[obj.id] = this.randomMinigame(obj.id);
    }
  }

  eventPhases() {
    const elapsed = GAME_DURATION_MS - this.gameState.timeRemainingMs;
    const out = [];
    for (const ev of GameMap.getEvents(this.mapId)) {
      if (ev.permanent) {
        const t0 = ev.startSec * 1000;
        if (elapsed >= t0) out.push({ ev, phase: 'active', k: 0, msLeft: 0 });
        else if (elapsed >= t0 - ev.warnSec * 1000) out.push({ ev, phase: 'warn', k: 0, msTo: t0 - elapsed });
        continue;
      }
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

  isInvisible(entity, now) {
    return Boolean(entity) && entity.paraUntil > now && entity.paraFrom <= now;
  }

  breakParaguay(playerId, now) {
    const entity = this.gameState.entities[playerId];
    if (!entity || !this.isInvisible(entity, now)) return;
    entity.paraUntil = 0;
    entity.paraFrom = 0;
    entity.paraOn = false;
    Status.apply(entity, 'slow', PARAGUAY_HIT_END_MS, now, { tag: 'endlag', level: 3 });
  }

  tickEvents(now) {
    const phases = this.eventPhases();
    this.gameState.eventsView = phases;
    const hidden = [];
    for (const ev of GameMap.getEvents(this.mapId)) {
      if (!ev.targetId) continue;
      const active = phases.some((p) => p.ev === ev && p.phase === 'active');
      if ((ev.kind === 'collapse' && active) || (ev.kind === 'appear' && !active)) hidden.push(ev.targetId);
    }
    for (const id of Object.keys(this.gameState.blockBroken || {})) hidden.push(id);
    const broken = this.gameState.plankBroken || {};
    for (const id of Object.keys(broken)) {
      if (broken[id] <= now) {
        delete broken[id];
        delete this.gameState.plankHp[id];
      } else hidden.push(id);
    }
    const prev = this.gameState.hiddenPlatforms || [];
    this.gameState.hiddenPlatforms = [...new Set(hidden)];
    const nowHidden = new Set(this.gameState.hiddenPlatforms);
    const appeared = prev.filter((id) => !nowHidden.has(id));
    if (appeared.length) this.liftFromAppeared(appeared);
    this.gameState.eventsFired = this.gameState.eventsFired || {};
    for (const p of phases) {
      if (p.phase !== 'active') continue;
      const key = `${p.ev.id}:${p.k}`;
      if (p.ev.kind === 'alarm') {
        for (const [id, patient] of Object.entries(this.gameState.patients)) {
          const ent = this.gameState.entities[id];
          if (patient.status === 'alive' && ent && !this.isInvisible(ent, now)) Status.apply(ent, 'reveal', 400, now);
        }
      }
      if (p.ev.kind === 'shuffle' && !this.gameState.eventsFired[key]) {
        this.gameState.eventsFired[key] = true;
        this.relocateSelfDamageObjects(now);
        this.gameState.selfDamageTypes = {};
        for (const id of Object.keys(this.gameState.selfDamageObjectPositions)) this.gameState.selfDamageTypes[id] = this.randomMinigame(id);
      }
    }
  }

  blockNear(px, pz, y, radius) {
    const out = [];
    for (const p of GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId))) {
      if (!(p.blockMax > 0)) continue;
      const y0 = p.y0 || 0;
      if (y > y0 + p.h + 0.6 || y + 2 < y0) continue;
      const nx = Math.max(p.x - p.hx, Math.min(p.x + p.hx, px));
      const nz = Math.max(p.z - p.hz, Math.min(p.z + p.hz, pz));
      if (Math.hypot(nx - px, nz - pz) <= radius) out.push(p);
    }
    return out;
  }

  healBlocks(owner, reach, radius, around, now) {
    const gs = this.gameState;
    if (!gs.blockHp) return;
    const px = around ? owner.x : owner.x + (owner.faceX || 0) * reach;
    const pz = around ? owner.z : owner.z + (owner.faceX || owner.faceZ ? owner.faceZ || 0 : 1) * reach;
    const amount = CURE_AMOUNT * (owner.cureBoostUntil > now ? owner.cureBoostFactor : 1);
    for (const p of this.blockNear(px, pz, owner.y || 0, radius + 0.3)) {
      if (gs.blockBroken[p.id]) continue;
      gs.blockHp[p.id] = Math.min(p.blockMax, (gs.blockHp[p.id] ?? 0) + amount);
      if (gs.blockHp[p.id] >= p.blockMax) {
        gs.blockBroken[p.id] = true;
        gs.hiddenPlatforms = [...new Set([...(gs.hiddenPlatforms || []), p.id])];
        this.navCache = null;
      }
    }
  }

  repairBlock(playerId) {
    const gs = this.gameState;
    const entity = gs.entities[playerId];
    const patient = gs.patients[playerId];
    if (!entity || !patient || patient.status !== 'alive' || this.players.get(playerId)?.isAsymRole) return;
    const now = Date.now();
    if (now < (entity.nextRepairAt || 0)) return;
    const near = this.blockNear(entity.x, entity.z, entity.y || 0, 2.2);
    if (!near.length) return;
    entity.nextRepairAt = now + 300;
    const p = near[0];
    gs.blockHp[p.id] = Math.max(0, (gs.blockHp[p.id] ?? 0) - 9);
    if (gs.blockBroken[p.id] && gs.blockHp[p.id] <= p.blockMax * 0.5) {
      delete gs.blockBroken[p.id];
      gs.hiddenPlatforms = (gs.hiddenPlatforms || []).filter((id) => id !== p.id);
      this.liftFromAppeared([p.id]);
      this.navCache = null;
    }
  }

  healSpears(owner, reach, radius, around, now) {
    const px = around ? owner.x : owner.x + (owner.faceX || 0) * reach;
    const pz = around ? owner.z : owner.z + (owner.faceX || owner.faceZ ? owner.faceZ || 0 : 1) * reach;
    for (const z of this.gameState.zones) {
      if ((z.kind !== 'spear' && z.kind !== 'trap') || now >= z.until) continue;
      if (Math.abs((owner.y || 0) - (z.y || 0)) > 1.6) continue;
      if (Math.hypot(z.x - px, z.z - pz) > radius + 0.8) continue;
      const amount = CURE_AMOUNT * (owner.cureBoostUntil > now ? owner.cureBoostFactor : 1);
      if (z.kind === 'trap') z.healBonus = (z.healBonus || 0) + amount;
      else z.hp += amount;
    }
  }

  hitPlanks(owner, reach, radius, around, now) {
    const planks = GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId)).filter((p) => p.hp > 0 && !(this.gameState.plankBroken || {})[p.id]);
    if (!planks.length) return;
    const fx = owner.faceX || 0;
    const fz = owner.faceX || owner.faceZ ? owner.faceZ || 0 : 1;
    const px = around ? owner.x : owner.x + fx * reach;
    const pz = around ? owner.z : owner.z + fz * reach;
    for (const p of planks) {
      const y0 = p.y0 || 0;
      if (owner.y > y0 + p.h + 0.6 || owner.y + 2 < y0) continue;
      const nx = Math.max(p.x - p.hx, Math.min(p.x + p.hx, px));
      const nz = Math.max(p.z - p.hz, Math.min(p.z + p.hz, pz));
      if (Math.hypot(nx - px, nz - pz) > radius + 0.3) continue;
      const left = (this.gameState.plankHp[p.id] === undefined ? p.hp : this.gameState.plankHp[p.id]) - 1;
      if (left > 0) {
        this.gameState.plankHp[p.id] = left;
      } else {
        this.gameState.plankHp[p.id] = 0;
        this.gameState.plankBroken[p.id] = p.regenMs > 0 ? now + p.regenMs : Infinity;
        this.gameState.hiddenPlatforms = [...new Set([...(this.gameState.hiddenPlatforms || []), p.id])];
        this.navCache = null;
      }
    }
  }

  liftFromAppeared(ids) {
    const plats = GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId)).filter((p) => ids.includes(p.id));
    for (const ent of Object.values(this.gameState.entities)) {
      for (const pl of plats) {
        const top = Hitbox.platformTop(pl, ent.x, ent.z);
        if (top !== null && ent.y < top - 0.05) {
          ent.y = top;
          ent.vy = 0;
          ent.onGround = true;
        }
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
      target: p.ev.targetId || null,
      permanent: Boolean(p.ev.permanent),
      kind: p.ev.kind,
      mode: p.ev.mode,
      phase: p.phase,
      ms: p.phase === 'warn' ? p.msTo : p.msLeft,
      warnMs: p.ev.warnSec * 1000,
      durMs: p.ev.durSec * 1000,
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
    const used = Object.entries(this.gameState.selfDamageTypes || {}).filter(([id]) => id !== objectId).map(([, t]) => t);
    const count = (list) => used.filter((t) => list.includes(t)).length;
    const hard = ['lock', 'keys'];
    const roll = Math.random();
    let pool = roll < 0.1 ? hard : roll < 0.3 ? SD_EASY : SD_NORMAL;
    if (pool === hard && count(hard) >= 2) pool = SD_NORMAL;
    if (pool === SD_EASY && count(SD_EASY) >= 2) pool = SD_NORMAL;
    let free = pool.filter((t) => !used.includes(t));
    if (!free.length) free = [...SD_NORMAL, ...SD_EASY].filter((t) => !used.includes(t));
    if (!free.length) free = pool;
    return free[Math.floor(Math.random() * free.length)];
  }

  startMatch() {
    if (this.isDefault) this.applyVotes();
    this.matchCount += 1;
    this.applyMode();
    Boss.prepare(this);
    this.prepareMap();
    this.switchPhase('action', 'inicio de partida');
    this.startAt = null;
    this.broadcast(MessageType.GAME_STARTED, {
      phase: 'action',
      mapSeed: this.mapChoice === 'random' ? this.mapSeed : null,
      state: this.gameState,
      collisionObjects: GameMap.resolveCollisionObjects(this.mapId, GameMap.areaFor(this.mapId)),
      platforms: GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId)),
      halfSize: GameMap.areaFor(this.mapId).halfSize,
      roles: Roles.list(Cards),
      hitbox: { half: PLAYER_HALF, height: PLAYER_HEIGHT, interact: INTERACTION_RADIUS },
    });
  }

  tickLobbyTimer(now) {
    const humans = this.playerCount();
    if (humans === 0 || this.tutorial) {
      if (this.startAt) {
        this.startAt = null;
        this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId, startAt: null });
      }
      return;
    }
    if (!this.startAt) {
      this.startAt = now + LOBBY_WAIT_MS;
      this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId, startAt: this.startAt });
      return;
    }
    if (now < this.startAt) return;
    const wouldBe = this.players.size + (this.voteWinner('bots') || 0);
    if (wouldBe < 2) {
      this.startAt = now + LOBBY_WAIT_MS;
      this.broadcast(MessageType.ROOM_UPDATE, { players: this.getPlayersSummary(), hostId: this.hostId, startAt: this.startAt });
      return;
    }
    this.startMatch();
  }

  tick() {
    this.tickCount++;
    const now = Date.now();
    if (this.isDefault && this.phase === 'lobby') this.tickLobbyTimer(now);
    const elapsedMs = now - (this.lastTickAt || now);
    const dt = Math.min(elapsedMs, 100) / 1000;
    this.lastTickAt = now;

    if (this.phase === 'action' && !this.gameState.gameOver) {
      this.gameState.timeRemainingMs = Math.max(0, this.gameState.timeRemainingMs - elapsedMs);
      if (this.gameState.timeRemainingMs === 0) this.endGame('timeout');
    }

    if (this.phase === 'action' && !this.gameState.gameOver) {
      this.tickEvents(now);
      this.checkLastStanding();
    }
    this.stepPhysics(dt);
    this.tickGhosts(dt);
    this.tickPereza(now, dt);
    if (this.phase === 'action' && !this.gameState.gameOver) {
      this.botThink(now);
      this.autoPickExpiredDrafts(now);
      this.tickZones(now, dt);
      Boss.tick(this, now, dt);
      this.tickAstral(now, dt);
      this.tickEating(now);
      this.tickCarry();
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
        invis: this.isInvisible(entity, now),
        carry: entity.carry || undefined,
        boss: this.players.get(entityPlayerId)?.isBoss || undefined,
        size: entity.size && entity.size !== 1 ? entity.size : undefined,
        sk: entity.strikeAt || undefined,
        bhp: entity.hp !== undefined ? entity.hp : undefined,
        bmax: entity.hpMax || undefined,
        bfx: entity.bfx || undefined,
        shadow: entity.shadow ? { x: Math.round(entity.shadow.x * 10) / 10, z: Math.round(entity.shadow.z * 10) / 10 } : undefined,
        live: (entity.liveUntil || 0) > now || undefined,
        scn: (entity.scanUntil || 0) > now || undefined,
        bhold: entity.holdUntil && entity.holdUntil > now ? Math.ceil((entity.holdUntil - now) / 1000) : undefined,
        blue: (entity.drunkUntil || 0) > now || undefined,
        cr: entity.crouch || undefined,
        dark: entity.tpAt ? true : undefined,
        cen: (entity.censorUntil || 0) > now || undefined,
        red: (entity.redUntil || 0) > now ? entity.redKind : undefined,
        ult: entity.ultAt || undefined,
        vm: entity.vmode,
        bcd: entity.bcdPub,
        tpMark: entity.tpMark ? { x: Math.round(entity.tpMark.x * 10) / 10, z: Math.round(entity.tpMark.z * 10) / 10 } : undefined,
        fat: entity.fatiga ? Math.round(entity.fatiga * 10) / 10 : undefined,
        debt: entity.debt ? Math.round(entity.debt * 10) / 10 : undefined,
        down: entity.down || undefined,
        sp: entity.sp !== undefined ? Math.round(entity.sp) : undefined,
        spe: entity.spPub,
        hh: entity.bossHitHalf ? Math.round(entity.bossHitHalf * 100) / 100 : undefined,
        hv: entity.bossHitH ? Math.round(entity.bossHitH * 100) / 100 : undefined,
        sg: entity.sig && entity.sig.until > Date.now() ? entity.sig.m : undefined,
        tem: entity.temblor ? Math.round(entity.temblor) : undefined,
        emote: entity.emote && Status.active(entity, 'emote', now) ? { id: entity.emote.id } : undefined,
        hold: entity.astral ? (entity.astral.state === 'charging' ? 'claw' : 'claw_ready') : entity.eating ? `eat_${entity.eating.cardId}` : entity.channel && entity.channel.endsAt > now ? 'horn' : entity.carry ? 'module' : undefined,
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
    const zones = this.gameState.zones.map((z) => ({ id: z.id, kind: z.kind, y: z.y || 0, level: z.level || 0, cardId: z.cardId || null, x: z.x, z: z.z, radius: z.radius, mode: z.mode || null, dx: z.dx || 0, dz: z.dz || 0, armed: z.armedAt === undefined || now >= z.armedAt }));

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
          astral: own.astral ? { state: own.astral.state, charge: own.astral.state === 'charging' ? Math.min(1, (now - own.astral.startedAt) / own.astral.cfg.chargeMs) : own.astral.charge, readyMs: Math.max(0, own.astral.readyAt - now), slot: own.astral.slot } : null,
          cooldowns: { cards: own.cardCooldowns, skills: own.skillCooldowns },
        };
      }
      const snapFull = {
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
        hiddenPlatforms: this.gameState.hiddenPlatforms || [],
        plankHp: this.gameState.plankHp || {},
        blockHp: this.gameState.blockHp || {},
        blockBroken: this.gameState.blockBroken || {},
        spawnMs: player.isAsymRole ? Math.max(0, (this.gameState.curatorReleaseAt || 0) - now) : 0,
        zones: player.isAsymRole ? zones.map((z) => (z.mode ? { ...z, mode: null } : z)) : zones,
        revealed: player.isAsymRole ? Object.entries(this.gameState.entities).filter(([, e]) => Status.active(e, 'reveal', now) && !this.isInvisible(e, now)).map(([id]) => id) : [],
      };
      this.sendTo(playerId, MessageType.STATE_SNAPSHOT, Delta.diff(player, snapFull, this.tickCount));
    }
  }

  tickGhosts(dt) {
    const half = this.getCurrentArea().halfSize;
    const hiddenIds = this.gameState.hiddenPlatforms || [];
    const platforms = this.phase === 'action' ? GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId)).filter((p) => !hiddenIds.includes(p.id)) : [];
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
    if (this.isInvisible(entity, now)) add('paraguayizador', 1, entity.paraUntil);
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
    const hiddenIds = this.gameState.hiddenPlatforms || [];
    const allPlatforms =
      this.phase === 'action' ? GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId)).filter((p) => !hiddenIds.includes(p.id)) : this.phase === 'lobby' ? GameMap.LOBBY_PLATFORMS : [];
    const gates = this.gatesState();
    const curPlatforms = gates === 'lock' ? allPlatforms : allPlatforms.filter((p) => p.kind !== 'gate');
    const patPlatforms = (gates === 'open' ? curPlatforms : allPlatforms).filter((p) => p.kind !== 'pgate');

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
        if (!RagdollBody.step(entity.rag, entity, (gx, gz, gy) => Math.min(groundAt(platforms, gx, gz, gy, 0.3), (entity.y || 0) + 4), dt)) entity.rag = RagdollBody.create(entity, now);
      } else {
        if (entity.rag && !resolved && inAction) this.endlagSlow(entity, now, GETUP_ENDLAG_MS);
        entity.rag = null;
      }
      if (entity.paraUntil) {
        if (now >= entity.paraUntil) {
          entity.paraUntil = 0;
          entity.paraFrom = 0;
          entity.paraOn = false;
          Status.apply(entity, 'slow', PARAGUAY_END_MS, now, { tag: 'endlag', level: 2 });
        } else if (now >= entity.paraFrom && !entity.paraOn) {
          entity.paraOn = true;
          Status.clear(entity, 'reveal');
        }
      }
      const invisible = this.isInvisible(entity, now);
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
      speedMultiplier *= Status.speedFactor(entity, now) * Boss.speedFactor(this, this.players.get(entityPlayerId), entity);
      if (!this.players.get(entityPlayerId)?.isAsymRole) speedMultiplier *= MUTATIONS[this.mutation].speed;
      else speedMultiplier *= this.players.get(entityPlayerId)?.curatorSpeed || 1;
      if (entity.channel || entity.selfDmg) speedMultiplier *= CHANNEL_SLOW;
      if (entity.carry) speedMultiplier *= MODULE_CARRY_SLOW;
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
      entity.respiro = (resting && now - entity.idleSince >= REST_DELAY_MS) || entity.respiroUntil > now;
      if (entity.respiro && entity.flojeraLockedUntil > now) entity.flojeraLockedUntil -= dt * 1000;

      if (inAction && entity.acetilUntil > now) {
        if (isMoving && entity.flojera > 0 && !input.slow) {
          entity.flojera = Math.max(0, entity.flojera - FLOJERA_DRAIN_PER_SEC * ACETIL_DRAIN_FACTOR * dt);
          if (entity.flojera <= 0) entity.flojeraLockedUntil = now + FLOJERA_EXHAUST_LOCKOUT_MS;
        }
      } else if (inAction && !rolling) {
        if (sprinting || wantsSlow || !isMoving) {
          entity.runStreak = Math.max(0, (entity.runStreak || 0) - dt * 1.5);
          if (!sprinting && !invisible && entity.regenBlockedUntil <= now) {
            entity.flojera = Math.min(entity.flojeraMax, entity.flojera + FLOJERA_REGEN_PER_SEC * (entity.respiro ? REST_REGEN_FACTOR : 1) * (entity.sp < 0 ? 1 + 2 * (-entity.sp / 45) : 1) * dt);
          }
        } else if (entity.noDrainUntil <= now) {
          const before = entity.flojera;
          entity.runStreak = (entity.runStreak || 0) + dt;
          const drainFactor = (1 + Math.min(RUN_STREAK_MAX, entity.runStreak * RUN_STREAK_RAMP)) * (this.players.get(entityPlayerId)?.isAsymRole ? CURATOR_DRAIN_FACTOR : 1) * (invisible ? PARAGUAY_DRAIN_FACTOR : 1);
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
      if (this.bossActive && !dashing) [velX, velZ] = Boss.steer(entity, velX, velZ, now);
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
      const bs = Boss.collision(this.players.get(entityPlayerId), entity);
      const plats = bs.noclip ? [] : platforms;
      const gPlats = bs.noclip ? platforms.filter((p) => p.kind === 'pit') : platforms;
      const gS = bs.noclip ? 1 : bs.s;
      const stepUpB = bs.s > 1 ? Math.max(stepUp, bs.h * 0.25) : stepUp;
      const nextX = entity.x + velX * dt;
      const nextZ = entity.z + velZ * dt;
      if (!blockedAt(plats, nextX, nextZ, entity.y, stepUpB, bs.s, bs.h) || blockedAt(plats, prevX, prevZ, entity.y, stepUpB, bs.s, bs.h)) {
        entity.x = nextX;
        entity.z = nextZ;
      } else if (!blockedAt(plats, nextX, prevZ, entity.y, stepUpB, bs.s, bs.h)) {
        entity.x = nextX;
      } else if (!blockedAt(plats, prevX, nextZ, entity.y, stepUpB, bs.s, bs.h)) {
        entity.z = nextZ;
      }

      for (const obj of bs.noclip ? [] : collisionObjects) {
        if (entity.y >= obj.height) continue;
        const reach = obj.radius + PLAYER_HALF * bs.s;
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
      let ground = groundAt(gPlats, entity.x, entity.z, entity.y, stepUpB, gS);
      if (entity.onGround && entity.y > ground && entity.y - ground <= STEP_DOWN) entity.y = ground;
      if (entity.onGround && entity.y - ground > STEP_DOWN) {
        entity.onGround = false;
        entity.peakY = entity.y;
      }
      if (entity.onGround) {
        entity.velocityY = 0;
        entity.y = Math.max(entity.y, ground);
      } else {
        entity.velocityY += GRAVITY * (this.phase === 'lobby' ? LOBBY_GRAVITY_FACTOR : MUTATIONS[this.mutation].gravity * this.modeGravityFactor(Date.now())) * dt;
        if (entity.velocityY < 0) entity.velocityY += AIR_DRAG * entity.velocityY * entity.velocityY * dt;
        entity.y += entity.velocityY * dt;
        entity.peakY = Math.max(entity.peakY || entity.y, entity.y);
        ground = groundAt(gPlats, entity.x, entity.z, entity.y - entity.velocityY * dt, STEP_UP, gS);
        if (entity.y <= ground) {
          const fall = (entity.peakY || ground) - ground;
          entity.y = ground;
          entity.velocityY = 0;
          entity.onGround = true;
          const fallingPlayer = this.players.get(entityPlayerId);
          if (fallingPlayer && fall > FALL_ENDLAG_MIN && inAction) {
            this.endlagSlow(entity, now, FALL_ENDLAG_MS);
          }
        }
      }
    }
  }

  applyPlayerInput(playerId, input) {
    const entity = this.gameState.entities[playerId];
    if (!entity) return;
    if (entity.temblor > 40 && Math.random() < entity.temblor / 700) return;
    entity.input.moveX = clampUnit(input.moveX);
    entity.input.moveZ = clampUnit(input.moveZ);
    entity.input.jump = Boolean(input.jump);
    if (entity.input.jump && entity.emote) { Status.clear(entity, 'emote'); entity.emote = null; }
    entity.input.slow = Boolean(input.slow);
    const aim = Number(input.aim);
    entity.aim = Number.isFinite(aim) ? Math.max(-1.1, Math.min(1.1, aim)) : 0;
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
    if (entity.onGround && !Status.active(entity, 'ragdoll', now)) {
      entity.onGround = false;
      entity.velocityY = RAGDOLL_POP;
      entity.peakY = entity.y;
    }
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
    if (curador && curador.isBoss) {
      if (Number.isInteger(skillIndex) && skillIndex >= 0 && skillIndex <= 9) Boss.ability(this, playerId, skillIndex, Date.now());
      return;
    }
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

    const skills = Characters.withOverride(Characters.getCharacter(curador.characterId), CustomCards.healerSkills(this.mapId));
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
    if (skill.fx) CardEffects.runFx(this, playerId, curadorEntity, skill.fx, 'use', null, now);

    const affectedPlayerIds = [];
    let healedAny = false;

    if (skill.type === 'boost') {
      curadorEntity.cureBoostUntil = now + skill.durationMs;
      curadorEntity.cureBoostFactor = skill.factor;
      if (skill.selfHeal) this.adjustCuratorHp(skill.selfHeal);
      if (skill.slowMs) Status.apply(curadorEntity, 'slow', skill.slowMs, now, { level: skill.slowLevel || 1 });
    } else if (skill.type === 'zone' || skill.type === 'gas' || skill.type === 'root' || skill.type === 'dart' || skill.type === 'gurney') {
      this.castFieldSkill(playerId, curadorEntity, skill, now, affectedPlayerIds);
      healedAny = affectedPlayerIds.length > 0 && skill.type === 'zone';
    } else if (skill.type === 'stun' || skill.type === 'pull') {
      this.hitWindows.push({ kind: 'area', playerId, skill, index, endsAt: now + (skill.windowMs || HIT_WINDOW_MS) });
    } else if (skill.type === 'melee_stun') {
      this.hitWindows.push({ kind: 'melee', playerId, skill, index, endsAt: now + (skill.windowMs || HIT_WINDOW_MS) });
      this.broadcast(MessageType.HIT_FX, { playerId, boxes: [handBox(curadorEntity, skill.reach || 0, skill.radius)] });
      this.broadcastPulse({ playerId, skillIndex: index, skillId: skill.id, skillName: skill.name, skillType: skill.type, radius: 0, center: null, cooldownUntil: curadorEntity.skillCooldowns[index], healedPlayerIds: [], affectedPlayerIds: [] });
    } else {
      for (const [targetPlayerId, patient] of Object.entries(this.gameState.patients)) {
        if (patient.status !== 'alive') continue;
        const targetEntity = this.gameState.entities[targetPlayerId];
        if (!targetEntity) continue;
        const dist = distanceBetween(curadorEntity, targetEntity);
        if (dist > skill.radius) continue;

        if (skill.type === 'pulse') {
          patient.hp = Math.min(patient.maxHp, patient.hp + this.scaleCure(targetEntity, skill.cureAmount * (this.players.get(playerId)?.curatorMult || 1), now));
          if (patient.infected && !(this.gameState.lms && this.mode === 'infection')) { patient.infected = false; patient.contagion = 0; }
          if (targetEntity) this.exitAstral(targetEntity, now);
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
        if (skill.stunMs) this.stun(targetPlayerId, targetEntity, skill.stunMs, now, 0);
        if (skill.slowMs) Status.apply(targetEntity, 'slow', skill.slowMs, now, { level: skill.slowLevel || 2 });
        this.breakParaguay(targetPlayerId, now);
        affectedPlayerIds.push(targetPlayerId);
      }
    }

    if (skill.fx && (skill.type === 'pulse' || skill.type === 'purge')) {
      CardEffects.runFx(this, playerId, curadorEntity, skill.fx, affectedPlayerIds.length ? 'hit' : 'miss', { enemyIds: affectedPlayerIds }, now);
    }
    if (affectedPlayerIds.length >= 2) this.award(playerId, 4, 'Pulso certero');
    else if (affectedPlayerIds.length === 1) this.award(playerId, 2, 'Habilidad certera');
    if (skill.revealMs) {
      for (const [targetPlayerId, patient] of Object.entries(this.gameState.patients)) {
        const targetEntity = this.gameState.entities[targetPlayerId];
        if (patient.status === 'alive' && targetEntity && !this.isInvisible(targetEntity, now)) Status.apply(targetEntity, 'reveal', skill.revealMs, now);
      }
    }

    if (skill.lockMs) this.gameState.moduleLock = { until: now + skill.lockMs, x: curadorEntity.x, z: curadorEntity.z, r: skill.radius };
    const fieldTypes = ['zone', 'gas', 'root', 'dart', 'gurney'];
    if (skill.type !== 'boost' && skill.type !== 'melee_stun' && skill.type !== 'stun' && skill.type !== 'pull' && !fieldTypes.includes(skill.type) && affectedPlayerIds.length === 0) this.endlag(playerId, curadorEntity, now);

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

  pulseHeal(playerId, targetId, amount, now) {
    const patient = this.gameState.patients[targetId];
    const targetEntity = this.gameState.entities[targetId];
    if (!patient || !targetEntity || patient.status !== 'alive') return false;
    patient.hp = Math.min(patient.maxHp, patient.hp + this.scaleCure(targetEntity, amount * (this.players.get(playerId)?.curatorMult || 1), now));
    if (patient.infected && !(this.gameState.lms && this.mode === 'infection')) { patient.infected = false; patient.contagion = 0; }
    this.exitAstral(targetEntity, now);
    if (patient.hp >= patient.maxHp) {
      patient.status = 'eliminated';
      this.onPatientFullyCured();
    }
    return true;
  }

  castFieldSkill(playerId, owner, skill, now, affected) {
    const fx = owner.faceX || 0;
    const fz = owner.faceZ || 0;
    const fl = Math.hypot(fx, fz) || 1;
    const dx = fx / fl;
    const dz = fz === 0 && fx === 0 ? 1 : fz / fl;
    const half = this.getCurrentArea().halfSize;
    const clamp = (v) => Math.max(-half + 1, Math.min(half - 1, v));
    if (skill.type === 'zone') {
      this.addZone({ kind: skill.zoneKind, skillId: skill.id, x: owner.x, z: owner.z, radius: skill.radius, ownerId: playerId, perSecond: skill.perSecond || 0, placedAt: now, until: now + skill.durationMs });
      if (skill.cureAmount) {
        for (const [id, patient] of Object.entries(this.gameState.patients)) {
          const e = this.gameState.entities[id];
          if (patient.status !== 'alive' || !e || distanceBetween(owner, e) > (skill.burstRadius || skill.radius)) continue;
          if (this.pulseHeal(playerId, id, skill.cureAmount, now)) { this.breakParaguay(id, now); affected.push(id); }
        }
      }
    } else if (skill.type === 'gas') {
      this.addZone({ kind: 'gas', skillId: skill.id, x: clamp(owner.x + dx * skill.reach), z: clamp(owner.z + dz * skill.reach), radius: skill.radius, ownerId: playerId, sleepAfterMs: skill.sleepAfterMs, stunMs: skill.stunMs, inside: {}, slept: {}, placedAt: now, until: now + skill.durationMs });
    } else {
      this.addZone({ kind: skill.type === 'root' ? 'rootshot' : skill.type === 'dart' ? 'dart' : 'gurney', skillId: skill.id, x: owner.x + dx * 0.8, z: owner.z + dz * 0.8, radius: skill.radius, ownerId: playerId, dx, dz, speed: skill.speed, left: skill.range, h: (owner.y || 0) + 0.9, skill, carried: {}, placedAt: now, until: now + (skill.range / skill.speed) * 1000 + 200 });
    }
    this.award(playerId, 1, skill.name);
  }

  tickFieldZone(zone, now, dt) {
    let changed = false;
    const owner = this.gameState.entities[zone.ownerId];
    if (zone.kind === 'herbs' || zone.kind === 'drip') {
      for (const [id, patient] of Object.entries(this.gameState.patients)) {
        if (patient.status !== 'alive') continue;
        const e = this.gameState.entities[id];
        if (!e || this.zoneDistance(e, zone) > zone.radius) continue;
        if (!this.isInvisible(e, now)) Status.apply(e, 'reveal', 700, now);
        if (zone.perSecond > 0 && this.pulseHeal(zone.ownerId, id, zone.perSecond * dt, now)) changed = true;
      }
    } else if (zone.kind === 'gas') {
      for (const [id, patient] of Object.entries(this.gameState.patients)) {
        if (patient.status !== 'alive') continue;
        const e = this.gameState.entities[id];
        if (!e || this.zoneDistance(e, zone) > zone.radius) continue;
        Status.apply(e, 'slow', 350, now, { level: 2 });
        zone.inside[id] = (zone.inside[id] || 0) + dt * 1000;
        if (!zone.slept[id] && zone.inside[id] >= zone.sleepAfterMs) {
          zone.slept[id] = true;
          this.breakParaguay(id, now);
          Status.apply(e, 'stun', zone.stunMs, now);
        }
      }
    } else {
      const step = zone.speed * dt;
      zone.x += zone.dx * step;
      zone.z += zone.dz * step;
      zone.left -= step;
      zone.h += 0;
      const half = this.getCurrentArea().halfSize;
      const platforms = GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId));
      const ground = groundAt(platforms, zone.x, zone.z, zone.h, 0.2);
      if (zone.left <= 0 || Math.abs(zone.x) > half || Math.abs(zone.z) > half || zone.h < ground + 0.15) { zone.until = now; return false; }
      zone.y = Math.max(0, ground);
      for (const [id, patient] of Object.entries(this.gameState.patients)) {
        if (patient.status !== 'alive') continue;
        const e = this.gameState.entities[id];
        if (!e) continue;
        const d = Math.hypot(e.x - zone.x, e.z - zone.z);
        if (zone.kind === 'gurney') {
          if (!zone.carried[id] && d <= zone.radius + 0.4 && Math.abs((e.y || 0) - zone.y) < 1.6) zone.carried[id] = true;
          if (zone.carried[id] && d <= zone.radius * 1.8) {
            const nx = e.x + zone.dx * step;
            const nz = e.z + zone.dz * step;
            if (groundAt(platforms, nx, nz, e.y || 0, 0.7) <= (e.y || 0) + 0.7) { e.x = nx; e.z = nz; }
            this.breakParaguay(id, now);
          }
          continue;
        }
        if (d > zone.radius + 0.45 || Math.abs((e.y || 0) + 0.9 - zone.h) > 1.6) continue;
        const s = zone.skill;
        this.breakParaguay(id, now);
        if (zone.kind === 'rootshot') {
          const ox = owner ? owner.x - e.x : 0;
          const oz = owner ? owner.z - e.z : 0;
          const ol = Math.hypot(ox, oz) || 1;
          Status.push(e, ox / ol, oz / ol, s.pullStrength, 450, now);
          Status.apply(e, 'stun', s.stunMs, now);
        } else {
          Status.apply(e, 'slow', s.slowMs, now, { level: 3 });
          e.sedate = { at: now + s.sleepMs, ms: s.stunMs };
        }
        this.award(zone.ownerId, 3, s.name);
        zone.until = now;
        break;
      }
    }
    return changed;
  }

  useEmote(playerId, emoteId) {
    const entity = this.gameState.entities[playerId];
    if (!entity || this.gameState.gameOver) return;
    if (!emoteId) {
      if (entity.emote) { Status.clear(entity, 'emote'); entity.emote = null; }
      return;
    }
    this.startEmote(playerId, entity, emoteId, Date.now());
  }

  startEmote(playerId, entity, emoteId, now) {
    const ms = EMOTES[emoteId];
    const player = this.players.get(playerId);
    if (!ms || !player || entity.emote) return false;
    if (emoteId === 'pulso' && !player.isAsymRole) return false;
    const patient = this.gameState.patients[playerId];
    if (!player.isAsymRole && (!patient || patient.status !== 'alive')) return false;
    if (now < (entity.emoteCdUntil || 0)) return false;
    if (Status.blocksMove(entity, now) || Status.blocksSkills(entity, now)) return false;
    if (entity.eating || entity.astral || entity.selfDmg || entity.channel) return false;
    entity.emote = { id: emoteId, until: now + ms };
    entity.emoteCdUntil = now + ms + EMOTE_COOLDOWN_MS;
    Status.apply(entity, 'emote', ms, now);
    return true;
  }

  botEmote(botId, player, entity, mind, now, dist, role) {
    const dt = mind.pressAt ? Math.min(0.5, (now - mind.pressAt) / 1000) : 0.1;
    mind.pressAt = now;
    const near = dist < 6;
    mind.pressure = Math.max(0, Math.min(1.5, (mind.pressure || 0) + (near ? (1 - dist / 6) * 0.5 : -0.25) * dt));
    if (entity.emote || now < (entity.emoteCdUntil || 0) || now < (player.nextEmoteTry || 0)) return;
    player.nextEmoteTry = now + 700;
    const calm = dist > 12 && mind.confidence > 0.6 && Math.random() < 0.012;
    if (!calm && Math.random() >= mind.pressure * (0.04 + 0.08 * (1 - mind.patience))) return;
    let pool;
    if (calm) pool = ['costenas'];
    else if (mind.fear > 0.6) pool = ['ya_pues', 'ni_me_mires'];
    else if (mind.type === 'valiente') pool = ['schadenfreude', 'yo_me_encargo', 'fue_el'];
    else if (mind.type === 'temerario') pool = ['schadenfreude', 'fue_el', 'costenas'];
    else if (mind.type === 'miedoso') pool = ['ya_pues', 'ni_me_mires', 'ni_idea'];
    else if (mind.type === 'calculador') pool = [role === 'curator' ? 'pulso' : 'su_majestad', 'ni_idea'];
    else pool = ['ni_idea', 'fue_el', 'ya_pues'];
    if (role === 'curator' && Math.random() < 0.3) pool = ['pulso', 'su_majestad', 'schadenfreude'];
    if (this.startEmote(botId, entity, pool[Math.floor(Math.random() * pool.length)], now)) mind.pressure *= 0.4;
  }

  broadcastPulse(pulseResult) {
    this.lastPulse = { radius: pulseResult.radius, type: pulseResult.skillType, at: Date.now() };
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
      if (!win.planked) {
        win.planked = true;
        if (this.players.get(win.playerId)?.isAsymRole) {
          if (win.kind === 'm1') { this.healSpears(owner, M1_REACH, M1_RADIUS, false, now); this.healBlocks(owner, M1_REACH, M1_RADIUS, false, now); }
          else if (win.kind === 'melee') { this.healSpears(owner, win.skill.reach || 0, win.skill.radius || 0.5, false, now); this.healBlocks(owner, win.skill.reach || 0, win.skill.radius || 0.5, false, now); }
          else if (win.kind === 'area') { this.healSpears(owner, 0, win.skill.radius || 1, true, now); this.healBlocks(owner, 0, win.skill.radius || 1, true, now); }
        }
        if (this.bossActive && !this.players.get(win.playerId)?.isBoss) Boss.hurt(this, owner, win, now);
        if (win.kind === 'm1') this.hitPlanks(owner, M1_REACH, M1_RADIUS, false, now);
        else if (win.kind === 'melee') this.hitPlanks(owner, win.skill.reach || 0, win.skill.radius || 0.5, false, now);
        else if (win.kind === 'area') this.hitPlanks(owner, 0, win.skill.radius || 1, true, now);
        else if (win.kind === 'card') this.hitPlanks(owner, win.card.reach || 0, win.card.hitRadius || 0.8, false, now);
      }
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
          this.breakParaguay(targetPlayerId, now);
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
          if (skill.fx) CardEffects.runFx(this, win.playerId, owner, skill.fx, 'hit', { enemyIds: ids }, now);
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
          if (skill.fx) CardEffects.runFx(this, win.playerId, owner, skill.fx, 'miss', { enemyIds: [] }, now);
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
          const hitEntity = this.gameState.entities[nearestId];
          const moving = hitEntity && hitEntity.input && Math.hypot(hitEntity.input.moveX, hitEntity.input.moveZ) > 0.3 && !hitEntity.input.slow;
          this.resolveCure(win.playerId, owner, nearestId, now);
          if (moving && this.gameState.patients[nearestId] && this.gameState.patients[nearestId].status === 'alive') {
            this.award(win.playerId, 3, 'Aturdiste a un Paciente');
            Status.apply(hitEntity, 'stun', skill.durationMs, now);
          }
          owner.sprintUntil = now + skill.hitBoostMs;
          owner.sprintFactor = skill.hitBoostFactor;
          this.broadcastPulse({
            playerId: win.playerId,
            skillIndex: win.index,
            skillId: skill.id,
            skillName: skill.name,
            skillType: skill.type,
            radius: skill.radius || 0,
            center: null,
            cooldownUntil: owner.skillCooldowns[win.index],
            healedPlayerIds: [nearestId],
            affectedPlayerIds: moving ? [nearestId] : [],
            silent: true,
          });
          continue;
        }
        if (win.endsAt <= now) {
          this.endlag(win.playerId, owner, now, win.skill.missEndlagMs, 1);
          continue;
        }
      } else {
        const card = win.card;
        if (this.curatorInRange(owner, card.hitRadius, card.reach || 0)) {
          CardEffects.apply(this, win.playerId, owner, card, now);
          this.gainExacerbacion(owner, now);
          if (card.fx) CardEffects.runFx(this, win.playerId, owner, card.fx, 'hit', null, now);
          continue;
        }
        if (win.endsAt <= now) {
          this.endlag(win.playerId, owner, now);
          if (card.fx) CardEffects.runFx(this, win.playerId, owner, card.fx, 'miss', null, now);
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
    if (this.gameState.lms && this.gameState.lms.gimmick === 'escudo') delta *= 0.5;
    curator.hp = Math.max(0, Math.min(curator.max, curator.hp + delta));
    if (this.bossActive) {
      if (curator.hp <= 0 || curator.hp >= curator.max) {
        this.gameState.curatorDown = true;
        const cid = [...this.players.entries()].find(([, p]) => p.isAsymRole)?.[0];
        const ce = cid && this.gameState.entities[cid];
        if (ce && !ce.down) { ce.down = true; ce.fatiga = 100; Status.apply(ce, 'stun', 3600000, Date.now()); }
        this.checkGameEndConditions();
      }
      return;
    }
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
    patient.hp = Math.min(patient.maxHp, patient.hp + amount * MUTATIONS[this.mutation].heal);
    const healed = this.gameState.entities[playerId];
    if (healed && amount > 0) this.exitAstral(healed, Date.now());
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

  startAstral(playerId, entity, card, now) {
    const cfg = card.astral;
    entity.astral = { card, cfg, startedAt: now, x0: entity.x, z0: entity.z, fastMs: 0, charge: 0, state: 'charging', readyAt: 0, hp: (this.gameState.patients[playerId] || {}).hp, slot: entity.hand.findIndex((sl) => sl && sl.chosen === card.id) };
    if (cfg.holdMs > 0) Status.apply(entity, 'slow', cfg.holdMs, now, { tag: 'endlag', level: 3 });
  }

  exitAstral(entity, now) {
    if (entity.astral && entity.astral.state === 'charging') {
      this.readyAstral(entity, now);
      Status.apply(entity, 'slow', ASTRAL.CANCEL_ENDLAG_MS, now, { tag: 'endlag', level: 2 });
    }
  }

  readyAstral(entity, now) {
    const a = entity.astral;
    a.charge = Math.min(1, (now - a.startedAt) / Math.max(1, a.cfg.chargeMs));
    a.state = 'ready';
    a.readyAt = now + a.cfg.fireDelayMs;
    if (a.slot >= 0) entity.cardCooldowns[a.slot] = a.readyAt;
    Status.clear(entity, 'slow');
    const pid = Object.keys(this.gameState.entities).find((k) => this.gameState.entities[k] === entity);
    if (pid && a.slot >= 0) this.broadcast(MessageType.CARD_RESULT, { playerId: pid, slot: a.slot, cardId: a.card.id, cooldownUntil: a.readyAt, hitRadius: null, center: null, boxes: [], silent: true });
  }

  fireAstral(playerId, entity, slotIndex, now) {
    const a = entity.astral;
    const cfg = a.cfg;
    const card = a.card;
    const len = Math.hypot(entity.faceX || 0, entity.faceZ || 0) || 1;
    const dx = (entity.faceX || 0) / len;
    const dz = (entity.faceZ || 1) / len;
    const el = entity.aim || 0;
    const hz = Math.cos(el);
    this.addZone({ kind: 'astral', cardId: card.id, x: entity.x + dx * hz, z: entity.z + dz * hz, radius: cfg.radius * (0.4 + 0.6 * a.charge), ownerId: playerId, dx: dx * hz, dz: dz * hz, dy: Math.sin(el), h: (entity.y || 0) + 1.3 + Math.sin(el), charge: a.charge, speed: cfg.speed, hitR: cfg.hit, card, until: now + cfg.flyMs });
    const fired = this.gameState.zones[this.gameState.zones.length - 1];
    fired.y = fired.h - 1.2;
    entity.astral = null;
    entity.cardCooldowns[slotIndex] = now + card.cooldownMs;
    this.endlagSlow(entity, now, cfg.throwEndlagMs);
  }

  tickAstral(now, dt) {
    for (const [id, entity] of Object.entries(this.gameState.entities)) {
      const a = entity.astral;
      if (!a || a.state !== 'charging') continue;
      const pt = this.gameState.patients[id];
      const healed = Boolean(pt) && a.hp !== undefined && pt.hp > a.hp + 1e-6;
      if (pt) a.hp = Math.min(a.hp === undefined ? pt.hp : a.hp, pt.hp);
      a.fastMs = (entity.speedNow || 0) > ASTRAL.EXIT_SPEED ? a.fastMs + dt * 1000 : 0;
      const jumped = !entity.onGround && (entity.velocityY || 0) > 0.5;
      const moved = Math.hypot(entity.x - a.x0, entity.z - a.z0) > ASTRAL.MOVE_LIMIT;
      if (healed || jumped || moved || a.fastMs >= ASTRAL.EXIT_FAST_MS) this.exitAstral(entity, now);
      else if (now - a.startedAt >= Math.max(a.cfg.holdMs, a.cfg.chargeMs)) this.readyAstral(entity, now);
    }
    const half = this.getCurrentArea().halfSize;
    let platformsNow = null;
    for (const claw of this.gameState.zones) {
      if (claw.kind !== 'astral' || now >= claw.until) continue;
      const step = claw.speed * dt;
      claw.x += claw.dx * step;
      claw.z += claw.dz * step;
      claw.h += claw.dy * step;
      claw.y = claw.h - 1.2;
      if (Math.abs(claw.x) > half + 2 || Math.abs(claw.z) > half + 2 || claw.h > 80) { claw.until = now; continue; }
      if (!platformsNow) platformsNow = GameMap.resolvePlatforms(this.mapId, GameMap.areaFor(this.mapId));
      if (claw.h < groundAt(platformsNow, claw.x, claw.z, claw.h, 0.2) + 0.15) { claw.until = now; continue; }
      for (const [curatorId, p] of this.players) {
        if (!p.isAsymRole) continue;
        const target = this.gameState.entities[curatorId];
        if (!target || target.gone) continue;
        if (Math.hypot(target.x - claw.x, target.z - claw.z) > claw.hitR + claw.radius) continue;
        if (Math.abs((target.y || 0) + 1 - claw.h) > 1.1 + claw.radius) continue;
        const card = claw.card;
        const k = Math.max(ASTRAL.MIN_FRACTION, claw.charge);
        if (card.stunMs) this.stun(curatorId, target, Math.round(card.stunMs * k), now, 0);
        if (card.ragdollMs) this.ragdoll(curatorId, target, Math.round(card.ragdollMs * k), now);
        if (card.slowMs) Status.apply(target, 'slow', Math.round(card.slowMs * k), now, { level: card.slowLevel || 2 });
        if (card.revealHealerMs) Status.apply(target, 'reveal', card.revealHealerMs, now);
        if (card.knockback) {
          const ddx = target.x - claw.x;
          const ddz = target.z - claw.z;
          const l = Math.hypot(ddx, ddz) || 1;
          Status.push(target, ddx / l, ddz / l, card.knockback * k, 400, now);
        }
        if (card.curatorHpLoss) { this.adjustCuratorHp(-card.curatorHpLoss * k); this.checkGameEndConditions(); }
        const owner = this.gameState.entities[claw.ownerId];
        if (owner) this.gainExacerbacion(owner, now);
        claw.until = now;
        break;
      }
    }
  }

  tickSerum(zone, now, dt) {
    if (zone.armedAt !== undefined && now >= zone.armedAt) {
      zone.armedAt = undefined;
      zone.activeUntil = now + SERUM_ACTIVE_MS;
    }
    if (zone.armedAt !== undefined) return;
    if (now >= zone.activeUntil) {
      zone.armedAt = now + SERUM_RECHARGE_MS;
      return;
    }
    for (const [playerId, patient] of Object.entries(this.gameState.patients)) {
      if (patient.status !== 'alive') continue;
      const entity = this.gameState.entities[playerId];
      if (!entity || this.zoneDistance(entity, zone) > zone.radius) continue;
      const cap = patient.maxHp * SERUM_PATIENT_CAP;
      if (patient.hp < cap) {
        patient.hp = Math.min(cap, patient.hp + SERUM_PATIENT_PER_SEC * dt * MUTATIONS[this.mutation].heal);
        this.exitAstral(entity, now);
      }
    }
    const curator = this.gameState.curator;
    if (!curator) return;
    for (const [playerId, player] of this.players) {
      if (!player.isAsymRole) continue;
      const entity = this.gameState.entities[playerId];
      if (!entity || this.zoneDistance(entity, zone) > zone.radius) continue;
      const target = curator.max / 2;
      const diff = target - curator.hp;
      const step = Math.min(Math.abs(diff), SERUM_CURATOR_PER_SEC * dt);
      if (step > 0) this.adjustCuratorHp(Math.sign(diff) * step);
    }
  }

  separateModules(now) {
    if (GameMap.allowsModuleOverlap(this.mapId)) return;
    const pos = this.gameState.selfDamageObjectPositions;
    const carry = this.gameState.moduleCarry || {};
    const minD = Math.min(MODULE_MIN_DIST, this.getCurrentArea().halfSize * 0.15) * 0.6;
    const ids = Object.keys(pos);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos[ids[i]];
        const b = pos[ids[j]];
        const close = Math.hypot(a.x - b.x, a.z - b.z) < (Math.abs((a.y || 0) - (b.y || 0)) < 3 ? minD : 2.5);
        if (!close) continue;
        const mover = carry[ids[j]] ? ids[i] : ids[j];
        if (carry[mover]) continue;
        const spot = this.pickModuleSpot(this.selfDamageCandidates(), mover);
        if (spot) pos[mover] = { x: spot.x, y: spot.y, z: spot.z };
      }
    }
  }

  tickModuleRelocations(now) {
    if (!this.nextSeparateAt || now >= this.nextSeparateAt) {
      this.nextSeparateAt = now + 1000;
      this.separateModules(now);
    }
    const rel = this.gameState.moduleRelocate;
    if (!rel) return;
    for (const [id, at] of Object.entries(rel)) {
      if (now < at) continue;
      delete rel[id];
      const newPos = this.pickModuleSpot(this.selfDamageCandidates(), id);
      if (newPos) this.gameState.selfDamageObjectPositions[id] = { x: newPos.x, y: newPos.y, z: newPos.z };
      this.gameState.selfDamageTypes[id] = this.randomMinigame(id);
    }
  }

  tickZones(now, dt) {
    this.tickModuleRelocations(now);
    this.tickMode(now, dt);
    if (this.phase === 'action' && !this.tutorial && (!this.nextHeartAt || now >= this.nextHeartAt)) {
      this.nextHeartAt = now + 250;
      this.sendHeartbeats();
    }
    let statusChanged = false;
    for (const entity of Object.values(this.gameState.entities)) {
      if (entity.sedate && now >= entity.sedate.at) {
        Status.apply(entity, 'stun', entity.sedate.ms, now);
        entity.sedate = null;
      }
    }
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

      if (zone.kind === 'serum') {
        this.tickSerum(zone, now, dt);
        continue;
      }
      if (FIELD_KINDS.has(zone.kind)) {
        if (this.tickFieldZone(zone, now, dt)) statusChanged = true;
        continue;
      }
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
      } else if (zone.kind === 'spear') {
        const cfg = zone.card.spear;
        zone.hp = Math.min(cfg.maxHp, zone.hp + cfg.regenPerSec * dt);
        if (zone.hp >= cfg.maxHp) { zone.until = now; remaining.pop(); continue; }
        zone.level = zone.hp >= cfg.maxHp * 2 / 3 ? 1 : zone.hp >= cfg.maxHp / 3 ? 2 : 3;
        const count = this.gameState.zones.filter((z) => z.kind === 'spear' && now < z.until).length;
        const f = cfg.levelScale[zone.level] / (1 + cfg.nerf * Math.max(0, count - 1));
        if (now >= zone.nextAt) {
          for (const [playerId, player] of this.players) {
            if (!player.isAsymRole) continue;
            const entity = this.gameState.entities[playerId];
            if (!entity || this.zoneDistance(entity, zone) > zone.radius) continue;
            const dx = zone.x - entity.x;
            const dz = zone.z - entity.z;
            const l = Math.hypot(dx, dz) || 1;
            entity.flojera = Math.max(0, entity.flojera - cfg.steal * f);
            if (zone.mode === 'pull') {
              Status.push(entity, dx / l, dz / l, 5.5 * f, 350, now);
              this.endlagSlow(entity, now, Math.round(650 * f));
            } else {
              Status.push(entity, -dx / l, -dz / l, 1.6 * f, 200, now);
              this.endlagSlow(entity, now, Math.round(180 * f));
            }
            zone.nextAt = now + cfg.tickMs;
            const owner = this.gameState.entities[zone.ownerId];
            if (owner) this.award(zone.ownerId, 1, 'Lanza');
          }
        }
      } else if (zone.kind === 'trap' && now >= zone.armedAt) {
        const age = (now - zone.placedAt) / 1000 + (zone.healBonus || 0);
        const life = 1 + age;
        zone.level = life >= TRAP_PEAK_LIFE ? 1 : life >= 31 ? 2 : 3;
        if (life >= TRAP_PEAK_LIFE) zone.charges = 0;
        if (zone.charges > 0 && now >= zone.cooldownUntil) {
          const stunMs = [0, 1500, 2200, 3000][zone.level];
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

  pickModuleSpot(allPositions, movingId) {
    const positions = this.gameState.selfDamageObjectPositions;
    const cur = positions[movingId];
    const minD = Math.min(MODULE_MIN_DIST, this.getCurrentArea().halfSize * 0.15);
    const free = allPositions.filter((c) => {
      if (cur && Math.hypot(c.x - cur.x, c.z - cur.z) < 0.5) return false;
      if (GameMap.allowsModuleOverlap(this.mapId)) return true;
      for (const [id, pos] of Object.entries(positions)) {
        if (id === movingId) continue;
        const d = Math.hypot(c.x - pos.x, c.z - pos.z);
        if (d < (Math.abs((c.y || 0) - (pos.y || 0)) < 3 ? minD : 5)) return false;
      }
      return true;
    });
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  carryOf(playerId) {
    const map = this.gameState.moduleCarry || {};
    return Object.keys(map).find((id) => map[id] === playerId) || null;
  }

  takeOverModule(objectId, newUserId, now) {
    for (const [id, e] of Object.entries(this.gameState.entities)) {
      if (id === newUserId || !e.selfDmg || e.selfDmg.objectId !== objectId) continue;
      e.selfDmg = null;
      const patient = this.gameState.patients[id];
      this.sendTo(id, MessageType.SELF_DAMAGE_RESULT, { playerId: id, newHp: patient ? patient.hp : 0, status: patient ? patient.status : 'alive', objectId, objectNewPosition: this.gameState.selfDamageObjectPositions[objectId], damage: 0, hits: 0, perfect: false, failed: true, stolen: true });
    }
  }

  carryModule(playerId) {
    const now = Date.now();
    const entity = this.gameState.entities[playerId];
    const patient = this.gameState.patients[playerId];
    if (!entity || !patient || patient.status !== 'alive' || this.gameState.gameOver) return;
    if (Status.blocksSkills(entity, now) || entity.selfDmg || entity.eating) return;
    const mine = this.carryOf(playerId);
    if (mine) {
      let best = null;
      let bestD = MODULE_HANDOFF_RADIUS;
      for (const [id, e] of Object.entries(this.gameState.entities)) {
        const pt = this.gameState.patients[id];
        if (id === playerId || !pt || pt.status !== 'alive' || e.carry) continue;
        const d = distanceBetween(entity, e);
        if (d < bestD) { bestD = d; best = id; }
      }
      if (!best) {
        this.sendTo(playerId, MessageType.ERROR, { message: 'No hay un compañero cerca (suelta el Módulo con la tecla de soltar)' });
        return;
      }
      this.gameState.moduleCarry[mine] = best;
      this.gameState.moduleHandler[mine] = playerId;
      entity.carry = null;
      this.gameState.entities[best].carry = mine;
      return;
    }
    let target = null;
    let bestD = MODULE_CARRY_RADIUS;
    for (const [id, pos] of Object.entries(this.gameState.selfDamageObjectPositions)) {
      const d = distanceBetween(entity, pos);
      if (d < bestD) { bestD = d; target = id; }
    }
    if (!target) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'No hay un Módulo cerca' });
      return;
    }
    const holder = this.gameState.moduleCarry[target];
    if (holder && this.gameState.entities[holder]) this.gameState.entities[holder].carry = null;
    this.takeOverModule(target, playerId, now);
    this.gameState.moduleCarry[target] = playerId;
    entity.carry = target;
  }

  dropModule(playerId) {
    const entity = this.gameState.entities[playerId];
    const id = this.carryOf(playerId);
    if (!entity || !id) return;
    const spot = { x: entity.x + (entity.faceX || 0) * 0.9, y: entity.y, z: entity.z + (entity.faceZ || 1) * 0.9 };
    const minD = GameMap.allowsModuleOverlap(this.mapId) ? 0 : MODULE_DROP_MIN_DIST;
    for (const [oid, pos] of Object.entries(this.gameState.selfDamageObjectPositions)) {
      if (oid !== id && Math.hypot(spot.x - pos.x, spot.z - pos.z) < minD && Math.abs(spot.y - (pos.y || 0)) < 3) {
        this.sendTo(playerId, MessageType.ERROR, { message: 'Muy cerca de otro Módulo' });
        return;
      }
    }
    this.gameState.selfDamageObjectPositions[id] = spot;
    delete this.gameState.moduleCarry[id];
    this.gameState.moduleHandler[id] = playerId;
    entity.carry = null;
  }

  tickCarry() {
    const map = this.gameState.moduleCarry;
    if (!map) return;
    for (const id of Object.keys(map)) {
      const carrier = this.gameState.entities[map[id]];
      const patient = this.gameState.patients[map[id]];
      if (!carrier || !patient || patient.status !== 'alive') {
        if (carrier) carrier.carry = null;
        delete map[id];
        continue;
      }
      this.gameState.selfDamageObjectPositions[id] = { x: carrier.x + (carrier.faceX || 0) * 0.8, y: carrier.y, z: carrier.z + (carrier.faceZ || 1) * 0.8 };
    }
  }

  relocateSelfDamageObjects(now) {
    this.lastRelocateAt = now;
    const allPositions = this.selfDamageCandidates();
    const ids = Object.keys(this.gameState.selfDamageObjectPositions).sort(() => Math.random() - 0.5);
    for (const objectId of ids) {
      if (this.gameState.moduleCarry[objectId]) continue;
      const newPos = this.pickModuleSpot(allPositions, objectId);
      if (!newPos) continue;
      this.gameState.selfDamageObjectPositions[objectId] = { x: newPos.x, y: newPos.y, z: newPos.z };
    }
  }

  scaleCure(targetEntity, rawAmount, now) {
    if (this.bossActive && Boss.cureBlocked(this, targetEntity, now)) return 0;
    const lms = this.gameState.lms;
    const amount = lms && lms.gimmick === 'escudo' && this.gameState.entities[lms.survivorId] === targetEntity ? rawAmount * 0.5 : rawAmount;
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
      entity.hand[next] = Cards.dealSlot(chosenIds, GameMap.getCustomCards(this.mapId));
      entity.draftEndsAt = Date.now() + Cards.DRAFT_DURATION_MS;
      this.sendCardOffer(playerId, entity);
    }
  }

  sendCardOffer(playerId, entity) {
    this.sendTo(playerId, MessageType.CARD_OFFER, {
      slots: entity.hand.map((slot) => ({
        options: (slot.options || []).map((id) => Cards.getCard(id)),
        chosen: slot.chosen ? Cards.getCard(slot.chosen) : null,
      })),
      draftEndsAt: entity.draftEndsAt,
      rerolls: entity.rerolls || 0,
    });
  }

  autoPickExpiredDrafts(now) {
    for (const [playerId, entity] of Object.entries(this.gameState.entities)) {
      if (!entity.hand.length || entity.draftEndsAt === 0 || now < entity.draftEndsAt) continue;
      for (let guard = 0; guard < entity.hand.length; guard++) {
        const index = entity.hand.findIndex((slot) => !slot.chosen);
        if (index === -1) break;
        const first = (entity.hand[index].options || [])[0];
        if (!first) break;
        this.takeCard(playerId, entity, index, first);
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

    const index = entity.hand.findIndex((sl) => !sl.chosen);
    if (index === -1) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Ya elegiste tus dos cartas' });
      return;
    }
    if (!entity.hand[index].options.includes(cardId)) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Esa carta no está entre tus opciones' });
      return;
    }
    this.takeCard(playerId, entity, index, cardId);
  }

  takeCard(playerId, entity, index, cardId) {
    this.finalizeChoice(playerId, index, cardId);
    for (const sl of entity.hand) if (!sl.chosen && sl.options) sl.options = sl.options.filter((id) => id !== cardId);
    if (entity.hand.every((sl) => sl.chosen)) entity.draftEndsAt = 0;
    this.sendCardOffer(playerId, entity);
  }

  rerollCard(playerId, cardId) {
    if (this.phase !== 'action' || this.gameState.gameOver) return;
    const player = this.players.get(playerId);
    const entity = this.gameState.entities[playerId];
    if (!player || player.isAsymRole || !entity) return;
    if (!(entity.rerolls > 0)) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'No te quedan renovaciones' });
      return;
    }
    const open = entity.hand.filter((sl) => !sl.chosen);
    if (!open.length || !open[0].options.includes(cardId)) return;
    const chosenIds = entity.hand.filter((sl) => sl.chosen).map((sl) => sl.chosen);
    const fresh = Cards.dealPool(GameMap.getCustomCards(this.mapId), [...open[0].options, ...chosenIds])[0];
    if (!fresh) return;
    entity.rerolls--;
    for (const sl of open) sl.options = sl.options.map((id) => (id === cardId ? fresh : id));
    this.sendCardOffer(playerId, entity);
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
    if (card.astral && entity.astral && entity.astral.card.id === card.id) {
      if (entity.astral.state === 'charging') {
        if (now - entity.astral.startedAt < 600) return;
        const early = now - entity.astral.startedAt < entity.astral.cfg.chargeMs;
        this.readyAstral(entity, now);
        if (early) Status.apply(entity, 'slow', ASTRAL.CANCEL_ENDLAG_MS, now, { tag: 'endlag', level: 2 });
        return;
      }
      if (entity.astral.state === 'ready' && now >= entity.astral.readyAt) {
        this.fireAstral(playerId, entity, slotIndex, now);
        this.broadcast(MessageType.CARD_RESULT, { playerId, slot: slotIndex, cardId: card.id, cooldownUntil: entity.cardCooldowns[slotIndex], hitRadius: null, center: null, boxes: [] });
      }
      return;
    }
    if (card.spear) {
      const own = this.gameState.zones.find((z) => z.kind === 'spear' && z.ownerId === playerId && now >= (z.toggleAt || 0) && this.zoneDistance(entity, { ...z, y: z.y }) <= card.spear.toggleRadius);
      if (own) {
        own.mode = own.mode === 'pull' ? 'push' : 'pull';
        own.toggleAt = now + 400;
        return;
      }
    }
    const cooldownUntil = entity.cardCooldowns[slotIndex] || 0;
    if (cooldownUntil > now) {
      this.sendTo(playerId, MessageType.ERROR, {
        message: `${card.displayName} en recarga (${Math.ceil((cooldownUntil - now) / 1000)}s)`,
      });
      return;
    }

    if (card.eat) {
      this.startEating(playerId, entity, slotIndex, card, now);
      return;
    }
    entity.cardCooldowns[slotIndex] = now + card.cooldownMs;
    this.applyCardEffect(playerId, entity, card, now);
    if (card.astral) entity.cardCooldowns[slotIndex] = now + 1500;

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

  startEating(playerId, entity, slotIndex, card, now) {
    if (entity.eating) return;
    const patient = this.gameState.patients[playerId];
    entity.eating = { cardId: card.id, slot: slotIndex, endsAt: now + card.eat.ms, x: entity.x, z: entity.z, hp: patient ? patient.hp : 0, limit: card.eat.moveLimit };
    entity.cardCooldowns[slotIndex] = now + card.eat.ms;
    Status.apply(entity, 'slow', card.eat.ms, now, { tag: 'endlag', level: 2 });
    this.broadcast(MessageType.CARD_RESULT, { playerId, slot: slotIndex, cardId: card.id, cooldownUntil: entity.cardCooldowns[slotIndex], hitRadius: null, center: null, boxes: [] });
  }

  tickEating(now) {
    for (const [playerId, entity] of Object.entries(this.gameState.entities)) {
      const e = entity.eating;
      if (!e) continue;
      const patient = this.gameState.patients[playerId];
      const card = Cards.getCard(e.cardId);
      const healed = !patient || patient.status !== 'alive' || patient.hp > e.hp + 1e-6;
      if (patient) e.hp = Math.min(e.hp, patient.hp);
      const moved = Math.hypot(entity.x - e.x, entity.z - e.z) > e.limit;
      if (healed || moved) {
        entity.eating = null;
        entity.cardCooldowns[e.slot] = now + 1000;
        Status.apply(entity, 'slow', 1000, now, { tag: 'endlag', level: 2 });
        this.broadcast(MessageType.CARD_RESULT, { playerId, slot: e.slot, cardId: card.id, cooldownUntil: entity.cardCooldowns[e.slot], hitRadius: null, center: null, boxes: [], silent: true });
        continue;
      }
      if (now < e.endsAt) continue;
      entity.eating = null;
      entity.cardCooldowns[e.slot] = now + card.cooldownMs;
      this.applyCardEffect(playerId, entity, card, now);
      this.broadcast(MessageType.CARD_RESULT, { playerId, slot: e.slot, cardId: card.id, cooldownUntil: entity.cardCooldowns[e.slot], hitRadius: null, center: null, boxes: [], silent: true });
    }
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

  isPractice() {
    for (const p of this.players.values()) if (p.isBot) return true;
    return Boolean(GameMap.MAPS[this.mapId] && GameMap.MAPS[this.mapId].custom);
  }

  award(playerId, amount, reason) {
    const player = this.players.get(playerId);
    if (!player || player.isBot || !this.gameState.desgracias || this.isPractice()) return;
    const lms = this.gameState.lms;
    if (lms && lms.gimmick === 'codicia' && (lms.survivorId === playerId || lms.curatorId === playerId)) amount *= 2;
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
    if (card.fx) CardEffects.runFx(this, playerId, entity, card.fx, 'use', null, now);
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
      if (card.fx) CardEffects.runFx(this, playerId, entity, card.fx, 'hit', null, now);
    } else if (hit === false) {
      this.endlag(playerId, entity, now);
      if (card.fx) CardEffects.runFx(this, playerId, entity, card.fx, 'miss', null, now);
    }
    if (card.maxMode === 'use') this.applyMaxCosts(playerId, entity, card, true);
  }

  applyMaxCosts(playerId, entity, card, perUse) {
    const patient = this.gameState.patients[playerId];
    if (patient && patient.status === 'alive' && (card.maxHpSet || card.maxHpDelta)) {
      const delta = card.maxHpSet ? card.maxHpSet - PATIENT_HP_MAX : card.maxHpDelta;
      const target = patient.maxHp + delta;
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
   * M1 del Curador. Reconstruido tras la pérdida del sandbox, esta es
   * la "hitbox de interacción" que se pidió: no es una zona de colisión
   * continua, es una validación de distancia puntual en el instante del
   * click (confirmado explícitamente que es lo que se quería, no algo
   * nuevo tipo trigger automático).
   */
  applyCure(curadorId) {
    if (this.gameState.gameOver) return;
    const curador = this.players.get(curadorId);
    if (curador && curador.isBoss) {
      if (this.phase === 'action') Boss.strike(this, curadorId, Date.now());
      return;
    }
    if (!curador || !curador.isAsymRole) {
      this.sendTo(curadorId, MessageType.ERROR, { message: 'Solo el Curador puede curar' });
      return;
    }
    const now = Date.now();
    if (now < (this.gameState.curatorReleaseAt || 0)) return;
    const entity = this.gameState.entities[curadorId];
    if (!entity || entity.baseCooldownUntil > now || Status.blocksSkills(entity, now)) return;
    entity.baseCooldownUntil = now + (Characters.getCharacter(curador.characterId).baseCooldownMs || 900);
    this.hitWindows.push({ kind: 'm1', playerId: curadorId, endsAt: now + M1_WINDOW_MS });
    this.broadcast(MessageType.HIT_FX, { playerId: curadorId, boxes: [handBox(entity, M1_REACH, M1_RADIUS)] });
  }

  resolveCure(curadorId, curadorEntity, targetPlayerId, now) {
    this.breakParaguay(targetPlayerId, now);
    const hitE = this.gameState.entities[targetPlayerId];
    if (hitE && hitE.emote) { Status.clear(hitE, 'emote'); hitE.emote = null; }
    const patient = this.gameState.patients[targetPlayerId];
    const targetEntity = this.gameState.entities[targetPlayerId];
    const boost = curadorEntity.cureBoostUntil > now ? curadorEntity.cureBoostFactor : 1;
    patient.hp = Math.min(patient.maxHp, patient.hp + this.scaleCure(targetEntity, CURE_AMOUNT * boost, now));
    if (targetEntity) this.exitAstral(targetEntity, now);
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
   * (this.gameState.selfDamageObjectPositions, que sí cambia, a
   * diferencia de los objetos de colisión, que son estáticos).
   */
  applySelfDamage(playerId, objectId, dir) {
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
      this.pressSelfDamage(playerId, playerEntity, patient, game, now, dir);
      return;
    }

    if (this.gameState.moduleCarry && this.gameState.moduleCarry[objectId]) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Alguien lleva ese Módulo' });
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
    const lock = this.gameState.moduleLock;
    if (this.bossActive && Boss.censored(this, playerEntity, now)) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Zona censurada' });
      return;
    }
    if (lock && now < lock.until && Math.hypot(objectPos.x - lock.x, objectPos.z - lock.z) <= lock.r) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Módulo desinfectado, espera un momento' });
      return;
    }
    if (playerEntity.carry) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Suelta el Módulo que llevas para usarlo' });
      return;
    }
    if (this.gameState.moduleRelocate && this.gameState.moduleRelocate[objectId]) {
      this.sendTo(playerId, MessageType.ERROR, { message: 'Ese Módulo se está reiniciando' });
      return;
    }
    this.takeOverModule(objectId, playerId, now);
    const variantId = this.gameState.selfDamageTypes[objectId] || 'rhythm';
    const vr = SD_VARIANTS[variantId] || SD_VARIANTS.rhythm;
    const type = vr.base;
    if ((type === 'lock' || type === 'keys') && this.players.get(playerId)?.isBot) return;
    const tol = Math.round(SD_TOLERANCE_MS * (vr.tol || 1));
    const extra = { tol, scale: vr.scale || 1, kindId: variantId };
    if (type === 'rhythm') {
      const beats = [];
      const double = vr.double || (!vr.beats && Math.random() < 0.35);
      const count = vr.beats || (double ? SD_BEATS + 1 : SD_BEATS);
      let at = 1000 + Math.random() * 200;
      for (let i = 0; i < count; i++) {
        beats.push(Math.round(at));
        at += (double ? 675 : 765) + Math.random() * 360;
      }
      playerEntity.selfDmg = { type, objectId, ...extra, variant: double ? 'doble' : 'normal', startedAt: now, endsAt: now + beats[beats.length - 1] + tol + 150, beats, scored: [], hits: 0 };
    } else if (type === 'meter') {
      playerEntity.selfDmg = { type, objectId, ...extra, div: vr.div || 0.27, startedAt: now, endsAt: now + 7000, period: vr.period || 2000, score: 0, hits: 0 };
    } else if (type === 'needle') {
      playerEntity.selfDmg = { type, objectId, ...extra, startedAt: now, endsAt: now + 10000, period: 2340, stage: 0, hits: 0, zones: Array.from({ length: vr.stages || 3 }, () => 0.2 + Math.random() * 0.6), width: vr.width || 0.17 };
    } else if (type === 'lock') {
      const pins = [2200, 1800, 1500].map((period) => ({ period, zone: 0.2 + Math.random() * 0.6 }));
      playerEntity.selfDmg = { type, objectId, startedAt: now, endsAt: now + 18000, pins, stage: 0, pinAt: now, width: 0.11, phase: 'pins', handUntil: 0, done: false, hits: 0 };
    } else if (type === 'keys') {
      this.endlagSlow(playerEntity, now, 700);
      playerEntity.selfDmg = { type, objectId, startedAt: now, endsAt: now + 90000, phase: 'connect', phaseUntil: now + 900, round: 0, fails: 0, dealt: 0, seq: [], idx: 0, hits: 0 };
    } else {
      playerEntity.selfDmg = { type: 'mash', objectId, ...extra, startedAt: now, endsAt: now + (vr.ms || 1900), count: 0, target: vr.target || 6, hits: 0 };
    }
  }

  needlePos(game, now) {
    const ph = (((now - game.startedAt) / game.period) % 1 + 1) % 1;
    return ph < 0.5 ? ph * 2 : 2 - ph * 2;
  }

  sdView(game, now) {
    const base = { type: game.type, kindId: game.kindId, objectId: game.objectId, elapsed: now - game.startedAt, total: game.endsAt - game.startedAt };
    if (game.type === 'rhythm') return { ...base, variant: game.variant, beats: game.beats, scored: game.scored, tolerance: game.tol || SD_TOLERANCE_MS, kindId: game.kindId };
    if (game.type === 'needle') return { ...base, period: game.period, zone: game.zones[game.stage], width: game.width, stage: game.stage, stages: game.zones.length };
    if (game.type === 'lock') {
      const pin = game.pins[Math.min(game.stage, game.pins.length - 1)];
      return { ...base, phase: game.phase, period: pin.period, zone: pin.zone, width: game.width, stage: game.stage, stages: game.pins.length, pinElapsed: now - game.pinAt, handMs: game.phase === 'hand' ? Math.max(0, game.handUntil - now) : 0 };
    }
    if (game.type === 'keys') {
      return { ...base, phase: game.phase, phaseMs: Math.max(0, game.phaseUntil - now), round: game.round, rounds: KEYS_PARTS.length, fails: game.fails, maxFails: 3, len: game.seq.length, idx: game.idx, seq: game.phase === 'show' ? game.seq : null, pool: game.phase === 'input' ? game.pool : null, dealt: game.dealt };
    }
    if (game.type === 'meter') return { ...base, period: game.period };
    return { ...base, count: game.count, target: game.target };
  }

  sdHp(playerId, patient, delta, now) {
    const max = patient.maxHp || patient.hp;
    patient.hp = delta < 0 ? Math.max(PATIENT_HP_MIN, patient.hp + delta) : Math.min(max, patient.hp + delta);
    if (patient.hp <= PATIENT_HP_MIN && patient.status === 'alive') patient.status = 'self_won';
  }

  keysNewRound(game, now) {
    const len = KEYS_LEN[Math.min(game.round, KEYS_LEN.length - 1)];
    const deck = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    game.seq = deck.slice(0, len);
    game.pool = [...game.seq].sort(() => Math.random() - 0.5);
    if (game.pool.every((v, i) => v === game.seq[i])) game.pool.reverse();
    game.idx = 0;
    game.phase = 'show';
    game.phaseUntil = now + 1000 + len * 350;
  }

  keysFail(playerId, entity, patient, game, now) {
    game.fails += 1;
    this.sdHp(playerId, patient, 1, now);
    if (game.fails > 3) {
      this.sdHp(playerId, patient, 6, now);
      this.finishSelfDamage(playerId, entity, now, true);
      return;
    }
    this.keysNewRound(game, now);
  }

  pressSelfDamage(playerId, entity, patient, game, now, dir) {
    if (game.type === 'lock') {
      if (game.phase === 'hand') {
        if (now <= game.handUntil) {
          game.done = true;
          game.hits = 3;
          this.finishSelfDamage(playerId, entity, now);
        }
        return;
      }
      const pin = game.pins[game.stage];
      const ph = (((now - game.pinAt) / pin.period) % 1 + 1) % 1;
      const pos = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      if (Math.abs(pos - pin.zone) <= game.width) {
        game.stage += 1;
        game.pinAt = now;
        this.award(playerId, 1, 'Auto-daño');
        if (game.stage >= game.pins.length) {
          game.phase = 'hand';
          game.handUntil = now + 1800;
          game.endsAt = game.handUntil;
        }
      } else {
        game.stage = 0;
        game.pinAt = now;
      }
      return;
    }
    if (game.type === 'keys') {
      if (game.phase !== 'input' || !Array.isArray(dir) || dir.length !== game.seq.length) return;
      if (!dir.every((v, i) => v === game.seq[i])) { this.keysFail(playerId, entity, patient, game, now); return; }
      const dmg = KEYS_PARTS[game.round];
      game.dealt += dmg;
      game.hits += 1;
      this.sdHp(playerId, patient, -dmg, now);
      this.award(playerId, 1, 'Auto-daño');
      game.round += 1;
      if (patient.status !== 'alive' || game.round >= KEYS_PARTS.length) { this.finishSelfDamage(playerId, entity, now); return; }
      this.keysNewRound(game, now);
      return;
    }
    if (game.type === 'mash') {
      game.count += 1;
      game.hits = game.count;
      this.award(playerId, 0, 'Auto-daño');
      if (game.count >= game.target) this.finishSelfDamage(playerId, entity, now);
      return;
    }
    if (game.type === 'meter') {
      const pos = this.needlePos(game, now);
      game.score = Math.max(0, 1 - Math.abs(pos - 0.5) / (game.div || 0.27));
      if (game.score > 0.85) this.award(playerId, 1, 'Auto-daño');
      this.finishSelfDamage(playerId, entity, now);
      return;
    }
    if (game.type === 'needle') {
      const pos = this.needlePos(game, now);
      if (Math.abs(pos - game.zones[game.stage]) <= game.width) {
        game.hits += 1;
        game.stage += 1;
        this.award(playerId, 1, 'Auto-daño');
        if (game.stage >= game.zones.length) this.finishSelfDamage(playerId, entity, now);
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
    if (bestIdx >= 0 && bestGap <= (game.tol || SD_TOLERANCE_MS)) {
      game.scored.push(bestIdx);
      game.hits += 1;
      this.award(playerId, 1, 'Auto-daño');
      if (game.hits >= game.beats.length) this.finishSelfDamage(playerId, entity, now);
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
    if (game.type === 'keys') {
      if (game.phase === 'connect' && now >= game.phaseUntil) this.keysNewRound(game, now);
      else if (game.phase === 'show' && now >= game.phaseUntil) { game.phase = 'input'; game.phaseUntil = now + 3200 + game.seq.length * 550; }
      else if (game.phase === 'input' && now >= game.phaseUntil) this.keysFail(playerId, entity, patient, game, now);
      return;
    }
    if (game.type === 'rhythm') {
      const t = now - game.startedAt;
      const missed = game.beats.some((b, i) => !game.scored.includes(i) && t > b + (game.tol || SD_TOLERANCE_MS));
      if (missed || now >= game.endsAt) this.finishSelfDamage(playerId, entity, now);
    } else if (now >= game.endsAt) {
      this.finishSelfDamage(playerId, entity, now);
    }
  }

  sdDamage(game) {
    if (game.type === 'lock') return game.done ? LOCK_DAMAGE : 0;
    if (game.type === 'keys') return game.dealt;
    let d;
    if (game.type === 'mash') d = Math.min(SD_MAX_DAMAGE, (game.count / game.target) * SD_MAX_DAMAGE);
    else if (game.type === 'needle') d = (game.hits / game.zones.length) * SD_MAX_DAMAGE;
    else if (game.type === 'meter') d = game.score * SD_MAX_DAMAGE;
    else d = (game.hits / game.beats.length) * SD_MAX_DAMAGE;
    return Math.round(d * (game.scale || 1));
  }

  finishSelfDamage(playerId, entity, now, failed = false) {
    const game = entity.selfDmg;
    entity.selfDmg = null;
    const patient = this.gameState.patients[playerId];
    if (!game || !patient || (patient.status !== 'alive' && game.type !== 'keys')) return;
    const damage = this.sdDamage(game);
    const perfect = game.type === 'keys' ? game.round >= KEYS_PARTS.length : damage >= Math.round(SD_MAX_DAMAGE * (game.scale || 1));
    if (perfect) this.award(playerId, 4, 'Auto-daño perfecto');
    const handler = this.gameState.moduleHandler && this.gameState.moduleHandler[game.objectId];
    if (damage > 0 && handler && handler !== playerId) {
      this.award(handler, perfect ? 6 : 3, 'Módulo entregado');
      delete this.gameState.moduleHandler[game.objectId];
    }
    if (damage > 0) {
      if (game.type !== 'keys') {
        patient.hp = Math.max(PATIENT_HP_MIN, patient.hp - damage);
        if (patient.hp <= PATIENT_HP_MIN) patient.status = 'self_won';
      }
      if (!this.gameState.moduleRelocate) this.gameState.moduleRelocate = {};
      this.gameState.moduleRelocate[game.objectId] = now + MODULE_RELOCATE_MS;
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

  checkLastStanding() {
    const gs = this.gameState;
    if (gs.lastStanding || this.tutorial || this.bossActive) return;
    const alive = Object.entries(gs.patients).filter(([, p]) => p.status === 'alive');
    if (alive.length !== 1) return;
    const survivorId = alive[0][0];
    gs.lastStanding = true;
    gs.timeRemainingMs = LMS_TIMER_RESET_MS;
    const gimmick = LMS_GIMMICKS[Math.floor(Math.random() * LMS_GIMMICKS.length)];
    const curatorId = [...this.players.entries()].find(([, p]) => p.isAsymRole)?.[0] || null;
    gs.lms = { survivorId, curatorId, gimmick, mode: this.mode };
    if (this.mode === 'dual') for (const pl of this.players.values()) if (pl.isAsymRole) { pl.curatorSpeed = 1; pl.curatorMult = 1; }
    const now = Date.now();
    for (const entity of [gs.entities[survivorId], curatorId ? gs.entities[curatorId] : null]) {
      if (!entity) continue;
      if (gimmick === 'adrenalina') {
        entity.allyBoostUntil = now + LMS_TIMER_RESET_MS + 5000;
        entity.allyBoostLevel = 3;
      }
      if (gimmick === 'reflejos') {
        entity.perezaUntil = now + LMS_TIMER_RESET_MS + 5000;
        entity.perezaLevel = 3;
      }
    }
    this.broadcast(MessageType.LAST_STANDING, { timeRemainingMs: gs.timeRemainingMs, survivorId, curatorId, gimmick });
  }

  onPatientFullyCured() {
    const patientsAlive = Object.values(this.gameState.patients).filter((p) => p.status === 'alive').length;
    const factor = (1 - (10 * patientsAlive) / 100) / 3;
    const rawBonusMs = this.gameState.patientsInitialCount * factor * 60 * 1000;
    const clampedBonusMs = Math.max(0, Math.min(TIME_BONUS_MAX_MS, rawBonusMs));
    this.gameState.timeRemainingMs += clampedBonusMs;
  }

  checkGameEndConditions() {
    if (this.gameState.gameOver) return;
    if (this.bossActive) {
      if (Boss.checkEnd(this)) this.endGame('boss_won', true);
      return;
    }
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
    // tocamos this.phase acá, seguimos en 'action' mientras se muestra el
    // resultado, pero dejamos de simular movimiento/física mientras se ve
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
   * 'action', por eso "se podía seguir jugando" después del game over -
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
    this.tutorial = false;
    this.clearSecondCurator();
    this.restoreMap();
    this.startAt = null;
    this.switchPhase('lobby', 'vuelta al lobby');
  }

  switchPhase(newPhase, reason = '') {
    this.phase = newPhase;
    if (newPhase === 'lobby') {
      this.navCache = null;
      this.nav = null;
      for (const pl of this.players.values()) if (pl.nav) pl.nav = null;
    }
    if (newPhase === 'action') {
      this.initGameState();
      for (const [playerId, player] of this.players) {
        if (player.isAsymRole || player.isBoss) continue;
        const entity = this.gameState.entities[playerId];
        if (!entity) continue;
        this.sendCardOffer(playerId, entity);
      }
    }
    this.broadcast(MessageType.PHASE_CHANGE, { newPhase, reason });
  }
}

module.exports = { Room, MAX_PLAYERS };
