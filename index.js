const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const uuidV4 = require('uuid/v4');
const passport = require("passport");
const crypto = require('crypto');
const session = require("express-session");
const readline = require('readline');

const HerokuStrategy = require("passport-heroku").Strategy;

const HEROKU_CLIENT_ID = process.env.HEROKU_CLIENT_ID || 'sdfdsgsd';
const HEROKU_CLIENT_SECRET = process.env.HEROKU_CLIENT_SECRET || 'sdfgsf';
const cipher = crypto.createCipher('aes256', process.env.SECRET);
const decipher = crypto.createDecipher('aes256', process.env.SECRET);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new HerokuStrategy({
    clientID: HEROKU_CLIENT_ID,
    clientSecret: HEROKU_CLIENT_SECRET,
    callbackURL: "https://herokuception.herokuapp.com/auth/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    done(null, profile);
  }
));

app.set('views', __dirname);
app.set('view engine', 'hbs');

app.use(session({
  secret: process.env.SECRET,
  resave: true,
  saveUninitialized: true,
  store: new session.MemoryStore()
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(req, res){
  res.render('index', {
    herokuAPIKey: req.session.herokuAPIKey || ''
  });
});

app.post('/auth', passport.authenticate('heroku'));

app.get('/auth/callback', passport.authenticate('heroku'), function(req, res) {
  req.session.herokuAPIKey = cipher.update(req.user.accessToken, 'utf8', 'hex') + cipher.final('hex');
  res.redirect('/');
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
  var herokuAPIKey = decipher.update(data.herokuAPIKey, 'hex', 'utf8') + decipher.final('utf8');
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

  readline.createInterface({
    input     : process.stdout,
    terminal  : false
  }).on('line', function(data) {
    socket.emit('logs', data.toString());
  });

  readline.createInterface({
    input     : process.stderr,
    terminal  : false
  }).on('line', function(data) {
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