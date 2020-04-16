

const { room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true
});


const socket = io();

let canvas = document.getElementsByClassName('whiteboard')[0];
let colors = document.querySelector('.colors');
let context = canvas.getContext('2d');
let user = document.getElementsByClassName("user")[0];

// request to join room
socket.emit("joinRoom", {
  id: room,
  canvas: [],
  users: [],
  colls: "",
  created: new Date()
})


// update user id for current player
socket.on("newId", (data) => {
  let {user, room} = data;

  let u = document.querySelector(".user");
  u.id = user.id;
  u.style.backgroundColor = user.avatar;

  user.x = 0;
  user.y = 0;

  startListening(user);

  let w = canvas.width;
  let h = canvas.height;

  let c = room.canvas;
  for(let i=0; i < c.length; i++){
    let d = c[i]
    drawLine(d.x0*w, d.y0*h, d.x1*w, d.y1*h, d.color, false, null)
  }
})


socket.on('roomUsers', (users) => {
  document.querySelector(".player-count").innerText = users.length;

  // TODO: add visual for showing connected users
});

// add a new player to DOM
socket.on("newUser", (user) => {
  let newPlayer = document.getElementById(user.id)

  if(!newPlayer){
    newPlayer = document.createElement("div")
    newPlayer.classList.add("user")
    newPlayer.id = user.id;
    newPlayer.style.backgroundColor = user.avatar
    newPlayer.style.display = "none";
    document.body.appendChild(newPlayer)
  }
})

socket.on("colluded", (collision) => {
  document.body.classList.add("colluded")
  context.clearRect(0, 0, canvas.width, canvas.height);
  setTimeout(() => {
    document.body.classList.remove("colluded")
  }, 500);
})


socket.on("playerDisconnect", (id) => {
  if(!document.getElementById(id)){ 
    return;
  }

  document.getElementById(id).remove();
})

let current = {
  color: 'black',
  user: ""
};

let drawing = false;

function startListening(user){
  current.user = user;

  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

  //Touch support for mobile devices
  canvas.addEventListener('touchstart', onMouseDown, false);
  canvas.addEventListener('touchend', onMouseUp, false);
  canvas.addEventListener('touchcancel', onMouseUp, false);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);

  // for (var i = 0; i < colors.length; i++){
  //   colors[i].addEventListener('click', onColorUpdate, false);
  // }


  colors.addEventListener("click", (e) => {
    if(e.target.classList.contains("colors")) {
      return;
    }

    current.color = e.target.className.split(' ')[1];
    e.target.classList.add("active")

    let others = document.getElementsByClassName("color")
    for(let i=0; i < others.length; i++){
      if(!others[i].classList.contains(current.color)){
        others[i].classList.remove("active")
      }
    }
  })

}



socket.on('drawing', onDrawingEvent);
socket.on('userMoving', onUserEvent);

window.addEventListener('resize', onResize, false);
onResize();


function drawLine(x0, y0, x1, y1, color, emit, u){
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();
  context.closePath();

  if (!emit) { return; }
  var w = canvas.width;
  var h = canvas.height;


  if(u){
    user.style.left = u.x + "px"
    user.style.top = (u.y-20) + "px"
  }

  current.user.lastDraw = new Date();


  socket.emit('drawing', {
    x0: x0 / w,
    y0: y0 / h,
    x1: x1 / w,
    y1: y1 / h,
    color: color,
    user: current.user
  });
}

function onMouseDown(e){
  drawing = true;
  current.x = e.clientX||e.touches[0].clientX;
  current.y = e.clientY||e.touches[0].clientY;
}

function onMouseUp(e){
  if (!drawing) { return; }
  drawing = false;
  
  current.user.x = e.clientX
  current.user.y = e.clientY
  

  drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true, current.user);
}

function onMouseMove(e){
  user.style.left = e.clientX + "px"
  user.style.top = e.clientY + "px"

  if (!drawing) { 
    current.user.x = e.clientX
    current.user.y = e.clientY

    socket.emit('userMoving', {
      user: current.user
    });


    return;
  }


  current.user.x = e.clientX
  current.user.y = e.clientY

  
  drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true, current.user);
  current.x = e.clientX||e.touches[0].clientX;
  current.y = e.clientY||e.touches[0].clientY;
}


// limit the number of events per second
function throttle(callback, delay) {
  var previousCall = new Date().getTime();
  return function() {
    var time = new Date().getTime();

    if ((time - previousCall) >= delay) {
      previousCall = time;
      callback.apply(null, arguments);
    }
  };
}

function onUserEvent(data){
  var w = canvas.width;
  var h = canvas.height;

  
  if(!document.getElementById(data.user.id)){
    let user = document.createElement("div");
    user.classList.add("user")
    user.id = data.user.id;
    user.style.backgroundColor = data.user.avatar;
    document.body.appendChild(user)
  } else{
    let user = document.getElementById(data.user.id)
    user.style.display = "block"
    user.style.left = data.user.x + "px"
    user.style.top = data.user.y + "px"
  }
  
}

function onDrawingEvent(data){
  var w = canvas.width;
  var h = canvas.height;

  
  if(!document.getElementById(data.user.id)){
    let user = document.createElement("div");
    user.classList.add("user")
    user.id = data.user.id;
    user.style.backgroundColor = data.user.color;
    document.body.appendChild(user)
  } else{
    let user = document.getElementById(data.user.id)
    user.style.left = data.user.x + "px"
    user.style.top = data.user.y + "px"
  }
  
  drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
}

// make the canvas fill its parent
function onResize() {
  let temp = context.getImageData(0, 0, canvas.width, canvas.height)

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  context.putImageData(temp, 0, 0)
}