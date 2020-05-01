

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
let firstRunOpen = true;
let firstRnPhase = 1;
let firstRnStartBtn = document.querySelector("#first-run .start-fr")
let firstRnHeader = document.querySelector("#first-run .modal__title")
let firstRnContent = document.querySelector("#first-run .modal__content")
let settingsIcon = document.querySelector(".settings")
let justDrawBtn = document.querySelector(".just-draw")

let brushSize = 10;


brushSizeControl.value = brushSize;

feather.replace() // load icons

let id = "2412"

let getIndex = (l) =>  Math.floor(Math.random() * (l - 0)) + 0; // gets a random integer

socket.on("connect", () => {
  if(!name){ // if user doesn't have a name, we give them a random one
    let adjs = ["alizarin","amaranth","amber","amethyst","apricot","aqua","aquamarine","asparagus","auburn","azure","beige","bistre","black","blue","blue-green","blue-violet","bondi-blue","brass","bronze","brown","buff","burgundy","camouflage-green","cardinal","carmine","carrot-orange","cerise","cerulean","champagne","charcoal","chartreuse","cherry-blossom-pink","chestnut","chocolate","cinnabar","cinnamon","cobalt","copper","coral","corn","cornflower","cream","crimson","cyan","dandelion","denim","ecru","emerald","eggplant","fern-green","firebrick","flax","forest-green","french-rose","fuchsia","gamboge","gold","goldenrod","green","grey","han-purple","harlequin","heliotrope","hollywood-cerise","indigo","ivory","jade","kelly-green","khaki","lavender","lawn-green","lemon","lemon-chiffon","lilac","lime","lime-green","linen","magenta","magnolia","malachite","maroon","mauve","midnight-blue","mint-green","misty-rose","moss-green","mustard","myrtle","navajo-white","navy-blue","ochre","office-green","olive","olivine","orange","orchid","papaya-whip","peach","pear","periwinkle","persimmon","pine-green","pink","platinum","plum","powder-blue","puce","prussian-blue","psychedelic-purple","pumpkin","purple","quartz-grey","raw-umber","razzmatazz","red","robin-egg-blue","rose","royal-blue","royal-purple","ruby","russet","rust","safety-orange","saffron","salmon","sandy-brown","sangria","sapphire","scarlet","school-bus-yellow","sea-green","seashell","sepia","shamrock-green","shocking-pink","silver","sky-blue","slate-grey","smalt","spring-bud","spring-green","steel-blue","tan","tangerine","taupe","teal","terra-cotta","thistle","titanium-white","tomato","turquoise","tyrian-purple","ultramarine","van-dyke-brown","vermilion","violet","viridian","wheat","white","wisteria","yellow","zucchini"];

    let tempName = "wild-" + adjs[getIndex(adjs.length)]
    joinRoom(tempName)
    return;
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
      lastCollision: Date.now(),
      created: Date.now(),
      locked: false,
      bg: "white",
      game: {
        justDraw: false,
        currentlyDrawing: "",
        round: 0,
        timer: 0,
        ranks: {},
        rounds: {},
        alreadyDrawn: []
      }
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

  document.querySelector(".updateName").value = user.userName;

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

  firstRun(room.game)
})


socket.on('roomUsers', (users) => {
  if(users.length > 1){
    justDrawBtn.classList.add("hide")
  } else{
    if(document.querySelector(".play-game").classList.contains("hide")){
      justDrawBtn.classList.remove("hide")
    }
  }

  document.querySelector(".player-count span").innerText = users.length;
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

  if(firstRunOpen && firstRnPhase === 2){
    let playersList = document.querySelector("#first-run .firstRunPlayersList")
    playersList.innerHTML += `<li>${user.userName} joined the room</li>`

    document.querySelector("#first-run .start-fr").innerText = "Let's play!"
  }
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

  current.user.lastDraw = Date.now();


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
  
  drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true, current.user, brushSize);
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
  socket.emit("clearCanvas", current.user)
})

socket.on("clearCanvas", (data) => {
  let {room, user} = data;
  updateCanvasColor(room.bg)
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
    settingsIcon.classList.toggle("display")
  }
})

document.addEventListener("keydown", (e) => {
  if(e.keyCode === 27 && playerCount.classList.contains("open")){
    playerCount.classList.remove("open")
    settingsIcon.classList.remove("display")
  }

  // shortcut C for toggling chat
  if(e.keyCode === 67 && e.target.localName !== "input"){
    playerCount.classList.toggle("open")
    settingsIcon.classList.toggle("display")
  }

})

