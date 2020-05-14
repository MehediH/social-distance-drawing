
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const compression = require('compression');
const minify = require('express-minify');

const { createRoom, getRoom, userJoin, getRoomUsers, userLeave, updateRoomCanvas, getRooms, getUserFromRoom, resetRoomCanvas, lockRoom, updateCanvasBG, startGame, nextRound, votePlayer, userSetAudio, setGameMode, updateName, userSetMute} = require("./utils/rooms");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const maxRoomLimit = 10;

app.use(compression());
app.use(minify());

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

    let user = userJoin(socket.id, userName, rc, 0, 0, 0, 0, room, false, false)

    uid = socket.id;

    socket.emit("newId", {user, room: getRoom(room.id)}) // tell user about their updated details

    io.to(room.id).emit("newUser", user) // tell everyone except user about the new player

    // send players and room info
    io.to(room.id).emit("roomUsers", getRoomUsers(room.id))

    notifyOpenRooms()

  })
  

  socket.on('drawing', (data) => {
    let updatedUserPositions = updateRoomCanvas(rid, data)
    let currentUser = getUserFromRoom(rid, uid)

    if(currentUser){
      checkCollisions(currentUser, updatedUserPositions)
    }

    socket.broadcast.to(rid).emit('drawing', data)
  });

  socket.on('userMoving', (data) => {
    socket.broadcast.to(rid).emit('userMoving', data)
  });

  socket.on("clearCanvas", (user) => {
    let room = resetRoomCanvas(rid)
    io.to(rid).emit('clearCanvas', {room, user})
  })

  socket.on("canvasColorChange", (color) => {
    updateCanvasBG(rid, color)
    socket.broadcast.to(rid).emit('canvasColorChange', color)
  })

  socket.on("lockRoom", (user) => {
    let status = lockRoom(rid)
    notifyOpenRooms();
    io.to(rid).emit("lockRoom", {user, status})
  })

  socket.on("chatMessage", (message) => {
    io.to(rid).emit("rcvMessage", message)
  })
  
  socket.on("joinGame", (restart=false) => {
    let room = getRoom(rid)
    let game = room.game;

    if(game.round === 0 || restart){
      game = startGame(rid)
      socket.emit("joinGame", game)
    } else{
      socket.emit("joinGame", game)
    }
  })  

  socket.on("requestFinish", () => {
    let room = getRoom(rid);
    socket.emit("gameFinish", room.game)
  })

  socket.on("nextRound", () => {
    let room = getRoom(rid);
    let game = room.game;

    let timer = Math.abs(Date.now()-game.timer) / 1000

    
    if(timer < 60){
      socket.emit("joinGame", game)
      return;
    }

    // if(game.round === 5){
    //   io.to(rid).emit("gameFinish", game)
    //   return;
    // }
    
    io.to(rid).emit('clearCanvas', {room, user: {userName: "the game"}})

    let newRound = nextRound(rid);
    socket.emit("joinGame", newRound)
  })

  socket.on("reloadGame", () => io.to(rid).emit("reloadGame"))

  socket.on("getPlayerList", () => {
    let {users, game} = getRoom(rid);
    socket.emit("playersList", {users, ranks: game.ranks})
  })


  socket.on("votePlayer", vote => {
    votePlayer(rid, vote.playerId, vote.round);
    
    // let votesForThisRound = getGameVotesPerRound(rid, vote.round);
    // let {users} = getRoom(rid);

    // if(votesForThisRound === users.length){
    //   io.to(rid).emit("skipRoundWait")
    // }
  })

  socket.on("justDraw", (mode) => {
    setGameMode(rid, mode)
  })

  socket.on("updateName", (newName) => {
    let data = updateName(uid, rid, newName)
    io.to(rid).emit("updatedUserName", data)
  })

  socket.on("loadOpenRooms", () => {
    notifyOpenRooms()
  })

  function notifyOpenRooms(){
    let rooms = getRooms();

    rooms = rooms.filter(room => room.locked === false)

    io.emit("openRooms", rooms)
  }

  socket.on("disconnect", () => {
    const user = userLeave(uid, rid)

    if(!user){
      return;
    }

    socket.broadcast.emit("playerDisconnect", user)

    // send players and room info
    io.to(rid).emit("roomUsers", getRoomUsers(rid)) 
    notifyOpenRooms()
  })

  socket.on("joinAudio", () => {
    userSetAudio(rid, uid, true)

    io.to(rid).emit("loadExistingAudios", getRoomUsers(rid)) 
    io.to(rid).emit("roomUsers", getRoomUsers(rid)) 
  })

  socket.on("leaveAudio", () => {
    let usersStillInRoom = userSetAudio(rid, uid, false)

    socket.broadcast.to(rid).emit("participantLeft", {uid, usersStillInRoom}) 
  })

  socket.on("setMute", (status) => {
    userSetMute(rid, uid, status)
    
    io.to(rid).emit("updateParticipantMute", {uid, status})  
  })

  socket.on("sendSig", payload => {
    io.to(payload.userToSignal).emit('userJoinedAudio', { signal: payload.signal, callerID: payload.callerID });
  });

  socket.on("returnSig", payload => {
    io.to(payload.callerID).emit('rcvSig', { signal: payload.signal, id: socket.id });
  });

  function checkCollisions(currentUser, updatedUserPositions){
    // collision grace for everyone in general
    let {lastCollision} = getRoom(rid)
    
    let timeNow = Date.now();
    let lastCollDiff = Math.abs(timeNow-lastCollision) / 1000

    if(lastCollDiff < 5){
      return;
    }

    // if there's not been a collision in the last 5 seconds
    // we start collision detection
    let ldP1 = currentUser.lastDraw;

    for(user in updatedUserPositions){  
      user = updatedUserPositions[user];

      if(user.id !== currentUser.id){
        let dx = currentUser.x - user.x; 
        let dy = currentUser.y - user.y;

        let distance = Math.sqrt((dx * dx) + (dy * dy));
        let ldP2 = user.lastDraw;

        let timeDiff = Math.abs(ldP2-ldP1) / 1000

        if (distance < 8 && timeDiff < 2) {
          let room = resetRoomCanvas(rid, Date.now())

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
});

app.get("*", (req, res) => {
  res.redirect("/")
})

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));