

const { room, name} = Qs.parse(location.search, {
  ignoreQueryPrefix: true
});

if(!room){
  window.location = "/"
}

const socket = io();

let canvas = document.getElementsByClassName('whiteboard')[0];
let colors = document.querySelector('.colors');
let context = canvas.getContext('2d');
let user = document.getElementsByClassName("user")[0];
let clear = document.querySelector(".clear");
let lock = document.querySelector(".lock");
let fill = document.querySelector(".fill");
let toolbarButtons = document.querySelector(".buttons");
let brushSizeControl = document.getElementById("brushSize");
let playerList = document.querySelector(".player-count .dropdown ul");

let brushSize = 10;


brushSizeControl.value = brushSize;

feather.replace() // load icons

let id = "2412"

socket.on("connect", () => {
  id = socket.id.substr(0, 5).replace(/[^a-z0-9]/gi,'').toLowerCase()
  
  joinRoom(name ? name : "anon-" + id)
})


// request to join room
function joinRoom(userName){
  socket.emit("joinRoom", {
    room: {
      id: room,
      canvas: [],
      users: [],
      colls: "",
      created: new Date(),
      locked: false,
      bg: "white"
    },
    userName
  })
}

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

  // repaint existing canvas
  let c = room.canvas;
  updateCanvasColor(room.bg);
  for(let i=0; i < c.length; i++){
    let d = c[i]
    // console.log(d)
    drawLine(d.x0*w, d.y0*h, d.x1*w, d.y1*h, d.color, false, null, d.strokeWidth)
  }
})


socket.on('roomUsers', (users) => {
  document.querySelector(".player-count span").innerText = users.length;
  // TODO: add visual for showing connected users
  // playerList.innerHTML = `${users.map(user => `<li><span style='background-color: ${user.avatar}'></span><p>${user.userName}</p></li>`).join("")}`
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

  showMessage(`<li class="status"><p>${user.userName} joined the room</p></li>`, false)
})

socket.on("colluded", (collision) => {
  document.body.classList.add("colluded")
  context.clearRect(0, 0, canvas.width, canvas.height);
  setTimeout(() => {
    document.body.classList.remove("colluded")
  }, 1000);
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

    let newColor = e.target.className.split(' ')[1];

    if(current.color === newColor || !newColor){
      return;
    }

    current.color = newColor;


    e.target.classList.add("active")
    
    let others = document.getElementsByClassName("color")
    for(let i=0; i < others.length; i++){
      if(!others[i].classList.contains(current.color)){
        // console.log(others[i])
        others[i].classList.remove("active")
      }
    }
  })

}



socket.on('drawing', onDrawingEvent);
socket.on('userMoving', onUserEvent);

window.addEventListener('resize', onResize, false);
onResize();


function drawLine(x0, y0, x1, y1, color, emit, u, strokeWidth){
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = strokeWidth;
  context.lineCap = "round";

  context.stroke();
  context.closePath();

  if (!emit) { return; }
  var w = canvas.width;
  var h = canvas.height;


  if(u){
    user.style.left = u.x + "%"
    user.style.top = u.y+ "%"
  }

  current.user.lastDraw = new Date();


  socket.emit('drawing', {
    x0: x0 / w,
    y0: y0 / h,
    x1: x1 / w,
    y1: y1 / h,
    strokeWidth,
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
  
  let pos = getMousePosition(e.clientX, e.clientY)
  current.user.x = pos[0]
  current.user.y = pos[1]
  current.user.pX = e.clientX
  current.user.pY = e.clientY

  drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true, current.user, brushSize);
}

function onMouseMove(e){
  let pos = getMousePosition(e.clientX, e.clientY)
  user.style.left = pos[0] + "%"
  user.style.top = pos[1] + "%"

  if (!drawing) { 

    current.user.x = pos[0]
    current.user.y = pos[1]
    current.user.pX = e.clientX
    current.user.pY = e.clientY

    socket.emit('userMoving', {
      user: current.user
    });


    return;
  }


  current.user.x = pos[0]
  current.user.y = pos[1]
  current.user.pX = e.clientX
  current.user.pY = e.clientY
  
  drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true, current.user, brushSize);
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
    user.style.left = data.user.x + "%"
    user.style.top = data.user.y + "%"

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
    user.style.left = data.user.x + "%"
    user.style.top = data.user.y + "%"
  }

  drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, false, null, data.strokeWidth);
}

// make the canvas fill its parent
function onResize() {
  let temp = context.getImageData(0, 0, canvas.width, canvas.height)

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  context.putImageData(temp, 0, 0)
}

function getMousePosition(x, y){
  return [(x / window.innerWidth) * 100, ((y / window.innerHeight) * 100)-2.5]
}

clear.addEventListener("click", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit("clearCanvas", current.user)
})

socket.on("clearCanvas", (user) => {
  context.clearRect(0, 0, canvas.width, canvas.height);
})

lock.addEventListener("click", () => {
  socket.emit("lockRoom", current.user)
})

socket.on("joinFail", (message) => {
  alert(message)
  window.location = "/"
})

socket.on("lockRoom", (data) => {
  let {user, status} = data;

  if(status){
    lock.classList.add("locked")
    lock.querySelector("span").innerText = "Unlock room"
  } else{
    lock.classList.remove("locked")
    lock.querySelector("span").innerText = "Lock room"
  }
})