// settigs open
settingsIcon.addEventListener("click", (e) => {
  playerCount.classList.toggle("hide-settings")
})
// close user box
// document.addEventListener("click", (e) => {
//   if(!e.target.closest(".player-count")){
//     if(playerCount.classList.contains("open")){
//       playerCount.classList.remove("open")
//     }
//   }
// })

// add invite link
let shareLinkBox = document.querySelector(".shareLink")
inviteLink(shareLinkBox)

function inviteLink(elem){
  elem.value = window.location.href.split(/[?#]/)[0] + "?room=" + room;

  elem.addEventListener("focus", (e) => {
    elem.select();
  })

  elem.addEventListener("click", (e) => {
    elem.select();
  })

  elem.addEventListener("mouseup", (e) => {
    e.preventDefault();
  })

}

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

let closeByClick;

// first run exp
// show first run dialog
function firstRun(game){
  let justDrawing = game.justDraw;

  if(!justDrawing){ 
    if(!name){
      if(!firstRnContent.querySelector(".updateName") && firstRnPhase === 1){
        firstRnContent.innerHTML += "<label>Set your name (we automagically picked one for you)</label><input type='text' placeholder='Enter your name' value='" + current.user.userName + "' class='updateName'/>"
      }

      updateNameHandler(document.querySelector(".modal__content .updateName"), undefined, () => {
        document.querySelector(".start-fr").focus();
      })
    }

    MicroModal.show('first-run', {
      disableScroll: true,
      disableFocus: true,
      onClose: () => socket.emit("joinGame")
    });
   
  } else{
    justDraw()
  }
}

updateNameHandler(document.querySelector(".updateName"), document.querySelector(".setNewName"), () => {
  document.querySelector(".setNewName").click()
})

function updateNameHandler(elem, triggerElem, onEnter){
  if(triggerElem){
    triggerElem.addEventListener("click", () => {
      let newName = elem.value.replace(/\s/g, '');
      if(newName !== "" && newName !== current.user.userName){
        socket.emit("updateName", newName)
        playerCount.classList.toggle("hide-settings")
      } else{
        playerCount.classList.toggle("hide-settings")
      }
      
    })
  }

  elem.addEventListener("keyup", (e) => {
    if(e.keyCode === 13){
      e.preventDefault();
      onEnter();
    }
  })
}

socket.on("updatedUserName", updateDetails => {
  let {oldName, user} = updateDetails;

  if(current.user.id === user.id){
    current.user = user;
    document.querySelector(".updateName").value = user.userName;
  }
  
  showMessage(`<li class="status"><p>${oldName} changed their name to ${user.userName}</p></li>`, false)

  let firstRnPlayers = document.querySelector(".firstRunPlayersList")
  if(firstRnPlayers){
    firstRnPlayers.innerHTML += `<li>${oldName} changed their name to ${user.userName}</li>`
  }
})

// user wnats to continue
firstRnStartBtn.addEventListener("click", () => {
  closeByClick = closeByClick === false ? true : undefined;

  let userCount = document.querySelector(".player-count span").innerText;
  let nameInput = document.querySelector(".modal__content .updateName");

  // if user enters name on first run phase
  if(firstRnPhase === 1 &&  nameInput && nameInput != "" && nameInput.value.replace(/\s/g, '') !== current.user.userName){
    socket.emit("updateName", nameInput.value.replace(/\s/g, ''))
  }

  if(firstRnPhase === 1 && parseInt(userCount) === 1){
    firstRnPhase += 1;

    firstRnHeader.innerText = "Let's invite some friends!"

    firstRnContent.innerHTML = `
      <p>Looks like you are the only one here! The game is more fun with friends, so you can start off by inviting some with the following link:</p>
      <input type="text" value="" class="shareLink"/>
      <ul class="firstRunPlayersList"><li>Waiting for players to join...</li></ul>
    `

    document.querySelector("#first-run .start-fr").innerText = "...or draw on your own"

    let shareLinkBox = document.querySelector("#first-run .shareLink")
    inviteLink(shareLinkBox)
  } else{
    MicroModal.close()
    socket.emit("joinGame")
  }

})

let gameStop;

function startTimer(duration, display, currentRound) {
  if(gameStop){return;}
  let timer = duration, minutes, seconds;
  let appTimer = setInterval(function () {
      minutes = parseInt(timer / 60, 10)
      seconds = parseInt(timer % 60, 10);

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      display.textContent = minutes + ":" + seconds;

      if (--timer < 0) { // timer done
        if(currentRound){
          nextRound(currentRound)
        } else{
          MicroModal.close()
          socket.emit("nextRound");
        }
        
        clearInterval(appTimer)
      }

      if(gameStop){
        clearInterval(appTimer)
      }
  }, 1000);
}

socket.on("joinGame", (game) => {
  startGame(game)
})

socket.on("skipRoundWait", () => {
  MicroModal.close();
  socket.emit("nextRound");
})

// game
function startGame(game){
  
  let timer = Math.abs(Date.now()-game.timer) / 1000;
  startTimer(5-timer, document.querySelector(".timer span t"), game.round)
  document.querySelector(".timer span em").innerText = `(round ${game.round})`
  document.querySelector(".timer i").innerText = `draw ${game.currentlyDrawing}`

  let currentlyDrawing = document.querySelector(".currently-drawing");
  currentlyDrawing.innerHTML = `<em>draw</em><span>${game.currentlyDrawing}</span>`
  currentlyDrawing.classList.add("show")

  setTimeout(() => {
    currentlyDrawing.classList.remove("show")
  }, 3000)

  
  
}

function nextRound(currentRound){

  let userCount = document.querySelector(".player-count span").innerText;
  
  // if its just one user, we dont vote and go next round
  if(parseInt(userCount) == 1){
    if(currentRound >= 5){
      socket.emit("joinGame", true);
    } else{
      socket.emit("nextRound");
    }
    return;
  }

  document.querySelector(".modal__container").classList.add("leaderboard")
  document.querySelector(".modal__overlay").classList.remove("normal")
  document.querySelector(".modal__overlay").classList.add("side")

  if(currentRound === 5){
    firstRnHeader.innerText = "Winner winner chicken dinner";
    document.querySelector(".modal__footer").innerHTML = "You can go back to just drawing now :)<button class='btn-d play-gamed'>Start new game</button>&nbsp;<button class='btn-d' data-micromodal-close=''>Close</button>";

    document.querySelector(".play-gamed").addEventListener("click", () => {
      document.querySelector(".play-game").click();
    })

    showRanks(false)
    justDraw(true)
  } else{
    document.querySelector(".modal__footer").innerHTML = "<p>Waiting for other players to vote in the remaining <span>00:00</span> seconds. You can keep drawing in the meantime :)</p>"


    firstRnHeader.innerText = "Choose a winner for round " + currentRound;
    showRanks(true, currentRound)
  }

  startTimer(10, document.querySelector(".modal__footer span"))
  startTimer(10, document.querySelector(".timer span t"))
  document.querySelector(".timer span em").innerText = `(waiting)`
  document.querySelector(".timer i").innerText = "draw anything"

  
  MicroModal.show('first-run', {
    disableScroll: true,
    disableFocus: true
  })
}

function showRanks(clickable, currentRound){
  firstRnPhase = 3;
  socket.emit("getPlayerList"); 

  socket.on("playersList", data => {
    let {users, ranks} = data;

    users.map(user => user.wins = ranks[user.id]) 
  
    users.sort((a, b) => b.wins - a.wins) 

    let content = "";

    if(clickable){
      content = "<ul class='vote-players'>"
      content += `${users.map((user, i) => `<li class="player" playerId="${user.id}"><input type="radio" id="${i}" name="vote" value="${user.id}"><label for="${i}">${user.userName}<span><em>👑</em>${user.wins}</span></label></li>`).join("")}`
      content += "</ul>"

      content += "<button class='submit-vote btn-d'>Submit vote</button>" 

      
    } else{
      content = "<ul class='leaderboard-players'>"
      content += `${users.map((user, i) => `<li class="player ${i === 0 & user.wins > 0 ? "champ" : ""}" playerId="${user.id}">${user.userName}<span><em>👑</em>${user.wins}</span></li>`).join("")}`
      content += "</ul>"

    }

    firstRnContent.innerHTML = content;

    let playerVote = document.querySelector(".submit-vote")

    if(playerVote){
      playerVote.addEventListener("click", (e) => {
        MicroModal.close()

        socket.emit("votePlayer", {
          playerId: document.querySelector("input[name='vote']:checked").value,
          round: currentRound
        })

      })
    }
  })

}

function justDraw(newGame){
  let timer = document.querySelector(".timer");
  timer.classList.add("hide")
  gameStop = true;
  socket.emit("justDraw", true);

  if(newGame){
    document.querySelector(".play-game").classList.remove("hide")
  }
}


// just draw 
justDrawBtn.addEventListener("click", () => {
  document.querySelector(".play-game").classList.remove("hide")
  justDrawBtn.classList.add("hide")
  document.querySelector(".currently-drawing").style.display = "none"
  justDraw();
})

document.querySelector(".play-game").addEventListener("click", () => {
  socket.emit("justDraw", false);
  socket.emit("reloadGame")
})

socket.on("reloadGame", () => location.reload())