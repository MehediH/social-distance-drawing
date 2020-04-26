

let { room, name} = Qs.parse(location.search, {
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

let getIndex = (l) =>  Math.floor(Math.random() * (l - 0)) + 0; // gets a random integer

socket.on("connect", () => {
  if(!name){ // if user doesn't have a name, we give them a random one
    let adjs = ["alizarin","amaranth","amber","amethyst","apricot","aqua","aquamarine","asparagus","auburn","azure","beige","bistre","black","blue","blue-green","blue-violet","bondi-blue","brass","bronze","brown","buff","burgundy","camouflage-green","cardinal","carmine","carrot-orange","cerise","cerulean","champagne","charcoal","chartreuse","cherry-blossom-pink","chestnut","chocolate","cinnabar","cinnamon","cobalt","copper","coral","corn","cornflower","cream","crimson","cyan","dandelion","denim","ecru","emerald","eggplant","fern-green","firebrick","flax","forest-green","french-rose","fuchsia","gamboge","gold","goldenrod","green","grey","han-purple","harlequin","heliotrope","hollywood-cerise","indigo","ivory","jade","kelly-green","khaki","lavender","lawn-green","lemon","lemon-chiffon","lilac","lime","lime-green","linen","magenta","magnolia","malachite","maroon","mauve","midnight-blue","mint-green","misty-rose","moss-green","mustard","myrtle","navajo-white","navy-blue","ochre","office-green","olive","olivine","orange","orchid","papaya-whip","peach","pear","periwinkle","persimmon","pine-green","pink","platinum","plum","powder-blue","puce","prussian-blue","psychedelic-purple","pumpkin","purple","quartz-grey","raw-umber","razzmatazz","red","robin-egg-blue","rose","royal-blue","royal-purple","ruby","russet","rust","safety-orange","saffron","salmon","sandy-brown","sangria","sapphire","scarlet","school-bus-yellow","sea-green","seashell","sepia","shamrock-green","shocking-pink","silver","sky-blue","slate-grey","smalt","spring-bud","spring-green","steel-blue","tan","tangerine","taupe","teal","terra-cotta","thistle","titanium-white","tomato","turquoise","tyrian-purple","ultramarine","van-dyke-brown","vermilion","violet","viridian","wheat","white","wisteria","yellow","zucchini"];

    name = "wild-" + adjs[getIndex(adjs.length)]
  }
  
  joinRoom(name)
})


// request to join room
function joinRoom(userName){
  socket.emit("joinRoom", {
    room: {
      id: room,
      canvas: [],
      users: [],
      colls: "",
      lastCollision: new Date(),
      created: new Date(),
      locked: false,
      bg: "white",
      ranks: new Map()
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

socket.on("collided", (collision) => {
  document.body.classList.add("collided")

  updateCanvasColor(collision.bg);

  showMessage(`<li class="status collision"><p>${collision.p1.userName} & ${collision.p2.userName} collided</p></li>`, false)

  setTimeout(() => {
    document.body.classList.remove("collided")
  }, 1000);
})


socket.on("playerDisconnect", (user) => {
  if(!document.getElementById(user.id)){ 
    return;
  }

  document.getElementById(user.id).remove();

  showMessage(`<li class="status"><p>${user.userName} left the room</p></li>`, false)

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

  document.querySelector(".black").click();
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

let thingsToDraw = ["aircraft carrier", "airplane", "alarm clock", "ambulance", "angel", "animal migration", "ant", "anvil", "apple", "arm", "asparagus", "axe", "backpack", "banana", "bandage", "barn", "baseball", "baseball bat", "basket", "basketball", "bat", "bathtub", "beach", "bear", "beard", "bed", "bee", "belt", "bench", "bicycle", "binoculars", "bird", "birthday cake", "blackberry", "blueberry", "book", "boomerang", "bottlecap", "bowtie", "bracelet", "brain", "bread", "bridge", "broccoli", "broom", "bucket", "bulldozer", "bus", "bush", "butterfly", "cactus", "cake", "calculator", "calendar", "camel", "camera", "camouflage", "campfire", "candle", "cannon", "canoe", "car", "carrot", "castle", "cat", "ceiling fan", "cello", "cell phone", "chair", "chandelier", "church", "circle", "clarinet", "clock", "cloud", "coffee cup", "compass", "computer", "cookie", "cooler", "couch", "cow", "crab", "crayon", "crocodile", "crown", "cruise ship", "cup", "diamond", "dishwasher", "diving board", "dog", "dolphin", "donut", "door", "dragon", "dresser", "drill", "drums", "duck", "dumbbell", "ear", "elbow", "elephant", "envelope", "eraser", "eye", "eyeglasses", "face", "fan", "feather", "fence", "finger", "fire hydrant", "fireplace", "firetruck", "fish", "flamingo", "flashlight", "flip flops", "floor lamp", "flower", "flying saucer", "foot", "fork", "frog", "frying pan", "garden", "garden hose", "giraffe", "goatee", "golf club", "grapes", "grass", "guitar", "hamburger", "hammer", "hand", "harp", "hat", "headphones", "hedgehog", "helicopter", "helmet", "hexagon", "hockey puck", "hockey stick", "horse", "hospital", "hot air balloon", "hot dog", "hot tub", "hourglass", "house", "house plant", "hurricane", "ice cream", "jacket", "jail", "kangaroo", "key", "keyboard", "knee", "knife", "ladder", "lantern", "laptop", "leaf", "leg", "light bulb", "lighter", "lighthouse", "lightning", "line", "lion", "lipstick", "lobster", "lollipop", "mailbox", "map", "marker", "matches", "megaphone", "mermaid", "microphone", "microwave", "monkey", "moon", "mosquito", "motorbike", "mountain", "mouse", "moustache", "mouth", "mug", "mushroom", "nail", "necklace", "nose", "ocean", "octagon", "octopus", "onion", "oven", "owl", "paintbrush", "paint can", "palm tree", "panda", "pants", "paper clip", "parachute", "parrot", "passport", "peanut", "pear", "peas", "pencil", "penguin", "piano", "pickup truck", "picture frame", "pig", "pillow", "pineapple", "pizza", "pliers", "police car", "pond", "pool", "popsicle", "postcard", "potato", "power outlet", "purse", "rabbit", "raccoon", "radio", "rain", "rainbow", "rake", "remote control", "rhinoceros", "rifle", "river", "roller coaster", "rollerskates", "sailboat", "sandwich", "saw", "saxophone", "school bus", "scissors", "scorpion", "screwdriver", "sea turtle", "see saw", "shark", "sheep", "shoe", "shorts", "shovel", "sink", "skateboard", "skull", "skyscraper", "sleeping bag", "smiley face", "snail", "snake", "snorkel", "snowflake", "snowman", "soccer ball", "sock", "speedboat", "spider", "spoon", "spreadsheet", "square", "squiggle", "squirrel", "stairs", "star", "steak", "stereo", "stethoscope", "stitches", "stop sign", "stove", "strawberry", "streetlight", "string bean", "submarine", "suitcase", "sun", "swan", "sweater", "swing set", "sword", "syringe", "table", "teapot", "teddy-bear", "telephone", "television", "tennis racquet", "tent", "The Eiffel Tower", "The Great Wall of China", "The Mona Lisa", "tiger", "toaster", "toe", "toilet", "tooth", "toothbrush", "toothpaste", "tornado", "tractor", "traffic light", "train", "tree", "triangle", "trombone", "truck", "trumpet", "t-shirt", "umbrella", "underwear", "van", "vase", "violin", "washing machine", "watermelon", "waterslide", "whale", "wheel", "windmill", "wine bottle", "wine glass", "wristwatch", "yoga", "zebra", "zigzag"]
// alert(thingsToDraw[getIndex(thingsToDraw.length)])