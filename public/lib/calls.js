// deals with calls
let userJoined = false;
let isUserMuted = false;
let userPeers = []
let peersRef = []

dropdown(document.querySelector(".calls.has-dropdown"), ".calls") // enable the calls dropdown

let joinBtn = document.querySelector(".join-call")
let activeAudios = document.querySelector(".calls .audios")
let localStream;

let prependElement = (to, elem) => {
    to.insertBefore(elem, to.firstChild)
}

let createUserAudio = (id, muted=false) => {
    let audio = document.createElement("audio")
    audio.autoplay = true;
    audio.muted = muted;
    audio.id = `${id}-audio`;
    
    prependElement(activeAudios, audio)

    return document.getElementById(`${id}-audio`)
}


joinBtn.addEventListener("click", () => {
    if(userJoined === -1){
        if(window.location.href.indexOf("name=") === -1){
            window.location.href += `&name=${current.user.userName}${autoJoin ? "" : "&autoJoin=true"}`
        } else{
            window.location.href += `${autoJoin ? "" : "&autoJoin=true"}`
        }
    }
    if(!userJoined){
        let userAudio = createUserAudio(current.user.id, true);
        joinAudioRoom(userAudio);
       
    } else{
        document.querySelector(".calls .mute-call").style.display = "none"

        userJoined = -1;
        joinBtn.innerText = "Join Room"

        document.querySelector(".calls .info").innerText = `Using microphone: ${localStream.getTracks()[0].label} - click the button below to join!`

        activeAudios.innerHTML = "";

        localStream.getTracks()[0].stop();

        let userInRoom = document.getElementById(`u${current.user.id}-audio`);
        if(userInRoom) userInRoom.remove()

        socket.emit("leaveAudio")
    }
})


let joinAudioRoom = (userAudio) => {
    
    navigator.mediaDevices.getUserMedia({ video: false, audio: true}).then(stream => {
        userJoined = true; // set user is in call to true
        userAudio.srcObject = stream;

        document.querySelector(".calls .info").innerText = `Using microphone: ${stream.getTracks()[0].label}`

        localStream = stream;
        joinBtn.innerText = "Leave Room";

        document.querySelector(".calls .mute-call").style.display = "block"

        socket.emit("joinAudio")

        socket.on("loadExistingAudios", users => {
            const peers = [];

            users = users.filter(user => user.id !== socket.id && user.inAudio)
            users = users.map(user => user.id)

            users.forEach(user => {
                const peer = createPeer(user, socket.id, stream);

                peersRef.push({
                    peerID: user,
                    peer,
                })

                peers.push({
                    id: user,
                    peer
                });
            })

            loadParticipants(peers)
            userPeers = peers;

          
            socket.off("loadExistingAudios")
        })

       
    }).catch((err) => {
        alert(`${err.message} - couldn't connect to your microphone. Make sure you have allowed the game to use your microphone on your browser!`)
    })
}

socket.on("userJoinedAudio", payload => {
    const item = peersRef.find(p => p.peerID ===  payload.callerID);
    if(item){return;}
    console.log("NEW")

    const peer = addPeer(payload.signal, payload.callerID, localStream);

    peersRef.push({
        peerID: payload.callerID,
        peer,
    })

    userPeers = [...userPeers, peer]

    let audioElem = createUserAudio(payload.callerID)
    addParticipant(peer, audioElem)
});

socket.on("rcvSig", payload => {
    const item = peersRef.find(p => p.peerID === payload.id);
    item.peer.p.signal(payload.signal);
});

let loadParticipants = (userPeers) => {
    for(let i = 0; i < userPeers.length; i++){        
        let audioElem = createUserAudio(userPeers[i].id)
        addParticipant(userPeers[i].peer, audioElem)
    }
}


let addParticipant = (peer, audioElem) => {  

    document.querySelector(".calls .info").innerText = `Using microphone: ${localStream.getTracks()[0].label} - connecting...`

    peer.p.on("stream", stream => {
        document.querySelector(".calls .info").innerText = `Using microphone: ${localStream.getTracks()[0].label} - connected!`
        audioElem.srcObject = stream;
    })

    prependElement(activeAudios, audioElem)
}

let createPeer = (userToSignal, callerID, stream) => {
    const peer = {
        id: callerID,
        p: new SimplePeer({
            initiator: true,
            trickle: false,
            stream,
        })
    }

    peer.p.on("signal", signal => {
        socket.emit("sendSig", { userToSignal, callerID, signal })
    })


    return peer;
}

let addPeer = (incomingSignal, callerID, stream) => {
    const peer = {
        id: callerID,
        p: new SimplePeer({
            initiator: false,
            trickle: false,
            stream,
        })
    }

    peer.p.on("signal", signal => {
        socket.emit("returnSig", { signal, callerID })
    })

    peer.p.signal(incomingSignal);

    return peer;
}

let userMute = document.querySelector(`.calls .mute-call`);

userMute.addEventListener("click", (e) => {
    if(isUserMuted){ // unmute
        isUserMuted = false;
        userMute.innerText = "Mute"
        localStream.getTracks()[0].enabled = true;
        socket.emit("setMute", false)
    } else{ // mute call
        isUserMuted = true;
        userMute.innerText = "Unmute"
        localStream.getTracks()[0].enabled = false;
        socket.emit("setMute", true)
    }
})

socket.on("updateParticipantMute", (data) => {
    let { uid, status } = data;

    let userAudio = document.getElementById(`u${uid}-audio`)
    let audioElem = document.getElementById(`${uid}-audio`)
    let isSilenced = document.querySelector(`.calls .users .silence[data-user='${uid}']`);

    if(userAudio && status){
        userAudio.classList.add("muted")
        
        if(audioElem && uid !== current.user.id){
            audioElem.muted = true;
        }

        return;
    } 

    if(userAudio && !status){
        userAudio.classList.remove("muted")
        
        if(audioElem && uid !== current.user.id && isSilenced.getAttribute("muted") === "false"){
            audioElem.muted = false;
        }

        return;
    } 
})

socket.on("participantLeft", uid => {
    let userAudio = document.getElementById(`u${uid}-audio`)
    let audioElem = document.getElementById(`${uid}-audio`)

    if(userAudio){
        userAudio.remove()
    }

    if(audioElem){
        audioElem.remove()
    }

    
    let findUserOnRef = peersRef.findIndex(peer => peer.peerID === uid)
    if(findUserOnRef !== -1){
        peersRef.splice(findUserOnRef, 1)
    }
    
    let findUserOnPeers = userPeers.findIndex(peer => peer.id === uid)
    
    if(findUserOnPeers !== -1){
        userPeers.splice(findUserOnPeers, 1)
    }

})

if(autoJoin){
    let userAudio = createUserAudio(current.user.id, true);
    joinAudioRoom(userAudio);
}

document.querySelector(".calls .users").addEventListener("click", (e) => {
    if(e.target.classList.contains("silence")){
       let uid = e.target.getAttribute("data-user");
       let uAudio = document.getElementById(`${uid}-audio`);
       let muteStatus = e.target.getAttribute("muted");

       if(muteStatus === "true"){
            uAudio.muted = false;
            e.target.setAttribute("muted", false);
       } else{
            uAudio.muted = true;
            e.target.setAttribute("muted", true);
       }
    }
})