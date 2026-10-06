const http = require('http');
const { WebSocketServer } = require('ws');
const { MessageType, encode, decode } = require('./protocol');
const { RoomManager } = require('./RoomManager');
const GameMap = require('./GameMap');
const { registerAuthRoutes } = require('./auth/routes');
const { initSchema } = require('./auth/db');
const { verifyToken } = require('./auth/jwt');

const PORT = process.env.PORT || 3001;
const roomManager = new RoomManager();

const httpRoutes = new Map();
registerAuthRoutes(httpRoutes);

const httpServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: roomManager.roomCount() }));
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
        const { roomId, token } = msg.payload;
        if (!roomId || !token) {
          ws.send(encode(MessageType.ERROR, { message: 'roomId y token son requeridos' }));
          return;
        }
        const session = verifyToken(token);
        if (!session) {
          ws.send(encode(MessageType.ERROR, { message: 'Sesión inválida o expirada. Iniciá sesión de nuevo.' }));
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
        }));

        room.broadcast(MessageType.ROOM_UPDATE, { players: room.getPlayersSummary() }, playerId);
        break;
      }

      case MessageType.START_GAME: {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) return;
        if (room.hostId !== playerId) {
          ws.send(encode(MessageType.ERROR, { message: 'Solo el host puede iniciar la partida' }));
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
    room.broadcast(MessageType.ROOM_UPDATE, { players: room.getPlayersSummary() });
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

initSchema()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo inicializar la base de datos:', err.message);
    process.exit(1);
  });
