'use strict';

(function() {
  var user = document.getElementsByClassName("user")[0];

  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colors = document.getElementsByClassName('color');
  var context = canvas.getContext('2d');

  let userData;

  socket.on("init", (user) => {
    userData = user;
    app();
  })

  socket.on("playerDisconnect", (id) => {
    if(!document.getElementById(id)){
      return;
    }

    document.getElementById(id).remove();
  })


 
  function app(){
    var current = {
      color: 'black',
      user: userData
    };
    var drawing = false;
  
    user.style.backgroundColor = current.user.color;
  
    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('mouseout', onMouseUp, false);
    canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
    
    //Touch support for mobile devices
    canvas.addEventListener('touchstart', onMouseDown, false);
    canvas.addEventListener('touchend', onMouseUp, false);
    canvas.addEventListener('touchcancel', onMouseUp, false);
    canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);
  
    for (var i = 0; i < colors.length; i++){
      colors[i].addEventListener('click', onColorUpdate, false);
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
  
    function onColorUpdate(e){
      current.color = e.target.className.split(' ')[1];
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
        user.style.backgroundColor = data.user.color;
        document.body.appendChild(user)
      } else{
        let user = document.getElementById(data.user.id)
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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  
  }
})();
