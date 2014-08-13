var constants = require('./Constants');
var mustache = require("mustache");
var dbm = require('./MongoDBManager');
var mg = require('./MailGenerator');
var ms = require('./MailSender');
var fs = require('fs');
var q = require('q');

exports.init = function(app){	
	var self = this;

	app.get('/', function(req,res){ 
		res.sendfile(__dirname + '/public/index.html'); 
	});

	app.get('/submit_profile', function(req,res){ 		
		var config = {jobId: req.query.jobId};
		var page = fs.readFileSync("templates/quote_form.html", "utf8"); // bring in the HTML file
		var html = mustache.to_html(page, config); // replace all of the data
		res.send(html); 
	});

	app.post('/submit_profile', function(req,res){ 				
		var jobId = req.body.jobId;
		var quote = req.body.quote;
		var comment = req.body.comment;
		
		self.getJob(jobId)
		.then(self.updateJobWithQuote.bind(this, quote, comment), self.handleError)
		.then(self.notifyCustomerWithQuote, self.handleError)
		.then(self.showSubmitted.bind(this, res), self.handleError);
	});

	app.get('/accept_job', function(req,res){ 
		var jobId = req.query.jobId;	

		self.getJob(jobId)
		.then(self.updateJobWithAccept, self.handleError)
		.then(self.notifyProWithWin, self.handleError)
		.then(self.notifyCustomerWithWin, self.handleError)
		.then(self.showAccepted.bind(this, res), self.handleError);
	});
}

exports.getJob = function(jobId){
	console.log("getting job", jobId);
	return dbm.find(constants.JOBS_COL, {_id: parseFloat(jobId)});
}

exports.updateJobWithQuote = function(quote, comment, job){	
	if(job.length === 1){
		var job = job[0];
		//save quote in job
		job.quote = job.quote || [];
		var quote = {
			quote: quote,
			comment: comment,
			dateTime: new Date()
		};
		job.quote.unshift(quote);

		console.log("adding quote to job", quote);
		return dbm.save(constants.JOBS_COL, job);
	}

	q.defer().reject("job not found");
}

exports.updateJobWithAccept = function(job){	
	if(job.length === 1){
		var job = job[0];
		job.accepted = new Date();
		console.log("adding accepted time to job", job.accepted);
		return dbm.save(constants.JOBS_COL, job);
	}

	q.defer().reject("job not found");
}

exports.notifyCustomerWithQuote = function(job){
	//generate customer email
	var recipient = job.customerEmail;	
	var subject = constants.QUOTE_SUBJECT + " - " + job.category + " - " + job._id;	
	var html = mg.getQuoteToCustomer(job);
	var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
	
	console.log("sending email to customer", recipient);
	ms.send(message)
	return job;	
}

exports.notifyProWithWin = function(job){
	//generate customer email
	var recipient = job.pro.email;	
	var subject = constants.PRO_WIN_SUBJECT + " - " + job.category + " - " + job._id;	
	var html = mg.getWinToPro(job);
	var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
	
	console.log("sending win email to pro", recipient);
	ms.send(message)
	return job;	
}

exports.notifyCustomerWithWin = function(job){
	//generate customer email
	var recipient = job.customerEmail;	
	var subject = constants.CUST_WIN_SUBJECT + " - " + job.category + " - " + job._id;	
	var html = mg.getWinToCustomer(job);
	var message = mg.generate(constants.SYSTEM_EMAIL, subject, recipient, html);
	
	console.log("sending win email to customer", recipient);
	ms.send(message)
	return job;	
}

exports.showSubmitted = function(res, job){
	//show landing	
	var page = fs.readFileSync("templates/quote_submit.html", "utf8"); // bring in the HTML file
	var html = mustache.to_html(page, job); // replace all of the data
	res.send(html); 
}

exports.showAccepted = function(res, job){
	//show landing	
	var page = fs.readFileSync("templates/accep_job_confirm.html", "utf8"); // bring in the HTML file
	var html = mustache.to_html(page, job); // replace all of the data
	res.send(html); 
}

exports.handleError = function(err){
	console.log(err);
	res.sendfile(__dirname + '/public/error.html'); 
}


