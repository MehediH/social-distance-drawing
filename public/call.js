const socket = io();

let getIndex = (l) =>  Math.floor(Math.random() * (l - 0)) + 0; // gets a random integer

if(!name){ // if user doesn't have a name, we give them a random one
      let adjs = ["alizarin","amaranth","amber","amethyst","apricot","aqua","aquamarine","asparagus","auburn","azure","beige","bistre","black","blue","blue-green","blue-violet","bondi-blue","brass","bronze","brown","buff","burgundy","camouflage-green","cardinal","carmine","carrot-orange","cerise","cerulean","champagne","charcoal","chartreuse","cherry-blossom-pink","chestnut","chocolate","cinnabar","cinnamon","cobalt","copper","coral","corn","cornflower","cream","crimson","cyan","dandelion","denim","ecru","emerald","eggplant","fern-green","firebrick","flax","forest-green","french-rose","fuchsia","gamboge","gold","goldenrod","green","grey","han-purple","harlequin","heliotrope","hollywood-cerise","indigo","ivory","jade","kelly-green","khaki","lavender","lawn-green","lemon","lemon-chiffon","lilac","lime","lime-green","linen","magenta","magnolia","malachite","maroon","mauve","midnight-blue","mint-green","misty-rose","moss-green","mustard","myrtle","navajo-white","navy-blue","ochre","office-green","olive","olivine","orange","orchid","papaya-whip","peach","pear","periwinkle","persimmon","pine-green","pink","platinum","plum","powder-blue","puce","prussian-blue","psychedelic-purple","pumpkin","purple","quartz-grey","raw-umber","razzmatazz","red","robin-egg-blue","rose","royal-blue","royal-purple","ruby","russet","rust","safety-orange","saffron","salmon","sandy-brown","sangria","sapphire","scarlet","school-bus-yellow","sea-green","seashell","sepia","shamrock-green","shocking-pink","silver","sky-blue","slate-grey","smalt","spring-bud","spring-green","steel-blue","tan","tangerine","taupe","teal","terra-cotta","thistle","titanium-white","tomato","turquoise","tyrian-purple","ultramarine","van-dyke-brown","vermilion","violet","viridian","wheat","white","wisteria","yellow","zucchini"];
  
      name = "wild-" + adjs[getIndex(adjs.length)]
    }
    
    joinRoom(name)

function joinRoom(userName){
    socket.emit("joinRoom", {
        room: {
        id: "hey",
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

let userAudio = document.querySelector(".user-call")
let userPeers = []
let peersRef = []

const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true}).then(stream => {
    userAudio.srcObject = stream;

    joinRoom(name)


    socket.on("roomUsers", users => {
        const peers = [];
        users = users.filter(user => user.id !== socket.id)
        users = users.map(user => user.id)

        users.forEach(user => {
            const peer = createPeer(user, socket.id, stream);
            peersRef.push({
                peerID: user,
                peer,
            })
            peers.push(peer);
        })
        userPeers = peers;
        loadParticipants(userPeers)
        socket.off("roomUsers")
    })

    socket.on("user joined", payload => {
        const item = peersRef.find(p => p.peerID ===  payload.callerID);
        if(item){return;}

        const peer = addPeer(payload.signal, payload.callerID, stream);

        peersRef.push({
            peerID: payload.callerID,
            peer,
        })

        userPeers = [...userPeers, peer]

        addParticipant(userPeers.length, peer)
    });

    socket.on("receiving returned signal", payload => {
        const item = peersRef.find(p => p.peerID === payload.id);
        item.peer.signal(payload.signal);
    });
})
    


function createPeer(userToSignal, callerID, stream) {
    const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream,
    });

    peer.on("signal", signal => {
        socket.emit("sending signal", { userToSignal, callerID, signal })
    })

    return peer;
}

function addPeer(incomingSignal, callerID, stream) {
    const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
    })

    peer.on("signal", signal => {
        socket.emit("returning signal", { signal, callerID })
    })

    peer.signal(incomingSignal);

    return peer;
}



function loadParticipants(userPeers){
    console.log("loading peers")


    for(let i = 0; i < userPeers.length; i++){        
        addParticipant(i, userPeers[i])
    }
    
}

function addParticipant(id, peer){
    let video = document.createElement("video")
    video.autoplay = true;
    video.playsinline = true;
    video.controls = true;
    video.id = id;
        
    peer.on("stream", stream => {
        video.srcObject = stream;
    })

    document.body.appendChild(video)
}