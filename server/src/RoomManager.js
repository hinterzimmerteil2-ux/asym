const GameMap = require('./GameMap');
const { Room } = require('./Room');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = new Room(roomId);
      room.mapId = GameMap.HOSPITAL_ID;
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
