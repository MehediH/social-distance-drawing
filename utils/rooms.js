let rooms = [];

function getRooms(){
    return rooms;
}

// Join user 
function userJoin(id, userName, avatar, x, y, pX, pY, room, inCall, muted) {
  const user = { id, userName, avatar, x, y, pX, pY, lastDraw: "", inCall, muted};

  const foundRoom = rooms.find(r => r.id === room.id);

  const existingRoomUsers = foundRoom.users;
  const findInRoom = existingRoomUsers.findIndex(user => user.id === id)

  if(findInRoom === -1){
    foundRoom.users.push(user)
    foundRoom.game.ranks[user.id] = 0;
  }

  return user;
}

// Get room
function getRoom(id) {
    return rooms.find(room => room.id === id);
}

// create room
function createRoom(room){
    room.id = room.id.replace(/[^a-zA-Z0-9-_]/g, '')
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

  if(!user) return;

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

function resetRoomCanvas(rid, coll){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  room.canvas = []

  if(coll){
    room.lastCollision = coll;
  }

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

  room.canvas = []
  room.bg = color
}

function itemToDraw(){
  let thingsToDraw = ["aircraft carrier", "airplane", "alarm clock", "ambulance", "angel", "animal migration", "ant", "anvil", "apple", "arm", "asparagus", "axe", "backpack", "banana", "bandage", "barn", "baseball", "baseball bat", "basket", "basketball", "bat", "bathtub", "beach", "bear", "beard", "bed", "bee", "belt", "bench", "bicycle", "binoculars", "bird", "birthday cake", "blackberry", "blueberry", "book", "boomerang", "bottlecap", "bowtie", "bracelet", "brain", "bread", "bridge", "broccoli", "broom", "bucket", "bulldozer", "bus", "bush", "butterfly", "cactus", "cake", "calculator", "calendar", "camel", "camera", "camouflage", "campfire", "candle", "cannon", "canoe", "car", "carrot", "castle", "cat", "ceiling fan", "cello", "cell phone", "chair", "chandelier", "church", "circle", "clarinet", "clock", "cloud", "coffee cup", "compass", "computer", "cookie", "cooler", "couch", "cow", "crab", "crayon", "crocodile", "crown", "cruise ship", "cup", "diamond", "dishwasher", "diving board", "dog", "dolphin", "donut", "door", "dragon", "dresser", "drill", "drums", "duck", "dumbbell", "ear", "elbow", "elephant", "envelope", "eraser", "eye", "eyeglasses", "face", "fan", "feather", "fence", "finger", "fire hydrant", "fireplace", "firetruck", "fish", "flamingo", "flashlight", "flip flops", "floor lamp", "flower", "flying saucer", "foot", "fork", "frog", "frying pan", "garden", "garden hose", "giraffe", "goatee", "golf club", "grapes", "grass", "guitar", "hamburger", "hammer", "hand", "harp", "hat", "headphones", "hedgehog", "helicopter", "helmet", "hexagon", "hockey puck", "hockey stick", "horse", "hospital", "hot air balloon", "hot dog", "hot tub", "hourglass", "house", "house plant", "hurricane", "ice cream", "jacket", "jail", "kangaroo", "key", "keyboard", "knee", "knife", "ladder", "lantern", "laptop", "leaf", "leg", "light bulb", "lighter", "lighthouse", "lightning", "line", "lion", "lipstick", "lobster", "lollipop", "mailbox", "map", "marker", "matches", "megaphone", "mermaid", "microphone", "microwave", "monkey", "moon", "mosquito", "motorbike", "mountain", "mouse", "moustache", "mouth", "mug", "mushroom", "nail", "necklace", "nose", "ocean", "octagon", "octopus", "onion", "oven", "owl", "paintbrush", "paint can", "palm tree", "panda", "pants", "paper clip", "parachute", "parrot", "passport", "peanut", "pear", "peas", "pencil", "penguin", "piano", "pickup truck", "picture frame", "pig", "pillow", "pineapple", "pizza", "pliers", "police car", "pond", "pool", "popsicle", "postcard", "potato", "power outlet", "purse", "rabbit", "raccoon", "radio", "rain", "rainbow", "rake", "remote control", "rhinoceros", "rifle", "river", "roller coaster", "rollerskates", "sailboat", "sandwich", "saw", "saxophone", "school bus", "scissors", "scorpion", "screwdriver", "sea turtle", "see saw", "shark", "sheep", "shoe", "shorts", "shovel", "sink", "skateboard", "skull", "skyscraper", "sleeping bag", "smiley face", "snail", "snake", "snorkel", "snowflake", "snowman", "soccer ball", "sock", "speedboat", "spider", "spoon", "spreadsheet", "square", "squiggle", "squirrel", "stairs", "star", "steak", "stereo", "stethoscope", "stitches", "stop sign", "stove", "strawberry", "streetlight", "string bean", "submarine", "suitcase", "sun", "swan", "sweater", "swing set", "sword", "syringe", "table", "teapot", "teddy-bear", "telephone", "television", "tennis racquet", "tent", "The Eiffel Tower", "The Great Wall of China", "The Mona Lisa", "tiger", "toaster", "toe", "toilet", "tooth", "toothbrush", "toothpaste", "tornado", "tractor", "traffic light", "train", "tree", "triangle", "trombone", "truck", "trumpet", "t-shirt", "umbrella", "underwear", "van", "vase", "violin", "washing machine", "watermelon", "waterslide", "whale", "wheel", "windmill", "wine bottle", "wine glass", "wristwatch", "yoga", "zebra", "zigzag"]

  let getIndex = (l) =>  Math.floor(Math.random() * (l - 0)) + 0; // gets a random integer

  return thingsToDraw[getIndex(thingsToDraw.length)];
}

function startGame(rid){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  
  let pickItemToDraw = itemToDraw();

  let game = room.game;

  game.round = 1;
  game.timer = Date.now();
  game.currentlyDrawing = pickItemToDraw;
  game.alreadyDrawn.push(pickItemToDraw);
  
  let players = room.users;

  for(let i=0; i < players.length; i++){
    let player = players[i]
    game.ranks[player.id] = 0;
  }

  return room.game;

}

function nextRound(rid){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  let game = room.game;
  
  game.round += 1;
  game.timer = Date.now();

  let pickItemToDraw = itemToDraw();
  while(game.alreadyDrawn.includes(pickItemToDraw)){
    pickItemToDraw = itemToDraw();
  }
  
  game.alreadyDrawn.push(pickItemToDraw);
  game.currentlyDrawing = pickItemToDraw;

  return room.game;
}

function votePlayer(rid, playerId, round){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  let game = room.game;
  game.ranks[playerId] += 1;

  if(!game.rounds[round]){
    game.rounds[round] = 1;
  } else{
    game.rounds[round] += 1;
  }
}


function setGameMode(rid, mode){
  let room = rooms.find(room => room.id === rid);

  if(!room){return;}

  room.game.round = 0;
  room.game.currentlyDrawing = "";
  room.game.justDraw = mode;
}

function updateName(uid, rid, newName){
  const room = rooms.find(r => r.id === rid);

  if(!room){return;}

  const user = room.users.find(user => user.id === uid)

  if(!user){return;}

  let oldName = user.userName;
  user.userName = newName;

  return {oldName, user};
}

function userSetAudio(rid, uid, status){
  const room = rooms.find(r => r.id === rid);

  if(!room){return;}

  const user = room.users.find(user => user.id === uid)

  if(!user){return;}

  user.inAudio = status;

  return room.users.filter(u => u.inAudio).length;
}

function userSetMute(rid, uid, muteStatus){
  const room = rooms.find(r => r.id === rid);

  if(!room){return;}

  const user = room.users.find(user => user.id === uid)

  if(!user){return;}

  user.muted = muteStatus;

  return user.muted;
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
  updateCanvasBG,
  startGame,
  nextRound,
  votePlayer,
  userSetAudio,
  userSetMute,
  setGameMode,
  updateName
};