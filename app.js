
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var mailListener = require('./MailListener');
var newrelic = require('newrelic');

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

app.get('/', function(req,res){ res.sendfile(__dirname + '/public/index.html'); });

app.post('/submit_profile', function(req,res){ 
	console.log(req.body.pro_name);
    console.log(req.body.pro_email);
    console.log(req.body.pro_category);
    console.log(req.body.cust_email);    
    res.sendfile(__dirname + '/public/index.html');
});



mailListener.start();





