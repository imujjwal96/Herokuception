var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuidV4 = require('uuid/v4');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('execute', function (formData) {
    executeScript(socket, formData);
  });
});

var executeScript = function (socket, data) {
  var spawn = require('child_process').spawn;

  var email = data.email;
  var gitUrl = data.gitUrl;
  var branchName = data.branchName;
  var herokuAPIKey = data.herokuAPIKey;
  var appName = data.appName;
  var uniqueId = uuidV4();

  const args = [
    "deploy.sh",
    "-e", email,
    "-g", gitUrl,
    "-b", branchName,
    "-h", herokuAPIKey,
    "-n", appName,
    "-u", uniqueId
  ];

  var process = spawn('bash', args);

  process.stdout.on('data', function (data) {
    socket.emit('logs', data.toString());
  });

  process.stderr.on('data', function (data) {
    socket.emit('err-logs', data.toString());
  });

  process.on('exit', function (code) {
    console.log('child process exited with code ' + code);
    if (code === 0) {
      var data = { email: email, uniqueId: uniqueId, gitUrl: gitUrl };
      socket.emit('success', data);
    } else {
      socket.emit('failure', {errorCode: code});
    }
  });

};

var port = process.env.PORT || 3000;

http.listen(port, function(){
  console.log('listening on *:3000');
});