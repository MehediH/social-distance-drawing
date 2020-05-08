// deals with calls
let userJoined = false;
let isUserMuted = false;
let userPeers = []
let peersRef = []

dropdown(document.querySelector(".calls.has-dropdown"), ".calls") // enable the calls dropdown

let joinBtn = document.querySelector(".join-call")
let activeAudios = document.querySelector(".calls .audios")
let localStream;

joinBtn.addEventListener("click", () => {
    if(!userJoined){
        let userAudio = createUserAudio(current.user.id, true);
        joinAudioRoom(userAudio);
       
    } else{
        document.querySelector(".calls .mute-call").style.display = "none"

        userJoined = false;
        joinBtn.innerText = "Join Room"

        activeAudios.innerHTML = "";

        localStream.getTracks()[0].stop();

        let userInRoom = document.getElementById(`u${current.user.id}-audio`);
        if(userInRoom) userInRoom.remove()

        socket.emit("leaveAudio")
    }
})

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

let joinAudioRoom = (userAudio) => {
    
    navigator.mediaDevices.getUserMedia({ video: false, audio: true}).then(stream => {
        userJoined = true; // set user is in call to true
        userAudio.srcObject = stream;
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

        socket.on("userJoinedAudio", payload => {
            const item = peersRef.find(p => p.peerID ===  payload.callerID);
            if(item){return;}

            const peer = addPeer(payload.signal, payload.callerID, stream);

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
    }).catch((err) => {
        alert(`${err.message} - couldn't connect to your microphone. Make sure you have allowed the game to use your microphone on your browser!`)
    })
}

let loadParticipants = (userPeers) => {
    for(let i = 0; i < userPeers.length; i++){        
        let audioElem = createUserAudio(userPeers[i].id)
        addParticipant(userPeers[i].peer, audioElem)
    }
}


let addParticipant = (peer, audioElem) => {  
    console.log("added peer ", peer)
    peer.p.on("stream", stream => {
        console.log("on stream", stream)
        audioElem.srcObject = stream;
    })

    prependElement(activeAudios, audioElem)
}

let createPeer = (userToSignal, callerID, stream) => {
    const peer = {
        id: callerID,
        p: new SimplePeer({
            initiator: true,
            trickle: true,
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
            trickle: true,
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

    if(userAudio && status){
        userAudio.classList.add("muted")
        
        if(audioElem && uid !== current.user.id){
            audioElem.muted = true;
        }

        return;
    } 

    if(userAudio && !status){
        userAudio.classList.remove("muted")
        
        if(audioElem && uid !== current.user.id){
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

    
    // let findUserOnRef = peersRef.findIndex(peer => peer.peerID === uid)
    // if(findUserOnRef !== -1){
    //     peersRef[findUserOnRef].peer.p.destroy()
    //     peersRef.splice(findUserOnRef, 1)
    // }
    
    // let findUserOnPeers = userPeers.findIndex(peer => peer.id === uid)
    
    // if(findUserOnPeers !== -1){
    //     userPeers.splice(findUserOnPeers, 1)
    // }

})