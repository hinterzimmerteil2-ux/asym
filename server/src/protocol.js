/**
 * Protocolo de mensajes del juego.
 * Todo mensaje viaja como JSON: { type, payload }
 */

const MessageType = {
  // --- Sala / lobby ---
  JOIN_ROOM: 'join_room',           // client -> server: { roomId, token }
  ROOM_JOINED: 'room_joined',       // server -> client: { roomId, playerId, players[], isAsymRole, chatHistory[] }
  ROOM_UPDATE: 'room_update',       // server -> client: { players[] }
  LEAVE_ROOM: 'leave_room',         // client -> server: {}
  ROOM_FULL: 'room_full',           // server -> client: {}
  ROOM_NOT_FOUND: 'room_not_found', // server -> client: {}

  START_GAME: 'start_game',         // client(host) -> server: {}
  GAME_STARTED: 'game_started',     // server -> todos: { phase, state, collisionObjects[] }

  // --- Chat de sala ---
  CHAT_MESSAGE: 'chat_message',
  CHAT_BROADCAST: 'chat_broadcast',

  // --- Fase acción rápida (tick loop) ---
  PLAYER_INPUT: 'player_input',
  STATE_SNAPSHOT: 'state_snapshot', // { tick, entities, timeRemainingMs, patients, selfDamageObjects }

  // --- Interacciones de curación/daño ---
  CURE_ACTION: 'cure_action',
  CURE_RESULT: 'cure_result',
  SELF_DAMAGE_ACTION: 'self_damage_action',
  SELF_DAMAGE_RESULT: 'self_damage_result',

  // --- Fin de partida ---
  GAME_OVER: 'game_over',

  // --- Fase turnos (NO usada por las reglas actuales, se deja disponible) ---
  TURN_START: 'turn_start',
  TURN_ACTION: 'turn_action',
  TURN_RESULT: 'turn_result',

  // --- Cambio de fase ---
  PHASE_CHANGE: 'phase_change',

  // --- Genérico ---
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
};

function encode(type, payload = {}) {
  return JSON.stringify({ type, payload });
}

function decode(raw) {
  try {
    const msg = JSON.parse(raw);
    if (!msg.type) return null;
    return { type: msg.type, payload: msg.payload || {} };
  } catch {
    return null;
  }
}

module.exports = { MessageType, encode, decode };
