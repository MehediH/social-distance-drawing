
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const { createRoom, getRoom, userJoin, getRoomUsers, userLeave, updateRoomCanvas, getRooms, getUserFromRoom, resetRoomCanvas} = require("./utils/rooms");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  let uid;
  let rid;

  socket.on("joinRoom", (room) => {

    if(getRoom(room.id) === undefined){ // if a room doesn't exist, we make a new one
      room = createRoom(room)
    }

    rid = room.id;

    socket.join(room.id)

    let user = userJoin(socket.id, "#"+((1<<24)*Math.random()|0).toString(16), 0, 0, room)

    uid = socket.id;

    socket.emit("newId", {user, room: getRoom(room.id)}) // tell user about their updated details

    socket.broadcast.to(room.id).emit("newUser", user) // tell everyone except user about the new player

    // send players and room info
    io.to(room.id).emit("roomUsers", getRoomUsers(room.id))

  })


  socket.on('drawing', (data) => {
    let updatedUserPositions = updateRoomCanvas(rid, data)
    let currentUser = getUserFromRoom(rid, uid)
    
    if(currentUser){
      let ldP1 = new Date(currentUser.lastDraw);

      // console.log(updatedUserPositions)

      for(user in updatedUserPositions){  
        user = updatedUserPositions[user];

        if(user.id !== currentUser.id){
          let dx = currentUser.x - user.x;
          let dy = currentUser.y = user.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          let ldP2 = new Date(user.lastDraw);

          let timeDiff = Math.abs(ldP2-ldP1) / 1000

          if (distance < 80 && timeDiff < 1.5) {
            resetRoomCanvas(rid)

            let collision = {
              p1: currentUser,
              p2: user,
              distance,
              dx,
              dy
            }

            io.to(rid).emit("colluded", collision)
          }
        }
      }
    }

    socket.broadcast.to(rid).emit('drawing', data)
  });

  socket.on('userMoving', (data) => {
    socket.broadcast.to(rid).emit('userMoving', data)
  });

  socket.on("disconnect", () => {
    const user = userLeave(uid, rid)

    if(!user){
      return;
    }

    socket.broadcast.emit("playerDisconnect", user.id)

    // send players and room info
    io.to(rid).emit("roomUsers", getRoomUsers(rid))
  })
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));