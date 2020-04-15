let rooms = [];

function getRooms(){
    return rooms;
}

// Join user to chat
function userJoin(id, avatar, room, sockets) {
  const user = { id, avatar, sockets };

  const roomIndex = rooms.findIndex(r => r.id === room.id);

  const existingRoomUsers = rooms[roomIndex].users;
  const findInRoom = existingRoomUsers.findIndex(user => user.id === id)

  if(findInRoom === -1){
    rooms[roomIndex].users.push(user)
  }

  return user;
}

// Get room
function getRoom(id) {
    return rooms.find(room => room.id === id);
}

// create room
function createRoom(room){
    rooms.push(room)

    return room;
}

// Get current user
function updateRoomCanvas(rid, data) {
    const room = rooms.find(room => room.id === rid)
    if(!room){return;}

    room.canvas.push(data)
}

// User leaves chat
function userLeave(uid, rid) {
    const roomIndex = rooms.findIndex(room => room.id === rid);
    if(roomIndex === -1){ return; }

    const existingRoomUsers = rooms[roomIndex].users;
    const findInRoom = existingRoomUsers.findIndex(user => user.id === uid)
  
    if(findInRoom !== -1){
      // decide whether to reset room
      let roomUsers = getRoomUsers(rid)
      
      if(roomUsers.length === 1){
        rooms = rooms.filter(room => room.id !== rid)
      }

      return existingRoomUsers.splice(findInRoom, 1)[0];
    }
}

// Get room users
function getRoomUsers(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if(!room){return;}
    return room.users;
}

module.exports = {
  getRooms,
  getRoom,
  createRoom,
  userJoin,
  updateRoomCanvas,
  userLeave,
  getRoomUsers
};