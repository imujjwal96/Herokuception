var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('retrieve-file', function () {
    retrieveContent(socket);
  });
  
  socket.on('store-content', function (data) {
    storeContent(socket, data);
  })
});

var retrieveContent = function (socket) {
  var spawn = require('child_process').spawn;
  var process = spawn('cat', [ '.travis.yml' ]);
  
  process.stdout.setEncoding('utf-8');
  process.stdout.on('data', function (data) {
    socket.emit('file-content', data);
  });
};

var storeContent = function (socket, data) {
  var exec = require('child_process').exec;
  var process = exec('truncate -s 0 .travis.yml && echo ' +
    '"' + data + '" >> .travis.yml');
  
  process.on('exit', function (code) {
    if (code === 0) {
      socket.emit('save-successful');
    }
  });
};

http.listen(3000, function(){
  console.log('listening on *:3000');
});