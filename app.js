var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');

var app = express();

var state = {
  isRunning: true,
  route: 'main',
  temperature1: 20,
  temperature2: 20,
  senderId: 'server',
}

var beacon = {key: '', value: ''};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

var clients = [];

//https://alligator.io/nodejs/server-sent-events-build-realtime-app/
// Middleware for GET /events endpoint
function eventsHandler(req, res, next) {
  // Mandatory headers and http status to keep connection open
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  // After client opens connection send current state as string
  const data = `data: ${JSON.stringify(state)}\n\n`;
  res.write(data);

  // Generate an id based on timestamp and save res
  // object of client connection on clients list
  // Later we'll iterate it and send updates to each client
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  console.log(`${clientId} Connection opened`);
  // console.log(req);
  clients.push(newClient);

  // When client closes connection we update the clients list
  // avoiding the disconnected one
  req.on('close', () => {
    console.log(`${clientId} Connection closed`);
    clients = clients.filter(c => c.id !== clientId);
  });
}

// Iterate clients list and use write res object method to send new status
function sendEventsToAll(newState) {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  clients.forEach(c => c.res.write(data));
}

app.get('/events', eventsHandler);

app.get('/clients', (req, res) => {
  return res.send(clients.map(x => x.id));
});

app.get('/state', (req, res) => {
  return res.send(state);
});

app.post('/state', (req, res) => {
  console.log(req.body);
  state = req.body;
  sendEventsToAll(state);
  return res.send(state);
});

app.get('/beacon', (req, res) => {
  return res.send(beacon);
});

app.post('/beacon', (req, res) => {
  console.log(req.body);
  id = new Date();
  // beacon.push({
  //   [id]: req.body
  // });
  // beacon.push({
  //   key: id,
  //   value: req.body
  // });
  beacon = {key: id, body: req.body};
  console.log(beacon);
  return res.send(beacon);
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(app.get('port'));

module.exports = app;
