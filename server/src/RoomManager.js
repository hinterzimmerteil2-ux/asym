const GameMap = require('./GameMap');
const { Room } = require('./Room');

const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 60;
const DEFAULT_ALLOWED = ['sala1', 'sala2', 'sala3', 'sala4', 'sala5', 'sala6', 'test1'];

class RoomManager {
  constructor() {
    this.rooms = new Map();
    const env = (process.env.ALLOWED_ROOMS || '').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
    this.allowed = env.length ? env : DEFAULT_ALLOWED;
  }

  isDefault(roomId) {
    return this.allowed.includes(roomId);
  }

  canCreate(roomId) {
    return this.rooms.has(roomId) || this.rooms.size < MAX_ROOMS;
  }

  listRooms() {
    return this.allowed.map((id) => {
      const room = this.rooms.get(id);
      return { id, players: room ? room.playerCount() : 0 };
    });
  }

  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = new Room(roomId);
      room.mapId = GameMap.GENERAL_ID;
      room.isDefault = this.isDefault(roomId);
      this.rooms.set(roomId, room);
    }
    return this.rooms.get(roomId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  removeRoomIfEmpty(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.isEmpty()) {
      room.stopTickLoop();
      this.rooms.delete(roomId);
    }
  }

  roomCount() {
    return this.rooms.size;
  }
}

module.exports = { RoomManager };
