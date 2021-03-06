
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var mailListener = require('./MailListener');
var newrelic = require('newrelic');
var requestHandler = require('./RequestHandler');
var events = require('events');
var eventEmitter = new events.EventEmitter();

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

requestHandler.init(app);

mailListener.start(eventEmitter);

var onDisconnect = function() {
  console.log("imapReconnecting");
  mailListener.start(eventEmitter);
}
eventEmitter.on('imapDisconnected', onDisconnect);


