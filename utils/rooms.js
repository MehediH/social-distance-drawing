let rooms = [];

function getRooms(){
    return rooms;
}

// Join user to chat
function userJoin(id, userName, avatar, x, y, pX, pY, room) {
  const user = { id, userName, avatar, x, y, pX, pY, lastDraw: ""};

  const foundRoom = rooms.find(r => r.id === room.id);

  const existingRoomUsers = foundRoom.users;
  const findInRoom = existingRoomUsers.findIndex(user => user.id === id)

  if(findInRoom === -1){
    foundRoom.users.push(user)
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

function updateRoomCanvas(rid, data) {
    const room = rooms.find(room => room.id === rid)
    if(!room){return;}

    room.canvas.push(data)
    return updateUserPos(data, room)
}

function updateUserPos(data, room){
  let user = room.users.find(user => user.id === data.user.id);

  user.x = data.user.x
  user.y = data.user.y
  user.pX = data.user.pX
  user.pY = data.user.pY
  user.lastDraw = data.user.lastDraw
  
  return room.users;
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

// get single user from a room
function getUserFromRoom(rid, uid){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  return room.users.find(user => user.id === uid)
}

function resetRoomCanvas(rid){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  room.canvas = []

  return room;
}

function lockRoom(rid){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  room.locked = !room.locked

  return room.locked
}

function updateCanvasBG(rid, color){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  room.bg = color
}

module.exports = {
  getRooms,
  getRoom,
  createRoom,
  userJoin,
  updateRoomCanvas,
  userLeave,
  getRoomUsers,
  getUserFromRoom,
  resetRoomCanvas,
  lockRoom,
  updateCanvasBG
};