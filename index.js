
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const shortid = require("shortid");

app.use(express.static(__dirname + '/public'));


function onConnection(socket){
  let id = shortid.generate();
  let user = {
    id,
    color: "#"+((1<<24)*Math.random()|0).toString(16),
    x: 0,
    y: 0
  }

  socket.emit("init", user)
 

  socket.on('drawing', (data) => {
    socket.broadcast.emit('drawing', data)
  });

  socket.on('userMoving', (data) => {
    socket.broadcast.emit('userMoving', data)
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("playerDisconnect", user.id)
  })
}

io.on('connection', onConnection);

http.listen(port, () => console.log('listening on port ' + port));
