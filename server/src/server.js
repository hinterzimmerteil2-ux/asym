const http = require('http');
const { WebSocketServer } = require('ws');
const { MessageType, encode, decode } = require('./protocol');
const { RoomManager } = require('./RoomManager');
const GameMap = require('./GameMap');
const Characters = require('./Characters');
const { registerAuthRoutes } = require('./auth/routes');
const { initSchema } = require('./auth/db');
const { verifyToken } = require('./auth/jwt');

const PORT = process.env.PORT || 3001;
const roomManager = new RoomManager();

const httpRoutes = new Map();
registerAuthRoutes(httpRoutes);

// El cliente (Vercel) y el servidor (Render) viven en dominios distintos,
// así que el navegador exige CORS en toda respuesta HTTP (incluido el
// preflight OPTIONS) o bloquea el fetch con "Failed to fetch" sin siquiera
// mostrar el error real del servidor.
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

function applyCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || CLIENT_URL);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const httpServer = http.createServer((req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: roomManager.roomCount() }));
    return;
  }

  if (url.pathname === '/maps' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ maps: GameMap.listMaps() }));
    return;
  }

  if (url.pathname === '/maps' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const layout = JSON.parse(body || '{}');
        const saved = GameMap.registerMap(layout);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ map: { id: saved.id, name: saved.name, custom: true } }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  const handler = httpRoutes.get(url.pathname);
  if (handler) {
    handler(req, res, url);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Asym game server running');
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let playerId = null;
  let currentRoomId = null;

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    const msg = decode(raw.toString());
    if (!msg) return;

    switch (msg.type) {
      case MessageType.JOIN_ROOM: {
        const { token } = msg.payload;
        // Dos jugadores que escriben "Sala1" y "sala1 " (con espacio o
        // mayúsculas distintas) deben terminar en la MISMA sala. Sin
        // normalizar acá, el Map de RoomManager los trata como salas
        // distintas y cada uno ve el lobby "vacío" — la causa más común
        // de "no encuentro al otro jugador".
        const roomId = typeof msg.payload.roomId === 'string' ? msg.payload.roomId.trim().toLowerCase() : '';
        if (!roomId || !token) {
          ws.send(encode(MessageType.ERROR, { message: 'roomId y token son requeridos' }));
          return;
        }
        const session = verifyToken(token);
        if (!session) {
          ws.send(encode(MessageType.ERROR, { message: 'Sesión inválida o expirada. Inicia sesión de nuevo.' }));
          return;
        }
        playerId = session.userId;
        const playerName = session.displayName;

        const room = roomManager.getOrCreateRoom(roomId);
        if (room.isFull()) {
          ws.send(encode(MessageType.ROOM_FULL, {}));
          return;
        }

        room.addPlayer(playerId, ws, playerName);
        currentRoomId = roomId;

        ws.send(encode(MessageType.ROOM_JOINED, {
          roomId,
          playerId,
          players: room.getPlayersSummary(),
          isAsymRole: room.players.get(playerId).isAsymRole,
          chatHistory: room.chatHistory,
          hostId: room.hostId,
          characters: Characters.listCharacters(),
          mapId: room.mapId,
          maps: GameMap.listMaps(),
        }));

        room.broadcast(MessageType.ROOM_UPDATE, { players: room.getPlayersSummary(), hostId: room.hostId }, playerId);
        break;
      }

      case MessageType.SET_ASYM_ROLE: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) return;
        room.setAsymRole(playerId, msg.payload.targetPlayerId);
        break;
      }

      case MessageType.SELECT_CHARACTER: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) return;
        room.selectCharacter(playerId, msg.payload.characterId);
        break;
      }

      case MessageType.SET_MAP: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) return;
        room.setMap(playerId, msg.payload.mapId);
        break;
      }

      case MessageType.START_GAME: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) return;
        if (room.hostId !== playerId) {
          ws.send(encode(MessageType.ERROR, { message: 'Solo el host puede iniciar la partida' }));
          return;
        }
        if (room.players.size < 2) {
          ws.send(encode(MessageType.ERROR, { message: 'Hace falta al menos 1 Curador y 1 Paciente para empezar' }));
          return;
        }
        room.switchPhase('action', 'inicio de partida');
        room.broadcast(MessageType.GAME_STARTED, {
          phase: 'action',
          state: room.gameState,
          collisionObjects: GameMap.resolveCollisionObjects(room.mapId, GameMap.MATCH_AREA),
        });
        break;
      }

      case MessageType.SET_DISPLAY_NAME: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) return;
        room.setDisplayName(playerId, msg.payload.displayName);
        break;
      }

      case MessageType.RETURN_TO_LOBBY: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) return;
        room.returnToLobby(playerId);
        break;
      }

      case MessageType.CHAT_MESSAGE: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) return;
        room.handleChatMessage(playerId, msg.payload.text);
        break;
      }

      case MessageType.PLAYER_INPUT: {
        const room = roomManager.getRoom(currentRoomId);
        // El movimiento funciona en CUALQUIER fase (lobby incluido).
        if (!room) return;
        room.applyPlayerInput(playerId, msg.payload.input || {});
        break;
      }

      case MessageType.CURE_ACTION: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room || room.phase !== 'action') return;
        room.applyCure(playerId, msg.payload.targetPlayerId);
        break;
      }

      case MessageType.SELF_DAMAGE_ACTION: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room || room.phase !== 'action') return;
        room.applySelfDamage(playerId, msg.payload.objectId);
        break;
      }

      case MessageType.LEAVE_ROOM: {
        handleLeave();
        break;
      }

      case MessageType.PING: {
        ws.send(encode(MessageType.PONG, {}));
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', handleLeave);
  ws.on('error', handleLeave);

  function handleLeave() {
    if (!currentRoomId) return;
    const room = roomManager.getRoom(currentRoomId);
    if (!room) return;
    room.removePlayer(playerId);
    room.broadcast(MessageType.ROOM_UPDATE, { players: room.getPlayersSummary(), hostId: room.hostId });
    roomManager.removeRoomIfEmpty(currentRoomId);
    currentRoomId = null;
  }
});

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

// El juego principal (lobby, chat, partida, curar/autodañarse) no depende de
// Postgres: solo lo necesita el login con cuenta (Google/Discord). Si la DB
// no está configurada o no responde, el servidor sigue arriba igual —
// simplemente el login con cuenta no va a funcionar hasta que se resuelva.
initSchema()
  .then(() => {
    console.log('Base de datos lista (auth con cuenta habilitado).');
  })
  .catch((err) => {
    console.warn(
      'No se pudo inicializar la base de datos, el servidor sigue arriba sin auth con cuenta:',
      err.message
    );
  })
  .finally(() => {
    httpServer.listen(PORT, () => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
    });
  });
