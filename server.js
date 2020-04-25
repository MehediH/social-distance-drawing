
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const { createRoom, getRoom, userJoin, getRoomUsers, userLeave, updateRoomCanvas, getRooms, getUserFromRoom, resetRoomCanvas, lockRoom, updateCanvasBG} = require("./utils/rooms");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const maxRoomLimit = 10;

// Set static folder
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

io.on('connection', (socket) => {
  let uid;
  let rid;

  socket.on("joinRoom", (data) => {
    let {room, userName} = data;

    if(getRoom(room.id) === undefined){ // if a room doesn't exist, we make a new one
      room = createRoom(room)
    } else{
      room = getRoom(room.id)
    }

    rid = room.id;

    if(room.locked){
      socket.emit("joinFail", "Room is locked")
      return;
    } else if(room.users.length+1 > maxRoomLimit){
      socket.emit("joinFail", "Room is full with 10 players. Try later :)")
      return;
    }

    socket.join(room.id)

    // random color
    let rc = "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});

    let user = userJoin(socket.id, userName, rc, 0, 0, 0, 0, room)

    uid = socket.id;

    socket.emit("newId", {user, room: getRoom(room.id)}) // tell user about their updated details

    io.to(room.id).emit("newUser", user) // tell everyone except user about the new player

    // send players and room info
    io.to(room.id).emit("roomUsers", getRoomUsers(room.id))

  })


  socket.on('drawing', (data) => {
    let updatedUserPositions = updateRoomCanvas(rid, data)
    let currentUser = getUserFromRoom(rid, uid)

    if(currentUser){
      let ldP1 = new Date(currentUser.lastDraw);

      for(user in updatedUserPositions){  
        user = updatedUserPositions[user];

        if(user.id !== currentUser.id){
          let dx = currentUser.x - user.x; 
          let dy = currentUser.y - user.y;

          let distance = Math.sqrt((dx * dx) + (dy * dy));
          let ldP2 = new Date(user.lastDraw);

          let timeDiff = Math.abs(ldP2-ldP1) / 1000

          if (distance < 8 && timeDiff < 2) {
            let room = resetRoomCanvas(rid)

            let collision = {
              p1: currentUser,
              p2: user,
              distance,
              dx,
              dy,
              bg: room.bg
            }

            io.to(rid).emit("collided", collision)
          }
        }
      }
    }

    socket.broadcast.to(rid).emit('drawing', data)
  });

  socket.on('userMoving', (data) => {
    socket.broadcast.to(rid).emit('userMoving', data)
  });

  socket.on("clearCanvas", (user) => {
    resetRoomCanvas(rid)
    socket.broadcast.to(rid).emit('clearCanvas', user)
  })

  socket.on("canvasColorChange", (color) => {
    updateCanvasBG(rid, color)
    socket.broadcast.to(rid).emit('canvasColorChange', color)
  })

  socket.on("lockRoom", (user) => {
    let status = lockRoom(rid)
    io.to(rid).emit("lockRoom", {user, status})
  })

  socket.on("chatMessage", (message) => {
    io.to(rid).emit("rcvMessage", message)
  })
  

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