// document.addEventListener("contextmenu", e => e.preventDefault())

// allow brush size change

brushSizeControl.addEventListener("input", () => {
  let inputValue = parseInt(brushSizeControl.value);
  brushSize = inputValue;

  let h4 = document.querySelector(".brush h4")

  h4.innerHTML = inputValue + "<span></span>"
  h4.style.left = inputValue + "%"
  h4.style.transform = "translateX(-50%) scale(" + (1+(inputValue/100)) + ")"
  h4.style.display = "flex"

  let brushVal = document.querySelector(".brush h4 span")
  brushVal.style.backgroundColor = current.color

  
})

// hide current user cursor when they are interacting with the toolbar buttons
function toggleMouse(elem){
  elem.addEventListener("mouseenter", () => {
    user.style.display = "none"
  });
  
  elem.addEventListener("mouseleave", () => {
    user.style.display = "block"
  }); 
}

toggleMouse(toolbarButtons)


const pickr = Pickr.create({
  el: '.toolbar .custom',
  theme: 'nano', // or 'monolith', or 'nano'
  useAsButton: true,
  swatches: ["red", "green", "blue", '#F44336', '#E91E63', '#9C27B0', '#673AB7'],
  default: "purple",
  components: {
      preview: true,
      opacity: true,
      hue: true,
      interaction: {
          hex: true,
          rgba: true,
          input: true,
          cancel: false,
          save: false
      }
  },
});

pickr.on("show", () => current.color = "pruple")

pickr.on("change", (color) => {
  let newColor = color.toHEXA().toString();
  document.querySelector(".toolbar .custom").classList.replace(current.color, newColor)
  current.color = newColor
  // document.querySelector(".toolbar .custom").classList[1] = current.color;
})

// change canvas color
const canvasPickr = Pickr.create({
  el: '.toolbar .fill',
  theme: 'nano', // or 'monolith', or 'nano'
  useAsButton: true,
  swatches: ["red", "green", "blue", '#F44336', '#E91E63', '#9C27B0', '#673AB7'],
  default: "purple",
  components: {
      preview: true,
      opacity: true,
      hue: true,
      interaction: {
          hex: true,
          rgba: true,
          input: true,
          cancel: true,
          save: true
      }
  },
  strings: {
    save: "Set canvas background",
    cancel: "Nevermind"
  }
});

function updateCanvasColor(color){  
  // update canvas bg
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height)

  // updte eraser color to match new canvas bg
  let oldEraser = document.querySelector(".eraser").classList[1];
  document.querySelector(".eraser").classList.replace(oldEraser, color)
}

canvasPickr.on("save", (color) => {
  let c = confirm("Updating the background will clear the canvas. Are you sure you want to do this?")

  if(!c){return;}

  color = color.toHEXA().toString();

  updateCanvasColor(color)

  canvasPickr.hide();

  socket.emit("canvasColorChange", color)
})

// update canvas color 
socket.on("canvasColorChange", color => updateCanvasColor(color))

// user box open
let playerCount = document.querySelector(".player-count")
playerCount.addEventListener("click", (e) => {
  if(!e.target.closest(".dropdown")){
    playerCount.classList.toggle("open")
    playerCount.classList.remove("show-unread")
  }
})

// close user box
document.addEventListener("click", (e) => {
  if(!e.target.closest(".player-count")){
    if(playerCount.classList.contains("open")){
      playerCount.classList.remove("open")
    }
  }
})

// add invite link
let shareLinkBox = document.querySelector(".shareLink")
shareLinkBox.value = window.location.href.split(/[?#]/)[0] + "?room=" + room;

shareLinkBox.addEventListener("focus", (e) => {
  shareLinkBox.select();
})

shareLinkBox.addEventListener("click", (e) => {
  shareLinkBox.select();
})

shareLinkBox.addEventListener("mouseup", (e) => {
  e.preventDefault();
})

// chat input box
let inputBox = document.querySelector(".chat-input input")
let msgSend = document.querySelector(".chat-send")
let msgCont = document.querySelector(".player-count .inner")

function sendMessage(){
  if(!inputBox.value){
    return;
  }

  socket.emit("chatMessage", {
    uid: current.user.id,
    userName: current.user.userName,
    accent: current.user.avatar,
    text: inputBox.value
  })

  inputBox.value = "";
  inputBox.focus();
}

msgSend.addEventListener("click", () => sendMessage())

inputBox.addEventListener("keydown", (e) => e.keyCode === 13 ? sendMessage() : null)

socket.on("rcvMessage", (message) => {
  let user = document.getElementById(message.uid)

  if(!user){
    return;
  }

  showMessage(`<li class="${message.uid === current.user.id ? "own": ""}"><p class="msg" style="border-bottom: 5px solid ${message.accent}"><em>${message.userName}</em><span>${message.text}</span></p></li>`)
})

function showMessage(elem, indicate=true){
  playerList.innerHTML += elem;

  msgCont.scrollTop = msgCont.scrollHeight

  if(indicate && !playerCount.classList.contains("open")){
    playerCount.classList.add("show-unread")
  }
}