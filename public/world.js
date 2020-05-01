const socket = io();
socket.emit("loadOpenRooms")
socket.on("openRooms", (rooms) => {
    let list = document.querySelector("ul")
    
    let content = "";
    
    if(rooms.length != 0){
        content += `${rooms.map((room) => `<li><a ${room.users.length !== 10 ? `href='/board?room=${room.id}'` : "class='disable"}'>${room.id}<span><i data-feather="users"></i><p>${room.users.length}/10</p></span></a></li>`).join("")}`
    } else{
        content += "<p>There are no open rooms at the moment, try creating your own one!</p><a class='btn-d' href='/'>Start your own room</a>"
    }
    
    list.innerHTML = content;
    feather.replace() // load icons
})